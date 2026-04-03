// ============ 실시간 시간 시스템 ============

export interface GameTime {
  week: number          // 1-13 (분기 내 주차)
  day: number           // 1-5 (월-금)
  hour: number          // 9-17 (장시간)
  minute: number        // 0-59
  tickCount: number     // 분기 시작부터 누적 틱 수 (시드 RNG용)
  totalSeconds: number  // 분기 시작부터 경과한 게임 내 초
}

export type TimeSpeed = 'paused' | '1x' | '2x' | '4x'

export interface MarketSession {
  isOpen: boolean       // 장중 (9:00-16:00)
  preMarket: boolean    // 프리마켓 (8:00-9:00)
  afterHours: boolean   // 애프터 (16:00-17:00)
}

// ============ 공매도/레버리지/지정가 ============

export interface ShortPosition {
  id: string
  stockId: string
  shares: number
  entryPrice: number
  borrowFeeRate: number    // 일일 대여료율 (기본 0.0002 = 0.02%)
  accruedFees: number
}

export interface LeveragedPosition {
  id: string
  stockId: string
  shares: number
  avgBuyPrice: number
  leverage: 2 | 5 | 10
  borrowedAmount: number
  dailyInterestRate: number // 2x: 0.0001, 5x: 0.0002, 10x: 0.0005
  accruedInterest: number
  liquidationPrice: number
}

export type OrderType = 'buy_limit' | 'sell_limit' | 'stop_loss' | 'take_profit'
export type TimeInForce = 'day' | 'week' | 'gtc'

export interface LimitOrder {
  id: string
  stockId: string
  type: OrderType
  targetPrice: number
  shares: number
  timeInForce: TimeInForce
  createdAt: number        // tickCount at creation
}

// ============ 시장 상황 ============

export type MarketCondition = 'bull_trend' | 'range_bound' | 'bear_market' | 'neutral'

// ============ 자동 매매 ============

export interface AutoTradeRule {
  id: string
  type: 'stop_loss' | 'trailing_stop' | 'dca' | 'rebalance'
  stockId: string
  params: {
    threshold?: number       // stop_loss: -0.10, trailing_stop: +0.10
    dcaAmount?: number       // DCA 1회 매수 금액
    dcaBasePrice?: number    // DCA 기준 가격
    portionsBought?: number  // DCA 완료 횟수
    maxPortions?: number     // DCA 총 분할 수
    rangeHigh?: number       // 리밸런싱 상단
    rangeLow?: number        // 리밸런싱 하단
    remainingTurns?: number  // 아이템용 (n턴 자동매수)
  }
}

export interface AutoTradeResult {
  executedTrades: { stockId: string; action: 'buy' | 'sell'; shares: number; price: number; rule: string }[]
  educationalNotes: string[]
}

// ============ 자산 관련 ============

export type Sector = 'tech' | 'energy' | 'finance' | 'consumer' | 'healthcare'

export interface Stock {
  id: string
  name: string
  ticker: string
  sector: Sector
  basePrice: number
  volatility: number       // 0.0 ~ 1.0
  newsSensitivity: number  // 뉴스에 대한 민감도
  description: string
  isETF: boolean
}

// ============ 뉴스 관련 ============

export type NewsSource =
  | 'official'      // 공영방송 - 높은 신뢰도
  | 'financial'     // 경제 전문지 - 높은 신뢰도
  | 'analyst'       // 애널리스트 리포트 - 보통
  | 'social'        // SNS - 낮은 신뢰도
  | 'anonymous'     // 익명 블로그 - 매우 낮은
  | 'insider'       // 내부자 제보 - 불확실

export type FakeNewsType =
  | 'rumor'           // 단순 루머
  | 'pump_and_dump'   // 펌프 앤 덤프
  | 'fud'             // 공포/불확실성/의심
  | 'stale_news'      // 뒷북 뉴스
  | 'bias_trap'       // 확증 편향 함정
  | 'conflict'        // 이해충돌 리포트

export type EventCategory =
  | 'government'    // 정부/정책
  | 'geopolitics'   // 지정학/전쟁
  | 'economic'      // 경제/금융 위기
  | 'technology'    // 기술/산업 혁신
  | 'disaster'      // 자연재해/팬데믹
  | 'social'        // 사회/문화
  | 'commodity'     // 원자재/에너지/환율

export interface SectorImpact {
  sector: Sector | 'all'
  impact: number           // -1.0 ~ 1.0 (음수: 하락, 양수: 상승)
  duration: number         // 영향 지속 턴 수
}

