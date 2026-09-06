import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { presets } from "../lib/theme";

// An isolated local Worker and database keep test publications out of the preview.
const origin = "http://127.0.0.1:5180";
const server = spawn(
  process.execPath,
  [
    "node_modules/vite/bin/vite.js",
    "--port",
    "5180",
    "--strictPort",
    "--host",
    "127.0.0.1",
  ],
  {
    env: { ...process.env, THEMESPACE_TEST: "1" },
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
    "Development auth must strip spoofed identity headers",
  );
  response = await fetch(origin + "/signin-with-chatgpt?return_to=/", {
    redirect: "manual",
  });
  assert.equal(response.status, 302);
  const cookie = response.headers.get("set-cookie")!.split(";")[0];
  assert.match(cookie, /__sites_local_auth=1/);
  const headers = {
    "Content-Type": "application/json",
    Cookie: cookie,
    Origin: origin,
  };
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
      assert.match(
        html,
        /property="og:image" content="http:\/\/localhost:5173\/og.png"/,
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
    "/og.png",
    "/favicon.png",
  ])
    assert.equal((await fetch(origin + path)).status, 200, path);
  console.log(
    "API checks passed: guest access, identity headers, origin checks, validation, drafts, concurrent versions, immutable snapshots, catalog, and page metadata.",
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
}
