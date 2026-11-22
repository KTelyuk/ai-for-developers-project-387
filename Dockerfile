# syntax=docker/dockerfile:1

# Сборка: генерация контракта и SDK, затем сборка фронтенда.
FROM node:24-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY typespec/package.json typespec/
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN npm ci

COPY typespec typespec
COPY openapi openapi
COPY frontend frontend
RUN npm run build -w typespec \
  && npm run generate -w frontend \
  && npm run build -w frontend

# Финальный образ: бэкенд, контракт, собранный фронтенд и только продакшен-зависимости.
FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY package.json package-lock.json ./
COPY typespec/package.json typespec/
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN npm ci --omit=dev --workspace backend && npm cache clean --force

COPY backend/src backend/src
COPY --from=build /app/openapi openapi
COPY --from=build /app/frontend/dist frontend/dist

USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --start-interval=1s --retries=3 \
  CMD wget -q -O /dev/null "http://127.0.0.1:${PORT}/api/health" || exit 1
CMD ["node", "backend/src/server.ts"]
