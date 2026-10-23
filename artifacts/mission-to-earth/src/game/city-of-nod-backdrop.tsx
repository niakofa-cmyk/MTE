type SkylineBlock = {
  x: number;
  width: number;
  height: number;
  roof: "flat" | "spire" | "step";
};

const DISTANT_SKYLINE: SkylineBlock[] = [
  { x: -90, width: 170, height: 230, roof: "flat" },
  { x: 55, width: 185, height: 320, roof: "step" },
  { x: 225, width: 138, height: 255, roof: "flat" },
  { x: 350, width: 205, height: 410, roof: "spire" },
  { x: 535, width: 158, height: 288, roof: "flat" },
  { x: 680, width: 225, height: 350, roof: "step" },
  { x: 890, width: 148, height: 250, roof: "flat" },
  { x: 1020, width: 218, height: 430, roof: "spire" },
  { x: 1220, width: 160, height: 305, roof: "step" },
  { x: 1370, width: 230, height: 380, roof: "flat" },
  { x: 1550, width: 140, height: 260, roof: "flat" },
];

const FOREGROUND_SKYLINE: SkylineBlock[] = [
  { x: -120, width: 270, height: 240, roof: "step" },
  { x: 120, width: 250, height: 300, roof: "flat" },
  { x: 345, width: 215, height: 210, roof: "flat" },
  { x: 540, width: 290, height: 350, roof: "step" },
  { x: 805, width: 220, height: 250, roof: "flat" },
  { x: 1005, width: 290, height: 330, roof: "spire" },
  { x: 1270, width: 240, height: 270, roof: "step" },
  { x: 1490, width: 250, height: 225, roof: "flat" },
];

function Skyline({ blocks, baseY, color }: {
  blocks: SkylineBlock[];
  baseY: number;
  color: string;
}) {
  return (
    <g fill={color}>
      {blocks.map((block, index) => {
        const top = baseY - block.height;
        const center = block.x + block.width / 2;
        return (
          <g key={`${block.x}-${block.width}`}>
            <rect
              x={block.x}
              y={top}
              width={block.width}
              height={block.height}
              fill={color}
            />
            {block.roof === "step" ? (
              <rect
                x={block.x + block.width * 0.18}
                y={top - 34}
                width={block.width * 0.64}
                height={35}
                fill={color}
              />
            ) : null}
            {block.roof === "spire" ? (
              <path
                d={`M ${center - 13} ${top} L ${center} ${top - 58} L ${center + 13} ${top} Z`}
                fill={color}
              />
            ) : null}
            <rect
              x={block.x + 4}
              y={top + 10}
              width={Math.max(0, block.width - 8)}
              height={Math.max(0, block.height - 14)}
              fill="url(#nod-window-grid)"
              opacity={index % 3 === 0 ? 0.68 : 0.45}
            />
            {block.roof === "spire" ? (
              <line
                x1={center}
                y1={top - 58}
                x2={center}
                y2={top - 94}
                stroke="#d9a34d"
                strokeWidth="2"
                opacity="0.72"
              />
            ) : null}
          </g>
        );
      })}
    </g>
  );
}

/** Static, lightweight Nod skyline shown only when the browser cannot create WebGL. */
export function CityOfNodBackdrop() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className="pointer-events-none absolute inset-0 z-0 h-full w-full"
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id="nod-sky-gradient" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#071018" />
          <stop offset="0.56" stopColor="#22252a" />
          <stop offset="0.8" stopColor="#544337" />
          <stop offset="1" stopColor="#11161b" />
        </linearGradient>
        <radialGradient id="nod-horizon-glow">
          <stop offset="0" stopColor="#d27738" stopOpacity="0.46" />
          <stop offset="0.56" stopColor="#a84e39" stopOpacity="0.18" />
          <stop offset="1" stopColor="#091117" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="nod-street-fade" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#24d8c4" stopOpacity="0.34" />
          <stop offset="1" stopColor="#24d8c4" stopOpacity="0.02" />
        </linearGradient>
        <pattern id="nod-window-grid" width="38" height="30" patternUnits="userSpaceOnUse">
          <rect x="7" y="8" width="8" height="10" fill="#e7ab59" opacity="0.72" />
          <rect x="24" y="8" width="7" height="10" fill="#5ad3c5" opacity="0.54" />
        </pattern>
        <filter id="nod-soft-glow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="11" />
        </filter>
      </defs>

      <rect width="1600" height="900" fill="url(#nod-sky-gradient)" />
      <ellipse cx="790" cy="530" rx="650" ry="270" fill="url(#nod-horizon-glow)" />
      <path d="M0 584 C240 560 380 608 620 572 S1060 558 1280 588 S1490 570 1600 582 V760 H0Z" fill="#23272a" opacity="0.36" />

      <Skyline blocks={DISTANT_SKYLINE} baseY={730} color="#141c22" />

      <g opacity="0.78">
        <path d="M0 635 H1600 V900 H0Z" fill="#0c1217" />
        <path d="M800 638 L-160 900 M800 638 L160 900 M800 638 L480 900 M800 638 L680 900 M800 638 L920 900 M800 638 L1120 900 M800 638 L1440 900 M800 638 L1760 900"
          fill="none" stroke="url(#nod-street-fade)" strokeWidth="2" />
        <path d="M0 682 H1600 M0 718 H1600 M0 765 H1600 M0 826 H1600 M0 895 H1600"
          fill="none" stroke="#36cabb" strokeWidth="1" opacity="0.2" />
      </g>

      <g opacity="0.9">
        <path d="M1138 542 V205" stroke="#f0a54d" strokeWidth="15" opacity="0.16" filter="url(#nod-soft-glow)" />
        <path d="M1138 550 V220" stroke="#f3ba62" strokeWidth="2" opacity="0.78" />
        <circle cx="1138" cy="215" r="9" fill="#ffd48a" opacity="0.9" />
        <circle cx="1138" cy="215" r="25" fill="#ff9f42" opacity="0.24" filter="url(#nod-soft-glow)" />
        <path d="M1123 545 H1153" stroke="#e9ab5a" strokeWidth="3" opacity="0.74" />
      </g>

      <Skyline blocks={FOREGROUND_SKYLINE} baseY={850} color="#080d12" />
      <rect y="850" width="1600" height="50" fill="#070b0f" />
      <path d="M0 850 H1600" stroke="#c7803f" strokeWidth="2" opacity="0.46" />
    </svg>
  );
}
