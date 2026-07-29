---
name: page
description: >
  Create or modify a domain CRUD page in this Tauri+React GUI. Covers named function export,
  useDeviceStore guard, useToast feedback, useState/useCallback data fetching, CRUD handlers with
  String(err) error coercion, slot-count header, list+form composition, and Tailwind utility styling.
---

# Page

Location: `src/pages/{Entity}Page.tsx`.
Base / interface: none (plain React function component).

## Definitions

| Term | Meaning |
| --- | --- |
| `{Entity}` | PascalCase domain name, e.g. `Fan`, `Source`, `Curve`, `Schedule` |
| `{entity}` | camelCase form of the entity name, e.g. `fan`, `source` |
| `{ENTITY}` | UPPER_SNAKE_CASE form used for the slot constant, e.g. `FAN`, `SOURCE` |
| `activeDeviceId` | The currently selected ESP device ID from `useDeviceStore`; every async operation guards on it |
| `showToast` | Notification function from `useToast`; the only UI feedback mechanism (never `alert()`) |

## Prerequisites

- `src/lib/api` exports `api` (the CoAP/Tauri API client) and the `{Entity}State` type.
- `src/stores/deviceStore` exports `useDeviceStore` with an `activeDeviceId` field.
- `src/stores/toastStore` exports `useToast` with a `showToast(message, level)` function.
- `src/components/{entity}/{Entity}List` and `src/components/{entity}/{Entity}Form` exist or will be created.
- The entity uses a slot-based registry on the firmware side with a known `MAX_{ENTITY}_SLOTS` (typically 8, 16 for curves).

## Steps

### 1. Create the page component

Create `src/pages/{Entity}Page.tsx` using the template below. Every placeholder must be substituted with the concrete entity name.

```tsx
import { useState, useEffect, useCallback } from "react";
import { Plus } from "lucide-react";
import { api, type {Entity}State } from "../lib/api";
import { useDeviceStore } from "../stores/deviceStore";
import { useToast } from "../stores/toastStore";
import { {Entity}List } from "../components/{entity}/{Entity}List";
import { {Entity}Form, type {Entity}FormData } from "../components/{entity}/{Entity}Form";

const MAX_{ENTITY}_SLOTS = 8;

export function {Entity}Page() {
  const activeDeviceId = useDeviceStore((s) => s.activeDeviceId);
  const { showToast } = useToast();
  const [{entity}s, set{Entity}s] = useState<{Entity}State[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing{Entity}, setEditing{Entity}] = useState<{Entity}State | null>(null);

  const fetch{Entity}s = useCallback(async () => {
    if (activeDeviceId == null) return;
    try {
      const data = await api.get{Entity}s(activeDeviceId);
      set{Entity}s(data);
    } catch (err) {
      showToast(`Failed to load {entity}s: ${String(err)}`, "error");
    }
  }, [activeDeviceId]);

  useEffect(() => {
    fetch{Entity}s();
  }, [fetch{Entity}s]);

  async function handleCreate(data: {Entity}FormData) {
    if (activeDeviceId == null) return;
    try {
      const created = await api.create{Entity}(activeDeviceId, data);
      set{Entity}s((prev) => [...prev, created]);
      showToast("{Entity} created", "success");
      closeForm();
    } catch (err) {
      showToast(`Failed to create {entity}: ${String(err)}`, "error");
    }
  }

  async function handleUpdate({entity}: {Entity}State, data: {Entity}FormData) {
    if (activeDeviceId == null) return;
    try {
      const updated = await api.update{Entity}(activeDeviceId, {entity}.slot, data);
      set{Entity}s((prev) =>
        prev.map((e) => (e.slot === updated.slot ? updated : e))
      );
      showToast("{Entity} updated", "success");
      closeForm();
    } catch (err) {
      showToast(`Failed to update {entity}: ${String(err)}`, "error");
    }
  }

  async function handleDelete({entity}: {Entity}State) {
    if (activeDeviceId == null) return;
    if (!confirm(`Delete {entity} "${{entity}.name}"?`)) return;
    try {
      await api.delete{Entity}(activeDeviceId, {entity}.slot);
      set{Entity}s((prev) => prev.filter((e) => e.slot !== {entity}.slot));
      showToast("{Entity} deleted", "success");
    } catch (err) {
      showToast(`Failed to delete {entity}: ${String(err)}`, "error");
    }
  }

  function handleEdit({entity}: {Entity}State) {
    setEditing{Entity}({entity});
    setShowForm(true);
  }

  function handleFormSubmit(data: {Entity}FormData) {
    if (editing{Entity}) {
      handleUpdate(editing{Entity}, data);
    } else {
      handleCreate(data);
    }
  }

  function closeForm() {
    setShowForm(false);
    setEditing{Entity}(null);
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#171717]">{Entity}s</h1>
          <p className="mt-1 text-xs text-[#60646c]">
            {{entity}s.length} of {MAX_{ENTITY}_SLOTS} slots used
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditing{Entity}(null);
            setShowForm(true);
          }}
          disabled={{entity}s.length >= MAX_{ENTITY}_SLOTS}
          className="flex items-center gap-1.5 rounded-md bg-[#171717] px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#2a2a2a] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus size={16} />
          Create {Entity}
        </button>
      </div>

      {/* Entity list */}
      <{Entity}List
        {entity}s={{entity}s}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* Form modal */}
      {showForm && (
        <{Entity}Form
          onSubmit={handleFormSubmit}
          onCancel={closeForm}
          initialData={editing{Entity}}
        />
      )}
    </div>
  );
}
```

