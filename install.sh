#!/usr/bin/env bash
# SIEMple installer and maintenance tool. Run with `help` for every command.
#   curl -fsSL https://github.com/AjayKrishna9633/Siem-development/releases/latest/download/install.sh | sudo bash

set -euo pipefail

# ── Settings ────────────────────────────────────────────────────────────────
REPO="AjayKrishna9633/Siem-development"
SIEMPLE_DIR="${SIEMPLE_DIR:-/opt/siemple}"
SIEMPLE_ASSETS_URL="${SIEMPLE_ASSETS_URL:-}"
# Inline `configs: content:` needs Compose 2.23.1.
MIN_COMPOSE_VERSION="2.23.1"

# ── Output helpers ──────────────────────────────────────────────────────────
if [ -t 1 ]; then
  BOLD=$'\033[1m' RED=$'\033[31m' GREEN=$'\033[32m' YELLOW=$'\033[33m' RESET=$'\033[0m'
else
  BOLD='' RED='' GREEN='' YELLOW='' RESET=''
fi
info() { printf '%s==>%s %s\n' "$BOLD" "$RESET" "$*"; }
ok()   { printf '%s✓%s %s\n' "$GREEN" "$RESET" "$*"; }
warn() { printf '%s!%s %s\n' "$YELLOW" "$RESET" "$*" >&2; }
die()  { printf '%sError:%s %s\n' "$RED" "$RESET" "$*" >&2; exit 1; }

usage() {
  cat <<EOF
SIEMple installer

Usage: install.sh <command> [options]

Commands:
  install            Install SIEMple and start it (the default when no command is given)
      --version X      Release to install, e.g. 1.2.0 (default: the latest release)
      --port N         HTTP port (default: 80)
      --url URL        Address people will open, e.g. http://siem.lan (default: http://<this host's IP>)
      --domain NAME    Serve HTTPS at NAME with an automatic Let's Encrypt certificate
  update             Back up the database, then upgrade to the latest (or --version X) release
      --version X      Release to move to
      --no-backup      Skip the backup taken before updating
  backup             Save a backup to $SIEMPLE_DIR/backups: the database, plus the stored logs
                     and Grafana's data (Loki and Grafana pause for the copy)
      --no-logs        Database only (quick; this is what update takes)
  restore FILE.dump  Replace ALL current data with a backup (takes a safety backup first). Logs
                     and Grafana are restored too when the matching -volumes.tar.gz is next to it
      --yes            Don't ask for confirmation
  status             Show the containers, their health and the running version
  token              Issue a new setup token (only before setup is completed)
  uninstall          Stop and remove the containers; data is kept
      --purge          Also delete all data, images and settings (backups are kept)
      --yes            Don't ask for confirmation (with --purge)
  help               Show this help

Environment:
  SIEMPLE_DIR        Install folder (default: /opt/siemple)
EOF
}

confirm() {
  local prompt="$1" expected="$2" answer=''
  { exec 3<> /dev/tty; } 2> /dev/null || die "No terminal to confirm on; re-run with --yes."
  printf '%s' "$prompt" >&3
  read -r answer <&3 || true
  exec 3>&-
  [ "$answer" = "$expected" ]
}

# ── Checks ──────────────────────────────────────────────────────────────────
version_ge() {
  [ "$(printf '%s\n%s\n' "$2" "$1" | sort -V | head -n1)" = "$2" ]
}

check_prerequisites() {
  command -v curl > /dev/null || die "curl is required. Install it with your package manager."
  command -v docker > /dev/null \
    || die "Docker is required. Install it from https://docs.docker.com/engine/install/ (or: curl -fsSL https://get.docker.com | sh)"
  docker info > /dev/null 2>&1 \
    || die "Can't talk to Docker. Is it running, and are you root or in the 'docker' group? (try: sudo bash install.sh ...)"
  docker compose version > /dev/null 2>&1 \
    || die "The Docker Compose plugin is required (the 'docker compose' command): https://docs.docker.com/compose/install/linux/"
  local v
  v="$(docker compose version --short 2>/dev/null | sed 's/^v//')"
  version_ge "$v" "$MIN_COMPOSE_VERSION" \
    || die "Docker Compose $MIN_COMPOSE_VERSION or newer is required (found $v)."
}

