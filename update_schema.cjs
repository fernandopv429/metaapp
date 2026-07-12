const fs = require('fs');
let code = fs.readFileSync('src/db/schema.ts', 'utf-8');
code = code.replace(/export const metaCredentials[\s\S]*?\}\);/m, `export const metaCredentials = pgTable('meta_credentials', {
  id: serial('id').primaryKey(),
  companyId: varchar('company_id', { length: 255 }).notNull().unique(),
  appId: varchar('app_id', { length: 255 }),
  systemUserToken: varchar('system_user_token', { length: 1024 }),
  wabaId: varchar('waba_id', { length: 255 }),
  pageId: varchar('page_id', { length: 255 }),
  phoneNumberId: varchar('phone_number_id', { length: 255 }),
  destinationWebhookUrl: varchar('destination_webhook_url', { length: 1024 }).notNull(),
});`);
fs.writeFileSync('src/db/schema.ts', code);
