import http from 'http';

const req = http.request('http://localhost:3000/api/admin/reset-database', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log(data));
});

req.write(JSON.stringify({ confirm: "RESET_ALL_DATA" }));
req.end();
