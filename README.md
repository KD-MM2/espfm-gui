# ESP Fan Manager GUI (espfm-gui)

Desktop application for managing ESP32/ESP32-S3 fan controllers (the [espfm-core](..) firmware). Built with **Tauri v2**, **React 19**, and **Rust**.

The app communicates with devices over the local network via **CoAP + Protocol Buffers**, and persists monitoring history and settings to a local **SQLite** database.

## Features

- **Fans** — create, configure, enable/disable, delete; set PWM duty, mode (manual/auto), GPIO pins, link to sources/curves/schedules
- **Temperature Sources** — NTC, DS18B20 (1-Wire scan), or manual sources
- **Fan Curves** — temperature→duty lookup tables (2–10 points) with an interactive editor
- **Schedules** — time-of-day duty overrides
- **Dashboard** — real-time RPM / temperature chart, system info, activity log
- **WiFi** — scan for APs and connect
- **System** — device info, hostname, reboot, export/import config
- **Logs** — activity log with event-type filtering
- **Device discovery** — mDNS scan + auto-connect to the last-used device

## Architecture

```
┌─────────────────────────── Tauri Desktop App ───────────────────────────┐
│  React 19 (Vite)              IPC (invoke)          Rust backend        │
│  ├─ Zustand stores            ───────────────▶      45 Tauri commands  │
│  ├─ EventBus + Collector                         ├─ espfm-coap (CoAP)  │
│  └─ Recharts / shadcn/ui      JSON results        ├─ espfm-store (SQL) │
│                                                   └─ espfm-mdns        │
└───────────────────────────────┬────────────────────────────────────────┘
                                │ UDP CoAP + Protobuf
                                ▼
                        ESP32 device (espfm-core)
```

See [PROJECT_RECONSTRUCTION.md](PROJECT_RECONSTRUCTION.md) for the full architecture, database schema, and data-flow details.

## Development

### Prerequisites

- Node.js + **pnpm**
- Rust toolchain
- Tauri CLI (`cargo install tauri-cli`)

### Setup

```bash
pnpm install
```

### Run the desktop app (dev, hot-reload)

```bash
cargo tauri dev
```

### Frontend-only dev server

```bash
pnpm run dev      # Vite dev server
```

### Typecheck & build

```bash
pnpm run typecheck   # tsc --noEmit
pnpm run build       # tsc && vite build (frontend bundle)
```

### Production build

```bash
cargo tauri build
```

## Project Layout

| Path | Purpose |
| ---- | ------- |
| `src/` | React frontend (pages, components, stores, lib) |
| `src-tauri/` | Rust backend (45 Tauri commands) + Tauri config |
| `crates/espfm-coap/` | CoAP + protobuf client (`proto/espfm.proto`) |
| `crates/espfm-store/` | SQLite persistence (Diesel, 9 tables) |
| `crates/espfm-mdns/` | mDNS device discovery |
| `AGENTS.md` | Project context for AI agents (skills, conventions, gotchas) |

## Related

- **Firmware** — `../` (espfm-core): ESP-IDF v6.0.1 fan controller with CoAP+Protobuf API, interactive shell, and persistent config.
- **API reference** — the firmware's CoAP wire protocol is documented in `../docs/api/`.
