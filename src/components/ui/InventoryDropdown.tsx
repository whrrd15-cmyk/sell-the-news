import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { RARITY_COLORS, RARITY_LABELS } from '../../data/items'
import { getItemIcon } from '../icons/SkillIcons'
import { ItemUseEffect } from '../effects/ItemUseEffect'
import { SFX } from '../../utils/sound'
import type { Item, GamePhase, ItemRarity } from '../../data/types'

const RARITY_GLOW: Record<ItemRarity, string> = {
  common: '#8888aa',
  uncommon: '#5ec269',
  rare: '#5b9bd5',
  legendary: '#f0b429',
}

interface InventoryDropdownProps {
  inventory: Item[]
  phase: GamePhase
  onUseItem: (itemId: string) => void
}

// Which phases each effect can be used in
const EFFECT_PHASE_MAP: Record<string, GamePhase[]> = {
  reveal_one_news: ['news', 'investment'],
  reroll_news: ['news'],
  cash_500: ['news', 'investment', 'result'],
  loss_insurance_50: ['news', 'investment'],
  double_rp_next: ['news', 'investment', 'result'],
  reveal_all_trends: ['news', 'investment'],
  reveal_best_stock: ['news', 'investment'],
  undo_last_trade: ['investment'],
  predict_3_turns: ['news', 'investment'],
}

const PHASE_LABELS: Record<GamePhase, string> = {
  news: '뉴스',
  analysis: '분석',
  investment: '투자',
  result: '결과',
  event: '이벤트',
}

function getUsablePhaseLabel(effect: string): string {
  const phases = EFFECT_PHASE_MAP[effect] ?? []
  if (phases.length === 0) return ''
  return phases.map(p => PHASE_LABELS[p]).join('/') + '시'
}

export function InventoryDropdown({ inventory, phase, onUseItem }: InventoryDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [useEffect_, setUseEffect_] = useState<{ itemId: string; rarity: ItemRarity } | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isOpen])

  const handleEffectComplete = useCallback(() => {
    if (!useEffect_) return
    onUseItem(useEffect_.itemId)
    setUseEffect_(null)
    if (inventory.length <= 1) setIsOpen(false)
  }, [useEffect_, onUseItem, inventory.length])

  const handleUse = (item: Item) => {
    SFX.click()
    setIsOpen(false)
    setUseEffect_({ itemId: item.id, rarity: item.rarity })
  }

  return (
    <div ref={ref} className="relative">
      <button
        className="flex items-center gap-1 px-2 py-1 rounded-lg transition-all hover:bg-white/5"
        style={{ border: '1px solid rgba(255,255,255,0.1)' }}
        onClick={() => { SFX.click(); setIsOpen(!isOpen) }}
        title="인벤토리"
      >
        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <rect x="5" y="8" width="14" height="13" rx="2" />
          <path d="M8 8V6a4 4 0 0 1 8 0v2" />
        </svg>
        {inventory.length > 0 && (
          <span className="text-[10px] font-bold text-bal-gold">{inventory.length}</span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 top-full mt-1 z-50 w-64 bal-panel p-0 overflow-hidden"
            style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.6)' }}
          >
            <div className="px-3 py-2 border-b border-white/10 text-xs text-bal-text-dim">
              인벤토리 ({inventory.length})
            </div>

            {inventory.length === 0 ? (
              <div className="px-3 py-6 text-center text-xs text-bal-text-dim">
                아이템이 없습니다
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto">
                {inventory.map((item, i) => {
                  const rc = RARITY_COLORS[item.rarity]
                  const allowedPhases = EFFECT_PHASE_MAP[item.effect] || []
                  const canUse = allowedPhases.includes(phase)

                  return (
                    <div
                      key={`${item.id}-${i}`}
                      className="px-3 py-2 border-b border-white/5 flex items-start gap-2"
                    >
                      <span className="flex-shrink-0 mt-0.5 opacity-80">
                        {getItemIcon(item.id, 20)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className={`text-xs font-bold ${rc.text}`}>{item.name}</span>
                          <span className="text-[8px] text-bal-text-dim">{RARITY_LABELS[item.rarity]}</span>
                        </div>
                        <p className="text-[10px] text-bal-text-dim leading-tight">{item.description}</p>
                      </div>
                      <button
                        className={`flex-shrink-0 text-[10px] px-2 py-1 rounded font-bold transition-all ${
                          canUse
                            ? 'bg-bal-green/20 text-bal-green hover:bg-bal-green/30 cursor-pointer'
                            : 'bg-white/5 text-bal-text-dim/50 cursor-not-allowed'
                        }`}
                        onClick={() => canUse && handleUse(item)}
                        disabled={!canUse}
                        title={canUse ? '사용하기' : `${getUsablePhaseLabel(item.effect)} 사용 가능`}
                      >
                        {canUse ? '사용' : getUsablePhaseLabel(item.effect)}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3D Item Use Effect Overlay */}
      <AnimatePresence>
        {useEffect_ && (
          <ItemUseEffect
            itemId={useEffect_.itemId}
            rarityColor={RARITY_GLOW[useEffect_.rarity]}
            onComplete={handleEffectComplete}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
