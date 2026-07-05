# Imagem oficial leve otimizada para produção Node.js
FROM node:22-alpine

# Definição do diretório de trabalho
WORKDIR /app

# Otimização de Cache do Docker (Copia package.json e package-lock.json primeiro)
COPY package*.json ./

# Instalação apenas de dependências essenciais
RUN npm ci

# Cópia do restante do código-fonte para o container
COPY . .

# Build da aplicação Express/Vite (Produção)
RUN npm run build

# Exposição explícita da porta interna exigida pelo Coolify
EXPOSE 3000

# Execução do Node.js escutando em 0.0.0.0
CMD ["npm", "start"]
