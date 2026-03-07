# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

Main production UI for the DeFarm platform — agricultural traceability with digital identities (DFID), circuits, blockchain anchoring, and partner integrations.

**Stack**: Vite 5, React 18, TypeScript, shadcn/ui, TanStack Query v5, i18next, Tailwind CSS 3.4

**Deploy**: Netlify (auto-deploy on push to `origin` fork)

## Development Commands

```bash
npm install --legacy-peer-deps   # Install dependencies (required flag)
npm run dev                      # Dev server on http://localhost:8080
npm run build                    # Production build
npm run build:dev                # Dev build (with lovable-tagger)
npm run preview                  # Preview production build
npm run lint                     # ESLint
npm run test                     # Vitest (once)
npm run test:watch               # Vitest (watch mode)
```

## Project Structure

```
src/
├── App.tsx              # Router (public + /app/* protected routes)
├── main.tsx             # Entry point, i18n init
├── index.css            # Tailwind + design system tokens
├── contexts/
│   └── AuthContext.tsx   # Auth state, workspace switching, 2FA
├── hooks/               # use-mobile, use-toast
├── components/
│   ├── ui/              # 50+ shadcn/ui components
│   ├── AppLayout.tsx    # Main layout with sidebar
│   ├── caderneta/       # Farmer notebook (5 tabs)
│   ├── circuit/         # Circuit management
│   ├── item-detail/     # Item/DFID details
│   ├── onboarding/      # Multi-step onboarding
│   ├── partner/         # Partner portal UI
│   └── snapshots/       # Merkle tree viewer
├── pages/
│   ├── [public]         # Login, Register, Landing, Demo
│   ├── [stellar]        # StellarOverview, Tranche1/2
│   ├── [public share]   # PublicCircuit, PublicItem, EmbedPortfolio
│   └── app/             # 37+ protected pages
├── lib/
│   ├── api/             # 20+ API modules (barrel export)
│   │   ├── client.ts    # Core API client, token refresh
│   │   └── *.ts         # items, circuits, events, admin, partner, etc.
│   ├── defarm-api.ts    # Unified API entry + auth functions
│   └── utils.ts         # cn() utility
├── i18n/
│   ├── index.ts         # i18next config (pt-BR default, en fallback)
│   └── locales/         # pt-BR.json, en.json
└── test/                # Vitest setup
```

## Routing

**Public**: `/`, `/login`, `/cadastro`, `/onboarding`, `/solucoes`
**Auth**: `/reset-senha`, `/esqueci-senha`, `/verificar-email`
**Partner**: `/partner-login`, `/parceiros/login`
**Demo**: `/_demo/acessos`, `/_demo/narrativa`
**Stellar**: `/stellar`, `/stellar/tranche1`, `/stellar/tranche2`
**Public share**: `/c/:id` (circuit), `/i/:dfid` (item), `/embed/portfolio`
**Protected (`/app/*)**: 37+ pages with `AppLayout`, role guards (`RequireAdmin`, `RequireWorkspaceAccess`)

## API Client

- All requests through API Gateway (`VITE_API_BASE_URL`, default: `https://gateway.defarm.net`)
- Registry endpoints use `/v1` prefix
- Token management: `defarm_token` + `defarm_refresh_token` in localStorage
- Auto-refresh on 401 with rate limiting
- Bearer token in `Authorization` header

## Authentication

Managed by `AuthContext` (`src/contexts/AuthContext.tsx`):
- Login/logout, 2FA, email verification, password reset
- Workspace switching (partner, producer, processor, certifier)
- Role-based access: `role`, `is_admin`, `is_active`

## Internationalization

- i18next with browser language detection
- Languages: pt-BR (default), en (fallback)
- Translation files: `src/i18n/locales/`
- Detection: localStorage → browser navigator
- Use `useTranslation()` hook in components

## Styling

- Tailwind CSS with custom design tokens in `tailwind.config.ts`
- Primary color: green (hsl 145, 65%, 47%)
- Dark mode: class-based (via next-themes)
- Border radius: 0.75rem default
- Path alias: `@/` → `src/`

## Testing

- Vitest + jsdom + @testing-library/react
- Setup: `src/test/setup.ts`
- Pattern: `*.test.ts(x)` or `*.spec.ts(x)`

## Environment Variables

```
VITE_API_BASE_URL=https://gateway.defarm.net   # API Gateway URL
```

## Deployment

- **Platform**: Netlify
- **Origin** (fork): `git@github.com:gabrielrondon/defarm-net-2026.git`
- **Upstream** (org): `git@github.com:defarm-repo/watiinspired-design.git`
- **Build**: `npm install --legacy-peer-deps && npm run build`
- **Publish dir**: `dist/`
- **SPA**: All routes redirect to `/index.html`
- **Sync**: `./sync.sh` pulls from upstream and pushes to origin

## OpenAPI

Frontend consumes `openapi.yaml` at project root, mirrored from `engines/services/layer-0-gateway/gateway-service/openapi.yaml`. Must stay in sync.

## Key Patterns

- shadcn/ui components in `src/components/ui/` — don't modify directly, extend via wrappers
- API modules follow barrel export pattern in `src/lib/api/`
- TanStack Query for server state, React hooks for UI state
- `cn()` utility from `src/lib/utils.ts` for conditional class merging
