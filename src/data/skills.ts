import type { Skill } from './types'

export const SKILLS: Skill[] = [
  // ===== 분석 스킬 =====
  {
    id: 'technical_analysis',
    name: '기술적 분석',
    description: '차트에 이동평균선을 표시합니다',
    category: 'analysis',
    cost: 15,
    icon: '📊',
    maxLevel: 1,
    effect: { type: 'show_moving_average' },
  },
  {
    id: 'deep_news',
    name: '심층 뉴스',
    description: '뉴스의 숨겨진 영향도를 공개합니다',
    category: 'analysis',
    cost: 16,
    icon: '📰',
    maxLevel: 1,
    effect: { type: 'reveal_news_impact' },
  },
  {
    id: 'insider_info',
    name: '내부자 정보',
    description: '다음 턴 주가 방향 힌트를 제공합니다',
    category: 'analysis',
    cost: 25,
    icon: '🔍',
    maxLevel: 1,
    prerequisiteId: 'deep_news',
    effect: { type: 'next_turn_hint' },
  },
  {
    id: 'sector_analysis',
    name: '섹터 분석',
    description: '섹터 전체 트렌드를 표시합니다',
    category: 'analysis',
    cost: 15,
    icon: '📈',
    maxLevel: 1,
    effect: { type: 'sector_trend' },
  },

  // ===== 정보 리터러시 스킬 =====
  {
    id: 'fact_check',
    name: '팩트체크',
    description: '뉴스의 신뢰도 등급을 표시합니다 (높음/보통/의심)',
    category: 'literacy',
    cost: 20,
    icon: '🔎',
    maxLevel: 3,
    effect: { type: 'fact_check', accuracy: 0.6 },
  },
  {
    id: 'source_tracking',
    name: '출처 추적',
    description: '뉴스 출처를 확인하여 가짜 뉴스 확률을 표시합니다',
    category: 'literacy',
    cost: 12,
    icon: '🕵️',
    maxLevel: 1,
    effect: { type: 'source_tracking' },
  },
  {
    id: 'conflict_detection',
    name: '이해충돌 탐지',
    description: '애널리스트 의견의 이해충돌 여부를 공개합니다',
    category: 'literacy',
    cost: 20,
    icon: '📋',
    maxLevel: 1,
    prerequisiteId: 'source_tracking',
    effect: { type: 'conflict_detection' },
  },
  {
    id: 'bias_warning',
    name: '편향 인식',
    description: '확증 편향 함정 발동 시 경고를 표시합니다',
    category: 'literacy',
    cost: 20,
    icon: '🧠',
    maxLevel: 1,
    effect: { type: 'bias_warning' },
  },
  {
    id: 'stale_detection',
    name: '선반영 감지',
    description: '이미 반영된 뒷북 뉴스를 감지하여 표시합니다',
    category: 'literacy',
    cost: 20,
    icon: '⏰',
    maxLevel: 1,
    prerequisiteId: 'fact_check',
    effect: { type: 'stale_detection' },
  },

  // ===== 투자 스킬 =====
  {
    id: 'leverage',
    name: '레버리지',
    description: '2배 레버리지 투자가 가능합니다',
    category: 'investment',
    cost: 35,
    icon: '💰',
    maxLevel: 1,
    effect: { type: 'leverage', multiplier: 2 },
  },
  {
    id: 'short_selling',
    name: '공매도',
    description: '하락에 베팅할 수 있습니다',
    category: 'investment',
    cost: 30,
    icon: '📉',
    maxLevel: 1,
    effect: { type: 'short_selling' },
  },
  {
    id: 'double_trade',
    name: '고빈도 매매',
    description: '한 턴에 2번 거래할 수 있습니다',
    category: 'investment',
    cost: 25,
    icon: '⚡',
    maxLevel: 1,
    effect: { type: 'double_trade' },
  },
  {
    id: 'stop_loss',
    name: '손절매',
    description: '자동 손절 설정이 가능합니다 (-10% 이하 자동 매도)',
    category: 'investment',
    cost: 20,
    icon: '🛡️',
    maxLevel: 1,
    effect: { type: 'stop_loss', threshold: -0.10 },
  },

  // ===== 패시브 스킬 =====
  {
    id: 'dividend',
    name: '배당 수익',
    description: '보유 주식에서 매 턴 0.5% 배당금을 받습니다',
    category: 'passive',
    cost: 18,
    icon: '💵',
    maxLevel: 3,
    effect: { type: 'dividend', rate: 0.005 },
  },
  {
    id: 'intuition',
    name: '직감',
    description: '15% 확률로 정확한 예측 힌트를 제공합니다',
    category: 'passive',
    cost: 20,
    icon: '🎯',
    maxLevel: 2,
    effect: { type: 'intuition', chance: 0.15 },
  },
  {
    id: 'interest',
    name: '이자 수익 강화',
    description: '이자 수익 한도가 턴당 $10에서 $25로 증가합니다',
    category: 'passive',
    cost: 10,
    icon: '🏦',
    maxLevel: 3,
    effect: { type: 'interest', rate: 0.002 },
  },
]

export function getSkillById(id: string): Skill | undefined {
  return SKILLS.find((s) => s.id === id)
}

export function getSkillsByCategory(category: string): Skill[] {
  return SKILLS.filter((s) => s.category === category)
}

export const SKILL_CATEGORY_LABELS: Record<string, string> = {
  analysis: '분석',
  literacy: '정보 리터러시',
  investment: '투자',
  passive: '패시브',
}
