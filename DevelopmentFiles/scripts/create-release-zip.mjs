#!/usr/bin/env node
/**
 * iNWebTools — release packager.
 *
 * Produces a self-contained, deployable ZIP of the Web Application:
 *
 *   inwebtools-web-v<version>.zip
 *     ├── package.json / package-lock.json   (npm ci works offline-ish)
 *     ├── .env.example
 *     ├── server/  dist/ + package.json      (compiled API)
 *     ├── client/  dist/                     (built SPA, served statically)
 *     ├── README.md
 *     └── LICENSE
 *
 * Usage:
 *   node DevelopmentFiles/scripts/create-release-zip.mjs [--version 1.2.3] [--out release]
 *
 * Run from the repository root or from WebApplication/ — both work.
 */

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const WEB_APP = path.join(REPO_ROOT, "WebApplication");

/* ------------------------------- helpers ------------------------------- */

const log = {
  step: (m) => console.info(`\n\x1b[36m▶\x1b[0m ${m}`),
  ok: (m) => console.info(`  \x1b[32m✓\x1b[0m ${m}`),
  warn: (m) => console.warn(`  \x1b[33m!\x1b[0m ${m}`),
  fail: (m) => console.error(`  \x1b[31m✗\x1b[0m ${m}`),
};

function parseArgs(argv) {
  const args = { version: null, out: "release" };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--version") args.version = argv[++i] ?? null;
    else if (argv[i] === "--out") args.out = argv[++i] ?? "release";
  }
  return args;
}

function run(cmd, cmdArgs, cwd) {
  return execFileSync(cmd, cmdArgs, { cwd, stdio: "inherit", shell: process.platform === "win32" });
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

/** Copy a directory recursively, skipping noise. */
const SKIP = new Set(["node_modules", ".git", "tmp", ".DS_Store", ".env"]);
function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(from, to);
    else if (entry.isFile()) fs.copyFileSync(from, to);
  }
}

