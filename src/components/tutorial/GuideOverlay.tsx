import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { SFX } from '../../utils/sound'
import type { PageId } from '../layout/SidebarNav'

/**
 * 인게임 가이드 오버레이 — ReactBits ElectricBorder/SpotlightCard 스타일 효과
 *
 * - 전기 보더: conic-gradient 회전으로 빛이 보더를 따라 흐름
 * - 코너 라이트: 4코너 골드 점 깜빡임
 * - 강화된 글로우: 48px 반경 + 이중 레이어
 * - 내부 스캔라인: CRT 느낌 수평선 흐름
 */

interface GuideStep {
  target: string
  text: string
  page?: PageId
}

interface GuideSection {
  id: string
  label: string
  color: string
  page: PageId
  steps: GuideStep[]
}

const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: 'basics',
    label: '기본',
    color: '#f0b429',
    page: 'trading',
    steps: [
      { target: '[data-guide="hud"]', text: '현금, 수익률, RP가 여기 표시돼. RP는 스킬이랑 아이템 살 때 쓰는 화폐야.' },
      { target: '.trading-time-display', text: '게임 시간이야. 장 시간(9시~16시)에만 주가가 움직이고 거래할 수 있어.' },
      { target: '.trading-speed-controls', text: '속도 조절. 일시정지 중에도 뉴스 읽기, 분석, 주문 설정은 가능해.' },
      { target: '.trading-quarter-bar', text: '분기 진행률이야. 13주가 지나면 분기가 끝나고 실적을 평가받아.' },
    ],
  },
  {
    id: 'trading',
    label: '매매',
    color: '#5ec269',
    page: 'trading',
    steps: [
      { target: '.stock-tab-bar', text: '종목 탭이야. 여기서 매매할 종목을 선택해. 5개 섹터 + ETF가 있어.' },
      { target: '[data-guide="orderbook"]', text: '호가창. 매수/매도 호가와 수량이 표시돼. 실제 거래소와 비슷한 구조야.' },
      { target: '[data-guide="order"]', text: '주문서. 현물 매수/매도, 공매도, 레버리지, 지정가 주문을 여기서 해.' },
      { target: '[data-guide="chart"]', text: '차트. 선택 종목의 주가 흐름이야. 캔들스틱 패턴을 읽는 것도 실력이지.' },
    ],
  },
  {
    id: 'news',
    label: '뉴스',
    color: '#5b9bd5',
    page: 'news',
    steps: [
      { target: '.news-v2-tabs', text: '카테고리별로 뉴스를 필터링할 수 있어. 정부, 경제, 기술, 지정학...', page: 'news' },
      { target: '.news-v2-body', text: '뉴스 목록이야. 속보는 크게, 일반은 작게, 소음은 접혀서 나와. 중요한 걸 골라 읽어.', page: 'news' },
      { target: '.news-v2-body', text: '기사를 클릭하면 상세 + 인과관계 분석이 나와. 출처 신뢰도와 섹터 영향을 확인해.', page: 'news' },
      { target: '.news-v2-tabs', text: '가짜 뉴스에 주의해. 펌프앤덤프, FUD, 루머... 스킬을 찍으면 탐지력이 올라가.', page: 'news' },
    ],
  },
  {
    id: 'social',
    label: '여론',
    color: '#e88c3a',
    page: 'analysis',
    steps: [
      { target: '.social-v2-tabs', text: '여론과 경제지표 탭이야. 사람들의 의견과 숫자를 읽고 시장을 판단해.', page: 'analysis' },
      { target: '.social-v2-body', text: 'SNS 여론이 항상 맞는 건 아니야. 루머도 섞여 있으니까 비판적으로 읽어.', page: 'analysis' },
      { target: '.social-v2-body', text: '경제지표의 해석은 네 몫이야. 금리, 실업률, GDP... 숫자가 의미하는 걸 생각해봐.', page: 'analysis' },
    ],
  },
]

interface GuideOverlayProps {
  isOpen: boolean
  onClose: () => void
  onNavigate: (page: PageId) => void
}

