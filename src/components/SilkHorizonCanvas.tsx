import React, { useEffect, useRef } from 'react';
import { AuraPhase } from '../types';

interface SilkHorizonCanvasProps {
  auraPhase: AuraPhase;
  tickSecond: number;
}

interface RgbTriplet {
  r: number;
  g: number;
  b: number;
}

interface HorizonPalette {
  farRgb: RgbTriplet;
  nearRgb: RgbTriplet;
  glintRgb: RgbTriplet;
  speed: number;
  microRipple: number;
}

const PHASE_PALETTES: Record<AuraPhase, HorizonPalette> = {
  acute: {
    // 0-72h: Volcanic copper-amber (#ea580c -> #f59e0b)
    farRgb: { r: 234, g: 88, b: 12 },
    nearRgb: { r: 245, g: 158, b: 11 },
    glintRgb: { r: 254, g: 215, b: 170 },
    speed: 0.92,
    microRipple: 1.0
  },
  peak: {
    // Days 3-14: Molten champagne-gold laminar waves (#f59e0b -> #fde047)
    farRgb: { r: 245, g: 158, b: 11 },
    nearRgb: { r: 253, g: 224, b: 71 },
    glintRgb: { r: 254, g: 249, b: 195 },
    speed: 0.68,
    microRipple: 0.35
  },
  clean: {
    // Days 15-90+: Bioluminescent emerald & gold vagal silk (#10b981 -> #eab308)
    farRgb: { r: 16, g: 185, b: 129 },
    nearRgb: { r: 234, g: 179, b: 8 },
    glintRgb: { r: 167, g: 243, b: 208 },
    speed: 0.44,
    microRipple: 0.08
  }
};

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpRgb(a: RgbTriplet, b: RgbTriplet, t: number): RgbTriplet {
  return {
    r: lerp(a.r, b.r, t),
    g: lerp(a.g, b.g, t),
    b: lerp(a.b, b.b, t)
  };
}

