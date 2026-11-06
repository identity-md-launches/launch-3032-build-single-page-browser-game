import { mkdir, readFile, copyFile, readdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const html = await readFile(resolve(root, 'index.html'), 'utf8');
for (const required of ['<title>', 'name="description"', 'property="og:title"', 'property="og:image"', 'rel="icon"', '<style>', '<script>']) {
  if (!html.includes(required)) throw new Error(`Missing required page element: ${required}`);
}
const output = resolve(root, 'dist');
await rm(output, { recursive: true, force: true });
await mkdir(resolve(output, 'assets'), { recursive: true });
await copyFile(resolve(root, 'index.html'), resolve(output, 'index.html'));
for (const asset of await readdir(resolve(root, 'assets'))) {
  if (!/\.(svg|png)$/.test(asset)) throw new Error(`Unexpected runtime asset: ${asset}`);
  await copyFile(resolve(root, 'assets', asset), resolve(output, 'assets', asset));
}
console.log('Built dist/: self-contained index.html and local sharing assets.');
