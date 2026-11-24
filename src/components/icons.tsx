// Original inline SVG icon set (24×24, stroke = currentColor).
import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement>;

function Svg({ children, ...p }: P) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...p}
    >
      {children}
    </svg>
  );
}

/** からだ — standing figure with a "pain spot" ring at the knee. */
export const IconBody = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="4.3" r="2.1" />
    <path d="M8.6 8.2h6.8c.9 0 1.6.6 1.8 1.5l.9 4.6M8.6 8.2c-.9 0-1.6.6-1.8 1.5l-.9 4.6" />
    <path d="M9.4 8.4v5.2l-.5 7.6M14.6 8.4v5.2l.5 7.6M9.4 13.6h5.2" />
    <circle cx="15" cy="17" r="1.1" fill="currentColor" stroke="none" />
  </Svg>
);

/** 筋肉 — fusiform muscle belly with tendons and fibres. */
export const IconMuscle = (p: P) => (
  <Svg {...p}>
    <path d="M3.5 20.5l3-3M17.5 6.5l3-3" />
    <path d="M6.5 17.5C4.8 12.6 11.4 5 17.5 6.5c1.7 4.9-4.9 12.5-11 11z" />
    <path d="M9 14.8l5.6-5.6M8.4 11.9l3.4-3.4M11.9 15.4l3.4-3.4" strokeWidth={1.4} />
  </Svg>
);

/** エクササイズ — dumbbell. */
export const IconDumbbell = (p: P) => (
  <Svg {...p}>
    <path d="M7.5 12h9" />
    <rect x="4.6" y="7" width="2.9" height="10" rx="1.2" />
    <rect x="16.5" y="7" width="2.9" height="10" rx="1.2" />
    <path d="M2.8 10v4M21.2 10v4" />
  </Svg>
);

/** マイメニュー — checklist. */
export const IconChecklist = (p: P) => (
  <Svg {...p}>
    <rect x="4" y="3.5" width="16" height="17" rx="3" />
    <path d="M7.6 9l1.5 1.5 2.6-2.7M7.6 15l1.5 1.5 2.6-2.7" />
    <path d="M14 9.4h3M14 15.4h3" />
  </Svg>
);

/** ガイド — open book. */
export const IconBook = (p: P) => (
  <Svg {...p}>
    <path d="M12 6.6C10 5.1 7 4.6 3.5 5v13.4c3.5-.4 6.5.1 8.5 1.6 2-1.5 5-2 8.5-1.6V5C17 4.6 14 5.1 12 6.6z" />
    <path d="M12 6.6V20" />
  </Svg>
);

export const IconBack = (p: P) => (
  <Svg {...p}>
    <path d="M15 5l-7 7 7 7" strokeWidth={2.1} />
  </Svg>
);

export const IconChevron = (p: P) => (
  <Svg {...p}>
    <path d="M9 5.5l6.5 6.5L9 18.5" strokeWidth={2} />
  </Svg>
);

export const IconClose = (p: P) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6L6 18" strokeWidth={2} />
  </Svg>
);

export const IconSearch = (p: P) => (
  <Svg {...p}>
    <circle cx="10.8" cy="10.8" r="6.3" />
    <path d="M15.6 15.6L20 20" strokeWidth={2} />
  </Svg>
);

export const IconInfo = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.6" />
    <path d="M12 11v5.2" strokeWidth={2} />
    <circle cx="12" cy="7.9" r="1.1" fill="currentColor" stroke="none" />
  </Svg>
);

export const IconPlus = (p: P) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" strokeWidth={2} />
  </Svg>
);

export const IconCheck = (p: P) => (
  <Svg {...p}>
    <path d="M5 12.5l4.5 4.5L19 7.5" strokeWidth={2.2} />
  </Svg>
);

export const IconUp = (p: P) => (
  <Svg {...p}>
    <path d="M6 14.5l6-6 6 6" strokeWidth={2} />
  </Svg>
);

export const IconDown = (p: P) => (
  <Svg {...p}>
    <path d="M6 9.5l6 6 6-6" strokeWidth={2} />
  </Svg>
);

export const IconTrash = (p: P) => (
  <Svg {...p}>
    <path d="M4.5 7h15M9.5 7V4.8h5V7M6.5 7l.8 12.2c.1 1 .9 1.8 1.9 1.8h5.6c1 0 1.8-.8 1.9-1.8L17.5 7" />
    <path d="M10.2 11v6M13.8 11v6" />
  </Svg>
);

export const IconCube = (p: P) => (
  <Svg {...p}>
    <path d="M12 3l7.8 4.5v9L12 21l-7.8-4.5v-9L12 3z" />
    <path d="M4.2 7.5L12 12l7.8-4.5M12 12v9" />
  </Svg>
);

export const IconAlert = (p: P) => (
  <Svg {...p}>
    <path d="M10.3 4.2L2.9 17.4c-.8 1.3.2 3 1.7 3h14.8c1.5 0 2.5-1.7 1.7-3L13.7 4.2c-.8-1.3-2.6-1.3-3.4 0z" />
    <path d="M12 9.2v4.6" strokeWidth={2} />
    <circle cx="12" cy="16.9" r="1.1" fill="currentColor" stroke="none" />
  </Svg>
);

export const IconShield = (p: P) => (
  <Svg {...p}>
    <path d="M12 3l7 2.8v5.4c0 4.4-2.9 8.2-7 9.8-4.1-1.6-7-5.4-7-9.8V5.8L12 3z" />
    <path d="M8.8 12l2.2 2.2 4.2-4.3" />
  </Svg>
);

