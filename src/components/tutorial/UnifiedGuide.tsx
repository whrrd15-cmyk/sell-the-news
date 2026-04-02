import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { SFX } from '../../utils/sound'
import { useGameStore } from '../../stores/gameStore'
import type { PageId } from '../layout/SidebarNav'

/* ─── 공통 스텝 인터페이스 ─── */
interface GuideStep {
  target: string | null
  text: string
  page?: PageId
  waitForClick?: boolean
  characterMood?: 'idle' | 'celebrate' | 'warning' | 'advice'
}

interface GuideChapter {
  id: string
  title: string
  color: string
  page: PageId
  steps: GuideStep[]
}

/* ─── 자동 가이드 스텝 (첫 런, 6스텝) ─── */
const AUTO_STEPS: GuideStep[] = [
  { target: null, text: '자, 첫 업무야. 뉴스 읽고 → 투자 판단 → 결과 확인. 이게 전부야.' },
  { target: '[data-guide="news-panel"]', text: '뉴스가 도착했어. 출처를 봐 — 공영방송은 믿을 만하고, SNS는 의심해.', page: 'news' },
  { target: '[data-guide="news-item"]', text: '기사를 눌러봐.', page: 'news', waitForClick: true },
  { target: '[data-guide="phase-cta"]', text: '분석 끝나면 이 버튼으로 투자 단계로 넘어가.', page: 'news', waitForClick: true },
  { target: '[data-guide="trade-panel"]', text: '여기서 매수/매도해. 25%, 50%, 전량 버튼으로 빠르게 수량을 정할 수 있어.', page: 'investment' },
  { target: '[data-guide="asset-bar"]', text: '현금, 수익률, RP가 여기 있어. 나머지는 가이드 버튼에서 언제든 확인 가능.', page: 'investment' },
]

