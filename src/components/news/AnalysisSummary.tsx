import { motion } from 'motion/react'
import type { NewsCard, NewsJudgment } from '../../data/types'
import { SectorImpactSummary } from './SectorImpactSummary'
import { SFX } from '../../utils/sound'

interface AnalysisSummaryProps {
  news: NewsCard[]
  judgments: NewsJudgment[]
  onAdvanceToInvestment: () => void
}

const BADGE_CONFIG: Record<string, { label: (v: number) => string; className: string }> = {
  bullish: { label: (v) => `호재 +${Math.round(v * 100)}%`, className: 'analysis-summary-badge--bullish' },
  bearish: { label: (v) => `악재 ${Math.round(v * 100)}%`, className: 'analysis-summary-badge--bearish' },
  fake: { label: () => 'FAKE!', className: 'analysis-summary-badge--fake' },
  skip: { label: () => '건너뜀', className: 'analysis-summary-badge--skip' },
}

export function AnalysisSummary({ news, judgments, onAdvanceToInvestment }: AnalysisSummaryProps) {
  const handleAdvance = () => {
    SFX.phaseChange()
    onAdvanceToInvestment()
  }

  return (
    <motion.div
      className="analysis-summary"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <motion.div
        className="analysis-summary-title"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, type: 'spring', damping: 15 }}
      >
        분석 완료!
      </motion.div>

      {/* 판단 리스트 */}
      <div className="analysis-summary-list">
        {news.map((n, i) => {
          const judgment = judgments.find(j => j.newsId === n.id)
          const type = judgment?.type ?? 'skip'
          const config = BADGE_CONFIG[type] ?? BADGE_CONFIG.skip
          return (
            <motion.div
              key={n.id}
              className="analysis-summary-item"
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + i * 0.06 }}
            >
              <span className="analysis-summary-headline">{n.headline}</span>
              <span className={`analysis-summary-badge ${config.className}`}>
                {config.label(judgment?.sliderValue ?? 0)}
              </span>
            </motion.div>
          )
        })}
      </div>

      {/* 섹터 영향 요약 */}
      <div style={{ marginBottom: 20 }}>
        <SectorImpactSummary news={news} />
      </div>

      {/* CTA */}
      <motion.button
        className="phase-cta-btn"
        style={{
          background: '#5b9bd5',
          boxShadow: '0 4px 0 #5b9bd588, 0 0 20px rgba(91,155,213,0.15)',
          width: '100%',
        }}
        onClick={handleAdvance}
        whileHover={{ scale: 1.02, y: -1 }}
        whileTap={{ scale: 0.98, y: 2 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      >
        투자하기 →
      </motion.button>
    </motion.div>
  )
}
