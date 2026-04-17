
// Procedural Sound Generation using Web Audio API
// No external assets required.

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;

const initAudio = () => {
  if (!audioCtx) {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    audioCtx = new Ctx();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.3; // Master volume
    masterGain.connect(audioCtx.destination);
  }
  if (audioCtx?.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
};

// Helper for ADSR envelopes
const playTone = (freq: number, type: OscillatorType, duration: number, startTime: number, vol = 1) => {
  if (!audioCtx || !masterGain) return;
  
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  
  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);
  
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(vol, startTime + 0.01); // Attack
  gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration); // Decay
  
  osc.connect(gain);
  gain.connect(masterGain);
  
  osc.start(startTime);
  osc.stop(startTime + duration);
};

// Helper for Noise (Damage/Impact)
const playNoise = (duration: number, startTime: number, vol = 1) => {
   if (!audioCtx || !masterGain) return;
   
   const bufferSize = audioCtx.sampleRate * duration;
   const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
   const data = buffer.getChannelData(0);
   
   for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
   }
   
   const noise = audioCtx.createBufferSource();
   noise.buffer = buffer;
   
   const gain = audioCtx.createGain();
   gain.gain.setValueAtTime(vol, startTime);
   gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
   
   // Lowpass filter for "thud" sound
   const filter = audioCtx.createBiquadFilter();
   filter.type = 'lowpass';
   filter.frequency.value = 1000;
   
   noise.connect(filter);
   filter.connect(gain);
   gain.connect(masterGain);
   
   noise.start(startTime);
};

