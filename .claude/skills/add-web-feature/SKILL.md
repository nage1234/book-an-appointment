---
name: add-web-feature
description: Add or extend a React feature in the web app - MUI screen, routing, RTK Query data access, and auth guarding, following repo conventions. Use when building or changing a customer/admin-facing screen.
---

# Add a web feature

Layout and state rules: [docs/architecture.md](../../../docs/architecture.md).
Features talk to the server **only** through the RTK Query `api` in
`libs/web/data-access` — never `fetch` directly.

## Where things go

```
libs/web/feature-<name>/src/     screens, dialogs, feature-local components & hooks
libs/web/data-access/src/        redux store, api (RTK Query), auth slice, shared hooks
libs/web/ui/src/                 theme + reusable presentational components (no data)
apps/web/src/app/                router, providers — register the route here
libs/shared/types                DTOs & enums (import, don't redefine)
```

## Steps

1. **Scaffold** the lib if new — see `nx-scaffold` skill.
2. **Data access** — in `libs/web/data-access`, add endpoints to the RTK Query `api`:
   ```ts
   getAvailability: build.query<AvailabilityResponse, {year:number; month:number}>({
     query: ({year,month}) => `/availability?year=${year}&month=${month}`,
     providesTags: ['Availability'],
   }),
   bookAppointment: build.mutation<AppointmentResponse, BookRequest>({
     query: (body) => ({ url: '/appointments', method: 'POST', body }),
     invalidatesTags: ['Availability', 'MyAppointments'],
   }),
   ```
   `baseQuery` already injects `Authorization` from the auth slice and dispatches
   logout on `401`.
3. **Screen** — MUI components via `sx` / `styled`. Forms: `react-hook-form` +
   `zodResolver` with the schema from `shared/types`. Handle loading / error /
   empty explicitly (`isLoading`, `error`, disable buttons while `isLoading` on mutations).
4. **Route** — register in `apps/web/src/app` router. Wrap protected routes in
   `<RequireAuth>` (redirects to `/login`); role‑restricted in `<RequireAuth role="admin">`.
5. **Feedback** — success/error via the shared snackbar (in `web/ui`). Don't
   optimistically mutate the cache; rely on `invalidatesTags` + refetch.
6. **Test** — `@testing-library/react`: render with a mock store/api, assert the
   key interaction (e.g. clicking a green cell opens the confirm dialog).

## Conventions

- **Styling: follow the `ui-components` skill** — buttons, typography, colours,
  links all come from the shared MUI theme. No one‑off hex or font sizes.
- No colour‑only meaning — pair slot colours with an icon/letter for a11y.
- Keep screens presentational; push logic into hooks in the feature lib.
- Shared, reusable, data‑free components graduate to `web/ui`.
- All money/date formatting via `dayjs` + a shared formatter, not inline.

## Checklist

- [ ] Server access only through the RTK Query `api`
- [ ] `providesTags` / `invalidatesTags` set so the grid stays fresh
- [ ] Route guarded with `<RequireAuth>` (+ role where needed)
- [ ] loading / error / empty states handled
- [ ] enums & DTOs imported from `shared/types`
- [ ] one interaction test
