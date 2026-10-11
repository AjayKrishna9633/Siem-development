# Sentinel Development Standards

You are working on Sentinel, a multi-tenant SIEM (Node.js + TypeScript + Express 5 backend, React 19 + Vite + Tailwind frontend, PostgreSQL, Redis/BullMQ, Wazuh agents, Microsoft Entra ID auth). Follow every rule in this document. When generating code:

- Place every file in the exact folder and with the exact file name pattern defined here. Never invent a new top-level folder.
- Respect the dependency rule (§1). If a change would make domain or application import from infrastructure or presentation, stop and restructure.
- For a new backend feature, produce files in the order of the checklist in §12 — don't skip the interface, DTO, token, or DI registration.
- No `any`, no `console.*`, no hard-coded user-facing strings, no secrets with fallback defaults.
- If an instruction here conflicts with existing code, follow this document and mention the conflict.

## 1. Architecture — Clean Architecture, layer-first

presentation → application → domain
↘ ↑
infrastructure ┘ (implements application interfaces)

| Layer          | May import from                                                            | Must NOT import from                                     |
| -------------- | -------------------------------------------------------------------------- | -------------------------------------------------------- |
| domain         | nothing (pure TS)                                                          | everything else, any npm package                         |
| application    | domain, shared                                                             | infrastructure, presentation, Express, ORM, Redis        |
| infrastructure | application, domain, shared                                                | presentation (except DI container resolving controllers) |
| presentation   | application (interfaces/DTOs), domain (enums/errors), shared, DI container | repositories, ORM, models directly                       |

Folders are layer-first, then feature subfolders inside each layer (`use-cases/agent/`, `dtos/agent/`, …).
Dependency injection: tsyringe with string tokens. Every use case, repository, and service is injected through its interface.
Tokens live in `src/shared/di/`.

## 2. Backend folder structure (`server/`)

```text
server/
├── src/
│   ├── server.ts                      # bootstrap: reflect-metadata, env, DB connect, http + socket, workers
│   ├── app.ts                         # express app: middleware, route mounting, errorHandler (last)
│   ├── config/
│   │   └── env.config.ts              # zod-validated env, exported as `envConfig`
│   ├── domain/
│   │   ├── entities/                  # <entity>.entity.ts  — classes with behaviour
│   │   ├── enums/                     # PascalCase.ts — enums + ErrorMessage/SuccessMessage const objects
│   │   ├── errors/                    # AppError.ts
│   │   ├── types/                     # <name>.ts — domain type aliases/value shapes
│   │   ├── utils/                     # <name>.ts — pure domain helpers
│   │   └── constants.ts               # AppConstants
│   ├── application/
│   │   ├── dtos/<feature>/request/    # <action>-<entity>.request.dto.ts
│   │   ├── dtos/<feature>/response/   # <entity>.response.dto.ts
│   │   ├── dtos/common/               # pagination-query-params.dto.ts, paginated-response.dto.ts
│   │   ├── interfaces/
│   │   │   ├── repositories/          # <entity>.repository.interface.ts
│   │   │   ├── services/              # <capability>.service.interface.ts
│   │   │   ├── use-cases/<feature>/   # <action>-<entity>.usecase.interface.ts
│   │   │   ├── use-cases/base.usecase.interface.ts
│   │   │   └── IMapper.ts
│   │   ├── mappers/                   # <entity>.mapper.ts — domain → response DTO functions
│   │   ├── helpers/                   # cross-use-case application helpers
│   │   └── use-cases/<feature>/       # <action>-<entity>.usecase.ts
│   ├── infrastructure/
│   │   ├── database/
│   │   │   ├── postgres.ts            # pool/client + connectDatabase()
│   │   │   ├── models/                # <entity>.model.ts — table/row types (snake_case)
│   │   │   ├── migrations/            # timestamped SQL/ORM migrations
│   │   │   ├── mappers/               # <entity>.mapper.ts — row ↔ domain (implements IMapper)
│   │   │   └── repositories/          # <entity>.repository.ts + base.repository.ts
│   │   ├── queue/                     # BullMQ
│   │   │   ├── queue.names.ts         # QUEUE_NAMES, JOB_NAMES
│   │   │   ├── queues/                # <name>.queue.ts
│   │   │   └── workers/               # <name>.worker.ts
│   │   ├── integrations/              # external systems
│   │   │   ├── wazuh/                 # wazuh-api.service.ts, wazuh-alert.parser.ts
│   │   │   ├── nvd/                   # nvd-cve.service.ts
│   │   │   └── entra-id/              # entra-id-auth.service.ts
│   │   ├── services/                  # <vendor>-<capability>.service.ts (winston-logger, jwt, bcrypt-hash…)
│   │   ├── ai/                        # Scout: graph/, tools/, constants/, utils/
│   │   ├── socket/                    # socket.service.ts
│   │   └── di/
│   │       ├── container.ts           # registers everything, resolves & exports controllers + logger
│   │       ├── repositories.dependency.ts
│   │       ├── services.dependency.ts
│   │       └── usecases/              # <feature>.dependency.ts + index.ts (registerAllUseCases)
│   ├── presentation/
│   │   ├── controllers/               # <feature>.controller.ts
│   │   ├── routes/                    # <feature>.routes.ts
│   │   ├── validators/                # <feature>.schema.ts + common.schema.ts (zod)
│   │   ├── middlewares/               # <name>.middleware.ts
│   │   ├── http/helpers/              # IAPIResponse.ts, implementation/apiResponse.ts
│   │   └── utils/                     # catch-async.ts, require-user-id.ts, require-company-id.ts
│   └── shared/
│       ├── di/                        # repository.tokens.ts, service.tokens.ts, usecase.tokens.ts
│       └── utils/                     # <topic>.util.ts — pure, framework-free
├── tests/                             # tests/unit/application/use-cases/<feature>/...
├── scripts/
├── eslint.config.js
├── tsconfig.json
├── Dockerfile
└── .env.example
```

