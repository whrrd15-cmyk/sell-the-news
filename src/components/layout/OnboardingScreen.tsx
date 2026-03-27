import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useGameStore } from '../../stores/gameStore'
import { BalatroBackground } from '../effects/BalatroBackground'
import { SFX } from '../../utils/sound'
import { STOCKS } from '../../data/stocks'
import { MiniSparkline } from '../stocks/MiniSparkline'

/* ─── 대화 시나리오 타입 ─── */
interface DialogueLine {
  speaker: string
  text: string
  choices?: { label: string; next: string }[]
}

type DialogueScript = Record<string, DialogueLine[]>

/* ─── 대화 스크립트 ─── */
const SCRIPT: DialogueScript = {
  intro: [
    { speaker: '???', text: '...이봐, 들리나?' },
    { speaker: '???', text: '좋아, 연결됐군. 나는 네 담당 선배... 라고만 해두지.' },
    { speaker: '???', text: '축하해, 오늘부터 너는 증권사 인턴이야.' },
    { speaker: '???', text: '8분기 동안 투자 실적을 증명하면 정규직 전환이 가능해.' },
    { speaker: '???', text: '매 분기마다 목표 수익률이 있어. 달성하면 다음 분기로 진출하는 거야.' },
    { speaker: '???', text: '1분기는 수습이니까 목표가 낮지만... 뒤로 갈수록 장난 아냐.' },
    {
      speaker: '???',
      text: '혹시... 주식 투자 해본 적 있어?',
      choices: [
        { label: '처음이야, 아무것도 몰라', next: 'stockBasics' },
        { label: '기본은 알고 있어', next: 'skipBasics' },
      ],
    },
  ],
  stockBasics: [
    { speaker: '???', text: '신입이구나. 괜찮아, 간단하게 핵심만 알려줄게.' },
  ],
  afterPresentation: [
    { speaker: '???', text: '어때, 대충 감이 잡혔어?' },
    { speaker: '???', text: '좋아, 이제 실전 업무를 알려줄게.' },
  ],
  skipBasics: [
    { speaker: '???', text: '오, 경험자? 좋아, 기초 설명은 넘어가지.' },
  ],
  gameFlow: [
    { speaker: '???', text: '매주 이렇게 업무가 돌아가:' },
    { speaker: '???', text: '1. 뉴스가 도착해. 출처를 잘 봐 — 공영방송이랑 익명 블로그는 신뢰도가 다르니까.' },
    { speaker: '???', text: '2. 뉴스를 분석한 뒤, 종목을 골라서 매수/매도를 결정해.' },
    { speaker: '???', text: '3. 한 주가 지나면 시장 결과를 확인하고, 다음 주로 넘어가.' },
    { speaker: '???', text: '13주마다 상점이 열려. 스킬이나 아이템을 구매해서 분석력을 올릴 수 있어.' },
    { speaker: '???', text: '참고로... 시장엔 가짜 뉴스도 돌아다녀. 펌프앤덤프, FUD 같은 함정에 빠지지 마.' },
  ],
  ready: [
    { speaker: '???', text: '좋아, 시작 전에 전 분기 시장 데이터를 불러올게. 잠깐만...' },
  ],
  final: [
    { speaker: '???', text: '데이터 로딩 완료.' },
    { speaker: '???', text: '1분기 수습 시장이야. 목표 수익률 5% — 가볍게 시작하자.' },
    { speaker: '???', text: '8분기까지 살아남으면 정규직이야. 행운을 빌어, 인턴.' },
  ],
}

/* ─── 신입 인턴 교육 슬라이드 ─── */
const PRESENTATION_SLIDES = [
  {
    title: '주식이란?',
    content: '주식은 회사의 소유권 조각이야.\n회사가 성장하면 주식 가치도 올라가고,\n어려워지면 내려가지.',
    icon: '📈',
  },
  {
    title: '매수와 매도',
    content: '싸게 사서 비싸게 팔면 이익!\n"매수" = 주식을 사는 것\n"매도" = 주식을 파는 것',
    icon: '💰',
  },
  {
    title: '뉴스 리터러시',
    content: '모든 뉴스가 진짜는 아니야.\n출처의 신뢰도를 꼭 확인하고,\n가짜 뉴스에 속지 않는 게 핵심이야.',
    icon: '📰',
  },
  {
    title: '분산 투자',
    content: '한 종목에 몰빵하면 위험해.\n여러 섹터에 나눠서 투자하면\n리스크를 줄일 수 있어.',
    icon: '🎯',
  },
  {
    title: '인턴 생존 가이드',
    content: '매 분기 목표 수익률을 달성해야 해.\n8분기를 모두 통과하면 정규직 전환!\n후반부엔 변동성과 가짜 뉴스가 급증하니 주의.',
    icon: '🏢',
  },
]

