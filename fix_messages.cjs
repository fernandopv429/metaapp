const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

code = code.replace(/if \(!wabaId \|\| \!systemUserToken\) \{\s*res\.status\(400\)\.json\(\{ error: 'Missing WABA ID or Token for this company' \}\);\s*return;\s*\}/, `
    const phoneNumberId = process.env.META_PHONE_NUMBER_ID || creds[0]?.phoneNumberId || creds[0]?.wabaId;
    const wabaId = process.env.META_WABA_ID || creds[0]?.wabaId;
    const systemUserToken = process.env.META_SYSTEM_USER_TOKEN || (creds[0]?.systemUserToken ? decryptToken(creds[0].systemUserToken) : null);
    
    if (!wabaId || !systemUserToken) {
      res.status(400).json({ error: 'Missing WABA ID or Token for this company' });
      return;
    }
`);

fs.writeFileSync('server.ts', code);