Sentinel feature folder names: `auth` · `user` · `company` · `agent` · `alert` · `fim` · `vulnerability` · `malware` · `config-assessment` · `mitre` · `threat-hunting` · `scout` · `super-admin` · `common`

## 3. File naming (backend)

| Kind                  | Pattern                                | Example                                             |
| --------------------- | -------------------------------------- | --------------------------------------------------- |
| Entity                | `kebab-case.entity.ts`                 | `agent.entity.ts`, `fim-event.entity.ts`            |
| Enum / message object | `PascalCase.ts` in `domain/enums/`     | `Severity.ts`, `AgentStatus.ts`, `ErrorMessage.ts`  |
| Domain type           | `kebab-case.ts` in `domain/types/`     | `cve-version-range.ts`                              |
| Request DTO           | `<action>-<entity>.request.dto.ts`     | `register-agent.request.dto.ts`                     |
| Response DTO          | `<entity>.response.dto.ts`             | `agent.response.dto.ts`                             |
| Use case              | `<verb>-<entity>.usecase.ts`           | `get-company-agents.usecase.ts`                     |
| Use case interface    | `<verb>-<entity>.usecase.interface.ts` | `get-company-agents.usecase.interface.ts`           |
| Repository interface  | `<entity>.repository.interface.ts`     | `vulnerability.repository.interface.ts`             |
| Repository impl       | `<entity>.repository.ts`               | `vulnerability.repository.ts`                       |
| Service interface     | `<capability>.service.interface.ts`    | `siem-agent.service.interface.ts`                   |
| Service impl          | `<vendor>-<capability>.service.ts`     | `wazuh-api.service.ts`, `winston-logger.service.ts` |
| Model (row types)     | `<entity>.model.ts`                    | `alert.model.ts`                                    |
| Mapper                | `<entity>.mapper.ts`                   | `alert.mapper.ts`                                   |
| Controller            | `<feature>.controller.ts`              | `agent.controller.ts`                               |
| Routes                | `<feature>.routes.ts`                  | `threat-hunting.routes.ts`                          |
| Zod schemas           | `<feature>.schema.ts`                  | `agent.schema.ts`                                   |
| Middleware            | `<name>.middleware.ts`                 | `auth.middleware.ts`, `role.middleware.ts`          |
| DI registration       | `<feature>.dependency.ts`              | `agent.dependency.ts`                               |
| Queue / worker        | `<name>.queue.ts` / `<name>.worker.ts` | `alert-ingest.queue.ts`                             |
| Shared util           | `<topic>.util.ts`                      | `semver-range.util.ts`                              |
| Test                  | `<file-under-test>.spec.ts`            | `register-agent.usecase.spec.ts`                    |

