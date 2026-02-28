# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server on port 8080
npm run build        # Production build (output: dist/)
npm run lint         # ESLint check
npm test             # Run tests once (Vitest)
npm run test:watch   # Run tests in watch mode
npm run preview      # Preview production build
```

**Install**: `npm install --legacy-peer-deps` (required due to peer dep conflicts)

**Deployment**: Netlify (auto-deploys on push). To sync from upstream: `./sync.sh`

## Architecture

**DeFarm Net** is a React 18 SPA for agricultural supply chain management. All API requests go through a single gateway (`VITE_API_BASE_URL`, defaults to `https://gateway.defarm.net`).

### Stack

- **Vite + SWC** for builds, **TypeScript** (relaxed: `noImplicitAny: false`, `strictNullChecks: false`)
- **React Router v6** for routing, **TanStack Query v5** for server state
- **shadcn/ui** (Radix UI primitives) + **Tailwind CSS** for UI
- **React Hook Form + Zod** for forms, **i18next** for i18n (Portuguese primary)
- **Vitest** for testing

### API Layer (`src/lib/api/`)

- `client.ts` — core `registryRequest` and `authRequest` helpers with automatic JWT token refresh on 401
- Tokens stored in localStorage; refresh token logic lives in `client.ts`
- Individual modules: `items.ts`, `circuits.ts`, `dfid.ts`, `events.ts`, `audit.ts`, `snapshots.ts`, `merkle.ts`, `admin.ts`, `admin-users.ts`, `admin-jobs.ts`, `webhooks.ts`, `sessions.ts`, `health.ts`, `check-api.ts`, `finance-api.ts`
- `index.ts` barrel-exports everything

### Auth (`src/contexts/AuthContext.tsx`)

Global auth state: `{ user, isAuthenticated, isAdmin, isLoading }`. Registration automatically creates a default circuit (required for RBAC). Auth functions in `src/lib/api/defarm-api.ts`.

### Routing (`src/App.tsx`)

- **Public routes**: `/`, `/login`, `/cadastro`, `/onboarding`, `/c/:id` (public circuit view), and marketing pages
- **Protected routes** (`/app/*`): wrapped in `<AppLayout>` (sidebar + header). Key sections: `/app` (dashboard), `/app/itens`, `/app/circuitos`, `/app/eventos`, `/app/auditoria`, `/app/snapshots`, `/app/finance/*`, `/app/admin/*`

### Path Aliases

`@/*` maps to `src/*` (configured in `tsconfig.json` and `vite.config.ts`).

### Key Business Concepts

- **Items**: Agricultural products tracked through supply chain (create, update, merge, split)
- **Circuits**: Collaborative supply chain groups with members and adapters
- **DFID**: Digital Farm ID — unique identifiers for farms/producers
- **Compliance**: Automated checks (environmental, EUDR, documentation)
- **Snapshots / Merkle**: Immutable state snapshots with cryptographic proofs

### UI Patterns

- All UI components from `src/components/ui/` (shadcn/ui, 40+ components)
- Toast notifications via **Sonner** (`useToast` or `toast()` from `sonner`)
- Charts via **Recharts**, maps via **React Leaflet**
- CSS variables for theming (HSL-based, dark mode via `.dark` class)
