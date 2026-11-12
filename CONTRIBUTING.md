# Contributing Guidelines

## Commit Message Convention

This project strictly follows the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) specification to automate semantic versioning and CHANGELOG generation.

Every commit message must follow this format:

```text
<type>(<scope>): <subject>

<body>

<footer>
```

### Types
* **feat**: New feature (triggers MINOR version bump)
* **fix**: Bug fix (triggers PATCH version bump)
* **docs**: Documentation only changes
* **style**: Formatting, missing semi-colons, whitespace (no logic change)
* **refactor**: Code change that neither fixes a bug nor adds a feature
* **perf**: Code change that improves performance
* **test**: Adding missing tests or correcting existing tests
* **build**: Changes that affect the build system or external dependencies
* **ci**: Changes to CI configuration files and scripts
* **chore**: Maintenance changes that don't modify `src` or `test` files
* **revert**: Reverts a previous commit

### Allowed Scopes
When a scope is used, it **must** be one of the following:
* `auth` - Authentication, tokens, logins
* `api` - Backend API routes, controllers
* `db` - Database models, queries, connections
* `ui` - Frontend components, styles
* `ingest` - Log or data ingestion logic/workers
* `deps` - Dependency updates (npm, Docker)
* `ci` - GitHub Actions, Husky hooks
* `security` - Security audits, vulnerability fixes

### Subject Line Rules
- Use the **imperative mood**: "add", not "added" or "adds". Test it by reading it as: *"This commit will ___"*.
- Start with a lowercase letter.
- Do not end with a period.
- Keep the subject line to 50 characters (72 is the hard limit).
- Describe **what** changed, not how. The body covers the why.

### Body & Footer
- The body explains the **why** and wraps at 72 characters.
- The footer holds metadata like `Closes #123`.

### Breaking Changes
A breaking change (triggers a MAJOR version bump) can be marked in two ways (using both is encouraged):
1. Adding a `!` after the scope: `feat(api)!: change response`
2. Adding `BREAKING CHANGE:` in the footer.

**Example:**
```text
feat(api)!: change /alerts response to paginated shape

BREAKING CHANGE: /alerts now returns { data, nextCursor } instead of an array.
```
