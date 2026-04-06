import type { Portfolio, Position } from '../data/types'

/**
 * 포트폴리오 관리 시스템
 */

export function createInitialPortfolio(): Portfolio {
  return {
    cash: 10000,
    positions: [],
    // T2-C (밸런싱): 초기 RP 5 지급 — 초보자가 스킬 1개 즉시 해금 가능
    reputationPoints: 5,
  }
}

/**
 * 주식 매수
 */
export function buyStock(
  portfolio: Portfolio,
  stockId: string,
  price: number,
  amount: number, // 투자할 금액
  feeReduction: number = 0, // 환율 헤지 수수료 감소
): Portfolio {
  const shares = Math.floor(amount / price)
  if (shares <= 0) return portfolio

  const TRADE_FEE = Math.max(0.001, 0.005 - feeReduction) // 기본 0.5%, 환율 헤지 시 감소
  const totalCost = shares * price * (1 + TRADE_FEE)
  if (totalCost > portfolio.cash) return portfolio

  const existingIdx = portfolio.positions.findIndex((p) => p.stockId === stockId)
  const newPositions = [...portfolio.positions]

  if (existingIdx >= 0) {
    const existing = newPositions[existingIdx]
    const totalShares = existing.shares + shares
    const newAvg =
      (existing.avgBuyPrice * existing.shares + price * shares) / totalShares
    newPositions[existingIdx] = {
      ...existing,
      shares: totalShares,
      avgBuyPrice: Math.round(newAvg * 100) / 100,
    }
  } else {
    newPositions.push({
      stockId,
      shares,
      avgBuyPrice: price,
    })
  }

  return {
    ...portfolio,
    cash: Math.round((portfolio.cash - totalCost) * 100) / 100,
    positions: newPositions,
  }
}

/**
 * 주식 매도
 */
export function sellStock(
  portfolio: Portfolio,
  stockId: string,
  price: number,
  sharesToSell: number,
  feeReduction: number = 0,
): Portfolio {
  const positionIdx = portfolio.positions.findIndex((p) => p.stockId === stockId)
  if (positionIdx < 0) return portfolio

  const position = portfolio.positions[positionIdx]
  const actualShares = Math.min(sharesToSell, position.shares)
  if (actualShares <= 0) return portfolio

  const TRADE_FEE = Math.max(0.001, 0.005 - feeReduction)
  const revenue = actualShares * price * (1 - TRADE_FEE)
  const newPositions = [...portfolio.positions]

  if (actualShares >= position.shares) {
    newPositions.splice(positionIdx, 1)
  } else {
    newPositions[positionIdx] = {
      ...position,
      shares: position.shares - actualShares,
    }
  }

  return {
    ...portfolio,
    cash: Math.round((portfolio.cash + revenue) * 100) / 100,
    positions: newPositions,
  }
}

/**
 * 전체 포트폴리오 가치 계산
 */
export function getPortfolioValue(
  portfolio: Portfolio,
  prices: Record<string, number>,
): number {
  const positionValue = portfolio.positions.reduce((sum, p) => {
    const price = prices[p.stockId] || 0
    return sum + p.shares * price
  }, 0)
  return Math.round((portfolio.cash + positionValue) * 100) / 100
}

/**
 * 총 수익률 계산
 */
export function getTotalReturn(
  portfolio: Portfolio,
  prices: Record<string, number>,
  initialCash: number,
): number {
  const currentValue = getPortfolioValue(portfolio, prices)
  return (currentValue - initialCash) / initialCash
}

/**
 * 개별 포지션 수익률
 */
export function getPositionReturn(
  position: Position,
  currentPrice: number,
): number {
  return (currentPrice - position.avgBuyPrice) / position.avgBuyPrice
}

/**
 * 개별 포지션 평가 금액
 */
export function getPositionValue(
  position: Position,
  currentPrice: number,
): number {
  return Math.round(position.shares * currentPrice * 100) / 100
}

/**
 * 평판 포인트 부여
 */
export function awardReputation(
  portfolio: Portfolio,
  points: number,
): Portfolio {
  return {
    ...portfolio,
    reputationPoints: portfolio.reputationPoints + points,
  }
}

// ═══════════════════════════════════════════
// 공매도 시스템
// ═══════════════════════════════════════════

import type { ShortPosition, LeveragedPosition, LimitOrder } from '../data/types'

/**
 * 공매도 오픈: 주식을 빌려서 매도
 * 교육 포인트: "공매도는 주가 하락에 베팅하는 것이다.
 * 빌린 주식을 팔고, 나중에 싸게 사서 돌려주면 차익을 얻는다."
 */
export function openShort(
  cash: number,
  stockId: string,
  shares: number,
  price: number,
): { newCash: number; position: ShortPosition } | null {
  const proceeds = shares * price * 0.995 // 0.5% 수수료
  const marginRequired = shares * price * 1.5 // 150% 마진
  if (cash < marginRequired - proceeds) return null // 마진 부족

  return {
    newCash: Math.round((cash + proceeds) * 100) / 100,
    position: {
      id: `short_${stockId}_${Date.now()}`,
      stockId,
      shares,
      entryPrice: price,
      borrowFeeRate: 0.0002, // 일 0.02%
      accruedFees: 0,
    },
  }
}

/**
 * 공매도 커버: 주식을 사서 반환
 */
