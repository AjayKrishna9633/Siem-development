# SIEMple

SIEMple is a self-hosted SIEM (Security Information and Event Management) console. Each organization runs it on its own server: **one install is one organization**.

- The first administrator is created through a first-run setup that only someone with access to the server can complete.
- Administrators invite people by email and role (Tier 1 Analyst, Tier 2 Analyst, Administrator); nobody signs up on their own.
- Every security-relevant action lands in an append-only audit log.
- SIEMple's own logs, and events other programs send to `POST /api/ingest` with an ingest key, are stored in Grafana Loki and browsed in the built-in Grafana at `/grafana/`.

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
npm run db:up                                # Postgres :5433, Redis :6379, Loki :3100, Grafana :3000, in Docker
cp backend/.env.example backend/.env         # points at those; set JWT_SECRET, and NODE_ENV=development for readable logs
npm run dev                                  # backend on :4000 and frontend on :5173
```

The setup token is printed in the backend's output on start. Set `LOKI_URL=http://localhost:3100` in `backend/.env` to also see the backend's logs in Grafana at http://localhost:3000/grafana/ (admin / siemple). `npm run db:down` stops the containers and keeps their data.

To run the whole stack in containers the way an install does, built from this checkout: copy [.env.example](.env.example) to `.env` in the repository root, fill in its four secrets, then `npm run stack:up` (open http://localhost) and `npm run stack:down`.

| Read                                           | For                                                                  |
| ---------------------------------------------- | -------------------------------------------------------------------- |
| [docs/PROJECT_GUIDE.md](docs/PROJECT_GUIDE.md) | How the code is organized, the security model, the API and the tests |
| [CONTRIBUTING.md](CONTRIBUTING.md)             | Commit message rules (enforced by a commit hook)                     |
| [INSTALL.md](INSTALL.md)                       | Running SIEMple on a server                                          |
