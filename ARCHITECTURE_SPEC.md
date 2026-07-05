# Especificação de Arquitetura: Proxy Hub Multi-Tenant da Meta

Esta documentação detalha a infraestrutura de código baseada nas premissas solicitadas para o sistema de alta performance atuando como roteador multicanal da Meta (Nexus Platform).

## 1. Premissas de Arquitetura
A plataforma foi desenhada como um **Sistema Centralizado** (`Hub`).
* **App Central Único**: A API atua validando webhooks e assinaturas com base no App da Meta central (ou Apps secundários sob controle da Nexus), permitindo escalabilidade O(1) em gerência de apps da Meta, independente do volume de clientes na base.
* **Isolamento de Tenants**: Todos os webhooks recebidos são decodificados pela assinatura (`X-Hub-Signature-256`), validados e mapeados para os clientes através do `waba_id` (WhatsApp) ou `page_id` (Instagram/Messenger), mantendo um isolamento rígido em proxy.

## 2. Roteamento Assíncrono e Resiliência
Conforme as boas práticas da API da Meta:
* A API **sempre retorna `HTTP 200 OK` imediatamente** para a Meta, impedindo a perda de confiabilidade (Trust Score) do App ou desabilitação de Webhooks na Meta devido a atrasos de clientes.
* O roteamento (proxying) de mensagens é feito de forma totalmente **Assíncrona**.
* O payload nunca é salvo no banco de dados, protegendo a empresa sob escopos LGPD/GDPR e barateando custos com storage/I/O, operando estritamente em memória durante a fase de proxy.

## 3. Gestão de Logs Voláteis em RAM
* Foi implementada a classe `LogsManager` no backend, utilizando um array isolado na heap da memória Node.js.
* O sistema prevê a limpeza automática de logs antigos (Fila Circular com limite de `100` registros).
* Isso possibilita uma auditoria em tempo real extremamente rápida, blindada contra latência de gravação de logs em persistência relacional.

## 4. Endpoints de Compliance Embutidos
Os módulos de infraestrutura englobam assinaturas criptográficas AES/HMAC baseadas em `app_secret` (`src/lib/compliance_crypto.ts`) para lidar com as URLs de callback obrigatórias de exclusão de dados de usuário ("Data Deletion Request" e "Deauthorize callback").

## 5. Deployment no Coolify
O sistema de arquivos foi devidamente preparado com um `Dockerfile` e arquivos estruturados para um "zero downtime deployment" via Coolify.
* O esbuild em pacote único gera `dist/server.cjs`
* Base `node:22-alpine`
* Uso da porta `3000` via Host `0.0.0.0`
