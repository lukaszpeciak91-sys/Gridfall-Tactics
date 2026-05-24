import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';

const rootDir = resolve(new URL('..', import.meta.url).pathname);
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const outputDir = resolve(rootDir, 'artifacts', 'screenshots', timestamp);
mkdirSync(outputDir, { recursive: true });

const scenarios = [
  { name: 'mixed-faction-board', inspect: false, filter: 'none' },
  { name: 'mixed-faction-inspect', inspect: true, filter: 'none' },
  { name: 'dark-artwork-board', inspect: false, filter: 'brightness(0.75) saturate(0.9)' },
  { name: 'dark-artwork-inspect', inspect: true, filter: 'brightness(0.75) saturate(0.9)' },
  { name: 'bright-artwork-board', inspect: false, filter: 'brightness(1.2) saturate(1.05)' },
  { name: 'bright-artwork-inspect', inspect: true, filter: 'brightness(1.2) saturate(1.05)' },
];

async function main() {
  let chromium;
  try {
    ({ chromium } = await import('playwright'));
  } catch {
    throw new Error('Playwright is not installed. For local screenshots run `npm i -D playwright` and `npx playwright install chromium` first.');
  }

  const userDataDir = mkdtempSync(join(tmpdir(), 'gridfall-screens-'));
  const devServer = spawn('npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', '4173', '--strictPort'], {
    cwd: rootDir,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  try {
    await waitForServer(devServer, 'http://127.0.0.1:4173');
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

    for (const scenario of scenarios) {
      await page.goto('http://127.0.0.1:4173/?uiCapture=1', { waitUntil: 'networkidle' });
      await page.waitForTimeout(400);
      await page.click('canvas', { position: { x: 195, y: 430 } });
      await page.waitForTimeout(300);
      await page.click('canvas', { position: { x: 195, y: 520 } });
      await page.waitForTimeout(1400);

      if (scenario.inspect) {
        await page.mouse.move(195, 720);
        await page.mouse.down();
        await page.waitForTimeout(650);
        await page.mouse.up();
        await page.waitForTimeout(200);
      }

      if (scenario.filter !== 'none') {
        await page.evaluate((filter) => {
          const app = document.getElementById('app');
          if (app) app.style.filter = filter;
        }, scenario.filter);
      }

      await page.screenshot({ path: join(outputDir, `${scenario.name}.png`) });
    }

    await browser.close();
    const manifestPath = join(outputDir, 'manifest.json');
    writeFileSync(manifestPath, JSON.stringify({ createdAt: new Date().toISOString(), scenarios }, null, 2));
    console.log(`Screenshots saved to ${outputDir}`);
  } finally {
    devServer.kill('SIGTERM');
  }
}

async function waitForServer(child, url) {
  const started = Date.now();
  let buffer = '';
  while (Date.now() - started < 30000) {
    const ready = await fetch(url).then(() => true).catch(() => false);
    if (ready) return;
    await new Promise((r) => setTimeout(r, 250));
  }
  child.kill('SIGTERM');
  throw new Error(`Timed out waiting for dev server. Recent output:\n${buffer}`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
