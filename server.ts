import crypto from 'crypto';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { db } from './src/db/database';
import { metaCredentials, whatsappTemplates, clients, users } from './src/db/schema';
import { logsManager } from './src/lib/logs_manager';
import { decodeSignedRequest, verifySignature } from './src/lib/compliance_crypto';
import { MetaCredentialSchema, WhatsappTemplateSchema } from './src/lib/validators';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

async function fetchWithMetaBackoff(url: string, options: any, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const delay = retryAfter ? parseInt(retryAfter) * 1000 : 2000 * Math.pow(2, i);
        await new Promise(res => setTimeout(res, delay));
        continue;
      }
      return response;
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(res => setTimeout(res, 2000 * Math.pow(2, i)));
    }
  }
  throw new Error('Max retries reached');
}

const JWT_SECRET = process.env.JWT_SECRET as string;
if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
  console.error("CRITICAL: JWT_SECRET environment variable is missing.");
  process.exit(1);
}
// Fallback for development only if not set, to avoid crashing immediately, but warn loudly.
const effectiveJwtSecret = process.env.JWT_SECRET || 'dev_fallback_secret_only_do_not_use_in_prod';

// Define ENCRYPTION_KEY (32 bytes hex)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY ? Buffer.from(process.env.ENCRYPTION_KEY, 'hex') : crypto.randomBytes(32);

