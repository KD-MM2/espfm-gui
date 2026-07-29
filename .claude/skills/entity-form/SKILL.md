---
name: entity-form
description: >
  Create or modify a modal entity form component in this repo. Covers modal overlay pattern,
  useState-per-field form state, isEdit toggle, onSubmit/onCancel props, and consistent Tailwind
  styling. ACTIVATE when creating or editing any `{Entity}Form.tsx` file under `src/components/`.
---

# Entity Form

Location: `src/components/{domain}/{Entity}Form.tsx` (co-located with its sibling `{Entity}List.tsx`).
Base / interface: none (plain React function component).
State management: raw `useState` per field (no form library).
Parent integration: parent passes `onSubmit`, `onCancel`, `initialData`, and optional related-entity arrays for dropdowns.

## Definitions

| Term | Meaning |
| --- | --- |
| `{Entity}` | PascalCase entity name (e.g. `Fan`, `Source`, `Schedule`, `Curve`) |
| `{entity}` | kebab-case entity name used in HTML `id` attributes (e.g. `fan`, `source`, `schedule`) |
| `{Entity}State` | The entity's state type imported from `../../lib/api` |
| `{Entity}FormData` | Exported interface describing the form's submit payload |
| `initialData` | Optional prop of type `{Entity}State \| null`; when non-null the form is in edit mode |

## Steps

### 1. Define the FormData interface and props

Create the exported `FormData` interface first, then the props interface.

```tsx
import { useState } from "react";
import type { {Entity}State } from "../../lib/api";

export interface {Entity}FormData {
  // one field per entity property the form edits
  // use snake_case to match the API state types
}

interface {Entity}FormProps {
  onSubmit: (data: {Entity}FormData) => void;
  onCancel: () => void;
  initialData?: {Entity}State | null;
  // optional related-entity arrays for select dropdowns:
  // fans?: FanState[];
}
```

PASS: `FormData` is exported; props interface is not exported; `onSubmit` receives `FormData` not `State`.
FAIL: `onSubmit` receives `{Entity}State` directly, or `FormData` is not exported.

### 2. Declare the function component with isEdit and per-field state

Use `export function` (not arrow function, not default export). Derive `isEdit` from `initialData`. Initialize each field with `useState` using `initialData?.field ?? defaultValue`.

```tsx
export function {Entity}Form({
  onSubmit,
  onCancel,
  initialData,
}: {Entity}FormProps) {
  const isEdit = initialData != null;

  const [field1, setField1] = useState(initialData?.field1 ?? "");
  const [field2, setField2] = useState<number>(initialData?.field2 ?? 0);
  // one useState per form field
```

PASS: `export function` keyword; `isEdit` derived via `initialData != null`; every field has its own `useState`.
FAIL: `export default function`; arrow function export; `isEdit` derived differently; `useEffect` to sync state.

### 3. Implement handleSubmit

Call `e.preventDefault()`, validate required fields, then call `onSubmit` with the assembled data object.

```tsx
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!field1.trim()) return;
    onSubmit({
      field1: field1.trim(),
      field2,
      // ... all fields
    });
  }
```

PASS: `e.preventDefault()` is the first statement; validation returns early before `onSubmit`.
FAIL: Missing `preventDefault`; validation after `onSubmit`; no early return on invalid input.

### 4. Render the modal overlay

The outer `div` is the overlay; clicking it calls `onCancel`. The inner `div` stops propagation so clicks inside the form do not close it.

```tsx
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-lg border border-[#dcdee0] bg-white p-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
```

PASS: Outer div has `onClick={onCancel}`; inner div has `onClick={(e) => e.stopPropagation()}`.
FAIL: Missing overlay click handler; missing `stopPropagation`; different z-index or positioning classes.

### 5. Render the title

Use `isEdit` to toggle between "Edit {Entity}" and "Create {Entity}".

```tsx
        <h2 className="text-base font-semibold text-[#171717]">
          {isEdit ? "Edit {Entity}" : "Create {Entity}"}
        </h2>
```

PASS: Title uses the exact `{isEdit ? "Edit ..." : "Create ..."}` pattern.
FAIL: Static title; different wording or casing.

### 6. Render the form with fields

Each field follows the same structure: `div` wrapper, `label` with `htmlFor`, then `input`/`select`/`range`. The first input gets `autoFocus`.

