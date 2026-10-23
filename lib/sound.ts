// All sounds are generated with the Web Audio API: no audio files to download.

let ctx: AudioContext | null = null;
let noise: { white: AudioBuffer; brown: AudioBuffer } | null = null;
let fire: { stop: () => void } | null = null;

function ac() {
  ctx ??= new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
  if (!noise) {
    const make = (seconds: number, brown: boolean) => {
      const b = ctx!.createBuffer(1, ctx!.sampleRate * seconds, ctx!.sampleRate);
      const d = b.getChannelData(0);
      let last = 0;
      for (let i = 0; i < d.length; i++) {
        const w = Math.random() * 2 - 1;
        last = (last + 0.02 * w) / 1.02;
        d[i] = brown ? last * 3.5 : w;
      }
      return b;
    };
    noise = { white: make(0.5, false), brown: make(4, true) };
  }
  return { c: ctx, n: noise };
}

/** Campfire ambience: a low roar that breathes, plus random crackles and pops. */
export function fireStart() {
  if (fire) return;
  const { c, n } = ac();
  const master = c.createGain();
  master.gain.setValueAtTime(0, c.currentTime);
  master.gain.linearRampToValueAtTime(0.55, c.currentTime + 1.5);
  master.connect(c.destination);

  const roar = c.createBufferSource();
  roar.buffer = n.brown;
  roar.loop = true;
  const lp = c.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 480;
  const roarGain = c.createGain();
  roarGain.gain.value = 0.55;
  const lfo = c.createOscillator();
  lfo.frequency.value = 0.27;
  const lfoDepth = c.createGain();
  lfoDepth.gain.value = 0.2;
  lfo.connect(lfoDepth).connect(roarGain.gain);
  roar.connect(lp).connect(roarGain).connect(master);
  roar.start();
  lfo.start();

  let timer = 0;
  const crackle = () => {
    const t = c.currentTime;
    const pops = 1 + Math.floor(Math.random() * 3);
    for (let k = 0; k < pops; k++) {
      const s = c.createBufferSource();
      s.buffer = n.white;
      const bp = c.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 1200 + Math.random() * 3800;
      bp.Q.value = 1.4;
      const g = c.createGain();
      const at = t + k * 0.025 + Math.random() * 0.03;
      g.gain.setValueAtTime(0.12 + Math.random() * 0.45, at);
      g.gain.exponentialRampToValueAtTime(0.001, at + 0.012 + Math.random() * 0.05);
      s.connect(bp).connect(g).connect(master);
      s.start(at, Math.random() * 0.4, 0.08);
    }
    timer = window.setTimeout(crackle, 50 + Math.random() * 420);
  };
  crackle();

  fire = {
    stop() {
      clearTimeout(timer);
      const t = c.currentTime;
      master.gain.cancelScheduledValues(t);
      master.gain.setValueAtTime(master.gain.value, t);
      master.gain.linearRampToValueAtTime(0, t + 0.8);
      setTimeout(() => {
        roar.stop();
        lfo.stop();
        master.disconnect();
      }, 900);
    },
  };
}

export function fireStop() {
  fire?.stop();
  fire = null;
}

/** Session complete: a soft rising three-note bell. */
export function chime() {
  const { c } = ac();
  [523.25, 783.99, 1046.5].forEach((f, i) => {
    const o = c.createOscillator();
    o.frequency.value = f;
    const g = c.createGain();
    const t = c.currentTime + i * 0.13;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.16, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + 1.8);
    o.connect(g).connect(c.destination);
    o.start(t);
    o.stop(t + 1.9);
  });
}

/** Boss takes damage: a short heavy thud. */
export function hit() {
  const { c, n } = ac();
  const t = c.currentTime;
  const o = c.createOscillator();
  o.frequency.setValueAtTime(150, t);
  o.frequency.exponentialRampToValueAtTime(42, t + 0.25);
  const g = c.createGain();
  g.gain.setValueAtTime(0.5, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + 0.32);

  const s = c.createBufferSource();
  s.buffer = n.white;
  const lp = c.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 900;
  const ng = c.createGain();
  ng.gain.setValueAtTime(0.35, t);
  ng.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
  s.connect(lp).connect(ng).connect(c.destination);
  s.start(t, 0, 0.16);
}

/** Boss taunt: a low, rough growl. */
export function growl() {
  const { c, n } = ac();
  const t = c.currentTime;
  const out = c.createGain();
  out.gain.setValueAtTime(0, t);
  out.gain.linearRampToValueAtTime(0.32, t + 0.12);
  out.gain.linearRampToValueAtTime(0.22, t + 0.6);
  out.gain.exponentialRampToValueAtTime(0.001, t + 1.1);
  const lp = c.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 700;
  lp.connect(out).connect(c.destination);

  const o = c.createOscillator();
  o.type = "sawtooth";
  o.frequency.setValueAtTime(95, t);
  o.frequency.linearRampToValueAtTime(70, t + 1.1);
  const wobble = c.createOscillator();
  wobble.frequency.value = 28;
  const depth = c.createGain();
  depth.gain.value = 14;
  wobble.connect(depth).connect(o.frequency);
  o.connect(lp);

  const s = c.createBufferSource();
  s.buffer = n.brown;
  const sg = c.createGain();
  sg.gain.value = 0.5;
  s.connect(sg).connect(lp);

  [o, wobble].forEach((x) => (x.start(t), x.stop(t + 1.15)));
  s.start(t, 0, 1.15);
}
