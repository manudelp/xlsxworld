"use client";

import { useEffect, useRef, type MutableRefObject } from "react";

type Bounds = {
  cx: number;
  cy: number;
  radius: number;
};

type Candidate = {
  markup: string;
  bounds: Bounds;
};

function randomIn(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function edgeAnchoredX(width: number): number {
  const edgeInset = Math.max(90, Math.min(280, width * 0.14));
  const outside = Math.max(70, Math.min(200, width * 0.1));
  return Math.random() < 0.5
    ? randomIn(-outside, edgeInset)
    : randomIn(width - edgeInset, width + outside);
}

function overlapsAny(next: Bounds, placed: Bounds[], gap: number): boolean {
  return placed.some((current) => {
    const dx = current.cx - next.cx;
    const dy = current.cy - next.cy;
    const minDistance = current.radius + next.radius + gap;
    return dx * dx + dy * dy < minDistance * minDistance;
  });
}

function circleCandidate(
  cx: number,
  cy: number,
  r: number,
  fill: string,
  opacity: number,
): Candidate {
  return {
    bounds: { cx, cy, radius: r },
    markup: `<circle cx='${cx.toFixed(1)}' cy='${cy.toFixed(1)}' r='${r.toFixed(1)}' fill='${fill}' fill-opacity='${opacity.toFixed(3)}'/>`,
  };
}

function rectCandidate(
  x: number,
  y: number,
  w: number,
  h: number,
  rx: number,
  rot: number,
  fill: string,
  opacity: number,
): Candidate {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const radius = Math.sqrt((w / 2) ** 2 + (h / 2) ** 2);
  return {
    bounds: { cx, cy, radius },
    markup: `<rect x='${x.toFixed(1)}' y='${y.toFixed(1)}' width='${w.toFixed(1)}' height='${h.toFixed(1)}' rx='${rx.toFixed(1)}' transform='rotate(${rot.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})' fill='${fill}' fill-opacity='${opacity.toFixed(3)}'/>`,
  };
}

function smoothClosedPath(points: Array<{ x: number; y: number }>): string {
  if (points.length < 3) {
    return "";
  }

  const mids = points.map((point, index) => {
    const next = points[(index + 1) % points.length];
    return {
      x: (point.x + next.x) / 2,
      y: (point.y + next.y) / 2,
    };
  });

  let path = `M${mids[0].x.toFixed(1)} ${mids[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length; i += 1) {
    const point = points[(i + 1) % points.length];
    const mid = mids[(i + 1) % points.length];
    path += ` Q${point.x.toFixed(1)} ${point.y.toFixed(1)} ${mid.x.toFixed(1)} ${mid.y.toFixed(1)}`;
  }

  return `${path} Z`;
}

function polygonCandidate(
  cx: number,
  cy: number,
  radius: number,
  sides: number,
  rotationDeg: number,
  fill: string,
  opacity: number,
): Candidate {
  const safeSides = Math.max(5, Math.floor(sides));
  const rotation = (rotationDeg * Math.PI) / 180;
  const points = Array.from({ length: safeSides }, (_unused, index) => {
    const angle = rotation + (Math.PI * 2 * index) / safeSides;
    const variance = randomIn(0.78, 1.08);
    const r = radius * variance;
    return `${(cx + Math.cos(angle) * r).toFixed(1)} ${(cy + Math.sin(angle) * r).toFixed(1)}`;
  });

  const pathData = smoothClosedPath(
    points.map((point) => {
      const [x, y] = point.split(" ").map(Number);
      return { x, y };
    }),
  );

  return {
    bounds: { cx, cy, radius },
    markup: `<path d='${pathData}' fill='${fill}' fill-opacity='${opacity.toFixed(3)}'/>`,
  };
}

function blobCandidate(
  cx: number,
  cy: number,
  radius: number,
  fill: string,
  opacity: number,
): Candidate {
  const points = Array.from({ length: 6 }, (_unused, index) => {
    const angle = (Math.PI * 2 * index) / 6;
    const variance = randomIn(0.72, 1.08);
    const r = radius * variance;
    return {
      x: cx + Math.cos(angle) * r,
      y: cy + Math.sin(angle) * r,
    };
  });

  const d = smoothClosedPath(points);

  return {
    bounds: { cx, cy, radius },
    markup: `<path d='${d}' fill='${fill}' fill-opacity='${opacity.toFixed(3)}'/>`,
  };
}

function buildAmbientSvg(
  isDark: boolean,
  width: number,
  height: number,
): string {
  const base = Math.min(width, height);
  const colors = isDark
    ? ["#b8db9d", "#d0e7bc", "#8fc465"]
    : ["#5f9d33", "#8fc465", "#b8db9d"];
  const opacityMin = isDark ? 0.14 : 0.09;
  const opacityMax = isDark ? 0.24 : 0.17;
  const gap = isDark ? 44 : 38;

  const placedBounds: Bounds[] = [];
  const markup: string[] = [];

  const placeShape = (factory: () => Candidate, attempts = 36): void => {
    for (let i = 0; i < attempts; i += 1) {
      const next = factory();
      if (overlapsAny(next.bounds, placedBounds, gap)) {
        continue;
      }
      placedBounds.push(next.bounds);
      markup.push(next.markup);
      return;
    }
  };

  // Two edge anchors (left and right) so the motif is always framed.
  placeShape(() =>
    rectCandidate(
      randomIn(-Math.max(70, base * 0.12), Math.max(80, base * 0.1)),
      randomIn(base * 0.18, height - base * 0.18),
      randomIn(base * 0.2, base * 0.36),
      randomIn(base * 0.2, base * 0.36),
      randomIn(base * 0.02, base * 0.06),
      randomIn(-45, 45),
      pick(colors),
      randomIn(opacityMin, opacityMax),
    ),
  );
  placeShape(() =>
    rectCandidate(
      randomIn(
        width - Math.max(80, base * 0.1),
        width + Math.max(70, base * 0.12),
      ),
      randomIn(base * 0.14, height - base * 0.24),
      randomIn(base * 0.18, base * 0.32),
      randomIn(base * 0.18, base * 0.32),
      randomIn(base * 0.02, base * 0.06),
      randomIn(-45, 45),
      pick(colors),
      randomIn(opacityMin, opacityMax),
    ),
  );

  // Mix of circles and rectangles for variety.
  for (let i = 0; i < 3; i += 1) {
    placeShape(() =>
      Math.random() < 0.5
        ? circleCandidate(
            edgeAnchoredX(width),
            randomIn(base * 0.14, height - base * 0.14),
            randomIn(base * 0.12, base * 0.26),
            pick(colors),
            randomIn(opacityMin, opacityMax),
          )
        : rectCandidate(
            randomIn(base * 0.1, width - base * 0.1),
            randomIn(base * 0.14, height - base * 0.14),
            randomIn(base * 0.14, base * 0.28),
            randomIn(base * 0.14, base * 0.28),
            randomIn(base * 0.02, base * 0.04),
            randomIn(-30, 30),
            pick(colors),
            randomIn(opacityMin, opacityMax),
          ),
    );
  }

  // Filled abstract polygon near edges.
  placeShape(() =>
    polygonCandidate(
      edgeAnchoredX(width),
      randomIn(base * 0.14, height - base * 0.14),
      randomIn(base * 0.14, base * 0.24),
      randomIn(5, 8),
      randomIn(-30, 30),
      pick(colors),
      randomIn(opacityMin, opacityMax),
    ),
  );

  for (let i = 0; i < 3; i += 1) {
    placeShape(() => {
      const w = randomIn(base * 0.24, base * 0.64);
      const h = randomIn(base * 0.16, base * 0.4);
      const x =
        Math.random() < 0.5
          ? randomIn(-w * 0.35, base * 0.12)
          : randomIn(width - base * 0.2, width - w * 0.08);

      return rectCandidate(
        x,
        randomIn(base * 0.08, height - h + base * 0.08),
        w,
        h,
        randomIn(base * 0.02, base * 0.06),
        randomIn(-58, 58),
        pick(colors),
        randomIn(opacityMin, opacityMax),
      );
    });
  }

  // Irregular filled blob for extra abstract feel.
  placeShape(() =>
    blobCandidate(
      edgeAnchoredX(width),
      randomIn(base * 0.18, height - base * 0.18),
      randomIn(base * 0.14, base * 0.24),
      pick(colors),
      randomIn(opacityMin, opacityMax),
    ),
  );

  return `<svg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}' viewBox='0 0 ${width} ${height}'>${markup.join("")}</svg>`;
}

