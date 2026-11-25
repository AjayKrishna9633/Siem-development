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
      --smtp-host H    Send email through H (optional; email can also be set up in Settings → Email)
      --smtp-port N    SMTP port (default: 587)
      --smtp-user U    SMTP username; the password is asked for, or read from SIEMPLE_SMTP_PASSWORD
      --smtp-from A    Sender, e.g. "SIEMple <siem@example.com>" (default: the username)
  update            Back up the database, then upgrade to the latest (or --version X) release
      --version X      Release to move to
      --no-backup      Skip the backup taken before updating
  backup             Save a backup to $SIEMPLE_DIR/backups: the database, the settings encryption
                     key (a separate .key file) and the Wazuh manager's agents and keys, plus the
                     stored logs and Grafana's data (each service pauses for its copy)
      --no-logs        Skip the logs and Grafana (quick; this is what update takes)
  restore FILE.dump  Replace ALL current data with a backup (takes a safety backup first). The
                     encryption key, Wazuh agents, logs and Grafana are restored too when their
                     matching -settings.key, -wazuh.tar.gz and -volumes.tar.gz files are next to it
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
# The value goes through ENVIRON, not awk -v, which would turn backslashes into escapes.
set_env() {
  local key="$1" file="${3:-.env}"
  SET_ENV_VALUE="$2" awk -v k="$key" '
    BEGIN { done = 0; v = ENVIRON["SET_ENV_VALUE"] }
    $0 ~ "^" k "=" { print k "=" v; done = 1; next }
    { print }
    END { if (!done) print k "=" v }
  ' "$file" > "$file.tmp"
  cat "$file.tmp" > "$file" # keeps the file's permissions (600)
  rm -f "$file.tmp"
}

# Single-quoted, so compose reads $, # and spaces literally. A quote or line break can't be kept.
assert_quotable() {
  case "$2" in
    *"'"* | *$'\n'*) die "$1 can't contain a single quote or a line break. Set it up in Settings → Email instead." ;;
  esac
}

set_env_quoted() {
  assert_quotable "$1" "$2"
  set_env "$1" "'$2'"
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

# 32 random bytes in base64, as SETTINGS_ENCRYPTION_KEY expects.
random_key() {
  if command -v openssl > /dev/null; then
    openssl rand -base64 32
  else
    head -c 32 /dev/urandom | base64 | tr -d '\n'
  fi
}

# Reads a secret from the terminal without echoing it, even under curl | bash.
read_secret() {
  local prompt="$1" answer=''
  { exec 3<> /dev/tty; } 2> /dev/null || return 1
  printf '%s' "$prompt" >&3
  IFS= read -rs answer <&3 || true
  printf '\n' >&3
  exec 3>&-
  printf '%s' "$answer"
}

# --smtp-* flags become the read-only "env" email source. The password never goes in argv.
apply_smtp_flags() {
  local host="$1" port="$2" user="$3" from="$4" password=''
  [ -n "$host" ] || return 0
  [ -z "$port" ] || [[ "$port" =~ ^[0-9]+$ ]] || die "--smtp-port must be a number."
  if [ -n "$user" ]; then
    password="${SIEMPLE_SMTP_PASSWORD:-}"
    if [ -z "$password" ]; then
      password="$(read_secret "SMTP password for $user: ")" \
        || die "No terminal to ask for the SMTP password; set SIEMPLE_SMTP_PASSWORD instead."
    fi
    [ -n "$password" ] || die "The SMTP password is empty."
  fi
  # Checked before anything is written, so a refusal leaves .env as it was.
  assert_quotable SMTP_PASSWORD "$password"
  assert_quotable SMTP_FROM "$from"
  set_env SMTP_HOST "$host"
  set_env SMTP_PORT "${port:-587}"
  set_env SMTP_USER "$user"
  set_env_quoted SMTP_PASSWORD "$password"
  set_env_quoted SMTP_FROM "$from"
  ok "Email set to $host (SMTP_* in $SIEMPLE_DIR/.env; shown read-only in Settings → Email)"
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

# Services that aren't up yet: not healthy, or (without a healthcheck) not running. The one-shot
# migrate job counts as up once it has exited 0.
services_not_up() {
  # "|", not spaces: read would collapse the empty Health of a service without a healthcheck.
  compose ps -a --format '{{.Service}}|{{.State}}|{{.Health}}|{{.ExitCode}}' | while IFS='|' read -r service state health code; do
    case "$service" in
      migrate) [ "$state" = exited ] && [ "$code" = 0 ] && continue ;;
      *)
        if [ -n "$health" ]; then [ "$health" = healthy ] && continue
        else [ "$state" = running ] && continue
        fi
        ;;
    esac
    printf '%s\n' "$service"
  done
}

