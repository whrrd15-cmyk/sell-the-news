import { motion } from 'motion/react'

interface MarketMoodIndicatorProps {
  herdSentiment: number    // -1 (panic) to +1 (greed)
  panicLevel: number       // 0 to 1
  maxBubble: number        // 최대 섹터 버블 수준
}

export function MarketMoodIndicator({ herdSentiment, panicLevel, maxBubble }: MarketMoodIndicatorProps) {
  // 무드 이모지 결정
  const getMoodEmoji = () => {
    if (herdSentiment < -0.5 && panicLevel > 0.3) return '😱'
    if (herdSentiment < -0.2) return '😰'
    if (herdSentiment > 0.5 && maxBubble > 0.6) return '🫧'
    if (herdSentiment > 0.2) return '🤑'
    return '😐'
  }

  const getMoodLabel = () => {
    if (herdSentiment < -0.5 && panicLevel > 0.3) return '극심한 공포'
    if (herdSentiment < -0.2) return '공포'
    if (herdSentiment > 0.5 && maxBubble > 0.6) return '버블 경고'
    if (herdSentiment > 0.2) return '탐욕'
    return '중립'
  }

  // 게이지 위치 (0% = 왼쪽 극공포, 100% = 오른쪽 극탐욕)
  const gaugePos = ((herdSentiment + 1) / 2) * 100

  // 게이지 색상
  const gaugeColor =
    herdSentiment < -0.3 ? '#e8534a' :
    herdSentiment < -0.1 ? '#e88c3a' :
    herdSentiment < 0.1 ? '#8888aa' :
    herdSentiment < 0.3 ? '#b8c94a' :
    '#5ec269'

  return (
    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
      {/* 무드 이모지 */}
      <motion.span
        className="text-sm"
        animate={panicLevel > 0.5 ? { x: [0, -1, 1, -1, 0] } : {}}
        transition={panicLevel > 0.5 ? { duration: 0.3, repeat: Infinity, repeatDelay: 1 } : {}}
      >
        {getMoodEmoji()}
      </motion.span>

      {/* 공포-탐욕 게이지 */}
      <div className="flex flex-col items-center gap-0">
        <span className="text-[8px] text-bal-text-dim leading-none">{getMoodLabel()}</span>
        <div className="relative w-16 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
          {/* 그라데이션 배경 */}
          <div
            className="absolute inset-0 rounded-full"
            style={{ background: 'linear-gradient(to right, #e8534a, #e88c3a, #8888aa, #b8c94a, #5ec269)', opacity: 0.3 }}
          />
          {/* 현재 위치 마커 */}
          <motion.div
            className="absolute top-0 bottom-0 w-2 rounded-full"
            animate={{ left: `${Math.max(0, Math.min(100, gaugePos)) - 6}%` }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            style={{ background: gaugeColor, boxShadow: `0 0 4px ${gaugeColor}` }}
          />
        </div>
      </div>

      {/* 패닉 인디케이터 */}
      {panicLevel > 0.1 && (
        <motion.div
          className="flex items-center gap-0.5"
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 1.2, repeat: Infinity }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-bal-red" />
          <span className="text-[8px] text-bal-red font-bold">{Math.round(panicLevel * 100)}%</span>
        </motion.div>
      )}
    </div>
  )
}