function sha256(file) {
  return createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function humanSize(bytes) {
  const units = ["B", "KB", "MB", "GB"];
  let n = bytes;
  let u = 0;
  while (n >= 1024 && u < units.length - 1) {
    n /= 1024;
    u += 1;
  }
  return `${n.toFixed(u === 0 ? 0 : 1)} ${units[u]}`;
}

/* --------------------------------- main -------------------------------- */

function main() {
  const args = parseArgs(process.argv.slice(2));

  const pkg = readJson(path.join(WEB_APP, "package.json"));
  const version = (args.version ?? pkg.version).replace(/^v/, "");
  const name = `inwebtools-web-v${version}`;

  const outDir = path.isAbsolute(args.out) ? args.out : path.join(REPO_ROOT, args.out);
  const stageDir = path.join(outDir, name);
  const zipPath = path.join(outDir, `${name}.zip`);

  log.step(`Packaging iNWebTools Web Application v${version}`);

  /* 1. Clean ---------------------------------------------------------- */
  log.step("Cleaning previous artifacts");
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(stageDir, { recursive: true });
  log.ok(`staging at ${path.relative(REPO_ROOT, stageDir)}`);

  /* 2. Build ---------------------------------------------------------- */
  log.step("Building server and client");
  run("npm", ["run", "build"], WEB_APP);
  log.ok("build complete");

  const clientDist = path.join(WEB_APP, "client", "dist");
  for (const [label, dir] of [["client/dist", clientDist]]) {
    if (!fs.existsSync(dir)) {
      log.fail(`${label} missing after build — aborting.`);
      process.exit(1);
    }
  }

  /* 3. Stage ---------------------------------------------------------- */
  log.step("Staging deployable files");

  // Root manifest, stripped of dev-only concerns.
  const releasePkg = {
    name: pkg.name,
    version,
    private: true,
    description: pkg.description,
    license: pkg.license,
    type: pkg.type,
    engines: pkg.engines,
    workspaces: ["server"],
    scripts: { start: "npm --workspace server run start" },
  };
  fs.writeFileSync(path.join(stageDir, "package.json"), `${JSON.stringify(releasePkg, null, 2)}\n`);
  log.ok("package.json (production)");

  const lock = path.join(WEB_APP, "package-lock.json");
  if (fs.existsSync(lock)) {
    fs.copyFileSync(lock, path.join(stageDir, "package-lock.json"));
    log.ok("package-lock.json");
  }

  fs.copyFileSync(path.join(WEB_APP, ".env.example"), path.join(stageDir, ".env.example"));
  log.ok(".env.example");

  // Server: compiled output + a runtime-only manifest.
  const serverPkg = readJson(path.join(WEB_APP, "server", "package.json"));
  fs.mkdirSync(path.join(stageDir, "server"), { recursive: true });
  fs.writeFileSync(
    path.join(stageDir, "server", "package.json"),
    `${JSON.stringify(
      {
        name: serverPkg.name,
        version,
        private: true,
        type: serverPkg.type,
        main: serverPkg.main,
        engines: serverPkg.engines,
        scripts: { start: "node index.js" },
        dependencies: serverPkg.dependencies,
      },
      null,
      2,
    )}\n`,
  );
  // The server runs directly from source (plain ESM JavaScript, no build step).
  //
  // Copy everything except what a deployment must not receive, rather than
  // listing what it should. The old allow-list named index.js, config,
  // middlewares, services and utils — so when db/ and routes/ were added later
  // nobody remembered to add them here, and the packager cheerfully produced
  // an archive whose server could not start: index.js imports ./db/index.js
  // and ./routes/*.routes.js, none of which were inside. An exclude list fails
  // the safe way, by shipping something unnecessary instead of omitting
  // something essential.
  const SERVER_EXCLUDE = new Set([
    "node_modules",
    "tests", // vitest suites are not deployed
    "tmp", // recreated empty below
    ".env", // real secrets — never
    ".env.example", // copied explicitly further down
    "package.json", // a production manifest is generated above
    "coverage",
    ".DS_Store",
  ]);

  for (const entry of fs.readdirSync(path.join(WEB_APP, "server"))) {
    if (SERVER_EXCLUDE.has(entry)) continue;
    const from = path.join(WEB_APP, "server", entry);
    const to = path.join(stageDir, "server", entry);
    if (fs.statSync(from).isDirectory()) copyDir(from, to);
    else fs.copyFileSync(from, to);
  }

  // Guard the mistake that produced a broken v1.0.2 artifact: every relative
  // import in index.js must resolve inside the staged tree.
  const indexSource = fs.readFileSync(path.join(stageDir, "server", "index.js"), "utf8");
  const missing = [...indexSource.matchAll(/from\s+["']\.\/([^"']+)["']/g)]
    .map((m) => m[1])
    .filter((rel) => !fs.existsSync(path.join(stageDir, "server", rel)));
  if (missing.length > 0) {
    log.fail(`server/index.js imports files that were not packaged: ${missing.join(", ")}`);
    process.exit(1);
  }
  fs.mkdirSync(path.join(stageDir, "server", "tmp"), { recursive: true });
  fs.writeFileSync(path.join(stageDir, "server", "tmp", ".gitkeep"), "");
  fs.copyFileSync(
    path.join(WEB_APP, "server", ".env.example"),
    path.join(stageDir, "server", ".env.example"),
  );
  log.ok("server source + runtime manifest");

  // Client: static build only.
  copyDir(clientDist, path.join(stageDir, "client", "dist"));
  log.ok("client/dist");

  // Docs shipped with the artifact.
  for (const [from, to] of [
    [path.join(WEB_APP, "README.md"), "README.md"],
    [path.join(REPO_ROOT, "LICENSE"), "LICENSE"],
    [path.join(REPO_ROOT, "DevelopmentFiles", "CHANGELOG.md"), "CHANGELOG.md"],
  ]) {
    if (fs.existsSync(from)) {
      fs.copyFileSync(from, path.join(stageDir, to));
      log.ok(to);
    }
  }

  // Deployment instructions.
  fs.writeFileSync(
    path.join(stageDir, "DEPLOY.md"),
    `# Deploying iNWebTools v${version}

\`\`\`bash
unzip ${name}.zip && cd ${name}

cp .env.example .env
#   -> set HF_FREE_API_TOKEN, and NODE_ENV=production

npm ci --omit=dev      # installs server runtime dependencies only
npm start              # API listens on $PORT (default 5000)
\`\`\`

The built SPA is in \`client/dist/\`. Serve it with any static host, or let the
Express server serve it when \`NODE_ENV=production\`.

Requires Node.js ${pkg.engines?.node ?? ">=20"}.
`,
  );
  log.ok("DEPLOY.md");

  /* 4. Zip ------------------------------------------------------------ */
  log.step("Creating archive");
  try {
    run("zip", ["-rq", zipPath, name], outDir);
  } catch {
    log.warn("`zip` unavailable — falling back to tar+PowerShell is not portable; trying node");
    log.fail("Please install `zip` (apt-get install zip) or run this in CI.");
    process.exit(1);
  }

  const bytes = fs.statSync(zipPath).size;
  const digest = sha256(zipPath);
  fs.writeFileSync(`${zipPath}.sha256`, `${digest}  ${name}.zip\n`);

  // Staging dir is redundant once zipped.
  fs.rmSync(stageDir, { recursive: true, force: true });

  log.step("Done");
  log.ok(`${path.relative(REPO_ROOT, zipPath)}  (${humanSize(bytes)})`);
  log.ok(`sha256: ${digest}`);

  // Expose results to GitHub Actions.
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(
      process.env.GITHUB_OUTPUT,
      `zip_path=${zipPath}\nzip_name=${name}.zip\nversion=${version}\nsha256=${digest}\n`,
    );
  }
}

main();
