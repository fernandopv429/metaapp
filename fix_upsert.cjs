const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

code = code.replace(/const result = await db\.insert\(metaCredentials\)\.values\(payloadToInsert\)\.returning\(\);/, `
    let result;
    const existing = await db.select().from(metaCredentials).where(eq(metaCredentials.companyId, parsed.companyId));
    if (existing.length > 0) {
      result = await db.update(metaCredentials).set(payloadToInsert).where(eq(metaCredentials.companyId, parsed.companyId)).returning();
    } else {
      result = await db.insert(metaCredentials).values(payloadToInsert).returning();
    }
`);

fs.writeFileSync('server.ts', code);
