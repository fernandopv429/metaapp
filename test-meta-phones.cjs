const https = require('https');
const ACCESS_TOKEN = 'EAAYW36YM1r4BR3us3XU8VPbO8cJyZA6pKuDGZAz0zPjtTdn8oJmbvG8958lF4alABsXyN2uzze9yIXZCoZCOUdtgNhPL7rMv87ZBi91ZAeK3nHZAy75Cd9SuFiC8d18oagnjsc84hZBR7LEkKehj9jbIZAJsFh9bpNvnX3lo1kKUon8XhhxZCfkTO13kKOqCsZBZAj1qcr5XcJCLQdZA9Ni8JgZActYqKkfVTBgDZAIZCYZBa4QZB3Jup9LgU4KYTUboa5WmrCebxZAl2kcbqqQbEeJUIlz96c9ZC0ZAtjZC7BFQCB5zJwvQZDZD';
const WABA_ID = '1786068799016532';
const VERSION = 'v20.0';

https.get(`https://graph.facebook.com/${VERSION}/${WABA_ID}/phone_numbers?access_token=${ACCESS_TOKEN}`, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => console.log(body));
});
