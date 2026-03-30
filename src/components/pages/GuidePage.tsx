import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'

/**
 * 인게임 가이드 메뉴
 *
 * 기존 스포트라이트 튜토리얼과 동일한 디자인 언어 사용:
 * - 골드 테두리 + 글로우
 * - 타이핑 느낌의 텍스트
 * - 어두운 반투명 배경
 *
 * 유저가 언제든 사이드바에서 접근 가능.
 * 카테고리별로 정리된 상세 가이드.
 */

interface GuideEntry {
  id: string
  title: string
  content: string
  tips?: string[]
}

interface GuideSection {
  id: string
  icon: string
  title: string
  color: string
  entries: GuideEntry[]
}

const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: 'basics',
    icon: 'I',
    title: '기본 규칙',
    color: '#f0b429',
    entries: [
      {
        id: 'objective',
        title: '게임 목표',
        content: '당신은 증권사 인턴입니다. 8분기 동안 매 분기 목표 수익률을 달성해야 합니다. 1분기 목표는 5%로 낮지만, 분기가 올라갈수록 난이도가 치솟습니다.',
        tips: ['목표 미달성 시 게임 오버', '8분기 모두 클리어하면 정규직 달성'],
      },
      {
        id: 'time',
        title: '시간 시스템',
        content: '게임은 실시간으로 진행됩니다. 1분기 = 13주, 1주 = 약 70초(1배속 기준). 장 시간(9:00-16:00)에만 주가가 움직이고 거래할 수 있습니다.',
        tips: ['일시정지(Pause) 중에도 뉴스 읽기와 분석 가능', '속도 조절: 1x / 2x / 4x'],
      },
      {
        id: 'rp',
        title: 'RP (평판 포인트)',
        content: 'RP는 스킬과 아이템을 구매하는 화폐입니다. 매주 종료 시 기본 5RP + 보너스를 획득합니다.',
        tips: ['보유 종목당 +1 RP (최대 5)', '주간 수익률 양수면 +3 RP', '가짜뉴스 회피 시 +2 RP'],
      },
    ],
  },
  {
    id: 'trading',
    icon: 'II',
    title: '매매 가이드',
    color: '#5ec269',
    entries: [
      {
        id: 'buy_sell',
        title: '매수와 매도',
        content: '종목을 선택하고 수량을 입력한 뒤 매수/매도 버튼을 누르세요. 25%, 50%, 전량 버튼으로 빠르게 수량을 설정할 수 있습니다.',
        tips: ['거래 수수료 0.5% (환율 헤지 스킬 시 0.2%)', '매수 = 싸게 사서 비싸게 팔기', '매도 = 보유 주식 팔기'],
      },
      {
        id: 'short',
        title: '공매도',
        content: '주가가 떨어질 것 같을 때 사용합니다. 주식을 빌려서 팔고, 나중에 싸게 사서 갚습니다. 공매도 스킬 언락 필요.',
        tips: ['마진 150% 필요 (빌린 금액의 1.5배)', '주가 30% 이상 오르면 마진콜 (강제 청산)', '일일 대여료 0.02% 발생'],
      },
      {
        id: 'leverage',
        title: '레버리지',
        content: '자기자본의 N배로 매수합니다. 수익도 N배, 손실도 N배. 레버리지 스킬 언락 필요.',
        tips: ['2배: 청산가 = 매입가의 55%', '5배: 청산가 = 매입가의 82%', '10배: 청산가 = 매입가의 91%', '일일 이자 발생'],
      },
      {
        id: 'orders',
        title: '지정가 주문',
        content: '미리 가격과 수량을 정해두면, 해당 가격에 도달했을 때 자동으로 체결됩니다.',
        tips: ['지정가 매수: 목표가 이하에서 자동 매수', '지정가 매도: 목표가 이상에서 자동 매도', '손절매: 지정가 이하로 떨어지면 매도', '익절매: 지정가 이상이면 매도'],
      },
      {
        id: 'sectors',
        title: '섹터와 분산투자',
        content: '종목은 5개 섹터(기술/에너지/금융/소비재/헬스케어)로 나뉩니다. 한 섹터에 집중하면 위험, 여러 섹터에 분산하면 안전합니다.',
        tips: ['ETF = 섹터 평균을 추종하는 안전한 선택', '포트폴리오 헤지 스킬: 3섹터 이상 보유 시 손실 -20%'],
      },
    ],
  },
  {
    id: 'news',
    icon: 'III',
    title: '뉴스 읽기',
    color: '#5b9bd5',
    entries: [
      {
        id: 'sources',
        title: '뉴스 출처와 신뢰도',
        content: '모든 뉴스가 진실은 아닙니다. 출처에 따라 신뢰도가 다릅니다.',
        tips: ['공영방송/경제전문지: 신뢰도 높음', '애널리스트/내부자: 신뢰도 보통', 'SNS/익명 블로그: 신뢰도 낮음', '팩트체크 스킬로 등급 확인 가능'],
      },
      {
        id: 'fake_news',
        title: '가짜 뉴스 종류',
        content: '시장에는 다양한 가짜 뉴스가 돌아다닙니다. 이를 구별하는 것이 핵심 능력입니다.',
        tips: ['펌프앤덤프: 가격 올려놓고 팔기', 'FUD: 공포를 퍼뜨려 가격 낮추기', '루머: 확인되지 않은 소문', '뒷북 뉴스: 이미 반영된 오래된 정보'],
      },
      {
        id: 'impact',
        title: '뉴스의 시장 영향',
        content: '뉴스는 특정 섹터에 영향을 줍니다. 뉴스 상세에서 예상 섹터 영향과 인과관계를 확인할 수 있습니다.',
        tips: ['심층 뉴스 스킬: 실제 영향 vs 인지된 영향 비교', '체인 이벤트: 일부 뉴스는 후속 영향이 있음', '속보는 즉시 반응하되, 판단은 신중하게'],
      },
      {
        id: 'noise',
        title: '시장 소음',
        content: '모든 뉴스가 시장에 영향을 주진 않습니다. 소음 뉴스를 걸러내는 것도 중요한 능력입니다.',
        tips: ['노이즈 필터 스킬: 소음 뉴스 자동 식별', '뉴스 페이지에서 소음은 접기 가능 섹션에 표시'],
      },
    ],
  },
  {
    id: 'social',
    icon: 'IV',
    title: '여론과 경제지표',
    color: '#e88c3a',
    entries: [
      {
        id: 'opinion',
        title: 'SNS 여론',
        content: '사회 탭에서 사람들의 게시글을 읽을 수 있습니다. 시장 분위기를 간접적으로 파악하는 데 도움이 됩니다.',
        tips: ['여론이 항상 맞는 것은 아님', '루머와 팩트를 구분해야 함', '여론 분석 스킬: 루머 경고 표시'],
      },
      {
        id: 'indicators',
        title: '경제 지표',
        content: 'GDP, 실업률, 기준금리, 물가 등 경제 지표가 표시됩니다. 이 숫자들이 시장에 어떤 영향을 주는지 스스로 판단해야 합니다.',
        tips: ['금리 인상 = 보통 주가 하락', '실업률 상승 = 경기 둔화 신호', '제조업 PMI > 50 = 확장, < 50 = 위축'],
      },
    ],
  },
  {
    id: 'skills',
    icon: 'V',
    title: '스킬과 아이템',
    color: '#9b72cf',
    entries: [
      {
        id: 'skill_system',
        title: '스킬 시스템',
        content: 'RP로 스킬을 언락하면 영구적으로 적용됩니다. 분석, 리터러시, 투자, 패시브 4개 카테고리가 있습니다.',
        tips: ['일부 스킬은 선행 스킬 필요', '분석 스킬: 차트/뉴스 정보 강화', '투자 스킬: 공매도/레버리지/손절매 언락', '패시브 스킬: 수수료 감소/이자 강화'],
      },
      {
        id: 'items',
        title: '아이템',
        content: '아이템은 일회용입니다. 상점에서 RP로 구매하고, 적절한 타이밍에 사용하세요.',
        tips: ['비상자금: 현금 부족 시 $2,000 지급', '투자 보험: 손실 50% 보전', '변동성 방어막: 1주 최대 손실 -5% 제한'],
      },
    ],
  },
]