export function GuideOverlay({ isOpen, onClose, onNavigate }: GuideOverlayProps) {
  const [sectionIndex, setSectionIndex] = useState(0)
  const [stepIndex, setStepIndex] = useState(0)
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
  const [displayedText, setDisplayedText] = useState('')
  const [isTyping, setIsTyping] = useState(false)

  const section = GUIDE_SECTIONS[sectionIndex]
  const step = section.steps[stepIndex]
  const isLastStep = stepIndex >= section.steps.length - 1

  // 섹션 변경 시 해당 페이지로 이동
  useEffect(() => {
    if (!isOpen) return
    onNavigate(section.page)
  }, [isOpen, sectionIndex, section.page, onNavigate])

  // 타겟 요소 추적
  const updateTarget = useCallback(() => {
    if (!step?.target) { setTargetRect(null); return }
    const el = document.querySelector(step.target)
    if (el) setTargetRect(el.getBoundingClientRect())
    else setTargetRect(null)
  }, [step])

  useEffect(() => {
    if (!isOpen) return
    const t = setTimeout(updateTarget, 300)
    const interval = setInterval(updateTarget, 400)
    return () => { clearTimeout(t); clearInterval(interval) }
  }, [isOpen, sectionIndex, stepIndex, updateTarget])

  // 스텝의 page 속성으로 추가 네비게이트
  useEffect(() => {
    if (!isOpen || !step?.page) return
    onNavigate(step.page)
  }, [isOpen, stepIndex, step?.page, onNavigate])

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
    }, 25)
    return () => clearInterval(interval)
  }, [isOpen, sectionIndex, stepIndex])

  const handleNext = useCallback(() => {
    if (isTyping) {
      setDisplayedText(step.text)
      setIsTyping(false)
      return
    }
    if (!isLastStep) {
      setStepIndex(i => i + 1)
    }
  }, [isTyping, isLastStep, step])

  const handleSectionChange = useCallback((idx: number) => {
    setSectionIndex(idx)
    setStepIndex(0)
  }, [])

  if (!isOpen) return null

  const hasTarget = !!targetRect
  const pad = 10

  return (
    <>
      {/* 어두운 마스크 (타겟 있으면 구멍, 없으면 전체 암전) */}
      <svg className="guide-overlay-mask" viewBox={`0 0 ${typeof window !== 'undefined' ? window.innerWidth : 1920} ${typeof window !== 'undefined' ? window.innerHeight : 1080}`} onClick={handleNext}>
        <defs>
          <mask id="guide-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {hasTarget && (
              <rect
                x={targetRect!.left - pad}
                y={targetRect!.top - pad}
                width={targetRect!.width + pad * 2}
                height={targetRect!.height + pad * 2}
                rx={12}
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect x="0" y="0" width="100%" height="100%" fill="rgba(0,0,0,0.75)" mask="url(#guide-mask)" />
      </svg>

      {/* 골드 글로우 보더 */}
      {hasTarget && (
        <div
          className="guide-glow-border"
          style={{
            left: targetRect!.left - pad,
            top: targetRect!.top - pad,
            width: targetRect!.width + pad * 2,
            height: targetRect!.height + pad * 2,
          }}
        />
      )}

      {/* 하단 대화 바 */}
      <motion.div
        className="guide-bar"
        initial={{ y: 80 }}
        animate={{ y: 0 }}
        exit={{ y: 80 }}
      >
        <div className="guide-bar-tabs">
          {GUIDE_SECTIONS.map((sec, i) => (
            <button
              key={sec.id}
              className={`guide-bar-tab ${sectionIndex === i ? 'guide-bar-tab--active' : ''}`}
              style={{ '--tab-color': sec.color } as React.CSSProperties}
              onClick={() => handleSectionChange(i)}
            >
              {sec.label}
            </button>
          ))}
        </div>

        <div className="guide-bar-dialogue" onClick={handleNext}>
          <div className="guide-bar-speaker">???</div>
          <div className="guide-bar-text">
            {displayedText}
            {isTyping && (
              <motion.span animate={{ opacity: [1, 0] }} transition={{ duration: 0.4, repeat: Infinity }} className="guide-bar-cursor">_</motion.span>
            )}
          </div>
          <div className="guide-bar-controls">
            <span className="guide-bar-progress">{stepIndex + 1}/{section.steps.length}</span>
            {!isTyping && !isLastStep && <span className="guide-bar-next">클릭하면 계속</span>}
            {!isTyping && isLastStep && <span className="guide-bar-next">다른 카테고리를 선택하세요</span>}
          </div>
        </div>

        <button className="guide-bar-close" onClick={onClose}>닫기</button>
      </motion.div>
    </>
  )
}
