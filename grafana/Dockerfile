FROM grafana/grafana:13.3.1

ENV GF_SERVER_SERVE_FROM_SUB_PATH=true \
    GF_USERS_ALLOW_SIGN_UP=false \
    GF_AUTH_ANONYMOUS_ENABLED=false \
    GF_ANALYTICS_REPORTING_ENABLED=false \
    GF_ANALYTICS_CHECK_FOR_UPDATES=false \
    GF_ANALYTICS_CHECK_FOR_PLUGIN_UPDATES=false \
    GF_NEWS_NEWS_FEED_ENABLED=false \
    GF_SECURITY_DISABLE_GRAVATAR=true \
    GF_SECURITY_CONTENT_SECURITY_POLICY=true \
    GF_LOG_LEVEL=warn \
    GF_DATABASE_WAL=true \
    LOKI_URL=http://loki:3100

# Logs Drilldown is installed at build time so offline servers work.
USER root
RUN apk upgrade --no-cache \
 && grafana cli --pluginsDir /usr/share/grafana/siemple-plugins \
      plugins install grafana-lokiexplore-app 3.2.0
USER grafana
ENV GF_PATHS_PLUGINS=/usr/share/grafana/siemple-plugins \
    GF_PLUGINS_PREINSTALL_DISABLED=true

COPY provisioning /etc/grafana/provisioning
COPY dashboards /etc/grafana/dashboards

# The first start runs Grafana's database migrations, which can take minutes on a slow disk.
# start-period only covers that window after a start; a later failure is still caught.
HEALTHCHECK --interval=15s --timeout=5s --start-period=300s --retries=5 \
  CMD ["wget", "-q", "--spider", "http://127.0.0.1:3000/grafana/api/health"]
