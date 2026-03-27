import { useState, useRef, useCallback, useEffect } from 'react'
import { motion } from 'motion/react'
import { useGameStore } from '../../stores/gameStore'
import { useSettingsStore } from '../../utils/settings'
import { BalatroBackground } from '../effects/BalatroBackground'
import { SFX } from '../../utils/sound'
import { deleteSaveData } from '../../utils/save'

const HOLD_DURATION = 5000 // 5초

export function SettingsScreen() {
  const setScreen = useGameStore((s) => s.setScreen)
  const {
    bgmVolume, sfxVolume, muted,
    crtEffect, bgEffect,
    setBgmVolume, setSfxVolume, toggleMuted,
    setCrtEffect, setBgEffect,
  } = useSettingsStore()

  const [progress, setProgress] = useState(0)
  const [deleted, setDeleted] = useState(false)
  const pressStartRef = useRef<number | null>(null)
  const rafRef = useRef<number>(0)

  const stopHold = useCallback(() => {
    pressStartRef.current = null
    cancelAnimationFrame(rafRef.current)
    setProgress(0)
  }, [])

  const tick = useCallback(() => {
    if (pressStartRef.current === null) return
    const elapsed = Date.now() - pressStartRef.current
    const p = Math.min(elapsed / HOLD_DURATION, 1)
    setProgress(p)
    if (p >= 1) {
      pressStartRef.current = null
      deleteSaveData()
      localStorage.removeItem('stock-roguelike-meta')
      SFX.success()
      setDeleted(true)
      setTimeout(() => setDeleted(false), 2000)
      return
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [])

  const startHold = useCallback(() => {
    if (deleted) return
    pressStartRef.current = Date.now()
    rafRef.current = requestAnimationFrame(tick)
  }, [tick, deleted])

  useEffect(() => () => cancelAnimationFrame(rafRef.current), [])

  return (
    <div className="min-h-screen text-white font-pixel flex flex-col items-center px-4 py-8 relative overflow-hidden">
      <BalatroBackground />

      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 text-center mb-8">
        <h1 className="text-4xl md:text-5xl text-bal-gold mb-2">설정</h1>
        <p className="text-bal-text-dim text-sm">게임 환경을 조정하세요</p>
      </motion.div>

      <div className="relative z-10 flex flex-col gap-4 max-w-md w-full mb-10">
        {/* 사운드 섹션 */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bal-card p-5">
          <h2 className="text-bal-gold text-sm font-bold mb-4">사운드</h2>

          <div className="flex flex-col gap-4">
            <div className="settings-slider-row">
              <label className="text-bal-text-dim text-xs w-20">BGM</label>
              <input
                type="range" min={0} max={100} step={1}
                value={Math.round(bgmVolume * 100)}
                onChange={(e) => setBgmVolume(Number(e.target.value) / 100)}
                className="settings-slider flex-1"
              />
              <span className="text-bal-text text-xs w-10 text-right">{Math.round(bgmVolume * 100)}%</span>
            </div>

            <div className="settings-slider-row">
              <label className="text-bal-text-dim text-xs w-20">효과음</label>
              <input
                type="range" min={0} max={100} step={1}
                value={Math.round(sfxVolume * 100)}
                onChange={(e) => setSfxVolume(Number(e.target.value) / 100)}
                className="settings-slider flex-1"
              />
              <span className="text-bal-text text-xs w-10 text-right">{Math.round(sfxVolume * 100)}%</span>
            </div>

            <div className="settings-toggle-row">
              <span className="text-bal-text-dim text-xs">전체 음소거</span>
              <button
                onClick={() => { toggleMuted(); SFX.click() }}
                className={`settings-toggle ${muted ? 'settings-toggle-on' : ''}`}
              >
                <span className="settings-toggle-knob" />
              </button>
            </div>
          </div>
        </motion.div>

        {/* 화면 효과 섹션 */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bal-card p-5">
          <h2 className="text-bal-gold text-sm font-bold mb-4">화면 효과</h2>

          <div className="flex flex-col gap-3">
            <div className="settings-toggle-row">
              <span className="text-bal-text-dim text-xs">CRT 효과</span>
              <button
                onClick={() => { setCrtEffect(!crtEffect); SFX.click() }}
                className={`settings-toggle ${crtEffect ? 'settings-toggle-on' : ''}`}
              >
                <span className="settings-toggle-knob" />
              </button>
            </div>

            <div className="settings-toggle-row">
              <span className="text-bal-text-dim text-xs">배경 효과</span>
              <button
                onClick={() => { setBgEffect(!bgEffect); SFX.click() }}
                className={`settings-toggle ${bgEffect ? 'settings-toggle-on' : ''}`}
              >
                <span className="settings-toggle-knob" />
              </button>
            </div>
          </div>
        </motion.div>

        {/* 데이터 섹션 */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="bal-card p-5">
          <h2 className="text-bal-gold text-sm font-bold mb-4">데이터</h2>

          <button
            onPointerDown={startHold}
            onPointerUp={stopHold}
            onPointerLeave={stopHold}
            className="settings-hold-btn w-full text-sm py-3 relative overflow-hidden select-none"
          >
            <span
              className="settings-hold-progress"
              style={{ width: `${progress * 100}%` }}
            />
            <span className="relative z-10">
              {deleted
                ? '초기화 완료!'
                : progress > 0
                  ? `길게 누르는 중... (${Math.ceil(HOLD_DURATION / 1000 - progress * HOLD_DURATION / 1000)}초)`
                  : '모든 데이터 초기화 (길게 누르기)'}
            </span>
          </button>
          <p className="text-bal-text-dim/50 text-[10px] mt-2 text-center">
            5초간 길게 눌러야 실행됩니다
          </p>
        </motion.div>
      </div>

      <motion.button initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
        onClick={() => { SFX.click(); setScreen('title') }}
        className="relative z-10 bal-btn text-lg px-10">
        타이틀로 돌아가기
      </motion.button>
    </div>
  )
}
