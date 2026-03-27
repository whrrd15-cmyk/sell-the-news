import type { SpecialEvent } from './types'

// ===== 선택 이벤트 =====
export const CHOICE_EVENTS: SpecialEvent[] = [
  {
    id: 'insider_trade_tip',
    type: 'choice',
    title: '내부자 거래 제보',
    description: '익명의 제보자가 한 대기업의 미공개 실적 정보를 알려주겠다고 접근했습니다. 이 정보를 활용하면 큰 수익을 얻을 수 있지만, 내부자 거래는 불법입니다.',
    icon: '🕵️',
    choices: [
      {
        label: '거절한다',
        description: '법과 윤리를 지킵니다',
        effect: {
          rp: 5,
          educationalNote: '내부자 거래는 자본시장법 위반으로 형사처벌 대상입니다. 정보의 비대칭을 이용한 거래는 시장의 공정성을 해칩니다. 올바른 선택입니다!',
        },
      },
      {
        label: '활용한다',
        description: '리스크를 감수하고 수익을 노립니다',
        effect: {
          cashPercent: -0.1,
          rp: -3,
          educationalNote: '내부자 거래가 적발되어 벌금이 부과되었습니다. 실제로 내부자 거래 적발 시 부당이득의 3~5배 과징금과 징역형을 받을 수 있습니다.',
        },
      },
    ],
  },
  {
    id: 'sector_rotation_hint',
    type: 'choice',
    title: '섹터 로테이션 기회',
    description: '시장 분석가들이 자금이 기술주에서 에너지주로 이동하고 있다고 합니다. 포트폴리오를 조정할 기회입니다.',
    icon: '🔄',
    choices: [
      {
        label: '에너지주로 이동',
        description: '트렌드를 따릅니다',
        effect: {
          sectorImpacts: [
            { sector: 'energy', impact: 0.08, duration: 3 },
            { sector: 'tech', impact: -0.05, duration: 3 },
          ],
          educationalNote: '섹터 로테이션은 경기 사이클에 따라 자금이 섹터 간 이동하는 현상입니다. 경기 확장기에는 기술→에너지→소비재 순으로 이동하는 경향이 있습니다.',
        },
      },
      {
        label: '현재 포지션 유지',
        description: '장기 투자 원칙을 지킵니다',
        effect: {
          rp: 2,
          educationalNote: '단기 트렌드에 휩쓸리지 않고 장기 투자 원칙을 유지하는 것도 중요한 전략입니다. 잦은 매매는 수수료 비용을 증가시킵니다.',
        },
      },
      {
        label: '분산 투자',
        description: '여러 섹터에 고르게 분배합니다',
        effect: {
          rp: 3,
          educationalNote: '분산 투자는 리스크를 줄이는 가장 기본적인 전략입니다. "달걀을 한 바구니에 담지 마라"는 투자의 기본 원칙입니다.',
        },
      },
    ],
  },
  {
    id: 'ipo_opportunity',
    type: 'choice',
    title: 'IPO 참여 기회',
    description: '유망 스타트업이 상장을 앞두고 있습니다. 공모가 대비 상장 초기 급등이 예상되지만, 신규 상장주는 변동성이 매우 큽니다.',
    icon: '🚀',
    choices: [
      {
        label: '적극 참여',
        description: '자금의 20%를 투자합니다',
        effect: {
          cashPercent: 0.08,
          educationalNote: 'IPO 투자는 높은 수익 가능성이 있지만, 상장 첫날 하락하는 경우도 많습니다. 실제 IPO 시장에서는 공모가를 배정받기 어려운 경우가 대부분입니다.',
        },
      },
      {
        label: '소극적 참여',
        description: '자금의 5%만 투자합니다',
        effect: {
          cashPercent: 0.02,
          rp: 1,
          educationalNote: '적절한 리스크 관리입니다. IPO 투자 시에는 기업의 재무제표, 성장성, 경쟁 환경을 꼼꼼히 분석해야 합니다.',
        },
      },
      {
        label: '관망',
        description: '상장 후 안정화를 기다립니다',
        effect: {
          rp: 2,
          educationalNote: '"상장 후 관망"은 신중한 투자자의 전략입니다. 상장 초기 변동성이 가라앉은 후 기업 가치를 냉정하게 평가할 수 있습니다.',
        },
      },
    ],
  },
  {
    id: 'margin_call_risk',
    type: 'choice',
    title: '추가 담보 요구',
    description: '시장이 급락하면서 레버리지 투자자들에게 추가 담보(마진콜)가 요구되고 있습니다. 시장에 공포가 확산되고 있습니다.',
    icon: '⚠️',
    choices: [
      {
        label: '공포에 매수',
        description: '"남들이 공포에 팔 때 사라"',
        effect: {
          sectorImpacts: [{ sector: 'all', impact: 0.05, duration: 4 }],
          rp: 3,
          educationalNote: '"Be fearful when others are greedy, be greedy when others are fearful" — 워런 버핏. 시장 공포 시 우량주를 저가에 매수하는 것은 장기적으로 좋은 전략일 수 있습니다.',
        },
      },
      {
        label: '방어적 자세',
        description: '현금 비중을 높이고 기다립니다',
        effect: {
          rp: 2,
          educationalNote: '시장 급락기에 현금을 확보하고 기다리는 것도 현명한 전략입니다. 추가 하락에 대비한 리스크 관리가 중요합니다.',
        },
      },
    ],
  },
  {
    id: 'dividend_reinvest',
    type: 'choice',
    title: '배당금 재투자',
    description: '보유 주식에서 배당금이 지급되었습니다. 배당금을 어떻게 활용하시겠습니까?',
    icon: '💰',
    choices: [
      {
        label: '같은 종목에 재투자',
        description: '복리 효과를 극대화합니다',
        effect: {
          rp: 2,
          cashPercent: 0.02,
          educationalNote: '배당금 재투자는 복리 효과를 누릴 수 있는 전략입니다. 장기적으로 배당 재투자가 총 수익률을 크게 높인다는 연구 결과가 많습니다.',
        },
      },
      {
        label: '현금으로 보유',
        description: '유동성을 확보합니다',
        effect: {
          cash: 200,
          educationalNote: '배당금을 현금으로 보유하면 새로운 투자 기회가 생길 때 활용할 수 있습니다. 포트폴리오의 현금 비중도 중요한 전략적 요소입니다.',
        },
      },
    ],
  },
]

