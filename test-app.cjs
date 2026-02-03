const { chromium } = require('playwright');

async function testCoopManager() {
  console.log('Starting browser test...');
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const consoleMessages = [];
  const errors = [];

  // Listen for console messages
  page.on('console', (msg) => {
    const text = msg.text();
    consoleMessages.push(`[${msg.type()}] ${text}`);
    if (msg.type() === 'error') {
      errors.push(text);
    }
  });

  // Listen for page errors
  page.on('pageerror', (error) => {
    errors.push(`Page Error: ${error.message}`);
  });

  try {
    console.log('Navigating to http://localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 30000 });
    
    // Wait a bit for any async operations
    await page.waitForTimeout(2000);

    // Check if the page loaded correctly
    const title = await page.title();
    console.log(`Page title: ${title}`);

    // Check for specific elements
    const sidebar = await page.$('nav, [class*="sidebar"]');
    console.log(`Sidebar found: ${!!sidebar}`);

    const mainContent = await page.$('main, [class*="main"]');
    console.log(`Main content found: ${!!mainContent}`);

    // Print all console messages
    console.log('\n--- Console Messages ---');
    consoleMessages.forEach(msg => console.log(msg));

    // Report errors
    if (errors.length > 0) {
      console.log('\n--- ERRORS FOUND ---');
      errors.forEach(err => console.log(`ERROR: ${err}`));
      process.exitCode = 1;
    } else {
      console.log('\n✓ No console errors detected!');
    }

  } catch (error) {
    console.error('Test failed:', error);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

testCoopManager();