export const SoundManager = {
  init: initAudio,

  // Added playNoise to the SoundManager object to allow external calls
  playNoise: (duration: number, vol = 1) => {
    const ctx = initAudio();
    if (!ctx) return;
    playNoise(duration, ctx.currentTime, vol);
  },

  playHover: () => {
    const ctx = initAudio();
    if (!ctx) return;
    playTone(800, 'sine', 0.05, ctx.currentTime, 0.05);
  },

  playClick: () => {
    const ctx = initAudio();
    if (!ctx) return;
    playTone(600, 'triangle', 0.1, ctx.currentTime, 0.2);
    playTone(1200, 'sine', 0.05, ctx.currentTime, 0.1);
  },

  playConfirm: () => {
     const ctx = initAudio();
     if (!ctx) return;
     playTone(880, 'sine', 0.1, ctx.currentTime, 0.2); // A5
     playTone(1108, 'sine', 0.2, ctx.currentTime + 0.1, 0.2); // C#6
  },

  playCancel: () => {
     const ctx = initAudio();
     if (!ctx) return;
     playTone(300, 'sawtooth', 0.15, ctx.currentTime, 0.2);
     playTone(200, 'sawtooth', 0.15, ctx.currentTime + 0.1, 0.2);
  },

  playGold: () => {
     const ctx = initAudio();
     if (!ctx) return;
     // High pitch shimmer
     playTone(1500, 'sine', 0.1, ctx.currentTime, 0.1);
     playTone(2000, 'sine', 0.2, ctx.currentTime + 0.05, 0.1);
  },

  playDamage: () => {
     const ctx = initAudio();
     if (!ctx) return;
     playNoise(0.3, ctx.currentTime, 0.5);
     playTone(100, 'sawtooth', 0.2, ctx.currentTime, 0.3); // Underlying grunt
  },
  
  playCrit: () => {
     const ctx = initAudio();
     if (!ctx) return;
     playNoise(0.5, ctx.currentTime, 0.8);
     playTone(50, 'square', 0.4, ctx.currentTime, 0.5);
  },
  
  playHeal: () => {
     const ctx = initAudio();
     if (!ctx) return;
     // Rising sweep
     const osc = ctx.createOscillator();
     const gain = ctx.createGain();
     osc.type = 'sine';
     osc.frequency.setValueAtTime(300, ctx.currentTime);
     osc.frequency.linearRampToValueAtTime(800, ctx.currentTime + 0.5);
     gain.gain.setValueAtTime(0, ctx.currentTime);
     gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.1);
     gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
     osc.connect(gain);
     gain.connect(masterGain!);
     osc.start(ctx.currentTime);
     osc.stop(ctx.currentTime + 0.5);
  },

  playLoot: (rarity: string) => {
     const ctx = initAudio();
     if (!ctx) return;
     const now = ctx.currentTime;
     
     if (rarity === 'common' || rarity === 'uncommon') {
        playTone(523.25, 'sine', 0.1, now, 0.2); // C5
     } else if (rarity === 'rare') {
        playTone(523.25, 'triangle', 0.1, now, 0.2);
        playTone(659.25, 'triangle', 0.1, now + 0.1, 0.2); // E5
        playTone(783.99, 'triangle', 0.2, now + 0.2, 0.2); // G5
     } else {
        // Epic/Legendary Fanfare
        playTone(523.25, 'sawtooth', 0.1, now, 0.2); // C5
        playTone(659.25, 'sawtooth', 0.1, now + 0.1, 0.2); // E5
        playTone(783.99, 'sawtooth', 0.1, now + 0.2, 0.2); // G5
        playTone(1046.50, 'sawtooth', 0.4, now + 0.3, 0.3); // C6
        
        // Sparkle effect
        for(let i=0; i<5; i++) {
           playTone(2000 + i*500, 'sine', 0.05, now + 0.3 + i*0.05, 0.05);
        }
     }
  },

  playLevelUp: () => {
     const ctx = initAudio();
     if (!ctx) return;
     const now = ctx.currentTime;
     // Power up chord
     playTone(220, 'square', 0.8, now, 0.2);
     playTone(277.18, 'square', 0.8, now, 0.2);
     playTone(329.63, 'square', 0.8, now, 0.2);
     // Slide up
     const osc = ctx.createOscillator();
     const gain = ctx.createGain();
     osc.frequency.setValueAtTime(440, now);
     osc.frequency.exponentialRampToValueAtTime(880, now + 0.5);
     gain.gain.setValueAtTime(0.2, now);
     gain.gain.linearRampToValueAtTime(0, now + 1.0);
     osc.connect(gain);
     gain.connect(masterGain!);
     osc.start(now);
     osc.stop(now + 1.0);
  },

  playTypewriter: () => {
     const ctx = initAudio();
     if (!ctx) return;
     // Very short, quiet click
     playNoise(0.015, ctx.currentTime, 0.03);
  },
  
  playNat20: () => {
     const ctx = initAudio();
     if (!ctx) return;
     const now = ctx.currentTime;
     // Ascending Arpeggio High Speed
     [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98, 2093.00].forEach((freq, i) => {
        playTone(freq, 'sawtooth', 0.1, now + (i * 0.05), 0.3);
     });
  },
  
  playNat1: () => {
     const ctx = initAudio();
     if (!ctx) return;
     const now = ctx.currentTime;
     // Sad Trombone
     playTone(493.88, 'sawtooth', 0.4, now, 0.3); // B4
     playTone(466.16, 'sawtooth', 0.4, now + 0.4, 0.3); // A#4
     playTone(440.00, 'sawtooth', 0.8, now + 0.8, 0.3); // A4
     playNoise(0.8, now + 0.8, 0.2);
  },

  playDiceRoll: () => {
     const ctx = initAudio();
     if (!ctx) return;
     // Rattling noise
     playNoise(0.1, ctx.currentTime, 0.3);
     playNoise(0.1, ctx.currentTime + 0.15, 0.2);
     playNoise(0.1, ctx.currentTime + 0.3, 0.1);
  },
  
  playCoins: () => {
     const ctx = initAudio();
     if (!ctx) return;
     for(let i=0; i<3; i++) {
        playTone(2000 + Math.random()*500, 'sine', 0.05, ctx.currentTime + i*0.08, 0.1);
     }
  },

  playEnemyDefeat: () => {
    const ctx = initAudio();
    if (!ctx) return;
    const now = ctx.currentTime;
    // Dramatic descending collapse
    playNoise(0.6, now, 0.6);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.6);
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
    osc.connect(gain);
    gain.connect(masterGain!);
    osc.start(now);
    osc.stop(now + 0.6);
  }
};