require_install() {
  { [ -f "$SIEMPLE_DIR/docker-compose.yml" ] && [ -f "$SIEMPLE_DIR/.env" ]; } \
    || die "No SIEMple install found in $SIEMPLE_DIR (set SIEMPLE_DIR if it's elsewhere)."
  cd "$SIEMPLE_DIR"
}

compose() { docker compose "$@"; }

# ── .env helpers ────────────────────────────────────────────────────────────
set_env() {
  local key="$1" value="$2" file="${3:-.env}"
  awk -v k="$key" -v v="$value" '
    BEGIN { done = 0 }
    $0 ~ "^" k "=" { print k "=" v; done = 1; next }
    { print }
    END { if (!done) print k "=" v }
  ' "$file" > "$file.tmp"
  cat "$file.tmp" > "$file" # keeps the file's permissions (600)
  rm -f "$file.tmp"
}

get_env() {
  sed -n "s/^$1=//p" "${2:-.env}" | tail -n1
}

# Hex only: passwords go inside connection URLs.
random_secret() {
  if command -v openssl > /dev/null; then
    openssl rand -hex "$1"
  else
    head -c "$1" /dev/urandom | od -An -tx1 | tr -d ' \n'
  fi
}

# Letters, digits and _ . : @ + = ! # , - only: no quote, $, backtick, backslash or space, so it is
# safe in the agent commands. The Aa1- prefix meets the Wazuh API password policy.
random_password() {
  local pool
  pool="$(head -c 2048 /dev/urandom | LC_ALL=C tr -dc 'A-Za-z0-9_.:@+=!#,-')"
  printf 'Aa1-%s' "${pool:0:$(($1 - 4))}"
}

detect_ip() {
  local ip=''
  if command -v ip > /dev/null; then
    ip="$(ip -4 route get 1.1.1.1 2>/dev/null | sed -n 's/.* src \([0-9.]*\).*/\1/p' | head -n1)"
  fi
  [ -n "$ip" ] || ip="$(hostname -I 2>/dev/null | awk '{print $1}')"
  printf '%s' "${ip:-localhost}"
}

# ── Releases ────────────────────────────────────────────────────────────────
resolve_tag() {
  local version="$1" url
  if [ -n "$version" ]; then
    printf 'v%s' "${version#v}"
    return
  fi
  url="$(curl -fsSLI -o /dev/null -w '%{url_effective}' "https://github.com/$REPO/releases/latest")" \
    || die "Couldn't reach GitHub to find the latest release."
  case "$url" in
    */releases/tag/*) printf '%s' "${url##*/}" ;;
    *) die "No published release found at https://github.com/$REPO/releases" ;;
  esac
}

download() {
  local name="$1" tag="$2" dest="$3" base
  base="${SIEMPLE_ASSETS_URL:-https://github.com/$REPO/releases/download/$tag}"
  curl -fsSL "$base/$name" -o "$dest" || die "Download failed: $base/$name"
}

fetch_release_files() {
  local tag="$1" tmp
  tmp="$(mktemp -d)"
  download docker-compose.yml "$tag" "$tmp/docker-compose.yml"
  download env.example "$tag" "$tmp/.env.example"
  download install.sh "$tag" "$tmp/install.sh"
  mv "$tmp/docker-compose.yml" "$tmp/.env.example" "$tmp/install.sh" .
  chmod 755 install.sh
  rmdir "$tmp"
}

start_stack() {
  info "Starting SIEMple (the first start can take a minute)..."
  if ! compose up -d --wait --remove-orphans; then
    warn "SIEMple didn't become healthy. Recent logs:"
    compose ps -a >&2 || true
    compose logs --tail 30 migrate api web grafana caddy >&2 2>/dev/null || true
    die "Start failed. Fix the problem above, then run: $SIEMPLE_DIR/install.sh update"
  fi
}

show_setup_token() {
  local line
  line="$(compose exec -T api node dist/cli/setup-token.js 2>/dev/null | grep -o '==== SIEMple setup token.*' || true)"
  if [ -n "$line" ]; then
    printf '\n%s%s%s\n\n' "$BOLD" "$line" "$RESET"
    echo "Open the address above and enter the token to create the first admin account."
    echo "Lost it? Run: $SIEMPLE_DIR/install.sh token"
  else
    ok "Setup has already been completed: sign in at $(get_env APP_URL)"
  fi
}

