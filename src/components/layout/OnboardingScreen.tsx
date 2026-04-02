import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useGameStore } from '../../stores/gameStore'
import { SFX } from '../../utils/sound'
import { STOCKS } from '../../data/stocks'
import { RUN_CONFIGS } from '../../data/types'
import { MiniSparkline } from '../stocks/MiniSparkline'
import {
  CUTSCENE_SCENES,
  CHARACTER_SPRITES,
  WALK_FRAMES,
  DIFFICULTY_TABLE,
  RULE_CARDS,
  type CutsceneScene,
} from '../../data/cutsceneData'

/* ─── 난이도 등급 색상 ─── */
const GRADE_COLORS: Record<string, string> = {
  E: '#4ade80', D: '#4ade80',
  C: '#facc15', B: '#f97316', 'B+': '#f97316',
  A: '#ef4444', 'A+': '#ef4444', S: '#ff2222',
}

export function OnboardingScreen() {
  const { setScreen, market } = useGameStore()
  const [sceneIndex, setSceneIndex] = useState(0)
  const [displayedText, setDisplayedText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [subtitleReady, setSubtitleReady] = useState(false)

  // walk 프레임 순환
  const [walkFrame, setWalkFrame] = useState(0)

  // 오버레이 상태
  const [flippedCards, setFlippedCards] = useState<number[]>([])
  const [visibleQuarters, setVisibleQuarters] = useState(0)
  const [chartProgress, setChartProgress] = useState(0)

  const scene = CUTSCENE_SCENES[sceneIndex]
  const hasWalkingChar = scene.characters.some(c => c.animation === 'walk')

  // ─── walk 프레임 순환 (120ms 간격) ───
  useEffect(() => {
    if (!hasWalkingChar) return
    setWalkFrame(0)
    const interval = setInterval(() => setWalkFrame(f => (f + 1) % 6), 120)
    return () => clearInterval(interval)
  }, [hasWalkingChar, sceneIndex])

  // ─── 자막 딜레이 후 타이핑 시작 ───
  useEffect(() => {
    setSubtitleReady(false)
    setDisplayedText('')
    setIsTyping(false)

    if (!scene.subtitle) return

    const delay = scene.subtitleDelay ?? 0
    const timer = setTimeout(() => setSubtitleReady(true), delay)
    return () => clearTimeout(timer)
  }, [sceneIndex, scene.subtitle, scene.subtitleDelay])

  // ─── 자막 타이핑 효과 ───
  useEffect(() => {
    if (!subtitleReady || !scene.subtitle) return
    setDisplayedText('')
    setIsTyping(true)
    let i = 0
    const text = scene.subtitle
    const interval = setInterval(() => {
      if (i < text.length) {
        setDisplayedText(text.slice(0, i + 1))
        if (text[i] !== ' ' && text[i] !== '.') SFX.dialogueBlip()
        i++
      } else {
        setIsTyping(false)
        clearInterval(interval)
      }
    }, 35)
    return () => clearInterval(interval)
  }, [subtitleReady, scene.subtitle])

  // ─── 난이도 테이블 애니메이션 ───
  useEffect(() => {
    if (scene.overlay !== 'difficulty-table') return
    setVisibleQuarters(0)
    let count = 0
    const interval = setInterval(() => {
      count++
      setVisibleQuarters(count)
      if (count >= DIFFICULTY_TABLE.length) clearInterval(interval)
    }, 200)
    return () => clearInterval(interval)
  }, [scene.overlay])

  // ─── 규칙 카드 플립 ───
  useEffect(() => {
    if (scene.overlay !== 'rules-cards') return
    setFlippedCards([])
    const timers = RULE_CARDS.map((_, i) =>
      setTimeout(() => {
        setFlippedCards(prev => [...prev, i])
        SFX.click()
      }, 800 + i * 500)
    )
    return () => timers.forEach(clearTimeout)
  }, [scene.overlay])

  // ─── 출발 씬: 미니차트 로딩 ───
  useEffect(() => {
    if (scene.overlay !== 'quarter-title') return
    setChartProgress(0)
    let p = 0
    const interval = setInterval(() => {
      p++
      setChartProgress(p)
      if (p >= 13) clearInterval(interval)
    }, 120)
    return () => clearInterval(interval)
  }, [scene.overlay])

  // 미니차트 데이터
  const previewStocks = useMemo(() => {
    const sample = STOCKS.filter(s => !s.isETF).slice(0, 6)
    return sample.map(stock => {
      const hist = market.priceHistories.find(h => h.stockId === stock.id)
      return { stock, prices: hist?.prices ?? [] }
    })
  }, [market])

  // ─── 장면 전환 ───
  const advance = useCallback(() => {
    if (isTyping && scene.subtitle) {
      setDisplayedText(scene.subtitle)
      setIsTyping(false)
      return
    }
    SFX.click()
    if (sceneIndex < CUTSCENE_SCENES.length - 1) {
      setSceneIndex(sceneIndex + 1)
    } else {
      setScreen('stockpicker')
    }
  }, [isTyping, scene, sceneIndex, setScreen])

  // ESC 스킵
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { SFX.click(); setScreen('stockpicker') }
      if (e.key === ' ' || e.key === 'Enter') advance()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [setScreen, advance])

  return (
    <div className="cin-root" onClick={advance}>
      {/* 스킵 버튼 */}
      <motion.button
        className="cin-skip"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        onClick={(e) => { e.stopPropagation(); SFX.click(); setScreen('stockpicker') }}
      >
        SKIP &raquo;
      </motion.button>

      <AnimatePresence mode="wait">
        <motion.div
          key={scene.id}
          className="cin-scene"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
        >
          {/* ═══ 배경 ═══ */}
          {scene.background ? (
            <img
              src={scene.background}
              alt=""
              className="cin-bg"
            />
          ) : (
            <div className="cin-bg-cosmic" />
          )}

          {/* ═══ 배경 위 다크 오버레이 ═══ */}
          <div className="cin-vignette" />

          {/* ═══ 캐릭터 ═══ */}
          {scene.characters.map((char, idx) => {
            // walk 애니메이션 프레임이 있으면 순환, 없으면 정적 스프라이트
            const walkFrames = char.animation === 'walk' ? WALK_FRAMES[char.id] : null
            const sprite = walkFrames
              ? walkFrames[walkFrame % walkFrames.length]
              : CHARACTER_SPRITES[char.id]?.[char.animation]
            const scale = char.scale ?? 2.5
            const positionX = char.position === 'left' ? '20%'
              : char.position === 'right' ? '70%' : '45%'

            return (
              <motion.img
                key={`${char.id}-${idx}`}
                src={sprite}
                alt={char.id}
                className="cin-character"
                initial={{
                  opacity: 0,
                  x: char.animation === 'walk' ? (char.facing === 'right' ? -200 : 200) : 0,
                }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                style={{
                  left: positionX,
                  bottom: '15%',
                  transform: `scale(${scale}) ${char.facing === 'left' ? 'scaleX(-1)' : ''}`,
                  imageRendering: 'pixelated',
                }}
              />
            )
          })}

          {/* ═══ 오버레이: 로고 ═══ */}
          {scene.overlay === 'logo' && (
            <>
              <div className="cin-glitch-scanlines" />
              <motion.h1
                className="cin-title"
                initial={{ opacity: 0, scale: 0.8, filter: 'blur(10px)' }}
                animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                transition={{ duration: 0.8, delay: 0.3 }}
              >
                SELL THE NEWS
              </motion.h1>
              <motion.p
                className="cin-title-sub"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.6, 0.3, 0.7, 0.5] }}
                transition={{ duration: 1.5, delay: 1 }}
              >
                클릭하여 시작
              </motion.p>
            </>
          )}

          {/* ═══ 오버레이: 난이도 테이블 ═══ */}
          {scene.overlay === 'difficulty-table' && (
            <div className="cin-overlay-table">
              <div className="cin-table-header">
                <span>분기</span><span>목표</span><span>변동성</span><span>페이크</span><span>난이도</span>
              </div>
              {DIFFICULTY_TABLE.map((row, i) => (
                <motion.div
                  key={i}
                  className="cin-table-row"
                  initial={{ opacity: 0, x: -20 }}
                  animate={i < visibleQuarters ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
                  transition={{ duration: 0.15 }}
                >
                  <span>{row.quarter}분기 {row.name}</span>
                  <span className="cin-table-target">{row.target}</span>
                  <span>{row.volatility}</span>
                  <span>{row.fake}</span>
                  <span style={{ color: GRADE_COLORS[row.grade] ?? '#888', fontWeight: 900 }}>{row.grade}</span>
                </motion.div>
              ))}
            </div>
          )}

          {/* ═══ 오버레이: 규칙 카드 ═══ */}
          {scene.overlay === 'rules-cards' && (
            <div className="cin-overlay-cards">
              {RULE_CARDS.map((card, i) => (
                <motion.div
                  key={i}
                  className="cin-rule-card"
                  initial={{ rotateY: 180, opacity: 0.3 }}
                  animate={
                    flippedCards.includes(i)
                      ? { rotateY: 0, opacity: 1 }
                      : { rotateY: 180, opacity: 0.3 }
                  }
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                >
                  <div className="cin-rule-number">{card.number}</div>
                  <h3 className="cin-rule-title">{card.title}</h3>
                  <p className="cin-rule-desc">{card.desc}</p>
                </motion.div>
              ))}
            </div>
          )}

          {/* ═══ 오버레이: 분기 타이틀 ═══ */}
          {scene.overlay === 'quarter-title' && (
            <>
              {/* 배경 미니차트 */}
              <div className="cin-bg-charts">
                {previewStocks.map(({ stock, prices }) => {
                  const visible = prices.slice(0, Math.min(chartProgress + 1, prices.length))
                  return (
                    <motion.div
                      key={stock.id}
                      className="cin-bg-chart"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0.25 }}
                      transition={{ delay: 0.2 }}
                    >
                      <span className="cin-bg-ticker">{stock.ticker}</span>
                      <MiniSparkline prices={visible} width={90} height={24} />
                    </motion.div>
                  )
                })}
              </div>

              {/* Q1 타이틀 */}
              <motion.div
                className="cin-quarter-title"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.5, duration: 0.6 }}
              >
                <span className="cin-qt-label">QUARTER 1</span>
                <span className="cin-qt-name">골디락스</span>
                <span className="cin-qt-target">목표 수익률 5%</span>
              </motion.div>
            </>
          )}

          {/* ═══ 시네마 자막 ═══ */}
          {scene.subtitle && (
            <div className="cin-subtitle-area">
              <div className="cin-subtitle-gradient" />
              <motion.p
                className="cin-subtitle-text"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                {displayedText}
                {isTyping && <span className="cin-cursor">|</span>}
              </motion.p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* 다음 힌트 */}
      {!isTyping && displayedText.length > 0 && scene.overlay !== 'logo' && (
        <motion.div
          className="cin-next-hint"
          animate={{ opacity: [0.2, 0.6, 0.2] }}
          transition={{ duration: 2.5, repeat: Infinity }}
        >
          ▼
        </motion.div>
      )}

      {/* 씬 인디케이터 */}
      <div className="cin-scene-dots">
        {CUTSCENE_SCENES.map((_, i) => (
          <div
            key={i}
            className={`cin-dot ${i === sceneIndex ? 'cin-dot--active' : ''} ${i < sceneIndex ? 'cin-dot--done' : ''}`}
          />
        ))}
      </div>
    </div>
  )
}