### 2. Register the route in App.tsx

Add the page import and `<Route>` entry in `src/App.tsx` inside the `<Layout />` route group. All page imports use named imports (never default imports for pages).

**PASS:**
```tsx
import { {Entity}Page } from "./pages/{Entity}Page";
// ...
<Route path="/{entity}s" element={<{Entity}Page />} />
```

**FAIL:**
```tsx
import {Entity}Page from "./pages/{Entity}Page";  // default import — wrong
```

### 3. Add navigation link in Layout

Add a nav entry in `src/components/layout/Layout.tsx` pointing to `/{entity}s`. Follow the existing link pattern (icon + label).

## Checklist

- [ ] Named function export: `export function {Entity}Page()` (never `export default`).
- [ ] `useDeviceStore` imported and `activeDeviceId` destructured.
- [ ] `useToast` imported and `showToast` destructured.
- [ ] `activeDeviceId == null` guard (loose equality, not strict) at the top of every async handler.
- [ ] Error handling uses `try/catch` with `showToast(\`Failed to ...: ${String(err)}\`, "error")`.
- [ ] Success feedback uses `showToast("{Entity} action", "success")`.
- [ ] `MAX_{ENTITY}_SLOTS` constant defined (8 for most entities, 16 for curves).
- [ ] Data fetching uses `useCallback` async function + `useEffect` dependency array.
- [ ] Local state: `useState<{Entity}State[]>([])` for data, `useState(false)` for `showForm`, `useState<{Entity}State | null>(null)` for `editing{Entity}`.
- [ ] CRUD handlers: `handleCreate`, `handleUpdate`, `handleDelete`, `handleEdit`, `handleFormSubmit`, `closeForm`.
- [ ] Delete uses `confirm()` before proceeding.
- [ ] Renders `{Entity}List` and conditionally `{Entity}Form` modal.
- [ ] Tailwind utility classes throughout (no CSS modules). Color tokens: `#171717` (primary text), `#60646c` (secondary text), `#dcdee0` (borders), `#2a2a2a` (button hover).
- [ ] Lucide React icons for buttons (`Plus` at minimum).
- [ ] Route registered in `src/App.tsx` as a named import.
- [ ] Navigation link added in `src/components/layout/Layout.tsx`.
- [ ] Follows `convention` skill.