start_stack() {
  info "Starting SIEMple (the first start can take a minute)..."
  if compose up -d --wait --wait-timeout "${SIEMPLE_START_TIMEOUT:-240}" --remove-orphans; then
    return 0
  fi
  # Grafana's first start runs its database migrations, which can outlast the wait on a slow disk.
  # SIEMple itself works without it, so only Grafana still starting isn't a failed install.
  local pending
  pending="$(services_not_up | tr '\n' ' ' | sed 's/ $//')"
  if [ "$pending" = grafana ]; then
    if [ "$(compose ps --format '{{.Health}}' grafana)" = starting ]; then
      warn "Grafana is still finishing its first start (it can take a few minutes); SIEMple itself is up."
      warn "Check it later with: $SIEMPLE_DIR/install.sh status"
    else
      warn "Grafana isn't healthy, but SIEMple itself is up. See: cd $SIEMPLE_DIR && docker compose logs grafana"
    fi
    return 0
  fi
  warn "SIEMple didn't become healthy${pending:+ (not up: $pending)}. Recent logs:"
  compose ps -a >&2 || true
  compose logs --tail 30 migrate api web grafana caddy >&2 2>/dev/null || true
  die "Start failed. Fix the problem above, then run: $SIEMPLE_DIR/install.sh update"
}

# Compose doesn't recreate a service when only its inline config changes, so an update recreates
# the services that have one. Their data lives in volumes.
recreate_config_services() {
  local services="loki alloy wazuh-manager"
  case "$(get_env COMPOSE_PROFILES)" in
    *https*) services="$services caddy" ;;
  esac
  # shellcheck disable=SC2086 # a list of service names
  compose up -d --no-deps --force-recreate $services > /dev/null
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
  # Never replaced once set: it decrypts the SMTP password saved in Settings → Email.
  if [ -z "$(get_env SETTINGS_ENCRYPTION_KEY)" ]; then
    set_env SETTINGS_ENCRYPTION_KEY "$(random_key)"
    ok "Generated the settings encryption key (SETTINGS_ENCRYPTION_KEY in $SIEMPLE_DIR/.env)"
  fi
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
  local version='' port='' url='' domain='' smtp_host='' smtp_port='' smtp_user='' smtp_from=''
  while [ $# -gt 0 ]; do
    case "$1" in
      --version) version="${2:?--version needs a value}"; shift 2 ;;
      --port)    port="${2:?--port needs a value}"; shift 2 ;;
      --url)     url="${2:?--url needs a value}"; shift 2 ;;
      --domain)  domain="${2:?--domain needs a value}"; shift 2 ;;
      --smtp-host) smtp_host="${2:?--smtp-host needs a value}"; shift 2 ;;
      --smtp-port) smtp_port="${2:?--smtp-port needs a value}"; shift 2 ;;
      --smtp-user) smtp_user="${2:?--smtp-user needs a value}"; shift 2 ;;
      --smtp-from) smtp_from="${2:?--smtp-from needs a value}"; shift 2 ;;
      --smtp-password*) die "Don't pass the SMTP password as an option (it would show in ps and shell history). You'll be asked for it, or set SIEMPLE_SMTP_PASSWORD." ;;
      *) die "Unknown option for install: $1" ;;
    esac
  done
  [ -n "$smtp_host" ] || [ -z "$smtp_port$smtp_user$smtp_from" ] || die "--smtp-port, --smtp-user and --smtp-from need --smtp-host."
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
  apply_smtp_flags "$smtp_host" "$smtp_port" "$smtp_user" "$smtp_from"

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
  # The new release's own script finishes the update, so its settings and start logic apply.
  exec bash "$SIEMPLE_DIR/install.sh" finish-update "$tag"
}

