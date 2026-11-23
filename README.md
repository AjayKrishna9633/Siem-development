# SIEMple

SIEMple is a self-hosted SIEM (Security Information and Event Management) console. Each organization runs it on its own server: **one install is one organization**.

- The first administrator is created through a first-run setup that only someone with access to the server can complete.
- Administrators invite people by email and role (Tier 1 Analyst, Tier 2 Analyst, Administrator); nobody signs up on their own.
- Every security-relevant action lands in an append-only audit log.
- A built-in Grafana at `/grafana/` shows whether SIEMple itself is healthy (see [Log flows](#log-flows)).

## Log flows

SIEMple moves logs in exactly two ways, and keeps them apart on purpose:

| Flow               | Path                                                                | What it carries                                                                                                        | Status                                               |
| ------------------ | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| 1. Security events | Wazuh agents ──► SIEMple pipeline ──► database ──► rules ──► alerts | Events from the machines you protect                                                                                   | Agents enroll (Agents → Add agent); pipeline planned |
| 2. SIEMple health  | SIEMple's own containers ──► Alloy ──► Loki ──► Grafana             | HTTP access logs, app logs and container logs of SIEMple's own stack (api, web, postgres, redis, loki, grafana, alloy) | Built in                                             |

Flow 2 answers one question: **is SIEMple itself healthy?** Grafana opens on the **SIEMple Health** dashboard: request rate, 5xx error rate, p95 latency by route, log volume by service and recent errors. The API writes structured JSON to stdout; Alloy reads the log files of this compose project's containers only (read-only, without the Docker socket) and labels each line with just `service`, `level` and `env`. Loki keeps them for 14 days.

What Grafana deliberately does **not** do:

- It never receives security events. Wazuh events go through flow 1 to the database, rules and alerts; nothing sends them to Loki.
- It accepts nothing from outside: there is no ingest API, syslog receiver, remote agent or Windows event collection, and Loki and Alloy publish no ports.
- It is not where analysts investigate or alert. That is the SIEMple console.
- It never sees secrets: request bodies, passwords, tokens, cookies, `Authorization` headers and the setup token are kept out of the logs.

## Install with Docker

On a Linux server with [Docker](https://docs.docker.com/engine/install/) and the Compose plugin:

```bash
curl -fsSL https://github.com/AjayKrishna9633/Siem-development/releases/latest/download/install.sh | sudo bash
```

The installer generates the secrets, starts SIEMple and prints the address to open and a one-time setup token. The same script then handles updates, backups and restores:

```bash
sudo /opt/siemple/install.sh status | update | backup | restore <file> | token | uninstall
```

HTTPS with a free Let's Encrypt certificate is one option away (`--domain siem.example.com`). See [INSTALL.md](INSTALL.md) for requirements, every option, backups, upgrades and troubleshooting.

Images are published for x86-64 and ARM64 as `ghcr.io/ajaykrishna9633/siemple-api`, `ghcr.io/ajaykrishna9633/siemple-web` and `ghcr.io/ajaykrishna9633/siemple-grafana`.

## Development

Requires Node.js 24 (see [.nvmrc](.nvmrc)) and Docker for the database.

```bash
npm install && npm install --prefix backend && npm install --prefix frontend
npm run db:up                                # Postgres :5433 and Redis :6379 in Docker
cp backend/.env.example backend/.env         # points at those; set JWT_SECRET, and NODE_ENV=development for readable logs
npm run dev                                  # backend on :4000 and frontend on :5173
```

The setup token is printed in the backend's output on start. `npm run db:down` stops the containers and keeps their data.

To run the whole stack in containers the way an install does, built from this checkout: copy [.env.example](.env.example) to `.env` in the repository root, fill in its four secrets, then `npm run stack:up` (open http://localhost, and http://localhost/grafana/ for the SIEMple Health dashboard) and `npm run stack:down`.

| Read                                                         | For                                                                  |
| ------------------------------------------------------------ | -------------------------------------------------------------------- |
| [docs/PROJECT_GUIDE.md](docs/PROJECT_GUIDE.md)               | How the code is organized, the security model, the API and the tests |
| [docs/AGENTS_LAB_CHECKLIST.md](docs/AGENTS_LAB_CHECKLIST.md) | A manual end-to-end test of adding a Windows agent                   |
| [CONTRIBUTING.md](CONTRIBUTING.md)                           | Commit message rules (enforced by a commit hook)                     |
| [INSTALL.md](INSTALL.md)                                     | Running SIEMple on a server                                          |
