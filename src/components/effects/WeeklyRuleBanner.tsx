import { motion, AnimatePresence } from 'motion/react'
import type { WeeklyRule } from '../../data/types'

interface Props {
  rule: WeeklyRule | null
}

export function WeeklyRuleBanner({ rule }: Props) {
  return (
    <AnimatePresence>
      {rule && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="weekly-rule-banner"
        >
          <span className="weekly-rule-icon">{rule.icon}</span>
          <div className="weekly-rule-text">
            <span className="weekly-rule-name">{rule.name}</span>
            <span className="weekly-rule-desc">{rule.description}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
