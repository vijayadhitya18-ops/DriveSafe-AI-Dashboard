/**
 * Web-side audible alerts. These mirror the buzzer semantics of the ESP32
 * (short beep / triple beep / emergency pattern) for the browser only —
 * they never claim to drive the physical buzzer on GPIO 27.
 */
let ctx: AudioContext | null = null;
let enabled = true;

export function setAudioEnabled(v: boolean) {
  enabled = v;
}

function ac(): AudioContext | null {
  if (!enabled) return null;
  try {
    if (!ctx) ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, at: number, dur: number, type: OscillatorType = "square", gain = 0.045) {
  const c = ac();
  if (!c) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, c.currentTime + at);
  g.gain.exponentialRampToValueAtTime(gain, c.currentTime + at + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + at + dur);
  o.connect(g).connect(c.destination);
  o.start(c.currentTime + at);
  o.stop(c.currentTime + at + dur + 0.05);
}

export type AlertPattern = "none" | "short" | "triple" | "emergency";

export function playPattern(p: AlertPattern) {
  if (!enabled || p === "none") return;
  if (p === "short") {
    tone(880, 0, 0.1);
  } else if (p === "triple") {
    tone(880, 0, 0.09);
    tone(880, 0.16, 0.09);
    tone(880, 0.32, 0.12);
  } else if (p === "emergency") {
    for (let i = 0; i < 4; i++) {
      tone(660, i * 0.42, 0.18, "sawtooth", 0.05);
      tone(990, i * 0.42 + 0.2, 0.18, "sawtooth", 0.05);
    }
  }
}

export function unlockAudio() {
  ac();
}