add_missing_settings() {
  if [ -z "$(get_env GRAFANA_ADMIN_PASSWORD)" ]; then
    set_env GRAFANA_ADMIN_PASSWORD "$(random_secret 24)"
    ok "Generated a Grafana admin password (GRAFANA_ADMIN_PASSWORD in $SIEMPLE_DIR/.env)"
  fi
  if [ -z "$(get_env WAZUH_API_PASSWORD)" ]; then
    set_env WAZUH_API_PASSWORD "$(random_password 32)"
    ok "Generated the Wazuh API password (WAZUH_API_PASSWORD in $SIEMPLE_DIR/.env)"
  fi
  if [ -z "$(get_env WAZUH_ENROLLMENT_PASSWORD)" ]; then
    set_env WAZUH_ENROLLMENT_PASSWORD "$(random_password 32)"
    ok "Generated the agent enrollment password (WAZUH_ENROLLMENT_PASSWORD in $SIEMPLE_DIR/.env)"
  fi
  case "$(get_env COMPOSE_PROFILES)" in
    *https*) [ -n "$(get_env GRAFANA_COOKIE_SECURE)" ] || set_env GRAFANA_COOKIE_SECURE true ;;
  esac
}

show_grafana_login() {
  local user
  user="$(get_env GRAFANA_ADMIN_USER)"
  echo "Health (Grafana): $(get_env APP_URL)/grafana/  (user ${user:-admin}; password: GRAFANA_ADMIN_PASSWORD in $SIEMPLE_DIR/.env)"
}

show_agent_address() {
  local address
  address="$(get_env WAZUH_PUBLIC_ADDRESS)"
  if [ -n "$address" ]; then
    echo "Agents: connect to $address on TCP 1514 and 1515 (WAZUH_PUBLIC_ADDRESS in $SIEMPLE_DIR/.env)"
  else
    warn "Set WAZUH_PUBLIC_ADDRESS in $SIEMPLE_DIR/.env to the address agents use to reach this server."
  fi
}

with_data_volumes() {
  local loki grafana image
  loki="$(compose ps -aq loki)"
  grafana="$(compose ps -aq grafana)"
  { [ -n "$loki" ] && [ -n "$grafana" ]; } || die "Loki or Grafana isn't installed; start SIEMple first."
  image="$(docker inspect -f '{{.Config.Image}}' "$grafana")"
  docker run --rm --user 0 --entrypoint sh --volumes-from "$loki" --volumes-from "$grafana" \
    -v "$SIEMPLE_DIR/backups:/backup" "$image" -c "$1"
}

# ── Commands ────────────────────────────────────────────────────────────────
cmd_install() {
  local version='' port='' url='' domain=''
  while [ $# -gt 0 ]; do
    case "$1" in
      --version) version="${2:?--version needs a value}"; shift 2 ;;
      --port)    port="${2:?--port needs a value}"; shift 2 ;;
      --url)     url="${2:?--url needs a value}"; shift 2 ;;
      --domain)  domain="${2:?--domain needs a value}"; shift 2 ;;
      *) die "Unknown option for install: $1" ;;
    esac
  done
  [ -z "$port" ] || [[ "$port" =~ ^[0-9]+$ ]] || die "--port must be a number."
  [ -z "$domain" ] || [ -z "$port" ] || die "--port can't be combined with --domain (HTTPS uses ports 80 and 443)."

  check_prerequisites
  local tag
  tag="$(resolve_tag "$version")"
  info "Installing SIEMple ${tag} into $SIEMPLE_DIR"

  mkdir -p "$SIEMPLE_DIR" 2>/dev/null || die "Can't create $SIEMPLE_DIR. Run with sudo, or set SIEMPLE_DIR=\$HOME/siemple."
  cd "$SIEMPLE_DIR"
  fetch_release_files "$tag"

  if [ -f .env ]; then
    # Never replace existing secrets: the database was created with them.
    ok "Keeping the existing .env (secrets and settings unchanged)"
    [ -z "$port$url$domain" ] || warn "--port, --url and --domain only apply to a new install; edit $SIEMPLE_DIR/.env to change them."
  else
    (umask 077 && cp .env.example .env)
    set_env POSTGRES_PASSWORD "$(random_secret 24)"
    set_env REDIS_PASSWORD "$(random_secret 24)"
    set_env JWT_SECRET "$(random_secret 32)"
    set_env GRAFANA_ADMIN_PASSWORD "$(random_secret 24)"
    set_env WAZUH_PUBLIC_ADDRESS "$(detect_ip)"
    if [ -n "$domain" ]; then
      set_env COMPOSE_PROFILES https
      set_env GRAFANA_COOKIE_SECURE true
      set_env DOMAIN "$domain"
      set_env APP_URL "${url:-https://$domain}"
      set_env TRUSTED_PROXY caddy
      set_env WEB_BIND 127.0.0.1
      set_env WEB_PORT 8080
    else
      local host_url
      host_url="http://$(detect_ip)"
      [ -z "$port" ] || [ "$port" = 80 ] || host_url="$host_url:$port"
      set_env APP_URL "${url:-$host_url}"
      [ -z "$port" ] || set_env WEB_PORT "$port"
    fi
    ok "Created .env with newly generated secrets"
  fi
  set_env SIEMPLE_VERSION "${tag#v}"
  add_missing_settings

  info "Downloading images..."
  compose pull --quiet
  start_stack
  ok "SIEMple ${tag} is running at $(get_env APP_URL)"
  show_grafana_login
  show_agent_address
  show_setup_token
}