cmd_finish_update() {
  local tag="${1:?finish-update needs a release tag}"
  require_install
  set_env SIEMPLE_VERSION "${tag#v}"
  add_missing_settings
  compose config --quiet || die "The new docker-compose.yml doesn't accept this .env (see above)."

  info "Downloading images..."
  compose pull --quiet
  recreate_config_services
  start_stack
  ok "SIEMple is now on ${tag#v}"
  docker image prune -f > /dev/null 2>&1 || true
}

# Agent registrations and keys (etc, queue), the API users and certificates, and agent groups.
WAZUH_STATE="var/ossec/etc var/ossec/queue var/ossec/api/configuration var/ossec/var/multigroups"

with_wazuh_volumes() {
  local manager image
  manager="$(compose ps -aq wazuh-manager)"
  [ -n "$manager" ] || die "The Wazuh manager isn't installed; start SIEMple first."
  image="$(docker inspect -f '{{.Config.Image}}' "$manager")"
  docker run --rm --user 0 --entrypoint sh --volumes-from "$manager" \
    -v "$SIEMPLE_DIR/backups:/backup" "$image" -c "$1"
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

  # Separate from the dump, so the dump alone can't decrypt the SMTP password. Store it apart.
  local key
  key="$(get_env SETTINGS_ENCRYPTION_KEY)"
  if [ -n "$key" ]; then
    (umask 077 && printf '%s\n' "$key" > "backups/siemple-$stamp-settings.key")
    ok "Settings encryption key saved to backups/siemple-$stamp-settings.key (keep it apart from the dump)"
  fi

  # Always: without it every agent has to enroll again. Agents reconnect after the short stop.
  local wazuh="siemple-$stamp-wazuh.tar.gz"
  info "Backing up the Wazuh manager's agents and keys to $SIEMPLE_DIR/backups/$wazuh"
  compose stop wazuh-manager > /dev/null
  if ! with_wazuh_volumes "umask 077 && tar czf '/backup/$wazuh' --numeric-owner --exclude='var/ossec/queue/sockets/*' -C / $WAZUH_STATE"; then
    rm -f "backups/$wazuh"
    compose start wazuh-manager > /dev/null
    die "Copying the Wazuh data failed (the database backup above is fine)."
  fi
  compose start wazuh-manager > /dev/null
  ok "Wazuh agents and keys saved ($(du -h "backups/$wazuh" | cut -f1))"

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
  local wazuh="${file%.dump}-wazuh.tar.gz"
  [ -f "$wazuh" ] || wazuh=''
  local key_file="${file%.dump}-settings.key"
  [ -f "$key_file" ] || key_file=''

  if [ "$yes" = 0 ]; then
    warn "This replaces ALL current SIEMple data with the contents of $file."
    if [ -n "$wazuh" ]; then
      warn "Wazuh agent registrations and keys are replaced from $wazuh."
    else
      warn "No matching -wazuh.tar.gz: the Wazuh manager keeps its current agents."
    fi
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
  if [ -n "$wazuh" ]; then
    info "Restoring the Wazuh manager's agents and keys from $wazuh"
    compose stop wazuh-manager > /dev/null
    local wazuh_name dir wipe=''
    wazuh_name="$(basename "$wazuh")"
    if [ "$(dirname "$wazuh")" != "$SIEMPLE_DIR/backups" ]; then
      wazuh_name="restore-wazuh.tar.gz"
      cp "$wazuh" "backups/$wazuh_name"
    fi
    for dir in $WAZUH_STATE; do wipe="$wipe /$dir/*"; done
    with_wazuh_volumes "rm -rf $wipe && tar xzf '/backup/$wazuh_name' --numeric-owner -C /" \
      || warn "Restoring the Wazuh data failed; the database was restored. See the error above."
    rm -f "backups/restore-wazuh.tar.gz"
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
  if [ -n "$key_file" ]; then
    local backup_key
    backup_key="$(head -n1 "$key_file")"
    if [ -n "$backup_key" ] && [ "$backup_key" != "$(get_env SETTINGS_ENCRYPTION_KEY)" ]; then
      set_env SETTINGS_ENCRYPTION_KEY "$backup_key"
      ok "Restored SETTINGS_ENCRYPTION_KEY from $key_file, so the saved SMTP password still works"
    fi
  else
    warn "No matching -settings.key: if this backup came from another server, enter the SMTP password again in Settings → Email."
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
    finish-update) cmd_finish_update "$@" ;; # internal: the second half of update
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
