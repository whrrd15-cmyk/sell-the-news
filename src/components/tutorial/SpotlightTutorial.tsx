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
    text: '매주 뉴스를 읽고, 분석하고, 투자 판단을 내리는 게 네 할 일이야. 하나씩 짚어줄 테니까 따라와.',
  },
  {
    target: '[data-tutorial="news-panel"]',
    title: '뉴스 확인',
    text: '여기에 이번 주 뉴스가 와 있어. 출처를 잘 봐 — 공영방송이랑 익명 블로그는 신뢰도가 다르니까.',
    position: 'right',
    phase: 'news',
  },
  {
    target: '[data-tutorial="news-item"]',
    title: '직접 읽어봐',
    text: '아무 기사나 하나 눌러봐. 내용을 파악하는 게 투자의 첫걸음이야.',
    position: 'right',
    phase: 'news',
    waitForClick: true,
  },
  {
    target: '[data-tutorial="mini-stock-strip"]',
    title: '시세 한눈에',
    text: '여기서 종목별 현재가와 등락률을 바로 확인할 수 있어. 습관적으로 체크해.',
    position: 'top',
    phase: 'news',
  },
  {
    target: '[data-tutorial="phase-cta"]',
    title: '분석 끝, 투자 시작',
    text: '뉴스 다 읽었으면 이 버튼 눌러. 투자 판단을 내릴 시간이야.',
    position: 'top',
    phase: 'news',
    waitForClick: true,
  },
  // ── 투자 페이즈 ──
  {
    target: '[data-tutorial="stock-sidebar"]',
    title: '종목 고르기',
    text: '투자할 종목을 여기서 골라. 섹터별로 필터링도 되니까 활용해봐.',
    position: 'left',
    phase: 'investment',
  },
  {
    target: '[data-tutorial="chart-panel"]',
    title: '차트를 읽어',
    text: '선택한 종목의 가격 흐름이야. 추세를 읽는 눈을 키우는 게 핵심이야.',
    position: 'bottom',
    phase: 'investment',
  },
  {
    target: '[data-tutorial="trade-panel"]',
    title: '매수/매도 실행',
    text: '여기서 주식을 사고팔아. 수량 정하고, 확신이 서면 바로 실행해.',
    position: 'top',
    phase: 'investment',
  },
  {
    target: '[data-tutorial="asset-bar"]',
    title: '네 자산 상태',
    text: '현금, 수익률, 평판 포인트. 네 성적표라고 생각해. 수시로 확인해.',
    position: 'bottom',
    phase: 'investment',
  },
  {
    target: '[data-tutorial="phase-cta"]',
    title: '한 주 마감',
    text: '투자 끝났으면 이 버튼으로 마감해. 시장 결과가 나올 거야. 긴장해봐.',
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

  // waitForClick: 타겟 요소 클릭 감지
  useEffect(() => {
    if (!showTutorial || !step?.waitForClick || !step.target) return

    const handleClick = (e: MouseEvent) => {
      const target = document.querySelector(step.target!)
      if (target && (target.contains(e.target as Node) || target === e.target)) {
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

  const padding = 8
  const hasTarget = !!targetRect

  // 툴팁 위치 계산 (화면 밖으로 나가면 fallback)
  const tooltipWidth = 280 // max-w-xs ≈ 280px
  const getTooltipStyle = (): React.CSSProperties => {
    if (!targetRect) {
      return {
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
      }
    }

    let pos = step.position || 'bottom'
    const gap = 16
    const vw = window.innerWidth
    const vh = window.innerHeight

    // overflow 검사 → fallback to bottom
    if (pos === 'right' && targetRect.right + gap + tooltipWidth > vw) pos = 'bottom'
    if (pos === 'left' && targetRect.left - gap - tooltipWidth < 0) pos = 'bottom'

    switch (pos) {
      case 'top':
        return {
          bottom: `${vh - targetRect.top + gap}px`,
          left: `${Math.min(Math.max(targetRect.left + targetRect.width / 2, tooltipWidth / 2 + 8), vw - tooltipWidth / 2 - 8)}px`,
          transform: 'translateX(-50%)',
        }
      case 'bottom':
        return {
          top: `${targetRect.bottom + gap}px`,
          left: `${Math.min(Math.max(targetRect.left + targetRect.width / 2, tooltipWidth / 2 + 8), vw - tooltipWidth / 2 - 8)}px`,
          transform: 'translateX(-50%)',
        }
      case 'left':
        return {
          top: `${targetRect.top + targetRect.height / 2}px`,
          right: `${vw - targetRect.left + gap}px`,
          transform: 'translateY(-50%)',
        }
      case 'right':
        return {
          top: `${targetRect.top + targetRect.height / 2}px`,
          left: `${targetRect.right + gap}px`,
          transform: 'translateY(-50%)',
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
        </defs>
        <rect
          width="100%" height="100%"
          fill="rgba(0,0,0,0.75)"
          mask="url(#spotlight-mask)"
        />
      </svg>

      {/* 하이라이트 테두리 */}
      {hasTarget && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute pointer-events-none rounded-xl"
          style={{
            left: targetRect!.left - padding,
            top: targetRect!.top - padding,
            width: targetRect!.width + padding * 2,
            height: targetRect!.height + padding * 2,
            border: '2px solid rgba(240, 180, 41, 0.6)',
            boxShadow: '0 0 20px rgba(240, 180, 41, 0.2)',
          }}
        />
      )}

      {/* 타겟 요소는 클릭 가능하게 */}
      {hasTarget && (
        <div
          className="absolute"
          style={{
            left: targetRect!.left - padding,
            top: targetRect!.top - padding,
            width: targetRect!.width + padding * 2,
            height: targetRect!.height + padding * 2,
            pointerEvents: step.waitForClick ? 'none' : 'none',
          }}
        />
      )}

      {/* 툴팁 */}
      <motion.div
        key={tutorialStep}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="absolute z-10 max-w-xs"
        style={getTooltipStyle()}
      >
        <div
          className="bg-[#1a1a2e] border border-[#f0b42944] rounded-xl px-5 py-4"
          style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}
        >
          {/* 화자 */}
          <span className="text-[#c4a0ff] text-[10px] font-bold mb-2 block">???</span>

          <h3 className="text-white text-sm font-bold mb-2">{step.title}</h3>
          <p className="text-bal-text text-xs leading-relaxed mb-4">
            {displayedText}
            {isTyping && <span className="inline-block w-[2px] h-3 bg-[#f0b429] ml-0.5 animate-pulse align-middle" />}
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
                  className="flex-1 text-[10px] text-bal-text-dim py-1.5 px-3 rounded-lg hover:bg-white/5 transition-colors"
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
                    className="flex-1 text-[10px] text-[#0a0a14] font-bold py-1.5 px-3 rounded-lg bg-[#f0b429] hover:bg-[#d9a325] transition-colors"
                  >
                    {tutorialStep >= TUTORIAL_STEPS.length - 1 ? '완료' : '다음'}
                  </button>
                )}
                {step.waitForClick && (
                  <span className="flex-1 text-[10px] text-[#f0b429] py-1.5 px-3 text-center animate-pulse">
                    직접 눌러보세요
                  </span>
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
