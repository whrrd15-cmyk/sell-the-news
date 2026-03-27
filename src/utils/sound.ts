// Audio system — ElevenLabs generated MP3 sound effects + background music
// Falls back to Web Audio API synthesis if MP3 loading fails

// ─── Audio Cache ───────────────────────────────────────────────

const audioCache = new Map<string, HTMLAudioElement>()
const BASE = '/audio'

function preloadAudio(path: string): HTMLAudioElement {
  const cached = audioCache.get(path)
  if (cached) return cached
  const audio = new Audio(path)
  audio.preload = 'auto'
  audioCache.set(path, audio)
  return audio
}

function playSFX(path: string, volume = 0.5) {
  try {
    const audio = preloadAudio(path)
    const clone = audio.cloneNode() as HTMLAudioElement
    clone.volume = volume
    clone.play().catch(() => {})
  } catch {
    // Silent fail
  }
}

// ─── BGM Manager ───────────────────────────────────────────────

class BGMManager {
  private current: HTMLAudioElement | null = null
  private currentTrack: string | null = null
  private _volume = 0.3
  private _muted = false
  private fadeInterval: ReturnType<typeof setInterval> | null = null

  get volume() { return this._volume }
  set volume(v: number) {
    this._volume = Math.max(0, Math.min(1, v))
    if (this.current && !this._muted) {
      this.current.volume = this._volume
    }
  }

  get muted() { return this._muted }
  set muted(m: boolean) {
    this._muted = m
    if (this.current) {
      this.current.volume = m ? 0 : this._volume
    }
  }

  play(track: 'title' | 'game-main' | 'shop') {
    const path = `${BASE}/bgm/${track}.mp3`

    // Don't restart if already playing the same track
    if (this.currentTrack === track && this.current && !this.current.paused) {
      return
    }

    this.stop()

    const audio = new Audio(path)
    audio.loop = true
    audio.volume = this._muted ? 0 : this._volume
    audio.play().catch(() => {})

    this.current = audio
    this.currentTrack = track
  }

  stop() {
    if (this.fadeInterval) {
      clearInterval(this.fadeInterval)
      this.fadeInterval = null
    }
    if (this.current) {
      this.current.pause()
      this.current.currentTime = 0
      this.current = null
      this.currentTrack = null
    }
  }

  fadeOut(durationMs = 1000) {
    if (!this.current) return
    const audio = this.current
    const step = audio.volume / (durationMs / 50)

    this.fadeInterval = setInterval(() => {
      if (audio.volume > step) {
        audio.volume -= step
      } else {
        audio.volume = 0
        audio.pause()
        clearInterval(this.fadeInterval!)
        this.fadeInterval = null
        if (this.current === audio) {
          this.current = null
          this.currentTrack = null
        }
      }
    }, 50)
  }

  crossFadeTo(track: 'title' | 'game-main' | 'shop', durationMs = 800) {
    if (this.currentTrack === track) return

    const path = `${BASE}/bgm/${track}.mp3`
    const oldAudio = this.current

    // Fade out old
    if (oldAudio) {
      const step = oldAudio.volume / (durationMs / 50)
      const fadeOut = setInterval(() => {
        if (oldAudio.volume > step) {
          oldAudio.volume -= step
        } else {
          oldAudio.volume = 0
          oldAudio.pause()
          clearInterval(fadeOut)
        }
      }, 50)
    }

    // Fade in new
    const newAudio = new Audio(path)
    newAudio.loop = true
    newAudio.volume = 0
    newAudio.play().catch(() => {})

    const targetVol = this._muted ? 0 : this._volume
    const step = targetVol / (durationMs / 50)
    const fadeIn = setInterval(() => {
      if (newAudio.volume < targetVol - step) {
        newAudio.volume += step
      } else {
        newAudio.volume = targetVol
        clearInterval(fadeIn)
      }
    }, 50)

    this.current = newAudio
    this.currentTrack = track
  }
}

export const bgm = new BGMManager()

// ─── SFX (preload all) ────────────────────────────────────────

const SFX_FILES = [
  'buy', 'sell', 'click', 'breaking-news', 'success', 'failure',
  'phase-change', 'next-turn', 'shop-enter', 'skill-buy', 'item-use',
  'quiz-correct', 'quiz-wrong', 'card-flick', 'price-up', 'price-down',
] as const

// Preload all SFX on first import
SFX_FILES.forEach(name => preloadAudio(`${BASE}/sfx/${name}.mp3`))

// ─── Web Audio API fallback for sounds without MP3 ─────────────

let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext()
  return audioCtx
}

