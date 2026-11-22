// Sound, synthesised live with WebAudio: no audio files are fetched, nothing is downloaded.
// The context is created on the first user gesture (browsers forbid sound before one), and
// every effect is a short oscillator or filtered-noise envelope.
export function createAudio() {
  let context = null;
  let master = null;
  let alarmOscillator = null;
  let alarmGain = null;

  /** Create the context on a gesture; a no-op afterwards. */
  function unlock() {
    if (context) {
      if (context.state === 'suspended') void context.resume();
      return;
    }
    try {
      const AudioContextClass = window.AudioContext ?? window.webkitAudioContext;
      if (!AudioContextClass) return;
      context = new AudioContextClass();
      master = context.createGain();
      master.gain.value = 0.22;
      master.connect(context.destination);
    } catch {
      context = null;
    }
  }

  function tone(frequency, duration, type, volume, when = 0, slideTo = null) {
    if (!context || !master) return;
    const start = context.currentTime + when;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    if (slideTo !== null) oscillator.frequency.exponentialRampToValueAtTime(slideTo, start + duration);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(master);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.05);
  }

  function noise(duration, volume, filterFrequency, when = 0) {
    if (!context || !master) return;
    const start = context.currentTime + when;
    const length = Math.max(1, Math.floor(context.sampleRate * duration));
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < length; index += 1) data[index] = Math.random() * 2 - 1;
    const source = context.createBufferSource();
    source.buffer = buffer;
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFrequency;
    const gain = context.createGain();
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start(start);
    source.stop(start + duration);
  }

  /** A soft step: called by the world while the thief walks. */
  function step() {
    noise(0.05, 0.10, 500);
  }

  /** A lifted canvas: a low chime that climbs. */
  function pickup() {
    tone(523.25, 0.16, 'sine', 0.5);
    tone(659.25, 0.2, 'sine', 0.45, 0.07);
    tone(783.99, 0.3, 'sine', 0.4, 0.14);
  }

  /** A vase pocketed: a single bright coin note. */
  function coin() {
    tone(987.77, 0.12, 'triangle', 0.35);
    tone(1318.5, 0.18, 'triangle', 0.3, 0.05);
  }

  /** A smoke pellet bursting open. */
  function smoke() {
    noise(0.45, 0.4, 900);
  }

  /** A decoy coin tossed and landing. */
  function toss() {
    tone(1800, 0.06, 'sine', 0.25);
    tone(1200, 0.08, 'sine', 0.3, 0.18);
  }

  /** A guard's radio crackle when the hunt begins. */
  function alert() {
    tone(440, 0.09, 'square', 0.18);
    tone(440, 0.09, 'square', 0.18, 0.12);
    tone(587.33, 0.16, 'square', 0.2, 0.24);
  }

  /** Caught: a falling sting. */
  function caught() {
    tone(392, 0.5, 'sawtooth', 0.3, 0, 110);
    tone(196, 0.7, 'sawtooth', 0.25, 0.1, 55);
  }

  /** The getaway: a rising arpeggio under the moon. */
  function win() {
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    notes.forEach((frequency, index) => tone(frequency, 0.35, 'triangle', 0.4, index * 0.11));
  }

  /** A soft tick as dawn closes in. */
  function tick() {
    tone(880, 0.05, 'sine', 0.15);
  }

  /**
   * The alarm's heartbeat: a low pulse whose speed follows the alarm level. Call every frame
   * with the alarm (0-100); it starts and stops the pulse itself.
   */
  function setAlarm(alarm) {
    if (!context || !master) return;
    if (alarm < 25) {
      if (alarmOscillator) {
        try { alarmOscillator.stop(); } catch { /* already stopped */ }
        alarmOscillator = null;
        alarmGain = null;
      }
      return;
    }
    if (!alarmOscillator) {
      alarmOscillator = context.createOscillator();
      alarmGain = context.createGain();
      alarmOscillator.type = 'sine';
      alarmOscillator.frequency.value = 62;
      alarmGain.gain.value = 0;
      alarmOscillator.connect(alarmGain);
      alarmGain.connect(master);
      alarmOscillator.start();
    }
    const level = Math.min(1, (alarm - 25) / 75);
    alarmGain.gain.setTargetAtTime(0.12 + level * 0.25, context.currentTime, 0.1);
    alarmOscillator.frequency.setTargetAtTime(62 + level * 70, context.currentTime, 0.1);
  }

  return { unlock, step, pickup, coin, smoke, toss, alert, caught, win, tick, setAlarm };
}
