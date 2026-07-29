import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { ToastContainer } from "../ui/Toast";

export function Layout() {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-auto bg-[#fafafa]">
        <Outlet />
      </main>
      <ToastContainer />
    </div>
  );
}
