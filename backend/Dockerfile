# syntax=docker/dockerfile:1

ARG NODE_VERSION=24

FROM node:${NODE_VERSION}-alpine AS base
WORKDIR /app

FROM --platform=$BUILDPLATFORM node:${NODE_VERSION}-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM base AS prod-deps
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev --no-audit --no-fund

FROM base AS runtime
ENV NODE_ENV=production \
    PORT=4000 \
    DOTENV_CONFIG_QUIET=true
RUN apk upgrade --no-cache \
 && rm -rf /usr/local/lib/node_modules /opt/yarn-* \
      /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack \
      /usr/local/bin/yarn /usr/local/bin/yarnpkg
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
USER node
EXPOSE 4000

HEALTHCHECK --interval=15s --timeout=5s --start-period=60s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:'+(process.env.PORT||4000)+'/api/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"]

CMD ["node", "dist/server.js"]
