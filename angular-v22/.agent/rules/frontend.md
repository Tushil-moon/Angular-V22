# Angular V22 Frontend — Agent Rules

You are an expert in TypeScript, Angular 22, and scalable web application development. This is the **angular-v22** frontend in a full-stack monorepo. The API lives in `../prisma-backend` at `http://localhost:3000` (proxied via `proxy.conf.json`).

## Project layout

- `src/app/features/` — route-level pages (auth, dashboard, users, roles, settings)
- `src/app/services/` — API clients, auth, theme, dialog, toast
- `src/app/shared/components/` — shadcn-style UI (buttons, cards, dialogs, flex-table)
- `src/app/shared/layouts/` — auth and admin shell (sidebar + inset panel)
- `src/styles.scss` — Tailwind layers, design tokens, sidebar/shell styles
- Path aliases: `@services`, `@shared`, `@features`, `@utils`, `@models`

## TypeScript

- Strict typing; prefer inference when obvious
- Avoid `any`; use `unknown` when uncertain
- Use Zod + `safeValidate()` in `@utils/validators` for form payloads

## Angular conventions

- Standalone components only; do **not** set `standalone: true` (default in v20+)
- Use `input()` / `output()` instead of decorators
- Use `inject()` instead of constructor injection; no constructors for DI or setup — use field initializers for `effect()`, `afterNextRender()`, and subscriptions
- Use signals + `computed()` for state; never `mutate`, use `update` / `set`
- Native control flow: `@if`, `@for`, `@switch` — not `*ngIf` / `*ngFor`
- No `ngClass` / `ngStyle` — use `class` / `style` bindings
- Host bindings go in the `host` object, not `@HostBinding` / `@HostListener`
- Lazy routes with `loadComponent`; keep layouts/guards eager
- **`ChangeDetectionStrategy.OnPush`** on every component (CLI default in `angular.json` schematics)

## Angular v22 features

- **`rxResource()`** — use for async *reads* (lists, session restore, policies); define a `stream` factory that returns an `Observable`
- **`resource()`** — avoid promise-based loaders; prefer `rxResource` + Observables
- **`inject()`** — prefer over constructor injection
- **`@Service()`** — preferred for new root singletons (e.g. `AuthService`)
- **Signal Forms** — prefer for new auth/forms screens
- **No `async`/`await`** — services return `Observable`; components use `.pipe().subscribe()` or derive UI from `rxResource` signals

## HTTP & auth

- Use `HttpClientService` — all methods return `Observable<ApiResponse<T>>`
- Use RxJS operators: `tap`, `map`, `switchMap`, `catchError`, `finalize`, `from` (for router navigation promises only)
- `AuthService`: signals for user/loading/error; `sessionResource` (`rxResource`) for bootstrap; `ensureSessionReady(): Observable<void>` in guards
- Gate list resources on `AuthService.isAuthenticated()`
- Use `catchResourceStreamError<T>()` from `@shared/utils/resource-error` inside `rxResource` streams
- API base: `/api/v1` (dev proxy to backend)

## UI / design

- shadcn-style dark/light theme via CSS variables on `:html` / `.dark`
- Reuse shared components; match existing spacing, badges, flex-table patterns
- Dialogs via `DialogService` + CDK overlay; `openLazy()` returns `Observable<DialogRef>`
- Mobile-first flex layouts; compact table empty states
- Lucide icons via `app-icon` and `@shared/icons/app-icons.ts`

## Accessibility

- WCAG AA: focus management, contrast, ARIA on dialogs/menus
- Dialogs: `role="dialog"`, `aria-modal`, `cdkTrapFocus`

## Do not

- Use `async`/`await`, `firstValueFrom`, or `lastValueFrom` in application code
- Use promise-based `resource({ loader: async ... })` when `rxResource` fits
- Add NgModules, barrel circular imports, or hand-rolled loading flags when `rxResource` fits
- Commit secrets or change unrelated files in a focused task
- Push to git unless explicitly asked

## Reference

- API patterns: [`API_INTEGRATION.md`](../API_INTEGRATION.md)
