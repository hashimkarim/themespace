FROM node:24.22.2-bookworm-slim@sha256:c86ecead9e55a5210ac1727de38a4ca840bf03dcaf34dc9749addbf383b1920c AS build
WORKDIR /repo
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ ca-certificates lua5.4 \
    && rm -rf /var/lib/apt/lists/*
COPY web/package.json web/package-lock.json ./web/
RUN --mount=type=cache,target=/root/.npm cd /repo/web && npm ci
COPY extension/package.json extension/package-lock.json ./extension/
RUN --mount=type=cache,target=/root/.npm cd /repo/extension && npm ci
COPY web/ ./web/
COPY extension/ ./extension/
# Build and verify the companion extension and publish its release zips into web/public/downloads.
RUN cd /repo/extension && npm run typecheck && npm test \
    && node scripts/build.mjs --pack ../web/public/downloads
# Every published image passes the application's checks and both storage runtimes.
WORKDIR /repo/web
RUN npm run typecheck && npm run lint && npm test && npm run test:api \
    && npm run build:node && npm run test:production

FROM node:24.22.2-bookworm-slim@sha256:c86ecead9e55a5210ac1727de38a4ca840bf03dcaf34dc9749addbf383b1920c AS runtime
ENV NODE_ENV=production PORT=3000 HOST=0.0.0.0 DATABASE_PATH=/data/themespace.sqlite
WORKDIR /app
COPY --from=build --chown=node:node /repo/web/dist/standalone/ ./
RUN mkdir /data && chown node:node /data
USER node
EXPOSE 3000
CMD ["node", "scripts/start-production.mjs"]
