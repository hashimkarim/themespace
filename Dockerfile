FROM node:24-bookworm-slim@sha256:ba849c60be29959425b8734d57b8b4b7d56f98edd9504c9af091d5281095a71e AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ ca-certificates lua5.4 \
    && rm -rf /var/lib/apt/lists/*
COPY web/package.json web/package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci
COPY web/ ./
# Every published image passes the application's checks and both storage runtimes.
RUN npm run typecheck && npm run lint && npm test && npm run test:api \
    && npm run build:node && npm run test:production

FROM node:24-bookworm-slim@sha256:ba849c60be29959425b8734d57b8b4b7d56f98edd9504c9af091d5281095a71e AS runtime
ENV NODE_ENV=production PORT=3000 HOST=0.0.0.0 DATABASE_PATH=/data/themespace.sqlite
WORKDIR /app
COPY --from=build --chown=node:node /app/dist/standalone/ ./
RUN mkdir /data && chown node:node /data
USER node
EXPOSE 3000
CMD ["node", "scripts/start-production.mjs"]
