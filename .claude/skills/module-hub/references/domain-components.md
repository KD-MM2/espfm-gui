# Domain Components

Purpose: Entity-specific UI components for fans, sources, curves, and schedules. Each domain has a list component with card sub-components and a form modal.

## Key files

| Path | Purpose |
| --- | --- |
| `src/components/fans/FanList.tsx` | Fan card grid with enable/disable toggle. |
| `src/components/fans/FanForm.tsx` | Fan creation/edit modal. |
| `src/components/sources/SourceList.tsx` | Source card grid. |
| `src/components/sources/SourceForm.tsx` | Source creation/edit modal. |
| `src/components/sources/Ds18b20Scanner.tsx` | Hardware scanner for 1-Wire temperature sensors (specialized, not a template). |
| `src/components/curves/CurveList.tsx` | Curve card grid. |
| `src/components/curves/CurveForm.tsx` | Curve creation/edit modal. |
| `src/components/curves/CurveEditor.tsx` | SVG interactive chart editor (specialized, not a template). |
| `src/components/schedules/ScheduleList.tsx` | Schedule card grid. |
| `src/components/schedules/ScheduleForm.tsx` | Schedule creation/edit modal. |

## Entry points

Each `{Entity}List` and `{Entity}Form` is imported by the corresponding page component in `src/pages/`.

## Data flow

Page component -> passes entity array + callbacks as props -> `{Entity}List` renders `{Entity}Card` per item -> card buttons call `onEdit`/`onDelete` callbacks -> page handles CRUD via `api`.

Form: page conditionally renders `{Entity}Form` when `showForm` is true -> form calls `onSubmit(formData)` -> page calls `api.create/update`.

## Integration points

- Imports entity types (`FanState`, `SourceState`, etc.) from `../../lib/api`.
- Imports `EmptyState` from `../ui/EmptyState`.
- Uses lucide-react icons for all iconography.

## Patterns

- `{Entity}List`: named function export, props interface `{Entity}ListProps`, private `{Entity}Card` sub-component (not exported), `EmptyState` for empty arrays, grid container `grid gap-3 sm:grid-cols-2`, key on `entity.slot`.
- `{Entity}Form`: named function export, props interface `{Entity}FormProps`, modal overlay `fixed inset-0 z-50 bg-black/40`, `isEdit = initialData != null`, `useState` per field, `e.preventDefault()` on submit, button row with Cancel + Submit.
- Card layout: `rounded-lg border border-[#dcdee0] bg-white p-4`, action buttons with `rounded-md p-1.5`.
- Form inputs: `rounded-md border border-[#dcdee0] bg-white px-3 py-2 text-sm`, `focus:border-[#171717]`.
