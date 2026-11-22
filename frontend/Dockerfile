# syntax=docker/dockerfile:1

ARG NODE_VERSION=24

FROM --platform=$BUILDPLATFORM node:${NODE_VERSION}-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund
COPY . .
RUN npm run build

FROM nginx:1.30-alpine AS runtime

ENV API_UPSTREAM=api:4000 \
    GRAFANA_UPSTREAM=grafana:3000 \
    TRUSTED_PROXY=""

COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY nginx/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY nginx/40-siemple-real-ip.sh /docker-entrypoint.d/40-siemple-real-ip.sh
# Strip CRLF so /bin/sh can run the script.
RUN apk upgrade --no-cache \
 && sed -i 's/\r$//' /docker-entrypoint.d/40-siemple-real-ip.sh \
 && chmod 755 /docker-entrypoint.d/40-siemple-real-ip.sh

COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD ["wget", "-q", "--spider", "http://127.0.0.1/healthz"]
