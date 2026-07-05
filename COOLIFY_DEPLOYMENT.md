# Guia de Provisionamento e Deployment - Nexus Meta Hub no Coolify

Este guia descreve os passos exatos para realizar o deploy do Nexus Meta Hub utilizando o Coolify como orquestrador e Traefik como proxy reverso, em conformidade com as exigências de arquitetura (porta 8000).

## 1. Conexão do Repositório e Build Pack

1. No painel do Coolify, navegue até **Projects** > Selecione ou crie um projeto > **Add New Resource**.
2. Escolha **Git Repository** (Public ou Private, conforme sua hospedagem no GitHub/GitLab).
3. Selecione o branch principal (ex: `main` ou `master`).
4. Em **Build Pack**, selecione **Nixpacks** ou **Dockerfile**.
   - Como incluímos um `Dockerfile` otimizado multistage na raiz do projeto, o Coolify detectará automaticamente e utilizará o Build Pack "Docker".
   - Certifique-se de que o **Build Command** esteja vazio, pois o Dockerfile já se encarrega de realizar o build (`npm run build`).

## 2. Configuração de Domínio e HTTPS Nativo

A Graph API e os Webhooks da Meta **exigem** conexões HTTPS seguras.

1. Na aba **Configuration** do serviço recém-criado, procure a seção **Domains**.
2. Insira o domínio ou subdomínio de produção para o seu Hub (ex: `https://api.nexusdevhub.com`).
3. O Coolify (com o Traefik) gerará automaticamente os certificados SSL via Let's Encrypt para o domínio, resolvendo a exigência de HTTPS da Meta sem necessidade de configuração adicional no contêiner Node.js.

## 3. Variáveis de Ambiente Críticas

Para o funcionamento correto do roteador multicanal e segurança de Webhooks (validação HMAC e LGPD), navegue até a aba **Environment Variables** e insira:

- `DATABASE_URL`: String de conexão com seu banco PostgreSQL (`postgres://user:password@host:port/dbname`). Importante: o arquivo do Prisma/Drizzle já conta com opções de verificação de vida útil do pool.
- `META_APP_SECRET`: Chave secreta do seu Meta App central, utilizada para assinar webhooks e requisições de deleção de dados (X-Hub-Signature-256).
- `META_VERIFY_TOKEN`: Token personalizado estático que você configurou no painel da Meta para validação inicial de webhooks.
- `META_APP_ID`: O ID principal do seu aplicativo da Meta.
- `APP_URL`: O domínio público da aplicação configurado no passo 2, usado para retornar a URL de status nas exclusões de dados.
- `PORT`: Deixe como padrão `8000` ou omita, já que o Dockerfile padronizou esta porta na variável de ambiente interna.

## 4. Configuração de Rede (Exposing the Port)

1. Na aba **Configuration**, verifique a porta exposta.
2. Certifique-se de que o campo **Ports Exposes** esteja configurado como `8000`. O contêiner é inicializado internamente para escutar na interface `0.0.0.0` e responderá na porta 8000.
3. O proxy reverso do Coolify encaminhará o tráfego da porta 443 (HTTPS) para a 8000 (interna).

## 5. Healthcheck e Monitoramento

1. Acesse as opções avançadas (Advanced) na configuração do serviço.
2. Adicione ou verifique as configurações de **Healthcheck**.
3. Aponte o Path do Healthcheck para `/v1/meta-config` ou para a raiz `/`. Isso garantirá que o Traefik envie tráfego apenas quando a API assíncrona Express estiver pronta para atender.

Após salvar todas as configurações, clique em **Deploy** ou **Force Rebuild**. O Coolify fará a construção da imagem a partir do `Dockerfile` slim e iniciará o container rodando no ecossistema de produção.
