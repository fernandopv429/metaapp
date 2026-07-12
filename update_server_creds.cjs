const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

// For /templates POST
code = code.replace(/if \(!creds\.length \|\| !creds\[0\]\.wabaId \|\| !creds\[0\]\.systemUserToken\) \{\s*return res\.status\(400\)\.json\(\{ error: 'Missing Meta credentials \(WABA ID or Token\)' \}\);\s*\}/, `
    const wabaId = process.env.META_WABA_ID || creds[0]?.wabaId;
    const systemUserToken = process.env.META_SYSTEM_USER_TOKEN || (creds[0]?.systemUserToken ? decryptToken(creds[0].systemUserToken) : null);
    if (!wabaId || !systemUserToken) {
       return res.status(400).json({ error: 'Missing Meta credentials (WABA ID or Token)' });
    }`);
code = code.replace(/const \{ wabaId \} = creds\[0\]; const systemUserToken = decryptToken\(creds\[0\]\.systemUserToken\);/, `// extracted above`);

// For /templates/sync POST
code = code.replace(/if \(!creds\.length \|\| !creds\[0\]\.wabaId \|\| !creds\[0\]\.systemUserToken\) \{\s*return res\.status\(400\)\.json\(\{ error: 'Missing Meta credentials \(WABA ID or Token\)' \}\);\s*\}/, `
    const wabaId = process.env.META_WABA_ID || creds[0]?.wabaId;
    const systemUserToken = process.env.META_SYSTEM_USER_TOKEN || (creds[0]?.systemUserToken ? decryptToken(creds[0].systemUserToken) : null);
    if (!wabaId || !systemUserToken) {
       return res.status(400).json({ error: 'Missing Meta credentials (WABA ID or Token)' });
    }`);
// We have two of those "const { wabaId } = creds[0];" statements, one for create and one for sync. 
// I'll replace all matching occurrences globally.

fs.writeFileSync('server.ts', code);