/* ─── 전체 가이드 챕터 (수동, 압축) ─── */
const CHAPTERS: GuideChapter[] = [
  {
    id: 'intro', title: '프롤로그', color: '#f0b429', page: 'trading',
    steps: [
      { target: '[data-guide="hud"]', text: '8분기 동안 벤치마크 수익률을 달성해. 1분기 목표는 5%.' },
      { target: '[data-guide="hud"]', text: '8분기 "퍼펙트 스톰"까지 서바이브하면 정규직 전환.' },
      { target: '[data-guide="hud"]', text: 'HTS 화면을 브리핑해줄게.' },
    ],
  },
  {
    id: 'ui', title: 'Ch.1 트레이딩 데스크', color: '#f0b429', page: 'trading',
    steps: [
      { target: '[data-guide="hud"]', text: 'HUD야. 현금, 수익률, RP, 장 시간이 한눈에 보여.' },
      { target: '.trading-speed-controls', text: '속도 조절. 일시정지해도 뉴스 분석, 리미트 오더는 가능해.', waitForClick: true },
      { target: '[data-guide="chart"]', text: '캔들스틱 차트. 양봉(초록) 상승, 음봉(빨강) 하락.' },
      { target: '[data-guide="orderbook"]', text: '호가창. 매수/매도 호가와 잔량 표시.' },
      { target: '[data-guide="order"]', text: '주문서. 여기서 매수/매도 오더를 넣어.' },
    ],
  },
  {
    id: 'first-trade', title: 'Ch.2 첫 매수', color: '#5ec269', page: 'trading',
    steps: [
      { target: '[data-guide="order"]', text: '수량 입력하고 매수 버튼을 눌러봐!', waitForClick: true },
      { target: '[data-guide="order"]', text: '첫 포지션 진입 성공!', characterMood: 'celebrate' },
      { target: '.trading-quarter-bar', text: '분기 진행률. 13주 후 퍼포먼스 리뷰를 받아.' },
    ],
  },
  {
    id: 'news', title: 'Ch.3 뉴스 분석', color: '#5b9bd5', page: 'news',
    steps: [
      { target: '.sidebar-nav-item:nth-child(2)', text: '뉴스 탭으로 이동.', waitForClick: true, page: 'trading' },
      { target: '.news-v2-tabs', text: '카테고리 필터. 정부, 경제, 기술, 지정학별 분류.', page: 'news' },
      { target: '.news-v2-body', text: '뉴스 피드. 기사를 클릭하면 인과관계와 섹터 임팩트가 나와.', waitForClick: true, page: 'news' },
      { target: '.news-v2-body', text: '출처와 신뢰도를 확인해. 공영방송은 높은 신뢰도, SNS는 노이즈.', page: 'news' },
      { target: '.news-v2-body', text: '뉴스로 컨빅션을 세운 뒤 포지션을 잡는 게 알파의 원천.', page: 'news' },
    ],
  },
  {
    id: 'social', title: 'Ch.4 센티먼트/매크로', color: '#e88c3a', page: 'analysis',
    steps: [
      { target: '.sidebar-nav-item:nth-child(3)', text: '사회 탭으로 이동.', waitForClick: true, page: 'news' },
      { target: '.social-v2-body', text: 'SNS 센티먼트. 역투자 관점도 필요해.', page: 'analysis', characterMood: 'warning' },
      { target: '.social-v2-tabs', text: '매크로 지표. GDP, 실업률, 기준금리, CPI.', waitForClick: true, page: 'analysis' },
      { target: '.social-v2-body', text: '금리 인상은 성장주 하락, 실업률 상승은 리세션 시그널.', page: 'analysis' },
    ],
  },
  {
    id: 'orders', title: 'Ch.5 오더/리스크', color: '#9b72cf', page: 'trading',
    steps: [
      { target: '.sidebar-nav-item:nth-child(1)', text: '트레이딩 데스크로 돌아가자.', waitForClick: true, page: 'analysis' },
      { target: '[data-guide="order"]', text: '리미트 오더: 지정가 자동 체결. 스탑로스: 드로다운 제한.', page: 'trading' },
      { target: '[data-guide="order"]', text: '리스크 관리가 수익의 절반이야.', page: 'trading', characterMood: 'advice' },
      { target: '[data-guide="order"]', text: '레버리지와 숏셀링은 스킬 언락 후 신중하게.', page: 'trading', characterMood: 'warning' },
    ],
  },
  {
    id: 'economy', title: 'Ch.6 RP/스킬', color: '#f0b429', page: 'trading',
    steps: [
      { target: '[data-guide="hud"]', text: 'RP = 리서치 능력의 화폐. 뉴스 분석할수록 쌓여.' },
      { target: '[data-guide="hud"]', text: '상점에서 스킬 구매. 팩트체크? 숏셀링? 빌드 전략이 필요해.', characterMood: 'advice' },
      { target: '[data-guide="hud"]', text: '아이템은 일회용. CMA 긴급인출, 풋옵션 헤지 등 위기 대응용.' },
    ],
  },
  {
    id: 'epilogue', title: '실전 트레이딩', color: '#f0b429', page: 'trading',
    steps: [
      { target: '[data-guide="hud"]', text: 'OJT 끝. 뉴스, 감정 배제, 분산 투자. 세 가지만 기억해.', characterMood: 'advice' },
      { target: '[data-guide="hud"]', text: '가이드 버튼으로 언제든 다시 브리핑 가능.' },
      { target: '[data-guide="hud"]', text: '행운을 빌어, 인턴.' },
    ],
  },
]

/* ─── 통합 가이드 컴포넌트 ─── */
interface UnifiedGuideProps {
  onNavigate: (page: PageId) => void
}

