"use client";

import { useCallback, useEffect, useRef } from "react";

const G = 24;
const R = 140;
const R2 = R * R;
const DOT = 1;
const ERASE = 2;
const FADE = 800;
const MAX = 40;
const THROTTLE = 32;

interface TrailPoint {
  x: number;
  y: number;
  t: number;
}

export default function DotTrail() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const trailRef = useRef<TrailPoint[]>([]);
  const rafRef = useRef(0);
  const lastPushRef = useRef(0);
  const colCacheRef = useRef<{ p: string; bg: string } | null>(null);
  const colTickRef = useRef(0);

  const getColors = useCallback(() => {
    if (colCacheRef.current && colTickRef.current++ < 60)
      return colCacheRef.current;
    colTickRef.current = 0;
    const s = getComputedStyle(document.documentElement);
    colCacheRef.current = {
      p: s.getPropertyValue("--primary").trim() || "#5f9d33",
      bg: s.getPropertyValue("--background").trim() || "#fff",
    };
    return colCacheRef.current;
  }, []);

  const draw = useCallback(() => {
    rafRef.current = 0;
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d", { alpha: true });
    if (!ctx) return;

    const now = Date.now();
    const sx = window.scrollX;
    const sy = window.scrollY;
    const w = c.clientWidth;
    const h = c.clientHeight;
    const trail = trailRef.current;

    ctx.clearRect(0, 0, w, h);
    while (trail.length && now - trail[0].t > FADE) trail.shift();
    if (!trail.length) return;

    const cl = getColors();
    const len = trail.length;
    const ox = (((-sx % G) + G) % G);
    const oy = (((-sy % G) + G) % G);

    let minX = w, maxX = 0, minY = h, maxY = 0;
    for (let i = 0; i < len; i++) {
      const p = trail[i];
      if (p.x - R < minX) minX = p.x - R;
      if (p.x + R > maxX) maxX = p.x + R;
      if (p.y - R < minY) minY = p.y - R;
      if (p.y + R > maxY) maxY = p.y + R;
    }
    if (minX < 0) minX = 0;
    if (minY < 0) minY = 0;
    if (maxX > w) maxX = w;
    if (maxY > h) maxY = h;

    let startGx = ox + Math.floor((minX - ox) / G) * G;
    let startGy = oy + Math.floor((minY - oy) / G) * G;
    if (startGx < ox) startGx += G;
    if (startGy < oy) startGy += G;

    ctx.fillStyle = cl.bg;
    for (let gx = startGx; gx <= maxX; gx += G) {
      for (let gy = startGy; gy <= maxY; gy += G) {
        let a = 0;
        for (let i = len - 1; i >= 0; i--) {
          const p = trail[i];
          const age = 1 - (now - p.t) / FADE;
          if (age <= 0) continue;
          const dx = gx - p.x;
          const dy = gy - p.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < R2) {
            const v = age * (1 - Math.sqrt(d2) / R);
            if (v > a) a = v;
            if (a >= 0.99) break;
          }
        }
        if (a > 0.01) {
          ctx.globalAlpha = 1;
          ctx.beginPath();
          ctx.arc(gx, gy, ERASE, 0, 6.283);
          ctx.fill();
          ctx.globalAlpha = a;
          ctx.fillStyle = cl.p;
          ctx.beginPath();
          ctx.arc(gx, gy, DOT, 0, 6.283);
          ctx.fill();
          ctx.fillStyle = cl.bg;
        }
      }
    }
    ctx.globalAlpha = 1;
    if (trail.length) rafRef.current = requestAnimationFrame(draw);
  }, [getColors]);

  useEffect(() => {
    if ("ontouchstart" in window && navigator.maxTouchPoints > 0) return;
    const c = canvasRef.current;
    if (!c) return;

    function resize() {
      if (!c) return;
      const d = devicePixelRatio || 1;
      const w = window.innerWidth;
      const h = window.innerHeight;
      c.width = w * d;
      c.height = h * d;
      c.style.width = w + "px";
      c.style.height = h + "px";
      const ctx = c.getContext("2d", { alpha: true });
      if (ctx) ctx.setTransform(d, 0, 0, d, 0, 0);
    }

    function onMove(e: MouseEvent) {
      const now = Date.now();
      if (now - lastPushRef.current < THROTTLE) return;
      lastPushRef.current = now;
      trailRef.current.push({ x: e.clientX, y: e.clientY, t: now });
      if (trailRef.current.length > MAX) trailRef.current.shift();
      if (!rafRef.current) rafRef.current = requestAnimationFrame(draw);
    }

    function onScroll() {
      if (trailRef.current.length && !rafRef.current)
        rafRef.current = requestAnimationFrame(draw);
    }

    resize();
    window.addEventListener("resize", resize);
    document.addEventListener("mousemove", onMove);
    document.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("resize", resize);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("scroll", onScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: -1 }}
    />
  );
}
