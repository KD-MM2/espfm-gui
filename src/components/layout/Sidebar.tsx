import { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Fan,
  Thermometer,
  GitBranch,
  Calendar,
  Wifi,
  Settings,
  ScrollText,
  Monitor,
  ChevronLeft,
  ChevronRight,
  Circle,
} from "lucide-react";
import { useDeviceStore } from "../../stores/deviceStore";
import { ConnectionBadge } from "../ui/ConnectionBadge";

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
}

const primaryNav: NavItem[] = [
  { to: "/", label: "Dashboard", icon: <LayoutDashboard size={20} /> },
  { to: "/fans", label: "Fans", icon: <Fan size={20} /> },
  { to: "/sources", label: "Sources", icon: <Thermometer size={20} /> },
  { to: "/curves", label: "Curves", icon: <GitBranch size={20} /> },
  { to: "/schedules", label: "Schedules", icon: <Calendar size={20} /> },
];

const secondaryNav: NavItem[] = [
  { to: "/wifi", label: "WiFi", icon: <Wifi size={20} /> },
  { to: "/system", label: "System", icon: <Settings size={20} /> },
  { to: "/logs", label: "Logs", icon: <ScrollText size={20} /> },
  { to: "/devices", label: "Devices", icon: <Monitor size={20} /> },
];

function NavEntry({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  return (
    <NavLink
      to={item.to}
      end={item.to === "/"}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
          isActive
            ? "bg-muted text-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        } ${collapsed ? "justify-center" : ""}`
      }
      title={collapsed ? item.label : undefined}
    >
      {item.icon}
      {!collapsed && <span>{item.label}</span>}
    </NavLink>
  );
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const connectionStatus = useDeviceStore((s) => s.connectionStatus);
  const devices = useDeviceStore((s) => s.devices);
  const activeDeviceId = useDeviceStore((s) => s.activeDeviceId);
  const activeDevice = devices.find((d) => d.id === activeDeviceId);

  return (
    <aside
      className={`flex h-screen flex-col border-r border-border bg-background transition-[width] duration-200 ${
        collapsed ? "w-16" : "w-60"
      }`}
    >
      {/* Header */}
      <div className="flex h-14 items-center gap-2 border-b border-border px-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
          E
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-foreground">
              ESP Fan Manager
            </div>
            <div className="text-xs text-muted-foreground">v0.1.0</div>
          </div>
        )}
      </div>

      {/* Primary nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {primaryNav.map((item) => (
          <NavEntry key={item.to} item={item} collapsed={collapsed} />
        ))}

        <div className="my-3 border-t border-border" />

        {secondaryNav.map((item) => (
          <NavEntry key={item.to} item={item} collapsed={collapsed} />
        ))}
      </nav>

      {/* Device selector */}
      <div className="border-t border-border px-3 py-3">
        <NavLink
          to="/devices"
          className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted ${
            collapsed ? "justify-center" : ""
          }`}
          title={collapsed ? (activeDevice?.hostname || "No device") : undefined}
        >
          {collapsed ? (
            <Circle
              size={10}
              className={`shrink-0 ${
                connectionStatus === "connected"
                  ? "text-success"
                  : connectionStatus === "reconnecting"
                    ? "text-warning"
                    : "text-destructive"
              }`}
            />
          ) : (
            <>
              <ConnectionBadge status={connectionStatus} />
              <div className="min-w-0">
                <div className="truncate text-xs font-medium text-foreground">
                  {activeDevice?.hostname || "No device"}
                </div>
                {activeDevice && (
                  <div className="truncate text-[10px] text-muted-foreground">
                    {activeDevice.ipAddress}
                  </div>
                )}
              </div>
            </>
          )}
        </NavLink>
      </div>

      {/* Collapse toggle */}
      <div className="border-t border-border px-3 py-2">
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="flex w-full items-center justify-center rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
    </aside>
  );
}
