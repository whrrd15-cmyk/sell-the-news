import { useMemo, useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { useGameStore } from '../../stores/gameStore'
import { BalatroBackground } from '../effects/BalatroBackground'
import { BouncyText } from '../effects/BouncyText'
import { GoogleLoginButton } from '../ui/GoogleLoginButton'
import { SFX, bgm } from '../../utils/sound'
import { hasSaveData, loadSaveData } from '../../utils/save'

export function TitleScreen() {
  const { startNewRun, meta, setScreen, loadDebugResult, loadDebugResultSuccess } = useGameStore()
  const [typedTitle, setTypedTitle] = useState('')
  const [typingDone, setTypingDone] = useState(false)
  const [showDebug, setShowDebug] = useState(false)
  const fullTitle = 'SELL THE NEWS'

  const saveExists = useMemo(() => hasSaveData(), [])
  const saveInfo = useMemo(() => {
    if (!saveExists) return null
    const data = loadSaveData()
    if (!data) return null
    return { turn: data.turn, runNumber: data.runNumber }
  }, [saveExists])

  useEffect(() => { bgm.play('title') }, [])

  useEffect(() => {
    let i = 0
    const interval = setInterval(() => {
      if (i <= fullTitle.length) {
        setTypedTitle(fullTitle.slice(0, i))
        if (i > 0 && fullTitle[i - 1] !== ' ') SFX.dialogueBlip()
        i++
      } else {
        clearInterval(interval)
        setTimeout(() => setTypingDone(true), 300)
      }
    }, 80)
    return () => clearInterval(interval)
  }, [])

  const handleContinue = () => {
    if (saveInfo) startNewRun(saveInfo.runNumber)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
      <BalatroBackground />

      {/* Google 로그인 — 우측 상단 */}
      <motion.div
        className="absolute top-4 right-4 z-20"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.8 }}
      >
        <GoogleLoginButton />
      </motion.div>

      {/* 메인 타이틀 */}
      <motion.div
        className="relative z-10 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="text-5xl md:text-7xl font-pixel mb-2 text-bal-gold"
          style={{ textShadow: '0 0 20px #f0b42955, 0 0 40px #f0b42922' }}
        >
          {typingDone ? (
            <BouncyText text={fullTitle} amplitude={5} period={2.5} stagger={0.06} />
          ) : (
            <>
              {typedTitle}
              <motion.span
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.6, repeat: Infinity, repeatType: 'reverse' }}
                className="text-bal-gold"
              >_</motion.span>
            </>
          )}
        </div>

        <p className="text-sm text-bal-text-dim mt-4 mb-1">
          뉴스를 읽고, 시장을 이겨라
        </p>
        <p className="text-xs text-bal-text-dim/60 mb-10">
          실시간 주식 트레이딩 시뮬레이션
        </p>
      </motion.div>

      {/* 메뉴 버튼 */}
      <motion.div
        className="relative z-10 flex flex-col gap-2 w-72"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2, duration: 0.4 }}
      >
        <button
          className="bal-btn bal-btn-green w-full text-lg py-3"
          onClick={() => { SFX.click(); startNewRun(Math.min(meta.highestRunCleared + 1, 8)) }}
        >
          새 게임
        </button>
        <button
          className={`bal-btn bal-btn-primary w-full text-lg py-3 ${!saveExists ? 'opacity-30 cursor-not-allowed' : ''}`}
          onClick={() => { SFX.click(); handleContinue() }}
        >
          {saveInfo ? `이어하기 (${saveInfo.runNumber}분기, ${saveInfo.turn}턴)` : '이어하기'}
        </button>
        {meta.totalRuns > 0 && (
          <button
            className="bal-btn bal-btn-gold w-full text-lg py-3"
            onClick={() => { SFX.click(); setScreen('meta') }}
          >
            메타 업그레이드
          </button>
        )}
        <button
          className="bal-btn w-full text-lg py-3"
          onClick={() => { SFX.click(); setScreen('settings') }}
        >
          설정
        </button>
      </motion.div>

      {/* 메타 정보 */}
      {meta.totalRuns > 0 && (
        <motion.div
          className="relative z-10 mt-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.6 }}
        >
          <div className="bal-panel-inset inline-flex items-center gap-4 text-xs px-5 py-2">
            <span className="text-bal-text-dim">총 런: <span className="text-white">{meta.totalRuns}</span></span>
            <span className="text-bal-text-dim">최고 클리어: <span className="text-bal-green">{meta.highestRunCleared}분기</span></span>
            <span className="text-bal-text-dim">메타 포인트: <span className="text-bal-gold">{meta.metaPoints}</span></span>
          </div>
        </motion.div>
      )}

      {/* 하단 */}
      <motion.div
        className="absolute bottom-6 text-center text-xs text-bal-text-dim/50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
      >
        <p>가상융합서비스경진대회 2026</p>
      </motion.div>

      {/* 디버그 메뉴 */}
      <div className="absolute bottom-4 left-4 z-30">
        <button
          className="text-xs px-2 py-1 rounded bg-white/5 text-white/30 hover:text-white/60 hover:bg-white/10 transition-all"
          onClick={() => setShowDebug(v => !v)}
        >
          DEV
        </button>
        {showDebug && (
          <div className="absolute bottom-8 left-0 bg-black/70 backdrop-blur-sm rounded-lg p-1 min-w-[160px] border border-white/10">
            <button
              className="block w-full text-left text-xs text-white/80 hover:bg-white/10 rounded px-3 py-2 transition-colors"
              onClick={() => { SFX.click(); loadDebugResult() }}
            >
              결과 화면 보기
            </button>
            <button
              className="block w-full text-left text-xs text-white/80 hover:bg-white/10 rounded px-3 py-2 transition-colors"
              onClick={() => { SFX.click(); loadDebugResultSuccess() }}
            >
              결과 화면 (성공)
            </button>
            <button
              className="block w-full text-left text-xs text-white/80 hover:bg-white/10 rounded px-3 py-2 transition-colors"
              onClick={() => { SFX.click(); setScreen('clear') }}
            >
              클리어 화면
            </button>
            {['Placeholder 4', 'Placeholder 5'].map((label) => (
              <button
                key={label}
                className="block w-full text-left text-xs text-white/30 px-3 py-2 cursor-not-allowed"
                disabled
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
