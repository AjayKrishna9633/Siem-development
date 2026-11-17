#!/usr/bin/env bash
# SIEMple installer and maintenance tool.
#
# Install (Linux host with Docker):
#   curl -fsSL https://github.com/AjayKrishna9633/Siem-development/releases/latest/download/install.sh | sudo bash
#
# The install keeps a copy of this script, so later:
#   sudo /opt/siemple/install.sh status | update | backup | restore <file> | token | uninstall
#
# Run with `help` for every command and option.

set -euo pipefail

# ── Settings ────────────────────────────────────────────────────────────────
# The one place the GitHub repository is named; every download URL is built from it.
REPO="AjayKrishna9633/Siem-development"
SIEMPLE_DIR="${SIEMPLE_DIR:-/opt/siemple}"
# Overrides where release files are downloaded from (a mirror, or a local folder as file:///...
# for testing). Default: the GitHub release for the chosen version.
SIEMPLE_ASSETS_URL="${SIEMPLE_ASSETS_URL:-}"
# Compose 2.23.1 added inline `configs: content:`, which holds the Caddy config.
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
  backup             Save a database backup to $SIEMPLE_DIR/backups
  restore FILE       Replace ALL current data with a backup (takes a safety backup first)
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

# Reads an answer from the terminal even when the script itself arrives on stdin (curl | bash).
confirm() {
  local prompt="$1" expected="$2" answer=''
  # /dev/tty can exist without a terminal behind it (cron, CI), so test by opening it.
  { exec 3<> /dev/tty; } 2> /dev/null || die "No terminal to confirm on; re-run with --yes."
  printf '%s' "$prompt" >&3
  read -r answer <&3 || true
  exec 3>&-
  [ "$answer" = "$expected" ]
}

# ── Checks ──────────────────────────────────────────────────────────────────
# Succeeds when version $1 >= $2 (dotted numbers).
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

# Every command except install runs against an existing install.
require_install() {
  [ -f "$SIEMPLE_DIR/docker-compose.yml" ] && [ -f "$SIEMPLE_DIR/.env" ] \
    || die "No SIEMple install found in $SIEMPLE_DIR (set SIEMPLE_DIR if it's elsewhere)."
  cd "$SIEMPLE_DIR"
}

compose() { docker compose "$@"; }

# ── .env helpers ────────────────────────────────────────────────────────────
# Sets KEY=VALUE in .env, replacing the existing line or appending one. awk, not sed, so values
# with / or & need no escaping.
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

# Hex only: the passwords are placed inside connection URLs.
random_secret() {
  if command -v openssl > /dev/null; then
    openssl rand -hex "$1"
  else
    head -c "$1" /dev/urandom | od -An -tx1 | tr -d ' \n'
  fi
}

# The address other machines on the network most likely use to reach this one.
detect_ip() {
  local ip=''
  if command -v ip > /dev/null; then
    ip="$(ip -4 route get 1.1.1.1 2>/dev/null | sed -n 's/.* src \([0-9.]*\).*/\1/p' | head -n1)"
  fi
  [ -n "$ip" ] || ip="$(hostname -I 2>/dev/null | awk '{print $1}')"
  printf '%s' "${ip:-localhost}"
}

# ── Releases ────────────────────────────────────────────────────────────────
# Prints the tag (e.g. v1.2.0) for a version, or of the latest release. GitHub redirects
# /releases/latest to /releases/tag/<tag>, which avoids the rate-limited API.
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

# Downloads release file $1 (for tag $2) to path $3.
download() {
  local name="$1" tag="$2" dest="$3" base
  base="${SIEMPLE_ASSETS_URL:-https://github.com/$REPO/releases/download/$tag}"
  curl -fsSL "$base/$name" -o "$dest" || die "Download failed: $base/$name"
}

# Fetches the release's compose file, settings template and this script into the current folder.
# GitHub renames uploads that start with a dot, so the template is published as env.example.
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

# Waits for every service to be healthy. On failure, shows the likely culprit's logs.
start_stack() {
  info "Starting SIEMple (the first start can take a minute)..."
  if ! compose up -d --wait --remove-orphans; then
    warn "SIEMple didn't become healthy. Recent logs:"
    compose ps -a >&2 || true
    compose logs --tail 30 migrate api web caddy >&2 2>/dev/null || true
    die "Start failed. Fix the problem above, then run: $SIEMPLE_DIR/install.sh update"
  fi
}

