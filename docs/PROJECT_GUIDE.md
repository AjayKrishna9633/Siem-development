# SIEMple — Project Guide

A complete walkthrough of the codebase for review preparation. Every file path is a link: open this file in VS Code's Markdown preview (`Ctrl+Shift+V`) and click through to the code as you read.

This guide describes the **self-hosted, single-organization** design on `feat/self-hosted-auth`. The earlier multi-tenant SaaS design (super admin, companies) is gone; section 19 explains what changed and why.

---

## Contents

1. [What SIEMple is](#1-what-siemple-is)
2. [Tech stack](#2-tech-stack)
3. [The big picture: layers](#3-the-big-picture-layers)
4. [Folder map](#4-folder-map)
5. [Life of a request, line by line](#5-life-of-a-request-line-by-line)
6. [Dependency injection (Inversify)](#6-dependency-injection-inversify)
7. [Roles and permissions](#7-roles-and-permissions)
8. [Database: tables, migrations and indexes](#8-database-tables-migrations-and-indexes)
9. [Redis / cache keys](#9-redis--cache-keys)
10. [Constants and configuration](#10-constants-and-configuration)
11. [Validation and errors](#11-validation-and-errors)
12. [Security model](#12-security-model)
13. [Features and flows](#13-features-and-flows)
14. [The audit log](#14-the-audit-log)
15. [API reference](#15-api-reference)
16. [Frontend architecture](#16-frontend-architecture)
17. [Testing](#17-testing)
18. [Operating an install](#18-operating-an-install)
19. [What changed from the SaaS design](#19-what-changed-from-the-saas-design)
20. [Likely review questions](#20-likely-review-questions)
21. [Known limitations and next steps](#21-known-limitations-and-next-steps)

---

## 1. What SIEMple is

SIEMple is a SIEM (Security Information and Event Management) console sold as a **self-hosted product**: each customer installs it on their own server. **One install = one organization.** There is no vendor account inside an install and no list of companies.

This branch covers **who can sign in and what they can do**:

- The first administrator is created through a **first-run setup** that only someone with access to the server's log can complete.
- Administrators **invite** people by email and role; nobody signs up on their own.
- People can **reset a forgotten password** through a single-use link, sent by email when the server has email, or handed over by an administrator when it doesn't.
- Every security-relevant action lands in an **append-only audit log**.

The three roles:

| Role (code value) | Shown as       | What they do                                                         | Lands on   |
| ----------------- | -------------- | -------------------------------------------------------------------- | ---------- |
| `t1_analyst`      | Tier 1 Analyst | Watch the alert queue: view, triage, close false positives, escalate | `/profile` |
| `t2_analyst`      | Tier 2 Analyst | Tier 1, plus work escalated alerts and edit detection rules          | `/profile` |
| `admin`           | Administrator  | Everything, including users, settings and the audit log              | `/users`   |

Defined in [UserRole.ts](../backend/src/domain/enums/UserRole.ts); what each can do is in [permissions.policy.ts](../backend/src/domain/policies/permissions.policy.ts) (section 7).

---

## 2. Tech stack

| Part                 | Technology                                                                | Why                                                   |
| -------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------- |
| Backend              | Node.js + TypeScript (strict), run by `tsx`                               | Type safety; no build step in development             |
| HTTP                 | Express 5                                                                 | Routing and middleware                                |
| Validation           | Zod 4                                                                     | Request schemas that also clean the data              |
| Dependency injection | Inversify 8                                                               | Classes depend on interfaces, wired in one place      |
| Database             | PostgreSQL via TypeORM 1, **schema managed by migrations**                | Users, settings, links, audit log                     |
| Cache                | Redis via `ioredis` (in-memory fallback)                                  | Refresh sessions, email-change codes                  |
| Passwords            | bcrypt, cost 12                                                           | Slow, salted hashing                                  |
| Tokens               | JWT (`jsonwebtoken`, HS256) + opaque random tokens                        | Access tokens; refresh, setup, invite and reset links |
| Email                | Nodemailer, **optional** (any SMTP server)                                | Invitations, reset links, notices                     |
| Frontend             | React 19, Vite, Tailwind CSS 4, Zustand, Axios, React Router              | UI                                                    |
| Tests                | Vitest + Supertest against a real Postgres                                | Unit and integration                                  |
| Quality gates        | ESLint, Prettier, Husky + lint-staged, commitlint, `verify-standards.cjs` | Run on every commit                                   |
| Health logs          | Grafana Alloy 1.21 (collector), Loki 3.7 (storage), Grafana 13 (viewer)   | Is SIEMple itself healthy? Its own containers' logs   |
| Packaging            | Docker (Node and nginx on Alpine), Compose, Caddy, GitHub Actions + GHCR  | One-command self-hosted install (section 18)          |

---

## 3. The big picture: layers

The backend follows **Clean Architecture**: four layers, dependencies pointing **inward only**.

```
 ┌──────────────────────────────────────────────────────────────┐
 │ PRESENTATION   routes · controllers · middlewares · validators│  ← knows HTTP / Express
 │                (plus src/cli: terminal entry points)          │
 │  ┌────────────────────────────────────────────────────────┐  │
 │  │ APPLICATION   use cases · interfaces (ports) · types    │  │  ← business workflows
 │  │  ┌──────────────────────────────────────────────────┐  │  │
 │  │  │ DOMAIN   entities · enums · policies · errors     │  │  │  ← pure rules, no libraries
 │  │  └──────────────────────────────────────────────────┘  │  │
 │  └────────────────────────────────────────────────────────┘  │
 │ INFRASTRUCTURE  TypeORM repos · migrations · Redis · bcrypt · │  ← implements the ports
 │                 JWT · email · opaque tokens                   │
 └──────────────────────────────────────────────────────────────┘
```

| Layer          | Folder                                                      | May import                 | Example                                                        |
| -------------- | ----------------------------------------------------------- | -------------------------- | -------------------------------------------------------------- |
| Domain         | [backend/src/domain](../backend/src/domain)                 | Only the domain            | `SystemSettings.completeSetup()` refuses to run twice          |
| Application    | [backend/src/application](../backend/src/application)       | Domain                     | `AcceptInviteUseCase` decides how an invitation is accepted    |
| Infrastructure | [backend/src/infrastructure](../backend/src/infrastructure) | Application ports + domain | `TypeOrmAuthTokenRepository` implements `IAuthTokenRepository` |
| Presentation   | [backend/src/presentation](../backend/src/presentation)     | Application + domain       | `InviteController.accept` turns HTTP into a use-case call      |

**Why it matters:** use cases depend on interfaces (`IUserRepository`, `IEmailService`…), never on TypeORM or Nodemailer. The unit tests replace them with in-memory fakes; the email service can be "not configured" without any use case knowing how.

**Composition roots** — the only places that wire concrete classes together: [server.ts](../backend/src/server.ts) (HTTP server), [cli/setup-token.ts](../backend/src/cli/setup-token.ts) and [cli/reset-admin.ts](../backend/src/cli/reset-admin.ts) (terminal commands), all using [di/index.ts](../backend/src/infrastructure/di/index.ts).

---

## 4. Folder map

### Backend — [backend/src](../backend/src)

```
server.ts                 Start-up: connect DB, run migrations, setup-token banner, listen
app.ts                    Express app: trust proxy, helmet, CORS, setupGuard, routes, errors
cli/                      Terminal commands: setup-token, reset-admin, the setup banner
config/
  env.config.ts           Reads and validates .env with Zod; exits if something is wrong
domain/                   ── pure business rules ──
  entities/               User, SystemSettings
  enums/                  UserRole, UserStatus, Permission, AuthTokenType, AuditAction,
                          AppErrorCode, ErrorMessage, SuccessMessage, HttpStatusCode
  policies/               permissions.policy (role → permissions), credentials.policy
  constants/              security.ts (lifetimes, bcrypt cost, lockout), types.ts (DI tokens)
  types/                  Props shapes for entities
  errors/                 AppError (expected failures), DomainError (rule violations)
application/              ── workflows ──
  use-cases/setup/        First-run setup: issue token, verify, complete, status
  use-cases/invites/      Invite, resend, revoke, list, preview, accept
  use-cases/password-reset/ Forgot password, preview, reset, admin link, recovery link
  use-cases/users/        List users, change role, disable/enable, admin guards
  use-cases/auth/         Login, refresh, logout, current user, profile, session check
  use-cases/account/      Change password, change email
  use-cases/shared/       assertPermission, session building
  interfaces/             Ports: repositories, services, use cases
  types/use-case/         Input/output shapes
infrastructure/           ── technology ──
  database/models/        TypeORM tables: users, system_settings, auth_tokens, audit_logs
  database/migrations/    Every schema change, in order (section 8)
  database/repositories/  TypeORM implementations of the repository ports
  redis/                  Redis client + cache service with in-memory fallback
  services/               bcrypt, JWT, refresh sessions, opaque tokens, auth tokens,
                          email, auth mailer, security mailer, verification codes,
                          audit service
  context/                AsyncLocalStorage request scope (request id, IP, actor)
  database/queries/       Pure SQL builders (the audit log filter)
  services/templates/     Email HTML/text
  di/                     The Inversify container and every binding
presentation/             ── HTTP ──
  routes/                 URL → middleware chain → controller method
  controllers/            Read the request, call one use case, send the response
  middlewares/            authenticate, authorize, setupGuard, validate, catchAsync, errors
  validators/             Zod schemas
  http/                   actorFrom/idParamFrom, requestContextFrom, refresh cookie,
                          rate-limiter factory, ApiResponse
tests/ (next to src)      unit/, integration/, helpers/, setup-env.ts
```

### Frontend — [frontend/src](../frontend/src)

```
App.tsx                   Routes and guards
store/auth.store.ts       Zustand: user, isAuthenticated, login/logout/restoreSession
services/                 api.ts (Axios + refresh + SETUP_REQUIRED redirect),
                          auth, users and setup services
pages/auth/               Login, Setup, AcceptInvite, ForgotPassword, ResetPassword
pages/settings/           Profile, UserManagement, InviteUser
components/ui/            Generic building blocks (Button, Modal, Table, ConfirmDialog…)
components/common/        Shared pieces (LinkDeliveryDetails, ListToolbar, LocalTime…)
components/users/         UserTable, InviteUserForm, invite/reset dialogs, role and status dialogs
components/profile/       Change password / change email dialogs
features/audit/           The audit log page: api, table, filters, detail drawer, URL filter state
lib/                      permissions (can, homePathFor), roles, password, validation, errors
types/auth.ts             Shapes returned by the API
```

---

## 5. Life of a request, line by line

Example: an administrator invites an analyst. The browser sends `POST /api/users/invites` with `{ "email": " Ana@Acme.co ", "role": "t1_analyst" }`.

**1 — Frontend.** [InviteUserForm.tsx](../frontend/src/components/users/InviteUserForm.tsx) checks the email, then calls `usersService.invite(...)` ([users.service.ts](../frontend/src/services/users.service.ts)). The Axios instance in [api.ts](../frontend/src/services/api.ts) adds `Authorization: Bearer <accessToken>`.

**2 — Global middleware** ([app.ts](../backend/src/app.ts)), in order:

1. `trust proxy` (only if `TRUST_PROXY` is set) — makes `req.ip` the real client behind a reverse proxy.
2. **`httpLogger`** ([http-logger.ts](../backend/src/infrastructure/logging/http-logger.ts)) — gives the request an id (returned as `X-Request-Id`) and logs one line when it finishes: method, path **without the query string**, status, time, IP. See [Logging](#logging).
3. `helmet()` security headers; `cors()` restricted to the origin of `APP_URL` (`FRONTEND_URL` is the older name, still read).
4. **`setupGuard`** ([setup-guard.middleware.ts](../backend/src/presentation/middlewares/setup-guard.middleware.ts)) — if first-run setup isn't done, every API call except `/api/setup/*` gets `403 SETUP_REQUIRED`. Here setup is done, so it passes.
5. `express.json({ limit: '100kb' })`, `cookieParser()`.
6. **`requestContextMiddleware`** ([request-context.middleware.ts](../backend/src/presentation/middlewares/request-context.middleware.ts)) — opens a per-request scope (`AsyncLocalStorage`) holding the request id, IP and user agent. This is how the audit log knows where an action came from without every use case being handed the request. `authenticate` (below) adds who is calling.

**3 — Route middleware** ([users.routes.ts](../backend/src/presentation/routes/users.routes.ts)):

1. **`authenticate`** ([auth.middleware.ts](../backend/src/presentation/middlewares/auth.middleware.ts)) verifies the JWT, then **loads the user from the database** ([resolve-session-user.usecase.ts](../backend/src/application/use-cases/auth/resolve-session-user.usecase.ts)): the account must be active and its `tokenVersion` must match. `req.user.role` is the role **in the database now**, not the one in the token. It then records the caller (id, name, role) in the request scope, so anything audited later in this request is attributed to them.
2. **`authorize(Permission.USERS_MANAGE)`** — 403 unless the role has that permission.
3. `validate(inviteUserSchema)` — replaces `req.body` with the cleaned result: `{ email: "ana@acme.co", role: "t1_analyst" }`.

**4 — Controller** ([users.controller.ts](../backend/src/presentation/controllers/users.controller.ts)) passes the actor and the body fields one by one to the use case, then answers 201.

**5 — Use case** ([invite-user.usecase.ts](../backend/src/application/use-cases/invites/invite-user.usecase.ts)):

1. `assertPermission(actor, USERS_MANAGE)` again (defence in depth: use cases are safe to call from anywhere).
2. Refuses a taken email; creates the user as `invited` with no name and no password.
3. [`deliverInvite`](../backend/src/application/use-cases/invites/invite-delivery.ts): issues a single-use link (section 12), builds `${base_url}/accept-invite?token=…`, asks the mailer to send it.
4. Records `user.invite.create` through `AuditService` (section 14); the actor, IP, user agent and request id come from the request scope.
5. Returns the user and `{ delivered, expiresAt, link? }` — `link` only when the email wasn't delivered.

**6 — Response** (shape from [apiResponse.ts](../backend/src/presentation/http/helpers/implementation/apiResponse.ts)):

```json
{ "statusCode": 201, "data": { "user": { … }, "invite": { "delivered": false, "expiresAt": "…", "link": "https://siem.acme.local/accept-invite?token=…" } }, "message": "Invitation created", "success": true }
```

**7 — Frontend** shows [LinkDeliveryDetails](../frontend/src/components/common/LinkDeliveryDetails.tsx): "emailed" in green, or an amber notice with a **Copy** button for the link.

Errors take the path in section 11.

---

## 6. Dependency injection (Inversify)

A class asks for what it needs through its constructor; the container supplies it.

```ts
@injectable()
export class AcceptInviteUseCase implements IAcceptInviteUseCase {
  constructor(
    @inject(TYPES.AuthTokenService) private readonly tokens: IAuthTokenService, // an interface
    @inject(TYPES.UserRepository) private readonly users: IUserRepository,
    ...
  ) {}
}
```

| Piece                     | Where                                                         | Role                                                                                   |
| ------------------------- | ------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Tokens                    | [types.ts](../backend/src/domain/constants/types.ts)          | `Symbol.for('UserRepository')` — interfaces vanish at runtime, so symbols are the keys |
| `@injectable` / `@inject` | On classes / constructor parameters                           | Mark what the container builds and what each parameter is                              |
| Bindings                  | [di/index.ts](../backend/src/infrastructure/di/index.ts)      | `bind(TYPES.UserRepository).to(TypeOrmUserRepository)`                                 |
| Container                 | [container.ts](../backend/src/infrastructure/di/container.ts) | `defaultScope: 'Singleton'`: one instance of each class                                |

Two bindings worth noticing: `TYPES.MailTransportProvider` ([mail-transport.provider.ts](../backend/src/infrastructure/services/mail-transport.provider.ts)) decides where email comes from (`SMTP_HOST` in `.env`, then enabled Settings → Email, then none), caches the SMTP client and rebuilds it when the settings are saved; with no source the email service returns `{ delivered: false }` and the copy-link fallback takes over. And the CLI commands resolve use cases (`di.issueSetupToken`, `di.createRecoveryLink`) from the same container as the HTTP server.

---

## 7. Roles and permissions

Code never compares role names. It checks **named permissions**, and one map says which role has which:

| Permission            | Code                    | admin | t2  | t1  |
| --------------------- | ----------------------- | :---: | :-: | :-: |
| View alerts           | `alerts.view`           |  ✅   | ✅  | ✅  |
| Triage alerts         | `alerts.triage`         |  ✅   | ✅  | ✅  |
| Close false positives | `alerts.close_fp`       |  ✅   | ✅  | ✅  |
| Work escalated alerts | `alerts.work_escalated` |  ✅   | ✅  | ❌  |
| Edit detection rules  | `rules.edit`            |  ✅   | ✅  | ❌  |
| Manage users          | `users.manage`          |  ✅   | ❌  | ❌  |
| Manage settings       | `settings.manage`       |  ✅   | ❌  | ❌  |
| View audit log        | `audit.view`            |  ✅   | ❌  | ❌  |
| View agents           | `agents.view`           |  ✅   | ✅  | ✅  |
| Add agents            | `agents.manage`         |  ✅   | ❌  | ❌  |

- The map: [permissions.policy.ts](../backend/src/domain/policies/permissions.policy.ts) (`ROLE_PERMISSIONS`, `hasPermission`). The unit test [permissions.policy.test.ts](../backend/tests/unit/permissions.policy.test.ts) checks it row by row against this table.
- Routes: `authorize(...permissions)` in [auth.middleware.ts](../backend/src/presentation/middlewares/auth.middleware.ts). Use cases: `assertPermission` in [access.ts](../backend/src/application/use-cases/shared/access.ts).
- The frontend receives `permissions[]` with the session and uses `can(user, permission)` ([permissions.ts](../frontend/src/lib/permissions.ts)) to show or hide things. **The API still checks every call.**
- The alert and rule permissions exist now but nothing uses them yet; the alert module will.

**Two rules on top of permissions** ([admin-guard.ts](../backend/src/application/use-cases/users/admin-guard.ts)):

- An admin **can't change their own role or disable themselves** (another admin must) — prevents locking yourself out mid-session.
- There is **always at least one active admin.** Every change that could remove an admin runs inside `changeWithAdminLock` ([user.repository.ts](../backend/src/infrastructure/database/repositories/user.repository.ts)): a transaction that takes a Postgres advisory lock, counts active admins under it, applies the change, and saves. Two admins demoting each other at the same instant both pass every earlier check; the lock makes them run one after the other, and the second sees one admin left and gets `409 LAST_ADMIN`.

---

## 8. Database: tables, migrations and indexes

The schema changes **only through migrations** ([migrations/](../backend/src/infrastructure/database/migrations)); `synchronize` is off. Pending migrations run before the app serves anything: in Docker a one-shot `migrate` container ([cli/migrate.ts](../backend/src/cli/migrate.ts)) applies them and the API starts only if it succeeds; `npm run dev` applies them on start. Upgrading an install is pulling the new images and restarting. `npm run migration:check` confirms the models and the migrated database match exactly.

| Migration                                                                                                       | What it does                                                                                  |
| --------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| [Baseline](../backend/src/infrastructure/database/migrations/1793404800000-Baseline.ts)                         | The multi-tenant schema as it was (users, companies), so history starts from a known point    |
| [RemoveTenancy](../backend/src/infrastructure/database/migrations/1793491200000-RemoveTenancy.ts)               | Deletes old accounts, drops `companies` and `users.organization_id`, replaces the role enum   |
| [CreateAuditLogs](../backend/src/infrastructure/database/migrations/1793577600000-CreateAuditLogs.ts)           | The audit table and the trigger that makes it append-only                                     |
| [CreateSystemSettings](../backend/src/infrastructure/database/migrations/1793664000000-CreateSystemSettings.ts) | The single settings row                                                                       |
| [CreateAuthTokens](../backend/src/infrastructure/database/migrations/1793750400000-CreateAuthTokens.ts)         | Single-use links; makes `users.username` nullable                                             |
| [ExtendAuditLogs](../backend/src/infrastructure/database/migrations/1793923200000-ExtendAuditLogs.ts)           | Audit v2: actor snapshot, category, outcome, target label, request id; new indexes            |
| [CreateIngestKeys](../backend/src/infrastructure/database/migrations/1794009600000-CreateIngestKeys.ts)         | Keys for an HTTP ingest API that was later removed                                            |
| [DropIngestKeys](../backend/src/infrastructure/database/migrations/1794096000000-DropIngestKeys.ts)             | Drops `ingest_keys` again: logs only arrive through the two flows in section 18               |
| [CreateAgents](../backend/src/infrastructure/database/migrations/1794182400000-CreateAgents.ts)                 | Agents as last seen in Wazuh (`groups text[]`, nullable `removed_at`), upserted by `wazuh_id` |
| [CreateEmailSettings](../backend/src/infrastructure/database/migrations/1794268800000-CreateEmailSettings.ts)   | Single-row `email_settings`: SMTP server, sender and the AES-256-GCM encrypted password       |

Every migration has a working `down`. `RemoveTenancy.down` is lossy by nature (deleted companies can't come back).

### `users` — [user.model.ts](../backend/src/infrastructure/database/models/user.model.ts)

| Column                                                                               | Meaning                                                              |
| ------------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| `id` uuid PK                                                                         |                                                                      |
| `email` unique                                                                       | Always lowercase                                                     |
| `username` nullable                                                                  | Null until an invited person accepts and chooses a name              |
| `password_hash` nullable                                                             | bcrypt; null until the invitation is accepted                        |
| `role` enum                                                                          | `admin` / `t2_analyst` / `t1_analyst`                                |
| `status` enum                                                                        | `invited` → `active`; `disabled`                                     |
| `token_version`                                                                      | Moves on password change, email change, disable — ends every session |
| `failed_login_attempts`, `locked_until`                                              | Sign-in lockout                                                      |
| `last_login_at`, `last_login_ip`, `password_changed_at`, `invited_by_id`, timestamps |                                                                      |

### `system_settings` — [system-settings.model.ts](../backend/src/infrastructure/database/models/system-settings.model.ts)

Exactly one row (`CHECK (id = 1)`), inserted by its migration so setup can always lock it.

| Column                                       | Meaning                                                               |
| -------------------------------------------- | --------------------------------------------------------------------- |
| `setup_completed`                            | One-way switch                                                        |
| `setup_token_hash`, `setup_token_expires_at` | SHA-256 of the live setup token and its expiry; both cleared by setup |
| `org_name`, `base_url`, `timezone`           | Entered at setup; `base_url` starts every emailed link                |

### `auth_tokens` — [auth-token.model.ts](../backend/src/infrastructure/database/models/auth-token.model.ts)

| Column                                 | Meaning                                                      |
| -------------------------------------- | ------------------------------------------------------------ |
| `user_id` → users, `ON DELETE CASCADE` | Revoking an invite deletes the user and their links together |
| `type` enum                            | `invite` (48 h) or `reset` (30 min)                          |
| `token_hash` **unique**                | SHA-256 of the link's token; lookups go through this index   |
| `expires_at`, `used_at`                | A link is usable while unused and unexpired                  |
| `created_by`                           | The admin who issued it; null for self-service               |

Index `(user_id, type)` serves "delete this user's earlier unused links".

### `audit_logs` — [audit-log.model.ts](../backend/src/infrastructure/database/models/audit-log.model.ts)

| Column                                     | Meaning                                                                                  |
| ------------------------------------------ | ---------------------------------------------------------------------------------------- |
| `id` uuid PK                               | Assigned by the database                                                                 |
| `occurred_at` timestamptz                  | Set by the database (`clock_timestamp()`), microsecond precision; the app never sends it |
| `actor_id`, `actor_username`, `actor_role` | Who did it, **copied at write time** so the row stays readable after a rename or removal |
| `action`                                   | Dot notation, e.g. `auth.login.failure`                                                  |
| `category`                                 | `auth`, `user`, `system`, `agent`, `rule`, `alert` (`CHECK`); derived from the action    |
| `outcome`                                  | `success`, `failure`, `denied` (`CHECK`)                                                 |
| `target_type`, `target_id`, `target_label` | What it was done to; the label (usually an email) is also copied at write time           |
| `ip_address`, `user_agent`, `request_id`   | From the request; the id matches the `X-Request-Id` in the server log                    |
| `metadata` jsonb                           | Details, including before/after; secrets redacted before the insert                      |

Indexes: `(occurred_at DESC, id DESC)` serves the newest-first, keyset-paged list; `(actor_id, occurred_at DESC)` serves "this person's activity"; plus `action` and `category`. **No foreign key** to users, so history outlives accounts. A trigger rejects `UPDATE`, `DELETE` and `TRUNCATE` (section 14).

---

## 9. Redis / cache keys

Short-lived session data stays in Redis ([cache.service.interface.ts](../backend/src/application/interfaces/services/cache.service.interface.ts)); everything that must survive a restart (links, settings, audit) is in Postgres.

| Key                            | Lifetime | Purpose                                                    |
| ------------------------------ | -------- | ---------------------------------------------------------- |
| `refresh:<sha256(token)>`      | 7 days   | One refresh token (only its hash)                          |
| `refresh-used:<sha256(token)>` | 7 days   | Marks a token as spent; claimed atomically                 |
| `refresh-family:<familyId>`    | 7 days   | One login's chain of tokens; deleting it ends that session |
| `verify:email-change:<userId>` | 10 min   | Code that confirms a new email address                     |
| `wazuh:api-token`              | 14 min   | The Wazuh API token (Wazuh issues them for 15 minutes)     |

If Redis is unreachable, the cache silently uses memory and the terminal says so; sessions are then lost on restart.

---

## 10. Constants and configuration

| Constant                  | Value                               | Where                                                                                           |
| ------------------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------- |
| `PASSWORD_MIN_LENGTH`     | 12 (every role)                     | [credentials.policy.ts](../backend/src/domain/policies/credentials.policy.ts)                   |
| `PASSWORD_MAX_BYTES`      | 72 (bcrypt ignores the rest)        | same                                                                                            |
| `BCRYPT_COST`             | 12                                  | [security.ts](../backend/src/domain/constants/security.ts)                                      |
| `LOGIN_LOCKOUT`           | 5 wrong passwords → 15-minute pause | same                                                                                            |
| `SETUP_TOKEN_TTL_HOURS`   | 24                                  | same                                                                                            |
| `INVITE_TOKEN_TTL_HOURS`  | 48                                  | same                                                                                            |
| `RESET_TOKEN_TTL_MINUTES` | 30                                  | same                                                                                            |
| Access token              | 15 minutes, HS256                   | [jwt-token.service.ts](../backend/src/infrastructure/services/jwt-token.service.ts)             |
| Refresh token             | 7 days, rotated on every use        | [refresh-session.service.ts](../backend/src/infrastructure/services/refresh-session.service.ts) |

Environment variables are documented in [backend/.env.example](../backend/.env.example) and validated by [env.config.ts](../backend/src/config/env.config.ts). Required: `DATABASE_URL`, `JWT_SECRET` (≥ 32 chars), `REDIS_URL`. Optional: `PORT`, `NODE_ENV`, `APP_URL` (the address people open; decides the CORS origin and, when it starts with `https://`, Secure cookies; falls back to the older `FRONTEND_URL`), `LOG_LEVEL`, `TRUST_PROXY`, `SMTP_*`, `SETTINGS_ENCRYPTION_KEY` (32 bytes of base64; encrypts the SMTP password saved in Settings → Email, and a malformed one stops startup). A Docker install sets these from the root [.env.example](../.env.example) instead, through [docker-compose.yml](../docker-compose.yml) (section 18). The old Gmail variables `OTP_EMAIL` / `OTP_PASSWORD` are gone; use `SMTP_*` with `smtp.gmail.com`.

---

## 11. Validation and errors

**Validation.** [validate.middleware.ts](../backend/src/presentation/middlewares/validate.middleware.ts) replaces `req.body` with the Zod-parsed result: strings trimmed, emails lowercased, unknown keys dropped (so a body can't smuggle `role` or `actor` into a use case). Shared fields live in [common.schema.ts](../backend/src/presentation/validators/common.schema.ts): `emailField`, `newPasswordField`, `personNameField`, `linkTokenField`. Route IDs must be UUIDs (`idParamFrom`).

**Errors.** Everything ends in [errorHandler.ts](../backend/src/presentation/middlewares/errorHandler.ts):

| Error                         | Response                                                                                                                          |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Invalid JSON / body too large | 400 / 413                                                                                                                         |
| `ZodError`                    | 400 with a message per field                                                                                                      |
| `AppError`                    | Status from `statusByCode`, **plus `code`** (e.g. `SETUP_REQUIRED`, `LAST_ADMIN`) so the frontend can react without matching text |
| `DomainError`                 | 422                                                                                                                               |
| Postgres `22P02` / `23505`    | 400 bad ID / 409 duplicate                                                                                                        |
| Anything else                 | 500, details logged, never sent                                                                                                   |

---

## 12. Security model

### Sessions

|                    | Access token                                   | Refresh token                                            |
| ------------------ | ---------------------------------------------- | -------------------------------------------------------- |
| Format             | JWT, HS256 (pinned when signing and verifying) | 32 random bytes                                          |
| Lifetime           | 15 min                                         | 7 days, rotated on every use                             |
| Lives in           | JavaScript memory only                         | httpOnly, `SameSite=strict` cookie scoped to `/api/auth` |
| Stored server-side | No                                             | Only its SHA-256 hash                                    |

- **Every request re-checks the user** ([resolve-session-user.usecase.ts](../backend/src/application/use-cases/auth/resolve-session-user.usecase.ts)): active status and matching `tokenVersion`, with the role read from the database. A disabled user, a changed password or a demotion takes effect on the **next request**, not when the token expires.
- **Refresh rotation and theft detection:** each refresh atomically claims the old token; a reuse more than 10 s later means it was stolen, and the whole session family is revoked.

### Single-use links (setup, invite, reset)

All built from [opaque-token.service.ts](../backend/src/infrastructure/services/opaque-token.service.ts): **32 random bytes**, handed out once, **stored only as a SHA-256 hash**. A fast hash is enough because 256 random bits can't be guessed (passwords, being short, need bcrypt).

- **Single use is atomic:** [`consume`](../backend/src/infrastructure/database/repositories/auth-token.repository.ts) is `UPDATE … SET used_at = now WHERE id = $1 AND used_at IS NULL AND expires_at > now`. Postgres locks the row for the update, so of two simultaneous submissions exactly one changes a row.
- **Only the newest link works:** issuing one deletes the user's earlier unused links of that type in the same transaction.
- **Setup token check** uses `timingSafeEqual`; invite and reset tokens are found by hash through a unique index.

### Passwords

- bcrypt cost 12. Older hashes are **upgraded at the next successful sign-in** without bumping `tokenVersion` (same password, so nobody is signed out).
- Minimum 12 characters, maximum 72 bytes.
- **No account enumeration:** unknown, never-activated and locked accounts get the same "invalid email or password" and take the same time (a dummy bcrypt check). "Forgot password" answers identically for every email, and issues and sends the link in the background so response time reveals nothing either.
- Lockout after 5 wrong passwords; a password reset lifts it.

### First-run setup

Only someone who can read the server's log has the setup token. Completing setup happens **in one transaction holding `SELECT … FOR UPDATE` on the settings row**: it re-checks `setup_completed` and the token, creates the admin, closes setup and clears the token. A second simultaneous request waits for the lock, then sees setup done. Failed attempts: 5 per IP per 15 minutes, audited.

### Other protections

`helmet` headers · CORS limited to the `APP_URL` origin · per-IP rate limits on every unauthenticated route · route IDs must be UUIDs · permissions checked at the route **and** in the use case · `TRUST_PROXY` so IPs aren't the proxy's · client-supplied `X-Forwarded-For` is never trusted directly.

---

## 13. Features and flows

### 13.1 First-run setup

1. On start, [server.ts](../backend/src/server.ts) calls `IssueSetupTokenUseCase`. If setup isn't done and there's no live token, it prints a banner with a new token (valid 24 h). A restart within that window reuses the token instead of silently invalidating it.
2. Any page redirects to `/setup` ([Setup.tsx](../frontend/src/pages/auth/Setup.tsx)) because the API answers `SETUP_REQUIRED`.
3. Step 1 `POST /api/setup/verify-token`; step 2 `POST /api/setup/complete` with the admin's name, email, password and the organization's name, address and time zone. The admin is signed in.
4. From then on `/api/setup/*` answers 404, and `npm run setup-token` refuses.

### 13.2 Invitations

- **Invite** `POST /api/users/invites` → user `invited`, 48-hour link, emailed or returned (section 5).
- **List** `GET /api/users/invites` — pending invitations and whether each link has expired.
- **Resend** `POST /api/users/:id/invite/resend` — new link, old one dead. Confirmed in the UI.
- **Revoke** `DELETE /api/users/:id/invite` — `DELETE … WHERE id = $1 AND status = 'invited'` in one statement, so an invite accepted a moment earlier is never deleted. The email can be invited again.
- **Accept** `/accept-invite?token=…` ([AcceptInvite.tsx](../frontend/src/pages/auth/AcceptInvite.tsx)) → `GET /api/auth/invite` shows who it's for → `POST /api/auth/invite/accept` with name and password → active and signed in.

### 13.3 Sign in, stay signed in, sign out

`POST /api/auth/login` → session; page reloads trade the refresh cookie for a new access token (`POST /api/auth/refresh`); `POST /api/auth/logout` ends the session family. All three are audited.

### 13.4 Roles and account status

User management ([UserManagement.tsx](../frontend/src/pages/settings/UserManagement.tsx)): pencil → change role (`PATCH /api/users/:id/role`), ban / check → disable / enable (`POST /api/users/:id/disable|enable`). Your own row's buttons are disabled. Disabling ends every session at once; enabling restores sign-in with the old password (or back to `invited` for someone who never accepted).

### 13.5 Forgot password and reset links

- **Forgot password** ([ForgotPassword.tsx](../frontend/src/pages/auth/ForgotPassword.tsx)) `POST /api/auth/password-reset/request` → same answer always; a 30-minute link is emailed only if the account is active **and** email is configured.
- **Admin-issued** `POST /api/users/:id/password-reset` (key button) → emailed to the user if possible, otherwise returned to the admin to pass on. The admin never sees or sets the password.
- **Reset** `/reset-password?token=…` ([ResetPassword.tsx](../frontend/src/pages/auth/ResetPassword.tsx)) → `GET /api/auth/password-reset` shows the account → `POST /api/auth/password-reset` sets the password, signs out everywhere, clears lockout → back to sign-in.

### 13.6 Change password, change email, profile

- **Change password** (Profile → Security): current password + new password (`POST /api/auth/password`). Works without email. Other devices are signed out; this one gets fresh tokens.
- **Change email** (users with `users.manage`): code to the **new** address, then confirm (`POST /api/auth/email/code`, `POST /api/auth/email`).
- **Profile** `GET /api/auth/me`, `PUT /api/auth/profile`.

### 13.7 Lockout recovery

`npm run reset-admin -- admin@acme.com` (section 18) prints a reset link for an **active admin**. No password is typed into a shell.

---

## 14. The audit log

Every security-relevant action is written to the `audit_logs` table, and an admin can read it back in the UI (`/audit`) or through the API (below).

### How a row gets written

- **One entry point.** Code never inserts a row itself; it calls `AuditService.record({ action, … })` ([audit.service.ts](../backend/src/infrastructure/services/audit.service.ts)). The caller says only what happened. The service fills in **who** (the signed-in user's id, name and role, copied now), **where from** (IP, user agent) and the **request id**, all read from the per-request scope (section 5), and derives the **category** from the action ([audit.ts](../backend/src/domain/constants/audit.ts) — adding an action without a category doesn't compile).
- **Secrets never get in.** Before insert, metadata is walked recursively and any key matching `password`, `token`, `secret`, `authorization` or `cookie` (any case, any depth) is replaced with `[REDACTED]` ([audit-redaction.policy.ts](../backend/src/domain/policies/audit-redaction.policy.ts)). Only keys are judged, and two safe ones (`tokenVersion`, `passwordChangedAt`) are allow-listed.
- **Who counts as the actor.** On an authenticated request, the caller. Where nobody is signed in yet (sign-in, accepting an invite, finishing a reset) the use case names the user explicitly; a failed sign-in has **no** actor, because the person is unproven. Terminal commands (`reset-admin`) are recorded as `system`.
- **The database stamps the time**, so no caller or bug can backdate a row.

### What is recorded

| Action                                                                         | Recorded when                                        | Notable metadata                                                                   |
| ------------------------------------------------------------------------------ | ---------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `auth.login.success` / `auth.login.failure` / `auth.logout`                    | Sign-in and sign-out                                 | failure `reason`: unknown_account, not_activated, locked, wrong_password, disabled |
| `auth.account.locked`                                                          | The failed attempt that trips the lockout (once)     | `lockedUntil`                                                                      |
| `auth.password.change` / `auth.password.reset_request` / `auth.password.reset` | Password lifecycle                                   | `via`: forgot-password, admin, cli                                                 |
| `auth.setup_token.used`                                                        | Setup token accepted (success) or rejected (failure) |                                                                                    |
| `access.denied`                                                                | A signed-in user was refused a permission (403)      | method, path (no query string), error code                                         |
| `user.invite.create` / `resend` / `revoke` / `accept`                          | Invitation lifecycle                                 | email, role, whether it was emailed                                                |
| `user.role.change` / `user.disable` / `user.enable`                            | Role and status changes                              | from / to                                                                          |
| `user.update`                                                                  | Profile name or email changed                        | `before` / `after`                                                                 |
| `system.setup.completed`                                                       | First-run setup finished                             | email, org name                                                                    |
| `audit.export`                                                                 | The log was exported to CSV                          | filters used, row count                                                            |
| `system.settings.changed`                                                      | Reserved: there is no settings editor yet            |                                                                                    |

`outcome` is `success`, `failure` or `denied`. A failure's reason is visible only here; the person signing in always sees the generic message. `access.denied` is written only for a signed-in user's permission refusals. Setup-pending and disabled-account 403s are not recorded: they say nothing about what a person tried to do, and would bury the log.

### Append-only

Three layers, each tested ([audit-guarantees.test.ts](../backend/tests/integration/audit-guarantees.test.ts)):

1. The repository has `insert` and reads only: no update or delete method exists.
2. A database **trigger** rejects `UPDATE`, `DELETE` and `TRUNCATE` on the table, whatever SQL is sent, including from the ORM or inside a transaction.
3. `CHECK` constraints keep `category` and `outcome` to the allowed values.

**What this does not stop:** the application connects as the role that owns the table, and an owner can disable a trigger. So this defeats bugs, injected SQL and anyone using the app's normal queries, but not someone who already has the database owner's credentials. Closing that gap needs a separate, limited runtime role (below). The one deliberate bypass in the code is the `ExtendAuditLogs` migration, which lifts the trigger inside its own transaction to rewrite old rows, then puts it back; if it fails, the rollback restores it.

### When a write fails

An audit failure **must not** take the product down, with one exception.

- **Everything except role and status changes:** `record()` catches the error, logs it (the action and target, never the metadata), and the request carries on. Signing in still works if the entry can't be written.
- **Role changes, disable and enable:** the audit row is written **inside the same database transaction** as the change ([user.repository.ts](../backend/src/infrastructure/database/repositories/user.repository.ts), `changeWithAdminLock`). Both commit or neither does: a permission change can never exist without its entry, and if the entry can't be written the change is refused with a 500.

Two smaller choices: a rejected setup token is recorded **after** the transaction rolls back (inside it, the entry would be undone too), and the forgot-password entry is written in the background with the email.

### Reading it back

`GET /api/audit-logs` (Admin only):

- Filters: `from`, `to`, `actorId`, `category`, `outcome`, `action` (exact), and `q` (free text over actor name, target label and action; metadata is not searched). The range may be at most **90 days**; with no dates it is the last 7 days.
- **Keyset pagination** on `(occurred_at, id)`, newest first. The cursor carries the exact timestamp as text, microseconds included. A JavaScript `Date` holds only milliseconds, so rounding it would skip or repeat rows written in the same millisecond. Rows written while you page never cause repeats or gaps. The cursor is validated like any other input.
- `GET /api/audit-logs/:id` returns one entry.
- `GET /api/audit-logs/export?format=csv` streams the same filters in batches of 1,000, so memory stays flat. An export over **100,000 rows** is refused with a 400 asking for a narrower range, _before_ any byte is sent, rather than cut short. It is rate-limited (10 per 15 minutes) and **is itself audited** (`audit.export`, written before streaming starts, so an interrupted export is still on record).
- **CSV safety:** several columns hold text an outsider chose (the email typed into a failed login, a User-Agent). Cells starting with `=`, `+`, `-`, `@`, tab or CR get a leading apostrophe so a spreadsheet shows them as text instead of running them as formulas.

The page ([features/audit](../frontend/src/features/audit)) shows time (relative, exact on hover), actor, action in words ([actionLabels.ts](../frontend/src/features/audit/constants/actionLabels.ts)), target, outcome and IP. Range, filters, search and the open entry live in the URL, so a link reproduces the view. A failure or denial is orange; a success is neutral; red is reserved for Critical alerts.

### Not built yet

Retention (a purge job: the trigger forbids `DELETE`, so it would need a deliberate, audited bypass, and the table grows without limit until then), **tamper evidence** (a hash chain over rows would make an edit by a database owner detectable), **brute-force detection** (the data is there: failed logins with IP and target), and a separate migration and runtime database role.

---

## 15. API reference

Base URL `/api`. 🔒 = access token required. Permission = what `authorize` checks.

| Method | Path                            | Auth   | Permission        | Use case                                            |
| ------ | ------------------------------- | ------ | ----------------- | --------------------------------------------------- |
| POST   | `/setup/verify-token`           | —      | setup pending     | VerifySetupToken                                    |
| POST   | `/setup/complete`               | —      | setup pending     | CompleteSetup                                       |
| POST   | `/auth/login`                   | —      | —                 | Login                                               |
| POST   | `/auth/refresh`                 | cookie | —                 | RefreshSession                                      |
| POST   | `/auth/logout`                  | cookie | —                 | Logout                                              |
| GET    | `/auth/me`                      | 🔒     | —                 | GetCurrentUser                                      |
| PUT    | `/auth/profile`                 | 🔒     | —                 | UpdateProfile                                       |
| POST   | `/auth/password`                | 🔒     | —                 | ChangePassword                                      |
| POST   | `/auth/email/code`              | 🔒     | `users.manage`    | RequestEmailChange                                  |
| POST   | `/auth/email`                   | 🔒     | `users.manage`    | ChangeEmail                                         |
| GET    | `/auth/invite?token=`           | —      | —                 | GetInvite                                           |
| POST   | `/auth/invite/accept`           | —      | —                 | AcceptInvite                                        |
| POST   | `/auth/password-reset/request`  | —      | —                 | RequestPasswordReset                                |
| GET    | `/auth/password-reset?token=`   | —      | —                 | GetPasswordReset                                    |
| POST   | `/auth/password-reset`          | —      | —                 | ResetPassword                                       |
| GET    | `/users`                        | 🔒     | `users.manage`    | ListUsers                                           |
| GET    | `/users/invites`                | 🔒     | `users.manage`    | ListPendingInvites                                  |
| POST   | `/users/invites`                | 🔒     | `users.manage`    | InviteUser                                          |
| POST   | `/users/:id/invite/resend`      | 🔒     | `users.manage`    | ResendInvite                                        |
| DELETE | `/users/:id/invite`             | 🔒     | `users.manage`    | RevokeInvite                                        |
| POST   | `/users/:id/password-reset`     | 🔒     | `users.manage`    | IssueResetLink                                      |
| PATCH  | `/users/:id/role`               | 🔒     | `users.manage`    | ChangeUserRole                                      |
| POST   | `/users/:id/disable`            | 🔒     | `users.manage`    | SetUserStatus                                       |
| POST   | `/users/:id/enable`             | 🔒     | `users.manage`    | SetUserStatus                                       |
| GET    | `/audit-logs`                   | 🔒     | `audit.view`      | ListAuditLogs                                       |
| GET    | `/audit-logs/export?format=csv` | 🔒     | `audit.view`      | ExportAuditLogs                                     |
| GET    | `/audit-logs/:id`               | 🔒     | `audit.view`      | GetAuditLog                                         |
| GET    | `/agents`                       | 🔒     | `agents.view`     | ListAgents (live from Wazuh for now)                |
| GET    | `/agents/groups`                | 🔒     | `agents.manage`   | ListAgentGroups                                     |
| POST   | `/agents/enroll-command`        | 🔒     | `agents.manage`   | GenerateEnrollCommand (`no-store`)                  |
| GET    | `/agents/enrollment-check`      | 🔒     | `agents.manage`   | CheckEnrollment (1 per user per 3 s)                |
| GET    | `/settings/email`               | 🔒     | `settings.manage` | GetEmailSettings (never the password)               |
| PUT    | `/settings/email`               | 🔒     | `settings.manage` | UpdateEmailSettings (409 when `.env` manages email) |
| POST   | `/settings/email/test`          | 🔒     | `settings.manage` | TestEmailSettings (5 a minute per admin)            |
| DELETE | `/settings/email`               | 🔒     | `settings.manage` | DisableEmailSettings                                |
| GET    | `/health`                       | —      | —                 | Database ping; never blocked by setup               |
| GET    | `/api/health`                   | —      | —                 | Container healthcheck (see below)                   |

`/health` has no `/api` prefix. `/api/health` is what Docker and the installer poll: it pings Postgres, and Redis too when `NODE_ENV=production` (in development the in-memory cache stands in), each with a 2-second timeout. It answers only `200 {"status":"ok"}` or `503 {"status":"unavailable"}`, never which part failed, because it's public ([health-check.service.ts](../backend/src/infrastructure/services/health-check.service.ts)).

Until setup is complete, every `/api` route except `/setup/*` and `/health` answers `403 { code: "SETUP_REQUIRED" }`; afterwards `/setup/*` answers 404.

---

## 16. Frontend architecture

- **Routing** ([App.tsx](../frontend/src/App.tsx)): public `/login`, `/setup`, `/accept-invite`, `/forgot-password`, `/reset-password`; everything else inside `ProtectedRoute`, which takes an optional `permission` (e.g. `/users` needs `users.manage`). Guards are for user experience; the backend enforces every rule.
- **Setup redirect:** [api.ts](../frontend/src/services/api.ts) sends any `SETUP_REQUIRED` response to `/setup`, so an operator never needs to know the URL.
- **State** ([auth.store.ts](../frontend/src/store/auth.store.ts)): the user (with `permissions`), `isAuthenticated`, and a startup `restoreSession()` that trades the refresh cookie for an access token.
- **Token refresh:** a 401 triggers one shared refresh call, then a retry.
- **Permissions:** `can(user, permission)` and `homePathFor(user)` in [permissions.ts](../frontend/src/lib/permissions.ts).
- **Links without email:** [LinkDeliveryDetails](../frontend/src/components/common/LinkDeliveryDetails.tsx) shows "emailed" or a copy box, for invites and reset links alike.

---

## 17. Testing

```bash
cd backend
npm run db:up            # (repository root) Postgres + Redis in Docker, including the siemple_test database
npm test                 # unit + integration (integration needs TEST_DATABASE_URL)
npm run typecheck:tests  # tests use the same strict TypeScript as the app
npm run migration:check  # models and migrated schema match
```

- **Unit tests** ([tests/unit](../backend/tests/unit)) use in-memory fakes: the permission matrix, `authorize`/`authenticate`, the session re-check, admin guards, token hashing and lifetimes, invite delivery, login auditing and hash upgrades, bcrypt cost, settings rules.
- **Integration tests** ([tests/integration](../backend/tests/integration)) run the real app against a **real Postgres** that [database.ts](../backend/tests/helpers/database.ts) drops and rebuilds from the migrations (a fresh install every file). They refuse to run unless `TEST_DATABASE_URL` is set and differs from `DATABASE_URL`.
- **Tests never send email:** [setup-env.ts](../backend/tests/setup-env.ts) blanks the email settings, so links always come back in responses.

The audit log's guarantees are tested at the database, not just in code: [audit-guarantees.test.ts](../backend/tests/integration/audit-guarantees.test.ts) proves `UPDATE`, `DELETE` and `TRUNCATE` are rejected (and the rows are byte-identical afterwards), and makes audit inserts fail for real to prove that sign-in and 403s survive a failed write while a role change is rolled back. [audit-api.test.ts](../backend/tests/integration/audit-api.test.ts) covers paging over rows with identical timestamps, every filter, validation, access control and the CSV export; [audit-events.test.ts](../backend/tests/integration/audit-events.test.ts) and [audit-trail.test.ts](../backend/tests/integration/audit-trail.test.ts) cover what each event records and that simultaneous requests keep their own actor and request id.

The concurrency guarantees each have a test: setup ([setup-race.test.ts](../backend/tests/integration/setup-race.test.ts), 10 simultaneous requests → exactly one admin), single-use invite and reset links (two simultaneous submissions → exactly one succeeds), and the last-admin lock ([admin-race.test.ts](../backend/tests/integration/admin-race.test.ts), which calls the use case directly so only the lock can decide).

---

## 18. Operating an install

Customers install with Docker; [INSTALL.md](../INSTALL.md) is their manual. This section is how it's built.

```text
browser ──► web (nginx) ──► api (Node) ──► postgres, redis
            serves the React build,       migrate: one-shot job that applies
            proxies /api and /grafana/    migrations before api starts
                 └──► grafana ──► loki ◄── alloy ◄── docker-socket-proxy (read-only) ◄── Docker

agents ──► wazuh-manager (1514 events, 1515 enrollment) ◄── api (Wazuh API on 55000, internal)
```

| Piece                                               | What it does                                                                                                                                                                                                                                                              |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [backend/Dockerfile](../backend/Dockerfile)         | Multi-stage `node:24-alpine`: compiles TypeScript, installs production dependencies only, runs as the `node` user. The same image runs the API and `node dist/cli/migrate.js`.                                                                                            |
| [frontend/Dockerfile](../frontend/Dockerfile)       | Builds the Vite bundle, serves it from `nginx:1.30-alpine`                                                                                                                                                                                                                |
| [frontend/nginx/](../frontend/nginx)                | SPA fallback, caching (hashed assets forever, `index.html` never), CSP and other security headers, gzip, the `/api` and `/grafana/` proxies (Grafana keeps its own CSP)                                                                                                   |
| [grafana/](../grafana)                              | The `siemple-grafana` image: Grafana 13 with the Loki data source, the SIEMple Health dashboard and Logs Drilldown built in; sign-up, anonymous access and calls home are off                                                                                             |
| [docker-compose.yml](../docker-compose.yml)         | The install: postgres, redis, migrate, api, web, wazuh-manager, loki, alloy, grafana, and Caddy for HTTPS under the `https` profile. Only web (or Caddy) and the agent ports 1514/1515 are published. Settings come from `.env` ([.env.example](../.env.example)).        |
| [install.sh](../install.sh)                         | `install`, `update`, `backup`, `restore`, `status`, `token`, `uninstall [--purge]`; downloads a GitHub release's files into `/opt/siemple`. Backups always add the Wazuh manager's agents and keys (`-wazuh.tar.gz`), and the Loki and Grafana volumes unless `--no-logs` |
| [docker.yml](../.github/workflows/docker.yml)       | Builds the api, web and grafana images and scans them with Trivy on every PR, and checks the inline Alloy config; publishes amd64 + arm64 images to GHCR on `main` and on `v*` tags; attaches the install files to the release                                            |
| [docker-compose.dev.yml](../docker-compose.dev.yml) | Development only: Postgres (`localhost:5433`, with `siemple_test`) and Redis for `npm run dev` (`npm run db:up` / `db:down`)                                                                                                                                              |

**Adding agents.** Agents → Add agent generates an install command (Windows PowerShell, DEB, RPM) from pure builders in [enroll-command.policy.ts](../backend/src/domain/policies/enroll-command.policy.ts); the package URLs live only in [wazuh-packages.ts](../backend/src/domain/constants/wazuh-packages.ts). The API reaches the manager through the `IAgentManager` port ([wazuh-agent-manager.ts](../backend/src/infrastructure/integrations/wazuh/wazuh-agent-manager.ts), [wazuh-api.client.ts](../backend/src/infrastructure/integrations/wazuh/wazuh-api.client.ts)); tests bind a fake, so CI never needs Wazuh.

- **The manager** is `wazuh/wazuh-manager:4.14.10`, manager only. A script the image runs before Wazuh starts (`wazuh-siemple-init` in the compose file) turns on the enrollment password (`authd.pass` from `WAZUH_ENROLLMENT_PASSWORD`), turns off the indexer and filebeat (SIEMple runs neither), and replaces the API's default certificate (`CN=wazuh.com`, `localhost` only) with one for `wazuh-manager` signed by a private CA. The CA key is discarded; only `ca.crt` reaches the api, read-only, as `WAZUH_API_CA_FILE`.
- **Commands carry the secret.** Names and groups must match `^[A-Za-z0-9._-]{1,64}$` and are rejected, never cleaned; every value is single-quoted for its shell. The response is `no-store`, the UI masks it until revealed, and the audit row `agent.enroll_command.generated` holds OS, arch, group and name, never the password. The agent version is the manager's, so an agent is never newer.
- **Linux installs** use `apt-get install` / `dnf install` on the downloaded package, so dependencies come along (`dpkg -i` left minimal systems half-installed).

**Two log flows, and only two.** Security events will come from Wazuh agents into SIEMple's own pipeline (database, rules, alerts); that flow is separate and never touches Loki. The second flow is SIEMple's health: Alloy reads the logs of this compose project's containers through the Docker API and sends them to Loki, and Grafana shows the SIEMple Health dashboard (request rate, 5xx rate, p95 latency by route, log volume by service, recent errors). Nothing else moves logs: there is no ingest API, syslog receiver or remote agent.

- **The Docker API, through a read-only proxy.** Reading `/var/lib/docker/containers` failed on Docker Desktop (the path resolves in the WSL distro, not Docker's VM), so Alloy uses `discovery.docker` + `loki.source.docker`, filtered on the `com.docker.compose.project` label. It talks to `tecnativa/docker-socket-proxy` (pinned), the only container with the socket: GET on `/containers` and `/networks` (discovery needs both), no POST, on the internal `docker-api` network shared only with Alloy. GET on containers still includes inspect (environment variables) and archive, so the proxy limits damage to reading, not to nothing; the raw socket would be root on the host. Alloy runs as the image's `alloy` user with every capability dropped, on the `alloy-state` volume. The proxy closes idle connections after 10 minutes; Alloy reopens a quiet container's stream without losing lines.
- **Four labels:** `project`, `service`, `level` (from the API's JSON, else guessed from `level=`, `[error]`, `ERROR:`…) and `env`. Request ids, user ids, IPs and paths stay in the line; Loki's own `service_name` and detected-level labels are switched off.
- **Dropped in Alloy:** both lines of the setup-token banner and successful health checks.
- **Updates:** `install.sh update` downloads the release files, then runs the new release's own script (`finish-update`), which recreates Loki and Alloy (compose doesn't notice an inline config change on its own) and starts the stack. If only Grafana is still starting after 240 s (its first start migrates SQLite, now in WAL mode), the install finishes with a warning.
- **Loki** keeps 14 days (`LOKI_RETENTION`) on the `loki-data` volume; neither Loki nor Alloy publishes a port. Loki's image has no shell, so it has no Docker healthcheck; Alloy's healthcheck asks its own `/-/ready` through bash's `/dev/tcp`.
- **Development:** `docker-compose.dev.yml` has no Loki, Alloy or Grafana, because `npm run dev` runs the API on the host. `npm run stack:up` runs the whole thing.

**Start order.** Postgres and Redis must be healthy, then `migrate` must exit 0, then the API starts; web waits for the API's healthcheck (`/api/health`, section 15). A failed migration leaves the old schema in place and the API stopped. The API also retries the database for about two minutes at boot, and Redis forever, so a slow start or a Docker restart after a reboot doesn't need a human.

**Client IPs.** nginx overwrites `X-Forwarded-For` with the address it sees and the API trusts exactly one proxy (`TRUST_PROXY=1`), so a client can't forge the IP in the audit log. Behind Caddy, nginx takes the client IP from Caddy's header, but only for connections from the Caddy container (`TRUSTED_PROXY=caddy`, [40-siemple-real-ip.sh](../frontend/nginx/40-siemple-real-ip.sh)).

**Cookies.** The refresh cookie is `Secure` only when `APP_URL` starts with `https://`. Tying it to `NODE_ENV` instead would make browsers drop it on a plain-HTTP LAN install and sign everyone out on every reload.

**Setup token.** Only its hash is stored, so a lost token can't be shown again. Until setup is complete, every start issues a new one and prints it as a fixed line (`==== SIEMple setup token: … ====`); `install.sh token` runs [setup-token.ts](../backend/src/cli/setup-token.ts) inside the API container.

**Releasing.** Push a tag `vX.Y.Z`: CI publishes images tagged `X.Y.Z`, `X.Y` and `latest`, then attaches `docker-compose.yml`, `env.example` and `install.sh` to the GitHub release (GitHub renames uploads that start with a dot). A tag with a hyphen (`v1.3.0-rc.1`) is a pre-release and never becomes `latest`.

Running the code directly, without Docker:

| Task                 | How                                                                                                                                                              |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Configure            | Copy [backend/.env.example](../backend/.env.example) to `.env`                                                                                                   |
| First start          | `npm run dev` (or `start`): runs migrations, prints the setup token banner                                                                                       |
| Lost the setup token | `npm run setup-token` (only while setup is pending)                                                                                                              |
| Upgrade              | Deploy the new code and restart: pending migrations run on start                                                                                                 |
| Admin locked out     | `npm run reset-admin -- admin@acme.com` → open the printed link (30 min, once). In Docker: `docker compose exec api node dist/cli/reset-admin.js admin@acme.com` |
| Behind nginx/Traefik | Set `TRUST_PROXY` (e.g. `1`) so audit IPs are real                                                                                                               |
| No mail server       | Leave `SMTP_HOST` empty: admins get copy-link boxes; "forgot password" sends nothing                                                                             |
| Migrations by hand   | `npm run migration:run` / `migration:revert` / `migration:show`                                                                                                  |
| More or less logging | `LOG_LEVEL=debug` (or `warn`, `error`…); logs are JSON lines on stdout                                                                                           |

### Logging

The backend logs with **pino** ([logger.ts](../backend/src/infrastructure/logging/logger.ts)) to stdout: one JSON object per line in production, with `timestamp` and `level` as a word (`"warn"`), which Alloy collects (above); coloured readable lines when `NODE_ENV=development` (via `pino-pretty`, a dev dependency); nothing during tests.

- **Application code** depends on the `ILogger` port ([logger.interface.ts](../backend/src/application/interfaces/services/logger.interface.ts)), injected as `TYPES.Logger`; `logger.child({ module: 'email' })` tags entries. Pino itself stays in infrastructure.
- **Requests** get one flat line each from `pino-http` ([http-logger.ts](../backend/src/infrastructure/logging/http-logger.ts)): `requestId`, `method`, `route`, `status`, `durationMs`, plus `ip` and `userAgent`. `route` is the template (`/api/users/:id`), never the raw URL; a request that fails in a router's middleware before reaching a route is logged as `/api/users/*`, and one that matches nothing as `unmatched`. Lines logged while handling a request carry its `requestId`. A well-formed `X-Request-Id` from the proxy is reused, so proxy and app logs line up. `/health` and `/api/health` are not logged (Docker polls the latter every few seconds). 4xx logs as `warn`, 5xx as `error`.
- **Unhandled errors** are logged by the error handler through `req.log`, so the stack carries the request id.
- **Secrets stay out:** request headers, cookies and bodies are never logged; query strings are dropped (invite and reset links carry `?token=`); and fields named `password`, `token`, `refreshToken`, `link`… are replaced with `[REDACTED]` as a second line of defence. [logging.test.ts](../backend/tests/unit/logging.test.ts) checks that a login password, cookies, the `Authorization` header and a setup token never reach the output.
- **Plain console output on purpose:** the setup-token banner (the one place a raw token is printed, for a person; Alloy drops it, so it never reaches Loki), the CLI commands, and the invalid-config message (printed before the logger exists).

The audit log is something else: a permanent, database-backed record of security events for admins. Logs are for operating and debugging the server.

---

## 19. What changed from the SaaS design

| Before (multi-tenant SaaS)                                                     | Now (self-hosted)                                            | Why                                                     |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------------------------- |
| Super admin creates companies; each has an org admin                           | One organization per install; admins invite people           | The customer runs the server; there is no vendor tenant |
| `companies` table, `organization_id` on users, company checks in login/refresh | Gone (migration `RemoveTenancy`)                             | Nothing left to scope                                   |
| Super admin registers on an open route                                         | Setup token printed to the server log                        | Proves server access before anyone can become admin     |
| Roles `super_admin` / `org_admin` / `analyst`, checked by name                 | `admin` / `t2_analyst` / `t1_analyst`, checked by permission | SOC tiers; one map instead of scattered checks          |
| JWT trusted for 15 minutes                                                     | User re-checked on every request                             | Disable and demotion take effect at once                |
| Activation link + temporary password in Redis                                  | Single-use invite link in Postgres                           | One secret; survives Redis restarts                     |
| Forgot password: emailed 6-digit code → reset token                            | Emailed or admin-issued reset link                           | Works without email via the admin                       |
| Change password needs an emailed code                                          | Current password only                                        | Works on installs without email                         |
| Email required (Gmail)                                                         | Email optional (any SMTP)                                    | Many self-hosted servers have no mail                   |
| `synchronize: true`, no migrations                                             | Migrations only, run on start                                | Safe, repeatable upgrades on customers' data            |
| No audit log                                                                   | Append-only audit log                                        | Who did what, provably                                  |
| bcrypt cost 10                                                                 | Cost 12, old hashes upgraded at sign-in                      | Current guidance, no forced resets                      |

---

## 20. Likely review questions

**How can two people both complete setup?** They can't. Completing setup locks the single settings row (`FOR UPDATE`) and re-checks everything under the lock; the second request waits and then sees setup done. The race test sends ten at once.

**Why is the setup token hashed if it's printed anyway?** The printed copy is the only one. A database dump or backup can't be used to finish setup.

**Why SHA-256 for tokens but bcrypt for passwords?** Tokens are 256 random bits — unguessable, so a fast hash loses nothing. Passwords are short and human-chosen, so the hash must be slow.

**How is a link used only once?** One conditional `UPDATE … WHERE used_at IS NULL AND expires_at > now`; the code checks it changed exactly one row. Postgres serializes the two updates on the row.

**Why re-check the user on every request instead of trusting the JWT?** So disabling someone or changing their role takes effect immediately. It costs one primary-key lookup per request, which is negligible at a single organization's scale.

**What stops two admins demoting each other into zero admins?** A transaction-scoped advisory lock taken by every admin-affecting change, with the active-admin count read inside it (section 7). Over HTTP the loser may instead be stopped earlier by the per-request role check (403) — both outcomes are safe, and both are tested.

**Why can't an admin demote themselves?** It's almost always a mistake made mid-session; another admin must do it.

**What happens without email?** Invites and admin reset links come back in the API response with a copy box; "forgot password" sends nothing (and says to ask an admin); verification codes for email change fail with a clear 503.

**Can the audit log be edited?** Not through the app (no update or delete method exists) and not by SQL sent through the app's connection: a trigger rejects update, delete and truncate, and a test proves it. But the app's database role owns the table, and an owner can disable a trigger, so someone holding the database owner's credentials could still alter history. A separate limited runtime role and a hash chain over the rows are the next steps (section 21).

**Why is the audit row part of the transaction for a role change but not for a login?** A permission change without its record is a hole in the log, so those two commit together or not at all. A login that fails because an audit insert failed would lock everyone out over a logging fault, so for everything else the failure is logged and the request carries on.

**Why does the audit cursor carry the timestamp as text?** The database stores microseconds and JavaScript dates hold milliseconds. Rounding would make two rows from the same millisecond skip or repeat across a page boundary.

**Why do migrations run before the app starts?** So a customer upgrades by pulling new images and restarting. In Docker a separate one-shot `migrate` container applies them and the API starts only if it exits successfully; without Docker the server applies them itself on start. Each migration runs in a transaction; a failure stops start-up before any request is served.

**Why does "forgot password" do its work in the background?** Issuing a link and talking to the mail server take time only for real accounts; doing it before answering would let anyone time the response to learn which emails exist.

---

## 21. Known limitations and next steps

| Item                                      | Detail                                                                                                                                 |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Audit log never expires                   | No retention job yet; the trigger forbids `DELETE`, so a purge needs a deliberate, audited bypass                                      |
| Audit log isn't tamper-evident            | A database owner could disable the trigger; a hash chain would make an edit detectable                                                 |
| Same database role migrates and runs      | Needed to lift the trigger in a migration; a limited runtime role would make the log truly append-only                                 |
| No brute-force detection                  | Failed logins are recorded with IP and target; nothing reads them yet                                                                  |
| Audit export is held in browser memory    | Bounded by the 100,000-row cap; true streaming to disk would need a different download path                                            |
| Only email settings are editable          | `settings.manage` covers Settings → Email; org name, base URL and time zone in the UI would use it too                                 |
| Rate limits are per process               | `express-rate-limit` keeps counts in memory; fine for one server, needs a shared store for several                                     |
| Redis fallback loses sessions on restart  | Production should require Redis                                                                                                        |
| Accepting an invite isn't one transaction | The link is spent, then the user saved; a crash in between burns the link (resend fixes it)                                            |
| Most audit writes follow the change       | Only role and status changes share its transaction; for other actions a failed write is logged, so the action stands without its entry |
| Alert and rule permissions are unused     | Defined now for the alert module                                                                                                       |
| Email delivery is untested end to end     | Tests always run without email by design; check a real invite by hand                                                                  |
| Grafana has its own sign-in               | One admin account from `.env`; signing in to Grafana with a SIEMple account (OAuth) would remove the second login                      |
| Grafana image carries upstream CVEs       | All in Grafana's own Go binaries and bundled plugins; fixed only by new Grafana releases (Trivy reports them without blocking)         |
| Loki has no Docker healthcheck            | Its image has no shell or HTTP client; it shows as running, and Alloy and Grafana retry until it is ready                              |
| Wazuh pipeline not built yet              | Agents enroll and connect; events going agents → pipeline → database → rules → alerts is the next module, and must never go to Loki    |
| Agents list reads Wazuh live              | No sync job yet: `GET /api/agents` asks the manager each time, and the `agents` table is only filled by enrollment checks              |
| No agent detail page or removal           | "View the agent" highlights its row; removing an agent is done in Wazuh for now                                                        |
| Adapter tests wait for real fixtures      | The Wazuh adapter was verified against a live 4.14.10 manager; fixture-based unit tests come with the recorded API responses           |
