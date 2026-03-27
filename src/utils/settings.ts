import { create } from 'zustand'
import { bgm, SFX } from './sound'

const STORAGE_KEY = 'stock-roguelike-settings'

interface SettingsState {
  bgmVolume: number
  sfxVolume: number
  muted: boolean
  crtEffect: boolean
  bgEffect: boolean
  setBgmVolume: (v: number) => void
  setSfxVolume: (v: number) => void
  setMuted: (m: boolean) => void
  toggleMuted: () => void
  setCrtEffect: (on: boolean) => void
  setBgEffect: (on: boolean) => void
}

function loadSettings(): Partial<SettingsState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return {}
}

function persist(state: SettingsState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      bgmVolume: state.bgmVolume,
      sfxVolume: state.sfxVolume,
      muted: state.muted,
      crtEffect: state.crtEffect,
      bgEffect: state.bgEffect,
    }))
  } catch { /* ignore */ }
}

function syncAudio(state: SettingsState) {
  bgm.volume = state.bgmVolume
  bgm.muted = state.muted
  SFX.volume = state.sfxVolume
  SFX.muted = state.muted
}

const saved = loadSettings()

export const useSettingsStore = create<SettingsState>((set, get) => ({
  bgmVolume: saved.bgmVolume ?? 0.3,
  sfxVolume: saved.sfxVolume ?? 0.5,
  muted: saved.muted ?? false,
  crtEffect: saved.crtEffect ?? true,
  bgEffect: saved.bgEffect ?? true,

  setBgmVolume: (v) => {
    set({ bgmVolume: v })
    const s = get(); syncAudio(s); persist(s)
  },
  setSfxVolume: (v) => {
    set({ sfxVolume: v })
    const s = get(); syncAudio(s); persist(s)
  },
  setMuted: (m) => {
    set({ muted: m })
    const s = get(); syncAudio(s); persist(s)
  },
  toggleMuted: () => {
    set((s) => ({ muted: !s.muted }))
    const s = get(); syncAudio(s); persist(s)
  },
  setCrtEffect: (on) => {
    set({ crtEffect: on })
    persist(get())
  },
  setBgEffect: (on) => {
    set({ bgEffect: on })
    persist(get())
  },
}))

// Initial sync on import
syncAudio(useSettingsStore.getState())
