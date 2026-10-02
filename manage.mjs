#!/usr/bin/env bun
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = fileURLToPath(new URL('.', import.meta.url));
const home = homedir();
const modules = join(home, '.bun/install/global/node_modules');
const tui = join(modules, '@oh-my-pi/pi-tui');
const cli = join(modules, '@oh-my-pi/pi-coding-agent');
const bun = join(home, '.bun/bin/bun.exe');
const sha = text => createHash('sha256').update(text).digest('hex');

export function applyPatch(source, patch) {
  if (sha(source) === patch.patchedSha256) return source;
  if (sha(source) !== patch.originalSha256) throw new Error('Source differs from the verified upstream file; refusing to overwrite.');
  let result = source;
  for (const op of patch.operations) {
    if (result.split(op.before).length !== 2) throw new Error('Patch context is missing or ambiguous.');
    result = result.replace(op.before, op.after);
  }
  if (sha(result) !== patch.patchedSha256) throw new Error('Patched checksum mismatch.');
  return result;
}

async function run(args) {
  const child = Bun.spawn([bun, ...args], { stdin: 'inherit', stdout: 'inherit', stderr: 'inherit' });
  const code = await child.exited;
  if (code) throw new Error(`Command failed (${code}): bun ${args.join(' ')}`);
}

async function manage(command) {
  if (!['apply', 'update', 'status'].includes(command)) throw new Error('Usage: bun manage.mjs apply|update|status');
  if (command === 'update') {
    const response = await fetch('https://registry.npmjs.org/@oh-my-pi/pi-coding-agent/latest');
    if (!response.ok) throw new Error(`Registry lookup failed: ${response.status}`);
    const latest = await response.json();
    try { await readFile(join(dir, `patch-${latest.version}.json`), 'utf8'); }
    catch { throw new Error(`No verified patch for latest ${latest.version}; update NOT performed. Pull this repository after a compatible patch is published.`); }
    await run(['install', '--global', `@oh-my-pi/pi-coding-agent@${latest.version}`]);
  }
  const info = JSON.parse(await readFile(join(tui, 'package.json'), 'utf8'));
  const patchPath = join(dir, `patch-${info.version}.json`);
  let patch;
  try { patch = JSON.parse(await readFile(patchPath, 'utf8')); }
  catch { throw new Error(`No verified patch for ${info.version}. Installation is intact; adapt and verify this version before patching.`); }
  const target = join(tui, patch.file);
  const source = await readFile(target, 'utf8');
  if (command === 'status') {
    console.log(JSON.stringify({ version: info.version, patched: sha(source) === patch.patchedSha256, upstream: sha(source) === patch.originalSha256 }, null, 2));
    return;
  }
  const result = applyPatch(source, patch);
  if (result !== source) {
    const backup = join(home, '.local/state/omp-windows-sixel', info.version);
    await mkdir(backup, { recursive: true });
    await writeFile(join(backup, 'attachment-chips.original.ts'), source, { flag: 'wx' }).catch(error => { if (error.code !== 'EEXIST') throw error; });
    await writeFile(target, result);
  }
  await run([join(cli, 'src/cli.ts'), '--version']);
  const bin = join(home, '.local/bin');
  await mkdir(bin, { recursive: true });
  const launcher = '#!/usr/bin/env bash\nexec "$HOME/.bun/bin/bun.exe" "$HOME/.bun/install/global/node_modules/@oh-my-pi/pi-coding-agent/src/cli.ts" "$@"\n';
  await writeFile(join(bin, 'omp'), launcher, { mode: 0o755 });
  await writeFile(join(bin, 'omp-update'), `#!/usr/bin/env bash\nexec "$HOME/.bun/bin/bun.exe" '${join(dir, 'manage.mjs').replaceAll('\\', '/').replaceAll("'", "'\\''")}' update\n`, { mode: 0o755 });
  console.log(`Sixel patch ${info.version} applied. Restart omp. Future updates: omp-update`);
}
if (import.meta.main) {
  try { await manage(process.argv[2]); }
  catch (error) { console.error(`ERROR: ${error.message}`); process.exitCode = 1; }
}