export const IconTarget = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <circle cx="12" cy="12" r="4.5" />
    <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
  </Svg>
);

export const IconDownload = (p: P) => (
  <Svg {...p}>
    <path d="M12 4v11M7 10.5l5 5 5-5M5 19.5h14" />
  </Svg>
);

export const IconEdit = (p: P) => (
  <Svg {...p}>
    <path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4" />
  </Svg>
);

export const IconPulse = (p: P) => (
  <Svg {...p}>
    <path d="M3 12.5h4l2.2-5.5 4 11 2.4-5.5H21" />
  </Svg>
);

export const IconHand = (p: P) => (
  <Svg {...p}>
    <path d="M8 12.5V6.2a1.4 1.4 0 0 1 2.8 0v5M10.8 11V4.8a1.4 1.4 0 0 1 2.8 0V11M13.6 11V6a1.4 1.4 0 0 1 2.8 0v6.5" />
    <path d="M16.4 9.5a1.4 1.4 0 0 1 2.8 0V14c0 3.9-2.7 6.5-6.4 6.5-2.6 0-4.3-1.2-5.6-3.4L5 13.4a1.4 1.4 0 0 1 2.3-1.6L8 12.8" />
  </Svg>
);

export const IconBulb = (p: P) => (
  <Svg {...p}>
    <path d="M9 17.5h6M10 20.5h4" />
    <path d="M12 3.5a6 6 0 0 0-3.6 10.8c.6.5 1 1.3 1 2.1v1.1h5.2v-1.1c0-.8.4-1.6 1-2.1A6 6 0 0 0 12 3.5z" />
  </Svg>
);

export const IconFlag = (p: P) => (
  <Svg {...p}>
    <path d="M5.5 21V4M5.5 4.5h11l-2 4 2 4h-11" />
  </Svg>
);

export const IconLayers = (p: P) => (
  <Svg {...p}>
    <path d="M12 4l8.5 4.5L12 13 3.5 8.5 12 4z" />
    <path d="M3.5 12.5L12 17l8.5-4.5M3.5 16.3L12 20.8l8.5-4.5" />
  </Svg>
);

export const IconSun = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2.8v2.1M12 19.1v2.1M2.8 12h2.1M19.1 12h2.1M5.5 5.5L7 7M17 17l1.5 1.5M5.5 18.5L7 17M17 7l1.5-1.5" />
  </Svg>
);

export const IconMoon = (p: P) => (
  <Svg {...p}>
    <path d="M19.5 14.6A7.9 7.9 0 0 1 9.4 4.5a7.9 7.9 0 1 0 10.1 10.1z" />
  </Svg>
);

export const IconAuto = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.4" />
    <path d="M12 3.6v16.8A8.4 8.4 0 0 0 12 3.6z" fill="currentColor" stroke="none" />
  </Svg>
);

export const IconStretch = (p: P) => (
  <Svg {...p}>
    <path d="M4 12h16M7 8.5L3.5 12 7 15.5M17 8.5l3.5 3.5-3.5 3.5" />
  </Svg>
);

export const IconBalance = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="4.6" r="1.9" />
    <path d="M12 7.5v7l-1.2 6.3M12 14.5l4.5-1.6M5 10l7-1.2 7 1.2" />
  </Svg>
);

export const IconBolt = (p: P) => (
  <Svg {...p}>
    <path d="M13 3L5.5 13.5H12L11 21l7.5-10.5H12L13 3z" />
  </Svg>
);

// ── discipline glyphs ──

export const IconSwim = (p: P) => (
  <Svg {...p}>
    <path d="M2.5 15.5c1.6 0 1.6-1.3 3.2-1.3s1.6 1.3 3.2 1.3 1.6-1.3 3.2-1.3 1.6 1.3 3.2 1.3 1.6-1.3 3.2-1.3 1.6 1.3 2 1.3" />
    <path d="M2.5 19.5c1.6 0 1.6-1.3 3.2-1.3s1.6 1.3 3.2 1.3 1.6-1.3 3.2-1.3 1.6 1.3 3.2 1.3 1.6-1.3 3.2-1.3 1.6 1.3 2 1.3" />
    <circle cx="16.8" cy="7.6" r="2" />
    <path d="M5 12l4.2-3.3 3.3 2.2 2-1.4" />
  </Svg>
);

export const IconBike = (p: P) => (
  <Svg {...p}>
    <circle cx="6" cy="15.5" r="3.8" />
    <circle cx="18" cy="15.5" r="3.8" />
    <path d="M6 15.5l3.6-7h6.2L18 15.5M9.6 8.5L12.4 15.5h-6.4M15.2 5.8h2.4l-1.8 2.7M8.2 6.2h3" />
  </Svg>
);

export const IconRun = (p: P) => (
  <Svg {...p}>
    <path d="M3 16.2c0-1 .7-1.7 1.6-1.9l3.6-.6 2.4-4.4 1.8.6-.6 2.3c1.6 1 3.6 1.6 6 1.9 1.4.2 2.2 1.3 2.2 2.5V18H4.4c-.8 0-1.4-.6-1.4-1.4v-.4z" />
    <path d="M3.2 18h17.4M10.5 12.3l1.4.5M9.6 14l1.5.5" />
  </Svg>
);

export const DISCIPLINE_ICON = { swim: IconSwim, bike: IconBike, run: IconRun } as const;
