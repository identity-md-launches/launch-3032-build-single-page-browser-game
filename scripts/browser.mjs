import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export async function browserTools() {
  return import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(resolve(process.env.PLAYWRIGHT_MODULE)).href : 'playwright-core');
}

export async function launchBrowser(kind = 'chromium') {
  const tools = await browserTools();
  if (!tools[kind]) throw new Error(`Unsupported browser: ${kind}`);
  return tools[kind].launch({
    headless: true,
    ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}),
    ...(kind === 'chromium' ? { args: ['--no-sandbox'] } : {})
  });
}
