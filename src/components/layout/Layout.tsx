import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { useAutoConnect } from "../../hooks/useAutoConnect";

export function Layout() {
  useAutoConnect();

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-auto bg-background">
        <Outlet />
      </main>
    </div>
  );
}
