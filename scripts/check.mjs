import { spawnSync } from 'node:child_process';
import { readdir } from 'node:fs/promises';
async function walk(path) {
  for (const e of await readdir(path, { withFileTypes: true })) {
    const file = path + '/' + e.name;
    if (e.isDirectory()) await walk(file);
    else if (file.endsWith('.mjs')) {
      const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
      if (result.status !== 0) process.exit(result.status ?? 1);
    }
  }
}
for (const dir of ['web', 'worker', 'packages', 'scripts', 'tests']) await walk(dir);
console.log('JavaScript syntax checks passed.');