export function coverShort(
  cash: number,
  position: ShortPosition,
  currentPrice: number,
  sharesToCover: number,
): { newCash: number; remaining: ShortPosition | null } | null {
  const actual = Math.min(sharesToCover, position.shares)
  const cost = actual * currentPrice * 1.005 // 0.5% 수수료
  if (cash < cost) return null

  const remaining = actual >= position.shares ? null : {
    ...position,
    shares: position.shares - actual,
  }

  return {
    newCash: Math.round((cash - cost) * 100) / 100,
    remaining,
  }
}

/**
 * 공매도 일일 대여료 차감
 */
export function accrueShortFees(
  positions: ShortPosition[],
  prices: Record<string, number>,
): { updated: ShortPosition[]; totalFees: number } {
  let totalFees = 0
  const updated = positions.map(pos => {
    const currentValue = pos.shares * (prices[pos.stockId] ?? pos.entryPrice)
    const dailyFee = currentValue * pos.borrowFeeRate
    totalFees += dailyFee
    return { ...pos, accruedFees: pos.accruedFees + dailyFee }
  })
  return { updated, totalFees }
}

/**
 * 공매도 마진콜 체크
 * 마진 비율이 130% 이하로 떨어지면 강제 청산 대상
 */
export function checkShortMarginCall(
  position: ShortPosition,
  currentPrice: number,
): boolean {
  // 마진 비율 = (cash from entry + remaining margin) / current position value
  // 단순화: 주가가 진입가 대비 30% 이상 상승하면 마진콜
  return currentPrice >= position.entryPrice * 1.3
}

// ═══════════════════════════════════════════
// 레버리지 시스템
// ═══════════════════════════════════════════

/**
 * 레버리지 매수
 * 교육 포인트: "레버리지는 양날의 검이다.
 * 수익도 N배지만 손실도 N배. 청산가에 도달하면 모든 투자금을 잃는다."
 */
export function buyWithLeverage(
  cash: number,
  stockId: string,
  amount: number,
  price: number,
  leverage: 2 | 5 | 10,
): { newCash: number; position: LeveragedPosition } | null {
  const ownCapital = amount
  const borrowedAmount = amount * (leverage - 1)
  const totalBuyPower = amount * leverage
  const shares = Math.floor(totalBuyPower / price)
  if (shares <= 0 || cash < ownCapital) return null

  const fee = totalBuyPower * 0.005
  const interestRate = leverage === 2 ? 0.0001 : leverage === 5 ? 0.0002 : 0.0005

  // 청산가: 자기자본이 0이 되는 가격
  // (entry - liquidation) * shares = ownCapital → liquidation = entry - ownCapital/shares
  const liquidationPrice = Math.max(0, price - (ownCapital - fee) / shares)

  return {
    newCash: Math.round((cash - ownCapital - fee) * 100) / 100,
    position: {
      id: `lev_${stockId}_${Date.now()}`,
      stockId,
      shares,
      avgBuyPrice: price,
      leverage,
      borrowedAmount,
      dailyInterestRate: interestRate,
      accruedInterest: 0,
      liquidationPrice: Math.round(liquidationPrice * 100) / 100,
    },
  }
}

/**
 * 레버리지 포지션 청산
 */
export function closeLeveragedPosition(
  cash: number,
  position: LeveragedPosition,
  currentPrice: number,
): number {
  const saleProceeds = position.shares * currentPrice * 0.995
  const debt = position.borrowedAmount + position.accruedInterest
  const netProceeds = saleProceeds - debt
  return Math.round((cash + netProceeds) * 100) / 100
}

/**
 * 레버리지 일일 이자
 */
export function accrueLeverageInterest(
  positions: LeveragedPosition[],
): { updated: LeveragedPosition[]; totalInterest: number } {
  let totalInterest = 0
  const updated = positions.map(pos => {
    const dailyInterest = pos.borrowedAmount * pos.dailyInterestRate
    totalInterest += dailyInterest
    return { ...pos, accruedInterest: pos.accruedInterest + dailyInterest }
  })
  return { updated, totalInterest }
}

/**
 * 레버리지 청산가 도달 체크
 */
export function checkLiquidation(
  position: LeveragedPosition,
  currentPrice: number,
): boolean {
  return currentPrice <= position.liquidationPrice
}

// ═══════════════════════════════════════════
// 지정가 주문 시스템
// ═══════════════════════════════════════════

/**
 * 지정가 주문 체결 체크
 * 교육 포인트: "지정가 주문은 감정을 배제하고 계획대로 매매하는 도구다.
 * 미리 정한 가격에 자동으로 실행되므로 충동적 판단을 방지한다."
 */
export function checkOrderFill(
  order: LimitOrder,
  currentPrice: number,
): boolean {
  switch (order.type) {
    case 'buy_limit':
      return currentPrice <= order.targetPrice
    case 'sell_limit':
      return currentPrice >= order.targetPrice
    case 'stop_loss':
      return currentPrice <= order.targetPrice
    case 'take_profit':
      return currentPrice >= order.targetPrice
  }
}

/**
 * 호가 스프레드 계산
 * 교육 포인트: "실제 시장에서는 매수가와 매도가가 다르다.
 * 이 차이(스프레드)가 거래 비용의 일부다."
 */
export function getSpread(basePrice: number, volatility: number): { bid: number; ask: number } {
  const spreadRate = 0.001 + volatility * 0.002 // 0.1% ~ 0.3%
  return {
    bid: Math.round(basePrice * (1 - spreadRate) * 100) / 100,
    ask: Math.round(basePrice * (1 + spreadRate) * 100) / 100,
  }
}
