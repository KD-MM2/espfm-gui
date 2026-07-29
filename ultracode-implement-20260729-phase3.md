# Implementation Report: Phase 3 - CoAP Collector, Historical Data Loader, getRecentTempSamples

**Date:** 2026-07-29
**Plan:** Inline instructions (Phase 3)
**Phase:** 3
**Module(s):** espfm-store, espfm-gui (src-tauri), src/lib
**Status:** Complete

## Changes Made

| # | File Path | Action | Description |
| --- | --- | --- | --- |
| 1 | `crates/espfm-store/src/samples.rs` | Modified | Added `get_recent_temp_samples` function querying temp_samples by device_id and minutes window |
| 2 | `src-tauri/src/commands.rs` | Modified | Added `TempSamplePoint` struct and `get_recent_temp_samples` Tauri command |
| 3 | `src-tauri/src/lib.rs` | Modified | Registered `get_recent_temp_samples` in the invoke handler |
| 4 | `src/lib/api.ts` | Modified | Added `TempSamplePoint` interface and `getRecentTempSamples` API function |
| 5 | `src/lib/collectors.ts` | Created | `Collector` class (polls fans/sources/system on intervals, publishes FanSample to EventBus) and `loadHistory` function (fetches historical fan+temp samples, buckets by minute, publishes to EventBus) |

## Changed Files

### Created
- `C:\Users\KaoTD\espfm-core\espfm-gui\src\lib\collectors.ts`

### Modified
- `C:\Users\KaoTD\espfm-core\espfm-gui\crates\espfm-store\src\samples.rs`
- `C:\Users\KaoTD\espfm-core\espfm-gui\src-tauri\src\commands.rs`
- `C:\Users\KaoTD\espfm-core\espfm-gui\src-tauri\src\lib.rs`
- `C:\Users\KaoTD\espfm-core\espfm-gui\src\lib\api.ts`

### Deleted
- None

## Skills Applied

- `convention`: TypeScript code follows project conventions (strict types, consistent naming)

## Verification Results

| Verification | Command | Result |
| --- | --- | --- |
| Rust build | `cargo check` | Pass |
| TypeScript build | `pnpm build` | Pass |

## Notes

- The `get_recent_temp_samples` Rust function mirrors the existing `get_recent_fan_samples` pattern exactly, using `datetime('now', ?2)` with a `-N minutes` parameter.
- The `TempSamplePoint` command struct follows the same serialization pattern as `FanSamplePoint` (RFC 3339 timestamp string).
- The `Collector` class uses `setInterval` for polling: fans every 2s, sources every 10s, system info every 30s. It publishes a combined `FanSample` to the EventBus after each fan poll.
- The `loadHistory` function aggregates raw samples into 1-minute buckets (averaging RPM and temp values), then publishes each bucket as a `FanSample` to the EventBus for chart rendering.
