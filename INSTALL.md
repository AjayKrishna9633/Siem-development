# Installing SIEMple

SIEMple runs as a set of Docker containers on one Linux server. A single command installs it, and the same script handles updates, backups and restores afterwards.

To use a Windows, Mac or Linux PC as the server instead, built from the source code (this also works before any release is published), see [Running on your own PC](#running-on-your-own-pc-windows-mac-or-linux).

- [Requirements](#requirements)
- [Install](#install)
- [Running on your own PC](#running-on-your-own-pc-windows-mac-or-linux)
- [First-time setup](#first-time-setup)
- [HTTPS](#https)
- [Everyday tasks](#everyday-tasks)
- [Updating](#updating)
- [Backups and restore](#backups-and-restore)
- [Settings](#settings)
- [Installing without the script](#installing-without-the-script)
- [Uninstalling](#uninstalling)
- [Troubleshooting](#troubleshooting)
- [Security notes](#security-notes)

## Requirements

| What    | Minimum                                                                                                                         |
| ------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Server  | Linux, x86-64 or ARM64 (for example a Raspberry Pi 4/5 or an ARM cloud server)                                                  |
| Memory  | 2 GB RAM                                                                                                                        |
| Disk    | 5 GB free, plus room for the database to grow                                                                                   |
| Docker  | [Docker Engine](https://docs.docker.com/engine/install/) with the Compose plugin **2.23.1 or newer** (`docker compose version`) |
| Network | One free port for the web interface (80 by default); ports 80 and 443 for HTTPS                                                 |

Docker isn't installed for you. On most distributions `curl -fsSL https://get.docker.com | sh` installs both Docker and the Compose plugin.

## Install

```bash
curl -fsSL https://github.com/AjayKrishna9633/Siem-development/releases/latest/download/install.sh | sudo bash
```

To read the script before running it:

```bash
curl -fsSLO https://github.com/AjayKrishna9633/Siem-development/releases/latest/download/install.sh
less install.sh
sudo bash install.sh
```

The installer:

1. checks that Docker and Compose are present and recent enough;
2. downloads the release's `docker-compose.yml` and settings template into `/opt/siemple`;
3. creates `/opt/siemple/.env` with newly generated passwords and secrets (readable by root only);
4. downloads the images and starts the containers, waiting until every one reports healthy;
5. prints the address to open and a **setup token**.

Options go after `bash -s --` when piping, or after `install.sh` when running a downloaded copy:

```bash
curl -fsSL .../install.sh | sudo bash -s -- --port 8080
```

| Option          | Effect                                                                                        |
| --------------- | --------------------------------------------------------------------------------------------- |
| `--port N`      | Serve on port N instead of 80                                                                 |
| `--url URL`     | The address people will use, if it isn't `http://<server IP>` (for example `http://siem.lan`) |
| `--domain NAME` | Serve HTTPS at NAME with a free Let's Encrypt certificate (see [HTTPS](#https))               |
| `--version X`   | Install release X (for example `1.2.0`) instead of the latest                                 |

To install somewhere other than `/opt/siemple`, set `SIEMPLE_DIR`, for example `curl ... | SIEMPLE_DIR=$HOME/siemple bash` (without `sudo`, your user must be in the `docker` group).

Running the installer again is safe: it keeps the existing `.env`, so passwords and data are untouched.

## First-time setup

1. Open the address the installer printed.
2. Enter the setup token. It proves you have access to the server, so only the person who installed SIEMple can create the first administrator.
3. Fill in the organization name, the address people will use to reach SIEMple (it goes into invitation and password-reset links), and the first administrator's account.

The token is valid for 24 hours. Until setup is complete, a new token is issued every time SIEMple starts, and any earlier one stops working. To get a fresh token at any time:

```bash
sudo /opt/siemple/install.sh token
```

## HTTPS

### With a public domain name

Point the domain's DNS at the server, make sure ports 80 and 443 are reachable from the internet, then install with:

```bash
curl -fsSL .../install.sh | sudo bash -s -- --domain siem.example.com
```

A [Caddy](https://caddyserver.com/) container takes ports 80 and 443, obtains and renews the certificate automatically, and redirects plain HTTP to HTTPS.

### Turning HTTPS on later

Edit `/opt/siemple/.env` and set these six values together:

```ini
COMPOSE_PROFILES=https
DOMAIN=siem.example.com
APP_URL=https://siem.example.com
TRUSTED_PROXY=caddy
WEB_BIND=127.0.0.1
WEB_PORT=8080
```

Then apply them:

```bash
cd /opt/siemple && sudo docker compose up -d
```

Invitation and password-reset links use the address entered during first-time setup, which can't be changed from the interface yet. If you set up SIEMple over plain HTTP, those links keep pointing at the `http://` address until that's possible.

### On a private network

For an IP address or a name that only resolves on your network, Let's Encrypt can't issue a certificate. Caddy then uses its own local certificate authority instead, and browsers warn until that authority is trusted on each computer. Plain HTTP on a trusted network, or a reverse proxy you already run, are the alternatives.

> Only set `APP_URL` to `https://...` when SIEMple really is served over HTTPS. Sign-in cookies are then marked Secure, and a browser on a plain `http://` address drops them: everyone is signed out on every page reload.

## Everyday tasks

The installer keeps a copy of itself in the install folder:

| Task                           | Command                                                                                          |
| ------------------------------ | ------------------------------------------------------------------------------------------------ |
| See what's running             | `sudo /opt/siemple/install.sh status`                                                            |
| Follow the application log     | `cd /opt/siemple && sudo docker compose logs -f api`                                             |
| Get a new setup token          | `sudo /opt/siemple/install.sh token`                                                             |
| Back up the database           | `sudo /opt/siemple/install.sh backup`                                                            |
| Update                         | `sudo /opt/siemple/install.sh update`                                                            |
| Stop SIEMple                   | `cd /opt/siemple && sudo docker compose stop`                                                    |
| Start it again                 | `cd /opt/siemple && sudo docker compose up -d`                                                   |
| An administrator is locked out | `cd /opt/siemple && sudo docker compose exec api node dist/cli/reset-admin.js admin@example.com` |

The last one prints a password-reset link for that administrator, valid for 30 minutes and usable once.

SIEMple starts automatically when the server boots, as long as Docker does (`sudo systemctl enable docker`).

## Updating

```bash
sudo /opt/siemple/install.sh update                  # the latest release
sudo /opt/siemple/install.sh update --version 1.3.0  # a specific release
```

An update backs up the database first, downloads the new release's compose file, pulls the new images, and restarts. Database migrations for the new version run before the application starts; if one fails, the application isn't started, so it never runs against a half-upgraded database.

Each install is pinned to a version (`SIEMPLE_VERSION` in `.env`) and only changes when you run `update`.

**Going back to the previous version:** the update keeps the old compose file as `docker-compose.yml.previous`. Migrations aren't guaranteed to be reversible, so restore the backup taken before the update as well:

```bash
cd /opt/siemple
sudo cp docker-compose.yml.previous docker-compose.yml
sudo sed -i 's/^SIEMPLE_VERSION=.*/SIEMPLE_VERSION=1.2.0/' .env   # the version you came from
sudo ./install.sh restore backups/siemple-<date of the update>.dump
```

## Backups and restore

```bash
sudo /opt/siemple/install.sh backup
```

This writes a compressed dump of the whole database to `/opt/siemple/backups/siemple-<date>-<time>.dump`. It holds every account, password hash, setting and audit record, so it's readable by root only. Copy backups to another machine regularly: a backup on the same disk doesn't survive that disk failing.

To run a backup every night at 02:00, add a line to root's crontab (`sudo crontab -e`):

```cron
0 2 * * * /opt/siemple/install.sh backup >> /var/log/siemple-backup.log 2>&1
```

Old backups aren't deleted automatically.

To restore:

```bash
sudo /opt/siemple/install.sh restore /opt/siemple/backups/siemple-20261117-020000.dump
```

This **replaces all current data** with the backup, after you confirm by typing `restore` (add `--yes` to skip the question in scripts). It takes a safety backup of the current data first, stops the application during the restore, and restores in a single transaction: if anything fails, the current data is left as it was. A backup from an older version is migrated forward when the application starts.

**Moving to a new server:** install SIEMple there, copy the backup across, and restore it. The new install's own passwords and secrets are fine; everyone just signs in again.

## Settings

All settings live in `/opt/siemple/.env`. Every one is described in that file (the template is [.env.example](.env.example)). After changing it, apply the change with:

```bash
cd /opt/siemple && sudo docker compose up -d
```

Settings you're most likely to change:

| Setting                                                             | What it does                                                                                                     |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `APP_URL`                                                           | The address people open. Starting with `https://` makes sign-in cookies Secure.                                  |
| `WEB_PORT`, `WEB_BIND`                                              | The port and network interface SIEMple listens on                                                                |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` | Email for invitations and password resets. Without `SMTP_HOST`, administrators get the links to pass on by hand. |
| `LOG_LEVEL`                                                         | `debug` for more detail, `warn` for less                                                                         |

Don't change `POSTGRES_PASSWORD`, `POSTGRES_USER` or `POSTGRES_DB` after the first start: the database was created with them. Changing `JWT_SECRET` signs everyone out.

## Installing without the script

1. Create a folder and download the release files into it. `env.example` is saved as `.env`:

   ```bash
   mkdir -p /opt/siemple && cd /opt/siemple
   base=https://github.com/AjayKrishna9633/Siem-development/releases/latest/download
   curl -fsSLO $base/docker-compose.yml
   curl -fsSL $base/env.example -o .env
   chmod 600 .env
   ```

2. Fill in the three required values in `.env` (generate each with `openssl rand -hex 32`): `POSTGRES_PASSWORD`, `REDIS_PASSWORD`, `JWT_SECRET`. Set `APP_URL` to the address people will use.
3. Start SIEMple, then read the setup token from the log:

   ```bash
   docker compose up -d --wait
   docker compose logs api | grep "setup token"
   ```

## Running on your own PC (Windows, Mac or Linux)

This turns any computer with Docker into the SIEMple server for your network, built from the source code. It doesn't need a published release, and it works on Windows and Mac, where `install.sh` doesn't run. Every command below works in PowerShell, Command Prompt and Linux or Mac terminals unless it says otherwise, and runs from the project folder.

### 1. Prepare the server PC

- Install [Git](https://git-scm.com/downloads) and [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows or Mac) or [Docker Engine](https://docs.docker.com/engine/install/) (Linux). Docker Desktop is free for personal use, education and small businesses; larger companies need a paid subscription.
- **Start Docker automatically.** Docker Desktop: Settings → General → turn on _Start Docker Desktop when you sign in_. Linux: `sudo systemctl enable docker`.
- **Give the PC a fixed address on your network.** In your router's settings, reserve its current IP address for it (often called a DHCP reservation). The address goes into the invitation and password-reset links SIEMple sends, and those can't be changed after setup yet, so it mustn't change.
- **Stop it sleeping.** Windows: Settings → System → Power → set sleep to _Never_ when plugged in. Mac: System Settings → Energy → turn on _Prevent automatic sleeping_.

Find the PC's address with `ipconfig` (Windows, the _IPv4 Address_ line), `ipconfig getifaddr en0` (Mac) or `hostname -I` (Linux). The examples below use `192.168.1.20`.

### 2. Get the code

```bash
git clone https://github.com/AjayKrishna9633/Siem-development.git
cd Siem-development
git checkout feat/docker
```

`git checkout feat/docker` is needed only until the Docker files are merged into `main`.

### 3. Create the settings file

Copy the template: `copy .env.example .env` on Windows, `cp .env.example .env` on Linux or Mac. Then open `.env` in a text editor and set:

```ini
POSTGRES_PASSWORD=<random letters and digits>
REDIS_PASSWORD=<random letters and digits>
JWT_SECRET=<random letters and digits, at least 32>
APP_URL=http://192.168.1.20
```

Generate each secret with:

- **Windows (PowerShell):** `-join ((1..32) | % { '{0:x2}' -f (Get-Random -Max 256) })`
- **Linux or Mac:** `openssl rand -hex 32`

If port 80 is already taken on this PC (by IIS or another web server, for example), also set `WEB_PORT=8080` and add `:8080` to `APP_URL`.

### 4. Build and start SIEMple

```bash
docker compose up -d --build --wait
```

The first build takes a few minutes. When the command returns, every container is healthy. Get the setup token:

```bash
docker compose exec api node dist/cli/setup-token.js
```

This prints a fresh token (any earlier one stops working). Open `http://localhost` on the server, enter the token, and when asked for the address people will use, enter your `APP_URL` (`http://192.168.1.20`).

### 5. Let other computers connect

Allow the web port through the server's firewall:

- **Windows:** in PowerShell opened as Administrator:

  ```powershell
  New-NetFirewallRule -DisplayName "SIEMple" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow -Profile Private
  ```

  Your network must be set to _Private_ (Settings → Network & internet → your connection → _Private network_). Use your `WEB_PORT` if you changed it.

- **Mac:** System Settings → Network → Firewall → Options: allow incoming connections for Docker.
- **Linux:** `sudo ufw allow 80/tcp` (if `ufw` is active).

Then open `http://192.168.1.20` from any computer on the same network.

### 6. Day-to-day commands

| Task                           | Command                                                                          |
| ------------------------------ | -------------------------------------------------------------------------------- |
| See what's running             | `docker compose ps`                                                              |
| Follow the application log     | `docker compose logs -f api`                                                     |
| Stop SIEMple                   | `docker compose stop`                                                            |
| Start it again                 | `docker compose up -d`                                                           |
| Get a new setup token          | `docker compose exec api node dist/cli/setup-token.js`                           |
| An administrator is locked out | `docker compose exec api node dist/cli/reset-admin.js admin@example.com`         |
| Update to the latest code      | Back up first (below), then `git pull` and `docker compose up -d --build --wait` |

SIEMple restarts by itself whenever Docker starts. On Windows and Mac, Docker Desktop only runs while someone is signed in to the PC, so after a reboot someone has to sign in before SIEMple is back. For a server that must always be up, Linux is the better choice.

An update runs any new database migrations before the application starts.

### 7. Back up and restore

Back up (the dump is made inside the container and copied out, which keeps the file intact on Windows too):

```bash
mkdir backups
docker compose exec -T postgres pg_dump -U siemple -d siemple --format=custom -f /tmp/siemple.dump
docker compose cp postgres:/tmp/siemple.dump backups/siemple-2026-11-18.dump
```

Use a new file name each time, and copy backups to another machine. Don't redirect the output with `>` instead: Windows PowerShell rewrites it as text and the backup can't be restored.

Restore, which **replaces all current data** with the backup:

```bash
docker compose stop api web
docker compose cp backups/siemple-2026-11-18.dump postgres:/tmp/restore.dump
docker compose exec -T postgres pg_restore -U siemple -d siemple --clean --if-exists --no-owner --single-transaction /tmp/restore.dump
docker compose up -d --wait
```

The restore runs in one transaction: if it fails, the current data is left as it was.

## Uninstalling

```bash
sudo /opt/siemple/install.sh uninstall           # stop and remove the containers; data and settings stay
sudo /opt/siemple/install.sh uninstall --purge   # also delete the database, certificates, images and .env
```

`--purge` asks you to type `delete` first. Backups in `/opt/siemple/backups` are always kept.

## Troubleshooting

**`port is already allocated` while starting.** Something else uses port 80 (often another web server). Pick another port: set `WEB_PORT=8080` in `.env` and run `docker compose up -d`, or reinstall with `--port 8080`.

**The installer says SIEMple didn't become healthy.** It shows the recent logs of the services that failed. The application log usually names the problem:

```bash
cd /opt/siemple && sudo docker compose ps -a && sudo docker compose logs --tail 50 migrate api
```

**"Can't talk to Docker".** Docker isn't running (`sudo systemctl start docker`), or the script isn't running as root or as a member of the `docker` group.

**Everyone is signed out whenever the page reloads.** `APP_URL` starts with `https://`, but SIEMple is being opened over plain `http://`. Make the two match.

**The page doesn't load from other computers.** Check the server's firewall allows the web port (for example `sudo ufw allow 80/tcp`), and that `WEB_BIND` isn't `127.0.0.1` in plain HTTP mode.

**The setup token doesn't work.** A newer one was issued when SIEMple restarted. Run `sudo /opt/siemple/install.sh token` and use the token it prints.

## Security notes

- Only the web port (or ports 80 and 443 with HTTPS) is published. The database, Redis and the API are reachable only from inside Docker's private network.
- `.env` holds every secret and is readable by root only. Don't copy it anywhere it could be read by others.
- Backups contain everything SIEMple stores. Keep them as protected as the server.
- The containers run with reduced privileges: the API runs as an unprivileged user on a read-only filesystem.
- Install updates when they're released: `sudo /opt/siemple/install.sh update`.
