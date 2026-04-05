"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { initWebGL, setupBasic2D } from "@/lib/webgl-utils";
import {
  drawCircle,
  drawRectangle,
  drawRoundedRectangle,
  isPointInCircle,
  isPointInRectangle,
  Rectangle,
} from "@/lib/webgl-shapes";
import { useProgress } from "@/lib/progress-context";
import {
  recordMoneyCountingChallenge,
  recordMoneyCountingRunComplete,
} from "@/lib/progress";

interface CurrencyItem {
  id: string;
  type: "coin" | "bill";
  value: number;
  x: number;
  y: number;
  color: string;
  radius?: number;
  width?: number;
  height?: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  radius: number;
  color: string;
}

type Difficulty = "easy" | "medium" | "hard";

const COUNTING_AREA_Y_OFFSET = 110;

const GOAL_POOL = [
  11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 23, 24, 26, 27, 28, 29, 31, 32,
  33, 34, 36, 37, 38, 39, 41, 42, 43, 44, 46, 47, 48, 49, 51, 52, 53, 54, 56,
  57, 58, 59, 61, 62, 63, 64, 66, 67, 68, 69, 71, 72, 73, 74, 76, 77, 78, 79,
  81, 82, 83, 84, 86, 87, 88, 89, 91, 92, 93, 94, 96, 97, 98, 99, 101, 103, 104,
  106, 107, 108, 109, 112, 114, 117, 118, 119, 121, 123, 126, 127, 128, 129,
  131, 133, 136, 137, 138, 139, 141, 143, 146, 147, 148, 149, 151, 152, 153,
  156, 157, 158, 159, 161, 162, 163, 166, 167, 168, 169, 171, 172, 173, 176,
  177, 178, 179, 181, 182, 183, 186, 187, 188, 189, 191, 192, 193, 196, 197,
  198, 199, 201, 203, 204, 206, 207, 208, 209, 212, 214, 217, 218, 219, 221,
  223, 226, 227, 228, 229, 231, 233, 236, 237, 238, 239, 241, 243, 246, 247,
  248, 249, 251, 253, 256, 257, 258, 259, 261, 263, 266, 267, 268, 269, 271,
  273, 276, 277, 278, 279, 281, 283, 286, 287, 288, 289, 291, 293, 296, 297,
  298, 299, 501, 503, 506, 507, 508, 509, 512, 514, 517, 518, 519, 521, 523,
  526, 527, 528, 529, 531, 533, 536, 537, 538, 539, 541, 543, 546, 547, 548,
  549, 551, 553, 556, 557, 558, 559,
];

const CHALLENGE_COUNT = 12;
const HEADER_HEIGHT = 80;
const PALETTE_Y = HEADER_HEIGHT + 28;
const PALETTE_BAR_HEIGHT = 56;
const PALETTE_PADDING = 50;

// Bangladesh currency palette
const BANGLADESH_CURRENCY: Omit<CurrencyItem, "x" | "y">[] = [
  { id: "coin-1", type: "coin", value: 1, color: "#b8b8b8", radius: 26 },
  { id: "coin-2", type: "coin", value: 2, color: "#a8a8a8", radius: 30 },
  { id: "coin-5", type: "coin", value: 5, color: "#989898", radius: 34 },
  {
    id: "bill-10",
    type: "bill",
    value: 10,
    color: "#b85445",
    width: 76,
    height: 38,
  },
  {
    id: "bill-20",
    type: "bill",
    value: 20,
    color: "#3d9b5c",
    width: 76,
    height: 38,
  },
  {
    id: "bill-50",
    type: "bill",
    value: 50,
    color: "#e89550",
    width: 76,
    height: 38,
  },
  {
    id: "bill-100",
    type: "bill",
    value: 100,
    color: "#3b82b6",
    width: 76,
    height: 38,
  },
  {
    id: "bill-200",
    type: "bill",
    value: 200,
    color: "#d4af37",
    width: 76,
    height: 38,
  },
  {
    id: "bill-500",
    type: "bill",
    value: 500,
    color: "#40916c",
    width: 76,
    height: 38,
  },
  {
    id: "bill-1000",
    type: "bill",
    value: 1000,
    color: "#6b7280",
    width: 76,
    height: 38,
  },
];

// Extract and sort denominations purely mathematically for the Greedy Algorithm
const DENOMINATIONS = Array.from(
  new Set(BANGLADESH_CURRENCY.map((c) => c.value)),
).sort((a, b) => b - a);

// MATHEMATICAL ENGINE: Calculates absolute minimum notes
function getMinNotes(target: number): number {
  let count = 0;
  let remaining = target;
  for (const val of DENOMINATIONS) {
    if (remaining <= 0) break;
    const notes = Math.floor(remaining / val);
    count += notes;
    remaining %= val;
  }
  return count;
}

// Applies difficulty bounds constraints
function getMaxAllowedNotes(target: number, level: Difficulty): number {
  const nMin = getMinNotes(target);
  const multiplier = level === "hard" ? 1.0 : level === "medium" ? 2.5 : 5.0;
  return Math.min(Math.ceil(nMin * multiplier), 50); // Global hard cap of 50
}

function generateChallenges(): number[] {
  const out: number[] = [];
  for (let i = 0; i < CHALLENGE_COUNT; i++)
    out.push(GOAL_POOL[Math.floor(Math.random() * GOAL_POOL.length)]);
  return out;
}

