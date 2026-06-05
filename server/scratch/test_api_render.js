(async () => {
  const url = 'http://localhost:3001/api/v1/exports/pdf/render';
  console.log('Sending request to', url);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-id': 'innovait-systems',
      },
      body: JSON.stringify({
        html: '<h1>Test PDF</h1>',
        filename: 'test.pdf',
      }),
    });
    console.log('Status:', response.status);
    const text = await response.text();
    console.log('Response:', text);
  } catch (err) {
    console.error('Request failed:', err);
  }
})();
