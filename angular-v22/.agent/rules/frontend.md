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
- Use `inject()` instead of constructor injection
- Use signals + `computed()` for state; never `mutate`, use `update` / `set`
- Native control flow: `@if`, `@for`, `@switch` — not `*ngIf` / `*ngFor`
- No `ngClass` / `ngStyle` — use `class` / `style` bindings
- Host bindings go in the `host` object, not `@HostBinding` / `@HostListener`
- Lazy routes with `loadComponent`; keep layouts/guards eager

## Angular v22 features

- **`resource()`** — async reads with reactive `params`; use `runResourceLoader()` + `hasValue()` before `.value()`; pass `abortSignal` to axios calls
- **`injectAsync()`** — lazy-load heavy services; prefetch with `onIdle` when appropriate
- **`@defer`** — below-the-fold UI; always provide a single-root `@placeholder` / `@loading`
- **Signal Forms** — new forms in signal-based features (`form`, `schema`, `FormField`, `submit`)
- **Reactive Forms** — legacy screens until migrated

## HTTP & auth

- Use `HttpClientService` (axios), not Angular `HttpClient`
- Gate resources on `AuthService.isAuthenticated()`; await `ensureSessionReady()` in guards
- API base: `/api/v1` (dev proxy to backend)

## UI / design

- shadcn-style dark/light theme via CSS variables on `:html` / `.dark`
- Reuse shared components; match existing spacing, badges, flex-table patterns
- Dialogs via `DialogService` + CDK overlay; backdrop uses `--overlay-backdrop` with blur
- Mobile-first flex layouts; compact table empty states
- Lucide icons via `app-icon` and `@shared/icons/app-icons.ts`

## Accessibility

- WCAG AA: focus management, contrast, ARIA on dialogs/menus
- Dialogs: `role="dialog"`, `aria-modal`, `cdkTrapFocus`

## Do not

- Add NgModules, barrel circular imports, or hand-rolled loading flags when `resource()` fits
- Commit secrets or change unrelated files in a focused task
- Push to git unless explicitly asked
