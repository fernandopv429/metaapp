const fs = require('fs');
let code = fs.readFileSync('src/lib/validators.ts', 'utf-8');
code = code.replace(/export const MetaCredentialSchema = z\.object\(\{[\s\S]*?\}\);/, `export const MetaCredentialSchema = z.object({
  companyId: z.string().min(1),
  appId: z.string().optional(),
  systemUserToken: z.string().optional(),
  wabaId: z.string().optional(),
  pageId: z.string().optional(),
  phoneNumberId: z.string().optional(),
  destinationWebhookUrl: z.string().url(),
});`);
fs.writeFileSync('src/lib/validators.ts', code);
