import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useGameStore } from '../../stores/gameStore'
import { SFX } from '../../utils/sound'

/* ─── 튜토리얼 스텝 정의 ─── */
export interface TutorialStep {
  /** 하이라이트할 요소의 CSS 선택자 (null이면 화면 중앙 모달) */
  target: string | null
  /** 제목 */
  title: string
  /** 설명 */
  text: string
  /** 툴팁 위치 */
  position?: 'top' | 'bottom' | 'left' | 'right'
  /** 게임 phase 조건 — 이 phase일 때만 표시 */
  phase?: 'news' | 'investment' | 'result'
  /** true면 유저가 target 요소를 직접 클릭해야 다음으로 넘어감 */
  waitForClick?: boolean
  /** 다음 스텝으로 넘어가기 전 딜레이(ms) */
  delay?: number
}

const TUTORIAL_STEPS: TutorialStep[] = [
  // ── 뉴스 페이즈 ──
  {
    target: null,
    title: '자, 첫 업무다',
    text: '매주 뉴스를 읽고, 분석하고, 투자 판단을 내리는 게 네 할 일이야. 게임은 "뉴스 → 투자 → 결과" 3단계로 돌아가. 하나씩 짚어줄게.',
  },
  {
    target: '[data-tutorial="news-panel"]',
    title: '뉴스 패널',
    text: '매주 새 뉴스가 도착해. 핵심은 "출처"야. 공영방송·경제지는 신뢰도가 높고, SNS·익명 블로그는 가짜일 수 있어. 출처 아이콘을 주의 깊게 봐.',
    position: 'right',
    phase: 'news',
  },
  {
    target: '[data-tutorial="news-item"]',
    title: '기사를 눌러봐',
    text: '기사를 누르면 상세 내용이 펼쳐져. 어떤 섹터에 영향을 주는지, 진짜 뉴스인지 판단하는 연습을 하는 거야.',
    position: 'right',
    phase: 'news',
    waitForClick: true,
  },
  {
    target: '[data-tutorial="mini-stock-strip"]',
    title: '실시간 시세 바',
    text: '종목별 현재가와 등락률이 여기 표시돼. 뉴스를 읽으면서 "어떤 종목이 영향받을까?" 시세를 같이 확인하는 습관을 들여.',
    position: 'top',
    phase: 'news',
  },
  {
    target: '[data-tutorial="phase-cta"]',
    title: '투자 단계로 넘어가기',
    text: '뉴스 분석이 끝나면 이 버튼을 눌러서 투자 단계로 넘어가. 준비됐으면 눌러봐!',
    position: 'top',
    phase: 'news',
    waitForClick: true,
  },
  // ── 투자 페이즈 ──
  {
    target: '[data-tutorial="stock-sidebar"]',
    title: '종목 리스트',
    text: '투자할 종목을 여기서 골라. 기술·에너지·금융·소비재·헬스케어 5개 섹터가 있고, ETF도 있어. 분산투자가 리스크 관리의 기본이야.',
    position: 'left',
    phase: 'investment',
  },
  {
    target: '[data-tutorial="chart-panel"]',
    title: '가격 차트',
    text: '선택한 종목의 주가 흐름이야. 상승 추세인지, 하락 추세인지 읽어봐. 나중에 "기술적 분석" 스킬을 배우면 이동평균선도 볼 수 있어.',
    position: 'bottom',
    phase: 'investment',
  },
  {
    target: '[data-tutorial="trade-panel"]',
    title: '매수/매도',
    text: '여기서 주식을 사고팔아. 턴당 거래 횟수가 제한되니까 신중하게! 25%, 50%, 전량 버튼으로 빠르게 수량을 정할 수 있어.',
    position: 'top',
    phase: 'investment',
  },
  {
    target: '[data-tutorial="asset-bar"]',
    title: '자산 현황',
    text: '현금, 수익률, 평판 포인트(RP)가 표시돼. RP는 스킬과 아이템을 구매하는 데 쓰여. 매 턴 뉴스를 정확히 분석할수록 RP가 올라가.',
    position: 'bottom',
    phase: 'investment',
  },
  {
    target: '[data-tutorial="phase-cta"]',
    title: '한 주 마감',
    text: '투자를 마쳤으면 이 버튼으로 주간을 마감해. 시장이 움직이고, 네 투자 결과가 나올 거야. 눌러봐!',
    position: 'top',
    phase: 'investment',
    waitForClick: true,
  },
]

