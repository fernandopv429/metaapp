const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

code = code.replace(/const creds = await db\.select\(\)\.from\(metaCredentials\)\.where\(eq\(metaCredentials\.companyId, company_id\)\);\s*if \(\!creds\.length\) \{\s*res\.status\(404\)\.json\(\{ error: 'Company not found or credentials missing' \}\);\s*return;\s*\}/, `
    const creds = await db.select().from(metaCredentials).where(eq(metaCredentials.companyId, company_id));
`);

fs.writeFileSync('server.ts', code);
