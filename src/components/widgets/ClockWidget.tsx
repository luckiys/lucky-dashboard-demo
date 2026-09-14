"use client";

import { useEffect, useState } from "react";

export default function ClockWidget() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const hours = now.getHours();
  const greeting =
    hours < 12 ? "Good morning" : hours < 17 ? "Good afternoon" : "Good evening";

  const timeStr = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="flex flex-col justify-between h-full">
      <div>
        <div className="widget-head">
          <p className="section-label">Local Time</p>
        </div>
        <div className="widget-data tabular-nums" style={{ fontSize: "var(--fs-data)" }}>
          {timeStr}
        </div>
        <p className="mt-2" style={{ fontSize: "var(--fs-tiny)", color: "var(--text-secondary)" }}>
          {dateStr}
        </p>
      </div>
      <div>
        <p className="font-semibold" style={{ fontSize: "var(--fs-lead)", color: "var(--accent-purple)", lineHeight: "var(--lh-snug)" }}>
          {greeting}, Lucky
        </p>
        <p className="mt-0.5" style={{ fontSize: "var(--fs-tiny)", color: "var(--text-secondary)" }}>
          {process.env.NEXT_PUBLIC_CITY ?? "West Lafayette, IN"}
        </p>
      </div>
    </div>
  );
}
