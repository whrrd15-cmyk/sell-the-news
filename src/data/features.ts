/**
 * 피처 플래그 — 턴제↔실시간 전환을 점진적으로 진행
 * false = 기존 턴제 로직, true = 신규 실시간 로직
 */
export const FEATURES = {
  /** 실시간 모드: tickMarket() 기반 연속 가격 변동 */
  REAL_TIME_MODE: true,
  /** 멀티윈도우 UI: 페이즈 전환 없이 모든 패널 동시 표시 */
  MULTI_WINDOW_UI: true,
  /** 뉴스 드립: 일괄 생성 대신 시간별 발행 */
  NEWS_DRIP: true,
  /** 공매도 */
  SHORT_SELLING: true,
  /** 레버리지 */
  LEVERAGE: true,
  /** 지정가 주문 */
  LIMIT_ORDERS: true,
} as const
