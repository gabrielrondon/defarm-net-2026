/*
 * Sound + haptics vocabulary (design system components/core/useFeedback.jsx).
 * Six events, nothing else makes noise. Sounds are synthesised (no asset), ≤ 120 ms;
 * haptics via navigator.vibrate. Both respect prefers-reduced-motion and a localStorage
 * opt-out ("df-feedback" = "off"). Ninguém cria um sétimo sem registrar em guidelines/decisoes.md.
 */
import { useCallback } from "react";

type Sound = { f: number[]; d: number } | null;
export const FEEDBACK_EVENTS: Record<string, { haptic: number[]; sound: Sound; when: string }> = {
  tap: { haptic: [8], sound: null, when: "Any tactile button press (haptic only, no sound)." },
  approve: { haptic: [12], sound: { f: [660, 880], d: 0.09 }, when: "Aprovar / Emitir confirmed: short rising tick." },
  seal: { haptic: [18, 40, 28], sound: { f: [523, 784, 1046], d: 0.16 }, when: "Seal screen appears: three-note rising chord, the reward beat." },
  later: { haptic: [6], sound: { f: [440], d: 0.05 }, when: "Card swiped to 'Depois': soft low tick." },
  cut: { haptic: [40], sound: null, when: "Cortar acesso confirmed: heavy haptic, silence." },
  error: { haptic: [20, 30, 20], sound: { f: [220], d: 0.12 }, when: "Field error on blur / action failed: low single note." },
};
export type FeedbackEvent = keyof typeof FEEDBACK_EVENTS;

let ctx: AudioContext | null = null;
function beep(spec: Sound) {
  try {
    if (!spec) return;
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    if (!ctx) ctx = new AC();
    const t0 = ctx.currentTime;
    spec.f.forEach((freq, i) => {
      const o = ctx!.createOscillator(); const g = ctx!.createGain();
      o.type = "sine"; o.frequency.value = freq;
      const start = t0 + i * (spec.d / spec.f.length) * 0.7;
      g.gain.setValueAtTime(0.0001, start);
      g.gain.exponentialRampToValueAtTime(0.12, start + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, start + spec.d);
      o.connect(g).connect(ctx!.destination); o.start(start); o.stop(start + spec.d + 0.02);
    });
  } catch { /* audio unavailable: silent */ }
}

function enabled(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  try { return window.localStorage.getItem("df-feedback") !== "off"; } catch { return true; }
}

/** Fire a feedback event by name. Safe to call anywhere; no-op when disabled. */
export function feedback(name: FeedbackEvent) {
  const ev = FEEDBACK_EVENTS[name]; if (!ev || !enabled()) return;
  if (navigator.vibrate && ev.haptic) { try { navigator.vibrate(ev.haptic); } catch { /* ignore */ } }
  beep(ev.sound);
}

/** Hook form: returns the same function, memoised. */
export function useFeedback() { return useCallback(feedback, []); }
