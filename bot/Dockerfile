# MAX-бот: компиляция TypeScript и запуск на Node.js.
# Контекст сборки — корень репозитория (нужен общий package-lock.json).

FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY bot/package.json bot/
COPY miniapp/package.json miniapp/
RUN npm ci --workspace bot --include-workspace-root=false --no-audit --no-fund

COPY bot bot
RUN npm run build --workspace bot

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY bot/package.json bot/
COPY miniapp/package.json miniapp/
RUN npm ci --workspace bot --include-workspace-root=false --omit=dev --no-audit --no-fund \
  && npm cache clean --force

COPY --from=build /app/bot/dist bot/dist
COPY bot/run.mjs bot/run.mjs
COPY bot/certs bot/certs

USER node
WORKDIR /app/bot
CMD ["node", "run.mjs", "start"]
