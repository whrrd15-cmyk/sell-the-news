import { motion } from 'motion/react'
import { useGameStore } from '../../stores/gameStore'
import { META_UPGRADES, getMetaUpgradeCount } from '../../data/metaUpgrades'
import { BalatroBackground } from '../effects/BalatroBackground'
import { SFX } from '../../utils/sound'

export function MetaUpgradeScreen() {
  const { meta, buyMetaUpgrade, setScreen } = useGameStore()

  const handleBuy = (upgradeId: string, cost: number) => {
    SFX.skillBuy()
    buyMetaUpgrade(upgradeId, cost)
  }

  return (
    <div className="min-h-screen text-white font-pixel flex flex-col items-center px-4 py-8 relative overflow-hidden">
      <BalatroBackground />

      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 text-center mb-6">
        <h1 className="text-4xl md:text-5xl text-bal-gold mb-2">메타 업그레이드</h1>
        <p className="text-bal-text-dim text-sm">영구적인 보너스로 다음 런을 유리하게 시작하세요</p>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
        className="relative z-10 mb-8 bal-panel-inset flex items-center gap-2 px-5 py-2">
        <span className="text-bal-text-dim text-sm">메타 포인트</span>
        <span className="text-bal-gold text-xl font-bold">{meta.metaPoints} MP</span>
      </motion.div>

      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl w-full mb-10">
        {META_UPGRADES.map((upgrade, i) => {
          const currentLevel = getMetaUpgradeCount(meta, upgrade.id)
          const isMaxed = currentLevel >= upgrade.maxLevel
          const canAfford = meta.metaPoints >= upgrade.cost
          const canBuy = !isMaxed && canAfford

          return (
            <motion.div key={upgrade.id}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.2 }}
              className={`bal-card p-5 transition-all ${isMaxed ? '' : canBuy ? 'cursor-pointer' : 'opacity-40'}`}
              style={isMaxed ? { borderColor: '#f0b42944' } : undefined}
              onClick={() => canBuy && handleBuy(upgrade.id, upgrade.cost)}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white text-sm font-bold">{upgrade.name}</h3>
                <div className="flex gap-1">
                  {Array.from({ length: upgrade.maxLevel }).map((_, lvl) => (
                    <div key={lvl}
                      className={`w-3 h-3 rounded ${lvl < currentLevel ? 'bg-bal-gold border border-bal-gold/60' : 'bg-transparent border border-bal-text-dim/30'}`}
                    />
                  ))}
                </div>
              </div>
              <p className="text-bal-text-dim text-xs leading-relaxed mb-3">{upgrade.description}</p>
              {isMaxed ? (
                <span className="text-bal-gold text-xs font-bold">MAX</span>
              ) : (
                <span className={`text-xs font-bold ${canAfford ? 'text-bal-gold' : 'text-bal-red'}`}>{upgrade.cost} MP</span>
              )}
            </motion.div>
          )
        })}
      </div>

      <motion.button initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
        onClick={() => { SFX.click(); setScreen('title') }}
        className="relative z-10 bal-btn text-lg px-10">
        타이틀로 돌아가기
      </motion.button>
    </div>
  )
}
