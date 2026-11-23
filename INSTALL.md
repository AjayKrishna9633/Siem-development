# Installing SIEMple

SIEMple runs as a set of Docker containers on one Linux server. A single command installs it, and the same script handles updates, backups and restores afterwards.

To use a Windows, Mac or Linux PC as the server instead, built from the source code (this also works before any release is published), see [Running on your own PC](#running-on-your-own-pc-windows-mac-or-linux).

- [Requirements](#requirements)
- [Install](#install)
- [Running on your own PC](#running-on-your-own-pc-windows-mac-or-linux)
- [First-time setup](#first-time-setup)
- [Email](#email)
- [SIEMple health (Grafana)](#siemple-health-grafana)
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
| Disk    | 5 GB free, plus room for the database and SIEMple's own logs to grow (logs are kept 14 days by default)                         |
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
3. creates `/opt/siemple/.env` with newly generated passwords and secrets (readable by root only), including `SETTINGS_ENCRYPTION_KEY`, which protects the email password you save in SIEMple;
4. downloads the images and starts the containers, waiting until every one reports healthy;
5. prints the address to open, where to find the SIEMple Health dashboard (Grafana) and a **setup token**.

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
| `--smtp-host H` | Send email through mail server H (optional: email can also be set up later in the web UI)     |
| `--smtp-port N` | The mail server's port (587 by default)                                                       |
| `--smtp-user U` | The mail account; you're asked for its password (see [Email](#email))                         |
| `--smtp-from A` | The sender, for example `"SIEMple <siem@example.com>"` (the account address by default)       |

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

## Email

SIEMple emails invitations, password-reset links and security notices. Without email it still works: administrators get each link on screen to copy and send themselves.

### Set it up in SIEMple (recommended)

1. Sign in as an administrator and open **Settings → Email**.
2. Pick a provider (**Gmail**, **Microsoft 365** or **Custom**). The preset fills in the server, port and security; for Custom, enter your mail server's details.
3. Enter the account's username and password, and the sender name and address, then **Save**. It takes effect straight away; there's nothing to restart.
4. **Send test email**, to yourself or another address. A failure names the likely cause (see the table below).

The password is stored encrypted with `SETTINGS_ENCRYPTION_KEY` from `.env` and is never shown again: the page only says that one is saved, and **Change** replaces it. Every change is recorded in the audit log (which fields changed, never their values), and so is every test email. **Disable email** turns it off and deletes the saved password.

If the page says **Encryption key not configured**, `.env` has no `SETTINGS_ENCRYPTION_KEY` (an install from before email settings existed that hasn't been updated yet). `sudo /opt/siemple/install.sh update` adds one, or add `SETTINGS_ENCRYPTION_KEY=` with the output of `openssl rand -base64 32` and run `cd /opt/siemple && sudo docker compose up -d`.

### Set it up in .env (automated installs)

Pass the mail server to the installer:

```bash
curl -fsSL .../install.sh | sudo bash -s -- --smtp-host smtp.example.com --smtp-user siem@example.com --smtp-from "SIEMple <siem@example.com>"
```

It asks for the password without showing it. There is deliberately no option for the password itself, because options are visible to anyone on the server (`ps`) and stay in your shell history. For a script without a terminal, put the password in `SIEMPLE_SMTP_PASSWORD` and keep it in the environment rather than on the command line, for example `sudo --preserve-env=SIEMPLE_SMTP_PASSWORD bash install.sh --smtp-host ...` with the variable exported from a file only root can read.

The installer writes `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` and `SMTP_FROM` to `.env`; you can also edit them there yourself and run `sudo docker compose up -d`. While `SMTP_HOST` is set, **Settings → Email** shows these settings read-only ("Managed by the server's .env") and can still send a test email. Remove `SMTP_HOST` to manage email in the web UI instead.

### Gmail

Gmail doesn't accept your normal password here; it needs an **App Password**:

1. Turn on 2-Step Verification for the Google account.
2. Open [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords), create an App Password named "SIEMple", and copy the 16 characters it shows.
3. In **Settings → Email**, choose **Gmail**, enter the full Gmail address as the username, paste the App Password, and use the same address as the sender.

Google Workspace accounts may need an administrator to allow App Passwords.

### Ports

| Port | Security | Used by                                                                |
| ---- | -------- | ---------------------------------------------------------------------- |
| 587  | STARTTLS | Most providers, including Gmail and Microsoft 365                      |
| 465  | TLS      | Providers that use implicit TLS                                        |
| 25   | None     | Only a relay on your own trusted network; often blocked by cloud hosts |

The server must be allowed to make outgoing connections to that port.

### When the test email fails

| What you see                                 | Likely cause                                                           | What to do                                                                                                                       |
| -------------------------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Rejected the username or password (SMTP 535) | Wrong password; Gmail without an App Password; SMTP login turned off   | Re-enter the password. For Gmail use an App Password; for Microsoft 365 an administrator must allow "Authenticated SMTP"         |
| Didn't answer in time                        | The port is blocked, or the host is wrong                              | Check the host, and that the firewall and the hosting provider allow outgoing connections on that port                           |
| Refused the connection                       | Wrong port, or the server doesn't take mail there                      | Check the port: 587 for STARTTLS, 465 for TLS                                                                                    |
| The encrypted connection failed              | Security setting and port don't match                                  | TLS goes with 465, STARTTLS with 587                                                                                             |
| Refused the From address (SMTP 550 or 553)   | The account may not send as that address                               | Use the account's own address, or an alias the provider has verified                                                             |
| Host name could not be found                 | A typo in the host, or DNS                                             | Check the spelling                                                                                                               |
| Email stopped after moving to a new server   | `SETTINGS_ENCRYPTION_KEY` changed, so the saved password can't be read | Enter the password again in Settings → Email, or restore with the backup's `-settings.key` (see [Backups](#backups-and-restore)) |

## SIEMple health (Grafana)

SIEMple collects the logs of its own containers (api, web, postgres, redis, loki, grafana, alloy) with [Alloy](https://grafana.com/oss/alloy/), keeps them in [Loki](https://grafana.com/oss/loki/) and shows them in [Grafana](https://grafana.com/oss/grafana/), which comes with the install at:

```
<your SIEMple address>/grafana/
```

This answers one question: **is SIEMple itself healthy?** It holds no security events: those come from Wazuh agents through SIEMple's own pipeline, and nothing else can send logs in. There is no ingest API, syslog receiver or remote agent, and Loki and Alloy publish no ports.

Grafana has its own sign-in, separate from SIEMple's. The user is `admin` and the password was generated during the install:

```bash
sudo grep GRAFANA_ADMIN_PASSWORD /opt/siemple/.env
```

That value is only used on Grafana's very first start. After that the password lives in Grafana: change it there (your avatar → Profile → Change password), and editing `.env` has no effect. Forgot it? Set a new one with:

```bash
cd /opt/siemple && sudo docker compose exec grafana grafana cli admin reset-admin-password '<new password>'
```

What's there:

- **Dashboards → SIEMple → SIEMple Health**: API request rate, 5xx error rate, p95 latency by route, log volume by service and the most recent errors.
- **Drilldown → Logs**: point-and-click exploring, no query language needed.
- **Explore**: write [LogQL](https://grafana.com/docs/loki/latest/query/) queries, for example `{service="api", level="error"}` or `{service="api"} | json | route="/api/users" | status >= 500`.

Every line has three labels: `service` (the container: `api`, `web`, `postgres`, …), `level` (`info`, `warn`, `error`, `fatal`) and `env`. The API's request lines are JSON with `requestId`, `method`, `route` (the route template, like `/api/users/:id`), `status` and `durationMs`. Request bodies, passwords, tokens, cookies, `Authorization` headers and the setup token never reach the logs, and health checks are left out.

The SIEMple dashboard can't be edited in place (an update would overwrite it); use **Save as** to make your own copy. Logs are deleted after 14 days; change that with `LOKI_RETENTION` (see [Settings](#settings)).

Grafana, Loki and Alloy don't contact the internet: usage reporting, update checks and plugin downloads are switched off, so they work on networks without internet access.

**How Alloy reads the logs.** Alloy reads Docker's log files from `/var/lib/docker/containers`, mounted read-only, and drops every line that doesn't belong to this SIEMple install before sending anything. It deliberately doesn't use the Docker socket, which gives full control of Docker and so root on the server. If Docker keeps its data elsewhere (snap Docker, or a custom `data-root`), set `DOCKER_CONTAINERS_DIR` in `.env`.

## HTTPS

### With a public domain name

Point the domain's DNS at the server, make sure ports 80 and 443 are reachable from the internet, then install with:

```bash
curl -fsSL .../install.sh | sudo bash -s -- --domain siem.example.com
```

A [Caddy](https://caddyserver.com/) container takes ports 80 and 443, obtains and renews the certificate automatically, and redirects plain HTTP to HTTPS.

### Turning HTTPS on later

Edit `/opt/siemple/.env` and set these values together:

```ini
COMPOSE_PROFILES=https
DOMAIN=siem.example.com
APP_URL=https://siem.example.com
TRUSTED_PROXY=caddy
WEB_BIND=127.0.0.1
WEB_PORT=8080
GRAFANA_COOKIE_SECURE=true
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
| Check SIEMple's health         | Open `<your SIEMple address>/grafana/` (see [SIEMple health](#siemple-health-grafana))           |
| Back up                        | `sudo /opt/siemple/install.sh backup`                                                            |
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

An update backs up the database first, downloads the new release's compose file, adds any setting the new release requires to `.env` (generating it if it's a password; existing values are never changed), pulls the new images, and restarts. Database migrations for the new version run before the application starts; if one fails, the application isn't started, so it never runs against a half-upgraded database.

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

This writes these files to `/opt/siemple/backups/`, all readable by root only:

- `siemple-<date>-<time>.dump`: the whole database, compressed: every account, password hash, setting and audit record.
- `siemple-<date>-<time>-settings.key`: `SETTINGS_ENCRYPTION_KEY`, which decrypts the email password saved in Settings → Email. It's a separate file so that the dump on its own can't reveal that password: **store it apart from the dumps**. Losing it only means entering the email password again; nothing else depends on it.
- `siemple-<date>-<time>-volumes.tar.gz`: the stored logs and Grafana's own data (its users and any dashboards you saved). Loki and Grafana pause for the few seconds the copy takes; Alloy sends the lines from that pause once Loki is back.

`backup --no-logs` saves only the database, which is quicker when there are many logs; updates take that kind of backup. Copy backups to another machine regularly: a backup on the same disk doesn't survive that disk failing.

To run a backup every night at 02:00, add a line to root's crontab (`sudo crontab -e`):

```cron
0 2 * * * /opt/siemple/install.sh backup >> /var/log/siemple-backup.log 2>&1
```

Old backups aren't deleted automatically.

To restore:

```bash
sudo /opt/siemple/install.sh restore /opt/siemple/backups/siemple-20261117-020000.dump
```

This **replaces all current data** with the backup, after you confirm by typing `restore` (add `--yes` to skip the question in scripts). It takes a safety backup of the current data first, stops the application during the restore, and restores the database in a single transaction: if anything fails, the current data is left as it was. A backup from an older version is migrated forward when the application starts.

When the matching `-volumes.tar.gz` sits next to the `.dump`, the stored logs and Grafana's data are replaced from it too; without it they stay as they are. Likewise a matching `-settings.key` puts that key back in `.env`, so a restored email password keeps working; without it, enter the email password again in Settings → Email.

**Moving to a new server:** install SIEMple there, copy both backup files across, and restore. The new install's own passwords and secrets are fine; everyone just signs in again. Grafana's sign-in comes from the backup, so it's the old server's Grafana password.

## Settings

All settings live in `/opt/siemple/.env`. Every one is described in that file (the template is [.env.example](.env.example)). After changing it, apply the change with:

```bash
cd /opt/siemple && sudo docker compose up -d
```

Settings you're most likely to change:

| Setting                                                             | What it does                                                                                                                                          |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `APP_URL`                                                           | The address people open. Starting with `https://` makes sign-in cookies Secure.                                                                       |
| `WEB_PORT`, `WEB_BIND`                                              | The port and network interface SIEMple listens on                                                                                                     |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` | Email from `.env`, shown read-only in Settings → Email. Leave empty to set email up in the web UI (see [Email](#email)).                              |
| `SETTINGS_ENCRYPTION_KEY`                                           | Encrypts the email password saved in Settings → Email. Created by the installer; don't change it (the email password would have to be entered again). |
| `LOG_LEVEL`                                                         | `debug` for more detail, `warn` for less                                                                                                              |
| `LOKI_RETENTION`                                                    | How long SIEMple's own logs are kept, in hours: `336h` (14 days) by default                                                                           |
| `DOCKER_CONTAINERS_DIR`                                             | Where Docker keeps container logs, for Alloy: `/var/lib/docker/containers` by default                                                                 |
| `SIEMPLE_ENV`                                                       | The `env` label on every log line: `production` by default                                                                                            |
| `GRAFANA_ADMIN_USER`, `GRAFANA_ADMIN_PASSWORD`                      | Grafana's first sign-in. Only read on its very first start; afterwards change the password inside Grafana.                                            |
| `GRAFANA_COOKIE_SECURE`                                             | `true` with HTTPS, so Grafana's sign-in cookie is only sent over HTTPS                                                                                |

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

2. Fill in the four required values in `.env` (generate each with `openssl rand -hex 32`): `POSTGRES_PASSWORD`, `REDIS_PASSWORD`, `JWT_SECRET`, `GRAFANA_ADMIN_PASSWORD`. Set `APP_URL` to the address people will use.
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
GRAFANA_ADMIN_PASSWORD=<random letters and digits>
SETTINGS_ENCRYPTION_KEY=<see below>
APP_URL=http://192.168.1.20
```

Generate each secret with:

- **Windows (PowerShell):** `-join ((1..32) | % { '{0:x2}' -f (Get-Random -Max 256) })`
- **Linux or Mac:** `openssl rand -hex 32`

`SETTINGS_ENCRYPTION_KEY` is base64 instead:

- **Windows (PowerShell):** `[Convert]::ToBase64String((1..32 | % { [byte](Get-Random -Max 256) }))`
- **Linux or Mac:** `openssl rand -base64 32`

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

The SIEMple Health dashboard is at `http://192.168.1.20/grafana/`: sign in as `admin` with your `GRAFANA_ADMIN_PASSWORD` (see [SIEMple health](#siemple-health-grafana)).

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

These commands cover the database only. The stored logs and Grafana's data stay in the `siemple_loki-data` and `siemple_grafana-data` Docker volumes; on Linux, `install.sh backup` (above) saves those as well.

## Uninstalling

```bash
sudo /opt/siemple/install.sh uninstall           # stop and remove the containers; data and settings stay
sudo /opt/siemple/install.sh uninstall --purge   # also delete the database, logs, Grafana, certificates, images and .env
```

`--purge` asks you to type `delete` first. Backups in `/opt/siemple/backups` are always kept.

## Troubleshooting

**`port is already allocated` while starting.** Something else uses port 80 (often another web server). Pick another port: set `WEB_PORT=8080` in `.env` and run `docker compose up -d`, or reinstall with `--port 8080`.

**Emails aren't sent.** Open Settings → Email and send a test email; the result names the cause. See [When the test email fails](#when-the-test-email-fails).

**The installer says SIEMple didn't become healthy.** It shows the recent logs of the services that failed. The application log usually names the problem:

```bash
cd /opt/siemple && sudo docker compose ps -a && sudo docker compose logs --tail 50 migrate api
```

**"Can't talk to Docker".** Docker isn't running (`sudo systemctl start docker`), or the script isn't running as root or as a member of the `docker` group.

**Everyone is signed out whenever the page reloads.** `APP_URL` starts with `https://`, but SIEMple is being opened over plain `http://`. Make the two match.

**The page doesn't load from other computers.** Check the server's firewall allows the web port (for example `sudo ufw allow 80/tcp`), and that `WEB_BIND` isn't `127.0.0.1` in plain HTTP mode.

**The setup token doesn't work.** A newer one was issued when SIEMple restarted. Run `sudo /opt/siemple/install.sh token` and use the token it prints.

**Grafana says the password is wrong after I changed `GRAFANA_ADMIN_PASSWORD`.** That setting is only read on Grafana's first start. Reset the password with the command under [SIEMple health](#siemple-health-grafana).

**Grafana shows no logs.** Loki needs about 20 seconds after starting before it answers; Alloy keeps the lines until then. Check the time range at the top right, then `sudo docker compose ps alloy` (it should be healthy) and `sudo docker compose logs alloy`. If Docker keeps its data outside `/var/lib/docker` (snap Docker, a custom `data-root`), set `DOCKER_CONTAINERS_DIR` in `.env` and run `sudo docker compose up -d`.

## Security notes

- Only the web port (or ports 80 and 443 with HTTPS) is published. The database, Redis, Loki, Alloy and the API are reachable only from inside Docker's private network; Grafana only through `/grafana/`, behind its own sign-in.
- Nothing outside SIEMple can send logs in: there is no ingest API or syslog port. Alloy reads Docker's log files read-only and has no access to the Docker socket.
- Grafana's image ships with known vulnerabilities in Grafana's own components that only a new Grafana release can fix; SIEMple moves to new Grafana versions as they're published. Keep it behind the sign-in and up to date.
- `.env` holds every secret and is readable by root only. Don't copy it anywhere it could be read by others.
- The email password saved in Settings → Email is encrypted (AES-256-GCM) with `SETTINGS_ENCRYPTION_KEY`, decrypted only in memory while sending, and never returned by the API or written to logs or the audit log.
- Backups contain everything SIEMple stores. Keep them as protected as the server.
- The containers run with reduced privileges: the API runs as an unprivileged user on a read-only filesystem.
- Install updates when they're released: `sudo /opt/siemple/install.sh update`.