export function GuidePage() {
  const [expandedSection, setExpandedSection] = useState<string | null>('basics')
  const [selectedEntry, setSelectedEntry] = useState<string | null>(null)

  const currentSection = GUIDE_SECTIONS.find(s => s.id === expandedSection)
  const currentEntry = currentSection?.entries.find(e => e.id === selectedEntry)

  return (
    <div className="guide-page">
      {/* 왼쪽: 목차 */}
      <div className="guide-toc">
        <div className="guide-toc-header">가이드</div>
        {GUIDE_SECTIONS.map(section => (
          <div key={section.id}>
            <button
              className={`guide-section-btn ${expandedSection === section.id ? 'guide-section-btn--active' : ''}`}
              style={{ '--section-color': section.color } as React.CSSProperties}
              onClick={() => {
                setExpandedSection(expandedSection === section.id ? null : section.id)
                setSelectedEntry(null)
              }}
            >
              <span className="guide-section-icon">{section.icon}</span>
              <span className="guide-section-title">{section.title}</span>
              <span className="guide-section-arrow">{expandedSection === section.id ? '▼' : '▶'}</span>
            </button>

            <AnimatePresence>
              {expandedSection === section.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="guide-entries"
                >
                  {section.entries.map(entry => (
                    <button
                      key={entry.id}
                      className={`guide-entry-btn ${selectedEntry === entry.id ? 'guide-entry-btn--active' : ''}`}
                      onClick={() => setSelectedEntry(entry.id)}
                    >
                      {entry.title}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>

      {/* 오른쪽: 상세 내용 */}
      <div className="guide-detail">
        {currentEntry ? (
          <motion.div
            key={currentEntry.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="guide-detail-content"
          >
            <div className="guide-detail-section-label" style={{ color: currentSection?.color }}>
              {currentSection?.icon}. {currentSection?.title}
            </div>
            <h2 className="guide-detail-title">{currentEntry.title}</h2>
            <p className="guide-detail-text">{currentEntry.content}</p>

            {currentEntry.tips && currentEntry.tips.length > 0 && (
              <div className="guide-tips">
                <div className="guide-tips-label">TIP</div>
                {currentEntry.tips.map((tip, i) => (
                  <div key={i} className="guide-tip-item">
                    <span className="guide-tip-bullet">-</span>
                    <span>{tip}</span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        ) : (
          <div className="guide-detail-empty">
            <div className="guide-detail-empty-icon">?</div>
            <div className="guide-detail-empty-text">항목을 선택하세요</div>
            <div className="guide-detail-empty-sub">왼쪽 목차에서 알고 싶은 내용을 클릭하세요</div>
          </div>
        )}
      </div>
    </div>
  )
}
