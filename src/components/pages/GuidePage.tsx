import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { SFX } from '../../utils/sound'

/**
 * 인게임 가이드 — 대화 형식
 *
 * 온보딩과 동일한 대화 UI:
 * - 선배(???) 캐릭터가 카테고리별로 설명
 * - 타이핑 애니메이션 + 클릭으로 진행
 * - 왼쪽 카테고리 목차 + 오른쪽 대화 뷰
 */

interface GuideLine {
  speaker: string
  text: string
}

interface GuideSection {
  id: string
  numeral: string
  title: string
  color: string
  lines: GuideLine[]
}

const GUIDE_DATA: GuideSection[] = [
  {
    id: 'basics',
    numeral: 'I',
    title: '기본 규칙',
    color: '#f0b429',
    lines: [
      { speaker: '???', text: '가이드를 찾아왔구나. 좋아, 필요한 것만 빠르게 알려줄게.' },
      { speaker: '???', text: '넌 증권사 인턴이야. 8분기 동안 매 분기 목표 수익률을 달성해야 해.' },
      { speaker: '???', text: '1분기 목표는 5%. 가볍지? 근데 뒤로 갈수록 장난 아니야.' },
      { speaker: '???', text: '게임은 실시간이야. 1분기 = 13주, 1주 = 약 70초. 속도 조절은 HUD에서.' },
      { speaker: '???', text: '장 시간은 9시~16시. 이 시간에만 주가가 움직이고 거래할 수 있어.' },
      { speaker: '???', text: '일시정지 중에도 뉴스 읽기, 분석, 주문 설정은 가능해. 활용하라고.' },
      { speaker: '???', text: 'RP는 평판 포인트. 스킬이랑 아이템 살 때 쓰는 화폐야.' },
      { speaker: '???', text: '매주 기본 5RP + 보유 종목당 1RP + 수익 나면 3RP + 가짜뉴스 안 속으면 2RP.' },
      { speaker: '???', text: '뭐, 기본은 이 정도야. 다른 거 궁금하면 왼쪽 목차에서 골라.' },
    ],
  },
  {
    id: 'trading',
    numeral: 'II',
    title: '매매 가이드',
    color: '#5ec269',
    lines: [
      { speaker: '???', text: '매매 얘기를 하자고? 좋아, 핵심만 짚어줄게.' },
      { speaker: '???', text: '종목 선택 → 수량 입력 → 매수/매도. 25%, 50%, 전량 버튼으로 빠르게 설정해.' },
      { speaker: '???', text: '거래 수수료는 0.5%. 환율 헤지 스킬 찍으면 0.2%로 줄어.' },
      { speaker: '???', text: '공매도는... 주가가 떨어질 때 돈 버는 기법이야. 빌려서 팔고, 싸게 사서 갚는 거지.' },
      { speaker: '???', text: '근데 공매도는 위험해. 마진 150% 필요하고, 주가 30% 오르면 강제 청산이야.' },
      { speaker: '???', text: '레버리지는 자기자본의 N배로 매수하는 거야. 수익도 N배, 손실도 N배.' },
      { speaker: '???', text: '2배 레버리지면 청산가가 매입가의 55%. 5배면 82%. 10배면 91%. 아찔하지?' },
      { speaker: '???', text: '지정가 주문도 있어. 미리 가격 정해두면 자동으로 체결돼.' },
      { speaker: '???', text: '손절매, 익절매도 지정가의 일종이야. 감정 배제하고 기계적으로 매매하는 거지.' },
      { speaker: '???', text: '그리고 분산투자. 한 섹터에 몰빵하지 마. 5개 섹터에 나누면 리스크가 줄어.' },
      { speaker: '???', text: '포트폴리오 헤지 스킬 찍으면 3섹터 이상 보유 시 손실 20% 감소야. 꿀이지.' },
    ],
  },
  {
    id: 'news',
    numeral: 'III',
    title: '뉴스 읽기',
    color: '#5b9bd5',
    lines: [
      { speaker: '???', text: '이 게임의 핵심이야. 뉴스를 얼마나 잘 읽느냐가 실력이거든.' },
      { speaker: '???', text: '모든 뉴스가 진짜는 아니야. 출처에 따라 신뢰도가 달라.' },
      { speaker: '???', text: '공영방송, 경제전문지 = 높음. 애널리스트 = 보통. SNS, 익명 블로그 = 낮음.' },
      { speaker: '???', text: '가짜 뉴스 종류도 알아둬. 펌프앤덤프 — 가격 올려놓고 팔아버리는 수법.' },
      { speaker: '???', text: 'FUD — 공포를 퍼뜨려서 가격을 떨구는 거야. 루머는 확인 안 된 소문이고.' },
      { speaker: '???', text: '뒷북 뉴스는 이미 시장에 반영된 오래된 정보야. 이걸로 거래하면 늦어.' },
      { speaker: '???', text: '뉴스 페이지에서 기사를 클릭하면 인과관계 분석이 나와. 출처→영향→예상 효과.' },
      { speaker: '???', text: '심층 뉴스 스킬 찍으면 "인지된 영향"과 "실제 영향"의 차이를 볼 수 있어.' },
      { speaker: '???', text: '일부 뉴스는 후속 영향이 있어. 체인 이벤트라고 하는데, 2-3일 후에 터져.' },
      { speaker: '???', text: '소음 뉴스도 있어. 시장에 영향 없는 잡음이야. 이걸 걸러내는 것도 능력이지.' },
    ],
  },
  {
    id: 'social',
    numeral: 'IV',
    title: '여론과 경제지표',
    color: '#e88c3a',
    lines: [
      { speaker: '???', text: '사회 탭에서 사람들 게시글을 볼 수 있어. 시장 분위기를 읽는 거지.' },
      { speaker: '???', text: '근데 조심해. 여론이 항상 맞는 건 아니야. 루머도 섞여 있으니까.' },
      { speaker: '???', text: '여론 분석 스킬 찍으면 루머인 게시글에 경고가 뜨긴 해.' },
      { speaker: '???', text: '경제지표 탭도 봐. GDP, 실업률, 기준금리, 물가... 숫자가 나오는데,' },
      { speaker: '???', text: '금리 인상은 보통 주가 하락. 실업률 상승은 경기 둔화 신호야.' },
      { speaker: '???', text: '제조업 PMI가 50 넘으면 확장, 밑이면 위축이야. 기본이지.' },
      { speaker: '???', text: '근데 이 숫자들의 해석은 네 몫이야. 나도 정답은 몰라.' },
    ],
  },
  {
    id: 'skills',
    numeral: 'V',
    title: '스킬과 아이템',
    color: '#9b72cf',
    lines: [
      { speaker: '???', text: '스킬은 RP로 사는 영구 업그레이드야. 한 번 찍으면 끝.' },
      { speaker: '???', text: '분석 스킬은 차트/뉴스 정보를 강화해줘. 기술적 분석, 심층 뉴스 같은 거.' },
      { speaker: '???', text: '리터러시 스킬은 가짜 뉴스 탐지력을 올려줘. 팩트체크, 출처 추적 등.' },
      { speaker: '???', text: '투자 스킬은 공매도, 레버리지, 손절매 같은 거래 도구를 열어줘.' },
      { speaker: '???', text: '패시브 스킬은 수수료 감소, 배당, 이자 강화 같은 자동 효과야.' },
      { speaker: '???', text: '일부 스킬은 선행 스킬이 필요해. 스킬 트리를 잘 봐.' },
      { speaker: '???', text: '아이템은 일회용이야. 상점에서 RP로 사고, 적절한 타이밍에 써.' },
      { speaker: '???', text: '비상자금은 현금 부족할 때, 투자 보험은 손실 클 때, 변동성 방어막은...' },
      { speaker: '???', text: '뭐, 이름 보면 대충 알 거야. 직접 써보면서 감 잡아.' },
      { speaker: '???', text: '그럼 건투를 빌어, 인턴. 언제든 다시 와.' },
    ],
  },
]

