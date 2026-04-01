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
      { target: '[data-guide="hud"]', text: '리서치센터 차장이야. 네 OJT 담당. 오늘부터 넌 리서치센터 인턴이야.' },
      { target: '[data-guide="hud"]', text: '8분기 동안 벤치마크 수익률을 달성해야 해. 1분기 "골디락스" 목표는 5%.' },
      { target: '[data-guide="hud"]', text: '8분기 "퍼펙트 스톰"까지 서바이브하면 정규직 전환이야.' },
      { target: '[data-guide="hud"]', text: '자, HTS 화면부터 브리핑해줄게.' },
    ],
  },
  // ═══ Chapter 1: 화면 익히기 ═══
  {
    id: 'ui',
    title: 'Ch.1 트레이딩 데스크',
    color: '#f0b429',
    page: 'trading',
    steps: [
      { target: '[data-guide="hud"]', text: '여기가 HUD야. 현금, 수익률, RP, 장 시간이 한눈에 보여.' },
      { target: '.trading-speed-controls', text: '속도 조절 버튼이야. 일시정지를 눌러봐. 멈춰도 뉴스 분석, 리미트 오더 설정은 가능해.', waitForClick: true },
      { target: '.stock-tab-bar', text: '종목 탭이야. PXT(PixelTech)를 클릭해봐.', waitForClick: true },
      { target: '[data-guide="chart"]', text: '캔들스틱 차트야. 양봉(초록)이 상승, 음봉(빨강)이 하락. 거래량도 봐.' },
      { target: '[data-guide="orderbook"]', text: '호가창이야. 매수/매도 호가와 잔량이 표시돼. 실제 KRX 거래소와 같은 구조.' },
      { target: '[data-guide="order"]', text: '주문서. 여기서 매수/매도 오더를 넣어. 곧 직접 해볼 거야.' },
    ],
  },
  // ═══ Chapter 2: 첫 매수 ═══
  {
    id: 'first-trade',
    title: 'Ch.2 첫 매수',
    color: '#5ec269',
    page: 'trading',
    steps: [
      { target: '[data-guide="order"]', text: '자, 첫 오더를 넣어보자. 주문서를 봐.' },
      { target: '[data-guide="order"]', text: '수량에 5를 입력하고, 매수 버튼을 눌러봐!', waitForClick: true },
      { target: '[data-guide="order"]', text: '체결 완료! 첫 포지션 진입 성공이야!', characterMood: 'celebrate' },
      { target: '.trading-quarter-bar', text: '분기 진행률이야. 13주 후 분기가 끝나고 퍼포먼스 리뷰를 받아.' },
    ],
  },
  // ═══ Chapter 3: 뉴스 읽기 ═══
  {
    id: 'news',
    title: 'Ch.3 뉴스 분석',
    color: '#5b9bd5',
    page: 'news',
    steps: [
      { target: '.sidebar-nav-item:nth-child(2)', text: '뉴스 탭으로 이동해. 클릭!', waitForClick: true, page: 'trading' },
      { target: '.news-v2-tabs', text: '카테고리 필터야. 정부, 경제, 기술, 지정학별로 분류돼 있어.', page: 'news' },
      { target: '.news-v2-body', text: '뉴스 피드야. 속보는 크게, 일반은 작게, 노이즈는 접혀서 나와.', page: 'news' },
      { target: '.news-v2-body', text: '기사를 클릭해봐. 인과관계 분석과 섹터 임팩트가 나와.', waitForClick: true, page: 'news' },
      { target: '.news-v2-body', text: '출처와 신뢰도를 꼭 봐. 공영방송은 높은 신뢰도, SNS는 노이즈일 수 있어.', page: 'news' },
      { target: '.news-v2-tabs', text: '가짜 뉴스에 주의해. 펌프앤덤프, FUD, 루머... 팩트체크 스킬로 탐지력을 올려.', page: 'news' },
      { target: '.news-v2-body', text: '뉴스를 읽고 컨빅션을 세운 뒤 포지션을 잡는 게 알파의 원천이야.', page: 'news' },
    ],
  },
  // ═══ Chapter 4: 여론과 경제지표 ═══
  {
    id: 'social',
    title: 'Ch.4 센티먼트/매크로',
    color: '#e88c3a',
    page: 'analysis',
    steps: [
      { target: '.sidebar-nav-item:nth-child(3)', text: '사회 탭으로 이동해.', waitForClick: true, page: 'news' },
      { target: '.social-v2-body', text: 'SNS 피드야. 개미들의 센티먼트를 읽을 수 있어.', page: 'analysis' },
      { target: '.social-v2-body', text: '근데 센티먼트가 항상 맞진 않아. 역투자 관점도 필요해.', page: 'analysis', characterMood: 'warning' },
      { target: '.social-v2-tabs', text: '매크로 지표 탭도 확인해봐. GDP, 실업률, 기준금리, CPI가 나와.', waitForClick: true, page: 'analysis' },
      { target: '.social-v2-body', text: '금리 인상은 성장주 하락, 실업률 상승은 리세션 시그널. 해석은 네 몫이야.', page: 'analysis' },
    ],
  },
  // ═══ Chapter 5: 주문과 리스크 ═══
  {
    id: 'orders',
    title: 'Ch.5 오더/리스크',
    color: '#9b72cf',
    page: 'trading',
    steps: [
      { target: '.sidebar-nav-item:nth-child(1)', text: '트레이딩 데스크로 돌아가자.', waitForClick: true, page: 'analysis' },
      { target: '[data-guide="order"]', text: '주문서에서 "주문" 탭을 찾아 클릭해봐.', waitForClick: true, page: 'trading' },
      { target: '[data-guide="order"]', text: '리미트 오더: 지정가에 자동 체결. 계획적 매매의 기본이야.', page: 'trading' },
      { target: '[data-guide="order"]', text: '스탑로스: -10% 이하 시 자동 청산. 드로다운을 제한해.', page: 'trading' },
      { target: '[data-guide="order"]', text: '패닉셀보다 사전 오더 세팅이 훨씬 중요해. 리스크 관리가 수익의 절반이야.', page: 'trading', characterMood: 'advice' },
      { target: '[data-guide="order"]', text: '레버리지와 숏셀링은 양날의 검이야. 스킬로 언락한 뒤 신중하게 써.', page: 'trading', characterMood: 'warning' },
    ],
  },
  // ═══ Chapter 6: RP와 스킬 ═══
  {
    id: 'economy',
    title: 'Ch.6 RP/스킬',
    color: '#f0b429',
    page: 'trading',
    steps: [
      { target: '[data-guide="hud"]', text: 'RP는 평판 포인트. 리서치 능력을 증명하는 화폐야.', page: 'trading' },
      { target: '[data-guide="hud"]', text: '매주 기본 5RP + 보유 포지션당 1RP + 수익 시 3RP + 가짜뉴스 회피 2RP.', page: 'trading' },
      { target: '[data-guide="hud"]', text: '상점에서 스킬을 사면 영구 언락이야. 트레이딩 스킬트리를 전략적으로 찍어.', page: 'trading' },
      { target: '[data-guide="hud"]', text: '팩트체크 먼저? 숏셀링 먼저? 빌드 전략이 필요해.', page: 'trading', characterMood: 'advice' },
      { target: '[data-guide="hud"]', text: '아이템은 일회용이야. CMA 긴급인출, 풋옵션 헤지 같은 건 위기 때 효과적.', page: 'trading' },
    ],
  },
  // ═══ 에필로그 ═══
  {
    id: 'epilogue',
    title: '실전 트레이딩',
    color: '#f0b429',
    page: 'trading',
    steps: [
      { target: '[data-guide="hud"]', text: '좋아, OJT 브리핑은 끝났어. 이제 네 판단이야.', page: 'trading' },
      { target: '[data-guide="hud"]', text: '뉴스를 꼼꼼히 읽고, 감정 배제하고, 포트폴리오 분산. 이 세 가지만 기억해.', page: 'trading', characterMood: 'advice' },
      { target: '[data-guide="hud"]', text: '가이드 버튼으로 언제든 다시 브리핑 받을 수 있어.', page: 'trading' },
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

  // ═══ 스마트 배치: 타겟 주변 여유공간 분석 ═══
  type Placement = 'below' | 'right' | 'left' | 'above'

  const calcPlacement = useCallback((rect: DOMRect): Placement => {
    const spaceBottom = window.innerHeight - rect.bottom
    const spaceRight = window.innerWidth - rect.right
    const spaceLeft = rect.left - 52 // 사이드바 52px 제외
    const spaceTop = rect.top

    if (spaceBottom > 260) return 'below'
    if (spaceRight > 360) return 'right'
    if (spaceLeft > 200) return 'left'
    if (spaceTop > 260) return 'above'
    return 'below'
  }, [])

  const placement: Placement = targetRect ? calcPlacement(targetRect) : 'below'

  // 캐릭터 포즈: placement에 따라
  const POSE_MAP: Record<Placement, string> = {
    below: '/characters/mentor-hd/animations/point-up/south/frame_002.png',
    right: '/characters/mentor-hd/animations/point-left/south/frame_002.png',
    left: '/characters/mentor-hd/animations/point-right/south/frame_002.png',
    above: '/characters/mentor-hd/animations/point-down/south/frame_002.png',
  }
  // idle 프레임 순환 (arms-crossed, breathing-idle)
  const [idleFrame, setIdleFrame] = useState(0)
  useEffect(() => {
    if (!isOpen) return
    const interval = setInterval(() => setIdleFrame(f => (f + 1) % 4), 250)
    return () => clearInterval(interval)
  }, [isOpen])

  // 포즈 결정: mood가 있으면 해당 포즈, 없으면 placement 기반 가리키기
  const MOOD_IMG: Record<string, string> = {
    celebrate: '/characters/mentor-hd/animations/fireball/south/frame_003.png',
    warning: '/characters/mentor-hd/animations/crouching/south/frame_002.png',
    advice: `/characters/mentor-hd/animations/arms-crossed/south/frame_${String(idleFrame).padStart(3, '0')}.png`,
  }
  const idleImg = `/characters/mentor-hd/animations/arms-crossed/south/frame_${String(idleFrame).padStart(3, '0')}.png`
  const characterImg = step?.characterMood && MOOD_IMG[step.characterMood]
    ? MOOD_IMG[step.characterMood]
    : targetRect
      ? POSE_MAP[placement]
      : idleImg

  // 화살표 이미지 + 방향
  const ARROW_MAP: Record<Placement, { src: string; rotate: number }> = {
    below: { src: '/characters/arrow-down.png', rotate: 180 }, // ▲ (위를 가리킴)
    right: { src: '/characters/arrow-right.png', rotate: 180 }, // ◀ (왼쪽을 가리킴)
    left: { src: '/characters/arrow-right.png', rotate: 0 }, // ▶ (오른쪽을 가리킴)
    above: { src: '/characters/arrow-down.png', rotate: 0 }, // ▼ (아래를 가리킴)
  }

  // 캐릭터 좌표 계산 (화면 경계 클램핑)
  const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val))
  const getCharPos = useCallback(() => {
    const vw = window.innerWidth
    const vh = window.innerHeight
    if (!targetRect) return { left: 70, top: clamp(vh - 220, 10, vh - 140) }
    const r = targetRect
    let left: number, top: number
    switch (placement) {
      case 'below':
        left = r.left; top = r.bottom + 50; break
      case 'right':
        left = r.right + 16; top = r.top + r.height / 2 - 64; break
      case 'left':
        left = r.left - 140; top = r.top + r.height / 2 - 64; break
      case 'above':
        left = r.left; top = r.top - 180; break
    }
    return { left: clamp(left, 56, vw - 140), top: clamp(top, 10, vh - 140) }
  }, [targetRect, placement])

  // 화살표 좌표 계산 (화면 경계 클램핑)
  const getArrowPos = useCallback(() => {
    const vw = window.innerWidth
    const vh = window.innerHeight
    if (!targetRect) return { left: 0, top: 0 }
    const r = targetRect
    let left: number, top: number
    switch (placement) {
      case 'below':
        left = r.left + r.width / 2 - 20; top = r.bottom + 6; break
      case 'right':
        left = r.right + 4; top = r.top + r.height / 2 - 20; break
      case 'left':
        left = r.left - 44; top = r.top + r.height / 2 - 20; break
      case 'above':
        left = r.left + r.width / 2 - 20; top = r.top - 44; break
    }
    return { left: clamp(left, 10, vw - 44), top: clamp(top, 10, vh - 44) }
  }, [targetRect, placement])

  // 말풍선 좌표 계산 (화면 경계 클램핑)
  const getBubblePos = useCallback(() => {
    const vw = window.innerWidth
    const vh = window.innerHeight
    if (!targetRect) return { left: clamp(vw / 2 - 160, 56, vw - 340), top: clamp(vh / 2, 10, vh - 160) }
    const charPos = getCharPos()
    let left: number, top: number
    switch (placement) {
      case 'below':
        left = charPos.left + 140; top = charPos.top; break
      case 'right':
        left = charPos.left; top = charPos.top + 136; break
      case 'left':
        left = charPos.left - 20; top = charPos.top + 136; break
      case 'above':
        left = charPos.left + 140; top = charPos.top; break
    }
    return { left: clamp(left, 56, vw - 340), top: clamp(top, 10, vh - 160) }
  }, [targetRect, placement, getCharPos])


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

      {/* 화살표: placement 방향으로 배치 */}
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

      {/* 캐릭터: placement에 따라 배치 */}
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

      {/* 말풍선: placement에 따라 배치 */}
      <motion.div
        className="guide-speech-bubble"
        onClick={handleClick}
        animate={getBubblePos()}
        transition={{ type: 'spring', stiffness: 100, damping: 16 }}
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
