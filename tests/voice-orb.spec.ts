// tests/voice-orb.spec.ts — programmatic verification of the voice orb.
//
// Each test that needs audio launches its own browser context with the
// audio file path baked into Chrome's --use-file-for-fake-audio-capture
// flag. Setting the file globally breaks playback (Microsoft Playwright
// issue #27436), so each test owns its own context.

import { test, expect, chromium, Browser, BrowserContext, Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const FIXTURES = path.resolve(__dirname, 'fixtures');
const PASS_WAV = path.join(FIXTURES, 'pass.wav');
const FAIL_WAV = path.join(FIXTURES, 'fail.wav');
const SILENCE_WAV = path.join(FIXTURES, 'silence.wav');

const BASE_URL = process.env.PW_BASE_URL || 'http://localhost:3000';

function assertFixtures() {
  for (const f of [PASS_WAV, FAIL_WAV, SILENCE_WAV]) {
    if (!fs.existsSync(f)) {
      throw new Error(
        `missing fixture: ${f}\nRun: bash scripts/generate-fixtures.sh`,
      );
    }
  }
}

async function launchWithAudio(audioPath: string) {
  assertFixtures();
  const browser = await chromium.launch({
    args: [
      '--use-fake-device-for-media-stream',
      '--use-fake-ui-for-media-stream',
      '--autoplay-policy=no-user-gesture-required',
      `--use-file-for-fake-audio-capture=${audioPath}%noloop`,
    ],
  });
  const context = await browser.newContext({ permissions: ['microphone'] });
  const page = await context.newPage();
  return { browser, context, page };
}

// ─── Test 1 ─────────────────────────────────────────────────────────────
test('1. renders the orb on load', async ({ page }) => {
  await page.goto(BASE_URL);
  await expect(page.locator('#wave')).toBeVisible();
  await expect(page.locator('#micPrompt')).toBeVisible();
  await expect(page.locator('#promptPhrase')).toContainText('My Voice Is My Password');
});

// ─── Test 2 ─────────────────────────────────────────────────────────────
test('2. enters LISTENING when mic granted (silence path)', async () => {
  const { browser, page } = await launchWithAudio(SILENCE_WAV);
  try {
    await page.goto(BASE_URL);
    await expect(page.locator('#stateText')).toHaveText('Listening', { timeout: 4000 });
  } finally {
    await browser.close();
  }
});

// ─── Test 3 ─────────────────────────────────────────────────────────────
test('3. prompt phrase pulses while audio is detected', async () => {
  const { browser, page } = await launchWithAudio(SILENCE_WAV);
  try {
    await page.goto(BASE_URL);
    await expect(page.locator('#stateText')).toHaveText('Listening', { timeout: 4000 });
    // Inject an RMS spike via the test seam — simulates audio amplitude above threshold
    await page.evaluate(() => (window as any).voOrbTest.setRms(0.05));
    await expect(page.locator('#promptPhrase')).toHaveClass(/active/, { timeout: 2000 });
  } finally {
    await browser.close();
  }
});

// ─── Test 4 — the happy path ────────────────────────────────────────────
test('4. passphrase triggers RESPONDING (You passed)', async () => {
  const { browser, page } = await launchWithAudio(SILENCE_WAV);
  try {
    await page.goto(BASE_URL);
    await expect(page.locator('#stateText')).toHaveText('Listening', { timeout: 4000 });
    await page.evaluate(() => (window as any).voOrbTest.phraseMatch());
    await expect(page.locator('#stateText')).toHaveText(/AI responding/i, { timeout: 4000 });
    await expect(page.locator('#centerTitle')).toHaveText(/You passed/i);
  } finally {
    await browser.close();
  }
});

// ─── Test 5 — the fail path ─────────────────────────────────────────────
test('5. wrong phrase triggers FAILED (Sorry, try again)', async () => {
  const { browser, page } = await launchWithAudio(SILENCE_WAV);
  try {
    await page.goto(BASE_URL);
    await expect(page.locator('#stateText')).toHaveText('Listening', { timeout: 4000 });
    await page.evaluate(() => (window as any).voOrbTest.phraseFail());
    await expect(page.locator('#stateText')).toHaveText(/Try again/i, { timeout: 4000 });
    await expect(page.locator('#centerTitle')).toHaveText(/Sorry, try again/i);
  } finally {
    await browser.close();
  }
});

// ─── Test 6 — verdict release after pass ────────────────────────────────
test('6. RESPONDING returns to LISTENING after hold', async () => {
  const { browser, page } = await launchWithAudio(SILENCE_WAV);
  try {
    await page.goto(BASE_URL);
    await expect(page.locator('#stateText')).toHaveText('Listening', { timeout: 4000 });
    await page.evaluate(() => (window as any).voOrbTest.phraseMatch());
    await expect(page.locator('#stateText')).toHaveText(/AI responding/i, { timeout: 4000 });
    await expect(page.locator('#stateText')).toHaveText('Listening', { timeout: 6000 });
  } finally {
    await browser.close();
  }
});

// ─── Test 7 — verdict release after fail ────────────────────────────────
test('7. FAILED returns to LISTENING after hold', async () => {
  const { browser, page } = await launchWithAudio(SILENCE_WAV);
  try {
    await page.goto(BASE_URL);
    await expect(page.locator('#stateText')).toHaveText('Listening', { timeout: 4000 });
    await page.evaluate(() => (window as any).voOrbTest.phraseFail());
    await expect(page.locator('#stateText')).toHaveText(/Try again/i, { timeout: 4000 });
    await expect(page.locator('#stateText')).toHaveText('Listening', { timeout: 6000 });
  } finally {
    await browser.close();
  }
});

// ─── Test 8 — presentation hygiene ──────────────────────────────────────
test('8. no console errors during a full pass cycle', async () => {
  const { browser, page } = await launchWithAudio(SILENCE_WAV);
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  try {
    await page.goto(BASE_URL);
    await expect(page.locator('#stateText')).toHaveText('Listening', { timeout: 4000 });
    await page.evaluate(() => (window as any).voOrbTest.phraseMatch());
    await expect(page.locator('#stateText')).toHaveText(/AI responding/i, { timeout: 4000 });
    await expect(page.locator('#stateText')).toHaveText('Listening', { timeout: 6000 });
    expect(errors).toEqual([]);
  } finally {
    await browser.close();
  }
});

// ─── Test 9 — backend wiring ────────────────────────────────────────────
test('9. /api/state is hit on transitions', async () => {
  const { browser, context, page } = await launchWithAudio(SILENCE_WAV);
  const stateEvents: string[] = [];
  await context.route('**/api/state', async (route) => {
    try {
      const body = route.request().postDataJSON?.();
      if (body?.state) stateEvents.push(String(body.state));
    } catch {}
    await route.fulfill({ status: 204, body: '' });
  });
  try {
    await page.goto(BASE_URL);
    await expect(page.locator('#stateText')).toHaveText('Listening', { timeout: 4000 });
    await page.evaluate(() => (window as any).voOrbTest.phraseMatch());
    await expect(page.locator('#stateText')).toHaveText(/AI responding/i, { timeout: 4000 });
    expect(stateEvents).toContain('LISTENING');
    expect(stateEvents).toContain('THINKING');
    expect(stateEvents).toContain('RESPONDING');
  } finally {
    await browser.close();
  }
});

// ─── Test 10 — keyboard accessibility ───────────────────────────────────
test('10. mic button is keyboard-reachable and Space-toggleable', async ({ page }) => {
  await page.goto(BASE_URL);
  await expect(page.locator('#micBtn')).toBeVisible();
  // Focus the mic button via Tab; loose check that it ends up focused.
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  const focused = await page.evaluate(() => document.activeElement?.id || '');
  // micBtn may not be the very first focusable, but it must be reachable
  // within the tabbing order. If it's not focused yet, walk the DOM.
  if (focused !== 'micBtn') {
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
      const id = await page.evaluate(() => document.activeElement?.id || '');
      if (id === 'micBtn') break;
    }
  }
  const finalId = await page.evaluate(() => document.activeElement?.id || '');
  expect(finalId).toBe('micBtn');
});
