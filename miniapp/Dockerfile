# Мини-приложение: сборка Vite и раздача статики через nginx.
# Контекст сборки — корень репозитория (нужен общий package-lock.json).

FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY miniapp/package.json miniapp/
COPY bot/package.json bot/
RUN npm ci --workspace miniapp --include-workspace-root=false --no-audit --no-fund

COPY miniapp miniapp

# Публичные значения Supabase встраиваются в сборку (это не секреты).
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_MAX_BOT_USERNAME
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY \
    VITE_MAX_BOT_USERNAME=$VITE_MAX_BOT_USERNAME
RUN npm run build --workspace miniapp

FROM nginx:1.27-alpine
COPY miniapp/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/miniapp/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
