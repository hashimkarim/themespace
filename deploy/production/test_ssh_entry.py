import copy
import json
import unittest
from pathlib import Path

import ssh_entry


class DeploymentScopeTest(unittest.TestCase):
    def setUp(self):
        self.directory = Path(__file__).resolve().parent
        self.payload = {
            'target': json.loads((self.directory / 'target.json').read_text()),
            'compose': json.loads((self.directory / 'compose.json').read_text()),
            'root': '/var/docker',
            'image': 'ghcr.io/hashimkarim/themespace@sha256:' + 'a' * 64,
            'registry_user': 'test',
            'registry_token': 'synthetic',
        }

    def test_expected_release_is_accepted(self):
        self.assertEqual(ssh_entry.validate(self.payload, self.directory), self.payload)

    def test_key_cannot_change_app_scope_or_mount_the_host(self):
        for mutation in (
            lambda p: p.update(root='/etc'),
            lambda p: p['target'].update(stack='dokploy'),
            lambda p: p['compose']['services']['app'].update(privileged=True),
            lambda p: p['compose']['services']['app'].update(volumes=['/:/host']),
            lambda p: p.update(command='arbitrary shell'),
        ):
            payload = copy.deepcopy(self.payload)
            mutation(payload)
            with self.assertRaises(ValueError):
                ssh_entry.validate(payload, self.directory)


if __name__ == '__main__':
    unittest.main()