# Asks the app itself rather than searching the logs: a container that wasn't recreated still
# has the token from before setup in its log. The command issues a fresh token (replacing the one
# printed at start) or says setup is already complete.
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
    # Re-running install must never replace existing secrets: the database was created with them.
    ok "Keeping the existing .env (secrets and settings unchanged)"
    [ -z "$port$url$domain" ] || warn "--port, --url and --domain only apply to a new install; edit $SIEMPLE_DIR/.env to change them."
  else
    # Settings hold secrets: readable by the owner only.
    (umask 077 && cp .env.example .env)
    set_env POSTGRES_PASSWORD "$(random_secret 24)"
    set_env REDIS_PASSWORD "$(random_secret 24)"
    set_env JWT_SECRET "$(random_secret 32)"
    if [ -n "$domain" ]; then
      set_env COMPOSE_PROFILES https
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

  info "Downloading images..."
  compose pull --quiet
  start_stack
  ok "SIEMple ${tag} is running at $(get_env APP_URL)"
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

  [ "$backup" = 0 ] || cmd_backup

  # The previous compose file is kept, so a failed update can be rolled back by hand.
  cp docker-compose.yml docker-compose.yml.previous
  fetch_release_files "$tag"
  set_env SIEMPLE_VERSION "${tag#v}"
  # A release may add settings with safe defaults; existing values are never touched.
  compose config --quiet || die "The new docker-compose.yml doesn't accept this .env (see above)."

  info "Downloading images..."
  compose pull --quiet
  # Migrations for the new version run first; the api starts only if they succeed.
  start_stack
  ok "SIEMple is now on ${tag#v}"
  docker image prune -f > /dev/null 2>&1 || true
}

cmd_backup() {
  require_install
  local user db file
  user="$(get_env POSTGRES_USER)"; user="${user:-siemple}"
  db="$(get_env POSTGRES_DB)"; db="${db:-siemple}"
  mkdir -p backups
  chmod 700 backups
  file="backups/siemple-$(date +%Y%m%d-%H%M%S).dump"
  info "Backing up the database to $SIEMPLE_DIR/$file"
  # Custom format: compressed, and restorable with pg_restore --clean into an existing database.
  # Written owner-only, since it holds every account and audit record.
  if ! (umask 077 && compose exec -T postgres pg_dump -U "$user" -d "$db" --format=custom > "$file"); then
    rm -f "$file"
    die "Backup failed. Is the postgres container running? (install.sh status)"
  fi
  ok "Backup saved ($(du -h "$file" | cut -f1)). Copy it somewhere off this machine too."
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
  # Resolve the path before changing into the install folder.
  [ -f "$file" ] || die "Backup file not found: $file"
  file="$(cd "$(dirname "$file")" && pwd)/$(basename "$file")"
  require_install

  if [ "$yes" = 0 ]; then
    warn "This replaces ALL current SIEMple data with the contents of $file."
    confirm "Type 'restore' to continue: " restore || die "Cancelled."
  fi

  # A safety net in case the wrong file was chosen.
  cmd_backup
  local user db
  user="$(get_env POSTGRES_USER)"; user="${user:-siemple}"
  db="$(get_env POSTGRES_DB)"; db="${db:-siemple}"

  info "Stopping the app so nothing writes during the restore..."
  compose stop web api
  info "Restoring $file"
  # --clean drops each object before recreating it; one transaction, so a failed restore leaves
  # the current data untouched.
  if ! compose exec -T postgres pg_restore -U "$user" -d "$db" --clean --if-exists --no-owner \
      --single-transaction --exit-on-error < "$file"; then
    warn "Restore failed; the database was left as it was. Restarting the app..."
    start_stack
    die "Restore failed (see the error above)."
  fi
  # Starting the stack runs migrations, so a backup from an older version is brought up to date.
  start_stack
  ok "Restore complete."
}

cmd_status() {
  require_install
  echo "Install folder: $SIEMPLE_DIR"
  echo "Version:        $(get_env SIEMPLE_VERSION)"
  echo "Address:        $(get_env APP_URL)"
  echo
  compose ps -a --format 'table {{.Service}}\t{{.State}}\t{{.Status}}\t{{.Ports}}'
  echo
  echo "Logs: cd $SIEMPLE_DIR && docker compose logs -f api"
}

cmd_token() {
  require_install
  # Runs inside the running api container, with the same settings. It replaces any earlier token.
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
    warn "This permanently deletes the SIEMple database, certificates, images and settings (.env)."
    [ -d backups ] && warn "Backups in $SIEMPLE_DIR/backups are kept."
    confirm "Type 'delete' to continue: " delete || die "Cancelled."
  fi
  # -v removes the named volumes (database, Redis, certificates); --rmi all removes the images.
  compose --profile https down --volumes --rmi all --remove-orphans
  rm -f docker-compose.yml docker-compose.yml.previous .env .env.example install.sh
  cd /
  # Removes the folder only if nothing (like backups/) is left in it.
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
