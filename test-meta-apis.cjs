const https = require('https');
const ACCESS_TOKEN = 'EAAYW36YM1r4BR3us3XU8VPbO8cJyZA6pKuDGZAz0zPjtTdn8oJmbvG8958lF4alABsXyN2uzze9yIXZCoZCOUdtgNhPL7rMv87ZBi91ZAeK3nHZAy75Cd9SuFiC8d18oagnjsc84hZBR7LEkKehj9jbIZAJsFh9bpNvnX3lo1kKUon8XhhxZCfkTO13kKOqCsZBZAj1qcr5XcJCLQdZA9Ni8JgZActYqKkfVTBgDZAIZCYZBa4QZB3Jup9LgU4KYTUboa5WmrCebxZAl2kcbqqQbEeJUIlz96c9ZC0ZAtjZC7BFQCB5zJwvQZDZD';
const PHONE_NUMBER_ID = '958627180675778';
const WABA_ID = '1786068799016532';
const BUSINESS_ID = '952739797923172';
const TEST_PHONE_NUMBER = '5511942029143';
const VERSION = 'v20.0';

function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'graph.facebook.com',
      path: `/${VERSION}${path}`,
      method: method,
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(json);
          } else {
            reject({ status: res.statusCode, error: json.error });
          }
        } catch (e) {
          reject({ status: res.statusCode, raw: body });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  console.log('Iniciando testes da Graph API para App Review...\n');

  // 1. public_profile
  try {
    console.log('1. Testando [public_profile]...');
    const res = await makeRequest('GET', '/me?fields=id,name');
    console.log('✅ Sucesso (public_profile):', res.id, '\n');
  } catch (e) {
    console.log('❌ Falha (public_profile):', JSON.stringify(e, null, 2), '\n');
  }

  // 2. business_management
  try {
    console.log('2. Testando [business_management]...');
    const res = await makeRequest('GET', `/${BUSINESS_ID}?fields=id,name`);
    console.log('✅ Sucesso (business_management):', res.id, '\n');
  } catch (e) {
    console.log('❌ Falha (business_management):', JSON.stringify(e, null, 2), '\n');
  }

  // 3. whatsapp_business_management e manage_app_solution
  try {
    console.log('3. Testando [whatsapp_business_management] e [manage_app_solution]...');
    const res = await makeRequest('GET', `/${WABA_ID}/phone_numbers`);
    console.log('✅ Sucesso (whatsapp_business_management): Encontrou', res.data?.length, 'número(s)\n');
  } catch (e) {
    console.log('❌ Falha (whatsapp_business_management):', JSON.stringify(e, null, 2), '\n');
  }

  // 4. whatsapp_business_messaging
  try {
    console.log('4. Testando [whatsapp_business_messaging]...');
    const data = {
      messaging_product: "whatsapp",
      to: TEST_PHONE_NUMBER,
      type: "text",
      text: {
        body: "Olá! Esta é uma mensagem de teste da API."
      }
    };
    const res = await makeRequest('POST', `/${PHONE_NUMBER_ID}/messages`, data);
    console.log('✅ Sucesso (whatsapp_business_messaging): Mensagem enviada! ID:', res.messages?.[0]?.id, '\n');
  } catch (e) {
    console.log('❌ Falha (whatsapp_business_messaging):', JSON.stringify(e, null, 2), '\n');
  }

  console.log('Testes finalizados! Verifique o painel do App Review do Facebook para ver se as chamadas foram registradas.');
}

runTests();
