# syntax=docker/dockerfile:1

# 1) Dependências de produção
FROM node:18-bullseye-slim AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# 2) Gera Prisma Client (com a CLI disponível só no build)
FROM node:18-bullseye-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci && npm i -D prisma
COPY . .
RUN npx prisma generate

# 3) Imagem final enxuta para rodar a API
FROM node:18-bullseye-slim
WORKDIR /app
ENV NODE_ENV=production

# Prisma precisa do openssl em runtime
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copia node_modules de produção e o app com Prisma Client gerado
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/ ./

# Não levar variáveis locais
RUN rm -f .env

# A API expõe 3000
EXPOSE 3000

# Start
CMD ["node", "index.js"]
