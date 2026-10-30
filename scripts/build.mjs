import { mkdir, copyFile } from 'node:fs/promises';
const targets = ['index.html', 'app.mjs', 'styles.css'];
await mkdir('dist/shared', { recursive: true });
await mkdir('dist/art', { recursive: true });
for (const file of targets) await copyFile('web/' + file, 'dist/' + file);
for (const file of ['index.mjs', 'demo.mjs']) await copyFile('packages/domain/' + file, 'dist/shared/' + file);
for (const file of ['townhouse.svg', 'bungalow.svg', 'apartment.svg']) await copyFile('web/art/' + file, 'dist/art/' + file);
console.log('Built dist: web app, shared domain and local illustrations.');
