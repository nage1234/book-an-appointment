---
name: nx-scaffold
description: Generate Nx apps and libraries for book-an-appointment with the repo's naming, tags, and folder conventions. Use when adding a new app or lib to the monorepo.
---

# Nx scaffold

Layout and rules: [docs/architecture.md](../../../docs/architecture.md).
apps are thin wiring; logic lives in `libs`. Nx 21, integrated monorepo, npm.
**No eslint, no test runner in this repo** — always generate with
`--linter=none --unitTestRunner=none`.

## Running nx in this repo

The `proto` toolchain shims break under the agent shell (recursive exec). Prefix
commands with a clean PATH to real Node **26.7.0**:

```
export PATH="$HOME/.proto/tools/node/26.7.0/bin:/usr/bin:/bin:/usr/sbin:/sbin"
npx nx <...>
```

## Conventions

- Frontend libs under `libs/web/*`, backend under `libs/api/*`, shared under `libs/shared/*`.
- Import path: `@baa/<name>` (scope `@baa`). Existing: `@baa/types`, `@baa/ui`.
  Planned: `@baa/web-auth`, `@baa/web-dashboard`, `@baa/web-booking`,
  `@baa/api-data-access`, `@baa/api-auth`, `@baa/api-availability`, `@baa/api-appointments`.
- Tags (set in `project.json`; enforce with a boundary rule only if/when eslint is added):
  - `scope:web` | `scope:api` | `scope:shared`
  - `type:app` | `type:feature` | `type:ui` | `type:data-access` | `type:util`
- Intended boundaries: `scope:web` can't import `scope:api`; everyone may import
  `scope:shared`; `type:feature` imports `ui`/`data-access`/`util`; `type:ui`
  imports only `ui`/`util`.

## Commands (Nx 21 — path is the first arg)

### React feature lib (auth, dashboard, booking)
```
npx nx g @nx/react:library libs/web/<name> \
  --importPath=@baa/web-<name> \
  --tags=scope:web,type:feature \
  --bundler=none --unitTestRunner=none --linter=none --component=false
```

### React ui lib
```
npx nx g @nx/react:library libs/web/<name> \
  --importPath=@baa/web-<name> \
  --tags=scope:web,type:ui \
  --bundler=none --unitTestRunner=none --linter=none --component=false
```

### Node/backend lib
```
npx nx g @nx/js:library libs/api/<name> \
  --importPath=@baa/api-<name> \
  --tags=scope:api,type:<data-access|feature|util> \
  --bundler=tsc --unitTestRunner=none --linter=none
```

### Shared lib
```
npx nx g @nx/js:library libs/shared/<name> \
  --importPath=@baa/<name> \
  --tags=scope:shared,type:util \
  --bundler=tsc --unitTestRunner=none --linter=none
```

## After generating

- Delete the sample `src/lib/<name>.ts` + `.babelrc` the generator adds (no babel
  config needed — vite/esbuild compile these). Export the real API from `src/index.ts`.
- Set `tags` in the new `project.json` if the generator didn't.
- A new `libs/api/*` lib runs no SQL directly — depend on `@baa/api-data-access`.
- A new `libs/web/<feature>` exposes a routed page component; mount its route in
  `apps/web/src/app/app.tsx`.
- Verify: `npx nx build <project>` and `npx tsc -p <project>/tsconfig.lib.json --noEmit`.
- `npx nx graph` to sanity-check the dependency edges.
