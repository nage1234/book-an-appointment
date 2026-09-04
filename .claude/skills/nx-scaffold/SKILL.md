---
name: nx-scaffold
description: Generate Nx apps and libraries for book-an-appointment with the repo's naming, tags, and folder conventions. Use when adding a new app or lib to the monorepo.
---

# Nx scaffold

The monorepo layout and rules are in [docs/architecture.md](../../../docs/architecture.md).
apps are thin wiring; all logic lives in `libs`.

## Conventions

- Frontend libs live under `libs/web/*`, backend under `libs/api/*`, shared under `libs/shared/*`.
- Import path: `@book-an-appointment/<group>-<name>` (e.g. `@book-an-appointment/web-feature-auth`).
- Tags (enforce boundaries in `.eslintrc` / `nx.json`):
  - `scope:web` | `scope:api` | `scope:shared`
  - `type:app` | `type:feature` | `type:ui` | `type:data-access` | `type:util`
- Boundary rules: `scope:web` cannot import `scope:api`; everything may import `scope:shared`;
  `type:feature` may import `ui`/`data-access`/`util`; `ui` imports only `ui`/`util`.

## Commands

### React feature lib
```
nx g @nx/react:library feature-<name> \
  --directory=libs/web/feature-<name> \
  --importPath=@book-an-appointment/web-feature-<name> \
  --tags=scope:web,type:feature \
  --unitTestRunner=vitest --bundler=none --style=none
```

### React UI / data-access lib
```
nx g @nx/react:library <name> --directory=libs/web/<name> \
  --importPath=@book-an-appointment/web-<name> \
  --tags=scope:web,type:<ui|data-access> \
  --unitTestRunner=vitest --bundler=none --style=none
```

### Node/backend lib
```
nx g @nx/js:library <name> --directory=libs/api/<name> \
  --importPath=@book-an-appointment/api-<name> \
  --tags=scope:api,type:<data-access|feature|util> \
  --unitTestRunner=jest --bundler=tsc
```

### Shared types lib
```
nx g @nx/js:library types --directory=libs/shared/types \
  --importPath=@book-an-appointment/shared-types \
  --tags=scope:shared,type:util --bundler=tsc
```

### Apps (M0 only)
```
nx g @nx/react:app web --directory=apps/web --bundler=vite --style=none --unitTestRunner=vitest --e2eTestRunner=playwright
nx g @nx/node:app api --directory=apps/api --framework=express --unitTestRunner=jest
```

## After generating

- Delete the sample component/spec the generator adds; export the real public API from `src/index.ts`.
- A new `libs/api/*` lib: no direct `pg` — depend on `@book-an-appointment/api-data-access`.
- A new `libs/web/feature-*`: expose a routed page component; register its route in `apps/web`.
- Run `nx graph` to confirm no boundary violations.
