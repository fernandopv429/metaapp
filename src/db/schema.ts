import { pgTable, serial, varchar, text, json } from 'drizzle-orm/pg-core';

export const clients = pgTable('clients', {
  id: varchar('id', { length: 255 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
});

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).notNull().default('client'), // 'admin' or 'client'
  companyId: varchar('company_id', { length: 255 }), // if role is client, this is their company ID
});


export const metaCredentials = pgTable('meta_credentials', {
  id: serial('id').primaryKey(),
  companyId: varchar('company_id', { length: 255 }).notNull().unique(),
  appId: varchar('app_id', { length: 255 }).notNull(),
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