export function UnifiedGuide({ onNavigate }: UnifiedGuideProps) {
  const { guideMode, guideStep, advanceGuide, dismissGuide } = useGameStore()

  // manual 모드 상태
  const [chapterIndex, setChapterIndex] = useState(0)
  const [stepIndex, setStepIndex] = useState(0)

  // 공통 상태
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
  const [displayedText, setDisplayedText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const clickListenerRef = useRef<((e: MouseEvent) => void) | null>(null)

  const isAuto = guideMode === 'auto'
  const isManual = guideMode === 'manual'

  // 현재 스텝 결정
  const currentStep: GuideStep | null = isAuto
    ? AUTO_STEPS[guideStep] ?? null
    : isManual
      ? CHAPTERS[chapterIndex]?.steps[stepIndex] ?? null
      : null

  const chapter = isManual ? CHAPTERS[chapterIndex] : null
  const isLastAutoStep = isAuto && guideStep >= AUTO_STEPS.length - 1
  const isLastManualStep = isManual && stepIndex >= (chapter?.steps.length ?? 0) - 1
  const isLastChapter = isManual && chapterIndex >= CHAPTERS.length - 1

  // manual 모드 진행 카운터
  const totalManualSteps = CHAPTERS.reduce((s, c) => s + c.steps.length, 0)
  const currentGlobalStep = isManual
    ? CHAPTERS.slice(0, chapterIndex).reduce((s, c) => s + c.steps.length, 0) + stepIndex + 1
    : guideStep + 1
  const totalSteps = isAuto ? AUTO_STEPS.length : totalManualSteps

  // ─── 캐릭터 포즈 ───
  type Placement = 'below' | 'right' | 'left' | 'above'

  const calcPlacement = useCallback((rect: DOMRect): Placement => {
    const spaceBottom = window.innerHeight - rect.bottom
    const spaceRight = window.innerWidth - rect.right
    const spaceLeft = rect.left - 52
    const spaceTop = rect.top
    if (spaceBottom > 260) return 'below'
    if (spaceRight > 360) return 'right'
    if (spaceLeft > 200) return 'left'
    if (spaceTop > 260) return 'above'
    return 'below'
  }, [])

  const placement: Placement = targetRect ? calcPlacement(targetRect) : 'below'

  const POSE_MAP: Record<Placement, string> = {
    below: '/characters/mentor-hd/animations/point-up/south/frame_002.png',
    right: '/characters/mentor-hd/animations/point-left/south/frame_002.png',
    left: '/characters/mentor-hd/animations/point-right/south/frame_002.png',
    above: '/characters/mentor-hd/animations/point-down/south/frame_002.png',
  }

  const [idleFrame, setIdleFrame] = useState(0)
  useEffect(() => {
    if (!guideMode) return
    const interval = setInterval(() => setIdleFrame(f => (f + 1) % 4), 250)
    return () => clearInterval(interval)
  }, [guideMode])

  const MOOD_IMG: Record<string, string> = {
    celebrate: '/characters/mentor-hd/animations/fireball/south/frame_003.png',
    warning: '/characters/mentor-hd/animations/crouching/south/frame_002.png',
    advice: `/characters/mentor-hd/animations/arms-crossed/south/frame_${String(idleFrame).padStart(3, '0')}.png`,
  }
  const idleImg = `/characters/mentor-hd/animations/arms-crossed/south/frame_${String(idleFrame).padStart(3, '0')}.png`
  const characterImg = currentStep?.characterMood && MOOD_IMG[currentStep.characterMood]
    ? MOOD_IMG[currentStep.characterMood]
    : targetRect
      ? POSE_MAP[placement]
      : idleImg

  // ─── 화살표 ───
  const ARROW_MAP: Record<Placement, { src: string; rotate: number }> = {
    below: { src: '/characters/arrow-down.png', rotate: 180 },
    right: { src: '/characters/arrow-right.png', rotate: 180 },
    left: { src: '/characters/arrow-right.png', rotate: 0 },
    above: { src: '/characters/arrow-down.png', rotate: 0 },
  }

  // ─── 좌표 계산 ───
  const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val))

  const getCharPos = useCallback(() => {
    const vw = window.innerWidth
    const vh = window.innerHeight
    if (!targetRect) return { left: 70, top: clamp(vh - 220, 10, vh - 140) }
    const r = targetRect
    let left: number, top: number
    switch (placement) {
      case 'below': left = r.left; top = r.bottom + 50; break
      case 'right': left = r.right + 16; top = r.top + r.height / 2 - 64; break
      case 'left': left = r.left - 140; top = r.top + r.height / 2 - 64; break
      case 'above': left = r.left; top = r.top - 180; break
    }
    return { left: clamp(left, 56, vw - 140), top: clamp(top, 10, vh - 140) }
  }, [targetRect, placement])

  const getArrowPos = useCallback(() => {
    const vw = window.innerWidth
    const vh = window.innerHeight
    if (!targetRect) return { left: 0, top: 0 }
    const r = targetRect
    let left: number, top: number
    switch (placement) {
      case 'below': left = r.left + r.width / 2 - 20; top = r.bottom + 6; break
      case 'right': left = r.right + 4; top = r.top + r.height / 2 - 20; break
      case 'left': left = r.left - 44; top = r.top + r.height / 2 - 20; break
      case 'above': left = r.left + r.width / 2 - 20; top = r.top - 44; break
    }
    return { left: clamp(left, 10, vw - 44), top: clamp(top, 10, vh - 44) }
  }, [targetRect, placement])

  const getBubblePos = useCallback(() => {
    const vw = window.innerWidth
    const vh = window.innerHeight
    if (!targetRect) return { left: clamp(vw / 2 - 160, 56, vw - 340), top: clamp(vh / 2, 10, vh - 160) }
    const charPos = getCharPos()
    let left: number, top: number
    switch (placement) {
      case 'below': left = charPos.left + 140; top = charPos.top; break
      case 'right': left = charPos.left; top = charPos.top + 136; break
      case 'left': left = charPos.left - 20; top = charPos.top + 136; break
      case 'above': left = charPos.left + 140; top = charPos.top; break
    }
    return { left: clamp(left, 56, vw - 340), top: clamp(top, 10, vh - 160) }
  }, [targetRect, placement, getCharPos])

  // ─── 페이지 네비게이트 ───
  useEffect(() => {
    if (!guideMode || !currentStep) return
    const targetPage = currentStep.page
    if (targetPage) onNavigate(targetPage)
  }, [guideMode, isAuto ? guideStep : `${chapterIndex}-${stepIndex}`])

  // ─── 타겟 추적 ───
  const updateTarget = useCallback(() => {
    if (!currentStep?.target) { setTargetRect(null); setIsVisible(true); return }
    const el = document.querySelector(currentStep.target)
    if (el) { setTargetRect(el.getBoundingClientRect()); setIsVisible(true) }
    else { setTargetRect(null); setIsVisible(false) }
  }, [currentStep])

  useEffect(() => {
    if (!guideMode) return
    setIsVisible(false)
    const t = setTimeout(updateTarget, 400)
    const interval = setInterval(updateTarget, 500)
    return () => { clearTimeout(t); clearInterval(interval) }
  }, [guideMode, guideStep, chapterIndex, stepIndex, updateTarget])

  // ─── 타이핑 효과 ───
  useEffect(() => {
    if (!guideMode || !currentStep) return
    setDisplayedText('')
    setIsTyping(true)
    let i = 0
    const interval = setInterval(() => {
      if (i <= currentStep.text.length) {
        setDisplayedText(currentStep.text.slice(0, i))
        if (i > 0 && currentStep.text[i - 1] !== ' ') SFX.dialogueBlip()
        i++
      } else {
        setIsTyping(false)
        clearInterval(interval)
      }
    }, 22)
    return () => clearInterval(interval)
  }, [guideMode, guideStep, chapterIndex, stepIndex])

  // ─── waitForClick 처리 ───
  useEffect(() => {
    if (!guideMode || !currentStep?.waitForClick || isTyping) return

    const handler = (e: MouseEvent) => {
      if (!currentStep.target) return
      const targetEl = document.querySelector(currentStep.target)
      if (!targetEl) return
      const clicked = e.target as Node
      if (targetEl.contains(clicked) || targetEl === clicked) {
        setTimeout(() => {
          SFX.click()
          doAdvance()
        }, 300)
      }
    }

    document.addEventListener('click', handler, true)
    clickListenerRef.current = handler
    return () => {
      document.removeEventListener('click', handler, true)
      clickListenerRef.current = null
    }
  }, [guideMode, guideStep, chapterIndex, stepIndex, isTyping, currentStep?.waitForClick])

  // ─── 진행 로직 ───
  const doAdvance = useCallback(() => {
    if (isAuto) {
      if (isLastAutoStep) {
        dismissGuide()
      } else {
        advanceGuide()
      }
    } else if (isManual) {
      if (isLastManualStep) {
        if (isLastChapter) {
          dismissGuide()
        } else {
          setChapterIndex(i => i + 1)
          setStepIndex(0)
        }
      } else {
        setStepIndex(i => i + 1)
      }
    }
  }, [isAuto, isManual, isLastAutoStep, isLastManualStep, isLastChapter, advanceGuide, dismissGuide])

  const handleClick = useCallback(() => {
    if (currentStep?.waitForClick && !isTyping) return
    if (isTyping && currentStep) {
      setDisplayedText(currentStep.text)
      setIsTyping(false)
      return
    }
    doAdvance()
  }, [isTyping, currentStep, doAdvance])

  const handleChapterJump = useCallback((idx: number) => {
    setChapterIndex(idx)
    setStepIndex(0)
  }, [])

  if (!guideMode || !currentStep || !isVisible) return null

  const hasTarget = !!targetRect
  const pad = 10

  return (
    <>
      {/* 어두운 마스크 */}
      <svg className="guide-overlay-mask"
        viewBox={`0 0 ${typeof window !== 'undefined' ? window.innerWidth : 1920} ${typeof window !== 'undefined' ? window.innerHeight : 1080}`}
        onClick={currentStep.waitForClick ? undefined : handleClick}
        style={currentStep.waitForClick && !isTyping ? { pointerEvents: 'none' } : undefined}
      >
        <defs>
          <mask id="guide-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {hasTarget && (
              <rect
                x={targetRect!.left - pad} y={targetRect!.top - pad}
                width={targetRect!.width + pad * 2} height={targetRect!.height + pad * 2}
                rx={12} fill="black"
              />
            )}
          </mask>
        </defs>
        <rect x="0" y="0" width="100%" height="100%" fill="rgba(0,0,0,0.75)" mask="url(#guide-mask)" />
      </svg>

      {/* 화살표 */}
      {hasTarget && (() => {
        const arrowPos = getArrowPos()
        const arrowInfo = ARROW_MAP[placement]
        const bounceAxis = (placement === 'left' || placement === 'right') ? 'x' : 'y'
        const bounceVal = (placement === 'left' || placement === 'above') ? -8 : 8
        return (
          <motion.img
            src={arrowInfo.src}
            alt=""
            className="guide-pixel-arrow"
            animate={bounceAxis === 'x' ? { x: [0, bounceVal, 0] } : { y: [0, bounceVal, 0] }}
            transition={{ duration: 0.7, repeat: Infinity }}
            style={{
              left: arrowPos.left,
              top: arrowPos.top,
              transform: arrowInfo.rotate ? `rotate(${arrowInfo.rotate}deg)` : undefined,
            }}
          />
        )
      })()}

      {/* 캐릭터 */}
      {(() => {
        const pos = getCharPos()
        return (
          <motion.div
            className="guide-character"
            animate={{ left: pos.left, top: pos.top }}
            transition={{ type: 'spring', stiffness: 100, damping: 16 }}
          >
            <motion.img
              src={characterImg}
              alt=""
              className="guide-character-img"
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          </motion.div>
        )
      })()}

      {/* ─── 하단 고정 대사창 (HTS 터미널 스타일) ─── */}
      <div className="guide-dialogue-anchor" onClick={handleClick}>
        <div className="guide-dialogue-frame">
          {/* 상단 바: 화자 + 챕터 */}
          <div className="guide-dialogue-header">
            <div className="guide-dialogue-header-left">
              <span className="guide-dialogue-indicator" />
              <span className="guide-dialogue-name">리서치센터 차장</span>
              {chapter && (
                <span className="guide-dialogue-tag" style={{ borderColor: chapter.color, color: chapter.color }}>{chapter.title}</span>
              )}
              {isAuto && (
                <span className="guide-dialogue-tag" style={{ borderColor: '#f0b429', color: '#f0b429' }}>OJT 가이드</span>
              )}
            </div>
            <div className="guide-dialogue-header-right">
              <span className="guide-dialogue-progress">{currentGlobalStep}/{totalSteps}</span>
              <button className="guide-dialogue-skip" onClick={(e) => { e.stopPropagation(); dismissGuide() }}>
                {isAuto ? '건너뛰기' : '닫기'} ✕
              </button>
            </div>
          </div>

          {/* 대사 본문 */}
          <div className="guide-dialogue-body">
            <div className="guide-dialogue-text">
              {displayedText}
              {isTyping && (
                <motion.span animate={{ opacity: [1, 0] }} transition={{ duration: 0.4, repeat: Infinity }} style={{ color: '#f0b429' }}>█</motion.span>
              )}
            </div>

            {/* 하단 힌트 */}
            <div className="guide-dialogue-hint">
              {currentStep.waitForClick && !isTyping
                ? <span className="guide-dialogue-wait">↑ 하이라이트된 영역을 직접 클릭하세요</span>
                : !isTyping && <span className="guide-dialogue-next">클릭하여 계속 ▸</span>
              }
            </div>
          </div>

          {/* 챕터 도트 (manual 모드) */}
          {isManual && (
            <div className="guide-dialogue-chapters">
              {CHAPTERS.map((ch, i) => (
                <button key={ch.id}
                  className={`guide-chapter-dot ${chapterIndex === i ? 'guide-chapter-dot--active' : ''} ${i < chapterIndex ? 'guide-chapter-dot--done' : ''}`}
                  style={{ '--dot-color': ch.color } as React.CSSProperties}
                  onClick={(e) => { e.stopPropagation(); handleChapterJump(i) }}
                  title={ch.title}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
