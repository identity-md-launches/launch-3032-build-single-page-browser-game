import { readFile } from 'node:fs/promises';
import { launchBrowser } from './browser.mjs';

const svg = await readFile(new URL('../artwork/share-card.svg', import.meta.url), 'utf8');
const browser = await launchBrowser();
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.setContent(`<html><body style="margin:0">${svg}</body></html>`);
  await page.screenshot({ path: new URL('../assets/share-card.png', import.meta.url).pathname });
  console.log('Generated assets/share-card.png (1200 × 630).');
} finally { await browser.close(); }
