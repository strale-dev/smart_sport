let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") {
    return null;
  }

  const Ctx =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;

  if (!Ctx) {
    return null;
  }

  if (!audioContext) {
    audioContext = new Ctx();
  }

  return audioContext;
}

/** Call from a user gesture before autoplay-restricted playback. */
export async function unlockSoundAudio(): Promise<boolean> {
  const ctx = getAudioContext();
  if (!ctx) {
    return false;
  }

  if (ctx.state === "suspended") {
    try {
      await ctx.resume();
    } catch {
      return false;
    }
  }

  return ctx.state === "running";
}

function scheduleTone(
  ctx: AudioContext,
  startAt: number,
  frequency: number,
  durationSec: number,
  gainPeak: number,
  type: OscillatorType = "sine"
): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, startAt);
  gain.gain.setValueAtTime(0, startAt);
  gain.gain.linearRampToValueAtTime(gainPeak, startAt + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, startAt + durationSec);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startAt);
  osc.stop(startAt + durationSec + 0.05);
}

export function playSyntheticGoal(): void {
  const ctx = getAudioContext();
  if (!ctx || ctx.state !== "running") {
    return;
  }

  const t0 = ctx.currentTime;
  const bufferSize = ctx.sampleRate * 0.08;
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i += 1) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }

  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer;
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.08, t0);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.12);
  noise.connect(noiseGain);
  noiseGain.connect(ctx.destination);
  noise.start(t0);
  noise.stop(t0 + 0.15);

  scheduleTone(ctx, t0 + 0.05, 440, 0.12, 0.06);
  scheduleTone(ctx, t0 + 0.14, 660, 0.18, 0.07);
  scheduleTone(ctx, t0 + 0.26, 880, 0.22, 0.05);
}

export function playSyntheticFullTime(): void {
  const ctx = getAudioContext();
  if (!ctx || ctx.state !== "running") {
    return;
  }

  const t0 = ctx.currentTime;
  scheduleTone(ctx, t0, 1_200, 0.35, 0.09, "triangle");
  scheduleTone(ctx, t0 + 0.38, 1_200, 0.35, 0.09, "triangle");
}

export function resetSyntheticAudioForTests(): void {
  if (audioContext) {
    void audioContext.close();
    audioContext = null;
  }
}
