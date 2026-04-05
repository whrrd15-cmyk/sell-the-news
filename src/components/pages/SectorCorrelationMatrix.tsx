import { useMemo } from 'react'
import { useGameStore } from '../../stores/gameStore'
import { STOCKS } from '../../data/stocks'
import { SECTOR_LABELS, SECTOR_COLORS } from '../../data/constants'
import type { Sector } from '../../data/types'

/**
 * 섹터 상관관계 매트릭스
 *
 * correlation_view 스킬 해금 시 표시.
 * 최근 N턴 가격 수익률의 피어슨 상관계수를 섹터 쌍별로 계산.
 * +1.0 = 완전 동조, 0 = 무관, -1.0 = 역상관.
 */

const SECTORS: Sector[] = ['tech', 'energy', 'finance', 'consumer', 'healthcare']
const LOOKBACK = 10 // 최근 10턴 수익률 사용

function computeReturns(prices: number[]): number[] {
  if (prices.length < 2) return []
  const returns: number[] = []
  const start = Math.max(0, prices.length - LOOKBACK - 1)
  for (let i = start + 1; i < prices.length; i++) {
    const prev = prices[i - 1]
    const curr = prices[i]
    if (prev > 0) returns.push((curr - prev) / prev)
  }
  return returns
}

function pearson(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length)
  if (n < 2) return 0
  const meanA = a.slice(0, n).reduce((s, v) => s + v, 0) / n
  const meanB = b.slice(0, n).reduce((s, v) => s + v, 0) / n
  let num = 0, denA = 0, denB = 0
  for (let i = 0; i < n; i++) {
    const da = a[i] - meanA
    const db = b[i] - meanB
    num += da * db
    denA += da * da
    denB += db * db
  }
  const den = Math.sqrt(denA * denB)
  return den > 0 ? num / den : 0
}

function averageSectorReturns(sector: Sector, priceHistories: { stockId: string; prices: number[] }[]): number[] {
  const sectorStockIds = STOCKS.filter(s => s.sector === sector && !s.isETF).map(s => s.id)
  const stockReturns = sectorStockIds
    .map(id => {
      const hist = priceHistories.find(h => h.stockId === id)
      return hist ? computeReturns(hist.prices) : []
    })
    .filter(r => r.length > 0)

  if (stockReturns.length === 0) return []
  const minLen = Math.min(...stockReturns.map(r => r.length))
  const avg: number[] = []
  for (let i = 0; i < minLen; i++) {
    const sum = stockReturns.reduce((s, r) => s + r[i], 0)
    avg.push(sum / stockReturns.length)
  }
  return avg
}

function correlationColor(corr: number): string {
  if (corr >= 0.7) return '#5ec269'  // 강한 양
  if (corr >= 0.3) return '#9cc26a'  // 약한 양
  if (corr >= -0.3) return '#8888aa' // 무관
  if (corr >= -0.7) return '#e8a86a' // 약한 음
  return '#e8534a'                    // 강한 음
}

export function SectorCorrelationMatrix() {
  const unlockedSkills = useGameStore(s => s.unlockedSkills)
  const priceHistories = useGameStore(s => s.market.priceHistories)

  const matrix = useMemo(() => {
    const sectorReturns: Record<Sector, number[]> = {} as Record<Sector, number[]>
    for (const sector of SECTORS) {
      sectorReturns[sector] = averageSectorReturns(sector, priceHistories)
    }
    const result: Record<string, number> = {}
    for (let i = 0; i < SECTORS.length; i++) {
      for (let j = 0; j < SECTORS.length; j++) {
        const key = `${SECTORS[i]}_${SECTORS[j]}`
        result[key] = pearson(sectorReturns[SECTORS[i]], sectorReturns[SECTORS[j]])
      }
    }
    return result
  }, [priceHistories])

  if (!unlockedSkills.includes('correlation_view')) return null

  return (
    <div className="border border-bal-blue/30 bg-bal-blue/5 rounded p-3 mt-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-bold text-bal-blue">섹터 상관관계</span>
        <span className="text-[9px] text-bal-text-dim">최근 {LOOKBACK}턴 수익률 기준</span>
      </div>
      <table className="w-full text-[9px]">
        <thead>
          <tr>
            <th className="p-1"></th>
            {SECTORS.map(s => (
              <th key={s} className="p-1 font-bold" style={{ color: SECTOR_COLORS[s] }}>
                {SECTOR_LABELS[s]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {SECTORS.map(rowSector => (
            <tr key={rowSector}>
              <td className="p-1 font-bold" style={{ color: SECTOR_COLORS[rowSector] }}>
                {SECTOR_LABELS[rowSector]}
              </td>
              {SECTORS.map(colSector => {
                const corr = matrix[`${rowSector}_${colSector}`] ?? 0
                const color = correlationColor(corr)
                const isSame = rowSector === colSector
                return (
                  <td
                    key={colSector}
                    className="p-1 text-center font-bold rounded"
                    style={{
                      color: isSame ? '#666' : color,
                      background: isSame ? 'transparent' : `${color}15`,
                    }}
                  >
                    {isSame ? '—' : corr.toFixed(2)}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-center gap-3 mt-2 text-[9px] text-bal-text-dim">
        <span><span style={{ color: '#5ec269' }}>■</span> 강한 양(+)</span>
        <span><span style={{ color: '#8888aa' }}>■</span> 무관</span>
        <span><span style={{ color: '#e8534a' }}>■</span> 강한 음(−)</span>
      </div>
    </div>
  )
}
