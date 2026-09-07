import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { Buffer } from "node:buffer";
import { setTimeout as delay } from "node:timers/promises";
import { presets } from "../lib/theme";
import { cpSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// An isolated local Worker and database keep test publications out of the preview.
const origin = "http://127.0.0.1:5180";
const production = process.argv.includes("--production");
const temporaryData = production
  ? mkdtempSync(join(tmpdir(), "themespace-api-"))
  : undefined;
// Run the artifact outside this repository so missing packaged dependencies
// cannot accidentally resolve from the development node_modules directory.
const productionApp = temporaryData ? join(temporaryData, "app") : undefined;
if (productionApp)
  cpSync("dist/standalone", productionApp, { recursive: true });
const server = spawn(
  process.execPath,
  production
    ? [join(productionApp!, "scripts/start-production.mjs")]
    : [
        "node_modules/vite/bin/vite.js",
        "--port",
        "5180",
        "--strictPort",
        "--host",
        "127.0.0.1",
      ],
  {
    ...(productionApp ? { cwd: productionApp } : {}),
    env: {
      ...process.env,
      THEMESPACE_TEST: "1",
      CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV: "false",
      BETTER_AUTH_SECRET: Buffer.from(randomBytes(32)).toString("base64"),
      ...(production
        ? {
            NODE_ENV: "production",
            PORT: "5180",
            HOST: "127.0.0.1",
            DATABASE_PATH: join(temporaryData!, "themespace.sqlite"),
            BETTER_AUTH_URL: origin,
            SITE_URL: origin,
          }
        : {}),
    },
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
  },
);
let output = "",
  started = false;
server.stdout.on("data", (chunk) => {
  output = (output + chunk).slice(-20_000);
  if (String(chunk).includes("http://127.0.0.1:5180")) started = true;
});
server.stderr.on("data", (chunk) => {
  output = (output + chunk).slice(-20_000);
});
const source = {
  ...structuredClone(presets[2]),
  id: "test-" + crypto.randomUUID(),
  name: "API verification fixture",
};
async function json(response: Response) {
  return (await response.json()) as Record<string, unknown>;
}
const email = `themespace-${crypto.randomUUID()}@example.invalid`;
const password = Buffer.from(randomBytes(24)).toString("base64url");
const authHeaders = {
  "Content-Type": "application/json",
  Origin: origin,
  "CF-Connecting-IP": "192.0.2.10",
};
function cookies(response: Response) {
  return response.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .join("; ");
}
async function authRequest(
  path: string,
  body: unknown,
  extra: Record<string, string> = {},
) {
  return fetch(origin + "/api/auth/" + path, {
    method: "POST",
    headers: {
      ...authHeaders,
      ...extra,
      ...(production
        ? {
            "X-Real-IP":
              extra["CF-Connecting-IP"] || authHeaders["CF-Connecting-IP"],
          }
        : {}),
    },
    body: JSON.stringify(body),
  });
}
try {
  const deadline = Date.now() + 60_000;
  while (!started && Date.now() < deadline && server.exitCode === null)
    await delay(250);
  assert.ok(started, output);
  let response = await fetch(origin + "/api/session");
  assert.equal(response.status, 200);
  assert.equal((await json(response)).user, null);
  for (const [path, method] of [
    ["/api/draft", "GET"],
    ["/api/draft", "PUT"],
    ["/api/themes", "POST"],
  ]) {
    response = await fetch(origin + path, {
      method,
      ...(method !== "GET" ? { body: JSON.stringify(source) } : {}),
    });
    assert.equal(response.status, 401, path);
  }
  response = await fetch(origin + "/api/draft", {
    headers: {
      "oai-authenticated-user-id": "spoofed",
      "oai-authenticated-user-email": "test@example.invalid",
    },
  });
  assert.equal(
    response.status,
    401,
    "Identity headers must never authenticate an account",
  );
  response = await fetch(origin + "/api/draft", {
    headers: {
      Cookie: "__sites_local_auth=1; themespace.session_token=forged",
    },
  });
  assert.equal(
    response.status,
    401,
    "A development identity or forged cookie cannot access drafts",
  );
  response = await authRequest(
    "sign-up/email",
    { name: "API Tester", email, password },
    { Origin: "https://unrelated.example" },
  );
  assert.equal(response.status, 403, "Sign-up rejects untrusted origins");
  response = await authRequest("sign-up/email", {
    name: "API Tester",
    email,
    password: "short",
  });
  assert.equal(response.status, 400, "Better Auth enforces password length");
  response = await authRequest("sign-up/email", {
    name: "API Tester",
    email,
    password,
  });
  assert.equal(response.status, 200, await response.clone().text());
  const cookie = cookies(response);
  assert.match(cookie, /themespace.session_token=/);
  assert.match(response.headers.get("set-cookie")!, /httponly/i);
  assert.match(response.headers.get("set-cookie")!, /samesite=lax/i);
  response = await fetch(origin + "/api/session", {
    headers: { Cookie: cookie },
  });
  const account = (await json(response)).user as {
    id: string;
    displayName: string;
    email: string;
    emailVerified: boolean;
  };
  assert.equal(account.email, email);
  assert.equal(account.displayName, "API Tester");
  assert.equal(account.emailVerified, false);
  assert.ok(!("token" in account) && !("password" in account));
  const headers = {
    "Content-Type": "application/json",
    Cookie: cookie,
    Origin: origin,
    "X-ThemeSpace-Owner": account.id,
  };
  response = await fetch(origin + "/api/draft", {
    method: "PUT",
    headers: { ...headers, "X-ThemeSpace-Owner": "another-account" },
    body: JSON.stringify(source),
  });
  assert.equal(
    response.status,
    409,
    "A stale tab cannot save after the account changes",
  );
  response = await fetch(origin + "/api/draft", {
    method: "PUT",
    headers: { ...headers, Origin: "https://unrelated.example" },
    body: JSON.stringify(source),
  });
  assert.equal(response.status, 403);
  response = await fetch(origin + "/api/draft", {
    method: "PUT",
    headers,
    body: JSON.stringify({ ...source, targets: ["not-supported"] }),
  });
  assert.equal(response.status, 400);
  response = await fetch(origin + "/api/draft", {
    method: "PUT",
    headers,
    body: "x".repeat(65_537),
  });
  assert.equal(response.status, 413);
  response = await fetch(origin + "/api/draft", {
    method: "PUT",
    headers,
    body: JSON.stringify(source),
  });
  assert.equal(response.status, 200);
  response = await fetch(origin + "/api/draft?owner_id=someone-else", {
    headers,
  });
  const saved = await json(response);
  assert.deepEqual(saved.theme, source);
  assert.match(response.headers.get("cache-control") ?? "", /no-store/);
  const versions = await Promise.all(
    Array.from({ length: 4 }, async () => {
      const r = await fetch(origin + "/api/themes", {
        method: "POST",
        headers,
        body: JSON.stringify(source),
      });
      assert.equal(r.status, 201);
      return (await json(r)) as {
        id: string;
        version: number;
        theme: typeof source;
      };
    }),
  );
  assert.deepEqual(versions.map((v) => v.version).sort(), [1, 2, 3, 4]);
  const first = versions.find((v) => v.version === 1)!;
  const edited = structuredClone(source);
  edited.modes.dark!.accent = "#ff0000";
  response = await fetch(origin + "/api/draft", {
    method: "PUT",
    headers,
    body: JSON.stringify(edited),
  });
  assert.equal(response.status, 200);
  response = await fetch(origin + "/api/themes/" + first.id);
  assert.deepEqual(
    (await json(response)).theme,
    source,
    "Published snapshots remain immutable",
  );
  response = await fetch(origin + "/api/themes");
  const catalog = await json(response);
  assert.ok(
    (catalog.themes as { id: string }[]).some((item) => item.id === first.id),
  );
  response = await fetch(origin + "/api/themes/absent-theme");
  assert.equal(response.status, 404);
  response = await authRequest(
    "sign-up/email",
    { name: "Other account", email: `other-${email}`, password },
    { "CF-Connecting-IP": "192.0.2.20" },
  );
  assert.equal(response.status, 200, await response.clone().text());
  const otherCookie = cookies(response);
  response = await fetch(origin + "/api/draft?owner_id=" + account.id, {
    headers: { Cookie: otherCookie },
  });
  assert.equal(
    (await json(response)).theme,
    null,
    "Accounts cannot read another user's private draft",
  );
  response = await authRequest(
    "update-user",
    { name: "Renamed tester" },
    { Cookie: cookie },
  );
  assert.equal(response.status, 200);
  response = await fetch(origin + "/api/session", {
    headers: { Cookie: cookie },
  });
  assert.equal(
    ((await json(response)).user as { displayName: string }).displayName,
    "Renamed tester",
  );
  response = await authRequest("sign-in/email", {
    email,
    password: "incorrect-password",
  });
  assert.equal(response.status, 401);
  response = await authRequest("sign-in/email", { email, password });
  assert.equal(response.status, 200, await response.clone().text());
  const secondSession = cookies(response);
  response = await authRequest(
    "change-password",
    {
      currentPassword: "incorrect-password",
      newPassword: password + "new",
      revokeOtherSessions: true,
    },
    { Cookie: cookie },
  );
  assert.equal(response.status, 400);
  response = await authRequest(
    "change-password",
    {
      currentPassword: password,
      newPassword: password + "new",
      revokeOtherSessions: true,
    },
    { Cookie: cookie },
  );
  assert.equal(response.status, 200, await response.clone().text());
  const changedCookie = cookies(response) || cookie;
  response = await fetch(origin + "/api/draft", {
    headers: { Cookie: secondSession },
  });
  assert.equal(
    response.status,
    401,
    "Changing a password revokes other sessions",
  );
  response = await authRequest(
    "sign-out",
    {},
    { Cookie: changedCookie, Origin: "https://unrelated.example" },
  );
  assert.equal(response.status, 403);
  response = await authRequest("sign-out", {}, { Cookie: changedCookie });
  assert.equal(response.status, 200);
  response = await fetch(origin + "/api/draft", {
    headers: { Cookie: changedCookie },
  });
  assert.equal(
    response.status,
    401,
    "Signed-out cookies cannot access private drafts",
  );
  response = await authRequest(
    "sign-in/email",
    { email, password },
    { "CF-Connecting-IP": "192.0.2.30" },
  );
  assert.equal(response.status, 401, "The old password no longer works");
  response = await authRequest(
    "sign-in/email",
    { email, password: password + "new" },
    { "CF-Connecting-IP": "192.0.2.30" },
  );
  assert.equal(response.status, 200);
  response = await fetch(origin + "/api/draft", {
    headers: { Cookie: cookies(response) },
  });
  assert.deepEqual(
    (await json(response)).theme,
    edited,
    "The private draft survives sign-out and sign-in",
  );
  const throttled = [];
  for (let attempt = 0; attempt < 5; attempt++) {
    response = await authRequest(
      "sign-in/email",
      { email, password: "wrong-password" },
      { "CF-Connecting-IP": "192.0.2.40" },
    );
    throttled.push(response.status);
  }
  assert.ok(
    throttled.includes(429),
    "Repeated sign-in attempts are rate limited",
  );
  for (const [path, title] of [
    ["/", "ThemeSpace — One theme. Yours everywhere."],
    ["/themes/preset-comfy", "Comfy — ThemeSpace"],
    ["/themes/" + first.id, source.name + " — ThemeSpace"],
  ]) {
    response = await fetch(origin + path);
    assert.equal(response.status, 200, path);
    const html = await response.text();
    assert.ok(html.includes(`<title>${title}</title>`), path + " title");
    if (path === "/") {
      assert.ok(
        html.includes(
          `property="og:image" content="${production ? origin : "http://localhost:5173"}/og.png"`,
        ),
      );
      assert.match(html, /name="twitter:image"/);
    } else {
      assert.ok(html.includes(`property="og:title" content="${title}"`));
      assert.ok(html.includes(`name="twitter:title" content="${title}"`));
      assert.doesNotMatch(html, /<meta[^>]+(?:og:image|twitter:image)/);
    }
  }
  for (const path of [
    "/explore",
    "/integrations",
    "/settings",
    "/components",
    "/account",
    "/account/sign-in",
    "/account/sign-up",
    "/og.png",
    "/favicon.png",
  ])
    assert.equal((await fetch(origin + path)).status, 200, path);
  assert.equal((await fetch(origin + "/account/forgot-password")).status, 404);
  console.log(
    "API checks passed: Better Auth sign-up/sign-in, cookie sessions, profile/password changes, revocation, rate limits, account isolation, draft ownership, publication, and page metadata.",
  );
} catch (error) {
  console.error(output);
  throw error;
} finally {
  if (server.pid) {
    try {
      process.kill(-server.pid, "SIGTERM");
    } catch {}
  }
  if (temporaryData) rmSync(temporaryData, { recursive: true, force: true });
}