/* ─── 스포트라이트 오버레이 ─── */
export function SpotlightTutorial() {
  const { showTutorial, tutorialStep, advanceTutorial, dismissTutorial, phase } = useGameStore()
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [displayedText, setDisplayedText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const observerRef = useRef<MutationObserver | null>(null)

  const step = TUTORIAL_STEPS[tutorialStep]

  // 타이핑 효과 + 비프음
  useEffect(() => {
    if (!step || !isVisible) return
    setDisplayedText('')
    setIsTyping(true)
    let i = 0
    const text = step.text
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
  }, [tutorialStep, isVisible, step])

  // 타겟 요소의 위치를 추적
  const updateTargetRect = useCallback(() => {
    if (!step?.target) {
      setTargetRect(null)
      setIsVisible(true)
      return
    }
    const el = document.querySelector(step.target)
    if (el) {
      setTargetRect(el.getBoundingClientRect())
      setIsVisible(true)
    } else {
      setIsVisible(false)
    }
  }, [step])

  // phase 변경 시 약간의 딜레이 후 타겟 탐색
  useEffect(() => {
    if (!showTutorial || !step) return
    setIsVisible(false)
    const t = setTimeout(updateTargetRect, step.delay ?? 400)
    return () => clearTimeout(t)
  }, [showTutorial, tutorialStep, phase, updateTargetRect, step])

  // DOM 변경 감지 + 리사이즈 추적
  useEffect(() => {
    if (!showTutorial || !step?.target) return

    const interval = setInterval(updateTargetRect, 500)
    window.addEventListener('resize', updateTargetRect)

    return () => {
      clearInterval(interval)
      window.removeEventListener('resize', updateTargetRect)
    }
  }, [showTutorial, step, updateTargetRect])

  // waitForClick: 타겟 요소 클릭 감지 (좌표 기반 — 오버레이 위에서도 동작)
  useEffect(() => {
    if (!showTutorial || !step?.waitForClick || !step.target) return

    const handleClick = (e: MouseEvent) => {
      const el = document.querySelector(step.target!)
      if (!el) return
      const rect = el.getBoundingClientRect()
      const inBounds =
        e.clientX >= rect.left && e.clientX <= rect.right &&
        e.clientY >= rect.top && e.clientY <= rect.bottom
      if (inBounds) {
        // 실제 요소에도 클릭 전달
        el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
        setTimeout(() => {
          SFX.click()
          advanceTutorial()
        }, 200)
      }
    }

    // capture phase로 이벤트 잡기
    document.addEventListener('click', handleClick, true)
    return () => document.removeEventListener('click', handleClick, true)
  }, [showTutorial, tutorialStep, step, advanceTutorial])

  if (!showTutorial || !step || !isVisible) return null

  // phase 조건 체크
  if (step.phase && step.phase !== phase) return null

  const padding = 10
  const hasTarget = !!targetRect

  // 툴팁 위치 계산 — 뷰포트 안에 완전히 수납
  const tooltipWidth = 300
  const tooltipHeight = 180
  const getTooltipStyle = (): React.CSSProperties => {
    if (!targetRect) {
      return {
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
      }
    }

    const gap = 14
    const safeMargin = 10
    const vw = window.innerWidth
    const vh = window.innerHeight

    // 타겟의 "보이는 영역" 중심 (타겟이 뷰포트보다 클 경우 대비)
    const visibleTop = Math.max(targetRect.top, 0)
    const visibleBottom = Math.min(targetRect.bottom, vh)
    const visibleLeft = Math.max(targetRect.left, 0)
    const visibleRight = Math.min(targetRect.right, vw)
    const centerX = (visibleLeft + visibleRight) / 2
    const centerY = (visibleTop + visibleBottom) / 2

    // 각 방향에 얼마나 공간이 있는지 계산
    const spaceTop = visibleTop
    const spaceBottom = vh - visibleBottom
    const spaceLeft = visibleLeft
    const spaceRight = vw - visibleRight

    // 원하는 위치에서 시작, 공간 부족 시 순환 fallback
    const preferred = step.position || 'bottom'
    const order: typeof preferred[] =
      preferred === 'top' ? ['top', 'bottom', 'right', 'left'] :
      preferred === 'bottom' ? ['bottom', 'top', 'right', 'left'] :
      preferred === 'left' ? ['left', 'right', 'bottom', 'top'] :
      ['right', 'left', 'bottom', 'top']

    let pos = preferred
    for (const candidate of order) {
      if (candidate === 'top' && spaceTop >= tooltipHeight + gap) { pos = 'top'; break }
      if (candidate === 'bottom' && spaceBottom >= tooltipHeight + gap) { pos = 'bottom'; break }
      if (candidate === 'left' && spaceLeft >= tooltipWidth + gap) { pos = 'left'; break }
      if (candidate === 'right' && spaceRight >= tooltipWidth + gap) { pos = 'right'; break }
    }

    // 수평 clamping 헬퍼
    const clampX = (x: number) =>
      Math.min(Math.max(x, safeMargin), vw - tooltipWidth - safeMargin)
    // 수직 clamping 헬퍼
    const clampY = (y: number) =>
      Math.min(Math.max(y, safeMargin), vh - tooltipHeight - safeMargin)

    switch (pos) {
      case 'top':
        return {
          bottom: `${vh - visibleTop + gap}px`,
          left: `${clampX(centerX - tooltipWidth / 2)}px`,
        }
      case 'bottom':
        return {
          top: `${Math.min(visibleBottom + gap, vh - tooltipHeight - safeMargin)}px`,
          left: `${clampX(centerX - tooltipWidth / 2)}px`,
        }
      case 'left':
        return {
          top: `${clampY(centerY - tooltipHeight / 2)}px`,
          right: `${vw - visibleLeft + gap}px`,
        }
      case 'right':
        return {
          top: `${clampY(centerY - tooltipHeight / 2)}px`,
          left: `${Math.min(visibleRight + gap, vw - tooltipWidth - safeMargin)}px`,
        }
    }
  }

  return (
    <div className="fixed inset-0 z-[100]">
      {/* 어두운 오버레이 + 스포트라이트 구멍 */}
      <svg className="absolute inset-0 w-full h-full">
        <defs>
          <mask id="spotlight-mask">
            <rect width="100%" height="100%" fill="white" />
            {hasTarget && (
              <rect
                x={targetRect!.left - padding}
                y={targetRect!.top - padding}
                width={targetRect!.width + padding * 2}
                height={targetRect!.height + padding * 2}
                rx={12}
                fill="black"
              />
            )}
          </mask>
          {/* 하이라이트 글로우 필터 */}
          <filter id="spotlight-glow">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <rect
          width="100%" height="100%"
          fill="rgba(0,0,0,0.78)"
          mask="url(#spotlight-mask)"
        />
      </svg>

      {/* 하이라이트 외곽 글로우 + 펄스 애니메이션 */}
      {hasTarget && (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="absolute pointer-events-none"
          style={{
            left: targetRect!.left - padding,
            top: targetRect!.top - padding,
            width: targetRect!.width + padding * 2,
            height: targetRect!.height + padding * 2,
          }}
        >
          {/* 외곽 글로우 */}
          <div
            className="absolute inset-0 rounded-xl"
            style={{
              border: '2px solid rgba(240, 180, 41, 0.7)',
              boxShadow: '0 0 24px 4px rgba(240, 180, 41, 0.25), inset 0 0 12px rgba(240, 180, 41, 0.08)',
            }}
          />
          {/* 펄스 링 */}
          <motion.div
            className="absolute inset-0 rounded-xl"
            animate={{ opacity: [0.5, 0, 0.5], scale: [1, 1.04, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              border: '1px solid rgba(240, 180, 41, 0.4)',
            }}
          />
        </motion.div>
      )}

      {/* 타겟 요소 클릭 통과 영역 */}
      {hasTarget && step.waitForClick && (
        <div
          className="absolute"
          style={{
            left: targetRect!.left - padding,
            top: targetRect!.top - padding,
            width: targetRect!.width + padding * 2,
            height: targetRect!.height + padding * 2,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* 화살표 연결선 (타겟 → 툴팁) */}
      {hasTarget && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ delay: 0.3, duration: 0.3 }}
          className="absolute pointer-events-none"
          style={{
            left: targetRect!.left + targetRect!.width / 2 - 1,
            top: step.position === 'top'
              ? targetRect!.top - padding - 8
              : step.position === 'bottom' || !step.position
                ? targetRect!.bottom + padding
                : targetRect!.top + targetRect!.height / 2 - 1,
            width: (step.position === 'left' || step.position === 'right') ? 8 : 2,
            height: (step.position === 'left' || step.position === 'right') ? 2 : 8,
            background: 'linear-gradient(to bottom, rgba(240,180,41,0.6), transparent)',
          }}
        />
      )}

      {/* 툴팁 */}
      <motion.div
        key={tutorialStep}
        initial={{ opacity: 0, y: 8, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.96 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="absolute z-10"
        style={{ ...getTooltipStyle(), width: tooltipWidth }}
      >
        <div
          className="rounded-xl px-5 py-4"
          style={{
            background: 'linear-gradient(145deg, rgba(26,26,46,0.97), rgba(20,20,38,0.97))',
            border: '1px solid rgba(240, 180, 41, 0.3)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.6), 0 0 20px rgba(240,180,41,0.08)',
            backdropFilter: 'blur(8px)',
          }}
        >
          {/* 화자 */}
          <span className="text-[#c4a0ff] text-[10px] font-bold mb-1 block tracking-wider">???</span>

          <h3 className="text-white text-[15px] font-bold mb-2 leading-snug">{step.title}</h3>
          <p className="text-[#b8b8d0] text-[13px] leading-[1.7] mb-4">
            {displayedText}
            {isTyping && <span className="inline-block w-[2px] h-3.5 bg-[#f0b429] ml-0.5 animate-pulse align-middle" />}
          </p>

          <AnimatePresence>
            {!isTyping && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="flex gap-2"
              >
                <button
                  onClick={() => { SFX.click(); dismissTutorial() }}
                  className="flex-1 text-[11px] text-[#666680] py-2 px-3 rounded-lg hover:bg-white/5 hover:text-[#888] transition-colors"
                >
                  건너뛰기
                </button>
                {!step.waitForClick && (
                  <button
                    onClick={() => {
                      SFX.click()
                      if (tutorialStep >= TUTORIAL_STEPS.length - 1) {
                        dismissTutorial()
                      } else {
                        advanceTutorial()
                      }
                    }}
                    className="flex-1 text-[11px] text-[#0a0a14] font-bold py-2 px-3 rounded-lg transition-all"
                    style={{
                      background: 'linear-gradient(135deg, #f0b429, #e09a18)',
                      boxShadow: '0 2px 8px rgba(240,180,41,0.3)',
                    }}
                  >
                    {tutorialStep >= TUTORIAL_STEPS.length - 1 ? '시작하자!' : '다음'}
                  </button>
                )}
                {step.waitForClick && (
                  <motion.span
                    animate={{ opacity: [0.6, 1, 0.6] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="flex-1 text-[11px] text-[#f0b429] py-2 px-3 text-center font-bold"
                  >
                    직접 눌러보세요
                  </motion.span>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}

export { TUTORIAL_STEPS }
