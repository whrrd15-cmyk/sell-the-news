import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'

interface RotatingTextProps {
  texts: string[]
  rotationInterval?: number
  className?: string
  splitBy?: 'characters' | 'words'
  staggerDuration?: number
  initial?: object
  animate?: object
  exit?: object
  loop?: boolean
  auto?: boolean
}

export default function RotatingText({
  texts,
  rotationInterval = 2000,
  className = '',
  splitBy = 'characters',
  staggerDuration = 0.03,
  initial = { y: '100%', opacity: 0 },
  animate = { y: 0, opacity: 1 },
  exit = { y: '-120%', opacity: 0 },
  loop = true,
  auto = true,
}: RotatingTextProps) {
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    if (!auto) return
    const interval = setInterval(() => {
      setCurrentIndex((prev) => {
        if (prev === texts.length - 1) {
          return loop ? 0 : prev
        }
        return prev + 1
      })
    }, rotationInterval)
    return () => clearInterval(interval)
  }, [texts.length, rotationInterval, loop, auto])

  const currentText = texts[currentIndex]
  const elements = splitBy === 'words' ? currentText.split(' ') : currentText.split('')

  return (
    <span className={`inline-flex overflow-hidden ${className}`}>
      <AnimatePresence mode="wait">
        <motion.span
          key={currentIndex}
          className="inline-flex"
          initial="initial"
          animate="animate"
          exit="exit"
          variants={{
            initial: {},
            animate: {
              transition: {
                staggerChildren: staggerDuration,
              },
            },
            exit: {
              transition: {
                staggerChildren: staggerDuration / 2,
              },
            },
          }}
        >
          {elements.map((el, i) => (
            <motion.span
              key={`${el}-${i}`}
              className="inline-block"
              variants={{
                initial,
                animate: {
                  ...animate,
                  transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] },
                },
                exit: {
                  ...exit,
                  transition: { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] },
                },
              }}
            >
              {el === ' ' ? '\u00A0' : el}
              {splitBy === 'words' && i < elements.length - 1 ? '\u00A0' : ''}
            </motion.span>
          ))}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}
