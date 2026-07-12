const fs = require('fs');
let code = fs.readFileSync('server_backup.ts', 'utf-8');

// First, fix the broken '// extracted above' lines by replacing them with the proper fetch logic.
code = code.replace(/\/\/ extracted above/g, `
    const phoneNumberId = process.env.META_PHONE_NUMBER_ID || creds[0]?.phoneNumberId || creds[0]?.wabaId;
    const wabaId = process.env.META_WABA_ID || creds[0]?.wabaId;
    const systemUserToken = process.env.META_SYSTEM_USER_TOKEN || (creds[0]?.systemUserToken ? decryptToken(creds[0].systemUserToken) : null);
`);

code = code.replace(/const \{ wabaId \} = creds\[0\]; const systemUserToken = decryptToken\(creds\[0\]\.systemUserToken\);/g, `
    const phoneNumberId = process.env.META_PHONE_NUMBER_ID || creds[0]?.phoneNumberId || creds[0]?.wabaId;
    const wabaId = process.env.META_WABA_ID || creds[0]?.wabaId;
    const systemUserToken = process.env.META_SYSTEM_USER_TOKEN || (creds[0]?.systemUserToken ? decryptToken(creds[0].systemUserToken) : null);
`);

// Now replace URL endpoints to use phoneNumberId where appropriate (messages API uses phone_number_id, message_templates uses waba_id)
// /wabaId/messages should be /phoneNumberId/messages
code = code.replace(/\/\$\{wabaId\}\/messages/g, '/${phoneNumberId}/messages');

fs.writeFileSync('server.ts', code);