cmd_update() {
  local version='' backup=1
  while [ $# -gt 0 ]; do
    case "$1" in
      --version)   version="${2:?--version needs a value}"; shift 2 ;;
      --no-backup) backup=0; shift ;;
      *) die "Unknown option for update: $1" ;;
    esac
  done
  check_prerequisites
  require_install
  local tag current
  tag="$(resolve_tag "$version")"
  current="$(get_env SIEMPLE_VERSION)"
  info "Updating SIEMple ${current:-?} -> ${tag#v}"

  [ "$backup" = 0 ] || cmd_backup --no-logs

  cp docker-compose.yml docker-compose.yml.previous
  fetch_release_files "$tag"
  set_env SIEMPLE_VERSION "${tag#v}"
  add_missing_settings
  compose config --quiet || die "The new docker-compose.yml doesn't accept this .env (see above)."

  info "Downloading images..."
  compose pull --quiet
  start_stack
  ok "SIEMple is now on ${tag#v}"
  docker image prune -f > /dev/null 2>&1 || true
}

cmd_backup() {
  local logs=1
  while [ $# -gt 0 ]; do
    case "$1" in
      --no-logs) logs=0; shift ;;
      *) die "Unknown option for backup: $1" ;;
    esac
  done
  require_install
  local user db stamp file
  user="$(get_env POSTGRES_USER)"; user="${user:-siemple}"
  db="$(get_env POSTGRES_DB)"; db="${db:-siemple}"
  mkdir -p backups
  chmod 700 backups
  stamp="$(date +%Y%m%d-%H%M%S)"
  file="backups/siemple-$stamp.dump"
  info "Backing up the database to $SIEMPLE_DIR/$file"
  if ! (umask 077 && compose exec -T postgres pg_dump -U "$user" -d "$db" --format=custom > "$file"); then
    rm -f "$file"
    die "Backup failed. Is the postgres container running? (install.sh status)"
  fi
  ok "Database saved ($(du -h "$file" | cut -f1))"

  if [ "$logs" = 1 ]; then
    local volumes="siemple-$stamp-volumes.tar.gz"
    info "Backing up the stored logs and Grafana to $SIEMPLE_DIR/backups/$volumes"
    compose stop loki grafana > /dev/null
    if ! with_data_volumes "umask 077 && tar czf '/backup/$volumes' -C / loki var/lib/grafana"; then
      rm -f "backups/$volumes"
      compose start loki grafana > /dev/null
      die "Copying the logs failed (the database backup above is fine)."
    fi
    compose start loki grafana > /dev/null
    ok "Logs and Grafana saved ($(du -h "backups/$volumes" | cut -f1))"
  fi
  echo "Copy the backups somewhere off this machine too."
}

