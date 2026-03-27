import type { Portfolio, Position } from '../data/types'

/**
 * 포트폴리오 관리 시스템
 */

export function createInitialPortfolio(): Portfolio {
  return {
    cash: 10000,
    positions: [],
    reputationPoints: 0,
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
): Portfolio {
  const shares = Math.floor(amount / price)
  if (shares <= 0) return portfolio

  const TRADE_FEE = 0.005 // 0.5% 수수료
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
): Portfolio {
  const positionIdx = portfolio.positions.findIndex((p) => p.stockId === stockId)
  if (positionIdx < 0) return portfolio

  const position = portfolio.positions[positionIdx]
  const actualShares = Math.min(sharesToSell, position.shares)
  if (actualShares <= 0) return portfolio

  const TRADE_FEE = 0.005 // 0.5% 수수료
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
