import { createBrowserRouter, RouterProvider } from "react-router-dom";
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

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: "/", element: <DashboardPage /> },
      { path: "/fans", element: <FansPage /> },
      { path: "/sources", element: <SourcesPage /> },
      { path: "/curves", element: <CurvesPage /> },
      { path: "/schedules", element: <SchedulesPage /> },
      { path: "/wifi", element: <WifiPage /> },
      { path: "/system", element: <SystemPage /> },
      { path: "/logs", element: <LogsPage /> },
      { path: "/devices", element: <DevicesPage /> },
    ],
  },
]);

export default function App() {
  return (
    <>
      <RouterProvider router={router} />
      <Toaster />
    </>
  );
}
