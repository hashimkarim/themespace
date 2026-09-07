# ThemeSpace accounts

ThemeSpace runs its own [Better Auth](https://better-auth.com/) instance. The MIT
licensed library handles password hashing, credential checks, database sessions,
cookie security, origin checks, and authentication rate limiting.
[Better Auth UI](https://better-auth-ui.com/docs/shadcn) supplies the sign-in,
sign-up, profile, and password forms. The app authorizes drafts and publishing by the session's
user ID. A separate fleet-management service can integrate later; this app does
not include an admin dashboard or connect to Better Auth's managed infrastructure.

## Local setup

From `web/`, run `npm run auth:setup`, then start the development server. The
setup command fills missing `.env` values and generates a secret with Node's
cryptographic random generator. It never prints the secret or overwrites a
nonempty setting. The default URL is `http://localhost:5173`; change
`BETTER_AUTH_URL` and `SITE_URL` when using another origin. Restart after changes.

Accounts, credentials and sessions persist in local D1 alongside theme data.
Sign-up creates an actual account; the old Sites development identity is no
longer used. Previously stored Sites-owned records are preserved, but are not
automatically assigned to a new account. An exported theme source can be imported
into a new account's Studio.

## Included

- Email/password registration and sign-in, with optional persistent sign-in.
- Profile display-name updates and an account overview.
- Password changes that require the current password and revoke other sessions.
- Sign-out that saves the current draft first and invalidates the session.
- Private account drafts and authenticated publication of immutable versions.
- An explicit choice when the browser draft differs from an existing saved draft.
- Better Auth's database-backed rate limits, including stricter sign-in limits.
- Server-side ownership checks and a stale-account precondition on UI writes,
  preventing a tab from saving its draft into an account opened in another tab.

Email is currently a login identifier, not a verified ownership claim. Email
verification, forgotten-password recovery and changing the email address require
a mail transport and are not enabled. There are no placeholder recovery links.
Social login can be configured later using Better Auth's provider integrations.
No email, SMS, or paid authentication service is required for the included flows.

## Account interface

`web/components/auth/` contains the Better Auth UI shadcn registry components,
with their matching primitives in `components/auth-ui/`. `components.json`
configures that registry; `components/auth/upstream.json` records the installed
source hashes. The runtime packages are `@better-auth-ui/core` and
`@better-auth-ui/react`, with TanStack Query and Form handling their state.

`components/account-provider.tsx` configures the shared Better Auth UI provider
and preserves the draft handoff around sign-in and sign-out. The header uses
Better Auth UI’s `UserButton`, with account links and a save-before-sign-out
action shared with `components/account.tsx`. `/account`, `/account/sign-in`, and `/account/sign-up` are the supported
routes. Profile and password settings appear at `/account` when signed in.
Only enabled account features are exposed; avatar uploads, email changes, and
password recovery are disabled. Account colors inherit the site's selected
appearance, including the live Draft theme.

## Deployment

Set these as runtime values for the app, never as public frontend variables:

| Variable | Value |
| --- | --- |
| `BETTER_AUTH_URL` | The canonical HTTPS origin of this app |
| `BETTER_AUTH_SECRET` | A unique random secret of at least 32 characters |
| `SITE_URL` | The canonical origin for social metadata |
| `DATABASE_PATH` | Absolute persistent SQLite path for the Node deployment |

Contabo runs the standalone Node build with `better-sqlite3` and the native
Drizzle SQLite driver. Its startup script applies `web/drizzle/` migrations
before accepting traffic. Accounts and themes live together in the
`themespace-data` volume, outside the container image. See [deployment](deployment.md).

Worker previews retain the existing D1 `DB` binding. A Cloudflare deployment
would apply migrations through its hosting platform. The additive
account migration also bootstraps a fresh local preview; it does not change or
delete existing theme records. `db/schema.ts` includes Better Auth's core tables
and database rate-limit table. Regenerate migrations when enabling plugins that
add fields.

The auth handler is at `/api/auth/*`; `/api/session` returns only profile data.
All private theme access checks the Better Auth session on the server. Keep
credentials and session tokens out of browser storage and management URLs.
Worker previews use Cloudflare's `CF-Connecting-IP` for rate limiting. Contabo's
private app container uses `X-Real-IP`, which its directly exposed Traefik proxy
replaces with the client's peer IP. DNS is intentionally not Cloudflare-proxied;
adding another proxy hop requires updating the trusted client IP configuration.

Use a separate secret and database for each app instance. Management integration
is not a reason to share signing secrets, credential tables, or user sessions
between independent apps. A future management service should use authenticated,
permission-checked APIs provided by the chosen Better Auth management plugins.

## Verification

`npm run test:api` starts an isolated Worker and D1 store on port 5180 with a
temporary random auth secret. It exercises real sign-up/sign-in, invalid
credentials, cookie flags, profile changes, password changes, session revocation,
origin checks, rate limits, account isolation, stale-owner writes, draft
persistence, publication, and existing page metadata.

After `npm run build:node`, `npm run test:production` runs the same checks
against the actual standalone server with a temporary SQLite database and secret.
