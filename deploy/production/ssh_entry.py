#!/usr/bin/env python3
"""Root-owned forced SSH command for this app's deployment key.

Install this directory under /usr/local/lib/themespace-deploy. The key can
promote ThemeSpace images using the pinned target/Compose configuration, or
read deployment status. It cannot run caller-supplied Python or shell code.
"""

import json
import os
import sys
from pathlib import Path

import remote


def validate(payload, directory):
    target = json.loads((directory / 'target.json').read_text())
    compose = json.loads((directory / 'compose.json').read_text())
    remote.require(set(payload) == {
        'target', 'compose', 'root', 'image', 'registry_user', 'registry_token',
    })
    remote.require(payload['target'] == target)
    remote.require(payload['compose'] == compose)
    remote.require(payload['root'] == '/var/docker')
    remote.require(isinstance(payload['registry_user'], str) and
                   isinstance(payload['registry_token'], str))
    return payload


def main():
    os.umask(0o077)
    directory = Path(__file__).resolve().parent
    command = os.environ.get('SSH_ORIGINAL_COMMAND', '')
    if command == 'themespace-status':
        marker = Path('/var/docker/themespace/.web-deploy.json')
        state = json.loads(marker.read_text()) if marker.exists() else {'status': 'not-deployed'}
        print(json.dumps(state))
        return 0
    if command != 'themespace-deploy':
        print(json.dumps({'state': 'denied'}))
        return 1
    try:
        raw = sys.stdin.buffer.read(131073)
        remote.require(len(raw) <= 131072)
        payload = validate(json.loads(raw), directory)
        state = remote.deploy(payload)
    except (ValueError, RuntimeError, OSError, KeyError, IndexError, TypeError):
        state = 'failed'
    print(json.dumps({'state': state}))
    return 0 if state == 'ready' else 1


if __name__ == '__main__':
    sys.exit(main())
