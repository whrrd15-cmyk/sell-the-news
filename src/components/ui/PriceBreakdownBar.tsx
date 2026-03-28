import { motion } from 'motion/react'
import type { PriceChangeBreakdown } from '../../engine/market'

interface PriceBreakdownBarProps {
  breakdown: PriceChangeBreakdown
}

const FACTORS: {
  key: keyof PriceChangeBreakdown
  label: string
  color: string
}[] = [
  { key: 'eventEffect', label: '뉴스', color: '#5b9bd5' },
  { key: 'herdEffect', label: '심리', color: '#9b72cf' },
  { key: 'momentum', label: '관성', color: '#e88c3a' },
  { key: 'meanReversion', label: '회귀', color: '#8888aa' },
  { key: 'noise', label: '노이즈', color: '#555570' },
  { key: 'bubblePop', label: '버블', color: '#e8534a' },
  { key: 'flashCrash', label: '크래시', color: '#ff4444' },
]

export function PriceBreakdownBar({ breakdown }: PriceBreakdownBarProps) {
  // noise, meanReversion 같은 작은 값은 필터링
  const activeFacs = FACTORS
    .map(f => ({ ...f, value: breakdown[f.key] as number }))
    .filter(f => Math.abs(f.value) > 0.001)

  if (activeFacs.length === 0) return null

  // 전체 범위 계산
  const totalPositive = activeFacs.reduce((s, f) => s + Math.max(0, f.value), 0)
  const totalNegative = activeFacs.reduce((s, f) => s + Math.abs(Math.min(0, f.value)), 0)
  const maxRange = Math.max(totalPositive, totalNegative, 0.01)

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      transition={{ duration: 0.3 }}
      className="px-2 pb-1"
    >
      {/* 바 */}
      <div className="relative h-3 flex items-center" style={{ marginTop: 2 }}>
        {/* 중심선 */}
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/20" />

        {/* 음수 (왼쪽) */}
        <div className="absolute right-1/2 top-0 bottom-0 flex flex-row-reverse items-center">
          {activeFacs.filter(f => f.value < 0).map((f, i) => {
            const width = (Math.abs(f.value) / maxRange) * 50
            return (
              <motion.div
                key={f.key}
                initial={{ width: 0 }}
                animate={{ width: `${width}%` }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="h-2.5 rounded-l-sm relative group"
                style={{ background: f.color, minWidth: width > 0 ? 2 : 0 }}
                title={`${f.label}: ${(f.value * 100).toFixed(2)}%`}
              >
                {width > 8 && (
                  <span className="absolute inset-0 flex items-center justify-center text-[7px] text-white/80 font-bold truncate px-0.5">
                    {f.label}
                  </span>
                )}
              </motion.div>
            )
          })}
        </div>

        {/* 양수 (오른쪽) */}
        <div className="absolute left-1/2 top-0 bottom-0 flex items-center">
          {activeFacs.filter(f => f.value > 0).map((f, i) => {
            const width = (f.value / maxRange) * 50
            return (
              <motion.div
                key={f.key}
                initial={{ width: 0 }}
                animate={{ width: `${width}%` }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="h-2.5 rounded-r-sm relative group"
                style={{ background: f.color, minWidth: width > 0 ? 2 : 0 }}
                title={`${f.label}: +${(f.value * 100).toFixed(2)}%`}
              >
                {width > 8 && (
                  <span className="absolute inset-0 flex items-center justify-center text-[7px] text-white/80 font-bold truncate px-0.5">
                    {f.label}
                  </span>
                )}
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* 범례 (주요 요인만) */}
      <div className="flex gap-2 justify-center mt-0.5">
        {activeFacs
          .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
          .slice(0, 3)
          .map(f => (
            <span key={f.key} className="text-[8px] flex items-center gap-0.5">
              <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: f.color }} />
              <span style={{ color: f.color }}>{f.label}</span>
              <span className="text-white/50">{f.value >= 0 ? '+' : ''}{(f.value * 100).toFixed(1)}%</span>
            </span>
          ))}
      </div>
    </motion.div>
  )
}
