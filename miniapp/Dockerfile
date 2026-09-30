# Мини-приложение: сборка Vite и раздача статики через nginx.
# Контекст сборки — корень репозитория (нужен общий package-lock.json).

FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY miniapp/package.json miniapp/
COPY bot/package.json bot/
RUN npm ci --workspace miniapp --include-workspace-root=false --no-audit --no-fund

COPY miniapp miniapp

RUN npm run build --workspace miniapp

FROM nginx:1.27-alpine
COPY miniapp/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/miniapp/dist /usr/share/nginx/html
COPY --chmod=755 miniapp/docker/40-runtime-config.sh /docker-entrypoint.d/40-runtime-config.sh
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
