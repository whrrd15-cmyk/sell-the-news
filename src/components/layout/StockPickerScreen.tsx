import { useState } from 'react'
import { motion } from 'motion/react'
import { useGameStore } from '../../stores/gameStore'
import { STOCKS } from '../../data/stocks'
import { SECTOR_COLORS, SECTOR_LABELS } from '../../data/constants'
import { BalatroBackground } from '../effects/BalatroBackground'
import { SFX } from '../../utils/sound'
import type { Stock } from '../../data/types'

const TRADABLE_STOCKS = STOCKS.filter(s => !s.isETF)

const VOLATILITY_LABEL = (v: number) =>
  v >= 0.8 ? '매우 높음' : v >= 0.6 ? '높음' : v >= 0.4 ? '보통' : '낮음'

const SENSITIVITY_LABEL = (s: number) =>
  s >= 0.8 ? '매우 민감' : s >= 0.6 ? '민감' : s >= 0.4 ? '보통' : '둔감'

export function StockPickerScreen() {
  const { setPickedStock, runConfig } = useGameStore()
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const detailStock = TRADABLE_STOCKS.find(s => s.id === (selectedId ?? hoveredId)) ?? null

  const handleSelect = (stock: Stock) => {
    SFX.click()
    setSelectedId(stock.id)
  }

  const handleConfirm = () => {
    if (!selectedId) return
    SFX.click()
    setPickedStock(selectedId)
  }

  return (
    <div className="min-h-screen flex relative overflow-hidden">
      <BalatroBackground />

      <div className="relative z-10 flex flex-col items-center w-full py-8 px-4">
        {/* 헤더 */}
        <motion.div
          className="text-center mb-6"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-2xl font-pixel text-bal-gold mb-1" style={{ letterSpacing: 3 }}>
            종목을 선택하세요
          </h1>
          <p className="text-xs text-bal-text-dim">
            {runConfig?.name ?? '골디락스'} — 이번 분기에 트레이딩할 종목 1개를 골라주세요
          </p>
        </motion.div>

        <div className="flex gap-6 w-full max-w-[960px] flex-1 min-h-0">
          {/* 종목 그리드 */}
          <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 auto-rows-min">
            {TRADABLE_STOCKS.map((stock, i) => {
              const isSelected = selectedId === stock.id
              const isHovered = hoveredId === stock.id
              const sectorColor = SECTOR_COLORS[stock.sector]
              return (
                <motion.button
                  key={stock.id}
                  className="stock-pick-card"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  style={{
                    borderColor: isSelected ? sectorColor : isHovered ? `${sectorColor}60` : 'rgba(255,255,255,0.08)',
                    boxShadow: isSelected ? `0 0 16px ${sectorColor}30, inset 0 0 20px ${sectorColor}08` : 'none',
                  }}
                  onMouseEnter={() => setHoveredId(stock.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={() => handleSelect(stock)}
                >
                  <div className="stock-pick-sector" style={{ background: sectorColor }}>
                    {SECTOR_LABELS[stock.sector]}
                  </div>
                  <div className="stock-pick-ticker">{stock.ticker}</div>
                  <div className="stock-pick-name">{stock.name}</div>
                  <div className="stock-pick-price">${stock.basePrice}</div>
                  {isSelected && (
                    <motion.div
                      className="stock-pick-check"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      style={{ color: sectorColor }}
                    >
                      &#10003;
                    </motion.div>
                  )}
                </motion.button>
              )
            })}
          </div>

          {/* 상세 정보 패널 — 항상 260px 유지 */}
          <div className="stock-pick-detail">
            {detailStock ? (
              <motion.div
                key={detailStock.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.15 }}
                className="flex flex-col gap-[10px] h-full"
              >
                {/* 종목 헤더 */}
                <div className="stock-pick-detail-header">
                  <span className="stock-pick-detail-ticker">{detailStock.ticker}</span>
                  <span
                    className="stock-pick-detail-sector"
                    style={{ background: SECTOR_COLORS[detailStock.sector] }}
                  >
                    {SECTOR_LABELS[detailStock.sector]}
                  </span>
                </div>
                <div className="stock-pick-detail-name">{detailStock.name}</div>
                <div className="stock-pick-detail-desc">{detailStock.description}</div>

                {/* 스탯 */}
                <div className="stock-pick-stats">
                  <div className="stock-pick-stat">
                    <span className="stock-pick-stat-label">기본가</span>
                    <span className="stock-pick-stat-value">${detailStock.basePrice}</span>
                  </div>

                  <div className="stock-pick-stat">
                    <span className="stock-pick-stat-label">변동성</span>
                    <div className="stock-pick-stat-bar-wrap">
                      <div
                        className="stock-pick-stat-bar"
                        style={{
                          width: `${detailStock.volatility * 100}%`,
                          background: detailStock.volatility >= 0.7 ? '#e8534a' : detailStock.volatility >= 0.5 ? '#f0b429' : '#5ec269',
                        }}
                      />
                    </div>
                    <span className="stock-pick-stat-tag">{VOLATILITY_LABEL(detailStock.volatility)}</span>
                  </div>

                  <div className="stock-pick-stat">
                    <span className="stock-pick-stat-label">뉴스 민감도</span>
                    <div className="stock-pick-stat-bar-wrap">
                      <div
                        className="stock-pick-stat-bar"
                        style={{
                          width: `${detailStock.newsSensitivity * 100}%`,
                          background: detailStock.newsSensitivity >= 0.7 ? '#e88c3a' : '#5b9bd5',
                        }}
                      />
                    </div>
                    <span className="stock-pick-stat-tag">{SENSITIVITY_LABEL(detailStock.newsSensitivity)}</span>
                  </div>
                </div>

                {/* 난이도 힌트 */}
                <div className="stock-pick-hint">
                  {detailStock.volatility >= 0.7
                    ? '변동성이 높아 큰 수익을 기대할 수 있지만 위험합니다.'
                    : detailStock.volatility >= 0.4
                      ? '적당한 변동성으로 균형 잡힌 트레이딩이 가능합니다.'
                      : '변동성이 낮아 안정적이지만 큰 수익은 어렵습니다.'}
                </div>

                {/* 선택 버튼 — 항상 하단에 고정 */}
                <div className="mt-auto">
                  {selectedId === detailStock.id ? (
                    <button
                      className="stock-pick-confirm"
                      onClick={handleConfirm}
                      style={{ background: SECTOR_COLORS[detailStock.sector], width: '100%' }}
                    >
                      {detailStock.ticker} 선택 확정
                    </button>
                  ) : (
                    <button
                      className="stock-pick-confirm"
                      onClick={() => handleSelect(detailStock)}
                      style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--color-bal-text-dim)', width: '100%' }}
                    >
                      클릭하여 선택
                    </button>
                  )}
                </div>
              </motion.div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-bal-text-dim text-center gap-3">
                <div style={{ fontSize: 28, opacity: 0.3 }}>&#9664;</div>
                <div style={{ fontSize: 11 }}>종목을 선택하면<br />상세 정보가 표시됩니다</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
