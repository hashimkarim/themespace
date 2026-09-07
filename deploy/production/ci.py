#!/usr/bin/env python3
"""Vendored CI transport. Credentials travel on SSH stdin, never command arguments."""

import json
import os
import re
import shlex
import subprocess
import sys
import tempfile
from pathlib import Path


def require(condition, message):
    if not condition:
        raise ValueError(message)


def deploy(directory, env):
    target = json.loads((directory / 'target.json').read_text())
    require(env.get('GITHUB_REPOSITORY', '').lower() == target['repo'].lower(), 'Repository mismatch')
    require(env.get('GITHUB_REF') == 'refs/heads/' + target['branch'], 'Deployment branch mismatch')
    require(env.get('GITHUB_EVENT_NAME') in {'push', 'workflow_dispatch'}, 'Deployment event is not trusted')
    require(env.get('GITHUB_EVENT_NAME') != 'push' or target['auto_deploy'] is True,
            'Automatic deployment is disabled in this target')
    required = ['HOST', 'PORT', 'USER', 'ROOT', 'SUDO', 'SSH_KEY', 'KNOWN_HOSTS', 'IMAGE_REF', 'REGISTRY_USER', 'REGISTRY_TOKEN']
    values = {key: env.get('WEB_DEPLOY_' + key, '') for key in required}
    require(all(values.values()), 'Missing deployment environment configuration')
    require(re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9.:-]*', values['HOST']), 'Invalid SSH host')
    require(values['PORT'].isdigit() and 1 <= int(values['PORT']) <= 65535, 'Invalid SSH port')
    require(re.fullmatch(r'[a-z_][a-z0-9_-]*', values['USER']), 'Invalid SSH user')
    require(values['SUDO'] in {'true', 'false'}, 'Invalid sudo setting')
    require(re.fullmatch(re.escape(target['image']) + r'@sha256:[a-f0-9]{64}', values['IMAGE_REF']),
            'Deployment requires the selected image and an exact SHA-256 digest')
    payload = {'target': target, 'compose': json.loads((directory / 'compose.json').read_text()),
               'root': values['ROOT'], 'image': values['IMAGE_REF'],
               'registry_user': values['REGISTRY_USER'], 'registry_token': values['REGISTRY_TOKEN']}
    require(values['SUDO'] == 'false', 'The app uses a dedicated forced-command key')
    remote = ['themespace-deploy']
    # Do not leave these credentials available to unrelated child processes.
    child_env = {key: value for key, value in env.items() if not key.startswith('WEB_DEPLOY_')}
    with tempfile.TemporaryDirectory(prefix='web-deploy-') as temp:
        key = Path(temp) / 'identity'
        hosts = Path(temp) / 'known_hosts'
        key.write_text(values['SSH_KEY'].rstrip('\n') + '\n')
        hosts.write_text(values['KNOWN_HOSTS'].rstrip('\n') + '\n')
        key.chmod(0o600)
        hosts.chmod(0o600)
        command = ['ssh', '-F', '/dev/null', '-S', 'none', '-o', 'BatchMode=yes',
                   '-o', 'IdentitiesOnly=yes', '-o', 'StrictHostKeyChecking=yes',
                   '-o', 'GlobalKnownHostsFile=/dev/null', '-o', f'UserKnownHostsFile={hosts}',
                   '-o', 'ConnectTimeout=15', '-o', 'ServerAliveInterval=15', '-o', 'ServerAliveCountMax=3',
                   '-i', str(key), '-p', values['PORT'], f"{values['USER']}@{values['HOST']}", shlex.join(remote)]
        result = subprocess.run(command, input=json.dumps(payload), capture_output=True,
                                text=True, env=child_env, timeout=1100, check=False)
    # Do not relay arbitrary remote output or Docker diagnostics that could contain app secrets.
    try:
        status = json.loads(result.stdout)['state']
    except (ValueError, KeyError, TypeError):
        raise RuntimeError('SSH deployment did not return a result; inspect server state before retrying') from None
    messages = {
        'ready': 'Deployment is healthy at ' + values['IMAGE_REF'],
        'rolled-back': 'New deployment failed; previous Compose configuration is healthy again',
        'failed': 'Deployment failed; inspect the selected stack on the server',
        'rollback-failed': 'Deployment and rollback failed; reconcile the selected stack on the server',
        'busy': 'Another deployment holds this stack lock; retry after it completes',
    }
    require(status in messages, 'Unknown deployment result')
    print(messages[status])
    return 0 if result.returncode == 0 and status == 'ready' else 1


if __name__ == '__main__':
    try:
        sys.exit(deploy(Path(__file__).resolve().parent, dict(os.environ)))
    except (ValueError, RuntimeError, OSError, subprocess.TimeoutExpired):
        print('Deployment could not complete; credentials/output suppressed. Check configuration and server state before retrying.', file=sys.stderr)
        sys.exit(1)
