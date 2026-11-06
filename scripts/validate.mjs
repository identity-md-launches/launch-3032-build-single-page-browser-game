import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { launchBrowser } from './browser.mjs';
import { makePreview } from './preview.mjs';

const output = resolve(import.meta.dirname, '../test/scratch/validation');
await mkdir(output, { recursive: true });
const server = makePreview();
await new Promise((done) => server.listen(0, '127.0.0.1', done));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
const checks = [];
const errors = [];
const remoteRequests = [];
async function check(name, run) {
  await run();
  checks.push(name);
  console.log(`PASS: ${name}`);
}
try {
  browser = await launchBrowser(process.env.TEST_BROWSER ?? 'chromium');
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  await context.route('**/*', (route) => {
    if (route.request().url().startsWith(origin)) return route.continue();
    remoteRequests.push(route.request().url());
    return route.abort();
  });
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('response', (response) => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
  await page.goto(`${origin}/preview/`);
  const text = (selector) => page.locator(selector).innerText();
  async function taps(count) {
    await page.evaluate((count) => { for (let i = 0; i < count; i++) document.getElementById('hamster-button').click(); }, count);
  }
  await check('Initial state: zero balance, 1 coin/tap, no automatic income, three locked upgrades', async () => {
    assert.equal(await text('#balance'), '0');
    assert.equal(await text('#per-tap'), '1');
    assert.equal(await text('#per-second'), '0');
    assert.equal(await text('#multiplier'), '1');
    assert.equal(await page.locator('.buy-button:disabled').count(), 3);
    await page.screenshot({ path: `${output}/mobile-390.png` });
    await page.screenshot({ path: `${output}/mobile-390-full.png`, fullPage: true });
  });
  await check('At 390 × 844, the complete primary button is visible on the first screen', async () => {
    const rect = await page.locator('#hamster-button').boundingBox();
    assert.ok(rect && rect.y >= 0 && rect.y + rect.height <= 844);
    assert.ok(rect.width >= 44 && rect.height >= 44);
  });
  await check('Real touch earns one coin and creates +1 feedback', async () => {
    await page.locator('#hamster-button').tap({ force: true });
    assert.equal(await text('#balance'), '1');
    assert.equal(await page.locator('.floating-coin').last().innerText(), '+1');
  });
  await check('Space and Enter each activate the focused hamster', async () => {
    await page.locator('#hamster-button').focus();
    await page.keyboard.press('Space');
    await page.keyboard.press('Enter');
    assert.equal(await text('#balance'), '3');
  });
  await check('Stronger tap unlocks at exactly 20 coins and charges its full price', async () => {
    await taps(16);
    assert.equal(await text('#balance'), '19');
    assert.ok(await page.locator('#buy-tap').isDisabled());
    await page.evaluate(() => document.getElementById('buy-tap').click());
    assert.equal(await text('#balance'), '19');
    await taps(1);
    assert.ok(await page.locator('#buy-tap').isEnabled());
    assert.equal(await page.locator('#goal').getAttribute('aria-valuenow'), '100');
    await page.locator('#buy-tap').focus();
    await page.keyboard.press('Enter');
    assert.equal(await text('#balance'), '0');
    assert.equal(await text('#per-tap'), '2');
    assert.equal(await text('#tap-price'), '32');
    assert.equal(await text('#tap-level'), 'Level 1');
    assert.ok(await page.locator('#buy-tap').isDisabled());
  });
  await check('Keyboard focus remains usable after buying an upgrade that becomes disabled', async () => {
    assert.equal(await page.evaluate(() => document.activeElement.id), 'hamster-button');
    await page.keyboard.press('Space');
    assert.equal(await text('#balance'), '2');
  });
  await check('Auto-tapper charges 60, increases its next price to 99, and earns whole coins over time', async () => {
    await taps(29);
    assert.equal(await text('#balance'), '60');
    await page.locator('#buy-auto').click({ force: true });
    assert.equal(await text('#balance'), '0');
    assert.equal(await text('#per-second'), '1');
    assert.equal(await text('#auto-price'), '99');
    await page.clock.runFor(1000);
    assert.equal(await text('#balance'), '1');
    await page.clock.runFor(250);
    assert.equal(await text('#balance'), '1');
    await page.clock.runFor(750);
    assert.equal(await text('#balance'), '2');
  });
  await check('Multiplier charges 150, increases the next price to 330, and multiplies taps and automatic income', async () => {
    await taps(74);
    assert.equal(await text('#balance'), '150');
    await page.locator('#buy-multiplier').click({ force: true });
    assert.equal(await text('#balance'), '0');
    assert.equal(await text('#per-tap'), '4');
    assert.equal(await text('#per-second'), '2');
    assert.equal(await text('#multiplier'), '2');
    assert.equal(await text('#multiplier-price'), '330');
    await page.clock.runFor(1000);
    assert.equal(await text('#balance'), '2');
    await taps(1);
    assert.equal(await text('#balance'), '6');
    assert.equal(await page.locator('.floating-coin').last().innerText(), '+4');
  });
  await check('Repeated purchases stack and prices round upward: 32→52, 99→164, 330→726', async () => {
    await taps(7);
    assert.equal(await text('#balance'), '34');
    await page.locator('#buy-tap').click({ force: true });
    assert.equal(await text('#balance'), '2');
    assert.equal(await text('#per-tap'), '6');
    assert.equal(await text('#tap-price'), '52');
    await taps(17);
    assert.equal(await text('#balance'), '104');
    await page.locator('#buy-auto').click({ force: true });
    assert.equal(await text('#balance'), '5');
    assert.equal(await text('#auto-price'), '164');
    assert.equal(await text('#per-second'), '4');
    await page.clock.runFor(250);
    // The interval has delivered two 100 ms ticks; settle the final 50 ms with the next tap.
    await taps(1);
    assert.equal(await text('#balance'), '12');
    await taps(53);
    assert.equal(await text('#balance'), '330');
    await page.locator('#buy-multiplier').click({ force: true });
    assert.equal(await text('#balance'), '0');
    assert.equal(await text('#multiplier'), '3');
    assert.equal(await text('#per-tap'), '9');
    assert.equal(await text('#per-second'), '6');
    assert.equal(await text('#multiplier-price'), '726');
  });
  await check('Fast taps keep feedback bounded and clean it up', async () => {
    await taps(50);
    assert.ok(await page.locator('.floating-coin').count() <= 16);
    await page.clock.runFor(800);
    assert.equal(await page.locator('.floating-coin').count(), 0);
  });
  await check('Native help dialog supports keyboard focus, Escape and return to the trigger', async () => {
    await page.locator('#help-button').focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('#help-dialog').evaluate((dialog) => dialog.open), true);
    assert.equal(await page.evaluate(() => document.activeElement.id), 'close-help');
    await page.keyboard.press('Tab');
    assert.ok(await page.evaluate(() => document.activeElement.closest('dialog') !== null || document.activeElement === document.body));
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#help-dialog').evaluate((dialog) => dialog.open), false);
    assert.equal(await page.evaluate(() => document.activeElement.id), 'help-button');
  });
  await check('Reduced motion uses a finite opacity fade, with no travel or endless animation', async () => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await taps(1);
    assert.equal(await page.locator('.floating-coin').last().evaluate((el) => getComputedStyle(el).animationName), 'coin-fade');
    assert.equal(await page.evaluate(() => document.getAnimations().filter((a) => a.effect.getTiming().iterations === Infinity).length), 0);
    await page.clock.runFor(800);
  });
  await check('Reload resets all progress and no cookies or browser storage are used', async () => {
    await page.reload();
    assert.equal(await text('#balance'), '0');
    assert.equal(await text('#per-tap'), '1');
    assert.equal(await text('#per-second'), '0');
    assert.equal(await text('#multiplier'), '1');
    assert.equal(await text('#tap-level'), 'Level 0');
    assert.equal(await page.evaluate(() => localStorage.length + sessionStorage.length), 0);
    assert.equal((await context.cookies()).length, 0);
  });
  await check('Once loaded, the game, purchases and auto-tapper work with the browser offline', async () => {
    await context.setOffline(true);
    await taps(20);
    await page.locator('#buy-tap').click({ force: true });
    assert.equal(await text('#per-tap'), '2');
    await taps(30);
    await page.locator('#buy-auto').click({ force: true });
    assert.equal(await text('#balance'), '0');
    await page.clock.runFor(1000);
    assert.equal(await text('#balance'), '1');
    await context.setOffline(false);
  });
  await context.close();

  await check('Responsive reflow: no horizontal overflow at 320, 390, 576, 895, 896, 1024 or 1440', async () => {
    for (const width of [320, 390, 576, 895, 896, 1024, 1440]) {
      const layout = await browser.newPage({ viewport: { width, height: width < 600 ? 844 : 900 } });
      await layout.goto(`${origin}/preview/`);
      assert.ok(await layout.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Overflow at ${width}`);
      assert.equal(await layout.locator('.buy-button').count(), 3);
      if ([320, 896, 1440].includes(width)) await layout.screenshot({ path: `${output}/layout-${width}.png`, fullPage: true });
      if (width === 1440) {
        await layout.locator('#hamster-button').focus();
        const focus = await layout.locator('#hamster-button').evaluate((el) => ({ width: getComputedStyle(el).outlineWidth, style: getComputedStyle(el).outlineStyle }));
        assert.equal(focus.style, 'solid');
        assert.equal(focus.width, '3px');
        await layout.screenshot({ path: `${output}/keyboard-focus.png` });
      }
      await layout.close();
    }
  });
  await check('200% text enlargement reflows without horizontal overflow', async () => {
    const zoom = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await zoom.goto(`${origin}/preview/`);
    await zoom.addStyleTag({ content: 'html { font-size: 200%; }' });
    assert.ok(await zoom.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await zoom.screenshot({ path: `${output}/text-200.png`, fullPage: true });
    await zoom.close();
  });
  await check('Forced colors preserve the hamster illustration and use a system focus indicator', async () => {
    const forced = await browser.newPage({ viewport: { width: 390, height: 844 }, forcedColors: 'active' });
    await forced.goto(`${origin}/preview/`);
    await forced.locator('#hamster-button').focus();
    assert.equal(await forced.locator('.hamster').evaluate((el) => getComputedStyle(el).forcedColorAdjust), 'none');
    assert.equal(await forced.locator('.hamster .head').evaluate((el) => getComputedStyle(el).backgroundColor), 'rgb(214, 154, 88)');
    await forced.screenshot({ path: `${output}/forced-colors.png` });
    await forced.close();
  });
  await check('Automated accessibility audit has no WCAG A/AA violations in initial, upgraded and help states', async () => {
    const require = createRequire(import.meta.url);
    const axePath = process.env.AXE_SOURCE ?? require.resolve('axe-core/axe.min.js');
    const accessible = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await accessible.goto(`${origin}/preview/`);
    await accessible.addScriptTag({ path: axePath });
    const audits = [];
    for (const state of ['initial', 'upgraded', 'help']) {
      if (state === 'upgraded') {
        await accessible.evaluate(() => { for (let i = 0; i < 20; i++) document.getElementById('hamster-button').click(); });
        await accessible.locator('#buy-tap').click();
        await accessible.waitForTimeout(800);
        await accessible.screenshot({ path: `${output}/upgraded-mobile.png`, fullPage: true });
      }
      if (state === 'help') {
        await accessible.locator('#help-button').click();
        await accessible.screenshot({ path: `${output}/help-dialog.png` });
      }
      const results = await accessible.evaluate(async () => window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] } }));
      audits.push({ state, violations: results.violations, incomplete: results.incomplete.map((item) => ({ id: item.id, description: item.description, nodes: item.nodes.map((node) => ({ target: node.target, html: node.html, summary: node.failureSummary })) })) });
      assert.deepEqual(results.violations.map((item) => `${item.id}: ${item.description}`), [], state);
    }
    // axe 4.10 cannot resolve some top-layer dialog backgrounds. Confirm these actual solid pairs.
    const helpContrast = await accessible.evaluate(() => {
      const parse = (value) => value.match(/[\d.]+/g).map(Number);
      const luminance = (rgb) => {
        const values = rgb.slice(0, 3).map((value) => { const n = value / 255; return n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4; });
        return values[0] * .2126 + values[1] * .7152 + values[2] * .0722;
      };
      return ['#help-title', '.instructions li', '.help-note'].map((selector) => {
        const el = document.querySelector(selector);
        const dialog = document.querySelector('#help-dialog');
        const foreground = getComputedStyle(el).color;
        const background = getComputedStyle(dialog).backgroundColor;
        const fg = luminance(parse(foreground));
        const bg = luminance(parse(background));
        return { selector, foreground, background, opaque: parse(background).length === 3 || parse(background)[3] === 1, ratio: (Math.max(fg, bg) + .05) / (Math.min(fg, bg) + .05) };
      });
    });
    for (const pair of helpContrast) { assert.ok(pair.opaque); assert.ok(pair.ratio >= 4.5, JSON.stringify(pair)); }
    await writeFile(`${output}/help-contrast.json`, JSON.stringify(helpContrast, null, 2) + '\n');
    await writeFile(`${output}/accessibility.json`, JSON.stringify(audits, null, 2) + '\n');
    await accessible.close();
  });
  await check('The downloaded HTML runs directly from file:// with no server', async () => {
    const local = await browser.newPage();
    await local.goto(pathToFileURL(resolve(import.meta.dirname, '../dist/index.html')).href);
    await local.locator('#hamster-button').click();
    assert.equal(await local.locator('#balance').innerText(), '1');
    await local.close();
  });
  await check('Sharing metadata resolves to actual local favicon and a 1200 × 630 PNG', async () => {
    const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
    for (const required of ['<title>Hamster Tap Tycoon</title>', 'name="description"', 'property="og:title"', 'property="og:image"']) assert.ok(html.includes(required));
    for (const asset of ['favicon.svg', 'share-card.png']) assert.equal((await fetch(`${origin}/preview/assets/${asset}`)).status, 200);
    const png = await readFile(new URL('../dist/assets/share-card.png', import.meta.url));
    assert.equal(png.readUInt32BE(16), 1200);
    assert.equal(png.readUInt32BE(20), 630);
  });
  await check('No page/console/resource errors and no external network requests', async () => {
    assert.deepEqual(errors, []);
    assert.deepEqual(remoteRequests, []);
  });
  await writeFile(`${output}/results.json`, JSON.stringify({ browser: await browser.version(), engine: process.env.TEST_BROWSER ?? 'chromium', passed: checks.length, checks, errors, remoteRequests }, null, 2) + '\n');
  console.log(`\n${checks.length} interaction and export checks passed.`);
} finally {
  await browser?.close();
  await new Promise((done) => server.close(done));
}
