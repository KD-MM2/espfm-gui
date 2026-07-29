---
name: component
description: >
  Create or modify a shared presentational React component in this repo. Covers named function export,
  Props interface declaration, Tailwind utility styling with hardcoded design-token hex colors, variant
  style maps, lucide-react icons, and Zustand store integration. ACTIVATE when adding or editing files
  under src/components/ui/, src/components/dashboard/, src/components/layout/, src/components/logs/,
  src/components/devices/, src/components/system/, or src/components/wifi/.
---

# Component

Location: `src/components/{area}/` where `{area}` is `ui`, `dashboard`, `layout`, `logs`, `devices`, `system`, or `wifi`.
Base / interface: none. Each component is a standalone named function export.
State management: Zustand store hooks (`useDeviceStore`, `useToastStore`, etc.) for shared state; `useState` for local state.

## Definitions

| Term | Definition |
| --- | --- |
| **variant style map** | A `Record<UnionType, { bg: string; text: string; label: string }>` constant that maps a union type to Tailwind class strings. |
| **design-token hex** | A hardcoded hex color in a Tailwind class (e.g. `text-[#171717]`). This repo uses inline hex colors instead of Tailwind's default palette. |
| **card layout** | The reusable container pattern: `rounded-lg border border-[#dcdee0] bg-white p-4`. |
| **Props interface** | A TypeScript `interface` declared immediately above the component function, named `{ComponentName}Props`. |

## Prerequisites

- The component file does NOT exist yet (for creation) or already exists (for modification).
- The parent directory (`src/components/{area}/`) exists.
- `lucide-react` is installed (check `package.json`).
- A Zustand store exists if the component needs shared state (check `src/stores/`).

## Steps

### 1. Create the component file

Create a `.tsx` file at `src/components/{area}/{ComponentName}.tsx`. Follow this structure exactly.

**Template for a simple presentational component (no variant map):**

```tsx
import type { ReactNode } from "react";
// import icons from "lucide-react" as needed

interface {ComponentName}Props {
  {prop1}: {type};
  {prop2}?: {type};
  children?: ReactNode;
}

export function {ComponentName}({ {prop1}, {prop2} }: {ComponentName}Props) {
  return (
    <div className="rounded-lg border border-[#dcdee0] bg-white p-4">
      {/* component content */}
    </div>
  );
}
```

**Template for a component with a variant style map:**

```tsx
import type { ReactNode } from "react";
// import icons from "lucide-react" as needed

type {Variant} = "{option1}" | "{option2}" | "{option3}";

const {VARIANT}_STYLES: Record<{Variant}, { bg: string; text: string; label: string }> = {
  {option1}: { bg: "bg-[#dcfce7]", text: "text-[#16a34a]", label: "{Option1Label}" },
  {option2}: { bg: "bg-[#fef9c3]", text: "text-[#ab6400]", label: "{Option2Label}" },
  {option3}: { bg: "bg-[#fee2e2]", text: "text-[#dc2626]", label: "{Option3Label}" },
};

interface {ComponentName}Props {
  {prop1}: {type};
  status?: {Variant};
}

export function {ComponentName}({ {prop1}, status = "{defaultOption}" }: {ComponentName}Props) {
  const badge = {VARIANT}_STYLES[status];

  return (
    <div className="rounded-lg border border-[#dcdee0] bg-white p-4">
      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
      {/* rest of component content */}
    </div>
  );
}
```

**Pass condition:** The file exports exactly one named function. The Props interface is declared above the function. The file parses as valid TSX.
**Fail condition:** The file uses `export default function`, uses CSS modules or styled-components, or omits the Props interface.

### 2. Apply design-token colors

Use ONLY these hex colors for Tailwind classes. Do NOT use Tailwind's default color palette (`text-gray-500`, `bg-blue-100`, etc.).

