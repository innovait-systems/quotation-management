const puppeteer = require('puppeteer');

(async () => {
  try {
    console.log('Launching browser...');
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });
    console.log('Browser launched successfully!');
    const page = await browser.newPage();
    await page.setContent('<h1>Hello World</h1>');
    const pdf = await page.pdf({ format: 'A4' });
    console.log(`PDF generated successfully, bytes: ${pdf.length}`);
    await browser.close();
  } catch (err) {
    console.error('Error launching/running Puppeteer:', err);
  }
})();
