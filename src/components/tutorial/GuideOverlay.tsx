import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { SFX } from '../../utils/sound'
import type { PageId } from '../layout/SidebarNav'

/**
 * 인터랙티브 가이드 오버레이 — 7챕터 체험형 튜토리얼
 *
 * 핵심 원칙:
 * 1. 체험형: waitForClick으로 유저가 직접 클릭
 * 2. 단계적: 챕터별로 기능을 열어줌
 * 3. 컨텍스트: 실제 게임 화면 위에서 하이라이팅
 * 4. 캐릭터: 멘토가 상황별 대사
 */

interface GuideStep {
  target: string
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

const CHAPTERS: GuideChapter[] = [
  // ═══ Chapter 0: 인턴 소개 ═══
  {
    id: 'intro',
    title: '프롤로그',
    color: '#f0b429',
    page: 'trading',
    steps: [
      { target: '[data-guide="hud"]', text: '나는 네 담당 선배야. 이름은 아직 비밀이지. 오늘부터 넌 증권사 인턴이야.' },
      { target: '[data-guide="hud"]', text: '8분기 동안 목표 수익률을 달성해야 해. 1분기 목표는 5%. 뒤로 갈수록 어려워져.' },
      { target: '[data-guide="hud"]', text: '8분기 전부 클리어하면 정규직이야. 뉴스를 읽고, 분석하고, 매매하는 게 네 일이야.' },
      { target: '[data-guide="hud"]', text: '자, 화면부터 알려줄게.' },
    ],
  },
  // ═══ Chapter 1: 화면 익히기 ═══
  {
    id: 'ui',
    title: 'Ch.1 화면 익히기',
    color: '#f0b429',
    page: 'trading',
    steps: [
      { target: '[data-guide="hud"]', text: '여기가 HUD야. 현금, 수익률, RP, 게임 시간이 한눈에 보여.' },
      { target: '.trading-speed-controls', text: '속도 조절 버튼이야. 일시정지를 눌러봐. 멈춰도 뉴스 읽기, 주문 설정은 가능해.', waitForClick: true },
      { target: '.stock-tab-bar', text: '종목 탭이야. PXT(PixelTech)를 클릭해서 선택해봐.', waitForClick: true },
      { target: '[data-guide="chart"]', text: '이게 주가 차트야. 캔들스틱이라고 해. 초록이 상승, 빨강이 하락.' },
      { target: '[data-guide="orderbook"]', text: '호가창. 매수/매도 호가와 대기 수량이 표시돼. 실제 거래소와 같은 구조야.' },
      { target: '[data-guide="order"]', text: '주문서. 여기서 매수/매도를 해. 곧 직접 해볼 거야.' },
    ],
  },
  // ═══ Chapter 2: 첫 매수 ═══
  {
    id: 'first-trade',
    title: 'Ch.2 첫 매수',
    color: '#5ec269',
    page: 'trading',
    steps: [
      { target: '[data-guide="order"]', text: '자, 첫 거래를 해보자. 주문서를 봐.' },
      { target: '[data-guide="order"]', text: '수량에 5를 입력하고, 매수 버튼을 눌러봐!', waitForClick: true },
      { target: '[data-guide="order"]', text: '축하해! 첫 거래 성공이야!', characterMood: 'celebrate' },
      { target: '.trading-quarter-bar', text: '분기 진행률이야. 13주가 지나면 분기가 끝나고 실적을 평가받아.' },
    ],
  },
  // ═══ Chapter 3: 뉴스 읽기 ═══
  {
    id: 'news',
    title: 'Ch.3 뉴스 읽기',
    color: '#5b9bd5',
    page: 'news',
    steps: [
      { target: '.sidebar-nav-item:nth-child(2)', text: '뉴스 탭으로 이동해. 클릭!', waitForClick: true, page: 'trading' },
      { target: '.news-v2-tabs', text: '카테고리별로 뉴스를 필터링할 수 있어. 정부, 경제, 기술, 지정학...', page: 'news' },
      { target: '.news-v2-body', text: '뉴스 목록이야. 속보는 크게, 일반은 작게, 소음은 접혀서 나와.', page: 'news' },
      { target: '.news-v2-body', text: '기사를 클릭해봐. 상세 내용과 인과관계 분석이 나올 거야.', waitForClick: true, page: 'news' },
      { target: '.news-v2-body', text: '출처와 신뢰도를 꼭 봐. 공영방송은 믿을 만하고, SNS는 가짜일 수 있어.', page: 'news' },
      { target: '.news-v2-tabs', text: '가짜 뉴스에 주의해. 펌프앤덤프, FUD, 루머... 스킬을 찍으면 탐지력이 올라가.', page: 'news' },
      { target: '.news-v2-body', text: '이제 뉴스를 읽고 매매 판단을 내리는 게 네 일이야. 핵심이니까 꼭 기억해.', page: 'news' },
    ],
  },
  // ═══ Chapter 4: 여론과 경제지표 ═══
  {
    id: 'social',
    title: 'Ch.4 여론/경제지표',
    color: '#e88c3a',
    page: 'analysis',
    steps: [
      { target: '.sidebar-nav-item:nth-child(3)', text: '사회 탭으로 이동해.', waitForClick: true, page: 'news' },
      { target: '.social-v2-body', text: '사람들의 SNS 게시글이야. 시장 분위기를 읽을 수 있어.', page: 'analysis' },
      { target: '.social-v2-body', text: '근데 여론이 항상 맞는 건 아니야. 루머도 섞여 있으니까 비판적으로 읽어.', page: 'analysis', characterMood: 'warning' },
      { target: '.social-v2-tabs', text: '경제지표 탭도 확인해봐. GDP, 실업률, 금리 같은 숫자가 나와.', waitForClick: true, page: 'analysis' },
      { target: '.social-v2-body', text: '이 숫자들의 해석은 네 몫이야. 금리 인상은 보통 주가 하락. 실업률 상승은 경기 둔화 신호.', page: 'analysis' },
    ],
  },
  // ═══ Chapter 5: 주문과 리스크 ═══
  {
    id: 'orders',
    title: 'Ch.5 주문/리스크',
    color: '#9b72cf',
    page: 'trading',
    steps: [
      { target: '.sidebar-nav-item:nth-child(1)', text: '매매 탭으로 돌아가자.', waitForClick: true, page: 'analysis' },
      { target: '[data-guide="order"]', text: '주문서에서 "주문" 탭을 찾아 클릭해봐.', waitForClick: true, page: 'trading' },
      { target: '[data-guide="order"]', text: '지정가 매수: 원하는 가격에 자동 매수. 미리 계획하는 거지.', page: 'trading' },
      { target: '[data-guide="order"]', text: '손절매: 일정 % 이하로 떨어지면 자동 매도. 큰 손실을 방지해.', page: 'trading' },
      { target: '[data-guide="order"]', text: '감정으로 매매하는 것보다 미리 계획하는 게 훨씬 중요해. 기억해둬.', page: 'trading', characterMood: 'advice' },
      { target: '[data-guide="order"]', text: '레버리지와 공매도는 위험한 도구야. 나중에 스킬로 열 수 있어.', page: 'trading', characterMood: 'warning' },
    ],
  },
  // ═══ Chapter 6: RP와 스킬 ═══
  {
    id: 'economy',
    title: 'Ch.6 RP/스킬',
    color: '#f0b429',
    page: 'trading',
    steps: [
      { target: '[data-guide="hud"]', text: 'RP는 평판 포인트. 스킬과 아이템을 사는 화폐야.', page: 'trading' },
      { target: '[data-guide="hud"]', text: '매주 기본 5RP + 보유 종목당 1RP + 수익이면 3RP + 가짜뉴스 회피 2RP.', page: 'trading' },
      { target: '[data-guide="hud"]', text: '상점에서 스킬을 사면 영구적으로 기능이 추가돼.', page: 'trading' },
      { target: '[data-guide="hud"]', text: '팩트체크, 공매도, 레버리지... 뭘 먼저 살지 전략적으로 고민해.', page: 'trading', characterMood: 'advice' },
      { target: '[data-guide="hud"]', text: '아이템은 일회용이야. 비상자금, 투자보험 같은 거. 위기 때 쓰면 효과적.', page: 'trading' },
    ],
  },
  // ═══ 에필로그 ═══
  {
    id: 'epilogue',
    title: '실전 시작',
    color: '#f0b429',
    page: 'trading',
    steps: [
      { target: '[data-guide="hud"]', text: '좋아, 기본은 다 알려줬어. 이제 네 판단이야.', page: 'trading' },
      { target: '[data-guide="hud"]', text: '뉴스를 꼼꼼히 읽고, 감정 배제하고, 분산투자해. 이 세 가지만 기억해.', page: 'trading', characterMood: 'advice' },
      { target: '[data-guide="hud"]', text: '가이드 버튼으로 언제든 다시 도움받을 수 있어.', page: 'trading' },
      { target: '[data-guide="hud"]', text: '행운을 빌어, 인턴. ...아, 내 이름은 나중에 알려줄게.', page: 'trading' },
    ],
  },
]

interface GuideOverlayProps {
  isOpen: boolean
  onClose: () => void
  onNavigate: (page: PageId) => void
}

export function GuideOverlay({ isOpen, onClose, onNavigate }: GuideOverlayProps) {
  const [chapterIndex, setChapterIndex] = useState(0)
  const [stepIndex, setStepIndex] = useState(0)
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
  const [displayedText, setDisplayedText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const clickListenerRef = useRef<((e: MouseEvent) => void) | null>(null)

  const chapter = CHAPTERS[chapterIndex]
  const step = chapter.steps[stepIndex]
  const isLastStep = stepIndex >= chapter.steps.length - 1
  const isLastChapter = chapterIndex >= CHAPTERS.length - 1
  const totalSteps = CHAPTERS.reduce((s, c) => s + c.steps.length, 0)
  const currentGlobalStep = CHAPTERS.slice(0, chapterIndex).reduce((s, c) => s + c.steps.length, 0) + stepIndex + 1

  // 캐릭터: 가리키는 포즈 1프레임 고정 + idle 바운스로 생동감
  // 타겟이 위에 있으면 point-up, 오른쪽이면 point-right, 없으면 idle
  const getCharacterImg = useCallback((): string => {
    if (!targetRect) return '/characters/mentor-hd/animations/breathing-idle/south/frame_000.png'
    // 타겟이 캐릭터보다 위에 있으면 위를, 아니면 오른쪽을 가리킴
    const isTopTarget = targetRect.top < 80
    const charTop = isTopTarget ? targetRect.bottom + 10 : Math.max(10, targetRect.top)
    const tCY = targetRect.top + targetRect.height / 2
    if (tCY < charTop) return '/characters/mentor-hd/animations/point-up/south/frame_002.png'
    return '/characters/mentor-hd/animations/point-right/south/frame_002.png'
  }, [targetRect])

  const characterImg = getCharacterImg()


  // 페이지 네비게이트
  useEffect(() => {
    if (!isOpen) return
    const targetPage = step?.page ?? chapter.page
    onNavigate(targetPage)
  }, [isOpen, chapterIndex, stepIndex])

  // 타겟 요소 추적
  const updateTarget = useCallback(() => {
    if (!step?.target) { setTargetRect(null); return }
    const el = document.querySelector(step.target)
    if (el) setTargetRect(el.getBoundingClientRect())
    else setTargetRect(null)
  }, [step])

  useEffect(() => {
    if (!isOpen) return
    const t = setTimeout(updateTarget, 400)
    const interval = setInterval(updateTarget, 500)
    return () => { clearTimeout(t); clearInterval(interval) }
  }, [isOpen, chapterIndex, stepIndex, updateTarget])

  // 타이핑 효과
  useEffect(() => {
    if (!isOpen || !step) return
    setDisplayedText('')
    setIsTyping(true)
    let i = 0
    const interval = setInterval(() => {
      if (i <= step.text.length) {
        setDisplayedText(step.text.slice(0, i))
        if (i > 0 && step.text[i - 1] !== ' ') SFX.dialogueBlip()
        i++
      } else {
        setIsTyping(false)
        clearInterval(interval)
      }
    }, 22)
    return () => clearInterval(interval)
  }, [isOpen, chapterIndex, stepIndex])

  // waitForClick: 타겟 클릭 감지 — document 레벨에서 모든 클릭 감지
  useEffect(() => {
    if (!isOpen || !step?.waitForClick || isTyping) return

    const handler = (e: MouseEvent) => {
      // 타겟 요소 또는 그 자식을 클릭했는지 확인
      if (!step.target) return
      const targetEl = document.querySelector(step.target)
      if (!targetEl) return
      const clicked = e.target as Node
      if (targetEl.contains(clicked) || targetEl === clicked) {
        setTimeout(() => {
          SFX.click()
          advanceStep()
        }, 300)
      }
    }

    document.addEventListener('click', handler, true)
    clickListenerRef.current = handler
    return () => {
      document.removeEventListener('click', handler, true)
      clickListenerRef.current = null
    }
  }, [isOpen, step?.waitForClick, isTyping, targetRect])

  const advanceStep = useCallback(() => {
    if (isLastStep) {
      if (isLastChapter) {
        onClose()
      } else {
        setChapterIndex(i => i + 1)
        setStepIndex(0)
      }
    } else {
      setStepIndex(i => i + 1)
    }
  }, [isLastStep, isLastChapter, onClose])

  const handleClick = useCallback(() => {
    if (step?.waitForClick && !isTyping) return // waitForClick 스텝은 대화 클릭으로 진행 불가
    if (isTyping) {
      setDisplayedText(step.text)
      setIsTyping(false)
      return
    }
    advanceStep()
  }, [isTyping, step, advanceStep])

  const handleChapterJump = useCallback((idx: number) => {
    setChapterIndex(idx)
    setStepIndex(0)
  }, [])

  if (!isOpen) return null

  const hasTarget = !!targetRect
  const pad = 10

  return (
    <>
      {/* 어두운 마스크 */}
      <svg className="guide-overlay-mask"
        viewBox={`0 0 ${typeof window !== 'undefined' ? window.innerWidth : 1920} ${typeof window !== 'undefined' ? window.innerHeight : 1080}`}
        onClick={step?.waitForClick ? undefined : handleClick}
        style={step?.waitForClick && !isTyping ? { pointerEvents: 'none' } : undefined}
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

      {/* 골드 글로우 보더 */}
      {hasTarget && (
        <div className="guide-glow-border" style={{
          left: targetRect!.left - pad, top: targetRect!.top - pad,
          width: targetRect!.width + pad * 2, height: targetRect!.height + pad * 2,
        }} />
      )}

      {/* 픽셀아트 화살표: 타겟 가장자리에 정확한 방향으로 배치 */}
      {hasTarget && (() => {
        // 캐릭터 위치 계산 (캐릭터 배치 로직과 동일)
        const isTopTarget = targetRect!.top < 80
        const charLeft = isTopTarget
          ? Math.max(56, targetRect!.left - 136)
          : Math.max(56, targetRect!.left - 136)
        const charTop = isTopTarget
          ? targetRect!.bottom + 10
          : Math.max(10, Math.min(targetRect!.top, window.innerHeight - 150))
        const charCX = charLeft + 64
        const charCY = charTop + 64

        // 타겟 중심
        const tCX = targetRect!.left + targetRect!.width / 2
        const tCY = targetRect!.top + targetRect!.height / 2

        // 캐릭터→타겟 각도
        const angle = Math.atan2(tCY - charCY, tCX - charCX) * (180 / Math.PI)

        // 화살표를 타겟 가장자리에 배치 (타겟 쪽 끝)
        const pad = 8
        let arrowLeft: number, arrowTop: number
        if (Math.abs(angle) < 45) {
          // 오른쪽
          arrowLeft = targetRect!.left - 48 - pad
          arrowTop = tCY - 24
        } else if (angle >= 45 && angle < 135) {
          // 아래쪽
          arrowLeft = tCX - 24
          arrowTop = targetRect!.top - 48 - pad
        } else if (angle <= -45 && angle > -135) {
          // 위쪽
          arrowLeft = tCX - 24
          arrowTop = targetRect!.bottom + pad
        } else {
          // 왼쪽
          arrowLeft = targetRect!.right + pad
          arrowTop = tCY - 24
        }

        // 화살표 이미지 + CSS 회전으로 정확한 방향
        // arrow-right.png 기본 → rotate로 8방향 커버
        const arrowRotate = angle // 기본 화살표가 오른쪽이므로 각도 그대로
        const bounceAxis = Math.abs(angle) < 45 || Math.abs(angle) > 135 ? 'x' : 'y'
        const bounceDir = (angle > -135 && angle < -45) ? -1 : (angle >= 45 && angle <= 135) ? -1 : 1

        return (
          <motion.img
            src="/characters/arrow-right.png"
            alt=""
            className="guide-pixel-arrow"
            animate={bounceAxis === 'x' ? { x: [0, 8 * bounceDir, 0] } : { y: [0, 8 * bounceDir, 0] }}
            transition={{ duration: 0.7, repeat: Infinity }}
            style={{
              left: arrowLeft,
              top: arrowTop,
              imageRendering: 'pixelated',
              transform: `rotate(${Math.round(angle)}deg)`,
            }}
          />
        )
      })()}

      {/* 캐릭터: 하이라이트 칸 왼쪽에 배치 */}
      <motion.div
        className="guide-character"
        animate={hasTarget ? {
          left: Math.max(56, targetRect!.left - 136),
          top: targetRect!.top < 80
            ? targetRect!.bottom + 10  // 타겟이 화면 상단이면 캐릭터를 아래에
            : Math.max(10, Math.min(targetRect!.top, window.innerHeight - 150)),
        } : { left: 70, top: window.innerHeight - 220 }}
        transition={{ type: 'spring', stiffness: 120, damping: 18 }}
      >
        <motion.img
          src={characterImg}
          alt=""
          className="guide-character-img"
          animate={{ y: [0, -3, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      </motion.div>

      {/* 대화 말풍선: 하이라이트 칸 아래 또는 캐릭터 옆 */}
      <motion.div
        className="guide-speech-bubble"
        onClick={handleClick}
        animate={hasTarget ? {
          left: Math.max(60, Math.min(targetRect!.left, window.innerWidth - 340)),
          top: Math.min(targetRect!.bottom + 20, window.innerHeight - 130),
        } : { left: window.innerWidth / 2 - 160, top: window.innerHeight / 2 }}
        transition={{ type: 'spring', stiffness: 120, damping: 18 }}
      >
        <div className="guide-speech-chapter" style={{ color: chapter.color }}>{chapter.title}</div>
        <div className="guide-speech-text">
          {displayedText}
          {isTyping && (
            <motion.span animate={{ opacity: [1, 0] }} transition={{ duration: 0.4, repeat: Infinity }} style={{ color: '#f0b429' }}>_</motion.span>
          )}
        </div>
        <div className="guide-speech-controls">
          <span className="guide-speech-progress">{currentGlobalStep}/{totalSteps}</span>
          {step?.waitForClick && !isTyping
            ? <span className="guide-speech-wait">직접 클릭하세요</span>
            : !isTyping && <span className="guide-speech-next">클릭하면 계속</span>
          }
        </div>
      </motion.div>

      {/* 하단 챕터 바 (미니멀) */}
      <div className="guide-chapter-bar">
        {CHAPTERS.map((ch, i) => (
          <button key={ch.id}
            className={`guide-chapter-dot ${chapterIndex === i ? 'guide-chapter-dot--active' : ''} ${i < chapterIndex ? 'guide-chapter-dot--done' : ''}`}
            style={{ '--dot-color': ch.color } as React.CSSProperties}
            onClick={() => handleChapterJump(i)}
            title={ch.title}
          />
        ))}
        <button className="guide-chapter-close" onClick={onClose}>닫기</button>
      </div>
    </>
  )
}