function bucketViewport(value: number): number {
  return Math.round(value / 80) * 80;
}

function applyAmbientBackground(signatureRef: MutableRefObject<string>): void {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const width = Math.max(bucketViewport(window.innerWidth), 900);
  const height = Math.max(
    bucketViewport(document.documentElement.scrollHeight),
    760,
  );
  const signature = `${prefersDark ? "dark" : "light"}:${width}x${height}`;

  if (signatureRef.current === signature) {
    return;
  }

  signatureRef.current = signature;
  const svg = buildAmbientSvg(prefersDark, width, height);
  const encoded = encodeURIComponent(svg);

  document.documentElement.style.setProperty(
    "--ambient-bg-image",
    `url(\"data:image/svg+xml,${encoded}\")`,
  );
  document.documentElement.style.setProperty(
    "--ambient-bg-size",
    `${width}px ${height}px`,
  );
  document.documentElement.style.setProperty(
    "--ambient-bg-position",
    "center top",
  );
}


export default function AmbientBackground(): null {
  const signatureRef = useRef("");

  useEffect(() => {
    let resizeTimeoutId: ReturnType<typeof setTimeout> | null = null;
    applyAmbientBackground(signatureRef);

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleThemeChange = () => {
      signatureRef.current = "";
      applyAmbientBackground(signatureRef);
    };
    const handleResize = () => {
      if (resizeTimeoutId) {
        clearTimeout(resizeTimeoutId);
      }
      resizeTimeoutId = setTimeout(() => {
        applyAmbientBackground(signatureRef);
      }, 120);
    };

    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", handleThemeChange);
    } else {
      media.addListener(handleThemeChange);
    }
    window.addEventListener("resize", handleResize);
    return () => {
      if (resizeTimeoutId) {
        clearTimeout(resizeTimeoutId);
      }
      if (typeof media.removeEventListener === "function") {
        media.removeEventListener("change", handleThemeChange);
      } else {
        media.removeListener(handleThemeChange);
      }
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return null;
}
