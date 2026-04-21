// Procedural ambient music + weather soundscape using the Web Audio API.
// No assets — everything is synthesised in-browser:
//   - two long drones tuned to the biome's root/fifth
//   - a filtered noise layer for weather (rain/storm/snow/ash/fog)
//   - an "intensity" curve that modulates drone timbre during combat/rest
// Switches (biome / weather / intensity) all crossfade over ~2.5s so changes
// never feel jarring.

export type AmbientBiome =
  | 'forest'
  | 'dungeon'
  | 'city'
  | 'mountain'
  | 'desert'
  | 'swamp'
  | 'wilds';

export type AmbientWeather =
  | 'Clear'
  | 'Rain'
  | 'Storm'
  | 'Snow'
  | 'Fog'
  | 'Ash';

export type AmbientMood = 'explore' | 'combat' | 'rest' | 'victory' | 'defeat';

interface BiomePreset {
  root: number;       // Hz
  fifth: number;      // Hz
  oscA: OscillatorType;
  oscB: OscillatorType;
  lowpass: number;    // Hz
  gain: number;       // 0..1 relative drone loudness
}

const BIOME_PRESETS: Record<AmbientBiome, BiomePreset> = {
  forest:   { root: 110.00, fifth: 164.81, oscA: 'triangle', oscB: 'sine',     lowpass: 1600, gain: 0.16 },
  dungeon:  { root:  87.31, fifth: 130.81, oscA: 'sawtooth', oscB: 'triangle', lowpass:  700, gain: 0.22 },
  city:     { root: 138.59, fifth: 207.65, oscA: 'triangle', oscB: 'triangle', lowpass: 2000, gain: 0.12 },
  mountain: { root:  82.41, fifth: 123.47, oscA: 'sine',     oscB: 'triangle', lowpass: 1400, gain: 0.14 },
  desert:   { root: 146.83, fifth: 220.00, oscA: 'sine',     oscB: 'triangle', lowpass: 1800, gain: 0.12 },
  swamp:    { root:  97.99, fifth: 146.83, oscA: 'sawtooth', oscB: 'sine',     lowpass:  900, gain: 0.18 },
  wilds:    { root: 110.00, fifth: 164.81, oscA: 'triangle', oscB: 'sine',     lowpass: 1500, gain: 0.15 },
};

interface WeatherPreset {
  noiseGain: number;        // 0..1 loudness of the noise bed
  filterType: BiquadFilterType;
  filterFreq: number;       // Hz
  filterQ: number;
  tremoloHz?: number;       // optional amplitude tremolo (e.g. storm gusts)
  burstChancePerSec?: number; // thunder/gust bursts per second
}

const WEATHER_PRESETS: Record<AmbientWeather, WeatherPreset> = {
  Clear: { noiseGain: 0,    filterType: 'lowpass',  filterFreq: 1200, filterQ: 1 },
  Rain:  { noiseGain: 0.15, filterType: 'bandpass', filterFreq: 1800, filterQ: 0.7 },
  Storm: { noiseGain: 0.22, filterType: 'bandpass', filterFreq: 1400, filterQ: 0.6, tremoloHz: 0.3, burstChancePerSec: 0.05 },
  Snow:  { noiseGain: 0.08, filterType: 'lowpass',  filterFreq:  900, filterQ: 0.8 },
  Fog:   { noiseGain: 0.06, filterType: 'lowpass',  filterFreq:  500, filterQ: 0.7 },
  Ash:   { noiseGain: 0.10, filterType: 'highpass', filterFreq: 2400, filterQ: 0.4, burstChancePerSec: 0.02 },
};

interface EngineState {
  ctx: AudioContext;
  masterGain: GainNode;
  musicGain: GainNode;
  droneA: OscillatorNode;
  droneB: OscillatorNode;
  droneGain: GainNode;
  droneFilter: BiquadFilterNode;
  noiseSource: AudioBufferSourceNode;
  noiseGain: GainNode;
  noiseFilter: BiquadFilterNode;
  biome: AmbientBiome;
  weather: AmbientWeather;
  mood: AmbientMood;
  burstTimer: number | null;
  enabled: boolean;
  musicEnabled: boolean;
}

let engine: EngineState | null = null;

const CROSSFADE_S = 2.5;