## 4. Identifier naming

| Thing                       | Convention                                                    | Example                                                |
| --------------------------- | ------------------------------------------------------------- | ------------------------------------------------------ |
| Entity class                | PascalCase, no suffix                                         | `Agent`, `FimEvent`, `Vulnerability`                   |
| Interfaces (contracts)      | `I` + PascalCase                                              | `IAgentRepository`, `ILogger`, `IRegisterAgentUseCase` |
| Use case class              | `<Verb><Entity>UseCase`                                       | `RegisterAgentUseCase`                                 |
| Repository class            | `<Entity>Repository`                                          | `AgentRepository`                                      |
| Service class               | `<Vendor><Capability>Service`                                 | `WazuhApiService`, `BcryptHashService`                 |
| Controller class / instance | `<Feature>Controller` / `<feature>Controller`                 | `AgentController` / `agentController`                  |
| Router export               | `<feature>Router` (named)                                     | `export const agentRouter = router;`                   |
| DTO type                    | `<Action><Entity>RequestDto`, `<Entity>ResponseDto`           | `RegisterAgentRequestDto`, `AgentResponseDto`          |
| Row/model type              | `I<Entity>Row`                                                | `IAgentRow`                                            |
| Infra mapper class          | `<Entity>Mapper implements IMapper<…>`                        | `AgentMapper`                                          |
| App mapper fn               | `to<Entity>ResponseDto`                                       | `toAgentResponseDto`                                   |
| Zod schema                  | camelCase + `BodySchema` / `ParamsSchema` / `QuerySchema`     | `registerAgentBodySchema`, `agentParamsSchema`         |
| Enum name / members         | PascalCase / UPPER_SNAKE with lowercase string values         | `Severity.CRITICAL = "critical"`                       |
| Message constants           | as const objects, UPPER_SNAKE keys                            | `ErrorMessage.AGENT_NOT_FOUND`                         |
| DI tokens                   | UPPER_SNAKE object, key = interface name, value = same string | `REPOSITORY_TOKENS.IAgentRepository`                   |
| Private injected fields     | `private readonly _camelCase`                                 | `private readonly _agentRepository`                    |
| Constants                   | UPPER_SNAKE                                                   | `MAX_ALERT_PAGE_SIZE`                                  |
| Variables / functions       | camelCase, verbs for functions                                | `normalizeHostname()`, `isValidCidr()`                 |
| Booleans                    | is/has/can/should prefix                                      | `isActive`, `hasPendingScan`                           |
| DB tables / columns         | snake_case, tables plural                                     | `fim_events.agent_id`, `created_at`                    |
| Domain/DTO fields           | camelCase (mapper translates)                                 | `agentId`, `createdAt`                                 |
| URL paths                   | kebab-case, plural resources, `:camelCaseId` params           | `/api/agents/:agentId/fim-events`                      |
| Queue / job names           | kebab-case strings in constants                               | `QUEUE_NAMES.ALERT_INGEST = "alert-ingest"`            |
| Socket events               | snake_case past tense                                         | `alert_created`, `agent_status_changed`                |

## 5. Domain layer rules

- Entities are classes with public constructor parameter properties; required fields first, optional/defaulted after, then `id?`, `createdAt?`, `updatedAt?` last.
- State changes are methods on the entity (e.g. `archive()`), not ad-hoc property writes in use cases.
- Fixed value sets → enums in `domain/enums/`.
- All user-facing text lives in `ErrorMessage` / `SuccessMessage` const objects.
- `AppError(message, HttpStatusCode)` is the only error type thrown for expected failures.

## 6. Application layer rules

- Use cases: One class per action, one file per class, one public method: `execute(payload)`. Returns response DTO or throws AppError.
- Builds response DTOs with `application/mappers/<entity>.mapper.ts` functions.
- Depends only on interfaces injected by token. No Express types, no ORM, no process.env.
- Side effects go through a service interface, never SocketService.getInstance().
- DTOs: plain interfaces, camelCase fields. Request DTOs include trusted context (companyId, requestUserId).
- Repository interfaces: extend `IBaseRepository<TDomain, TTx>`; every tenant-scoped finder takes `companyId` as first argument.

## 7. Infrastructure layer rules

