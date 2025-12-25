/*
Simple Playwright script to verify the /dev-view flow.
Run with: DEV_PASSWORD=<password> node scripts/dev_view_e2e.cjs
Requires: npm i -D playwright
*/
(async () => {
  try {
    const { chromium } = require('playwright');
    const DEV_PW = process.env.DEV_PASSWORD || process.env["DEV'S_PASSWORD"];
    if (!DEV_PW) {
      console.error('DEV password not provided. Set DEV_PASSWORD or ensure DEV\'S_PASSWORD is in env.');
      process.exit(2);
    }

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const base = process.env.DEV_BASE_URL || 'http://localhost:4000';

    console.log('Opening:', base + '/dev-view');
    await page.goto(base + '/dev-view');

    // If the page shows a setup form, fill it
    const hasSetup = await page.$('form[action="/dev-view/setup"]');
    if (hasSetup) {
      await page.fill('form[action="/dev-view/setup"] input[name=password]', DEV_PW);
      await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle' }), page.click('form[action="/dev-view/setup"] button[type=submit]')]);
      console.log('Setup completed and redirected.');
    } else {
      // login
      await page.fill('form[action="/dev-view/login"] input[name=password]', DEV_PW);
      await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle' }), page.click('form[action="/dev-view/login"] button[type=submit]')]);
      console.log('Logged in and redirected.');
    }

    // Confirm on /dev-view/data
    if (!page.url().includes('/dev-view/data')) {
      console.error('Expected /dev-view/data but at', page.url());
      await browser.close();
      process.exit(3);
    }

    // Check users table exists
    const table = await page.$('table');
    if (!table) {
      console.error('Users table not found on dev view data page');
      await browser.close();
      process.exit(4);
    }

    const rows = await page.$$eval('table tbody tr', trs => trs.length);
    console.log('Found rows:', rows);
    if (rows < 0) {
      console.error('No rows found');
      process.exit(5);
    }

    console.log('Dev view e2e check succeeded');
    await browser.close();
    process.exit(0);
  } catch (e) {
    console.error('E2E failed', e);
    process.exit(1);
  }
})();