import { useEffect, useState } from "react";
import type { ViewId } from "./lib/types";
import { store } from "./lib/store";
import { BottomNav, DemoBanner, Sidebar, TopBar } from "./components/Layout";
import { AccidentOverlay, ToastHost, TripSummaryModal } from "./components/modals";
import { Dashboard } from "./views/Dashboard";
import { MapPage } from "./views/MapPage";
import { Analytics } from "./views/Analytics";
import { EventsPage } from "./views/EventsPage";
import { TripsPage } from "./views/TripsPage";
import { SettingsPage } from "./views/SettingsPage";

export default function App() {
  const [view, setView] = useState<ViewId>("dashboard");

  useEffect(() => {
    store.bootstrap();
  }, []);

  return (
    <div className="min-h-screen pb-16 lg:pb-0">
      <TopBar view={view} onNav={setView} />
      <DemoBanner />

      <div className="mx-auto flex max-w-[1460px]">
        <Sidebar view={view} onNav={setView} />
        <main className="min-w-0 flex-1 px-4 py-4 lg:px-6 lg:py-5" aria-label={view}>
          {view === "dashboard" && <Dashboard />}
          {view === "map" && <MapPage key="map" />}
          {view === "analytics" && <Analytics key={`an-${store.getSnapshot().settings.theme}`} />}
          {view === "events" && <EventsPage />}
          {view === "trips" && <TripsPage />}
          {view === "settings" && <SettingsPage />}
        </main>
      </div>

      <BottomNav view={view} onNav={setView} />

      <AccidentOverlay />
      <TripSummaryModal />
      <ToastHost />
    </div>
  );
}