export const SilkHorizonCanvas: React.FC<SilkHorizonCanvasProps> = ({
  auraPhase,
  tickSecond
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const phaseRef = useRef<AuraPhase>(auraPhase);
  const prevTickRef = useRef<number>(tickSecond);
  const glintStartRef = useRef<number>(-10);
  const clockSecRef = useRef<number>(0);

  useEffect(() => {
    phaseRef.current = auraPhase;
  }, [auraPhase]);

  useEffect(() => {
    if (tickSecond !== prevTickRef.current) {
      prevTickRef.current = tickSecond;
      glintStartRef.current = clockSecRef.current;
    }
  }, [tickSecond]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let rafId = 0;
    let width = 0;
    let height = 0;
    let dpr = 1;
    let lastTimeMs = performance.now();

    let currentPalette: HorizonPalette = {
      farRgb: { ...PHASE_PALETTES[phaseRef.current].farRgb },
      nearRgb: { ...PHASE_PALETTES[phaseRef.current].nearRgb },
      glintRgb: { ...PHASE_PALETTES[phaseRef.current].glintRgb },
      speed: PHASE_PALETTES[phaseRef.current].speed,
      microRipple: PHASE_PALETTES[phaseRef.current].microRipple
    };

    const syncCanvasSize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      width = Math.max(1, Math.floor(rect.width));
      height = Math.max(1, Math.floor(rect.height));
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    syncCanvasSize();

    const resizeObserver =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => syncCanvasSize())
        : null;
    if (resizeObserver && canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    }
    window.addEventListener('resize', syncCanvasSize);

    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const ISOLINE_COUNT = 16;
    const X_STEPS = 56;

    const computeWaveY = (
      xNorm: number,
      depthNorm: number,
      t: number,
      microAmt: number,
      horizonTopY: number,
      horizonSpanY: number
    ): number => {
      // Perspective spacing: far lines compress near horizon, foreground lines fan out smoothly
      const perspectiveT = Math.pow(depthNorm, 1.55);
      const baseLineY = horizonTopY + perspectiveT * horizonSpanY;

      // Vagal resting breath envelope (~0.11 Hz)
      const vagalBreath = 0.86 + 0.14 * Math.sin(t * 0.68 - depthNorm * 1.4);
      const ampScale = (3.5 + depthNorm * 13.5) * vagalBreath;

      // Layered topographic silk harmonics (zero circular geometry)
      const primary =
        Math.sin(xNorm * 5.2 - t * 0.85 + depthNorm * 2.7) * 0.58 +
        Math.sin(xNorm * 9.4 + t * 0.52 - depthNorm * 3.9) * 0.28 +
        Math.cos(xNorm * 3.1 - t * 0.36 + depthNorm * 1.8) * 0.22;

      const earlyMicro =
        microAmt *
        Math.sin(xNorm * 22.0 - t * 2.4 + depthNorm * 5.5) *
        (1 - depthNorm * 0.45) *
        2.1;

      // Subtle central valley beneath timer digits so the sanctuary stays pure obsidian #060608
      const centerDip = Math.exp(-Math.pow((xNorm - 0.5) / 0.32, 2)) * 4.5 * (1 - depthNorm * 0.5);

      return baseLineY + primary * ampScale + earlyMicro + centerDip;
    };

    const renderFrame = (nowMs: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (nowMs - lastTimeMs) / 1000));
      lastTimeMs = nowMs;

      const target = PHASE_PALETTES[phaseRef.current];
      const blend = Math.min(1, dt * 3.2);
      currentPalette.farRgb = lerpRgb(currentPalette.farRgb, target.farRgb, blend);
      currentPalette.nearRgb = lerpRgb(currentPalette.nearRgb, target.nearRgb, blend);
      currentPalette.glintRgb = lerpRgb(currentPalette.glintRgb, target.glintRgb, blend);
      currentPalette.speed = lerp(currentPalette.speed, target.speed, blend);
      currentPalette.microRipple = lerp(currentPalette.microRipple, target.microRipple, blend);

      if (!reducedMotionQuery.matches && !document.hidden) {
        clockSecRef.current += dt * currentPalette.speed;
      }

      ctx.clearRect(0, 0, width, height);

      // Upper & center digit sanctuary stays 100% pure #060608;
      // Topographic silk isolines occupy only the lower horizon band (55% -> 95% height)
      const horizonTopY = height * 0.56;
      const horizonSpanY = height * 0.38;
      const t = clockSecRef.current;

      // Soft atmospheric horizon floor mist (strictly linear vertical gradient, zero circles/orbs)
      const mistGrad = ctx.createLinearGradient(0, horizonTopY - 8, 0, height);
      mistGrad.addColorStop(0, 'rgba(6, 6, 8, 0)');
      mistGrad.addColorStop(
        0.52,
        `rgba(${Math.round(currentPalette.farRgb.r)}, ${Math.round(currentPalette.farRgb.g)}, ${Math.round(currentPalette.farRgb.b)}, 0.045)`
      );
      mistGrad.addColorStop(1, 'rgba(6, 6, 8, 0)');
      ctx.fillStyle = mistGrad;
      ctx.fillRect(0, horizonTopY - 8, width, height - horizonTopY + 8);

      let frontWaveCoords: { x: number; y: number }[] = [];

      for (let i = 0; i < ISOLINE_COUNT; i++) {
        const depthNorm = i / (ISOLINE_COUNT - 1); // 0 = far horizon, 1 = foreground
        const lineRgb = lerpRgb(currentPalette.farRgb, currentPalette.nearRgb, depthNorm);
        const alpha = 0.075 + Math.pow(depthNorm, 1.35) * 0.36;
        const lineWidth = 0.65 + depthNorm * 0.95;

        // Horizontal edge vignette gradient so isolines melt smoothly at viewport edges
        const strokeGrad = ctx.createLinearGradient(0, 0, width, 0);
        const rgbStr = `${Math.round(lineRgb.r)}, ${Math.round(lineRgb.g)}, ${Math.round(lineRgb.b)}`;
        strokeGrad.addColorStop(0, `rgba(${rgbStr}, 0.02)`);
        strokeGrad.addColorStop(0.14, `rgba(${rgbStr}, ${alpha.toFixed(3)})`);
        strokeGrad.addColorStop(0.5, `rgba(${rgbStr}, ${(alpha * 1.12).toFixed(3)})`);
        strokeGrad.addColorStop(0.86, `rgba(${rgbStr}, ${alpha.toFixed(3)})`);
        strokeGrad.addColorStop(1, `rgba(${rgbStr}, 0.02)`);

        ctx.beginPath();
        const isFrontWave = i === ISOLINE_COUNT - 1;
        if (isFrontWave) {
          frontWaveCoords = [];
        }

        for (let s = 0; s <= X_STEPS; s++) {
          const xNorm = s / X_STEPS;
          const x = xNorm * width;
          const y = computeWaveY(
            xNorm,
            depthNorm,
            t,
            currentPalette.microRipple,
            horizonTopY,
            horizonSpanY
          );

          if (s === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }

          if (isFrontWave) {
            frontWaveCoords.push({ x, y });
          }
        }

        ctx.strokeStyle = strokeGrad;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
      }

      // 1-Second Synaptic Pulse Glint gliding smoothly left-to-right along the front horizon wave
      const glintElapsed = (clockSecRef.current - glintStartRef.current) / Math.max(0.35, currentPalette.speed);
      const glintDuration = 0.86;
      if (glintElapsed >= 0 && glintElapsed <= glintDuration && frontWaveCoords.length > 4) {
        const rawProgress = glintElapsed / glintDuration;
        // Smooth cubic ease-out glide across the horizon
        const easedX = 1 - Math.pow(1 - rawProgress, 2.4);
        const fadeEnvelope = Math.sin(rawProgress * Math.PI);
        const centerIdx = Math.floor(easedX * (frontWaveCoords.length - 1));
        const span = 7;
        const startIdx = Math.max(0, centerIdx - span);
        const endIdx = Math.min(frontWaveCoords.length - 1, centerIdx + span);

        if (endIdx > startIdx) {
          const pStart = frontWaveCoords[startIdx];
          const pEnd = frontWaveCoords[endIdx];
          const glintGrad = ctx.createLinearGradient(pStart.x, pStart.y, pEnd.x, pEnd.y);
          const gRgb = `${Math.round(currentPalette.glintRgb.r)}, ${Math.round(currentPalette.glintRgb.g)}, ${Math.round(currentPalette.glintRgb.b)}`;
          glintGrad.addColorStop(0, `rgba(${gRgb}, 0)`);
          glintGrad.addColorStop(0.5, `rgba(${gRgb}, ${(0.82 * fadeEnvelope).toFixed(3)})`);
          glintGrad.addColorStop(1, `rgba(${gRgb}, 0)`);

          ctx.beginPath();
          for (let k = startIdx; k <= endIdx; k++) {
            const pt = frontWaveCoords[k];
            if (k === startIdx) {
              ctx.moveTo(pt.x, pt.y);
            } else {
              ctx.lineTo(pt.x, pt.y);
            }
          }
          ctx.strokeStyle = glintGrad;
          ctx.lineWidth = 2.2;
          ctx.lineCap = 'round';
          ctx.stroke();
        }
      }

      rafId = window.requestAnimationFrame(renderFrame);
    };

    rafId = window.requestAnimationFrame(renderFrame);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', syncCanvasSize);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      data-testid="silk-horizon-canvas"
      data-phase={auraPhase}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
};
