---
name: add-web-feature
description: Add or extend a React feature in the web app - MUI screen, routing, data fetching, and auth guarding, following repo conventions. Use when building or changing a customer/admin-facing screen.
---

# Add a web feature

Layout and state rules: [docs/architecture.md](../../../docs/architecture.md).
Keep it plain: React state + `fetch`. This app's only piece of global state
(the session) lives in one `AuthContext` — do **not** add Redux / React Query /
a form library unless a concrete need has clearly outgrown the plain approach —
if you think you've hit that point, say so and ask first.

## Where things go

```
libs/web/<name>/src/       screens, dialogs, feature-local components & hooks
libs/web/ui/src/           theme + reusable presentational components (no data)
apps/web/src/app/app.tsx   router — mount feature routes here
apps/web/src/app/AuthContext.tsx  session (token, user) + useAuth() hook
apps/web/src/app/apiFetch.ts      the one shared fetch wrapper
libs/shared/types          enums & DTOs (import, don't redefine)
```

## Steps

1. **Scaffold** the lib if new — see `nx-scaffold` skill.
2. **Data access** — call the API only through `apiFetch(path, opts)`
   (`apps/web/src/app/apiFetch.ts`): prefixes `import.meta.env.VITE_API_URL`,
   sets `Content-Type`, adds `Authorization: Bearer` from `useAuth()`'s token,
   throws on non-2xx, and calls `useAuth().logout()` + redirects on `401`. One
   wrapper, reused everywhere — feature code never calls bare `fetch`.
3. **Screen** — MUI components via `sx` / `styled`. Forms: controlled inputs +
   `useState` + a small validate function. Handle loading / error / empty
   explicitly; disable the submit button while the request is in flight.
4. **Route** — register in `apps/web/src/app/app.tsx`. Wrap protected routes in a
   `<RequireAuth>` guard (redirect to `/login`); role-gate with
   `<RequireAuth role="admin">`.
5. **Refresh after mutate** — just re-run the relevant GET after a successful
   POST (e.g. refetch availability after booking). No cache layer.
6. **Feedback** — a simple MUI `Snackbar` for success/error.

## Conventions

- **Styling: follow the `ui-components` skill** — buttons, typography, colours,
  links all come from the shared MUI theme. No one-off hex or font sizes.
- Responsive: mobile-first, verify at 360px (see the `ui-components` skill).
- No colour-only meaning — pair slot colours with an icon/letter.
- Keep screens presentational; push logic into hooks in the feature lib.
- Reusable, data-free components graduate to `@baa/ui`.
- Enums & shared response shapes come from `@baa/types`.

## Checklist

- [ ] API called only through the shared `fetch` wrapper
- [ ] loading / error / empty states handled; submit disabled while pending
- [ ] route guarded (+ role where needed)
- [ ] data re-fetched after a mutation
- [ ] enums & DTOs from `@baa/types`
- [ ] renders cleanly at 360px wide
