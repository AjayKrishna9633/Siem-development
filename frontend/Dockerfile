# syntax=docker/dockerfile:1

# SIEMple web image: the React build served by nginx. Build from the frontend folder:
#   docker build -t siemple-web ./frontend
# The bundle calls the API at the relative path /api, so one image works at any address;
# nginx proxies /api to the api service (nginx/default.conf.template).

ARG NODE_VERSION=24

# The bundle is plain JS/CSS, identical for every platform, so it's built on the build machine's
# own platform; a multi-arch build then only copies it into each platform's nginx image.
FROM --platform=$BUILDPLATFORM node:${NODE_VERSION}-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund
COPY . .
RUN npm run build

# The stable nginx line: security fixes only, which suits a server that's installed and left
# running.
FROM nginx:1.30-alpine AS runtime

# host:port of the API and of Grafana, substituted into the nginx template at startup. Compose
# can override them. TRUSTED_PROXY is empty by default (trust no X-Forwarded-For); see
# 40-siemple-real-ip.sh.
ENV API_UPSTREAM=api:4000 \
    GRAFANA_UPSTREAM=grafana:3000 \
    TRUSTED_PROXY=""

# The image's entrypoint renders /etc/nginx/templates/*.template into conf.d/ and runs the
# scripts in /docker-entrypoint.d in name order before starting nginx.
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY nginx/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY nginx/40-siemple-real-ip.sh /docker-entrypoint.d/40-siemple-real-ip.sh
# Apply Alpine security updates released since the base image was built (base images are only
# rebuilt every few weeks). Then strip Windows line endings in case the script was checked out
# with CRLF, which would stop /bin/sh from running it, and make it executable.
RUN apk upgrade --no-cache \
 && sed -i 's/\r$//' /docker-entrypoint.d/40-siemple-real-ip.sh \
 && chmod 755 /docker-entrypoint.d/40-siemple-real-ip.sh

# Only the static build output; Node and node_modules stay in the build stage.
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
# /healthz is answered by nginx itself and isn't written to the access log. busybox wget ships
# with the Alpine image, so no extra package is needed.
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD ["wget", "-q", "--spider", "http://127.0.0.1/healthz"]