export interface NewsCard {
  id: string
  headline: string
  content: string             // 요약 (리스트 뷰)
  body?: string               // 전문 기사 (확장 뷰)
  source: NewsSource
  category: EventCategory
  reliability: number         // 0.0 ~ 1.0
  isReal: boolean
  actualImpact: SectorImpact[]
  perceivedImpact: SectorImpact[]
  educationalNote: string
  fakeType?: FakeNewsType
  chainEventId?: string       // 연쇄 이벤트 ID
  chainDelay?: number         // 연쇄 이벤트까지 턴 수
  isNoise?: boolean           // 시장에 실질적 영향 없는 노이즈 뉴스
}

// ============ 뉴스 판단 ============

export type JudgmentType = 'bullish' | 'bearish' | 'fake' | 'skip'
export type JudgmentAccuracy = 'direction' | 'strength' | 'fake_correct' | 'wrong' | 'skipped'

export interface NewsJudgment {
  newsId: string
  type: JudgmentType
  sliderValue: number       // -1.0 (강한 악재) ~ +1.0 (강한 호재), fake/skip은 0
  rpEarned: number          // 결과 페이즈에서 산출
  accuracy: JudgmentAccuracy | null
}

// ============ 이벤트 정의 (풀에서 생성하는 원본) ============

export interface EventTemplate {
  id: string
  headline: string
  content: string               // 요약
  body?: string                 // 전문 기사
  category: EventCategory
  sources: NewsSource[]         // 이 이벤트가 나올 수 있는 출처들
  sectorImpacts: SectorImpact[]
  minDifficulty: number         // 최소 등장 난이도 (런 번호)
  weight: number                // 등장 확률 가중치
  chainEventId?: string
  chainDelay?: number
  fakeVariants?: FakeEventVariant[]
  isNoise?: boolean             // 노이즈 뉴스 (실질적 영향 없음)
}

export interface FakeEventVariant {
  headline: string
  content: string
  body?: string
  fakeType: FakeNewsType
  perceivedImpact: SectorImpact[]   // 겉보기 영향
  actualImpact: SectorImpact[]      // 실제 영향 (보통 없거나 반대)
  educationalNote: string
}

// ============ 스킬 관련 ============

export type SkillCategory = 'analysis' | 'literacy' | 'investment' | 'passive'

export interface Skill {
  id: string
  name: string
  description: string
  category: SkillCategory
  cost: number            // 평판 포인트 비용
  icon: string
  maxLevel: number
  prerequisiteId?: string // 선행 스킬
  effect: SkillEffect
}

export type SkillEffect =
  | { type: 'show_moving_average' }
  | { type: 'reveal_news_impact' }
  | { type: 'next_turn_hint' }
  | { type: 'sector_trend' }
  | { type: 'fact_check'; accuracy: number }
  | { type: 'source_tracking' }
  | { type: 'conflict_detection' }
  | { type: 'bias_warning' }
  | { type: 'stale_detection' }
  | { type: 'leverage'; multiplier: number }
  | { type: 'short_selling' }
  | { type: 'stop_loss'; threshold: number }
  | { type: 'dca'; portions: number }
  | { type: 'trailing_stop'; defaultTarget: number }
  | { type: 'forex_hedge'; feeReduction: number }
  | { type: 'dividend'; rate: number }
  | { type: 'interest'; rate: number }
  // 신규 스킬 효과
  | { type: 'social_analysis' }
  | { type: 'correlation_view' }
  | { type: 'noise_filter' }
  | { type: 'portfolio_hedge' }
  | { type: 'compound_interest' }
  | { type: 'market_intuition' }

// ============ 아이템 관련 ============

export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'legendary'

export interface CursedEffect {
  upside: string
  downside: string
  description: string   // 다운사이드 설명 (한글)
  drainAmount?: number  // drain_rp_per_turn 시 감소량 (기본 1)
}

export interface Item {
  id: string
  name: string
  description: string
  rarity: ItemRarity
  cost: number
  isConsumable: boolean
  effect: string
  isCursed?: boolean
  cursedEffect?: CursedEffect
}

// ============ 주간 특수 규칙 ============

export interface WeeklyRule {
  id: string
  name: string
  description: string
  icon: string
  effect: WeeklyRuleEffect
  minQuarter: number
}

export type WeeklyRuleEffect =
  | { type: 'volatile_week'; multiplier: number }
  | { type: 'sector_blackout'; sector: Sector }
  | { type: 'fomo_week'; bonusMomentum: number }
  | { type: 'no_selling' }
  | { type: 'double_or_nothing' }
  | { type: 'fog_of_war' }
  | { type: 'news_overload'; extraNews: number }
  | { type: 'flash_crash_risk'; probability: number }
  | { type: 'pandemic_week'; volatilityMultiplier: number; panicBoost: number }
  | { type: 'strategy_week' }

// ============ 게임 상태 ============

export interface Position {
  stockId: string
  shares: number
  avgBuyPrice: number
}

export interface Portfolio {
  cash: number
  positions: Position[]
  reputationPoints: number
}