- Every repository extends the base repository and goes through its mapper.
- Mappers implement `IMapper<TDomain, TRow>` with `toDomain` and `toPersistence`.
- Postgres: parameterised queries only, UUID primary keys, created_at/updated_at timestamptz.
- Services implement an application interface and are named by vendor.
- Registration: repositories & services → `registerSingleton`; use cases → `register(TOKEN, { useClass })` in `<feature>.dependency.ts`.
- Workers resolve and call use cases, never repositories.

## 8. Presentation layer rules

- Controllers: `@injectable()` class, constructor-injected use case interfaces only.
- Each handler is an arrow-function property wrapped in `catchAsync`, named `<verb><Resource>`.
- Handler body: read validated input → build DTO → execute → `res.status().json(ApiResponse.success(..., data))`. No business logic.
- Get identity via `requireUserId(req)` / `requireCompanyId(req)`.
- Routes: one router per feature. Middleware order: authMiddleware → requireRole(...) → feature guards → validate(...) → controller.handler.
- Validation: zod at the request boundary only. Uses `.strict()` on body schemas.
- Response envelope: `{ success: true, message: string, data?: T }` or `{ success: false, message: string, error: { message: string, code: string } }`.
- Error handling: single `errorHandler` registered last in `app.ts`. Never send stack traces to client.

## 9. Config, logging, security

- `config/env.config.ts` parses process.env with a zod schema at boot and process.exit(1) on failure. No fallbacks for secrets.
- Logging: `ILogger` implemented by `WinstonLogger`. `console.*` is a lint error.
- Multi-tenancy: `companyId` always comes from authenticated principal. Repositories filter every tenant query by `company_id`.
- Auth: Entra ID tokens verified in `entra-id-auth.service.ts`; app roles map to `Role`.
- Cookies: httpOnly, secure in prod, sameSite from config. Rate-limit auth endpoints, set helmet, CORS.

## 10. Frontend structure & naming (`client/`)

(Applies to the frontend Vite React app)

- Global/shared state → Redux Toolkit slice; Server data that's page-local → custom hook.
- Helper `getApiErrorMessage(err: unknown)` in `utils/api-error.utils.ts`.
- No `any`.
- Severity colours live in one map (`utils/severity.utils.ts`). Render untrusted strings as text or sanitize with DOMPurify.

## 11. Tooling, CI, git

- ESLint with `@typescript-eslint/no-explicit-any: "error"`, `no-console: "error"`, `no-unused-vars` with `argsIgnorePattern: "^_"`.
- Indentation: 4 spaces server, 2 spaces client. Double quotes server, single quotes client. Enforce with Prettier.
- CI Pipeline: `npm ci` → `lint` → `typecheck` → `unit tests` → `npm audit` → `secret scan` → `build` → `Docker image`.
- Commits: Conventional Commits with feature-folder scopes: `feat(agent)`, `fix(fim)`. Branches: `feat/<scope>-<short-desc>`.

## 12. Checklist — adding a backend feature

1. `domain/enums/` — new enum(s) + ErrorMessage / SuccessMessage keys
2. `domain/entities/<entity>.entity.ts`
3. `infrastructure/database/migrations/` + `models/<entity>.model.ts`
4. `application/interfaces/repositories/<entity>.repository.interface.ts`
5. `infrastructure/database/mappers/<entity>.mapper.ts` → `repositories/<entity>.repository.ts`
6. `shared/di/repository.tokens.ts` + `infrastructure/di/repositories.dependency.ts`
7. `application/dtos/<feature>/request|response/…dto.ts`
8. `application/mappers/<entity>.mapper.ts`
9. `application/interfaces/use-cases/<feature>/<action>-<entity>.usecase.interface.ts`
10. `application/use-cases/<feature>/<action>-<entity>.usecase.ts`
11. `shared/di/usecase.tokens.ts` + `infrastructure/di/usecases/<feature>.dependency.ts`
12. `presentation/validators/<feature>.schema.ts`
13. `presentation/controllers/<feature>.controller.ts` → resolve in `infrastructure/di/container.ts`
14. `presentation/routes/<feature>.routes.ts` → mount in `app.ts`
15. `tests/unit/application/use-cases/<feature>/<action>-<entity>.usecase.spec.ts`

Before finishing any change, verify: no layer-rule violation · no any / console · all strings from message constants · tenant filter present · zod schema on every route input · new env vars in `.env.example` · lint + typecheck pass.
