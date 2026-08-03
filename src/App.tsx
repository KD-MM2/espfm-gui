import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { Layout } from "./components/layout/Layout";
import { DashboardPage } from "./pages/DashboardPage";
import { FansPage } from "./pages/FansPage";
import { SourcesPage } from "./pages/SourcesPage";
import { CurvesPage } from "./pages/CurvesPage";
import { SchedulesPage } from "./pages/SchedulesPage";
import { WifiPage } from "./pages/WifiPage";
import { SystemPage } from "./pages/SystemPage";
import { DevicesPage } from "./pages/DevicesPage";
import { LogsPage } from "./pages/LogsPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/fans" element={<FansPage />} />
          <Route path="/sources" element={<SourcesPage />} />
          <Route path="/curves" element={<CurvesPage />} />
          <Route path="/schedules" element={<SchedulesPage />} />
          <Route path="/wifi" element={<WifiPage />} />
          <Route path="/system" element={<SystemPage />} />
          <Route path="/logs" element={<LogsPage />} />
          <Route path="/devices" element={<DevicesPage />} />
        </Route>
      </Routes>
      <Toaster />
    </BrowserRouter>
  );
}

