# Implementation Report: Phase 2 - Event Subscribers

**Date:** 2026-07-29
**Plan:** Inline instructions (Phase 2 of dashboard chart redesign)
**Phase:** 2 — Event Subscribers
**Module(s):** `src/lib/`
**Status:** Complete

## Changes Made

| # | File Path | Action | Description |
| --- | --- | --- | --- |
| 1 | `src/lib/sqliteWriter.ts` | Created | SQLite writer that subscribes to FanSample events and persists fan RPM/duty and temperature readings via Tauri IPC |
| 2 | `src/lib/activityDetector.ts` | Created | Activity detector that subscribes to FanSample events, tracks duty changes per fan, and logs duty transitions to the activity log |

## Changed Files

### Created
- `C:\Users\KaoTD\espfm-core\espfm-gui\src\lib\sqliteWriter.ts`
- `C:\Users\KaoTD\espfm-core\espfm-gui\src\lib\activityDetector.ts`

### Modified
- (none)

### Deleted
- (none)

## Skills Applied

- `convention`: reviewed files for adherence to project conventions (not directly applicable to TypeScript, but checked import structure and patterns against existing codebase)

## Verification Results

| Verification | Command | Result |
| --- | --- | --- |
| Build | `pnpm build` | Pass (tsc + vite build succeeded, 1.19s) |

## Notes

- Both modules follow the same subscriber pattern: module-level state (`activeDeviceId`, `unsubscribe`), a `handleSample` function that processes `FanSample` events, and start/stop lifecycle functions.
- `sqliteWriter` iterates over all fans and temperatures in each sample, calling `api.saveFanSample` and `api.saveTempSample` with fire-and-forget (`.catch(() => {})`) semantics.
- `activityDetector` tracks previous duty values per fan ID in a `Map<number, number>`, only logging when duty actually changes. Uses Unicode arrow character in the log message.
- The pre-existing chunk size warning (701 kB JS bundle) is unrelated to this change.
