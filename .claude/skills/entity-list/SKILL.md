---
name: entity-list
description: >
  Create or modify an entity list component in this repo. Covers the card-grid list pattern with
  EmptyState fallback, per-entity Card sub-component, lucide-react icons, and Tailwind design-token
  styling. Applies to FanList, SourceList, CurveList, ScheduleList, and any future slot-based entity list.
---

# Entity List

Location: `src/components/{entity}/{Entity}List.tsx`.
State type: imported from `../../lib/api` (e.g. `FanState`, `SourceState`).
UI dependency: `<EmptyState>` from `../ui/EmptyState`.

## Definitions

| Term | Meaning |
| --- | --- |
| `{Entity}` | PascalCase entity name (e.g. `Fan`, `Source`, `Curve`, `Schedule`). |
| `{entity}` | camelCase form of the entity name (e.g. `fan`, `source`). |
| `{entities}` | plural camelCase (e.g. `fans`, `sources`, `curves`). |
| `{Entity}State` | the TypeScript interface for one entity, from `../../lib/api`. |
| `{Entity}Card` | file-private (not exported) inner component rendering one entity row. |
| `{Entity}ListProps` | props interface for the exported list component. |
| `EmptyState` | shared component at `src/components/ui/EmptyState.tsx`. |

## Prerequisites

- The `{Entity}State` type exists in `src/lib/api.ts` (or its barrel export).
- `EmptyState` exists at `src/components/ui/EmptyState.tsx`.
- lucide-react is installed (check `package.json`).

## Steps

### 1. Define the props interface

The props interface is named `{Entity}ListProps`. It always contains:
- `{entities}: {Entity}State[]` -- the array of entities to render.
- `onEdit: (item: {Entity}State) => void` -- edit callback.
- `onDelete: (item: {Entity}State) => void` -- delete callback.

It may optionally contain:
- `onToggle: (item: {Entity}State) => void` -- enable/disable toggle (Fan, Schedule).
- `onCreateFirst: () => void` -- action for the EmptyState button (Source, Curve, Schedule).

PASS:
```tsx
interface FanListProps {
  fans: FanState[];
  onEdit: (fan: FanState) => void;
  onDelete: (fan: FanState) => void;
  onToggle: (fan: FanState) => void;
}
```

FAIL:
```tsx
// Exported, uses arrow function, missing onToggle
export const FanList = ({ fans, onEdit, onDelete }: Props) => ...
```

### 2. Define the Card sub-component

The card component is named `{Entity}Card`. It is a plain function (not exported), defined above the list component. It accepts the same shape as the list's props but for a single entity.

Structure:
- Outer div: `<div className="rounded-lg border border-[#dcdee0] bg-white p-4">`.
- If the entity has an `enabled` field and it can be false, add conditional `opacity-60`: `` className={`rounded-lg border border-[#dcdee0] bg-white p-4 ${!item.enabled ? "opacity-60" : ""}`} ``
- Inner layout: `flex items-start justify-between`.
- Left side (`min-w-0 flex-1`): entity name in `<h3 className="truncate text-sm font-semibold text-[#171717]">`, followed by entity-specific detail rows.
- Right side (`flex shrink-0 items-center gap-1`): action buttons.

Action buttons (each is `<button type="button">` with `rounded-md p-1.5 text-[#60646c] transition-colors hover:bg-[#f0f0f3]"`):
- Toggle button (if `onToggle` prop exists): uses `CheckCircle2` (green, `text-[#16a34a]`) when enabled, `Circle` when disabled. `title` is `"Enable {entity}"` / `"Disable {entity}"`.
- Edit button: `Pencil` icon, `title="Edit {entity}"`.
- Delete button: `Trash2` icon, hover style `hover:bg-[#fee2e2] hover:text-[#dc2626]`, `title="Delete {entity}"`.

Button order (left to right): Toggle, Edit, Delete.