/* ─── 온보딩 화면 ─── */
export function OnboardingScreen() {
  const { setScreen, market } = useGameStore()

  // 대화 상태
  const [scriptKey, setScriptKey] = useState('intro')
  const [lineIndex, setLineIndex] = useState(0)
  const [displayedText, setDisplayedText] = useState('')
  const [isTyping, setIsTyping] = useState(true)

  // 프레젠테이션
  const [showPresentation, setShowPresentation] = useState(false)
  const [slideIndex, setSlideIndex] = useState(0)

  // 전분기 로딩 애니메이션
  const [showHistoryAnim, setShowHistoryAnim] = useState(false)
  const [historyProgress, setHistoryProgress] = useState(0)

  // 전체 흐름 단계
  const [flowPhase, setFlowPhase] = useState<
    'dialogue' | 'presentation' | 'historyAnim' | 'done'
  >('dialogue')

  const currentLines = SCRIPT[scriptKey] || []
  const currentLine = currentLines[lineIndex]

  // 타이핑 효과
  useEffect(() => {
    if (!currentLine || flowPhase !== 'dialogue') return
    setDisplayedText('')
    setIsTyping(true)
    let i = 0
    const text = currentLine.text
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
  }, [scriptKey, lineIndex, flowPhase, currentLine])

  // 전분기 히스토리 로딩 애니메이션
  useEffect(() => {
    if (!showHistoryAnim) return
    let progress = 0
    const interval = setInterval(() => {
      progress += 1
      setHistoryProgress(progress)
      if (progress >= 13) {
        clearInterval(interval)
        // 로딩 완료 → final 대화로
        setTimeout(() => {
          setShowHistoryAnim(false)
          setFlowPhase('dialogue')
          setScriptKey('final')
          setLineIndex(0)
        }, 600)
      }
    }, 150)
    return () => clearInterval(interval)
  }, [showHistoryAnim])

  // 다음 대사 / 선택 처리
  const advanceDialogue = useCallback(() => {
    if (!currentLine) return

    // 아직 타이핑 중이면 한번에 표시
    if (isTyping) {
      setDisplayedText(currentLine.text)
      setIsTyping(false)
      return
    }

    // 선택지가 있으면 클릭 처리 안함 (선택지에서 처리)
    if (currentLine.choices) return

    SFX.click()
    const nextIndex = lineIndex + 1

    if (nextIndex < currentLines.length) {
      setLineIndex(nextIndex)
    } else {
      // 현재 스크립트 끝 → 다음 단계
      handleScriptEnd(scriptKey)
    }
  }, [currentLine, isTyping, lineIndex, currentLines, scriptKey])

  const handleChoice = useCallback((next: string) => {
    SFX.click()
    if (next === 'stockBasics') {
      // 주식 기초 → 프레젠테이션 진입
      setScriptKey('stockBasics')
      setLineIndex(0)
    } else {
      setScriptKey(next)
      setLineIndex(0)
    }
  }, [])

  const handleScriptEnd = useCallback((key: string) => {
    switch (key) {
      case 'stockBasics':
        // 프레젠테이션 시작
        setFlowPhase('presentation')
        setShowPresentation(true)
        setSlideIndex(0)
        break
      case 'afterPresentation':
      case 'skipBasics':
        // 게임 플로우 설명
        setScriptKey('gameFlow')
        setLineIndex(0)
        break
      case 'gameFlow':
        // 전분기 로딩 안내
        setScriptKey('ready')
        setLineIndex(0)
        break
      case 'ready':
        // 전분기 로딩 애니메이션
        setFlowPhase('historyAnim')
        setShowHistoryAnim(true)
        break
      case 'final':
        // 게임 시작!
        setFlowPhase('done')
        setTimeout(() => setScreen('game'), 400)
        break
      default:
        setScriptKey('gameFlow')
        setLineIndex(0)
    }
  }, [setScreen])

  // 프레젠테이션 다음/완료
  const nextSlide = useCallback(() => {
    SFX.click()
    if (slideIndex < PRESENTATION_SLIDES.length - 1) {
      setSlideIndex(slideIndex + 1)
    } else {
      // 프레젠테이션 종료 → 대화 복귀
      setShowPresentation(false)
      setFlowPhase('dialogue')
      setScriptKey('afterPresentation')
      setLineIndex(0)
    }
  }, [slideIndex])

  // 스킵 전체
  const skipAll = useCallback(() => {
    SFX.click()
    setScreen('game')
  }, [setScreen])

  // 전분기 차트 데이터 (애니메이션용)
  const previewStocks = useMemo(() => {
    const sample = STOCKS.filter(s => !s.isETF).slice(0, 6)
    return sample.map(stock => {
      const hist = market.priceHistories.find(h => h.stockId === stock.id)
      return { stock, prices: hist?.prices ?? [] }
    })
  }, [market])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
      <BalatroBackground />

      {/* 스킵 버튼 */}
      <motion.button
        className="onboarding-skip-btn"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        onClick={skipAll}
      >
        건너뛰기 &raquo;
      </motion.button>

      <AnimatePresence mode="wait">
        {/* ─── 대화 모드 ─── */}
        {flowPhase === 'dialogue' && currentLine && (
          <motion.div
            key={`dialogue-${scriptKey}-${lineIndex}`}
            className="onboarding-dialogue-box"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            onClick={advanceDialogue}
          >
            {/* 스피커 이름 */}
            <div className="onboarding-speaker">
              <span className="onboarding-speaker-name">{currentLine.speaker}</span>
              <span className="onboarding-speaker-line" />
            </div>

            {/* 대사 텍스트 */}
            <div className="onboarding-text">
              {displayedText}
              {isTyping && (
                <motion.span
                  className="onboarding-cursor"
                  animate={{ opacity: [1, 0] }}
                  transition={{ duration: 0.4, repeat: Infinity, repeatType: 'reverse' }}
                >_</motion.span>
              )}
            </div>

            {/* 선택지 */}
            {!isTyping && currentLine.choices && (
              <motion.div
                className="onboarding-choices"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                {currentLine.choices.map((c, i) => (
                  <button
                    key={i}
                    className="onboarding-choice-btn"
                    onClick={(e) => { e.stopPropagation(); handleChoice(c.next) }}
                  >
                    {c.label}
                  </button>
                ))}
              </motion.div>
            )}

            {/* 다음 힌트 */}
            {!isTyping && !currentLine.choices && (
              <motion.div
                className="onboarding-next-hint"
                animate={{ opacity: [0.3, 0.8, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                클릭하여 계속 ▼
              </motion.div>
            )}
          </motion.div>
        )}

        {/* ─── 프레젠테이션 모드 ─── */}
        {flowPhase === 'presentation' && showPresentation && (
          <motion.div
            key={`slide-${slideIndex}`}
            className="onboarding-presentation"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
          >
            {/* 슬라이드 진행 바 */}
            <div className="onboarding-slide-progress">
              {PRESENTATION_SLIDES.map((_, i) => (
                <div
                  key={i}
                  className={`onboarding-slide-dot ${i === slideIndex ? 'onboarding-slide-dot--active' : ''} ${i < slideIndex ? 'onboarding-slide-dot--done' : ''}`}
                />
              ))}
            </div>

            <div className="onboarding-slide-icon">
              {PRESENTATION_SLIDES[slideIndex].icon}
            </div>
            <h2 className="onboarding-slide-title">
              {PRESENTATION_SLIDES[slideIndex].title}
            </h2>
            <p className="onboarding-slide-content">
              {PRESENTATION_SLIDES[slideIndex].content}
            </p>

            <button className="onboarding-slide-next" onClick={nextSlide}>
              {slideIndex < PRESENTATION_SLIDES.length - 1 ? '다음' : '알겠어!'}
            </button>
          </motion.div>
        )}

        {/* ─── 전분기 히스토리 로딩 애니메이션 ─── */}
        {flowPhase === 'historyAnim' && (
          <motion.div
            key="history-anim"
            className="onboarding-history-anim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <h2 className="onboarding-history-title">
              전 분기 시장 데이터 로딩 중...
            </h2>

            {/* 진행 바 */}
            <div className="onboarding-history-bar">
              <motion.div
                className="onboarding-history-bar-fill"
                animate={{ width: `${(historyProgress / 13) * 100}%` }}
                transition={{ duration: 0.1 }}
              />
              <span className="onboarding-history-bar-text">
                WEEK {historyProgress}/13
              </span>
            </div>

            {/* 미니 차트들 */}
            <div className="onboarding-history-charts">
              {previewStocks.map(({ stock, prices }) => {
                const visiblePrices = prices.slice(0, Math.min(historyProgress + 1, prices.length))
                return (
                  <motion.div
                    key={stock.id}
                    className="onboarding-history-chart-item"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                  >
                    <span className="onboarding-history-ticker">{stock.ticker}</span>
                    <MiniSparkline
                      prices={visiblePrices}
                      width={80}
                      height={20}
                    />
                    {visiblePrices.length > 0 && (
                      <span className="onboarding-history-price">
                        ${visiblePrices[visiblePrices.length - 1]?.toFixed(0)}
                      </span>
                    )}
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

