# ThemeSpace production deployment

The production URL is **https://themespace.app**. The app runs on Contabo
(`38.242.239.182`) as the independent Compose stack `/var/docker/themespace`.
Its existing Dokploy Traefik provides routing on `dokploy-network`, redirects
HTTP to HTTPS, and issues a Let's Encrypt certificate. The app has no published
host port. Cloudflare holds a DNS-only apex A record pointing to Contabo.

## Release

GitHub Actions **Web deploy (production)** builds and publishes
`ghcr.io/hashimkarim/themespace:sha-COMMIT` when `main` changes. To deploy, manually
run that workflow on `main` and enable **Deploy the built image to production**:

```sh
gh workflow run web-deploy-production.yml --ref main -f deploy=true
```

The Docker build runs typecheck, lint, unit tests, the D1 API suite, and the same
API suite against the standalone Node build. Pull requests run checks on hosted
runners without production credentials. Deployments use the exact resulting
image digest and wait for `/api/health` to pass. That endpoint verifies account
configuration and database access. Confirm the public route after a release:

```sh
curl --fail https://themespace.app/api/health
```

The `production` GitHub environment permits only `main`. Its dedicated SSH key
is restricted to `themespace-deploy` and `themespace-status`. A root-owned copy
of `ssh_entry.py`, `remote.py`, `target.json`, and `compose.json` lives under
`/usr/local/lib/themespace-deploy`. The entry point rejects changes to the pinned
app, Compose configuration, or deployment root. It ignores caller-supplied code;
this identity cannot open a shell or forward ports. Updating deployment topology
requires an administrator to reconcile those pinned files deliberately.

## Configuration and data

The image runs Node 24 as the unprivileged `node` user, with a read-only root
filesystem, a temporary `/tmp`, and persistent `/data` storage. The named Docker
volume **themespace-data** contains `themespace.sqlite` and its WAL files.
Replacing or rolling back the container preserves that volume.

| Setting | Production value/location |
| --- | --- |
| `BETTER_AUTH_URL`, `SITE_URL` | `https://themespace.app`, in Compose |
| `VINEXT_TRUSTED_HOSTS` | `themespace.app`, in Compose |
| `DATABASE_PATH` | `/data/themespace.sqlite`, in the image's runtime defaults |
| `BETTER_AUTH_SECRET` | `/var/docker/themespace/runtime.env`, mode `0600` |

The production auth secret is generated on the server and does not enter Git,
the image, build arguments, or CI. Preserve it across releases to keep sessions
valid. The checked-in Drizzle migrations run transactionally before the server
starts. Local D1 preview data is separate; no local users or test themes are
copied to production. Email verification and password recovery still require
a mail provider and are not enabled.

Back up SQLite through its online backup API, rather than copying a live WAL
database file. From an administrator session on Contabo:

```sh
docker exec themespace-app-1 node --input-type=module -e '
  import Database from "better-sqlite3";
  const db = new Database("/data/themespace.sqlite");
  await db.backup("/data/themespace-backup.sqlite");
  db.close();
'
```

Copy that completed snapshot to protected backup storage and preserve the
private runtime secret separately. Automated off-server backups are not
configured by this deployment.

## Rollback

The deployment helper records ownership, the current digest, and Compose hash
in `.web-deploy.json`, and retains the prior successful Compose file as
`.web-deploy.previous.json`. Failed updates automatically restore and verify the
previous container. A failed first deployment has no previous version to restore.

For a deliberate code rollback, revert the application change on `main` and run
the release workflow again. The pinned topology and data volume stay unchanged.
The helper does not undo migrations or restore database contents. For an urgent
administrator recovery, inspect the recorded previous configuration, restore it,
start its cached image, verify health, and reconcile the marker with the running
image before another CI deployment. Never delete the volume or edit managed
Compose files through Dokploy/Dockge without reconciling this deployment state.
