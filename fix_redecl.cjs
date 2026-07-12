const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

code = code.replace(/const phoneNumberId = process\.env\.META_PHONE_NUMBER_ID \|\| creds\[0\]\?\.phoneNumberId \|\| creds\[0\]\?\.wabaId;\s+const wabaId = process\.env\.META_WABA_ID \|\| creds\[0\]\?\.wabaId;\s+const systemUserToken = process\.env\.META_SYSTEM_USER_TOKEN \|\| \(creds\[0\]\?\.systemUserToken \? decryptToken\(creds\[0\]\.systemUserToken\) : null\);/g, 
  (match, offset, string) => {
      // we only want to remove it if it's the 2nd or 3rd occurrence in the file or if it's after another declaration
      // Actually we can just do a regex replace to remove it from inside the templates routes
      return "";
});

fs.writeFileSync('server.ts', code);
