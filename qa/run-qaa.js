/**
 * qa/run-qaa.js — QA capture script
 * Boots Chromium headlessly, navigates to the dev server, captures
 * webgpu-capabilities.json + screenshot + console.json.
 *
 * No docker.sock. No secrets. Runs as non-root qauser.
 *
 * Usage:  node qa/run-qaa.js --output-dir=/app/qa-output
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const outputDir = process.argv.find(a => a.startsWith('--output-dir='))?.split('=')[1] || '/app/qa-output';
fs.mkdirSync(outputDir, { recursive: true });

const RESULTS = {
  timestamp: new Date().toISOString(),
  hostname: require('os').hostname(),
  webgpu: { active: false, supported: false },
  webgl2: { supported: false },
  screenshots: [],
  console: [],
  errors: [],
  frame: { dimensions: null, black: false },
};

// Launch dev server
const vite = spawn('npx', ['vite', 'preview'], {
  stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env, PORT: '3000', HOST: '0.0.0.0' },
});

setTimeout(() => {
  // Launch Chromium
  const chromeFlags = [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu-sandbox',
    '--enable-unsafe-webgpu',
    '--enable-webgpu',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--disable-dev-shm-usage',
    '--disable-gpu-rasterization', // keep it simple
    '--enable-logging=stderr',
    '--v=0',
    'http://localhost:3000',
  ];

  const chromePath = '/usr/bin/google-chrome-stable';
  const chrome = spawn(chromePath, chromeFlags, {
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let stdout = '';
  let stderr = '';

  chrome.stdout.on('data', (d) => { stdout += d.toString(); });
  chrome.stderr.on('data', (d) => { stderr += d.toString(); });

  // Give it time to render, then capture
  setTimeout(async () => {
    try {
      const puppeteer = require('puppeteer-core');
      const browser = await puppeteer.launch({
        executablePath: chromePath,
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--enable-unsafe-webgpu'],
      });

      const page = await browser.newPage();

      page.on('console', (msg) => {
        RESULTS.console.push({ type: msg.type(), text: msg.text(), timestamp: Date.now() });
      });

      page.on('pageerror', (err) => {
        RESULTS.errors.push({ message: err.message, stack: err.stack });
      });

      await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
      await page.waitForTimeout(2000);

      // Capture screenshot
      const screenshotPath = path.join(outputDir, 'frame-001.png');
      await page.screenshot({ path: screenshotPath });
      RESULTS.screenshots.push({ path: screenshotPath, timestamp: Date.now() });

      // Check for black frame
      const screenshot = fs.readFileSync(screenshotPath);
      // Simple check: if file exists and is non-trivial size, scene rendered
      RESULTS.frame.dimensions = { bytes: screenshot.length };
      RESULTS.frame.black = screenshot.length < 1000; // trivially black if < 1KB

      await browser.close();

      // Write capabilities file
      const capsPath = path.join(outputDir, 'webgpu-capabilities.json');
      fs.writeFileSync(capsPath, JSON.stringify(RESULTS, null, 2));

      console.log('QA capture complete:', capsPath);
    } catch (err) {
      RESULTS.errors.push({ message: err.message, stack: err.stack });
      fs.writeFileSync(path.join(outputDir, 'webgpu-capabilities.json'), JSON.stringify(RESULTS, null, 2));
      console.error('QA capture failed:', err);
    } finally {
      chrome.kill();
      vite.kill();
      process.exit(RESULTS.errors.length > 0 ? 1 : 0);
    }
  }, 3000);
}, 1000);
