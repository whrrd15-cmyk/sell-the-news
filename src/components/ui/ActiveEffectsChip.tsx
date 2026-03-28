import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import type { ActiveEffect } from '../../data/types'
import { SECTOR_COLORS, SECTOR_LABELS } from '../../data/constants'

interface ActiveEffectsChipProps {
  effects: ActiveEffect[]
}

export function ActiveEffectsChip({ effects }: ActiveEffectsChipProps) {
  const [open, setOpen] = useState(false)

  if (effects.length === 0) return null

  return (
    <div className="relative">
      <button
        className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all"
        style={{
          background: 'rgba(91,155,213,0.12)',
          border: '1px solid rgba(91,155,213,0.25)',
          color: '#5b9bd5',
        }}
        onClick={() => setOpen(!open)}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-[#5b9bd5] animate-pulse" />
        효과 {effects.length}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full right-0 mt-1 z-50 w-56 rounded-xl overflow-hidden"
              style={{
                background: 'rgba(20,20,38,0.97)',
                border: '1px solid rgba(91,155,213,0.2)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                backdropFilter: 'blur(8px)',
              }}
            >
              <div className="px-3 py-2 text-[10px] text-bal-text-dim font-bold border-b border-white/5">
                활성 시장 효과
              </div>
              <div className="max-h-48 overflow-y-auto">
                {effects.map((effect, i) => (
                  <div key={i} className="px-3 py-1.5 border-b border-white/5 last:border-0">
                    <div className="flex items-center gap-1.5">
                      {/* 영향 섹터 점 */}
                      <div className="flex gap-0.5">
                        {effect.sectorImpacts.slice(0, 3).map((si, j) => {
                          const color = si.sector === 'all' ? '#f0b429' : (SECTOR_COLORS as Record<string, string>)[si.sector] ?? '#888'
                          return (
                            <span
                              key={j}
                              className="w-2 h-2 rounded-full inline-block"
                              style={{ background: color }}
                              title={si.sector === 'all' ? '전체' : (SECTOR_LABELS as Record<string, string>)[si.sector] ?? si.sector}
                            />
                          )
                        })}
                      </div>
                      {/* 영향 방향 */}
                      <span className="text-[10px]">
                        {effect.sectorImpacts[0]?.impact > 0
                          ? <span className="text-bal-green">▲</span>
                          : <span className="text-bal-red">▼</span>
                        }
                      </span>
                      {/* 남은 턴 */}
                      <span className="text-[9px] text-bal-text-dim ml-auto">
                        {effect.remainingTurns}턴 남음
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
