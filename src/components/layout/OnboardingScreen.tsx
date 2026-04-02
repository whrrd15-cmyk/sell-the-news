import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useGameStore } from '../../stores/gameStore'
import { BalatroBackground } from '../effects/BalatroBackground'
import { SFX } from '../../utils/sound'
import { STOCKS } from '../../data/stocks'
import { RUN_CONFIGS } from '../../data/types'
import { MiniSparkline } from '../stocks/MiniSparkline'

/* ─── 컷신 장면 정의 ─── */
interface CutsceneScene {
  id: string
  /** 대사 (없으면 null) */
  dialogue: string | null
  /** 화자 */
  speaker?: string
}

const SCENES: CutsceneScene[] = [
  { id: 'logo', dialogue: null },
  { id: 'mentor', speaker: '리서치센터 차장', dialogue: '한국투자증권 리서치센터 차장이야. 네 OJT 담당.' },
  { id: 'mission', speaker: '리서치센터 차장', dialogue: '8분기 동안 목표 수익률을 달성해. 실패하면 해고야.' },
  { id: 'rules', speaker: '리서치센터 차장', dialogue: '딱 세 가지만 기억해. 이것만 지키면 살아남아.' },
  { id: 'depart', speaker: '리서치센터 차장', dialogue: '행운을 빌어, 인턴.' },
]

const RULE_CARDS = [
  { title: '뉴스를 읽어라', desc: '출처를 확인하고\n가짜 뉴스를 걸러내' },
  { title: '감정을 배제해라', desc: '패닉셀은 항상\n바닥에서 일어나' },
  { title: '분산 투자해라', desc: '한 종목 몰빵은\n투자가 아니라 도박' },
]

/* 분기별 목표 — RUN_CONFIGS에서 동적으로 생성 */
const DIFFICULTY_LABELS: Record<number, { grade: string; color: string }> = {
  1: { grade: 'EASY', color: '#4ade80' },
  2: { grade: 'EASY', color: '#4ade80' },
  3: { grade: 'NORMAL', color: '#facc15' },
  4: { grade: 'NORMAL', color: '#facc15' },
  5: { grade: 'HARD', color: '#f97316' },
  6: { grade: 'HARD', color: '#f97316' },
  7: { grade: 'EXTREME', color: '#ef4444' },
  8: { grade: 'EXTREME', color: '#ef4444' },
}

const QUARTER_TARGETS = RUN_CONFIGS.map((c, i) => ({
  q: `${i + 1}분기 ${c.name}`,
  target: `${(c.targetReturn * 100).toFixed(0)}%`,
  vol: c.volatilityMultiplier,
  fake: c.fakeNewsRatio,
  ...DIFFICULTY_LABELS[c.runNumber] ?? { grade: '???', color: '#888' },
}))

/* ─── 워킹 애니메이션 프레임 ─── */
const WALK_FRAMES = Array.from({ length: 6 }, (_, i) =>
  `/characters/mentor-hd/animations/walking/east/frame_${String(i).padStart(3, '0')}.png`
)