export type GamePhase = 'news' | 'analysis' | 'investment' | 'result' | 'event'
export type Screen = 'title' | 'onboarding' | 'stockpicker' | 'game' | 'shop' | 'result' | 'meta' | 'settings' | 'clear'

// ============ 특수 이벤트 ============

export type SpecialEventType = 'choice' | 'quiz' | 'black_swan'

export interface ChoiceOption {
  label: string
  description: string
  effect: ChoiceEffect
}

export interface ChoiceEffect {
  cash?: number           // 현금 변동 (절대값)
  cashPercent?: number    // 현금 변동 (%)
  rp?: number             // RP 변동
  sectorImpacts?: SectorImpact[]
  educationalNote: string
}

export interface SpecialEvent {
  id: string
  type: SpecialEventType
  title: string
  description: string
  icon: string
  // choice 이벤트
  choices?: ChoiceOption[]
  // quiz 이벤트
  question?: string
  options?: string[]
  correctIndex?: number
  explanation?: string
  rewardRP?: number
  // black swan
  sectorImpacts?: SectorImpact[]
  magnitude?: string     // 'positive' | 'negative'
}

// ============ 속보 뉴스 ============

export interface BreakingNewsData {
  id: string
  headline: string
  body: string
  source: NewsSource
  category: EventCategory
  sectorImpacts: SectorImpact[]
}

// ============ 메타 진행 ============

export interface MetaProgress {
  totalRuns: number
  highestRunCleared: number
  metaPoints: number
  unlockedMetaUpgrades: string[]
  achievements: string[]
}

export interface MetaUpgrade {
  id: string
  name: string
  description: string
  cost: number
  maxLevel: number
  effect: MetaEffect
}

export type MetaEffect =
  | { type: 'starting_cash_bonus'; amount: number }
  | { type: 'starting_rp_bonus'; amount: number }
  | { type: 'news_accuracy_bonus'; amount: number }
  | { type: 'extra_news_slot' }
  | { type: 'skill_discount'; percent: number }

export interface PriceHistory {
  stockId: string
  prices: number[]  // 턴별 가격 히스토리
}

export interface TradeRecord {
  id: string
  timestamp: string     // formatWeekDay 결과 (e.g. "W3 월14:30")
  stockId: string
  ticker: string
  side: 'buy' | 'sell'
  quantity: number
  price: number
  fee: number
  realizedPnL?: number  // 매도 시에만 존재
}

export interface MarketTrade {
  time: string          // "HH:MM:SS" 형태
  stockId: string
  ticker: string
  side: 'buy' | 'sell'
  quantity: number
  price: number
  isUserTrade: boolean
}

export interface RunStats {
  totalTurns: number
  correctPredictions: number
  fakeNewsDetected: number
  fakeNewsTotal: number
  pumpDumpAvoided: number
  pumpDumpTotal: number
  fudAvoided: number
  fudTotal: number
  learnedConcepts: string[]
}

export interface ActiveEffect {
  sectorImpacts: SectorImpact[]
  remainingTurns: number
  sourceNewsId: string
}

export interface ChainEvent {
  eventId: string
  triggersAtTurn: number
}

export interface RunConfig {
  runNumber: number
  name: string
  targetReturn: number     // 목표 수익률 (0.1 = 10%)
  volatilityMultiplier: number
  fakeNewsRatio: number    // 가짜 뉴스 비율
  maxTurns: number
}

export const RUN_CONFIGS: RunConfig[] = [
  { runNumber: 1, name: '골디락스',     targetReturn: 0.05, volatilityMultiplier: 0.5, fakeNewsRatio: 0.10, maxTurns: 52 },
  { runNumber: 2, name: '강세장',       targetReturn: 0.08, volatilityMultiplier: 0.7, fakeNewsRatio: 0.10, maxTurns: 52 },
  { runNumber: 3, name: '테이퍼링',     targetReturn: 0.12, volatilityMultiplier: 0.9, fakeNewsRatio: 0.15, maxTurns: 52 },
  { runNumber: 4, name: '금리 인상기',  targetReturn: 0.15, volatilityMultiplier: 1.2, fakeNewsRatio: 0.20, maxTurns: 52 },
  { runNumber: 5, name: '버블 경제',    targetReturn: 0.20, volatilityMultiplier: 1.5, fakeNewsRatio: 0.25, maxTurns: 52 },
  { runNumber: 6, name: '리세션',       targetReturn: 0.18, volatilityMultiplier: 1.8, fakeNewsRatio: 0.30, maxTurns: 52 },
  { runNumber: 7, name: '블랙 스완',    targetReturn: 0.25, volatilityMultiplier: 2.2, fakeNewsRatio: 0.35, maxTurns: 52 },
  { runNumber: 8, name: '퍼펙트 스톰',  targetReturn: 0.30, volatilityMultiplier: 2.5, fakeNewsRatio: 0.40, maxTurns: 52 },
]