const createPinkNoiseBuffer = (ctx: AudioContext, seconds: number): AudioBuffer => {
  const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  // Voss-McCartney approximation for pink noise. Cheap, sounds nicer than white.
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.96900 * b2 + white * 0.1538520;
    b3 = 0.86650 * b3 + white * 0.3104856;
    b4 = 0.55000 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.0168980;
    data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
    b6 = white * 0.115926;
  }
  return buffer;
};

const mapBiome = (raw: string | undefined): AmbientBiome => {
  if (!raw) return 'wilds';
  const k = raw.toLowerCase();
  if (k.includes('forest') || k.includes('grove') || k.includes('wood')) return 'forest';
  if (k.includes('dungeon') || k.includes('crypt') || k.includes('cave') || k.includes('tomb')) return 'dungeon';
  if (k.includes('city') || k.includes('town') || k.includes('village') || k.includes('market')) return 'city';
  if (k.includes('mountain') || k.includes('peak') || k.includes('summit') || k.includes('cliff')) return 'mountain';
  if (k.includes('desert') || k.includes('dune') || k.includes('sand')) return 'desert';
  if (k.includes('swamp') || k.includes('marsh') || k.includes('bog')) return 'swamp';
  return 'wilds';
};

const ensureEngine = (): EngineState | null => {
  if (engine) return engine;
  try {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    const ctx = new Ctor();

    const masterGain = ctx.createGain();
    masterGain.gain.value = 0;
    masterGain.connect(ctx.destination);

    const musicGain = ctx.createGain();
    musicGain.gain.value = 0;
    musicGain.connect(masterGain);

    // Drones
    const droneGain = ctx.createGain();
    droneGain.gain.value = 0;
    const droneFilter = ctx.createBiquadFilter();
    droneFilter.type = 'lowpass';
    droneFilter.frequency.value = BIOME_PRESETS.wilds.lowpass;
    droneFilter.Q.value = 0.5;
    droneGain.connect(droneFilter);
    droneFilter.connect(musicGain);

    const droneA = ctx.createOscillator();
    droneA.type = BIOME_PRESETS.wilds.oscA;
    droneA.frequency.value = BIOME_PRESETS.wilds.root;
    droneA.connect(droneGain);
    droneA.start();

    const droneB = ctx.createOscillator();
    droneB.type = BIOME_PRESETS.wilds.oscB;
    droneB.frequency.value = BIOME_PRESETS.wilds.fifth;
    droneB.detune.value = -3; // subtle beating
    droneB.connect(droneGain);
    droneB.start();

    // Weather noise
    const noiseBuf = createPinkNoiseBuffer(ctx, 4);
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuf;
    noiseSource.loop = true;
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.value = 1000;
    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(musicGain);
    noiseSource.start();

    engine = {
      ctx,
      masterGain,
      musicGain,
      droneA,
      droneB,
      droneGain,
      droneFilter,
      noiseSource,
      noiseGain,
      noiseFilter,
      biome: 'wilds',
      weather: 'Clear',
      mood: 'explore',
      burstTimer: null,
      enabled: false,
      musicEnabled: true,
    };
    return engine;
  } catch {
    return null;
  }
};

const ramp = (param: AudioParam, target: number, seconds: number, ctx: AudioContext) => {
  const now = ctx.currentTime;
  param.cancelScheduledValues(now);
  param.setValueAtTime(param.value, now);
  param.linearRampToValueAtTime(target, now + seconds);
};

const applyBiome = (e: EngineState, biome: AmbientBiome) => {
  const preset = BIOME_PRESETS[biome];
  e.biome = biome;
  e.droneA.type = preset.oscA;
  e.droneB.type = preset.oscB;
  ramp(e.droneA.frequency, preset.root, CROSSFADE_S, e.ctx);
  ramp(e.droneB.frequency, preset.fifth, CROSSFADE_S, e.ctx);
  ramp(e.droneFilter.frequency, preset.lowpass, CROSSFADE_S, e.ctx);
  ramp(e.droneGain.gain, e.enabled && e.musicEnabled ? preset.gain : 0, CROSSFADE_S, e.ctx);
};

