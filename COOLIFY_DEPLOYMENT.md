# Nexus Platform: Guia de Deploy no Coolify

Este guia orienta o provisionamento do **Proxy Hub Multi-Tenant (Nexus Platform)** no painel do Coolify, atendendo a todos os critérios de resiliência e auditoria da Meta.

---

## 1. Conexão do Repositório e Configuração Inicial
No painel do Coolify:
1. Acesse **Projects** > Adicione ou escolha um projeto > **New Resource**.
2. Selecione **Public Repository** (ou Private, se o repositório for privado).
3. Insira a URL do repositório Git.
4. Em **Build Pack**, selecione a opção **Dockerfile**. (O sistema irá ler automaticamente nosso `Dockerfile` otimizado, que inclui cache de pacotes, build do Vite/esbuild e Alpine Node.js).

---

## 2. Configuração de Rede e Domínio (Obrigatório para Meta)
A Meta exige conexões seguras por HTTPS para registro de Webhooks e Embedded Signup.
1. No menu de configurações da aplicação no Coolify, vá em **Domains**.
2. Adicione seu domínio configurado (ex: `https://api.nexusdevhub.com`).
3. O Coolify lidará automaticamente com o proxy reverso Traefik/Caddy e emitirá o certificado SSL (Let's Encrypt).
4. Certifique-se de que a porta interna (**Port**) do container esteja exposta como `3000`. (Isso já está pré-configurado no nosso Dockerfile com a diretiva `EXPOSE 3000`).

---

## 3. Variáveis de Ambiente (Segurança)
Na aba **Environment Variables** do Coolify, adicione as variáveis críticas. Não coloque aspas no valor.

* `DATABASE_URL`: String de conexão do seu banco de dados PostgreSQL (ex: `postgres://user:pass@host:5432/db`). Use um banco de dados relacional isolado.
* `APP_URL`: URL base da sua aplicação usada para callbacks de exclusão de dados da Meta (ex: `https://api.nexusdevhub.com`).
* `NODE_ENV`: Defina como `production`.

---

## 4. Monitoramento e Resiliência (Healthchecks)
Para evitar desligamento forçado ou que o proxy perca pacotes:
1. Vá até a seção **Healthchecks** (se suportado diretamente pelo Coolify/Docker Compose gerado).
2. O servidor expõe endpoints base para isso. Por se tratar de um roteador da Meta de missão crítica, garanta que o Traefik/Proxy redirecione tráfego contínuo.
3. Defina a política de restart como `always` ou `unless-stopped`.

---

## 5. Deployment e Validação
1. Clique em **Deploy** no Coolify.
2. Acompanhe os logs. O build criará a pasta `dist/` com o front-end minificado (Dashboard) e o servidor em `dist/server.cjs`.
3. Verifique a URL do dashboard no navegador para acessar as configurações de "SaaS Clients", "System Config" (Meta Apps) e visualizar os "Volatile Logs".
4. Cadastre o App Central no Dashboard Nexus na aba **System Config**, pegue a URL gerada (ex: `https://api.nexusdevhub.com/v1/webhooks/meta/SEU_APP_ID`) e insira no painel da Meta para validação com o Verify Token criado.