// ===== 경제 퀴즈 =====
export const QUIZ_EVENTS: SpecialEvent[] = [
  {
    id: 'quiz_interest_rate',
    type: 'quiz',
    title: '경제 상식 퀴즈',
    description: '투자 지식을 테스트해봅시다!',
    icon: '📝',
    question: '중앙은행이 기준금리를 인상하면 일반적으로 주가는 어떻게 될까요?',
    options: ['상승한다', '하락한다', '변화 없다', '금리와 무관하다'],
    correctIndex: 1,
    explanation: '금리 인상 시 기업의 차입 비용이 증가하고, 채권 등 안전자산의 매력이 높아져 주식에서 자금이 이탈합니다. 따라서 일반적으로 주가는 하락합니다.',
    rewardRP: 3,
  },
  {
    id: 'quiz_per',
    type: 'quiz',
    title: '경제 상식 퀴즈',
    description: '투자 용어를 알아봅시다!',
    icon: '📝',
    question: 'PER(주가수익비율)이 높다는 것은 무엇을 의미할까요?',
    options: ['기업이 저평가되어 있다', '기업이 고평가되어 있다', '기업의 부채가 많다', '기업의 매출이 높다'],
    correctIndex: 1,
    explanation: 'PER = 주가 / 주당순이익(EPS). PER이 높으면 이익 대비 주가가 비싸다는 뜻으로, 시장이 미래 성장을 기대하고 있거나 과대평가된 것일 수 있습니다.',
    rewardRP: 3,
  },
  {
    id: 'quiz_diversification',
    type: 'quiz',
    title: '경제 상식 퀴즈',
    description: '투자 원칙을 확인해봅시다!',
    icon: '📝',
    question: '분산 투자의 가장 큰 장점은 무엇일까요?',
    options: ['수익률 극대화', '리스크 감소', '세금 절약', '거래 비용 절감'],
    correctIndex: 1,
    explanation: '분산 투자는 개별 종목의 위험을 줄여줍니다. 한 종목이 하락해도 다른 종목이 이를 상쇄할 수 있어 전체 포트폴리오의 변동성을 낮춥니다.',
    rewardRP: 3,
  },
  {
    id: 'quiz_inflation',
    type: 'quiz',
    title: '경제 상식 퀴즈',
    description: '거시경제를 이해해봅시다!',
    icon: '📝',
    question: '인플레이션이 심할 때 가장 유리한 자산은?',
    options: ['현금', '채권', '실물자산(금, 부동산)', '정기예금'],
    correctIndex: 2,
    explanation: '인플레이션 시 화폐 가치가 하락하므로 현금과 채권은 실질 가치가 줄어듭니다. 반면 금, 부동산 등 실물자산은 인플레이션 헤지 수단으로 활용됩니다.',
    rewardRP: 3,
  },
  {
    id: 'quiz_bull_bear',
    type: 'quiz',
    title: '경제 상식 퀴즈',
    description: '시장 용어를 배워봅시다!',
    icon: '📝',
    question: '"Bear Market(약세장)"의 일반적인 정의는?',
    options: ['고점 대비 10% 하락', '고점 대비 20% 이상 하락', '3개월 연속 하락', '거래량이 감소한 시장'],
    correctIndex: 1,
    explanation: '일반적으로 주가 지수가 고점 대비 20% 이상 하락하면 "약세장(Bear Market)"이라고 합니다. 10% 하락은 "조정(Correction)"이라고 부릅니다.',
    rewardRP: 3,
  },
  {
    id: 'quiz_fake_news',
    type: 'quiz',
    title: '정보 리터러시 퀴즈',
    description: '가짜 뉴스를 판별하는 능력을 테스트합니다!',
    icon: '🔎',
    question: '다음 중 가짜 뉴스의 특징이 아닌 것은?',
    options: ['자극적인 헤드라인', '익명의 출처', '구체적인 데이터와 출처 명시', '감정에 호소하는 표현'],
    correctIndex: 2,
    explanation: '신뢰할 수 있는 뉴스는 구체적인 데이터, 명확한 출처, 다수의 교차 검증을 포함합니다. 가짜 뉴스는 감정적 표현과 모호한 출처가 특징입니다.',
    rewardRP: 3,
  },
]