function encryptToken(text: string): string {
  if (!process.env.ENCRYPTION_KEY && process.env.NODE_ENV === 'production') {
    throw new Error('ENCRYPTION_KEY is required in production');
  }
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${encrypted}:${authTag}`;
}

function decryptToken(text: string): string {
  if (!text || !text.includes(':')) return text; // fallback for unencrypted existing tokens
  const parts = text.split(':');
  if (parts.length !== 3) return text;
  const iv = Buffer.from(parts[0], 'hex');
  const encryptedText = Buffer.from(parts[1], 'hex');
  const authTag = Buffer.from(parts[2], 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encryptedText, undefined, 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// Middleware to protect routes
const requireAuth = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }
  const token = authHeader.split('Bearer ')[1];
  try {
    const decoded: any = jwt.verify(token, effectiveJwtSecret);
    if (!decoded.companyId) decoded.companyId = decoded.id.toString();
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

const app = express();

const allowedOrigins = process.env.APP_URL ? [process.env.APP_URL] : [];
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
}));
app.use(helmet({ contentSecurityPolicy: false }));

// We need raw body to verify signature accurately, but also parsed JSON
app.use(express.json({
  verify: (req: any, res, buf) => {
    req.rawBody = buf;
  }
}));

// We also need urlencoded for signed_request (form submissions)
app.use(express.urlencoded({ extended: true }));

const apiRouter = express.Router();

/**
 * 1. Webhooks Multi-App e Multicanal
 */

// GET /v1/webhooks/meta (Handshake de Verificação)
apiRouter.get('/webhooks/meta', async (req, res) => {
  const mode = req.query['hub.mode'] as string;
  const token = req.query['hub.verify_token'] as string;
  const challenge = req.query['hub.challenge'] as string;

  if (mode === 'subscribe' && token) {
    try {
      const expectedToken = process.env.META_VERIFY_TOKEN;
      console.log('Received token:', token, 'Expected:', expectedToken);
      if (expectedToken && expectedToken === token) {
        console.log(`[Handshake] Validated webhook`);
        // Return challenge as plaintext
        res.status(200).send(challenge);
        return;
      } else {
        res.status(403).send('Verification token mismatch');
        return;
      }
    } catch (e) {
      console.error(e);
      res.status(500).send('Internal Server Error');
      return;
    }
  }
  res.status(400).send('Bad Request');
});

// Cache for deduplication (in-memory)
const deduplicationCache = new Map<string, number>();
const DEDUPLICATION_WINDOW_MS = 10000; // 10 seconds

function isDuplicateEvent(messageId: string): boolean {
  if (!messageId) return false;
  const now = Date.now();
  const cachedTime = deduplicationCache.get(messageId);
  if (cachedTime && now - cachedTime < DEDUPLICATION_WINDOW_MS) {
    return true; // It's a duplicate
  }
  
  deduplicationCache.set(messageId, now);
  // Cleanup old entries randomly or periodically (simple implementation for now)
  if (deduplicationCache.size > 1000) {
    const keys = Array.from(deduplicationCache.keys());
    for (let i = 0; i < 500; i++) deduplicationCache.delete(keys[i]);
  }
  return false;
}

// POST /v1/webhooks/meta (Roteador Multicanal)
apiRouter.post('/webhooks/meta', async (req: any, res) => {
  const signature = req.headers['x-hub-signature-256'] as string;
  const payload = req.body;
  const rawBody = req.rawBody;

  try {
    const appSecret = process.env.META_APP_SECRET;
    
    if (!appSecret) {
      res.status(500).send('App secret not configured');
      return;
    }

    // 1. Validação de Assinatura Digital
    if (!verifySignature(rawBody, signature, appSecret)) {
      res.status(401).send('Invalid signature');
      return;
    }

    // 2. Analisar estrutura do JSON recebido de forma flexível (Payload Schema Fallback)
    let targetId: string | null = null;
    let sourceType: 'whatsapp' | 'instagram_messenger' | null = null;
    let messageId: string | null = null;

    if (payload?.object === 'whatsapp_business_account') {
      const entry = payload.entry?.[0];
      targetId = entry?.id;
      sourceType = 'whatsapp';
      payload.nexus_source = 'whatsapp';
      
      const change = entry?.changes?.[0]?.value;
      if (change?.messages?.[0]?.id) {
        messageId = change.messages[0].id;
      } else if (change?.statuses?.[0]?.id) {
        messageId = change.statuses[0].id;
      }
    } else if (payload?.object === 'page' || payload?.object === 'instagram') {
      const entry = payload.entry?.[0];
      targetId = entry?.id;
      sourceType = 'instagram_messenger';
      payload.nexus_source = 'instagram_messenger';
      
      const messaging = entry?.messaging?.[0];
      if (messaging?.message?.mid) {
        messageId = messaging.message.mid;
      }
    }

    // Retornar 200 OK imediatamente para a Meta (Resiliência Anti-Bloqueio)
    res.status(200).send('OK');
    
    if (messageId && isDuplicateEvent(messageId)) {
      console.log(`[Deduplication] Ignored duplicate event: ${messageId}`);
      return; // Stop processing, already replied 200 OK
    }

    logsManager.append({
      timestamp: new Date().toISOString(),
      event_type: 'WEBHOOK_RECEIVE',
      status_detail: `Received verified webhook payload for ${sourceType || 'unknown'}`,
    });

    if (targetId) {
      const credentials = await db.select().from(metaCredentials)
        .where(
          sourceType === 'whatsapp' 
            ? eq(metaCredentials.wabaId, targetId)
            : eq(metaCredentials.pageId, targetId)
        ).limit(1);

      if (credentials.length > 0) {
        const destUrl = credentials[0].destinationWebhookUrl;
        
        // 3. Disparo assíncrono para o destino final
        // Protect logs, hide sensitive tokens in real system
        fetch(destUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        .then(response => {
          if (!response.ok) throw new Error(`HTTP error ${response.status}`);
          logsManager.append({
            timestamp: new Date().toISOString(),
            company_id: credentials[0].companyId,
            event_type: 'ROUTING_SUCCESS',
            status_detail: `Routed to ${destUrl}`,
          });
        })
        .catch(err => {
          logsManager.append({
            timestamp: new Date().toISOString(),
            company_id: credentials[0].companyId,
            event_type: 'ROUTING_FAILED',
            status_detail: `Failed to route to ${destUrl}: ${err.message}`,
          });
        });
      } else {
        logsManager.append({
          timestamp: new Date().toISOString(),
          event_type: 'ROUTING_FAILED',
          status_detail: `No credentials found for target ID ${targetId}`,
        });
      }
    }

  } catch (err: any) {
    console.error(err);
    if (!res.headersSent) {
       res.status(200).send('OK'); // Always 200 to prevent Meta webhook disable
    }
  }
});


/**
 * 2. Endpoints Obrigatórios de Compliance Jurídico (LGPD/GDPR da Meta)
 */

const deletionStatusMap = new Map<string, any>();

// GET /v1/compliance/status
apiRouter.get('/compliance/status', (req, res) => {
  const id = req.query.id as string;
  if (!id || !deletionStatusMap.has(id)) {
    res.status(404).send('Status not found');
    return;
  }
  res.json(deletionStatusMap.get(id));
});

// POST /v1/compliance/data-deletion
apiRouter.post('/compliance/data-deletion', async (req, res) => {
  const signedRequest = req.body.signed_request;

  if (!signedRequest) {
    res.status(400).send('Missing signed_request');
    return;
  }

  try {
    const appSecret = process.env.META_APP_SECRET;

    if (!appSecret) {
      res.status(500).send('App secret not configured');
      return;
    }

    const data = decodeSignedRequest(signedRequest, appSecret);
    if (!data) {
      res.status(401).send('Invalid signed_request');
      return;
    }

    const userId = data.user_id;
    
    // Delete meta credentials associated with the user
    await db.delete(metaCredentials).where(eq(metaCredentials.companyId, userId.toString()));

    const confirmationCode = `DEL-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    deletionStatusMap.set(confirmationCode, {
      status: 'completed',
      id: confirmationCode,
      message: `Data deleted successfully for user ${userId}`
    });

    logsManager.append({
      timestamp: new Date().toISOString(),
      event_type: 'DATA_DELETION_REQUEST',
      status_detail: `Processed data deletion request for user ${userId}`,
    });

    const baseUrl = process.env.APP_URL || 'https://api.nexusdevhub.com';

    res.json({
      url: `${baseUrl}/v1/compliance/status?id=${confirmationCode}`,
      confirmation_code: confirmationCode
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});

// POST /v1/compliance/deauthorize
apiRouter.post('/compliance/deauthorize', async (req, res) => {
  const signedRequest = req.body.signed_request;

  if (!signedRequest) {
    res.status(400).send('Missing signed_request');
    return;
  }

  try {
    const appSecret = process.env.META_APP_SECRET;

    if (!appSecret) {
      res.status(500).send('App secret not configured');
      return;
    }

    const data = decodeSignedRequest(signedRequest, appSecret);
    if (!data) {
      res.status(401).send('Invalid signed_request');
      return;
    }

    const userId = data.user_id;

    // Delete credentials
    await db.delete(metaCredentials).where(eq(metaCredentials.companyId, userId.toString()));

    logsManager.append({
      timestamp: new Date().toISOString(),
      event_type: 'DEAUTHORIZE_EVENT',
      status_detail: `App deauthorized by user ${userId}. Credentials cleared.`,
    });

    res.status(200).send('OK');
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});


// Test Endpoints for App Review
apiRouter.post('/test/whatsapp/send', requireAuth, async (req: any, res: any) => {
  try {
    const { company_id, to, template_name } = req.body;
    
    // Admin check or same company check
    if (req.user.role !== 'admin' && req.user.companyId !== company_id) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    // Fetch credentials
    const creds = await db.select().from(metaCredentials).where(eq(metaCredentials.companyId, company_id));
    if (!creds.length) {
      res.status(404).json({ error: 'Company not found or credentials missing' });
      return;
    }
    
    const { wabaId } = creds[0]; const systemUserToken = decryptToken(creds[0].systemUserToken);
    
    if (!wabaId || !systemUserToken) {
      res.status(400).json({ error: 'Missing WABA ID or Token for this company' });
      return;
    }

    const payload = {
      messaging_product: 'whatsapp',
      to: to || '5511999999999',
      type: 'template',
      template: {
        name: template_name || 'hello_world',
        language: { code: 'en_US' }
      }
    };
    
    const response = await fetchWithMetaBackoff(`https://graph.facebook.com/v20.0/${wabaId}/messages`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${systemUserToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    const data = await response.json();
    if (!response.ok) {
       throw new Error(data.error?.message || 'Error sending WhatsApp message');
    }
    
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/test/messenger/send', requireAuth, async (req: any, res: any) => {
  try {
    const { company_id, to, text } = req.body;
    
    if (req.user.role !== 'admin' && req.user.companyId !== company_id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const creds = await db.select().from(metaCredentials).where(eq(metaCredentials.companyId, company_id));
    if (!creds.length) {
      res.status(404).json({ error: 'Company not found or credentials missing' });
      return;
    }
    
    const { pageId } = creds[0]; const systemUserToken = decryptToken(creds[0].systemUserToken);
    
    if (!pageId || !systemUserToken) {
      res.status(400).json({ error: 'Missing Page ID or Token for this company' });
      return;
    }

    const payload = {
      recipient: { id: to },
      message: { text: text || 'Hello from Messenger!' }
    };

    const response = await fetchWithMetaBackoff(`https://graph.facebook.com/v20.0/${pageId}/messages`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${systemUserToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    const data = await response.json();
    if (!response.ok) {
       throw new Error(data.error?.message || 'Error sending Messenger message');
    }

    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/test/instagram/send', requireAuth, async (req: any, res: any) => {
  try {
    const { company_id, to, text } = req.body;
    
    if (req.user.role !== 'admin' && req.user.companyId !== company_id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const creds = await db.select().from(metaCredentials).where(eq(metaCredentials.companyId, company_id));
    if (!creds.length) {
      res.status(404).json({ error: 'Company not found or credentials missing' });
      return;
    }
    
    const { pageId } = creds[0]; const systemUserToken = decryptToken(creds[0].systemUserToken);
    
    if (!pageId || !systemUserToken) {
      res.status(400).json({ error: 'Missing Page ID or Token for this company' });
      return;
    }

    const payload = {
      recipient: { id: to },
      message: { text: text || 'Hello from Instagram!' }
    };

    const response = await fetchWithMetaBackoff(`https://graph.facebook.com/v20.0/${pageId}/messages`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${systemUserToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    const data = await response.json();
    if (!response.ok) {
       throw new Error(data.error?.message || 'Error sending Instagram message');
    }

    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


apiRouter.get('/logs', requireAuth, (req: any, res: any) => {
  if (req.user.role === 'admin') {
    res.json(logsManager.getLogs());
  } else {
    // Filter logs for the specific client
    const allLogs = logsManager.getLogs();
    const clientLogs = allLogs.filter(log => log.company_id === req.user.companyId);
    res.json(clientLogs);
  }
});

apiRouter.post('/users', requireAuth, async (req: any, res: any) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin only' });
    }
    const { email, password, companyId, role } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const existing = await db.select().from(users).where(eq(users.email, email));
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Email already exists' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const result = await db.insert(users).values({
      email,
      passwordHash,
      companyId: companyId || null,
      role: role || 'client'
    }).returning();
    
    const user = result[0];
    res.json({ id: user.id, email: user.email, role: user.role, companyId: user.companyId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/users', requireAuth, async (req: any, res: any) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin only' });
    }
    const allUsers = await db.select({
      id: users.id,
      email: users.email,
      role: users.role,
      companyId: users.companyId
    }).from(users);
    res.json(allUsers);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.delete('/users/:id', requireAuth, async (req: any, res: any) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin only' });
    }
    await db.delete(users).where(eq(users.id, parseInt(req.params.id)));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await db.select().from(users).where(eq(users.email, email));
    if (result.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const user = result[0];
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const companyId = user.companyId || user.id.toString();
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, companyId }, effectiveJwtSecret, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, email: user.email, role: user.role, companyId } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// clients
apiRouter.get('/clients', requireAuth, async (req: any, res: any) => {
  try {
    if (req.user.role === 'admin') {
      const allClients = await db.select().from(clients);
      return res.json(allClients);
    } else {
      if (!req.user.companyId) {
        return res.json([]);
      }
      const myClients = await db.select().from(clients).where(eq(clients.id, req.user.companyId));
      return res.json(myClients);
    }
  } catch(e) { res.status(500).send(String(e)); }
});

apiRouter.post('/clients', requireAuth, async (req: any, res: any) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin only' });
    }
    if (!req.body.id || !req.body.name) return res.status(400).send("id and name required");
    const result = await db.insert(clients).values({ id: req.body.id, name: req.body.name }).returning();
    res.json(result[0]);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// Meta config
apiRouter.get('/meta-config', (req, res) => {
  res.json({
    metaAppId: process.env.META_APP_ID || ''
  });
});

// meta_credentials
apiRouter.get('/meta-credentials', requireAuth, async (req: any, res: any) => {
  try {
    let creds;
    if (req.user.role === 'admin') {
      creds = await db.select().from(metaCredentials);
    } else {
      if (!req.user.companyId) return res.json([]);
      creds = await db.select().from(metaCredentials).where(eq(metaCredentials.companyId, req.user.companyId));
    }
    // Decrypt tokens before sending to client
    const decryptedCreds = creds.map(c => ({
      ...c,
      systemUserToken: c.systemUserToken ? decryptToken(c.systemUserToken) : c.systemUserToken
    }));
    return res.json(decryptedCreds);
  } catch(e) { res.status(500).send(String(e)); }
});

apiRouter.post('/meta-credentials', requireAuth, async (req: any, res: any) => {
  try {
    const parsed = MetaCredentialSchema.parse(req.body);
    if (req.user.role !== 'admin' && req.user.companyId !== parsed.companyId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const payloadToInsert = { ...parsed };
    if (payloadToInsert.systemUserToken) {
       payloadToInsert.systemUserToken = encryptToken(payloadToInsert.systemUserToken);
    }
    const result = await db.insert(metaCredentials).values(payloadToInsert).returning();
    if (result[0] && result[0].systemUserToken) {
       result[0].systemUserToken = decryptToken(result[0].systemUserToken);
    }
    res.json(result[0]);
  } catch (e: any) {
    res.status(400).json({ error: e.errors || e.message });
  }
});

// templates
apiRouter.get('/templates', requireAuth, async (req: any, res: any) => {
  try {
    const companyId = req.query.company_id;
    if (!companyId || typeof companyId !== 'string') {
      res.status(400).send('company_id parameter is required');
      return;
    }
    
    if (req.user.role !== 'admin' && req.user.companyId !== companyId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const temps = await db.select().from(whatsappTemplates).where(eq(whatsappTemplates.companyId, companyId));
    res.json(temps);
  } catch(e) { res.status(500).send(String(e)); }
});

apiRouter.post('/templates', requireAuth, async (req: any, res: any) => {
  try {
    const parsed = WhatsappTemplateSchema.parse(req.body);
    
    if (req.user.role !== 'admin' && req.user.companyId !== parsed.companyId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Fetch WABA credentials
    const creds = await db.select().from(metaCredentials).where(eq(metaCredentials.companyId, parsed.companyId));
    if (!creds.length || !creds[0].wabaId || !creds[0].systemUserToken) {
       return res.status(400).json({ error: 'Missing Meta credentials (WABA ID or Token)' });
    }

    const { wabaId } = creds[0]; const systemUserToken = decryptToken(creds[0].systemUserToken);
    
    // Create template via Meta Graph API
    const metaPayload = {
      name: parsed.templateName,
      language: parsed.language,
      category: parsed.category,
      components: typeof parsed.componentsJson === 'string' ? JSON.parse(parsed.componentsJson) : parsed.componentsJson
    };

    const response = await fetchWithMetaBackoff(`https://graph.facebook.com/v20.0/${wabaId}/message_templates`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${systemUserToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(metaPayload)
    });

    const data = await response.json();
    if (!response.ok) {
       throw new Error(data.error?.message || 'Error creating template in Meta API');
    }

    // Insert into local DB only if successful
    parsed.status = 'PENDING'; // Usually pending approval initially
    const result = await db.insert(whatsappTemplates).values(parsed).returning();
    res.json(result[0]);
  } catch (e: any) {
    res.status(400).json({ error: e.errors || e.message });
  }
});

apiRouter.post('/templates/sync', requireAuth, async (req: any, res: any) => {
  // Sincronização em Lote (POST /v1/templates/sync)
  // Queries Meta for all templates and updates the local DB
  try {
    const { companyId } = req.body;
    
    if (req.user.role !== 'admin' && req.user.companyId !== companyId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const creds = await db.select().from(metaCredentials).where(eq(metaCredentials.companyId, companyId));
    if (!creds.length || !creds[0].wabaId || !creds[0].systemUserToken) {
       return res.status(400).json({ error: 'Missing Meta credentials (WABA ID or Token)' });
    }
    
    const { wabaId } = creds[0]; const systemUserToken = decryptToken(creds[0].systemUserToken);

    const response = await fetchWithMetaBackoff(`https://graph.facebook.com/v20.0/${wabaId}/message_templates`, {
      headers: { 'Authorization': `Bearer ${systemUserToken}` }
    });

    const data = await response.json();
    if (!response.ok) {
       throw new Error(data.error?.message || 'Error fetching templates from Meta API');
    }

    if (data.data && Array.isArray(data.data)) {
       // A real implementation would upsert each template to update status
       for (const tpl of data.data) {
          // Simplistic matching by name and language to update status
          // In production you would match by metaTemplateId if saved
          /* await db.update(whatsappTemplates)
                 .set({ status: tpl.status, metaTemplateId: tpl.id })
                 .where(and(eq(whatsappTemplates.companyId, company_id), eq(whatsappTemplates.name, tpl.name))); */
       }
    }

    res.status(200).json({ status: 'ok', message: 'Sync complete', count: data.data?.length || 0 });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});


app.use('/v1', apiRouter);

// Vite middleware for development (React Frontend Admin Dashboard)
import { createServer as createViteServer } from 'vite';

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