export function GuidePage() {
  const [selectedSection, setSelectedSection] = useState<string>('basics')
  const [lineIndex, setLineIndex] = useState(0)
  const [displayedText, setDisplayedText] = useState('')
  const [isTyping, setIsTyping] = useState(true)

  const section = GUIDE_DATA.find(s => s.id === selectedSection)!
  const currentLine = section.lines[lineIndex]
  const isLastLine = lineIndex >= section.lines.length - 1

  // 타이핑 효과
  useEffect(() => {
    if (!currentLine) return
    setIsTyping(true)
    setDisplayedText('')
    let i = 0
    const interval = setInterval(() => {
      if (i <= currentLine.text.length) {
        setDisplayedText(currentLine.text.slice(0, i))
        if (i > 0 && currentLine.text[i - 1] !== ' ') SFX.dialogueBlip()
        i++
      } else {
        setIsTyping(false)
        clearInterval(interval)
      }
    }, 25)
    return () => clearInterval(interval)
  }, [selectedSection, lineIndex])

  const handleClick = useCallback(() => {
    if (isTyping) {
      // 타이핑 중 클릭 → 전체 표시
      setDisplayedText(currentLine.text)
      setIsTyping(false)
      return
    }
    // 다음 대사
    if (!isLastLine) {
      setLineIndex(i => i + 1)
    }
  }, [isTyping, isLastLine, currentLine])

  const handleSelectSection = useCallback((id: string) => {
    setSelectedSection(id)
    setLineIndex(0)
  }, [])

  return (
    <div className="guide-page">
      {/* 왼쪽: 카테고리 목차 */}
      <div className="guide-toc">
        <div className="guide-toc-header">가이드</div>
        {GUIDE_DATA.map(sec => (
          <button
            key={sec.id}
            className={`guide-section-btn ${selectedSection === sec.id ? 'guide-section-btn--active' : ''}`}
            style={{ '--section-color': sec.color } as React.CSSProperties}
            onClick={() => handleSelectSection(sec.id)}
          >
            <span className="guide-section-icon">{sec.numeral}</span>
            <span className="guide-section-title">{sec.title}</span>
          </button>
        ))}
      </div>

      {/* 오른쪽: 대화 뷰 */}
      <div className="guide-dialogue" onClick={handleClick}>
        {/* 섹션 타이틀 */}
        <div className="guide-dialogue-header" style={{ color: section.color }}>
          {section.numeral}. {section.title}
        </div>

        {/* 대화 로그 (이전 대사들) */}
        <div className="guide-dialogue-log">
          {section.lines.slice(0, lineIndex).map((line, i) => (
            <div key={i} className="guide-log-line">
              <span className="guide-log-speaker">{line.speaker}</span>
              <span className="guide-log-text">{line.text}</span>
            </div>
          ))}
        </div>

        {/* 현재 대사 (타이핑 중) */}
        {currentLine && (
          <motion.div
            key={`${selectedSection}-${lineIndex}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="guide-current-line"
          >
            <div className="guide-current-speaker">{currentLine.speaker}</div>
            <div className="guide-current-text">
              {displayedText}
              {isTyping && (
                <motion.span
                  animate={{ opacity: [1, 0] }}
                  transition={{ duration: 0.4, repeat: Infinity }}
                  className="guide-cursor"
                >_</motion.span>
              )}
            </div>
          </motion.div>
        )}

        {/* 하단 힌트 */}
        <div className="guide-dialogue-hint">
          {isTyping
            ? '클릭하면 전체 표시'
            : isLastLine
              ? '왼쪽에서 다른 카테고리를 선택하세요'
              : '클릭하면 계속 ▶'
          }
          <span className="guide-progress">{lineIndex + 1} / {section.lines.length}</span>
        </div>
      </div>
    </div>
  )
}
