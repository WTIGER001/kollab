const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:8090/personal', { waitUntil: 'networkidle0' });
  
  // Click "New Page"
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.textContent.includes('New Page') || b.textContent.includes('Create'));
    if (btn) btn.click();
  });
  await page.waitForTimeout(1000);
  
  // Type /tabs
  await page.keyboard.type('/tabs');
  await page.waitForTimeout(500);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(500);
  
  // Check active tab
  const tabs = await page.evaluate(() => {
    const tabs = document.querySelectorAll('.MuiTab-root');
    return Array.from(tabs).map(t => ({ text: t.textContent, class: t.className, active: t.classList.contains('Mui-selected') }));
  });
  console.log('Tabs:', tabs);

  // Click second tab input
  await page.evaluate(() => {
    const inputs = document.querySelectorAll('.MuiTab-root input');
    if (inputs[1]) inputs[1].click();
  });
  await page.waitForTimeout(500);
  
  const tabsAfter = await page.evaluate(() => {
    const tabs = document.querySelectorAll('.MuiTab-root');
    return Array.from(tabs).map(t => ({ text: t.textContent, class: t.className, active: t.classList.contains('Mui-selected') }));
  });
  console.log('Tabs After Click Input:', tabsAfter);
  
  // Click second tab padding
  await page.evaluate(() => {
    const tabs = document.querySelectorAll('.MuiTab-root');
    if (tabs[1]) tabs[1].click();
  });
  await page.waitForTimeout(500);
  
  const tabsAfterPadding = await page.evaluate(() => {
    const tabs = document.querySelectorAll('.MuiTab-root');
    return Array.from(tabs).map(t => ({ text: t.textContent, class: t.className, active: t.classList.contains('Mui-selected') }));
  });
  console.log('Tabs After Click Padding:', tabsAfterPadding);

  await browser.close();
})();
