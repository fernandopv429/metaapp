import { pgTable, serial, varchar, text, json } from 'drizzle-orm/pg-core';

export const metaApps = pgTable('meta_apps', {
  id: serial('id').primaryKey(),
  appId: varchar('app_id', { length: 255 }).notNull().unique(),
  appName: varchar('app_name', { length: 255 }).notNull(),
  appSecret: varchar('app_secret', { length: 255 }).notNull(),
  verifyToken: varchar('verify_token', { length: 255 }).notNull(),
});

export const metaCredentials = pgTable('meta_credentials', {
  id: serial('id').primaryKey(),
  companyId: varchar('company_id', { length: 255 }).notNull().unique(),
  appId: varchar('app_id', { length: 255 }).notNull().references(() => metaApps.appId),
  systemUserToken: varchar('system_user_token', { length: 1024 }).notNull(),
  wabaId: varchar('waba_id', { length: 255 }).unique(),
  pageId: varchar('page_id', { length: 255 }).unique(),
  destinationWebhookUrl: varchar('destination_webhook_url', { length: 1024 }).notNull(),
});

export const whatsappTemplates = pgTable('whatsapp_templates', {
  id: serial('id').primaryKey(),
  companyId: varchar('company_id', { length: 255 }).notNull(),
  templateName: varchar('template_name', { length: 255 }).notNull(),
  language: varchar('language', { length: 10 }).notNull(),
  category: varchar('category', { length: 255 }).notNull(),
  status: varchar('status', { length: 50 }).notNull(),
  componentsJson: json('components_json'),
});
