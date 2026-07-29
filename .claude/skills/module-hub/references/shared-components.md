# Shared Components

Purpose: Reusable presentational React components shared across pages. Includes the layout shell, dashboard cards, UI primitives, and utility views.

## Key files

| Path | Purpose |
| --- | --- |
| `src/components/layout/Layout.tsx` | App shell: sidebar nav + `<Outlet />` for page content. |
| `src/components/ui/EmptyState.tsx` | Empty-state placeholder with icon, title, description, optional action. |
| `src/components/ui/Toast.tsx` | Toast notification display. |
| `src/components/ui/Badge.tsx` | Status badge with variant-based coloring. |
| `src/components/dashboard/` | Dashboard summary cards (fan status, temperature, system info). |
| `src/components/devices/` | Device discovery and management UI. |
| `src/components/wifi/` | WiFi scanning and connection UI. |
| `src/components/system/` | System info and hostname configuration UI. |
| `src/components/logs/` | Log viewer UI. |

## Entry points

`Layout` is the top-level wrapper imported by `App.tsx`. All other components are imported by page components or by `Layout` itself.

## Data flow

Pages pass data down via props. Some components read Zustand stores directly (e.g. `useDeviceStore` for active device display in the sidebar). No component in this area fetches data from the API.

## Integration points

- Imports Zustand store hooks from `../../stores/`.
- Imports types from `../../lib/api` for prop typing.
- Uses lucide-react icons throughout.

## Patterns

- All components use named function exports (`export function Name()`).
- Props interface declared above the component.
- Tailwind CSS only (no CSS modules, no styled-components).
- Design tokens as inline hex colors: `#171717` (primary text), `#60646c` (secondary text), `#dcdee0` (borders), `#f0f0f3` (hover bg), `#16a34a` (success), `#ab6400` (warning), `#dc2626` (error), `#0d74ce` (info).
- Variant styling via `Record<EnumType, string>` maps.
- `type="button"` on all `<button>` elements.
- `aria-label` on icon-only buttons.
