# syntax=docker/dockerfile:1

# SIEMple API image. Build from the backend folder: docker build -t siemple-api ./backend
# The same image runs the API (default CMD) and the one-shot migrate job:
#   docker run ... siemple-api node dist/cli/migrate.js

ARG NODE_VERSION=24

FROM node:${NODE_VERSION}-alpine AS base
WORKDIR /app

# Every dependency, dev ones included, because the TypeScript compiler is a dev dependency.
# The lockfile is copied on its own first so this layer is reused until dependencies change.
# Runs on the build machine's own platform: compiled JavaScript is the same for every target, so
# a multi-arch build doesn't run tsc under slow emulation.
FROM --platform=$BUILDPLATFORM node:${NODE_VERSION}-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# A separate, clean install of production dependencies only, so tsc, vitest and friends never
# reach the final image. bcrypt ships prebuilt binaries for musl (Alpine), so no compiler is needed.
# Runs on the target platform, so native modules match the architecture the image is for.
FROM base AS prod-deps
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev --no-audit --no-fund

FROM base AS runtime
# DOTENV_CONFIG_QUIET stops dotenv printing a plain-text "injected env" line among the JSON logs;
# in the container all configuration comes from compose, never from a .env file.
ENV NODE_ENV=production \
    PORT=4000 \
    DOTENV_CONFIG_QUIET=true
# Apply Alpine security updates released since the base image was built (base images are only
# rebuilt every few weeks).
# Nothing runs npm, yarn or corepack at runtime (the migrate job is `node dist/cli/migrate.js`).
# Removing them keeps them out of the running container and out of vulnerability scans, which
# read the final filesystem. (It doesn't shrink the download: the base layer still holds them.)
RUN apk upgrade --no-cache \
 && rm -rf /usr/local/lib/node_modules /opt/yarn-* \
      /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack \
      /usr/local/bin/yarn /usr/local/bin/yarnpkg
# Files stay owned by root and the process runs as the unprivileged `node` user (from the base
# image), so a compromised process can't rewrite its own code.
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
USER node
EXPOSE 4000

# Uses node itself rather than curl/wget, so it works on any base image and honours PORT.
# /api/health answers before setup is complete and returns 503 when Postgres (or Redis, in
# production) is down. start-period covers the database retry window at boot.
HEALTHCHECK --interval=15s --timeout=5s --start-period=60s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:'+(process.env.PORT||4000)+'/api/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"]

# Exec form so node receives signals directly; compose adds `init: true` so SIGTERM is handled
# and zombie processes are reaped.
CMD ["node", "dist/server.js"]
