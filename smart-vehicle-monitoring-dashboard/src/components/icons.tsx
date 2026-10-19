import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };

const base = (p: P) => {
  const { size = 18, ...rest } = p;
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    ...rest,
  };
};

export const IconSteering = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="2.4" fill="currentColor" stroke="none" />
    <path d="M12 9.6V3.4M14.1 13.2l5.4 3.1M9.9 13.2l-5.4 3.1" />
  </svg>
);
export const IconGauge = (p: P) => (
  <svg {...base(p)}>
    <path d="M4.5 19a9 9 0 1 1 15 0" />
    <path d="M12 13.5 15.5 9" />
    <circle cx="12" cy="14" r="1.4" fill="currentColor" stroke="none" />
  </svg>
);
export const IconMap = (p: P) => (
  <svg {...base(p)}>
    <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z" />
    <path d="M9 4v14M15 6v14" />
  </svg>
);
export const IconChart = (p: P) => (
  <svg {...base(p)}>
    <path d="M3 3v18h18" />
    <path d="M7 15l4-5 3 3 5-7" />
  </svg>
);
export const IconWarning = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 3 2.5 19.5h19L12 3Z" />
    <path d="M12 10v4.5" />
    <circle cx="12" cy="17" r="0.9" fill="currentColor" stroke="none" />
  </svg>
);
export const IconGear = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="3.2" />
    <path d="M12 2.8v2.6M12 18.6v2.6M4.1 7.4l2.2 1.3M17.7 15.3l2.2 1.3M2.8 12h2.6M18.6 12h2.6M4.1 16.6l2.2-1.3M17.7 8.7l2.2-1.3" />
  </svg>
);
export const IconSatellite = (p: P) => (
  <svg {...base(p)}>
    <path d="m9 7 4-4 4 4-4 4-4-4ZM7 9l-4 4 4 4 4-4" />
    <path d="m11 11 2 2M15 15l2.5 2.5" />
    <path d="M18.5 18.5a3 3 0 0 1-3-3" opacity="0.6" />
  </svg>
);
export const IconPlay = (p: P) => (
  <svg {...base(p)}><path d="M7 4.5v15l12-7.5-12-7.5Z" fill="currentColor" stroke="none" /></svg>
);
export const IconStop = (p: P) => (
  <svg {...base(p)}><rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" stroke="none" /></svg>
);
export const IconCopy = (p: P) => (
  <svg {...base(p)}>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" transform="translate(2 2)" />
  </svg>
);
export const IconShare = (p: P) => (
  <svg {...base(p)}>
    <circle cx="6" cy="12" r="2.5" /><circle cx="17" cy="6" r="2.5" /><circle cx="17" cy="18" r="2.5" />
    <path d="m8.3 10.8 6.4-3.6M8.3 13.2l6.4 3.6" />
  </svg>
);
export const IconExternal = (p: P) => (
  <svg {...base(p)}>
    <path d="M14 4h6v6M20 4l-9 9" />
    <path d="M19 13v6a1.5 1.5 0 0 1-1.5 1.5h-12A1.5 1.5 0 0 1 4 19V6.5A1.5 1.5 0 0 1 5.5 5H11" />
  </svg>
);
export const IconCrosshair = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="7.5" />
    <path d="M12 2.5v4M12 17.5v4M2.5 12h4M17.5 12h4" />
    <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
  </svg>
);
export const IconTrash = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13M10 11v6M14 11v6" />
  </svg>
);
export const IconChip = (p: P) => (
  <svg {...base(p)}>
    <rect x="6" y="6" width="12" height="12" rx="2" />
    <rect x="10" y="10" width="4" height="4" />
    <path d="M9 2.5v3.5M15 2.5V6M9 18v3.5M15 18v3.5M2.5 9H6M2.5 15H6M18 9h3.5M18 15h3.5" />
  </svg>
);
export const IconRoute = (p: P) => (
  <svg {...base(p)}>
    <circle cx="6" cy="18" r="2.2" /><circle cx="18" cy="6" r="2.2" />
    <path d="M8 18h7a3.5 3.5 0 0 0 0-7H9.5a3.5 3.5 0 0 1 0-7H16" strokeDasharray="0.1 3.4" />
  </svg>
);
export const IconHistory = (p: P) => (
  <svg {...base(p)}>
    <path d="M3.5 12a8.5 8.5 0 1 1 2.5 6M3.5 12H3m.5 0L3 8.5" />
    <path d="M12 7.5V12l3.5 2" />
  </svg>
);
export const IconFlag = (p: P) => (
  <svg {...base(p)}>
    <path d="M5 21V4" />
    <path d="M5 4c4-2.4 8 2.4 12 0v9c-4 2.4-8-2.4-12 0" fill="currentColor" fillOpacity="0.18" />
  </svg>
);
export const IconShield = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 2.5 4.5 5.5v6c0 5 3.2 8.4 7.5 10 4.3-1.6 7.5-5 7.5-10v-6L12 2.5Z" />
    <path d="m8.8 12 2.3 2.3 4.1-4.6" />
  </svg>
);
export const IconBell = (p: P) => (
  <svg {...base(p)}>
    <path d="M6 16v-6a6 6 0 1 1 12 0v6l1.5 2.5h-15L6 16Z" />
    <path d="M10 21a2 2 0 0 0 4 0" />
  </svg>
);
export const IconPulse = (p: P) => (
  <svg {...base(p)}>
    <path d="M2.5 12h4l2.5-6.5 4 13 2.5-6.5h6" />
  </svg>
);
export const IconDownload = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 3.5V15m0 0 4-4m-4 4-4-4" />
    <path d="M4 17.5v2A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5v-2" />
  </svg>
);
export const IconCheck = (p: P) => (
  <svg {...base(p)}><path d="m4.5 12.5 5 5 10-11" /></svg>
);
export const IconX = (p: P) => (
  <svg {...base(p)}><path d="M5.5 5.5l13 13M18.5 5.5l-13 13" /></svg>
);
export const IconTurnLeft = (p: P) => (
  <svg {...base(p)}>
    <path d="M9 20v-8a4 4 0 0 1 4-4h6" opacity="0.45" />
    <path d="M9 20v-8a4 4 0 0 0-4-4" opacity="0" />
    <path d="M13 4.5 9.5 8 13 11.5" transform="translate(-4 0)" />
    <path d="M15 20v-6a3 3 0 0 0-3-3H5.5M9 7.5 5.5 11 9 14.5" />
  </svg>
);
export const IconTurnRight = (p: P) => (
  <svg {...base(p)}>
    <path d="M9 20v-6a3 3 0 0 1 3-3h6.5M15 7.5 18.5 11 15 14.5" />
  </svg>
);
export const IconBrake = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="8" />
    <circle cx="12" cy="12" r="3.5" />
    <path d="M12 4v2.5M12 17.5V20M4 12h2.5M17.5 12H20" opacity="0.6" />
  </svg>
);
export const IconBolt = (p: P) => (
  <svg {...base(p)}><path d="M13 2.5 4.5 13.5H11l-1 8 8.5-11H12l1-8Z" /></svg>
);
export const IconCalendar = (p: P) => (
  <svg {...base(p)}>
    <rect x="3.5" y="5" width="17" height="16" rx="2" />
    <path d="M3.5 10h17M8 2.5V7M16 2.5V7" />
  </svg>
);
export const IconWifi = (p: P) => (
  <svg {...base(p)}>
    <path d="M2.5 9a14 14 0 0 1 19 0M5.5 12.5a9.5 9.5 0 0 1 13 0M8.5 16a5 5 0 0 1 7 0" />
    <circle cx="12" cy="19.5" r="1.1" fill="currentColor" stroke="none" />
  </svg>
);
export const IconHome = (p: P) => (
  <svg {...base(p)}>
    <path d="m3.5 11 8.5-7 8.5 7" />
    <path d="M5.5 9.5V20h13V9.5" />
    <path d="M10 20v-5.5h4V20" />
  </svg>
);
export const IconSound = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 9.5v5h3.5L12 19V5L7.5 9.5H4Z" />
    <path d="M15.5 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12" />
  </svg>
);
export const IconCar = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 16v-3.5L6 7a2 2 0 0 1 1.9-1.3h8.2A2 2 0 0 1 18 7l2 5.5V16" />
    <path d="M4 12.5h16M6.5 16v2M17.5 16v2" />
    <circle cx="7.5" cy="14.5" r="0.9" fill="currentColor" stroke="none" />
    <circle cx="16.5" cy="14.5" r="0.9" fill="currentColor" stroke="none" />
  </svg>
);
