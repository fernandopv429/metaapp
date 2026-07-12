const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

code = code.replace(/let targetId: string \| null = null;/, `let targetId: string | null = null;
    let phoneNumberId: string | null = null;`);

code = code.replace(/targetId = entry\?\.id;/g, `targetId = entry?.id;
      phoneNumberId = entry?.changes?.[0]?.value?.metadata?.phone_number_id || null;`);

code = code.replace(/if \(targetId\) \{[\s\S]*?\.limit\(1\);/, `if (targetId) {
      const credentials = await db.select().from(metaCredentials)
        .where(
          sourceType === 'whatsapp' 
            ? eq(metaCredentials.phoneNumberId, phoneNumberId || targetId)
            : eq(metaCredentials.pageId, targetId)
        ).limit(1);`);

fs.writeFileSync('server.ts', code);
