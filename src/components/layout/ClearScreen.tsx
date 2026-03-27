import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'motion/react'
import { useGameStore } from '../../stores/gameStore'
import { BalatroBackground } from '../effects/BalatroBackground'
import { SFX } from '../../utils/sound'
import ShinyText from '../effects/ShinyText'

export function ClearScreen() {
  const { setScreen, startInfiniteMode } = useGameStore()
  const [showButtons, setShowButtons] = useState(false)

  // 3D 카드 tilt
  const cardRef = useRef<HTMLDivElement>(null)
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [15, -15]), { stiffness: 200, damping: 20 })
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-15, 15]), { stiffness: 200, damping: 20 })
  const glareX = useTransform(mouseX, [-0.5, 0.5], [0, 100])
  const glareY = useTransform(mouseY, [-0.5, 0.5], [0, 100])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = cardRef.current?.getBoundingClientRect()
    if (!rect) return
    mouseX.set((e.clientX - rect.left) / rect.width - 0.5)
    mouseY.set((e.clientY - rect.top) / rect.height - 0.5)
  }, [mouseX, mouseY])

  const handleMouseLeave = useCallback(() => {
    mouseX.set(0)
    mouseY.set(0)
  }, [mouseX, mouseY])

  return (
    <div className="h-screen w-screen overflow-hidden font-pixel text-white relative">
      <BalatroBackground mood="profit" />

      {/* 메인 */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full px-4">

        {/* 타이틀 */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="text-center mb-6"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-[#f0b429] mb-3">
            축하합니다
          </h1>
          <p className="text-bal-text-dim text-sm mb-4">
            8분기 인턴 과정을 모두 통과하였습니다
          </p>
          <ShinyText
            text="정규직 전환 확정"
            color="#5ec269"
            shineColor="#a0ffa0"
            speed={3}
            className="text-xl font-bold"
          />
        </motion.div>

        {/* 구분선 */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 1, duration: 0.6 }}
          className="w-48 h-[1px] bg-gradient-to-r from-transparent via-[#f0b42966] to-transparent mb-8"
        />

        {/* 사원증 — 3D 카드 */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.6 }}
          className="mb-10"
          style={{ perspective: 800 }}
        >
          <motion.div
            ref={cardRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
            className="relative bg-[#111119] border border-[#f0b42920] rounded-xl px-8 py-6 text-center cursor-grab active:cursor-grabbing select-none overflow-hidden"
          >
            {/* 홀로그램 글레어 */}
            <motion.div
              className="absolute inset-0 pointer-events-none rounded-xl opacity-[0.07]"
              style={{
                background: useTransform(
                  [glareX, glareY],
                  ([x, y]) => `radial-gradient(circle at ${x}% ${y}%, #fff, transparent 60%)`
                ),
              }}
            />
            {/* 카드 콘텐츠 */}
            <div style={{ transform: 'translateZ(30px)', transformStyle: 'preserve-3d' }}>
              <p className="text-[#f0b429] text-[10px] tracking-[3px] mb-3">STOCK ROGUELIKE</p>
              <p className="text-white text-3xl font-bold mb-1">정규직</p>
              <p className="text-[#5ec269] text-[10px] tracking-[2px] mb-4">FULL-TIME EMPLOYEE</p>
              <div className="w-full h-[1px] bg-[#ffffff08] mb-4" />
              <p className="text-[#c4a0ff] text-sm mb-1">투자 전문가</p>
              <p className="text-[#444] text-[10px]">투자운용부 · SR-2026-001</p>
            </div>
          </motion.div>
        </motion.div>

        {/* 버튼 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.8, duration: 0.5 }}
          onAnimationComplete={() => setShowButtons(true)}
          className="flex flex-col items-center gap-3 w-full max-w-xs"
        >
          <AnimatePresence>
            {showButtons && (
              <>
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="w-full bg-[#f0b429] hover:bg-[#d9a325] text-[#0a0a14] font-bold py-3 rounded-xl transition-colors"
                  onClick={() => { SFX.click(); startInfiniteMode() }}
                >
                  무한 모드 도전
                </motion.button>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.4 }}
                  transition={{ delay: 0.2 }}
                  className="text-[10px] text-bal-text-dim text-center"
                >
                  끝없이 상승하는 목표 수익률에 도전하세요
                </motion.p>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="flex gap-2"
                >
                  <button
                    className="bal-btn text-xs px-5"
                    onClick={() => { SFX.click(); setScreen('meta') }}
                  >
                    메타 업그레이드
                  </button>
                  <button
                    className="bal-btn text-xs px-5"
                    onClick={() => { SFX.click(); setScreen('title') }}
                  >
                    타이틀
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  )
}
