import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useGameStore } from '../../stores/gameStore'
import { SKILLS, SKILL_CATEGORY_LABELS } from '../../data/skills'
import { RARITY_COLORS, RARITY_LABELS } from '../../data/items'
import { QUIZ_EVENTS } from '../../data/specialEvents'
import { BalatroBackground } from '../effects/BalatroBackground'
import { QuizLoanModal } from '../ui/QuizLoanModal'
import { SFX, bgm } from '../../utils/sound'
import { getSkillIcon, getItemIcon } from '../icons/SkillIcons'
import type { Skill, SkillCategory, Item } from '../../data/types'

type ShopTab = 'skills' | 'items'
const CATEGORIES: SkillCategory[] = ['analysis', 'literacy', 'investment', 'passive']

const CATEGORY_COLORS: Record<SkillCategory, string> = {
  analysis: '#5b9bd5',
  literacy: '#f0b429',
  investment: '#5ec269',
  passive: '#9b72cf',
}

export function ShopScreen() {
  const { portfolio, unlockedSkills, unlockSkill, inventory, shopItems, buyItem, nextTurn, setScreen, shopSource, usedQuizIds, rerollShopItems, shopRerollCount } = useGameStore()
  const [activeTab, setActiveTab] = useState<ShopTab>('skills')
  const [selectedCategory, setSelectedCategory] = useState<SkillCategory>('analysis')
  const [purchaseAnimation, setPurchaseAnimation] = useState<string | null>(null)
  const [quizLoan, setQuizLoan] = useState<{ shortfall: number; itemName: string; onPurchase: () => void } | null>(null)

  useEffect(() => { SFX.shopEnter(); bgm.crossFadeTo('shop') }, [])

  const hasQuizzesLeft = QUIZ_EVENTS.some(q => !usedQuizIds.has(q.id))

  const handleBuySkill = (skill: Skill) => {
    if (unlockedSkills.includes(skill.id)) return
    if (skill.prerequisiteId && !unlockedSkills.includes(skill.prerequisiteId)) return

    if (portfolio.reputationPoints < skill.cost) {
      // RP 부족 → 퀴즈 대출
      if (hasQuizzesLeft) {
        const shortfall = skill.cost - portfolio.reputationPoints
        setQuizLoan({
          shortfall,
          itemName: skill.name,
          onPurchase: () => {
            SFX.skillBuy()
            unlockSkill(skill.id, skill.cost)
            setPurchaseAnimation(skill.id)
            setTimeout(() => setPurchaseAnimation(null), 1000)
            setQuizLoan(null)
          },
        })
      }
      return
    }

    SFX.skillBuy()
    unlockSkill(skill.id, skill.cost)
    setPurchaseAnimation(skill.id)
    setTimeout(() => setPurchaseAnimation(null), 1000)
  }

  const handleBuyItem = (item: Item) => {
    if (portfolio.reputationPoints < item.cost) {
      // RP 부족 → 퀴즈 대출
      if (hasQuizzesLeft) {
        const shortfall = item.cost - portfolio.reputationPoints
        setQuizLoan({
          shortfall,
          itemName: item.name,
          onPurchase: () => {
            SFX.skillBuy()
            buyItem(item)
            setPurchaseAnimation(item.id)
            setTimeout(() => setPurchaseAnimation(null), 1000)
            setQuizLoan(null)
          },
        })
      }
      return
    }
    SFX.skillBuy()
    buyItem(item)
    setPurchaseAnimation(item.id)
    setTimeout(() => setPurchaseAnimation(null), 1000)
  }

  const handleContinue = () => {
    if (shopSource === 'manual') {
      // Manual visit: return to game without consuming a turn
      SFX.click()
      setScreen('game')
    } else {
      // Auto visit (every 13 turns): consume turn
      SFX.nextTurn()
      nextTurn()
      setScreen('game')
    }
  }

  const filteredSkills = SKILLS.filter((s) => s.category === selectedCategory)
  const catColor = CATEGORY_COLORS[selectedCategory]

  return (
    <div className="min-h-screen text-white font-pixel flex flex-col items-center px-4 py-8 relative overflow-hidden">
      <BalatroBackground mood="shop" />

      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 text-center mb-6">
        <h1 className="text-4xl md:text-5xl text-bal-purple mb-2">상점</h1>
        <p className="text-bal-text-dim text-sm">스킬과 아이템을 구매하세요</p>
      </motion.div>

      {/* RP + Inventory */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
        className="relative z-10 mb-6 flex items-center gap-3">
        <div className="bal-panel-inset flex items-center gap-2 px-5 py-2">
          <span className="text-bal-text-dim text-sm">평판 포인트</span>
          <span className="text-bal-purple text-xl font-bold">{portfolio.reputationPoints} RP</span>
        </div>
        {inventory.length > 0 && (
          <div className="bal-panel-inset flex items-center gap-2 px-4 py-2">
            <span className="text-bal-text-dim text-sm">인벤토리</span>
            <span className="text-bal-blue text-lg font-bold">{inventory.length}</span>
          </div>
        )}
      </motion.div>

      {/* Tabs */}
      <div className="relative z-10 flex gap-2 mb-5">
        <button onClick={() => setActiveTab('skills')}
          className={`bal-btn text-sm px-6 ${activeTab === 'skills' ? 'bal-btn-primary' : ''}`}>스킬</button>
        <button onClick={() => setActiveTab('items')}
          className={`bal-btn text-sm px-6 ${activeTab === 'items' ? 'bal-btn-primary' : ''}`}>아이템</button>
      </div>

      {activeTab === 'skills' && (
        <>
          <div className="relative z-10 flex gap-2 mb-6 flex-wrap justify-center">
            {CATEGORIES.map((cat) => (
              <button key={cat} onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 text-sm border rounded-lg transition-all duration-200 cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-white/5'
                    : 'text-bal-text-dim border-bal-border-dim hover:text-white'
                }`}
                style={selectedCategory === cat ? { borderColor: CATEGORY_COLORS[cat], color: CATEGORY_COLORS[cat] } : undefined}
              >
                {SKILL_CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>

          <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-w-4xl w-full mb-10">
            <AnimatePresence mode="popLayout">
              {filteredSkills.map((skill, i) => {
                const isOwned = unlockedSkills.includes(skill.id)
                const canAfford = portfolio.reputationPoints >= skill.cost
                const hasPrereq = !skill.prerequisiteId || unlockedSkills.includes(skill.prerequisiteId)
                const canQuizLoan = !canAfford && hasQuizzesLeft && hasPrereq
                const canBuy = !isOwned && canAfford && hasPrereq
                const isClickable = !isOwned && (canBuy || canQuizLoan)
                const isPurchasing = purchaseAnimation === skill.id

                return (
                  <motion.div key={skill.id}
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06, duration: 0.2 }}
                    className={`bal-card p-4 relative overflow-hidden transition-all ${
                      isOwned ? '' : isClickable ? 'cursor-pointer' : 'opacity-40'
                    }`}
                    style={isOwned ? { borderColor: catColor + '66' } : undefined}
                    onClick={() => isClickable && handleBuySkill(skill)}
                  >
                    {isPurchasing && (
                      <motion.div className="absolute inset-0 bg-bal-green/10 z-20"
                        initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 1 }} />
                    )}
                    {isOwned && (
                      <div className="absolute top-2 right-2">
                        <span className="text-[9px] px-2 py-0.5 border rounded" style={{ borderColor: catColor + '44', color: catColor }}>보유중</span>
                      </div>
                    )}
                    <div className="flex items-start gap-3">
                      <span className="flex-shrink-0">{getSkillIcon(skill.id, 28, catColor)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="text-white text-sm font-bold">{skill.name}</h3>
                          {!isOwned && (
                            <span className={`text-xs font-bold flex items-center gap-1 ${canAfford ? 'text-bal-purple' : canQuizLoan ? 'text-yellow-400' : 'text-bal-red'}`}>
                              {!canAfford && canQuizLoan && <span title="퀴즈로 충당 가능">📝</span>}
                              {skill.cost} RP
                            </span>
                          )}
                        </div>
                        <p className="text-bal-text-dim text-xs leading-relaxed">{skill.description}</p>
                        {skill.prerequisiteId && !hasPrereq && (
                          <p className="text-bal-red/60 text-xs mt-1">선행: {SKILLS.find((s) => s.id === skill.prerequisiteId)?.name}</p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        </>
      )}

      {activeTab === 'items' && (
        <div className="relative z-10 max-w-4xl w-full mb-10">
          {/* 리롤 헤더 */}
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm text-bal-text-dim font-bold">판매 아이템</h3>
            {(() => {
              const rerollCost = 2 + shopRerollCount
              const canReroll = portfolio.reputationPoints >= rerollCost
              return (
                <button
                  className={`bal-btn text-xs px-4 py-1.5 flex items-center gap-1.5 ${canReroll ? 'bal-btn-primary' : 'opacity-40 cursor-not-allowed'}`}
                  disabled={!canReroll}
                  onClick={() => { if (canReroll) { SFX.whoosh(); rerollShopItems() } }}
                >
                  <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                    <path d="M1 4v6h6M23 20v-6h-6" />
                    <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
                  </svg>
                  리롤 ({rerollCost} RP)
                </button>
              )
            })()}
          </div>
          {shopItems.length === 0 ? (
            <div className="text-center py-12 text-bal-text-dim">아이템이 없습니다</div>
          ) : (
            <AnimatePresence mode="wait">
            <motion.div
              key={shopRerollCount}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.25 }}
              className="grid grid-cols-1 sm:grid-cols-3 gap-3"
            >
              {shopItems.map((item, i) => {
                const rc = RARITY_COLORS[item.rarity]
                const canAfford = portfolio.reputationPoints >= item.cost
                const canQuizLoanItem = !canAfford && hasQuizzesLeft
                const isClickable = canAfford || canQuizLoanItem
                const isCursed = item.isCursed
                return (
                  <motion.div key={`${item.id}-${i}`}
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08, duration: 0.2 }}
                    className={`bal-card p-4 ${isCursed ? 'cursed-item-card' : rc.border} ${isClickable ? 'cursor-pointer' : 'opacity-40'}`}
                    onClick={() => isClickable && handleBuyItem(item)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-[9px] font-bold ${isCursed ? 'text-bal-red' : rc.text}`}>
                        {isCursed ? '저주' : RARITY_LABELS[item.rarity]}
                      </span>
                      <span className={`text-xs font-bold flex items-center gap-1 ${canAfford ? 'text-bal-purple' : canQuizLoanItem ? 'text-yellow-400' : 'text-bal-red'}`}>
                        {canQuizLoanItem && <span title="퀴즈로 충당 가능">📝</span>}
                        {item.cost} RP
                      </span>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="flex-shrink-0 mt-0.5">{getItemIcon(item.id, 24)}</span>
                      <div className="flex-1 min-w-0">
                        <h3 className={`text-sm font-bold mb-1 ${isCursed ? 'text-bal-red' : rc.text}`}>{item.name}</h3>
                        <p className="text-bal-text-dim text-xs">{item.description}</p>
                        {isCursed && item.cursedEffect && (
                          <div className="mt-2 text-[10px] space-y-0.5">
                            <p className="text-bal-green">▲ {item.cursedEffect.upside}</p>
                            <p className="text-bal-red">▼ {item.cursedEffect.downside}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </motion.div>
            </AnimatePresence>
          )}
          {inventory.length > 0 && (
            <div className="mt-6">
              <h3 className="text-xs text-bal-text-dim mb-2 text-center">보유 아이템</h3>
              <div className="flex flex-wrap gap-2 justify-center">
                {inventory.map((item, i) => {
                  const rc = RARITY_COLORS[item.rarity]
                  return <div key={`inv-${item.id}-${i}`} className={`text-xs px-3 py-1 border rounded font-bold ${rc.border} ${rc.text}`}>{item.name}</div>
                })}
              </div>
            </div>
          )}
        </div>
      )}

      <motion.button initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
        onClick={handleContinue} className="relative z-10 bal-btn bal-btn-green text-lg px-10">
        {shopSource === 'manual' ? '돌아가기' : '다음 턴으로'}
      </motion.button>

      <AnimatePresence>
        {quizLoan && (
          <QuizLoanModal
            shortfall={quizLoan.shortfall}
            itemName={quizLoan.itemName}
            onSuccess={quizLoan.onPurchase}
            onClose={() => setQuizLoan(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
