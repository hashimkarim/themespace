#!/usr/bin/env python3
"""Vendored Linux host deployment; consumes one JSON payload on stdin."""

import fcntl
import hashlib
import json
import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path


def require(condition):
    if not condition:
        raise ValueError('Invalid or unreconciled deployment configuration')


def digest(content):
    return hashlib.sha256(content).hexdigest()


def write_atomic(path, content):
    with tempfile.NamedTemporaryFile(dir=path.parent, delete=False) as handle:
        temporary = Path(handle.name)
        try:
            handle.write(content)
            handle.flush()
            os.fsync(handle.fileno())
            temporary.chmod(0o600)
            os.replace(temporary, path)
        finally:
            temporary.unlink(missing_ok=True)


def run(command, *, value=None, timeout=20):
    try:
        result = subprocess.run(command, input=value, text=True, capture_output=True, timeout=timeout, check=False)
    except (OSError, subprocess.TimeoutExpired):
        raise RuntimeError('Deployment command unavailable or timed out') from None
    if result.returncode:
        raise RuntimeError('Deployment command failed; diagnostics suppressed')
    return result.stdout


def deploy(payload):
    target = payload['target']
    for field in ('stack', 'service', 'environment'):
        require(isinstance(target[field], str) and re.fullmatch(r'[a-z0-9][a-z0-9_-]*', target[field]))
    require(re.fullmatch(r'ghcr\.io/[a-z0-9][a-z0-9._-]*(?:/[a-z0-9][a-z0-9._-]*)+', target['image']))
    require(re.fullmatch(re.escape(target['image']) + r'@sha256:[a-f0-9]{64}', payload['image']))
    root_text = payload['root']
    require(isinstance(root_text, str) and re.fullmatch(r'/[A-Za-z0-9_./-]+', root_text)
            and not {'..', '.'} & set(root_text.split('/')) and len(Path(root_text).parts) > 1)
    root = Path(root_text)
    require(root.is_dir())
    stack = root.resolve() / target['stack']
    require(not stack.is_symlink())
    stack.mkdir(mode=0o700, exist_ok=True)
    for filename in ('.web-deploy.lock', '.web-deploy.json', 'compose.yaml',
                     '.web-deploy.previous.json', '.web-deploy.candidate.json'):
        require(not (stack / filename).is_symlink())
    with (stack / '.web-deploy.lock').open('a') as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            return 'busy'
        return apply_locked(payload, stack)


def apply_locked(payload, stack):
    target = payload['target']
    # Copy before replacing the service image; never mutate the caller's template.
    config = json.loads(json.dumps(payload['compose']))
    service = target['service']
    require(isinstance(config.get('services'), dict) and service in config['services'])
    require(all(isinstance(app, dict) and 'build' not in app for app in config['services'].values()))
    health = config['services'][service].get('healthcheck', {})
    require(isinstance(health, dict) and health.get('test', [None])[0] == 'CMD' and not health.get('disable'))
    config['services'][service]['image'] = payload['image']
    live = stack / 'compose.yaml'
    state_path = stack / '.web-deploy.json'
    candidate = stack / '.web-deploy.candidate.json'
    previous = stack / '.web-deploy.previous.json'
    owner = {'repo': target['repo'].lower(), 'environment': target['environment']}
    old_state, old = None, None
    if state_path.exists():
        old_state = json.loads(state_path.read_text())
        require(old_state['owner'] == owner and old_state['service'] == service and live.is_file())
        require(digest(live.read_bytes()) == old_state['compose_sha256'])
        if old_state['status'] == 'ready':
            old = live.read_bytes()
    else:
        # A new stack may have a separately provisioned runtime.env, nothing else.
        require(not ({path.name for path in stack.iterdir()} - {'runtime.env', '.web-deploy.lock'}))
    if target['runtime_env']:
        env_file = stack / 'runtime.env'
        require(env_file.is_file() and not env_file.stat().st_mode & 0o077 and not env_file.is_symlink())
    content = (json.dumps(config, indent=2) + '\n').encode()
    state = {'owner': owner, 'service': service, 'image': payload['image'],
             'compose_sha256': digest(content), 'status': 'failed'}
    write_atomic(candidate, content)
    try:
        with tempfile.TemporaryDirectory(prefix='web-deploy-registry-') as registry:
            docker = ['docker', '--config', registry]

            def compose_args(path):
                return docker + ['compose', '--env-file', '/dev/null', '--project-directory', str(stack),
                                 '-p', target['stack'], '-f', str(path)]

            def start(image):
                run(compose_args(live) + ['up', '--no-deps', '--no-build', '--pull', 'never',
                                         '--wait', '--wait-timeout', '120', service], timeout=160)
                ids = run(compose_args(live) + ['ps', '-q', service]).split()
                require(len(ids) == 1)
                info = json.loads(run(docker + ['inspect', ids[0]]))[0]
                expected = json.loads(run(docker + ['image', 'inspect', image]))[0]['Id']
                require(info['Image'] == expected and info['State']['Health']['Status'] == 'healthy')

            # Validate before changing the live file or running containers. No expanded config is logged.
            run(compose_args(candidate) + ['config', '--quiet'])
            require(payload['registry_user'] and payload['registry_token'])
            run(docker + ['login', 'ghcr.io', '--username', payload['registry_user'], '--password-stdin'],
                value=payload['registry_token'] + '\n', timeout=60)
            run(docker + ['pull', payload['image']], timeout=480)
            if old is not None:
                write_atomic(previous, old)
            # A crash between file/state updates deliberately requires manual reconciliation.
            write_atomic(live, content)
            write_atomic(state_path, (json.dumps(state) + '\n').encode())
            try:
                start(payload['image'])
            except (ValueError, RuntimeError, KeyError, IndexError):
                if old is None:
                    return 'failed'
                write_atomic(live, old)
                try:
                    start(old_state['image'])
                    write_atomic(state_path, (json.dumps(old_state) + '\n').encode())
                    return 'rolled-back'
                except (ValueError, RuntimeError, KeyError, IndexError):
                    return 'rollback-failed'
            state['status'] = 'ready'
            write_atomic(state_path, (json.dumps(state) + '\n').encode())
            return 'ready'
    finally:
        candidate.unlink(missing_ok=True)


if __name__ == '__main__':
    os.umask(0o077)
    try:
        state = deploy(json.load(sys.stdin))
    except (ValueError, RuntimeError, OSError, KeyError, IndexError, TypeError):
        state = 'failed'
    print(json.dumps({'state': state}))
    sys.exit(0 if state == 'ready' else 1)
