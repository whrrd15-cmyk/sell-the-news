import type { AutoTradeRule, AutoTradeResult, Portfolio, Position } from '../data/types'
import { buyStock, sellStock, getPositionReturn } from './portfolio'

/**
 * 자동 매매 실행 엔진
 * advanceToResultPhase()에서 simulateTurn() 직후 호출
 */
export function processAutoTrades(
  rules: AutoTradeRule[],
  portfolio: Portfolio,
  prices: Record<string, number>,
): { result: AutoTradeResult; updatedRules: AutoTradeRule[]; updatedPortfolio: Portfolio } {
  const executedTrades: AutoTradeResult['executedTrades'] = []
  const educationalNotes: string[] = []
  let updatedPortfolio = { ...portfolio, positions: [...portfolio.positions] }
  const updatedRules: AutoTradeRule[] = []

  for (const rule of rules) {
    const price = prices[rule.stockId]
    if (!price) {
      updatedRules.push(rule)
      continue
    }

    const position = updatedPortfolio.positions.find(p => p.stockId === rule.stockId)

    switch (rule.type) {
      case 'stop_loss': {
        if (!position) { updatedRules.push(rule); break }
        const returnRate = getPositionReturn(position, price)
        const threshold = rule.params.threshold ?? -0.10
        if (returnRate <= threshold) {
          updatedPortfolio = sellStock(updatedPortfolio, rule.stockId, price, position.shares)
          executedTrades.push({
            stockId: rule.stockId,
            action: 'sell',
            shares: position.shares,
            price,
            rule: `손절매 (${(threshold * 100).toFixed(0)}%)`,
          })
          educationalNotes.push(
            `손절매가 발동되었습니다 (${(returnRate * 100).toFixed(1)}% 손실). 손절매는 더 큰 손실을 방지하는 위험 관리의 핵심입니다.`
          )
          // 발동 후 룰 제거
        } else {
          updatedRules.push(rule)
        }
        break
      }

      case 'trailing_stop': {
        if (!position) { updatedRules.push(rule); break }
        const returnRate = getPositionReturn(position, price)
        const target = rule.params.threshold ?? 0.10
        if (returnRate >= target) {
          updatedPortfolio = sellStock(updatedPortfolio, rule.stockId, price, position.shares)
          executedTrades.push({
            stockId: rule.stockId,
            action: 'sell',
            shares: position.shares,
            price,
            rule: `목표 수익률 매도 (+${(target * 100).toFixed(0)}%)`,
          })
          educationalNotes.push(
            `목표 수익률 ${(target * 100).toFixed(0)}%에 도달하여 자동 매도했습니다. 미리 설정한 목표로 탐욕에 의한 수익 반납을 방지합니다.`
          )
        } else {
          updatedRules.push(rule)
        }
        break
      }

      case 'dca': {
        const basePrice = rule.params.dcaBasePrice ?? price
        const portionsBought = rule.params.portionsBought ?? 0
        const maxPortions = rule.params.maxPortions ?? 10
        const dcaAmount = rule.params.dcaAmount ?? 500
        const remainingTurns = rule.params.remainingTurns

        // 턴 기반 DCA (아이템용): 매 턴 매수
        if (remainingTurns !== undefined) {
          if (remainingTurns <= 0) break // 소진, 룰 제거
          if (updatedPortfolio.cash >= dcaAmount) {
            updatedPortfolio = buyStock(updatedPortfolio, rule.stockId, price, dcaAmount)
            const shares = Math.floor(dcaAmount / price)
            if (shares > 0) {
              executedTrades.push({
                stockId: rule.stockId,
                action: 'buy',
                shares,
                price,
                rule: `자동 적립식 매수 (${remainingTurns}턴 남음)`,
              })
            }
          }
          const newRemaining = remainingTurns - 1
          if (newRemaining > 0) {
            updatedRules.push({
              ...rule,
              params: { ...rule.params, remainingTurns: newRemaining },
            })
          } else {
            educationalNotes.push(
              '자동 적립식 매수가 완료되었습니다. 정해진 금액을 기계적으로 매수하면 평균 매입단가를 낮출 수 있습니다.'
            )
          }
          break
        }

        // 가격 기반 DCA (스킬용): 기준가 대비 5% 하락마다 1분할 매수
        if (portionsBought >= maxPortions) break // 모든 분할 완료

        const dropPercent = (basePrice - price) / basePrice
        const expectedPortions = Math.floor(dropPercent / 0.05) + 1
        const portionsToExecute = Math.min(expectedPortions - portionsBought, maxPortions - portionsBought)

        if (portionsToExecute > 0 && updatedPortfolio.cash >= dcaAmount) {
          const totalAmount = Math.min(dcaAmount * portionsToExecute, updatedPortfolio.cash)
          updatedPortfolio = buyStock(updatedPortfolio, rule.stockId, price, totalAmount)
          const shares = Math.floor(totalAmount / price)
          if (shares > 0) {
            executedTrades.push({
              stockId: rule.stockId,
              action: 'buy',
              shares,
              price,
              rule: `분할 매수 (${portionsBought + portionsToExecute}/${maxPortions})`,
            })
            educationalNotes.push(
              `기준가 대비 ${(dropPercent * 100).toFixed(1)}% 하락으로 분할 매수 실행. 물타기와 달리 미리 정한 기준으로 기계적으로 매수합니다.`
            )
          }
          const newPortionsBought = portionsBought + portionsToExecute
          if (newPortionsBought < maxPortions) {
            updatedRules.push({
              ...rule,
              params: { ...rule.params, portionsBought: newPortionsBought },
            })
          }
        } else {
          updatedRules.push(rule)
        }
        break
      }

      case 'rebalance': {
        const rangeHigh = rule.params.rangeHigh
        const rangeLow = rule.params.rangeLow
        if (rangeHigh === undefined || rangeLow === undefined) {
          updatedRules.push(rule)
          break
        }

        const range = rangeHigh - rangeLow
        const upperZone = rangeHigh - range * 0.2 // 상단 20%
        const lowerZone = rangeLow + range * 0.2  // 하단 20%

        if (price >= upperZone && position && position.shares > 0) {
          // 상단 도달 → 일부 매도 (보유량의 30%)
          const sharesToSell = Math.max(1, Math.floor(position.shares * 0.3))
          updatedPortfolio = sellStock(updatedPortfolio, rule.stockId, price, sharesToSell)
          executedTrades.push({
            stockId: rule.stockId,
            action: 'sell',
            shares: sharesToSell,
            price,
            rule: '박스권 리밸런싱 (상단 매도)',
          })
          educationalNotes.push(
            `박스권 상단 도달로 자동 매도. 횡보장에서는 기계적인 리밸런싱이 감정적 매매보다 효과적입니다.`
          )
          updatedRules.push(rule) // 리밸런싱은 계속 유지
        } else if (price <= lowerZone) {
          // 하단 도달 → 매수
          const buyAmount = Math.min(updatedPortfolio.cash * 0.2, 1000)
          if (buyAmount >= price) {
            updatedPortfolio = buyStock(updatedPortfolio, rule.stockId, price, buyAmount)
            const shares = Math.floor(buyAmount / price)
            if (shares > 0) {
              executedTrades.push({
                stockId: rule.stockId,
                action: 'buy',
                shares,
                price,
                rule: '박스권 리밸런싱 (하단 매수)',
              })
            }
          }
          updatedRules.push(rule)
        } else {
          updatedRules.push(rule)
        }
        break
      }
    }
  }

  return {
    result: { executedTrades, educationalNotes },
    updatedRules,
    updatedPortfolio,
  }
}