PASS:
```tsx
function FanCard({
  fan,
  onEdit,
  onDelete,
  onToggle,
}: {
  fan: FanState;
  onEdit: (fan: FanState) => void;
  onDelete: (fan: FanState) => void;
  onToggle: (fan: FanState) => void;
}) {
  return (
    <div className={`rounded-lg border border-[#dcdee0] bg-white p-4 ${!fan.enabled ? "opacity-60" : ""}`}>
      ...
    </div>
  );
}
```

FAIL:
```tsx
// Exported, uses arrow function, inconsistent styling
export const FanCard = (props) => (
  <div className="card">...</div>
)
```

### 3. Define the exported list component

The list component is named `{Entity}List` and uses `export function` (not arrow function, not `export default`).

Body:
1. Empty-state early return: if `{entities}.length === 0`, return `<EmptyState>` with:
   - `icon`: a lucide-react icon at `size={40}` (choose one that represents the entity).
   - `title`: `"No {entities} configured"`.
   - `description`: `"Create your first {entity} to get started"`.
   - `actionLabel` and `onAction`: only if `onCreateFirst` is in props. `actionLabel` is `"Create your first {entity}"`.

2. Grid container: `<div className="grid gap-3 sm:grid-cols-2">`.
3. Map over `{entities}`, rendering `{Entity}Card` for each.
4. Key on `item.slot` (not array index).

PASS:
```tsx
export function FanList({ fans, onEdit, onDelete, onToggle }: FanListProps) {
  if (fans.length === 0) {
    return (
      <EmptyState
        icon={<Fan size={40} />}
        title="No fans configured"
        description="Create your first fan to get started"
      />
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {fans.map((fan) => (
        <FanCard
          key={fan.slot}
          fan={fan}
          onEdit={onEdit}
          onDelete={onDelete}
          onToggle={onToggle}
        />
      ))}
    </div>
  );
}
```

FAIL:
```tsx
// Arrow function, default export, index key
export default ({ fans }) => (
  <div>{fans.map((f, i) => <Card key={i} {...f} />)}</div>
)
```

### 4. Add entity-specific detail content inside the Card

Between the entity name `<h3>` and the action buttons div, add entity-specific detail rows. Follow the patterns from the exemplars:

- **Badge pills**: `<span className="shrink-0 rounded-full bg-[#f0f0f3] px-2 py-0.5 text-[10px] font-medium text-[#60646c]">` for type labels, status labels, point counts.
- **Status-colored badges**: use semantic Tailwind colors (`bg-green-50 text-green-700`, `bg-yellow-50 text-yellow-700`, `bg-red-50 text-red-700`) for status values.
- **Detail rows**: `<div className="mt-2 space-y-1">` containing `<div className="flex items-center gap-1.5 text-xs text-[#60646c]">` rows.
- **Inline values**: `<span className="font-medium text-[#171717]">{value}</span>` for key numeric values (RPM, temperature, duty %).
- **Separator**: `<span className="text-[#dcdee0]">|</span>` between related values in a row.
- **Mono text**: `font-mono` for technical identifiers (ROM codes, point summaries).

### 5. Import the icon

Choose a lucide-react icon that represents the entity type. Import it alongside `Pencil` and `Trash2` (and `CheckCircle2`/`Circle` if `onToggle` is used).

PASS:
```tsx
import { Fan, Pencil, Trash2, CheckCircle2, Circle } from "lucide-react";
```

FAIL:
```tsx
// Multiple import statements for same package, non-lucide icon
import { Pencil } from "lucide-react";
import { Trash2 } from "lucide-react";
import { FaFan } from "react-icons/fa";
```

## Checklist

- [ ] File named `{Entity}List.tsx` in `src/components/{entity}/`.
- [ ] Props interface named `{Entity}ListProps` with required `entities`, `onEdit`, `onDelete` and any optional callbacks.
- [ ] `{Entity}Card` is a file-private function (not exported), defined above the list component.
- [ ] `{Entity}List` uses `export function` (not arrow function, not default export).
- [ ] Empty-state early return uses `<EmptyState>` from `../ui/EmptyState` with lucide-react icon at `size={40}`.
- [ ] Grid container uses `className="grid gap-3 sm:grid-cols-2"`.
- [ ] `.map()` key uses `item.slot` (not array index).
- [ ] Card outer div uses `rounded-lg border border-[#dcdee0] bg-white p-4`.
- [ ] Action buttons use `rounded-md p-1.5 text-[#60646c]` with appropriate hover styles.
- [ ] Delete button hover uses `hover:bg-[#fee2e2] hover:text-[#dc2626]`.
- [ ] Toggle button (if present) uses `CheckCircle2` with `text-[#16a34a]` for enabled state.
- [ ] Entity state type imported from `../../lib/api`.
- [ ] All icons from `lucide-react`.
- [ ] Follows `convention` skill rules.
