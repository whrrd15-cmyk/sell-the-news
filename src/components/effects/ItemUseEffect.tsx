import { useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { getItemIcon } from '../icons/SkillIcons'
import { SFX } from '../../utils/sound'

interface ItemUseEffectProps {
  itemId: string
  rarityColor: string
  onComplete: () => void
}

const PARTICLE_COUNT = 6

export function ItemUseEffect({ itemId, rarityColor, onComplete }: ItemUseEffectProps) {
  const [phase, setPhase] = useState<'enter' | 'glow' | 'exit'>('enter')

  // Generate stable random particle directions
  const particles = useMemo(() =>
    Array.from({ length: PARTICLE_COUNT }, (_, i) => {
      const angle = (i / PARTICLE_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.5
      return {
        x: Math.cos(angle) * (60 + Math.random() * 40),
        y: Math.sin(angle) * (60 + Math.random() * 40),
        delay: i * 0.04,
        size: 3 + Math.floor(Math.random() * 3),
      }
    }),
  [])

  useEffect(() => {
    SFX.chipCount()

    const glowTimer = setTimeout(() => setPhase('glow'), 300)
    const exitTimer = setTimeout(() => {
      setPhase('exit')
      SFX.cardFlick()
    }, 700)
    const doneTimer = setTimeout(() => onComplete(), 1200)

    return () => {
      clearTimeout(glowTimer)
      clearTimeout(exitTimer)
      clearTimeout(doneTimer)
    }
  }, [onComplete])

  return (
    <div className="pixel-item-use-overlay">
      <div style={{ perspective: 600 }}>
        <motion.div
          initial={{ scale: 0.4, opacity: 0, y: 0, rotateY: 0 }}
          animate={
            phase === 'enter'
              ? { scale: 1.3, opacity: 1, y: -20, rotateY: 15 }
              : phase === 'glow'
                ? { scale: 1.6, opacity: 1, y: -30, rotateY: -10 }
                : { scale: 0, opacity: 0, y: -40, rotateY: 360 }
          }
          transition={
            phase === 'exit'
              ? { duration: 0.5, ease: 'easeIn' }
              : { type: 'spring', stiffness: 200, damping: 15 }
          }
          className="pixel-item-icon-container"
          style={{
            boxShadow: phase === 'glow'
              ? `0 0 30px ${rarityColor}, 0 0 60px ${rarityColor}44`
              : phase === 'enter'
                ? `0 0 12px ${rarityColor}88`
                : 'none',
          }}
        >
          <span className="pixel-item-icon-inner">
            {getItemIcon(itemId, 64, rarityColor)}
          </span>
        </motion.div>

        {/* Pixel particles */}
        <AnimatePresence>
          {(phase === 'glow' || phase === 'exit') && particles.map((p, i) => (
            <motion.div
              key={i}
              className="pixel-particle"
              style={{
                width: p.size,
                height: p.size,
                backgroundColor: rarityColor,
              }}
              initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
              animate={{
                x: p.x,
                y: p.y,
                opacity: 0,
                scale: 0.3,
              }}
              transition={{
                duration: 0.6,
                delay: p.delay,
                ease: 'easeOut',
              }}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