cmd_restore() {
  local file='' yes=0
  while [ $# -gt 0 ]; do
    case "$1" in
      --yes) yes=1; shift ;;
      -*) die "Unknown option for restore: $1" ;;
      *) file="$1"; shift ;;
    esac
  done
  [ -n "$file" ] || die "Usage: install.sh restore <backup file>"
  [ -f "$file" ] || die "Backup file not found: $file"
  file="$(cd "$(dirname "$file")" && pwd)/$(basename "$file")"
  require_install
  local volumes="${file%.dump}-volumes.tar.gz"
  [ -f "$volumes" ] || volumes=''

  if [ "$yes" = 0 ]; then
    warn "This replaces ALL current SIEMple data with the contents of $file."
    if [ -n "$volumes" ]; then
      warn "Stored logs and Grafana's data are replaced from $volumes."
    else
      warn "No matching -volumes.tar.gz: stored logs and Grafana's data stay as they are."
    fi
    confirm "Type 'restore' to continue: " restore || die "Cancelled."
  fi

  if [ -n "$volumes" ]; then cmd_backup; else cmd_backup --no-logs; fi
  local user db
  user="$(get_env POSTGRES_USER)"; user="${user:-siemple}"
  db="$(get_env POSTGRES_DB)"; db="${db:-siemple}"

  info "Stopping the app so nothing writes during the restore..."
  compose stop web api
  info "Restoring $file"
  if ! compose exec -T postgres pg_restore -U "$user" -d "$db" --clean --if-exists --no-owner \
      --single-transaction --exit-on-error < "$file"; then
    warn "Restore failed; the database was left as it was. Restarting the app..."
    start_stack
    die "Restore failed (see the error above)."
  fi
  if [ -n "$volumes" ]; then
    info "Restoring the stored logs and Grafana from $volumes"
    compose stop loki grafana > /dev/null
    local name
    name="$(basename "$volumes")"
    if [ "$(dirname "$volumes")" != "$SIEMPLE_DIR/backups" ]; then
      name="restore-volumes.tar.gz"
      cp "$volumes" "backups/$name"
    fi
    with_data_volumes "rm -rf /loki/* /var/lib/grafana/* && tar xzf '/backup/$name' -C /" \
      || warn "Restoring the logs failed; the database was restored. See the error above."
    rm -f "backups/restore-volumes.tar.gz"
  fi
  start_stack
  ok "Restore complete."
}

cmd_status() {
  require_install
  echo "Install folder: $SIEMPLE_DIR"
  echo "Version:        $(get_env SIEMPLE_VERSION)"
  echo "Address:        $(get_env APP_URL)"
  echo "Health:         $(get_env APP_URL)/grafana/"
  echo
  compose ps -a --format 'table {{.Service}}\t{{.State}}\t{{.Status}}\t{{.Ports}}'
  echo
  echo "Logs: cd $SIEMPLE_DIR && docker compose logs -f api"
}

cmd_token() {
  require_install
  compose exec -T api node dist/cli/setup-token.js
}

cmd_uninstall() {
  local purge=0 yes=0
  while [ $# -gt 0 ]; do
    case "$1" in
      --purge) purge=1; shift ;;
      --yes)   yes=1; shift ;;
      *) die "Unknown option for uninstall: $1" ;;
    esac
  done
  require_install

  if [ "$purge" = 0 ]; then
    compose down --remove-orphans
    ok "SIEMple is stopped and its containers removed. Data and settings are kept in $SIEMPLE_DIR"
    echo "Start it again with: cd $SIEMPLE_DIR && docker compose up -d"
    return
  fi

  if [ "$yes" = 0 ]; then
    warn "This permanently deletes the SIEMple database, stored logs, Grafana, certificates, images and settings (.env)."
    [ -d backups ] && warn "Backups in $SIEMPLE_DIR/backups are kept."
    confirm "Type 'delete' to continue: " delete || die "Cancelled."
  fi
  compose --profile https down --volumes --rmi all --remove-orphans
  rm -f docker-compose.yml docker-compose.yml.previous .env .env.example install.sh
  cd /
  rmdir "$SIEMPLE_DIR" 2>/dev/null || true
  ok "SIEMple has been removed."
}

main() {
  local cmd="${1:-install}"
  [ $# -eq 0 ] || shift
  case "$cmd" in
    install)   cmd_install "$@" ;;
    update)    cmd_update "$@" ;;
    backup)    cmd_backup "$@" ;;
    restore)   cmd_restore "$@" ;;
    status)    cmd_status "$@" ;;
    token)     cmd_token "$@" ;;
    uninstall) cmd_uninstall "$@" ;;
    help|-h|--help) usage ;;
    *) usage >&2; die "Unknown command: $cmd" ;;
  esac
}

main "$@"