| Token | Hex | Tailwind class pattern | Usage |
| --- | --- | --- | --- |
| Primary text | `#171717` | `text-[#171717]` | Headings, values, primary content |
| Muted text | `#60646c` | `text-[#60646c]` | Labels, secondary text, captions |
| Border | `#dcdee0` | `border-[#dcdee0]` | Card borders, dividers |
| Hover/active bg | `#f0f0f3` | `bg-[#f0f0f3]` | Hover states, active backgrounds |
| Success green | `#16a34a` | `text-[#16a34a]`, `bg-[#dcfce7]` | Connected, healthy, success states |
| Warning amber | `#ab6400` | `text-[#ab6400]`, `bg-[#fef9c3]` | Reconnecting, warning states |
| Error red | `#dc2626` | `text-[#dc2626]`, `bg-[#fee2e2]` | Disconnected, error states |
| Info blue | `#0d74ce` | `text-[#0d74ce]` | Informational highlights |

**Pass condition:** Every color in the component uses one of the hex tokens above via Tailwind arbitrary value syntax.
**Fail condition:** Any use of Tailwind default colors like `text-gray-500`, `bg-red-100`, `border-slate-300`.

### 3. Add variant style map (if applicable)

If the component has a status/state that changes visual appearance (e.g. connection status, health status, entity state), define a variant style map ABOVE the Props interface:

1. Define a union type: `type {Variant} = "{option1}" | "{option2}" | "{option3}";`
2. Define a `Record<{Variant}, { bg: string; text: string; label: string }>` constant named `{VARIANT}_STYLES`.
3. Each entry uses design-token colors from Step 2.
4. Default the variant prop in the function signature: `status = "{defaultOption}"`.

**Pass condition:** The variant map uses `Record<UnionType, { bg: string; text: string; label: string }>` and each value uses design-token hex colors.
**Fail condition:** Inline conditional classes like `status === "ok" ? "text-green-500" : "text-red-500"` instead of a map lookup.

### 4. Add icons (if needed)

Import icons from `lucide-react` as named imports. Use icon components inside JSX, passing `size` and `className` props.

```tsx
import { Circle, X, Fan, Thermometer } from "lucide-react";
```

**Pass condition:** Icons are imported from `lucide-react` as named imports.
**Fail condition:** Icons are imported from any other icon library, or SVGs are inlined manually.

### 5. Integrate Zustand store (if shared state is needed)

If the component reads from or writes to shared state, import the store hook and select only the fields needed:

```tsx
import { useDeviceStore } from "../../stores/deviceStore";

// Inside the component:
const devices = useDeviceStore((s) => s.devices);
const setDevice = useDeviceStore((s) => s.setDevice);
```

**Pass condition:** The store selector uses `(s) => s.field` syntax to select specific fields.
**Fail condition:** The store is called without a selector like `useDeviceStore()`, which subscribes to all state changes.

### 6. Export the component

Every component MUST use a named export. Do NOT use `export default`.

```tsx
export function {ComponentName}({ ... }: {ComponentName}Props) {
```

**Pass condition:** The file uses `export function {Name}`.
**Fail condition:** The file uses `export default function`.

## Checklist

- [ ] Component file is at `src/components/{area}/{ComponentName}.tsx`.
- [ ] Props interface declared immediately above the component function, named `{ComponentName}Props`.
- [ ] Named function export (`export function`), never `export default`.
- [ ] All styling uses Tailwind utility classes with design-token hex colors from Step 2.
- [ ] No Tailwind default color palette used (no `text-gray-*`, `bg-blue-*`, `border-slate-*`).
- [ ] Variant style maps use `Record<UnionType, { bg: string; text: string; label: string }>` pattern.
- [ ] Icons imported from `lucide-react` as named imports.
- [ ] Zustand store selectors use `(s) => s.field` syntax.
- [ ] `<button>` elements have `type="button"` attribute.
- [ ] Icon-only buttons have `aria-label` attribute.
- [ ] No `'use client'` directive (this is a Vite + React SPA, not Next.js).
- [ ] No CSS modules, styled-components, or inline `style={}` objects.
- [ ] Follows `convention` skill.
