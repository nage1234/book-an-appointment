---
name: add-api-endpoint
description: Add a REST endpoint to the Express API following the repo's route -> service -> repository layering, zod validation, and error conventions. Use when adding or changing a backend endpoint.
---

# Add an API endpoint

API conventions are in [docs/architecture.md](../../../docs/architecture.md#api-conventions).
Base path `/api`. JSON only. Bearer auth. Errors: `{ error: { message, code? } }`.

## Layers (never skip one)

```
apps/api/src/routes/<area>.ts      HTTP only: parse+validate (zod), call service, shape response
libs/api/<area>/src/*.ts           business rules, no req/res, no SQL
libs/api/data-access/src/*Repo.ts  SQL only, via the shared pg Pool
libs/shared/types                  request/response DTOs + enums (imported by web too)
```

## Steps

1. **DTOs** — add/extend types in `libs/shared/types` (`FooRequest`, `FooResponse`).
2. **Repository** — in `libs/api/data-access`, add a function that runs the SQL
   with parameterised queries (`pool.query('... $1', [x])`). Return plain rows
   mapped to domain objects (snake_case → camelCase here, once).
3. **Service** — in `libs/api/<area>`, implement the rule. Throw `http-errors`
   (`createError(409, 'Slot taken', { code: 'SLOT_TAKEN' })`) for expected failures.
   Catch Postgres unique‑violation (`err.code === '23505'`) and rethrow as `409`.
4. **Route** — in `apps/api/src/routes/<area>.ts`:
   - `const body = FooSchema.parse(req.body)` (zod) — invalid → `400` via error middleware.
   - Apply `requireAuth` / `requireAdmin` middleware as needed; owner checks go in the service.
   - `res.status(201).json({ appointment: mapAppointment(result) })`.
5. **Register** the router in `apps/api/src/app.ts` under `/api`.
6. **Test** — `supertest` in `apps/api-e2e` or the lib's jest spec: happy path,
   validation `400`, auth `401`, and the key `409`/`403` rule.
7. **Web** — add the matching RTK Query endpoint (see `add-web-feature` skill) with
   correct `providesTags` / `invalidatesTags`.

## Error middleware (already in app.ts)

Central handler: zod error → `400` with issues; `http-errors` → its status/message;
anything else → `500` + logged via pino. Never `res.json` an error inline in a route.

## Checklist

- [ ] Parameterised SQL only (no string interpolation)
- [ ] zod schema for every body/query
- [ ] Expected failures are `http-errors`, not generic 500s
- [ ] Ownership/role checked
- [ ] DTO in `shared/types`, used on both sides
- [ ] Test covers the main rule
