# SIEMple's Grafana: the stock image plus the Loki data source and the SIEMple Health dashboard,
# so a fresh install opens ready to show whether SIEMple itself is healthy. Served by nginx under
# /grafana/. It only ever sees the logs of SIEMple's own containers, never security events.
FROM grafana/grafana:13.3.1

# Defaults for a self-hosted, single-company install; compose sets the address and admin login.
#   - served from /grafana/ behind nginx (compose sets GF_SERVER_ROOT_URL to match)
#   - nobody can sign up or browse without signing in
#   - no calls home: usage stats, update checks, news feed, Gravatar
#   - Grafana's own Content-Security-Policy on (nginx doesn't add the app's, which would break it)
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
    LOKI_URL=http://loki:3100

# Alpine security updates released since the base image was built, and Logs Drilldown (a
# point-and-click log explorer) installed now, at build time. Grafana would otherwise download
# it and about ten other plugins from grafana.com on every first start, which fails on servers
# without internet access. Plugins live in the image, not in the grafana-data volume, so an
# update brings the new version.
USER root
RUN apk upgrade --no-cache \
 && grafana cli --pluginsDir /usr/share/grafana/siemple-plugins \
      plugins install grafana-lokiexplore-app 3.2.0
USER grafana
ENV GF_PATHS_PLUGINS=/usr/share/grafana/siemple-plugins \
    GF_PLUGINS_PREINSTALL_DISABLED=true

# Read at every start: changes here reach existing installs on update. Provisioned items can't
# be edited or deleted in the UI (save a copy to change a dashboard).
COPY provisioning /etc/grafana/provisioning
COPY dashboards /etc/grafana/dashboards

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
  CMD ["wget", "-q", "--spider", "http://127.0.0.1:3000/grafana/api/health"]
