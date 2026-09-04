---
name: add-api-endpoint
description: Add a REST endpoint to the Express API following the repo's route -> logic -> data-access layering and error conventions. Use when adding or changing a backend endpoint.
---

# Add an API endpoint

Conventions: [docs/architecture.md](../../../docs/architecture.md#api-conventions).
Base path `/api`. JSON only. Bearer auth (from M2). Error shape: a 4xx/5xx status
with `{ error: { message } }`.

## Layers (keep them separate)

```
apps/api/src/routes/<area>.ts       HTTP only: read + validate input, call logic, shape response
libs/api/<area>/src/*.ts            business rules — no req/res, no SQL
libs/api/data-access/src/*.ts       SQL only, via the shared pg Pool
libs/shared/types (@baa/types)      response shapes + enums (imported by web too)
```

For a tiny endpoint it's fine to keep the logic inline in the route — split into
a lib once there's a real rule to test or reuse.

## Steps

1. **Types** — add response shapes / enums to `@baa/types` if the web side needs them.
2. **Data access** — in `libs/api/data-access`, a function running **parameterised**
   SQL (`pool.query('... where id = $1', [id])`). Map `snake_case` → `camelCase` once, here.
3. **Logic** — apply the rule. For expected failures, return a tagged result or
   throw an `Error` the route maps to a status. Catch Postgres unique-violation
   (`err.code === '23505'`) → `409`.
4. **Route** — in `apps/api/src/routes/<area>.ts`:
   - Validate input by hand (check presence/type/range). Add `zod` only once a
     route has enough fields that hand-checking is worse — it's not installed yet.
   - Apply `requireAuth` / `requireAdmin` middleware (M2); ownership checks in the logic.
   - `res.status(201).json({ appointment })` / `res.status(409).json({ error: { message } })`.
5. **Register** the router in `apps/api/src/main.ts` (`app.use('/api/<area>', router)`).
6. **Check manually** — `curl` the happy path + the main failure (401 / 403 / 409).

## Checklist

- [ ] Parameterised SQL only (no string interpolation)
- [ ] Input validated; bad input → `400`
- [ ] Expected failures return a real status, not a 500
- [ ] Ownership / role checked
- [ ] Response shape in `@baa/types` if web consumes it