// ===== 블랙스완 이벤트 =====
export const BLACK_SWAN_EVENTS: SpecialEvent[] = [
  {
    id: 'black_swan_crash',
    type: 'black_swan',
    title: '글로벌 금융 시스템 위기',
    description: '주요 국제 금융기관의 연쇄 파산 위기가 발생했습니다. 전 세계 증시가 동반 폭락하고 있습니다. 시장 서킷브레이커가 발동되었습니다.',
    icon: '💥',
    sectorImpacts: [{ sector: 'all', impact: -0.20, duration: 6 }],
    magnitude: 'negative',
  },
  {
    id: 'black_swan_tech_boom',
    type: 'black_swan',
    title: '혁명적 기술 발표',
    description: '상용 핵융합 발전이 성공했다는 발표가 나왔습니다. 에너지 혁명이 시작되며 관련 기술주가 급등하고, 전통 에너지 기업은 급락하고 있습니다.',
    icon: '⚡',
    sectorImpacts: [
      { sector: 'tech', impact: 0.25, duration: 8 },
      { sector: 'energy', impact: -0.15, duration: 8 },
      { sector: 'healthcare', impact: 0.05, duration: 4 },
    ],
    magnitude: 'positive',
  },
  {
    id: 'black_swan_pandemic',
    type: 'black_swan',
    title: '글로벌 팬데믹 선언',
    description: '세계보건기구(WHO)가 새로운 전염병에 대해 팬데믹을 선언했습니다. 각국 봉쇄 조치가 발동되며 시장이 패닉에 빠졌습니다.',
    icon: '🦠',
    sectorImpacts: [
      { sector: 'all', impact: -0.15, duration: 8 },
      { sector: 'healthcare', impact: 0.20, duration: 6 },
      { sector: 'consumer', impact: -0.10, duration: 6 },
    ],
    magnitude: 'negative',
  },
  {
    id: 'black_swan_peace',
    type: 'black_swan',
    title: '전격 평화 협정',
    description: '오랜 지정학적 갈등이 전격적인 평화 협정으로 해소되었습니다. 글로벌 불확실성이 해소되며 시장에 낙관론이 퍼지고 있습니다.',
    icon: '🕊️',
    sectorImpacts: [
      { sector: 'all', impact: 0.12, duration: 6 },
      { sector: 'consumer', impact: 0.08, duration: 4 },
    ],
    magnitude: 'positive',
  },
]

/** 턴과 런 설정에 따라 특수 이벤트 발생 여부 결정 */
export function rollSpecialEvent(
  turn: number,
  runNumber: number,
  usedSpecialIds: Set<string>,
): SpecialEvent | null {
  // 시드 기반 랜덤
  let seed = turn * 7919 + runNumber * 31
  const rng = () => {
    seed = (seed * 1664525 + 1013904223) & 0xffffffff
    return (seed >>> 0) / 0xffffffff
  }

  // 매 4~6턴마다 이벤트 발생 가능 (턴 5부터)
  if (turn < 5) return null
  if (turn % 4 !== 0 && turn % 5 !== 0 && turn % 7 !== 0) return null

  const roll = rng()

  // 블랙스완: 2% 확률 (런 3+)
  if (roll < 0.02 && runNumber >= 3) {
    const available = BLACK_SWAN_EVENTS.filter(e => !usedSpecialIds.has(e.id))
    if (available.length > 0) {
      return available[Math.floor(rng() * available.length)]
    }
  }

  // 선택 이벤트: 40% 확률
  if (roll < 0.42) {
    const available = CHOICE_EVENTS.filter(e => !usedSpecialIds.has(e.id))
    if (available.length > 0) {
      return available[Math.floor(rng() * available.length)]
    }
  }

  // 퀴즈는 인게임에서 제거 → 상점 대출 시스템으로 이전

  return null
}