function addBurst(
  particlesRef: React.MutableRefObject<Particle[]>,
  x: number,
  y: number,
) {
  const colors = ["#fef08a", "#fde047", "#facc15", "#fef3c7"];
  for (let i = 0; i < 14; i++) {
    const angle = (i / 14) * Math.PI * 2 + Math.random() * 0.5;
    const speed = 80 + Math.random() * 120;
    particlesRef.current.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.6 + Math.random() * 0.4,
      maxLife: 1,
      radius: 4 + Math.random() * 5,
      color: colors[i % colors.length],
    });
  }
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}
function hexToRgb(hex: string) {
  const h = hex.replace("#", "").trim();
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  const num = parseInt(full, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}
function rgbToHex(r: number, g: number, b: number) {
  const to = (x: number) => x.toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}
function mix(a: string, b: string, t: number) {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  const tt = clamp01(t);
  return rgbToHex(
    Math.round(A.r + (B.r - A.r) * tt),
    Math.round(A.g + (B.g - A.g) * tt),
    Math.round(A.b + (B.b - A.b) * tt),
  );
}
function lighten(hex: string, t: number) {
  return mix(hex, "#ffffff", t);
}
function darken(hex: string, t: number) {
  return mix(hex, "#000000", t);
}

function getPaletteItems(canvasWidth: number): CurrencyItem[] {
  const n = BANGLADESH_CURRENCY.length;
  const spacing = (canvasWidth - 2 * PALETTE_PADDING) / Math.max(1, n - 1);
  return BANGLADESH_CURRENCY.map((item, i) => {
    const x = PALETTE_PADDING + i * spacing;
    return { ...item, id: `palette-${item.id}`, x, y: PALETTE_Y };
  });
}

function createDuplicate(
  template: Omit<CurrencyItem, "x" | "y">,
  x: number,
  y: number,
): CurrencyItem {
  const id = `placed-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  return { ...template, id, x, y };
}

type CashRegister = {
  x: number;
  y: number;
  width: number;
  height: number;
  trayX: number;
  trayY: number;
  trayW: number;
  trayH: number;
};

function getCashRegister(w: number, h: number): CashRegister {
  const baseW = Math.min(560, Math.max(360, w * 0.58));
  const baseH = Math.min(200, Math.max(160, h * 0.24));
  const x = w * 0.5;
  const y = h - COUNTING_AREA_Y_OFFSET;
  const trayW = baseW * 0.56;
  const trayH = baseH * 0.28;
  const trayX = x - baseW * 0.06;
  const trayY = y + baseH * 0.16;
  return { x, y, width: baseW, height: baseH, trayX, trayY, trayW, trayH };
}

function isPlaced(item: CurrencyItem): boolean {
  return item.id.startsWith("placed-");
}

function isInTray(item: CurrencyItem, reg: CashRegister): boolean {
  const left = reg.trayX - reg.trayW / 2;
  const right = reg.trayX + reg.trayW / 2;
  const top = reg.trayY - reg.trayH / 2;
  const bottom = reg.trayY + reg.trayH / 2;
  return item.x >= left && item.x <= right && item.y >= top && item.y <= bottom;
}

type TrashZone = { x: number; y: number; width: number; height: number };

function pointInRect(px: number, py: number, r: TrashZone) {
  const left = r.x - r.width / 2;
  const right = r.x + r.width / 2;
  const top = r.y - r.height / 2;
  const bottom = r.y + r.height / 2;
  return px >= left && px <= right && py >= top && py <= bottom;
}

export default function MoneyCounting() {
  const { userId } = useProgress();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [totalValue, setTotalValue] = useState(0);
  const [displayTotal, setDisplayTotal] = useState(0);
  const [showInstructions, setShowInstructions] = useState(false);
  const [canvasSize, setCanvasSize] = useState({
    w: 800,
    h: 500,
    displayW: 800,
    displayH: 500,
  });
  const [placedItems, setPlacedItems] = useState<CurrencyItem[]>([]);
  const [challenges, setChallenges] = useState<number[]>(() =>
    generateChallenges(),
  );
  const [challengeIndex, setChallengeIndex] = useState(0);
  const [allDone, setAllDone] = useState(false);
  const [celebration, setCelebration] = useState(false);

  const celebrationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const paletteItems = getPaletteItems(canvasSize.w);
  const allItems = [...paletteItems, ...placedItems];
  const goal = challenges[challengeIndex] ?? 0;
  const maxAllowedNotes = useMemo(
    () => getMaxAllowedNotes(goal, difficulty),
    [goal, difficulty],
  );

  const itemsRef = useRef<CurrencyItem[]>(allItems);
  const selectedRef = useRef<string | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const displayTotalRef = useRef(0);
  const lastDisplayRef = useRef(0);
  const lastWonGoalRef = useRef<number | null>(null);
  const completedChallengesRef = useRef(0);

  const cursorRef = useRef({ x: -1000, y: -1000, inside: false });
  const trashHoverRef = useRef(false);
  const [trashHover, setTrashHover] = useState(false);

  useEffect(() => {
    itemsRef.current = allItems;
    selectedRef.current = selectedItem;
  }, [allItems, selectedItem]);

  const cashRegister = useMemo(
    () => getCashRegister(canvasSize.w, canvasSize.h),
    [canvasSize.w, canvasSize.h],
  );

  const trashZone: TrashZone = useMemo(() => {
    const w = canvasSize.w;
    const h = canvasSize.h;
    const width = Math.max(72, Math.min(112, w * 0.12));
    const height = Math.max(72, Math.min(112, h * 0.14));
    const margin = 26;
    return {
      x: w - margin - width / 2,
      y: h - margin - height / 2,
      width,
      height,
    };
  }, [canvasSize.w, canvasSize.h]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateCanvasSize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    };
    updateCanvasSize();

    const { gl } = initWebGL(canvas);
    if (!gl) return;

    const setup = setupBasic2D(gl, canvas);
    if (!setup) return;

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const handleResize = () => {
      updateCanvasSize();
      const rect = canvas.getBoundingClientRect();
      setCanvasSize({
        w: canvas.width,
        h: canvas.height,
        displayW: rect.width,
        displayH: rect.height,
      });
      gl.viewport(0, 0, canvas.width, canvas.height);
      if (setup.resolutionLocation)
        gl.uniform2f(setup.resolutionLocation, canvas.width, canvas.height);
    };

    let lastTime = performance.now();
    const startTime = lastTime;

    const JOLLY_COLORS = [
      "#fef08a",
      "#fde047",
      "#facc15",
      "#fef3c7",
      "#a7f3d0",
      "#6ee7b7",
      "#fbcfe8",
      "#f9a8d4",
      "#c4b5fd",
      "#a78bfa",
      "#fcd34d",
      "#fbbf24",
    ];

    const numFloating = 55;
    const floatingParticles: {
      x: number;
      y: number;
      vx: number;
      vy: number;
      phase: number;
      size: number;
      color: string;
    }[] = [];
    const playTopInit = PALETTE_Y + PALETTE_BAR_HEIGHT / 2 + 24;
    for (let i = 0; i < numFloating; i++) {
      floatingParticles.push({
        x: Math.random() * (canvas.width - 100) + 50,
        y:
          playTopInit +
          Math.random() *
            (canvas.height - COUNTING_AREA_Y_OFFSET - playTopInit - 60),
        vx: (Math.random() - 0.5) * 24,
        vy: (Math.random() - 0.5) * 24,
        phase: Math.random() * Math.PI * 2,
        size: 1.5 + Math.random() * 3.5,
        color: JOLLY_COLORS[i % JOLLY_COLORS.length],
      });
    }

    const render = (time: number) => {
      const w = canvas.width;
      const h = canvas.height;
      const dt = Math.min(0.05, (time - lastTime) / 1000);
      lastTime = time;
      const t = (time - startTime) / 1000;

      gl.viewport(0, 0, w, h);
      if (setup.resolutionLocation)
        gl.uniform2f(setup.resolutionLocation, w, h);

      gl.clearColor(0.11, 0.13, 0.16, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);

      const paletteBar: Rectangle = {
        x: w / 2,
        y: PALETTE_Y,
        width: w,
        height: PALETTE_BAR_HEIGHT,
        color: "#1a2332",
      };
      drawRectangle(gl, setup, paletteBar);
      drawRectangle(gl, setup, {
        x: w / 2,
        y: PALETTE_Y + PALETTE_BAR_HEIGHT / 2,
        width: w,
        height: 2,
        color: "#334155",
      });

      const playTop = PALETTE_Y + PALETTE_BAR_HEIGHT / 2 + 24;
      const playBottom = h - COUNTING_AREA_Y_OFFSET - 40;

      for (let i = 0; i < floatingParticles.length; i++) {
        const p = floatingParticles[i];
        const bouncy =
          0.8 * Math.sin(t * 2.2 + p.phase) +
          0.6 * Math.cos(t * 1.7 + p.phase * 0.9);
        p.vx += bouncy * 0.35;
        p.vy += bouncy * 0.3;
        p.vx += (Math.random() - 0.5) * 0.4;
        p.vy += (Math.random() - 0.5) * 0.4;
        p.vx *= 0.985;
        p.vy *= 0.985;
        p.x += p.vx * dt;
        p.y += p.vy * dt;

        if (p.x < 20) {
          p.x = 20;
          p.vx *= -0.6;
        }
        if (p.x > w - 20) {
          p.x = w - 20;
          p.vx *= -0.6;
        }
        if (p.y < playTop) {
          p.y = playTop;
          p.vy *= -0.6;
        }
        if (p.y > playBottom) {
          p.y = playBottom;
          p.vy *= -0.6;
        }

        const twinkle = 0.7 + 0.35 * Math.sin(t * 3 + p.phase);
        drawCircle(gl, setup, {
          x: p.x,
          y: p.y,
          radius: p.size * twinkle,
          color: p.color,
        });
      }

      const reg = getCashRegister(w, h);
      const items = itemsRef.current;
      const selected = selectedRef.current;
      const totalHere = items
        .filter((it) => isPlaced(it) && isInTray(it, reg))
        .reduce((s, it) => s + it.value, 0);

      displayTotalRef.current += (totalHere - displayTotalRef.current) * 0.12;
      const rounded = Math.round(displayTotalRef.current);
      if (rounded !== lastDisplayRef.current) {
        lastDisplayRef.current = rounded;
        setDisplayTotal(rounded);
      }

      const pulse = totalHere > 0 ? 0.08 + 0.05 * Math.sin(t * 4) : 0;

      drawRoundedRectangle(gl, setup, {
        x: reg.x,
        y: reg.y + 7,
        width: reg.width,
        height: reg.height,
        color: "rgba(0,0,0,0.35)",
        cornerRadius: 22,
      });
      drawRoundedRectangle(gl, setup, {
        x: reg.x,
        y: reg.y,
        width: reg.width,
        height: reg.height,
        color: "#111827",
        cornerRadius: 22,
      });
      drawRoundedRectangle(gl, setup, {
        x: reg.x - reg.width * 0.02,
        y: reg.y - reg.height * 0.06,
        width: reg.width * 0.86,
        height: reg.height * 0.05,
        color: "rgba(255,255,255,0.05)",
        cornerRadius: 16,
      });
      drawRoundedRectangle(gl, setup, {
        x: reg.x,
        y: reg.y - reg.height * 0.18,
        width: reg.width * 0.92,
        height: reg.height * 0.42,
        color: "#0b1220",
        cornerRadius: 18,
      });
      drawRoundedRectangle(gl, setup, {
        x: reg.x - reg.width * 0.18,
        y: reg.y - reg.height * 0.22,
        width: reg.width * 0.34,
        height: reg.height * 0.2,
        color: totalHere === goal && goal > 0 ? "#064e3b" : "#0f172a",
        cornerRadius: 14,
      });
      if (totalHere > 0) {
        drawRoundedRectangle(gl, setup, {
          x: reg.x - reg.width * 0.18,
          y: reg.y - reg.height * 0.22,
          width: reg.width * 0.34 + 8,
          height: reg.height * 0.2 + 8,
          color:
            totalHere === goal && goal > 0
              ? "#34d399"
              : pulse > 0
                ? "#60a5fa"
                : "#3b82f6",
          cornerRadius: 16,
        });
      }
      for (let k = 0; k < 3; k++) {
        drawRectangle(gl, setup, {
          x: reg.x - reg.width * 0.18,
          y: reg.y - reg.height * (0.26 - k * 0.04),
          width: reg.width * 0.26,
          height: 2,
          color: "rgba(255,255,255,0.07)",
        });
      }

      const btnPanelX = reg.x + reg.width * 0.18;
      const btnPanelY = reg.y - reg.height * 0.2;
      const btnPanelW = reg.width * 0.4;
      const btnPanelH = reg.height * 0.22;
      drawRoundedRectangle(gl, setup, {
        x: btnPanelX,
        y: btnPanelY,
        width: btnPanelW,
        height: btnPanelH,
        color: "#111c2e",
        cornerRadius: 16,
      });

      const dotCenterX = btnPanelX;
      const dotY = btnPanelY;
      const dotGap = btnPanelW * 0.14;
      const dotR = 7;
      (["#f59e0b", "#22c55e", "#60a5fa"] as const).forEach((c, i) => {
        const dx = (i - 1) * dotGap;
        drawCircle(gl, setup, {
          x: dotCenterX + dx,
          y: dotY,
          radius: dotR,
          color: c,
        });
      });

      drawRoundedRectangle(gl, setup, {
        x: reg.x - reg.width * 0.02,
        y: reg.y - reg.height * 0.36,
        width: reg.width * 0.46,
        height: reg.height * 0.07,
        color: "#0a0f1a",
        cornerRadius: 12,
      });
      drawRectangle(gl, setup, {
        x: reg.x - reg.width * 0.02,
        y: reg.y - reg.height * 0.365,
        width: reg.width * 0.4,
        height: 2,
        color: "rgba(255,255,255,0.10)",
      });

      const padCx = reg.x + reg.width * 0.28;
      const padCy = reg.y - reg.height * 0.18;
      const dx = reg.width * 0.05;
      const dy = reg.height * 0.06;
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          drawCircle(gl, setup, {
            x: padCx + (c - 1) * dx,
            y: padCy + (r - 1) * dy,
            radius: 5.5,
            color: "rgba(148,163,184,0.65)",
          });
        }
      }

      drawRoundedRectangle(gl, setup, {
        x: reg.trayX,
        y: reg.trayY,
        width: reg.trayW,
        height: reg.trayH,
        color: totalHere > 0 ? "#1f3a5c" : "#0f172a",
        cornerRadius: 16,
      });
      drawRoundedRectangle(gl, setup, {
        x: reg.trayX,
        y: reg.trayY,
        width: reg.trayW + 10,
        height: reg.trayH + 10,
        color:
          totalHere === goal && goal > 0
            ? "rgba(52,211,153,0.75)"
            : "rgba(96,165,250,0.45)",
        cornerRadius: 18,
      });
      drawRoundedRectangle(gl, setup, {
        x: reg.trayX,
        y: reg.trayY + reg.trayH * 0.08,
        width: reg.trayW * 0.92,
        height: reg.trayH * 0.55,
        color: "#0b1220",
        cornerRadius: 14,
      });
      drawRectangle(gl, setup, {
        x: reg.trayX,
        y: reg.trayY - reg.trayH * 0.28,
        width: reg.trayW * 0.9,
        height: 2,
        color: "rgba(255,255,255,0.10)",
      });
      drawRoundedRectangle(gl, setup, {
        x: reg.trayX + reg.trayW * 0.3,
        y: reg.trayY + reg.trayH * 0.2,
        width: reg.trayW * 0.22,
        height: reg.trayH * 0.18,
        color: "rgba(148,163,184,0.22)",
        cornerRadius: 10,
      });

      drawRoundedRectangle(gl, setup, {
        x: reg.x - reg.width * 0.32,
        y: reg.y + reg.height * 0.46,
        width: reg.width * 0.12,
        height: reg.height * 0.06,
        color: "#0a0f1a",
        cornerRadius: 10,
      });
      drawRoundedRectangle(gl, setup, {
        x: reg.x + reg.width * 0.32,
        y: reg.y + reg.height * 0.46,
        width: reg.width * 0.12,
        height: reg.height * 0.06,
        color: "#0a0f1a",
        cornerRadius: 10,
      });

      const parts = particlesRef.current;
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.x += p.vx * dt * 60;
        p.y += p.vy * dt * 60;
        p.life -= dt * 2;
        if (p.life <= 0) {
          parts.splice(i, 1);
          continue;
        }
        const lifeRatio = p.life / p.maxLife;
        drawCircle(gl, setup, {
          x: p.x,
          y: p.y,
          radius: p.radius * lifeRatio,
          color: p.color,
        });
      }

      const tz = {
        x: w - 26 - Math.max(72, Math.min(112, w * 0.12)) / 2,
        y: h - 26 - Math.max(72, Math.min(112, h * 0.14)) / 2,
        width: Math.max(72, Math.min(112, w * 0.12)),
        height: Math.max(72, Math.min(112, h * 0.14)),
      };

      const isDraggingPlaced = Boolean(
        selected && selected.startsWith("placed-"),
      );
      const binActive = isDraggingPlaced && trashHoverRef.current;

      drawRoundedRectangle(gl, setup, {
        x: tz.x + 3,
        y: tz.y + 4,
        width: tz.width,
        height: tz.height,
        color: "rgba(0,0,0,0.30)",
        cornerRadius: 16,
      });
      drawRoundedRectangle(gl, setup, {
        x: tz.x,
        y: tz.y,
        width: tz.width,
        height: tz.height,
        color: binActive ? "#7f1d1d" : "#111827",
        cornerRadius: 16,
      });
      drawRoundedRectangle(gl, setup, {
        x: tz.x,
        y: tz.y,
        width: tz.width * 0.96,
        height: tz.height * 0.92,
        color: binActive ? "#ef4444" : "#334155",
        cornerRadius: 14,
      });
      drawRoundedRectangle(gl, setup, {
        x: tz.x,
        y: tz.y + 3,
        width: tz.width * 0.86,
        height: tz.height * 0.72,
        color: binActive ? "#991b1b" : "#0b1220",
        cornerRadius: 12,
      });
      drawRoundedRectangle(gl, setup, {
        x: tz.x,
        y: tz.y - tz.height * 0.28,
        width: tz.width * 0.92,
        height: tz.height * 0.22,
        color: binActive ? "#ef4444" : "#475569",
        cornerRadius: 12,
      });
      drawRoundedRectangle(gl, setup, {
        x: tz.x,
        y: tz.y - tz.height * 0.34,
        width: tz.width * 0.35,
        height: tz.height * 0.08,
        color: binActive ? "#fecaca" : "#94a3b8",
        cornerRadius: 10,
      });
      for (let k = -1; k <= 1; k++) {
        drawRectangle(gl, setup, {
          x: tz.x + k * (tz.width * 0.12),
          y: tz.y + tz.height * 0.05,
          width: 5,
          height: tz.height * 0.48,
          color: binActive
            ? "rgba(254,202,202,0.55)"
            : "rgba(148,163,184,0.35)",
        });
      }

      const shimmer = Math.sin(t * 2.5) * 4;

      items.forEach((item) => {
        const isSelected = selected === item.id;
        const scale = isSelected ? 1.12 : 1;
        const shadowAlpha = isSelected ? 0.35 : 0.22;

        if (item.type === "coin" && item.radius) {
          const r = item.radius * scale;
          const base = isSelected ? "#ff8a00" : item.color;
          const rim = darken(base, isSelected ? 0.18 : 0.22);
          const face = lighten(base, isSelected ? 0.22 : 0.28);
          const innerRing = darken(base, 0.12);
          const spec = lighten(base, 0.55);

          drawCircle(gl, setup, {
            x: item.x + 3,
            y: item.y + 5,
            radius: r * 0.98,
            color: `rgba(0,0,0,${shadowAlpha})`,
          });
          drawCircle(gl, setup, {
            x: item.x,
            y: item.y,
            radius: r,
            color: rim,
          });
          drawCircle(gl, setup, {
            x: item.x,
            y: item.y,
            radius: r * 0.86,
            color: face,
          });
          drawCircle(gl, setup, {
            x: item.x,
            y: item.y,
            radius: r * 0.72,
            color: innerRing,
          });
          drawCircle(gl, setup, {
            x: item.x,
            y: item.y,
            radius: r * 0.68,
            color: face,
          });
          drawCircle(gl, setup, {
            x: item.x - r * 0.32 + shimmer,
            y: item.y - r * 0.34 - shimmer * 0.4,
            radius: r * 0.18,
            color: spec,
          });
          drawCircle(gl, setup, {
            x: item.x + r * 0.18 + shimmer * 0.3,
            y: item.y - r * 0.22,
            radius: r * 0.05,
            color: lighten(base, 0.75),
          });
          return;
        }

        if (item.type === "bill" && item.width && item.height) {
          const base = isSelected ? "#ff8a00" : item.color;
          const nw = item.width * scale;
          const nh = item.height * scale;
          const tilt = ((item.value % 3) - 1) * 0.03;
          const border = darken(base, 0.28);
          const panel = lighten(base, 0.18);
          const strip = darken(base, 0.18);
          const watermark = lighten(base, 0.45);

          drawRoundedRectangle(gl, setup, {
            x: item.x + 4,
            y: item.y + 5,
            width: nw,
            height: nh,
            color: `rgba(0,0,0,${shadowAlpha})`,
            cornerRadius: 10,
            rotation: tilt,
          });
          drawRoundedRectangle(gl, setup, {
            x: item.x,
            y: item.y,
            width: nw,
            height: nh,
            color: base,
            cornerRadius: 10,
            rotation: tilt,
          });
          drawRoundedRectangle(gl, setup, {
            x: item.x,
            y: item.y,
            width: nw * 0.94,
            height: nh * 0.84,
            color: border,
            cornerRadius: 8,
            rotation: tilt,
          });
          drawRoundedRectangle(gl, setup, {
            x: item.x,
            y: item.y,
            width: nw * 0.9,
            height: nh * 0.78,
            color: panel,
            cornerRadius: 7,
            rotation: tilt,
          });
          drawRoundedRectangle(gl, setup, {
            x: item.x - nw * 0.26,
            y: item.y,
            width: nw * 0.12,
            height: nh * 0.78,
            color: strip,
            cornerRadius: 6,
            rotation: tilt,
          });
          drawCircle(gl, setup, {
            x: item.x + nw * 0.18,
            y: item.y,
            radius: Math.min(nw, nh) * 0.18,
            color: watermark,
          });

          const lineY = item.y + nh * 0.18;
          for (let k = 0; k < 3; k++) {
            drawRectangle(gl, setup, {
              x: item.x + nw * (0.08 + k * 0.12),
              y: lineY + k * 6,
              width: nw * 0.28,
              height: 2,
              color: darken(panel, 0.22),
            });
          }
          drawRectangle(gl, setup, {
            x: item.x,
            y: item.y - nh * 0.28,
            width: nw * 0.9,
            height: 2,
            color: lighten(panel, 0.35),
          });
        }
      });
    };

    const loop = (time: number) => {
      render(time);
      animationRef.current = requestAnimationFrame(loop);
    };

    handleResize();
    animationRef.current = requestAnimationFrame(loop);

    const resizeObserver = new ResizeObserver(() => handleResize());
    resizeObserver.observe(canvas);
    window.addEventListener("resize", handleResize);

    return () => {
      if (animationRef.current != null)
        cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
      window.removeEventListener("resize", handleResize);
      resizeObserver.disconnect();
    };
  }, []);

  const goToNextChallenge = useCallback(() => {
    lastWonGoalRef.current = null;
    setPlacedItems([]);
    displayTotalRef.current = 0;
    lastDisplayRef.current = 0;
    setDisplayTotal(0);
    setCelebration(false);
    setTrashHover(false);
    trashHoverRef.current = false;
    if (celebrationTimeoutRef.current) {
      clearTimeout(celebrationTimeoutRef.current);
      celebrationTimeoutRef.current = null;
    }
    setChallengeIndex((i) => {
      if (i >= challenges.length - 1) {
        setAllDone(true);
        return i;
      }
      return i + 1;
    });
  }, [challenges.length]);

  // CRITICAL VALIDATION CHECK: Include note limits logic to allow win
  useEffect(() => {
    const itemsInTray = placedItems.filter((it) => isInTray(it, cashRegister));
    const total = itemsInTray.reduce((s, it) => s + it.value, 0);
    const countInTray = itemsInTray.length;

    setTotalValue(total);

    // Only celebrate if target matches AND user complies with note max limits
    if (
      total === goal &&
      goal > 0 &&
      countInTray <= maxAllowedNotes &&
      lastWonGoalRef.current !== goal
    ) {
      recordMoneyCountingChallenge(userId, {
        goal,
        notesUsed: countInTray,
        minimumNotes: getMinNotes(goal),
        maxAllowedNotes,
        difficulty,
        totalValue: total,
      });
      completedChallengesRef.current += 1;
      if (challengeIndex >= challenges.length - 1) {
        recordMoneyCountingRunComplete(userId, {
          challengeCount: completedChallengesRef.current,
          difficulty,
        });
      }
      lastWonGoalRef.current = goal;
      setCelebration(true);
      if (celebrationTimeoutRef.current)
        clearTimeout(celebrationTimeoutRef.current);
      celebrationTimeoutRef.current = setTimeout(() => {
        goToNextChallenge();
        celebrationTimeoutRef.current = null;
      }, 2500);
    }
  }, [
    placedItems,
    goal,
    maxAllowedNotes,
    goToNextChallenge,
    cashRegister,
    userId,
    difficulty,
    challengeIndex,
    challenges.length,
  ]);

  const recomputeTrashHover = useCallback(
    (x: number, y: number) => {
      const hovering = pointInRect(x, y, trashZone);
      if (hovering !== trashHoverRef.current) {
        trashHoverRef.current = hovering;
        setTrashHover(hovering);
      }
    },
    [trashZone],
  );

  const handlePointerDown = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const palette = getPaletteItems(canvas.width);
      let found = false;

      const hit = (item: CurrencyItem) => {
        if (item.type === "coin" && item.radius) {
          return isPointInCircle(x, y, {
            x: item.x,
            y: item.y,
            radius: item.radius,
            color: item.color,
          });
        }
        if (item.type === "bill" && item.width && item.height) {
          const tilt = ((item.value % 3) - 1) * 0.03;
          return isPointInRectangle(x, y, {
            x: item.x,
            y: item.y,
            width: item.width,
            height: item.height,
            color: item.color,
            rotation: tilt,
          });
        }
        return false;
      };

      for (let i = placedItems.length - 1; i >= 0; i--) {
        const item = placedItems[i];
        if (hit(item)) {
          setSelectedItem(item.id);
          setDragOffset({ x: x - item.x, y: y - item.y });
          found = true;
          break;
        }
      }

      if (found) {
        setTrashHover(false);
        trashHoverRef.current = false;
        return;
      }

      for (let i = palette.length - 1; i >= 0; i--) {
        const item = palette[i];
        if (hit(item)) {
          const template =
            BANGLADESH_CURRENCY.find((c) => item.id === `palette-${c.id}`) ??
            BANGLADESH_CURRENCY[i];
          const dup = createDuplicate(template, x, y);
          setPlacedItems((prev) => [...prev, dup]);
          setSelectedItem(dup.id);
          setDragOffset({ x: 0, y: 0 });
          found = true;
          break;
        }
      }

      if (!found) {
        setSelectedItem(null);
        setDragOffset(null);
      }

      setTrashHover(false);
      trashHoverRef.current = false;
    },
    [placedItems],
  );

  const handlePointerMove = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      if (!selectedItem || !dragOffset) return;
      if (!selectedItem.startsWith("placed-")) return;

      const rect = canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const newX = x - dragOffset.x;
      const newY = y - dragOffset.y;

      setPlacedItems((items) =>
        items.map((item) =>
          item.id === selectedItem
            ? {
                ...item,
                x: Math.max(0, Math.min(newX, canvas.width)),
                y: Math.max(0, Math.min(newY, canvas.height)),
              }
            : item,
        ),
      );

      recomputeTrashHover(x, y);
    },
    [selectedItem, dragOffset, recomputeTrashHover],
  );

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) =>
    handlePointerDown(e.clientX, e.clientY);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const sX = canvas.width / rect.width;
      const sY = canvas.height / rect.height;
      cursorRef.current = {
        x: (e.clientX - rect.left) * sX,
        y: (e.clientY - rect.top) * sY,
        inside: true,
      };
    }
    handlePointerMove(e.clientX, e.clientY);
  };

  const handleMouseLeave = () => {
    handleMouseUp();
    cursorRef.current.inside = false;
  };

  const handleMouseUp = () => {
    const selected = selectedItem;

    if (selected && selected.startsWith("placed-") && trashHoverRef.current) {
      setPlacedItems((prev) => prev.filter((it) => it.id !== selected));
      setSelectedItem(null);
      setDragOffset(null);
      setTrashHover(false);
      trashHoverRef.current = false;
      return;
    }

    if (selected && selected.startsWith("placed-")) {
      const item = placedItems.find((i) => i.id === selected);
      if (item && isInTray(item, cashRegister))
        addBurst(particlesRef, item.x, item.y);
    }

    setSelectedItem(null);
    setDragOffset(null);
    setTrashHover(false);
    trashHoverRef.current = false;
  };

  const clearCurrentChallenge = () => {
    setPlacedItems([]);
    setTotalValue(0);
    displayTotalRef.current = 0;
    lastDisplayRef.current = 0;
    setDisplayTotal(0);
    particlesRef.current = [];
    setCelebration(false);
    setTrashHover(false);
    trashHoverRef.current = false;
    if (celebrationTimeoutRef.current) {
      clearTimeout(celebrationTimeoutRef.current);
      celebrationTimeoutRef.current = null;
    }
  };

  const playAgain = () => {
    setChallenges(generateChallenges());
    setChallengeIndex(0);
    setAllDone(false);
    completedChallengesRef.current = 0;
    clearCurrentChallenge();
  };

  const scaleX = canvasSize.displayW / canvasSize.w;
  const scaleY = canvasSize.displayH / canvasSize.h;
  const isDraggingPlaced = Boolean(
    selectedItem && selectedItem.startsWith("placed-"),
  );

  // Calculate current notes to trigger visual warnings
  const countInTray = placedItems.filter((it) =>
    isInTray(it, cashRegister),
  ).length;
  const limitExceeded = countInTray > maxAllowedNotes;

  return (
    <div className="h-full flex flex-col bg-gray-900">
      <div className="flex-1 relative">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full cursor-pointer touch-none"
          style={{ display: "block" }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onTouchStart={(e) => {
            e.preventDefault();
            if (e.touches.length && canvasRef.current)
              handlePointerDown(e.touches[0].clientX, e.touches[0].clientY);
          }}
          onTouchMove={(e) => {
            e.preventDefault();
            if (e.touches.length && canvasRef.current) {
              const t = e.touches[0];
              const rect = canvasRef.current.getBoundingClientRect();
              cursorRef.current = {
                x:
                  (t.clientX - rect.left) *
                  (canvasRef.current.width / rect.width),
                y:
                  (t.clientY - rect.top) *
                  (canvasRef.current.height / rect.height),
                inside: true,
              };
              handlePointerMove(t.clientX, t.clientY);
            }
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            cursorRef.current.inside = false;
            handleMouseUp();
          }}
        />

        {/* Value labels overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ left: 0, top: 0, right: 0, bottom: 0 }}
        >
          {allItems.map((item) => (
            <div
              key={item.id}
              className="absolute flex items-center justify-center font-extrabold select-none"
              style={{
                left: item.x * scaleX,
                top: item.y * scaleY,
                transform: "translate(-50%, -50%)",
                fontSize:
                  item.type === "coin"
                    ? item.radius && item.radius > 30
                      ? 13
                      : item.radius && item.radius > 26
                        ? 12
                        : 11
                    : 11,
                padding: item.type === "coin" ? "4px 8px" : "4px 10px",
                borderRadius: 999,
                background:
                  item.type === "coin"
                    ? "rgba(255,255,255,0.75)"
                    : "rgba(255,255,255,0.55)",
                border:
                  item.type === "coin"
                    ? "1px solid rgba(0,0,0,0.18)"
                    : "1px solid rgba(0,0,0,0.14)",
                boxShadow: "0 6px 14px rgba(0,0,0,0.18)",
                textShadow: "0 1px 0 rgba(255,255,255,0.35)",
                color: "#111",
                backdropFilter: "blur(6px)",
              }}
            >
              {item.value}৳
            </div>
          ))}
        </div>

        {/* GOAL + TOTAL + NOTES indicator */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute"
            style={{
              left: (cashRegister.x - cashRegister.width * 0.62) * scaleX,
              top: (cashRegister.y - cashRegister.height * 0.16) * scaleY,
              transform: "translate(-100%, -20%)",
              width: cashRegister.width * 0.32 * scaleX,
            }}
          >
            <div
              className="rounded-2xl border shadow-2xl"
              style={{
                background: "rgba(15, 23, 42, 0.55)",
                borderColor: "rgba(148,163,184,0.22)",
                backdropFilter: "blur(10px)",
                padding: "10px 12px",
                boxShadow: "0 16px 40px rgba(0,0,0,0.35)",
              }}
            >
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-semibold text-emerald-200/90">
                  GOAL
                </div>
                <div className="text-[16px] font-black text-emerald-100">
                  {goal}৳
                </div>
              </div>
              <div
                className="my-2 h-px"
                style={{ background: "rgba(148,163,184,0.18)" }}
              />
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-semibold text-sky-200/90">
                  TOTAL
                </div>
                <div className="text-[16px] font-black text-sky-100">
                  {displayTotal}৳
                </div>
              </div>
              <div
                className="my-2 h-px"
                style={{ background: "rgba(148,163,184,0.18)" }}
              />
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-semibold text-amber-200/90">
                  NOTES
                </div>
                <div
                  className={`text-[16px] font-black ${limitExceeded ? "text-red-400" : "text-amber-100"}`}
                >
                  {countInTray}{" "}
                  <span className="text-[12px] opacity-70">
                    / {maxAllowedNotes}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div
            className="absolute pointer-events-none"
            style={{
              left: cashRegister.x * scaleX,
              top: (cashRegister.y - cashRegister.height * 0.62) * scaleY,
              transform: "translate(-50%, -50%)",
            }}
          >
            <div
              className="text-xs font-semibold text-gray-200/80 text-center"
              style={{
                background: "rgba(17,24,39,0.40)",
                border: "1px solid rgba(148,163,184,0.20)",
                padding: "6px 12px",
                borderRadius: 999,
                backdropFilter: "blur(6px)",
                boxShadow: "0 10px 24px rgba(0,0,0,0.25)",
              }}
            >
              Drop money here <br />{" "}
              <span className="opacity-70 text-[10px] uppercase">
                (Max {maxAllowedNotes} items)
              </span>
            </div>
          </div>
        </div>

        {isDraggingPlaced && (
          <div className="absolute right-6 bottom-40 z-20 pointer-events-none">
            <div
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold shadow-lg transition-all ${trashHover ? "bg-red-500/25 border-red-300 text-red-100" : "bg-gray-800/60 border-gray-600/50 text-gray-200"}`}
            >
              <span className="text-lg">🗑️</span>
              <span>
                {trashHover ? "Release to delete" : "Drag to bin to delete"}
              </span>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => setShowInstructions(true)}
          className="absolute top-4 right-4 w-10 h-10 rounded-full bg-gray-700 hover:bg-gray-600 text-gray-200 font-bold text-lg flex items-center justify-center border border-gray-600 shadow-lg transition-colors"
        >
          i
        </button>

        {showInstructions && (
          <>
            <div
              className="absolute inset-0 bg-black/60 z-10"
              onClick={() => setShowInstructions(false)}
              aria-hidden
            />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-full max-w-sm bg-gray-800 rounded-xl shadow-xl border border-gray-700 p-5">
              <div className="flex justify-between items-start mb-3">
                <h4 className="font-bold text-gray-100 text-lg">
                  💰 Money Count
                </h4>
                <button
                  type="button"
                  onClick={() => setShowInstructions(false)}
                  className="text-gray-400 hover:text-gray-200 text-xl leading-none"
                >
                  ×
                </button>
              </div>
              <p className="text-sm text-gray-300 mb-3">
                Drag coins and notes from the top display. Match the target
                value <b>without exceeding the note limit</b> for your chosen
                difficulty.
              </p>
              <div className="text-xs text-gray-400 space-y-2">
                <p className="font-medium text-gray-300">
                  Bangladesh currency:
                </p>
                <p>• Coins (silver): 1৳, 2৳, 5৳</p>
                <p>• Notes: 10৳, 20৳, 50৳, 100৳, 200৳, 500৳, 1000৳</p>
              </div>
            </div>
          </>
        )}

        <div className="absolute top-4 left-4 flex gap-3 z-10">
          <div className="bg-gray-800/90 rounded-lg px-4 py-2 border border-amber-500/50 shadow-lg">
            <span className="text-amber-400 font-bold text-sm">
              🎯 Challenge {challengeIndex + 1} of {challenges.length}: Make{" "}
              {goal}৳!
            </span>
          </div>
        </div>

        <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-none z-10 text-center">
          <span className="text-xs font-medium text-gray-400 bg-gray-800/70 rounded px-3 py-1.5 border border-gray-600/50">
            Tap & drag from here to add money
          </span>
        </div>

        {allDone && !celebration && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50">
            <div className="bg-gray-800 rounded-2xl px-8 py-6 shadow-2xl border border-amber-500/50 text-center max-w-sm">
              <div className="text-4xl mb-3">🏆</div>
              <div className="text-xl font-bold text-gray-100 mb-2">
                All challenges complete!
              </div>
              <p className="text-sm text-gray-400 mb-4">
                You finished all {challenges.length} challenges. Play again for
                new goals.
              </p>
              <button
                type="button"
                onClick={playAgain}
                className="bg-amber-500 hover:bg-amber-400 text-gray-900 font-bold px-6 py-3 rounded-xl transition-colors"
              >
                Play again
              </button>
            </div>
          </div>
        )}

        {celebration && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-30 animate-pulse">
            <div className="bg-amber-400/90 text-gray-900 rounded-2xl px-8 py-6 shadow-2xl border-4 border-amber-300 text-center">
              <div className="text-4xl mb-2">🎉</div>
              <div className="text-2xl font-black">Well done!</div>
              <div className="text-lg font-bold">
                You made {goal}৳ using {countInTray} notes!
              </div>
              <div className="text-sm mt-1 opacity-90">
                Next challenge in a moment…
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Control panel */}
      <div className="bg-gray-800 border-t border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {/* Difficulty Selector */}
            <div className="flex items-center gap-2 bg-gray-900/50 p-1 rounded-lg border border-gray-700">
              {(["easy", "medium", "hard"] as const).map((level) => (
                <button
                  key={level}
                  onClick={() => {
                    setDifficulty(level);
                    clearCurrentChallenge();
                  }}
                  className={`px-3 py-1 rounded-md text-xs font-bold uppercase transition-colors ${
                    difficulty === level
                      ? "bg-amber-500 text-gray-900"
                      : "text-gray-400 hover:text-gray-200 hover:bg-gray-700"
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>

            <div className="text-sm text-gray-300">
              <span className="font-semibold">Items in tray:</span>{" "}
              <span className={limitExceeded ? "text-red-400 font-bold" : ""}>
                {countInTray} / {maxAllowedNotes}
              </span>
            </div>
          </div>

          <button
            onClick={clearCurrentChallenge}
            className="bg-gray-600 hover:bg-gray-500 text-gray-100 font-semibold text-sm px-4 py-2 rounded-lg transition-colors border border-gray-500"
          >
            Clear & try again
          </button>
        </div>
      </div>
    </div>
  );
}
