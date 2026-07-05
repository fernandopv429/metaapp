import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { db } from './src/db/database';
import { metaApps, metaCredentials, whatsappTemplates } from './src/db/schema';
import { logsManager } from './src/lib/logs_manager';
import { decodeSignedRequest, verifySignature } from './src/lib/compliance_crypto';
import { MetaAppSchema, MetaCredentialSchema, WhatsappTemplateSchema } from './src/lib/validators';
import { eq } from 'drizzle-orm';

const app = express();
const PORT = 3000;

app.use(cors());
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

// GET /v1/webhooks/meta/:app_id (Handshake de Verificação)
apiRouter.get('/webhooks/meta/:app_id', async (req, res) => {
  const appId = req.params.app_id;
  const mode = req.query['hub.mode'] as string;
  const token = req.query['hub.verify_token'] as string;
  const challenge = req.query['hub.challenge'] as string;

  if (mode === 'subscribe' && token) {
    try {
      const appRecord = await db.select().from(metaApps).where(eq(metaApps.appId, appId)).limit(1);
      if (appRecord.length > 0 && appRecord[0].verifyToken === token) {
        console.log(`[Handshake] Validated webhook for app ${appId}`);
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

// POST /v1/webhooks/meta/:app_id (Roteador Multicanal)
apiRouter.post('/webhooks/meta/:app_id', async (req: any, res) => {
  const appId = req.params.app_id;
  const signature = req.headers['x-hub-signature-256'] as string;
  const payload = req.body;
  const rawBody = req.rawBody;

  try {
    const appRecord = await db.select().from(metaApps).where(eq(metaApps.appId, appId)).limit(1);
    if (appRecord.length === 0) {
      res.status(401).send('App not found');
      return;
    }

    const appSecret = appRecord[0].appSecret;

    // 1. Validação de Assinatura Digital
    if (!verifySignature(rawBody, signature, appSecret)) {
      res.status(401).send('Invalid signature');
      return;
    }

    logsManager.append({
      timestamp: new Date().toISOString(),
      app_id: appId,
      event_type: 'WEBHOOK_RECEIVE',
      status_detail: 'Received verified webhook payload',
    });

    // 2. Analisar estrutura do JSON recebido
    let targetId: string | null = null;
    let sourceType: 'whatsapp' | 'instagram_messenger' | null = null;

    if (payload.object === 'whatsapp_business_account') {
      targetId = payload.entry?.[0]?.id;
      sourceType = 'whatsapp';
      payload.nexus_source = 'whatsapp';
    } else if (payload.object === 'page' || payload.object === 'instagram') {
      targetId = payload.entry?.[0]?.id;
      sourceType = 'instagram_messenger';
      payload.nexus_source = 'instagram_messenger';
    }

    // Retornar 200 OK imediatamente para a Meta (Resiliência Anti-Bloqueio)
    res.status(200).send('OK');

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
            app_id: appId,
            company_id: credentials[0].companyId,
            event_type: 'ROUTING_SUCCESS',
            status_detail: `Routed to ${destUrl}`,
          });
        })
        .catch(err => {
          logsManager.append({
            timestamp: new Date().toISOString(),
            app_id: appId,
            company_id: credentials[0].companyId,
            event_type: 'ROUTING_FAILED',
            status_detail: `Failed to route to ${destUrl}: ${err.message}`,
          });
        });
      } else {
        logsManager.append({
          timestamp: new Date().toISOString(),
          app_id: appId,
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

// POST /v1/compliance/data-deletion/:app_id
apiRouter.post('/compliance/data-deletion/:app_id', async (req, res) => {
  const appId = req.params.app_id;
  const signedRequest = req.body.signed_request;

  if (!signedRequest) {
    res.status(400).send('Missing signed_request');
    return;
  }

  try {
    const appRecord = await db.select().from(metaApps).where(eq(metaApps.appId, appId)).limit(1);
    if (appRecord.length === 0) {
      res.status(401).send('App not found');
      return;
    }

    const data = decodeSignedRequest(signedRequest, appRecord[0].appSecret);
    if (!data) {
      res.status(401).send('Invalid signed_request');
      return;
    }

    const userId = data.user_id;
    const confirmationCode = `DEL-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    logsManager.append({
      timestamp: new Date().toISOString(),
      app_id: appId,
      event_type: 'DATA_DELETION_REQUEST',
      status_detail: `Processed data deletion request for user ${userId}`,
    });

    res.json({
      url: `https://sua-api.nexus.com/v1/compliance/status?id=${confirmationCode}`,
      confirmation_code: confirmationCode
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});

// POST /v1/compliance/deauthorize/:app_id
apiRouter.post('/compliance/deauthorize/:app_id', async (req, res) => {
  const appId = req.params.app_id;
  const signedRequest = req.body.signed_request;

  if (!signedRequest) {
    res.status(400).send('Missing signed_request');
    return;
  }

  try {
    const appRecord = await db.select().from(metaApps).where(eq(metaApps.appId, appId)).limit(1);
    if (appRecord.length === 0) {
      res.status(401).send('App not found');
      return;
    }

    const data = decodeSignedRequest(signedRequest, appRecord[0].appSecret);
    if (!data) {
      res.status(401).send('Invalid signed_request');
      return;
    }

    const userId = data.user_id;

    // Ideally, map user_id to company_id to clear credentials.
    // For this example, we log it heavily and could clear credentials if we matched
    logsManager.append({
      timestamp: new Date().toISOString(),
      app_id: appId,
      event_type: 'DEAUTHORIZE_EVENT',
      status_detail: `App deauthorized by user ${userId}. Credentials would be cleared here.`,
    });

    res.status(200).send('OK');
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});


/**
 * 3. Endpoints de Gerenciamento (CRUD Administrativo)
 */

apiRouter.get('/logs', (req, res) => {
  res.json(logsManager.getLogs());
});

// meta_apps
apiRouter.get('/meta-apps', async (req, res) => {
  try {
    const apps = await db.select({
      id: metaApps.id,
      appId: metaApps.appId,
      appName: metaApps.appName,
      // hide appSecret
      verifyToken: metaApps.verifyToken
    }).from(metaApps);
    res.json(apps);
  } catch(e) { res.status(500).send(String(e)); }
});

apiRouter.post('/meta-apps', async (req, res) => {
  try {
    const parsed = MetaAppSchema.parse(req.body);
    const result = await db.insert(metaApps).values(parsed).returning();
    res.json(result[0]);
  } catch (e: any) {
    res.status(400).json({ error: e.errors || e.message });
  }
});

// meta_credentials
apiRouter.get('/meta-credentials', async (req, res) => {
  try {
    const creds = await db.select().from(metaCredentials);
    res.json(creds);
  } catch(e) { res.status(500).send(String(e)); }
});

apiRouter.post('/meta-credentials', async (req, res) => {
  try {
    const parsed = MetaCredentialSchema.parse(req.body);
    const result = await db.insert(metaCredentials).values(parsed).returning();
    res.json(result[0]);
  } catch (e: any) {
    res.status(400).json({ error: e.errors || e.message });
  }
});

// whatsapp_templates
apiRouter.get('/whatsapp-templates/:company_id', async (req, res) => {
  try {
    const temps = await db.select().from(whatsappTemplates).where(eq(whatsappTemplates.companyId, req.params.company_id));
    res.json(temps);
  } catch(e) { res.status(500).send(String(e)); }
});

apiRouter.post('/whatsapp-templates', async (req, res) => {
  try {
    const parsed = WhatsappTemplateSchema.parse(req.body);
    const result = await db.insert(whatsappTemplates).values(parsed).returning();
    res.json(result[0]);
  } catch (e: any) {
    res.status(400).json({ error: e.errors || e.message });
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
