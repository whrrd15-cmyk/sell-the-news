import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useGameStore } from '../../stores/gameStore'
import { SFX } from '../../utils/sound'

export function SpecialEventOverlay() {
  const {
    currentSpecialEvent, lastEventFeedback,
    resolveChoiceEvent, dismissSpecialEvent,
  } = useGameStore()

  const [resolved, setResolved] = useState(false)

  if (!currentSpecialEvent) return null
  const event = currentSpecialEvent

  const handleChoice = (index: number) => {
    if (resolved) return
    SFX.click(); resolveChoiceEvent(index); setResolved(true)
  }

  const handleDismiss = () => {
    SFX.phaseChange(); setResolved(false); dismissSpecialEvent()
  }

  const isBlackSwan = event.type === 'black_swan'
  const borderColor = isBlackSwan
    ? event.magnitude === 'negative' ? '#e8534a' : '#5ec269'
    : '#9b72cf'

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4"
    >
      <motion.div
        initial={{ scale: 0.85, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="bal-panel p-6 max-w-lg w-full font-pixel relative overflow-hidden"
        style={{ borderColor, boxShadow: `0 0 20px ${borderColor}33` }}
      >
        {isBlackSwan && (
          <motion.div
            className="absolute inset-0 pointer-events-none rounded-[10px]"
            style={{ background: `${borderColor}10` }}
            animate={{ opacity: [0.3, 0, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}

        <div className="relative z-10 text-center mb-4">
          <motion.div className="text-5xl mb-3"
            animate={isBlackSwan ? { scale: [1, 1.2, 1] } : {}}
            transition={{ duration: 1, repeat: isBlackSwan ? Infinity : 0 }}
          >{event.icon}</motion.div>

          {isBlackSwan && (
            <div className="inline-block px-3 py-1 text-xs font-bold mb-2 rounded"
              style={{ color: borderColor, borderColor: `${borderColor}66`, border: '1px solid' }}>
              BLACK SWAN
            </div>
          )}

          <h2 className="text-xl text-white font-bold mb-2">{event.title}</h2>
          <p className="text-sm text-bal-text-dim leading-relaxed">{event.description}</p>
        </div>

        {event.type === 'choice' && event.choices && !resolved && (
          <div className="relative z-10 space-y-2 mb-4">
            {event.choices.map((choice, i) => (
              <button key={i} onClick={() => handleChoice(i)}
                className="w-full text-left px-4 py-3 border border-white/10 hover:border-bal-purple/40 hover:bg-bal-purple/5 transition-all cursor-pointer rounded-lg">
                <div className="text-sm text-white font-bold">{choice.label}</div>
                <div className="text-xs text-bal-text-dim mt-0.5">{choice.description}</div>
              </button>
            ))}
          </div>
        )}

        <AnimatePresence>
          {resolved && lastEventFeedback && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="relative z-10 bal-panel-inset p-4 mb-4">
              <p className="text-[10px] text-bal-blue font-bold mb-2">학습 포인트</p>
              <p className="text-sm text-bal-text leading-relaxed whitespace-pre-line">{lastEventFeedback}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {isBlackSwan && !resolved && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="relative z-10">
            <button onClick={() => { SFX.click(); setResolved(true) }} className="bal-btn w-full">상황 확인</button>
          </motion.div>
        )}

        {isBlackSwan && resolved && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="relative z-10 bal-panel-inset p-4 mb-4">
            <p className="text-[10px] text-bal-text-dim font-bold mb-2">시장 영향</p>
            {event.sectorImpacts?.map((si, i) => {
              const name = si.sector === 'all' ? '전체 시장' : { tech: '기술', energy: '에너지', finance: '금융', consumer: '소비재', healthcare: '헬스케어' }[si.sector] || si.sector
              return (
                <p key={i} className={`text-sm font-bold ${si.impact > 0 ? 'text-bal-green' : 'text-bal-red'}`}>
                  {name}: {si.impact > 0 ? '상승' : '하락'} {Math.abs(si.impact * 100).toFixed(0)}% ({si.duration}턴)
                </p>
              )
            })}
          </motion.div>
        )}

        {resolved && (
          <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
            onClick={handleDismiss} className="relative z-10 bal-btn bal-btn-green w-full">
            계속하기
          </motion.button>
        )}
      </motion.div>
    </motion.div>
  )
}
