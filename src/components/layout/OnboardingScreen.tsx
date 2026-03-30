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

/* ─── 대화 스크립트 (확장판) ─── */
const SCRIPT: DialogueScript = {
  intro: [
    { speaker: '???', text: '...이봐, 들리나?' },
    { speaker: '???', text: '좋아, 연결됐군. 나는 네 담당 선배야. 이름? ...아직은 비밀이지.' },
    { speaker: '???', text: '축하해, 오늘부터 넌 증권사 인턴이야.' },
    { speaker: '???', text: '네 임무를 설명해줄게. 잘 들어.' },
    { speaker: '???', text: '총 8분기야. 1분기 = 13주. 1주 = 약 70초 실시간.' },
    { speaker: '???', text: '매 분기마다 목표 수익률이 있어. 달성 못 하면? 짤려.' },
    { speaker: '???', text: '1분기 목표는 5%. 쉬워 보이지? 근데 뒤로 갈수록...' },
    { speaker: '???', text: '8분기 목표는 30%야. 변동성도 미쳐 돌아가고 가짜뉴스도 넘쳐.' },
    { speaker: '???', text: '8분기 전부 클리어하면 — 정규직이야. 도전해볼 만하지?' },
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
    { speaker: '???', text: '신입이구나. 괜찮아, 핵심만 알려줄게. 집중해.' },
  ],
  afterPresentation: [
    { speaker: '???', text: '어때, 대충 감이 잡혔어?' },
    { speaker: '???', text: '좋아, 이제 실전 얘기를 하자.' },
  ],
  skipBasics: [
    { speaker: '???', text: '경험자구나. 좋아, 기초는 넘어가자.' },
  ],
  gameFlow: [
    { speaker: '???', text: '게임은 실시간으로 돌아가. 매일 9시에 장이 열리고 16시에 닫혀.' },
    { speaker: '???', text: '장이 열리기 전(8시~9시)에 뉴스가 들어와. 이때 분석해.' },
    { speaker: '???', text: '장중(9시~16시)에 매매해. 뉴스를 보고 판단이 섰으면 바로 행동.' },
    { speaker: '???', text: '이 사이클이 5일(월~금) 반복되면 1주가 끝나.' },
    { speaker: '???', text: '속도 조절이 있어. 1배속이 기본이고, 2배, 4배, 일시정지도 가능해.' },
    { speaker: '???', text: '일시정지 상태에서도 뉴스 읽기, 분석, 주문 설정은 돼. 활용해.' },
  ],
  screenGuide: [
    { speaker: '???', text: '화면을 설명해줄게. 왼쪽 사이드바 봐.' },
    { speaker: '???', text: '매매 탭 — 차트, 호가창, 주문서가 있는 메인 화면이야.' },
    { speaker: '???', text: '뉴스 탭 — 기사를 읽고 분석하는 곳이야. 이 게임의 핵심.' },
    { speaker: '???', text: '사회 탭 — 사람들의 여론과 경제지표를 보는 곳이야.' },
    { speaker: '???', text: '가이드 버튼 — 언제든 다시 도움을 받을 수 있어.' },
  ],
  advice: [
    { speaker: '???', text: '마지막으로, 선배의 조언 몇 가지.' },
    { speaker: '???', text: '첫째, 뉴스를 꼼꼼히 읽어. 대충 훑으면 가짜에 당해.' },
    { speaker: '???', text: '둘째, 감정으로 매매하지 마. 떨어진다고 공포에 팔면 바닥에 팔게 돼.' },
    { speaker: '???', text: '셋째, 분산해. 한 종목에 몰빵은 도박이야.' },
    { speaker: '???', text: '넷째, RP를 아껴 써. 어떤 스킬을 먼저 살지 전략이 필요해.' },
    { speaker: '???', text: '다섯째, 시장은 네가 틀릴 수 있다는 걸 전제해. 항상 대비해.' },
  ],
  ready: [
    { speaker: '???', text: '좋아, 이제 전 분기 시장 데이터를 불러올게. 잠깐만...' },
  ],
  final: [
    { speaker: '???', text: '데이터 로딩 완료.' },
    { speaker: '???', text: '1분기 수습 시장. 목표 수익률 5% — 가볍게 시작하자.' },
    { speaker: '???', text: '8분기까지 살아남으면 정규직이야.' },
    { speaker: '???', text: '행운을 빌어, 인턴. ...아, 그리고 내 이름은 나중에 알려줄게.' },
  ],
}

/* ─── 신입 인턴 교육 슬라이드 (확장판) ─── */
const PRESENTATION_SLIDES = [
  {
    title: '주식이란?',
    content: '주식은 회사의 소유권 조각이야.\n회사가 잘 되면 주가 올라가고, 못 되면 내려가.\n간단하지? 근데 이 "잘 되느냐 못 되느냐"를\n예측하는 게 어려운 거야.',
    icon: 'I',
  },
  {
    title: '매수와 매도',
    content: '매수 = 사는 거. 매도 = 파는 거.\n싸게 사서 비싸게 팔면 이익.\n근데 "언제가 싼 건지, 비싼 건지"\n그걸 판단하는 게 이 게임의 전부야.',
    icon: 'II',
  },
  {
    title: '뉴스 리터러시',
    content: '이 게임의 핵심이야. 뉴스.\n모든 뉴스가 진짜는 아니야.\n공영방송 = 높은 신뢰도.\n익명 블로그 = 거의 못 믿어.\n펌프앤덤프, FUD 같은 함정을 피해.',
    icon: 'III',
  },
  {
    title: '분산 투자',
    content: '한 종목에 올인하지 마. 절대로.\n5개 섹터: 기술, 에너지, 금융, 소비재, 헬스케어.\n여러 섹터에 나눠서 투자하면\n한 섹터가 망해도 나머지가 버텨줘.',
    icon: 'IV',
  },
  {
    title: 'RP와 스킬',
    content: 'RP = 평판 포인트. 매주 뉴스를 잘 분석하면 쌓여.\nRP로 스킬을 사. 스킬은 영구 업그레이드야.\n팩트체크, 공매도, 레버리지...\n뭘 먼저 살지 전략적으로 고민해.',
    icon: 'V',
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
        // 화면 구조 설명
        setScriptKey('screenGuide')
        setLineIndex(0)
        break
      case 'screenGuide':
        // 실전 조언
        setScriptKey('advice')
        setLineIndex(0)
        break
      case 'advice':
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

      {/* ─── 픽셀 캐릭터 ─── */}
      <div className="onboarding-character">
        <img
          src="/characters/mentor-hd/rotations/south.png"
          alt="Mentor"
          className="onboarding-character-img"
          style={{ imageRendering: 'pixelated' }}
        />
      </div>

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