const applyWeather = (e: EngineState, weather: AmbientWeather) => {
  const preset = WEATHER_PRESETS[weather];
  e.weather = weather;
  e.noiseFilter.type = preset.filterType;
  ramp(e.noiseFilter.frequency, preset.filterFreq, CROSSFADE_S, e.ctx);
  e.noiseFilter.Q.value = preset.filterQ;
  ramp(e.noiseGain.gain, e.enabled && e.musicEnabled ? preset.noiseGain : 0, CROSSFADE_S, e.ctx);

  if (e.burstTimer !== null) {
    window.clearInterval(e.burstTimer);
    e.burstTimer = null;
  }
  if (preset.burstChancePerSec && e.enabled && e.musicEnabled) {
    e.burstTimer = window.setInterval(() => {
      if (Math.random() < preset.burstChancePerSec!) {
        thunderBurst(e, weather);
      }
    }, 1000);
  }
};

const thunderBurst = (e: EngineState, weather: AmbientWeather) => {
  if (!e.enabled || !e.musicEnabled) return;
  const ctx = e.ctx;
  const now = ctx.currentTime;
  const src = ctx.createBufferSource();
  src.buffer = createPinkNoiseBuffer(ctx, weather === 'Storm' ? 1.8 : 1.2);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(weather === 'Storm' ? 0.35 : 0.18, now + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.001, now + (weather === 'Storm' ? 1.6 : 1.0));
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = weather === 'Storm' ? 600 : 1400;
  src.connect(filter);
  filter.connect(gain);
  gain.connect(e.musicGain);
  src.start(now);
  src.stop(now + 2);
};

const applyMood = (e: EngineState, mood: AmbientMood) => {
  e.mood = mood;
  const gain = BIOME_PRESETS[e.biome].gain;
  // Combat narrows filter + boosts drone. Rest softens.
  const filterMul = mood === 'combat' ? 0.6 : mood === 'rest' ? 1.3 : mood === 'victory' ? 1.4 : mood === 'defeat' ? 0.5 : 1.0;
  const gainMul   = mood === 'combat' ? 1.25 : mood === 'rest' ? 0.7 : mood === 'defeat' ? 0.5 : 1.0;
  ramp(e.droneFilter.frequency, BIOME_PRESETS[e.biome].lowpass * filterMul, 1.2, e.ctx);
  ramp(e.droneGain.gain, e.enabled && e.musicEnabled ? gain * gainMul : 0, 1.2, e.ctx);
};

export const AmbientEngine = {
  /** Must be called from a user gesture on iOS/Safari to unlock audio. */
  prime: () => {
    const e = ensureEngine();
    if (!e) return;
    if (e.ctx.state === 'suspended') e.ctx.resume().catch(() => { /* ignore */ });
  },

  setEnabled: (enabled: boolean) => {
    const e = ensureEngine();
    if (!e) return;
    e.enabled = enabled;
    // Reapply all layers so the gains snap to the on/off state.
    applyBiome(e, e.biome);
    applyWeather(e, e.weather);
    applyMood(e, e.mood);
  },

  setMasterVolume: (vol: number) => {
    const e = ensureEngine();
    if (!e) return;
    ramp(e.masterGain.gain, Math.max(0, Math.min(1, vol)), 0.5, e.ctx);
  },

  setMusicVolume: (vol: number) => {
    const e = ensureEngine();
    if (!e) return;
    ramp(e.musicGain.gain, Math.max(0, Math.min(1, vol)), 0.5, e.ctx);
  },

  setMusicEnabled: (enabled: boolean) => {
    const e = ensureEngine();
    if (!e) return;
    e.musicEnabled = enabled;
    applyBiome(e, e.biome);
    applyWeather(e, e.weather);
    applyMood(e, e.mood);
  },

  setBiome: (biomeRaw: string | undefined) => {
    const e = ensureEngine();
    if (!e) return;
    const next = mapBiome(biomeRaw);
    if (next === e.biome) return;
    applyBiome(e, next);
  },

  setWeather: (weather: AmbientWeather | undefined) => {
    const e = ensureEngine();
    if (!e) return;
    const next = weather ?? 'Clear';
    if (next === e.weather) return;
    applyWeather(e, next);
  },

  setMood: (mood: AmbientMood) => {
    const e = ensureEngine();
    if (!e) return;
    if (mood === e.mood) return;
    applyMood(e, mood);
  },

  /** Used by test harnesses and SettingsModal "Test Audio" button. */
  poke: () => {
    const e = ensureEngine();
    if (!e) return;
    thunderBurst(e, 'Storm');
  },
};