function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = 'square',
  volume = 0.1,
  ramp?: 'up' | 'down',
) {
  try {
    const ctx = getAudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(frequency, ctx.currentTime)
    gain.gain.setValueAtTime(volume, ctx.currentTime)
    if (ramp === 'down') {
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
    } else if (ramp === 'up') {
      gain.gain.setValueAtTime(0.001, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(volume, ctx.currentTime + duration * 0.5)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
    }
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + duration)
  } catch { /* silent fail */ }
}

// ─── SFX Public API ────────────────────────────────────────────

let sfxVolume = 0.5
let sfxMuted = false

export const SFX = {
  get volume() { return sfxVolume },
  set volume(v: number) { sfxVolume = Math.max(0, Math.min(1, v)) },
  get muted() { return sfxMuted },
  set muted(m: boolean) { sfxMuted = m },

  click()        { if (!sfxMuted) playSFX(`${BASE}/sfx/click.mp3`, sfxVolume * 0.6) },
  hover()        { if (!sfxMuted) playTone(600, 0.03, 'square', 0.04) },
  buy()          { if (!sfxMuted) playSFX(`${BASE}/sfx/buy.mp3`, sfxVolume) },
  sell()         { if (!sfxMuted) playSFX(`${BASE}/sfx/sell.mp3`, sfxVolume) },
  phaseChange()  { if (!sfxMuted) playSFX(`${BASE}/sfx/phase-change.mp3`, sfxVolume * 0.7) },
  nextTurn()     { if (!sfxMuted) playSFX(`${BASE}/sfx/next-turn.mp3`, sfxVolume * 0.7) },
  priceUp()      { if (!sfxMuted) playSFX(`${BASE}/sfx/price-up.mp3`, sfxVolume * 0.8) },
  priceDown()    { if (!sfxMuted) playSFX(`${BASE}/sfx/price-down.mp3`, sfxVolume * 0.8) },
  breakingNews() { if (!sfxMuted) playSFX(`${BASE}/sfx/breaking-news.mp3`, sfxVolume) },
  success()      { if (!sfxMuted) playSFX(`${BASE}/sfx/success.mp3`, sfxVolume) },
  failure()      { if (!sfxMuted) playSFX(`${BASE}/sfx/failure.mp3`, sfxVolume) },
  skillBuy()     { if (!sfxMuted) playSFX(`${BASE}/sfx/skill-buy.mp3`, sfxVolume) },
  shopEnter()    { if (!sfxMuted) playSFX(`${BASE}/sfx/shop-enter.mp3`, sfxVolume) },
  chipCount()    { if (!sfxMuted) playSFX(`${BASE}/sfx/item-use.mp3`, sfxVolume * 0.7) },
  cardFlick()    { if (!sfxMuted) playSFX(`${BASE}/sfx/card-flick.mp3`, sfxVolume * 0.6) },
  quizCorrect()  { if (!sfxMuted) playSFX(`${BASE}/sfx/quiz-correct.mp3`, sfxVolume) },
  quizWrong()    { if (!sfxMuted) playSFX(`${BASE}/sfx/quiz-wrong.mp3`, sfxVolume) },

  // Fallback synth-only sounds (no MP3 generated for these)
  fakeReveal() {
    if (sfxMuted) return
    playTone(200, 0.15, 'sawtooth', 0.1, 'down')
    setTimeout(() => playTone(150, 0.2, 'sawtooth', 0.1, 'down'), 150)
  },
  cardReveal() {
    if (sfxMuted) return
    playTone(1200, 0.04, 'square', 0.06, 'down')
    setTimeout(() => playTone(1600, 0.04, 'square', 0.04, 'down'), 40)
  },
  rpEarn() {
    if (sfxMuted) return
    playTone(880, 0.05, 'square', 0.06)
    setTimeout(() => playTone(1100, 0.08, 'square', 0.06, 'down'), 50)
  },
  scoreUp() {
    if (sfxMuted) return
    for (let i = 0; i < 5; i++) {
      setTimeout(() => playTone(600 + i * 100, 0.04, 'square', 0.05, 'down'), i * 50)
    }
  },
  rumble() {
    if (sfxMuted) return
    playTone(80, 0.2, 'sawtooth', 0.06, 'down')
    playTone(60, 0.25, 'sine', 0.04, 'down')
  },
  whoosh() {
    if (sfxMuted) return
    try {
      const ctx = getAudioContext()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(400, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.15)
      osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.3)
      gain.gain.setValueAtTime(0.05, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.3)
    } catch { /* silent fail */ }
  },
  cascadeTick(progress: number) {
    if (sfxMuted) return
    playTone(400 + progress * 400, 0.03, 'square', 0.05, 'down')
  },

  /** 대사 타이핑 블립 — 글자마다 호출, 피치를 약간 랜덤화해 자연스럽게 */
  dialogueBlip() {
    if (sfxMuted) return
    const base = 380 + Math.random() * 60          // 380~440 Hz 범위
    playTone(base, 0.035, 'square', sfxVolume * 0.07, 'down')
  },
}
