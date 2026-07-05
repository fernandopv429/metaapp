import { z } from 'zod';

export const MetaCredentialSchema = z.object({
  companyId: z.string().min(1),
  appId: z.string().min(1),
  systemUserToken: z.string().min(1),
  wabaId: z.string().optional(),
  pageId: z.string().optional(),
  destinationWebhookUrl: z.string().url(),
});

export const WhatsappTemplateSchema = z.object({
  companyId: z.string().min(1),
  templateName: z.string().min(1),
  language: z.string().min(1),
  category: z.string().min(1),
  status: z.string().min(1),
  componentsJson: z.any(),
});