```tsx
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label
              htmlFor="{entity}-field1"
              className="mb-1 block text-xs font-medium text-[#60646c]"
            >
              Field 1
            </label>
            <input
              id="{entity}-field1"
              type="text"
              value={field1}
              onChange={(e) => setField1(e.target.value)}
              className="w-full rounded-md border border-[#dcdee0] bg-white px-3 py-2 text-sm text-[#171717] outline-none transition-colors focus:border-[#171717]"
              required
              autoFocus
            />
          </div>
```

PASS: `htmlFor` matches `id`; label uses `text-xs font-medium text-[#60646c]`; input uses the standard Tailwind string; first input has `autoFocus`.
FAIL: Missing `htmlFor`/`id` pairing; different label or input classes; no `autoFocus` on first field.

#### Field type patterns

- **Text input:** `type="text"` with the standard input classes above.
- **Number input:** `type="number"` with `min`/`max` as appropriate.
- **Select dropdown:** `<select>` with the same input classes; options mapped from a related-entity array or a `const` options array.
- **Range slider:** `type="range"` with `className="w-full accent-[#171717]"` and a label showing the current value (e.g. `Duty ({duty}%)`). Include a `div.flex.justify-between` with min/max labels below the slider.
- **Checkbox:** `<label className="flex items-center gap-2 text-sm text-[#171717]">` wrapping `<input type="checkbox" className="h-4 w-4 rounded border-[#dcdee0] accent-[#171717]" />`.
- **Conditional fields:** Use a boolean derived from another field's value (e.g. `const showGpio = sourceType === "NTC"`) and wrap the field in `{showGpio && (...)}`.
- **Related-entity select:** Map over the prop array; render `<option key={item.slot} value={item.slot}>` with a descriptive label. Provide a fallback when the array is empty.

### 7. Render the button row

Cancel button uses border style; submit button uses dark background. Submit text toggles on `isEdit`.

```tsx
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-md border border-[#dcdee0] bg-white px-4 py-2 text-sm font-medium text-[#171717] transition-colors hover:bg-[#f0f0f3]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-[#171717] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#2a2a2a]"
            >
              {isEdit ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

PASS: Cancel is `type="button"` (not submit); submit is `type="submit"`; text uses `{isEdit ? "Update" : "Create"}`.
FAIL: Cancel is `type="submit"`; static button text; different button classes.

### 8. Wire the form in the parent page

The parent page manages the form's visibility with a state boolean (e.g. `showForm`) and an `editingItem` state (null for create, entity for edit). It passes the form component the required props:

```tsx
{showForm && (
  <{Entity}Form
    onSubmit={(data) => {
      if (editingItem) {
        update{Entity}(editingItem.slot, data);
      } else {
        create{Entity}(data);
      }
      setShowForm(false);
      setEditingItem(null);
    }}
    onCancel={() => {
      setShowForm(false);
      setEditingItem(null);
    }}
    initialData={editingItem}
    // pass related-entity arrays if the form needs them
  />
)}
```

PASS: Parent conditionally renders the form; `onSubmit` branches on `editingItem` for create vs. update; `onCancel` resets both states.
FAIL: Form always rendered (not conditional); no create/update branching; parent does not reset state on cancel.

## Checklist

- [ ] `FormData` interface exported; props interface not exported.
- [ ] `export function` (not arrow, not default).
- [ ] `isEdit` derived from `initialData != null`.
- [ ] Every form field has its own `useState` initialized from `initialData?.field ?? default`.
- [ ] No `useEffect` for form state synchronization.
- [ ] No form library (no react-hook-form, no formik).
- [ ] Modal overlay: `fixed inset-0 z-50 ... bg-black/40` with `onClick={onCancel}`.
- [ ] Modal content: `onClick={(e) => e.stopPropagation()}`.
- [ ] Title uses `{isEdit ? "Edit {Entity}" : "Create {Entity}"}`.
- [ ] `handleSubmit` calls `e.preventDefault()` first, validates, then calls `onSubmit`.
- [ ] First input has `autoFocus`.
- [ ] Every `label.htmlFor` matches its input `id`.
- [ ] Input classes: `w-full rounded-md border border-[#dcdee0] bg-white px-3 py-2 text-sm text-[#171717] outline-none transition-colors focus:border-[#171717]`.
- [ ] Cancel button: `type="button"`, border style.
- [ ] Submit button: `type="submit"`, dark bg, text `{isEdit ? "Update" : "Create"}`.
- [ ] Follows `convention` skill.
