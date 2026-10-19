import { useDrive } from "../lib/store";
import { Speedometer, ScoreGauge } from "../components/gauges";
import { TripCard, EventBanner, GpsCard, BuzzerCard, ConnectionPanel, DemoStrip } from "../components/cards";
import { MapPanel } from "../components/MapPanel";
import { SensorCharts } from "../components/SensorCharts";
import { EventHistory } from "../components/EventHistory";

export function Dashboard() {
  const s = useDrive();

  return (
    <div className="space-y-4">
      <DemoStrip />

      <div className="grid gap-4 xl:grid-cols-12">
        <div className="xl:col-span-4"><TripCard /></div>

        <section className="card p-5 rise-in xl:col-span-4" aria-label="Speed">
          <h2 className="card-title">SPEED · GPS</h2>
          <div className="mt-2">
            <Speedometer speed={s.packet?.speed ?? 0} limit={s.settings.speedLimit} />
          </div>
        </section>

        <section className="card p-5 rise-in xl:col-span-4" aria-label="Driver safety score">
          <h2 className="card-title">DRIVER SCORE</h2>
          <div className="mt-4">
            <ScoreGauge score={s.score} reasons={s.scoreReasons} />
          </div>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <MapPanel className="min-h-[380px] xl:col-span-8" height="440px" />
        <div className="flex flex-col gap-4 xl:col-span-4">
          <EventBanner />
          <GpsCard />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <div className="xl:col-span-8"><SensorCharts /></div>
        <div className="flex flex-col gap-4 xl:col-span-4">
          <ConnectionPanel />
          <BuzzerCard />
        </div>
      </div>

      <EventHistory compact />
    </div>
  );
}