export function OnboardingScreen() {
  const { setScreen, market } = useGameStore()
  const [sceneIndex, setSceneIndex] = useState(0)
  const [displayedText, setDisplayedText] = useState('')
  const [isTyping, setIsTyping] = useState(false)

  // 워킹 애니메이션
  const [walkFrame, setWalkFrame] = useState(0)

  // 카드 플립 상태
  const [flippedCards, setFlippedCards] = useState<number[]>([])

  // 분기 목표 애니메이션
  const [visibleQuarters, setVisibleQuarters] = useState(0)

  // 미니 차트 (장면 5용)
  const [chartProgress, setChartProgress] = useState(0)

  const scene = SCENES[sceneIndex]

  // ─── 워킹 프레임 순환 (장면 1, 4) ───
  useEffect(() => {
    if (scene.id !== 'mentor' && scene.id !== 'depart') return
    const interval = setInterval(() => setWalkFrame(f => (f + 1) % WALK_FRAMES.length), 120)
    return () => clearInterval(interval)
  }, [scene.id])

  // ─── 타이핑 효과 ───
  useEffect(() => {
    if (!scene.dialogue) return
    setDisplayedText('')
    setIsTyping(true)
    let i = 0
    const text = scene.dialogue
    const interval = setInterval(() => {
      if (i < text.length) {
        setDisplayedText(text.slice(0, i + 1))
        if (text[i] !== ' ') SFX.dialogueBlip()
        i++
      } else {
        setIsTyping(false)
        clearInterval(interval)
      }
    }, 30)
    return () => clearInterval(interval)
  }, [sceneIndex, scene.dialogue])

  // ─── 장면 2: 분기별 목표 계단 애니메이션 ───
  useEffect(() => {
    if (scene.id !== 'mission') return
    setVisibleQuarters(0)
    let count = 0
    const interval = setInterval(() => {
      count++
      setVisibleQuarters(count)
      if (count >= QUARTER_TARGETS.length) clearInterval(interval)
    }, 200)
    return () => clearInterval(interval)
  }, [scene.id])

  // ─── 장면 3: 카드 플립 스태거 ───
  useEffect(() => {
    if (scene.id !== 'rules') return
    setFlippedCards([])
    const timers = RULE_CARDS.map((_, i) =>
      setTimeout(() => {
        setFlippedCards(prev => [...prev, i])
        SFX.click()
      }, 600 + i * 400)
    )
    return () => timers.forEach(clearTimeout)
  }, [scene.id])

  // ─── 장면 4: 배경 미니차트 로딩 ───
  useEffect(() => {
    if (scene.id !== 'depart') return
    setChartProgress(0)
    let p = 0
    const interval = setInterval(() => {
      p++
      setChartProgress(p)
      if (p >= 13) clearInterval(interval)
    }, 120)
    return () => clearInterval(interval)
  }, [scene.id])

  // 전분기 차트 데이터
  const previewStocks = useMemo(() => {
    const sample = STOCKS.filter(s => !s.isETF).slice(0, 6)
    return sample.map(stock => {
      const hist = market.priceHistories.find(h => h.stockId === stock.id)
      return { stock, prices: hist?.prices ?? [] }
    })
  }, [market])

  // ─── 장면 전환 ───
  const advance = useCallback(() => {
    // 타이핑 중이면 즉시 완성
    if (isTyping && scene.dialogue) {
      setDisplayedText(scene.dialogue)
      setIsTyping(false)
      return
    }

    SFX.click()
    if (sceneIndex < SCENES.length - 1) {
      setSceneIndex(sceneIndex + 1)
    } else {
      setScreen('stockpicker')
    }
  }, [isTyping, scene, sceneIndex, setScreen])

  // ESC 스킵
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        SFX.click()
        setScreen('stockpicker')
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [setScreen])

  const skipAll = useCallback(() => {
    SFX.click()
    setScreen('stockpicker')
  }, [setScreen])

  return (
    <div className="cutscene-root" onClick={advance}>
      <BalatroBackground />

      {/* 스킵 버튼 */}
      <motion.button
        className="cutscene-skip"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        onClick={(e) => { e.stopPropagation(); skipAll() }}
      >
        건너뛰기 &raquo;
      </motion.button>

      <AnimatePresence mode="wait">
        {/* ═══ 장면 0: 로고 ═══ */}
        {scene.id === 'logo' && (
          <motion.div
            key="logo"
            className="cutscene-scene cutscene-logo"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.5 }}
          >
            {/* CRT 글리치 오버레이 */}
            <div className="cutscene-glitch-overlay">
              <div className="cutscene-glitch-scanlines" />
              <div className="cutscene-glitch-rgb" />
            </div>

            <motion.h1
              className="cutscene-title"
              initial={{ opacity: 0, scale: 0.8, filter: 'blur(10px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              transition={{ duration: 0.8, delay: 0.3 }}
            >
              SELL THE NEWS
            </motion.h1>
            <motion.p
              className="cutscene-subtitle"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.6, 0.3, 0.7, 0.5] }}
              transition={{ duration: 1.5, delay: 1 }}
            >
              아무 곳이나 클릭하여 시작
            </motion.p>
          </motion.div>
        )}

        {/* ═══ 장면 1: 멘토 등장 ═══ */}
        {scene.id === 'mentor' && (
          <motion.div
            key="mentor"
            className="cutscene-scene cutscene-mentor"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            {/* 멘토 워킹 */}
            <motion.div
              className="cutscene-mentor-walk"
              initial={{ x: '-120px' }}
              animate={{ x: '0px' }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
            >
              <img
                src={WALK_FRAMES[walkFrame]}
                alt="Mentor"
                className="cutscene-character"
              />
            </motion.div>

            {/* 대사 */}
            <div className="cutscene-dialogue">
              <span className="cutscene-speaker">{scene.speaker}</span>
              <p className="cutscene-text">
                {displayedText}
                {isTyping && <span className="cutscene-cursor">_</span>}
              </p>
            </div>
          </motion.div>
        )}

        {/* ═══ 장면 2: 미션 브리핑 ═══ */}
        {scene.id === 'mission' && (
          <motion.div
            key="mission"
            className="cutscene-scene cutscene-mission"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            {/* 멘토 정면 */}
            <div className="cutscene-mentor-static">
              <img
                src="/characters/mentor-hd/rotations/south.png"
                alt="Mentor"
                className="cutscene-character"
              />
            </div>

            {/* 분기별 난이도 테이블 */}
            <div className="cutscene-quarters">
              <div className="cutscene-quarter-header">
                <span>분기</span>
                <span>목표</span>
                <span>변동성</span>
                <span>페이크</span>
                <span>난이도</span>
              </div>
              {QUARTER_TARGETS.map((q, i) => (
                <motion.div
                  key={i}
                  className="cutscene-quarter-row"
                  initial={{ opacity: 0, x: -20 }}
                  animate={i < visibleQuarters ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
                  transition={{ duration: 0.15 }}
                >
                  <span className="cutscene-quarter-name">{q.q}</span>
                  <span className="cutscene-quarter-target">{q.target}</span>
                  <span className="cutscene-quarter-vol">x{q.vol.toFixed(1)}</span>
                  <span className="cutscene-quarter-fake">{(q.fake * 100).toFixed(0)}%</span>
                  <span className="cutscene-quarter-grade" style={{ color: q.color }}>{q.grade}</span>
                </motion.div>
              ))}
            </div>

            {/* 대사 */}
            <div className="cutscene-dialogue cutscene-dialogue--bottom">
              <span className="cutscene-speaker">{scene.speaker}</span>
              <p className="cutscene-text">
                {displayedText}
                {isTyping && <span className="cutscene-cursor">_</span>}
              </p>
            </div>
          </motion.div>
        )}

        {/* ═══ 장면 3: 핵심 룰 카드 ═══ */}
        {scene.id === 'rules' && (
          <motion.div
            key="rules"
            className="cutscene-scene cutscene-rules"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="cutscene-cards">
              {RULE_CARDS.map((card, i) => (
                <motion.div
                  key={i}
                  className="cutscene-card"
                  initial={{ rotateY: 180, opacity: 0.5 }}
                  animate={
                    flippedCards.includes(i)
                      ? { rotateY: 0, opacity: 1 }
                      : { rotateY: 180, opacity: 0.5 }
                  }
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  style={{ perspective: '800px' }}
                >
                  <div className="cutscene-card-inner">
                    <div className="cutscene-card-number">{i + 1}</div>
                    <h3 className="cutscene-card-title">{card.title}</h3>
                    <p className="cutscene-card-desc">{card.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* 대사 */}
            <div className="cutscene-dialogue cutscene-dialogue--bottom">
              <span className="cutscene-speaker">{scene.speaker}</span>
              <p className="cutscene-text">
                {displayedText}
                {isTyping && <span className="cutscene-cursor">_</span>}
              </p>
            </div>
          </motion.div>
        )}

        {/* ═══ 장면 4: 출근 ═══ */}
        {scene.id === 'depart' && (
          <motion.div
            key="depart"
            className="cutscene-scene cutscene-depart"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            {/* 배경 미니차트 */}
            <div className="cutscene-bg-charts">
              {previewStocks.map(({ stock, prices }) => {
                const visible = prices.slice(0, Math.min(chartProgress + 1, prices.length))
                return (
                  <motion.div
                    key={stock.id}
                    className="cutscene-bg-chart"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.3 }}
                    transition={{ delay: 0.2 }}
                  >
                    <span className="cutscene-bg-ticker">{stock.ticker}</span>
                    <MiniSparkline prices={visible} width={90} height={24} />
                  </motion.div>
                )
              })}
            </div>

            {/* 멘토 퇴장 */}
            <motion.div
              className="cutscene-mentor-walk"
              initial={{ x: '0px' }}
              animate={{ x: 'calc(100vw + 120px)' }}
              transition={{ duration: 2, delay: 1.5, ease: 'easeIn' }}
            >
              <img
                src={WALK_FRAMES[walkFrame]}
                alt="Mentor"
                className="cutscene-character"
              />
            </motion.div>

            {/* 1분기 타이틀 */}
            <motion.div
              className="cutscene-quarter-title"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
            >
              <span className="cutscene-qt-label">QUARTER 1</span>
              <span className="cutscene-qt-name">골디락스</span>
              <span className="cutscene-qt-target">목표 수익률 5%</span>
            </motion.div>

            {/* 대사 */}
            <div className="cutscene-dialogue cutscene-dialogue--bottom">
              <span className="cutscene-speaker">{scene.speaker}</span>
              <p className="cutscene-text">
                {displayedText}
                {isTyping && <span className="cutscene-cursor">_</span>}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 다음 힌트 (로고 이외) */}
      {scene.dialogue && !isTyping && (
        <motion.div
          className="cutscene-next-hint"
          animate={{ opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          클릭하여 계속 ▼
        </motion.div>
      )}
    </div>
  )
}
