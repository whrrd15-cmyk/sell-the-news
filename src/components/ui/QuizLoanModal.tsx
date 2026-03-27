import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { QUIZ_EVENTS } from '../../data/specialEvents'
import { useGameStore } from '../../stores/gameStore'
import { SFX } from '../../utils/sound'

interface QuizLoanModalProps {
  shortfall: number
  itemName: string
  onSuccess: () => void
  onClose: () => void
}

export function QuizLoanModal({ shortfall, itemName, onSuccess, onClose }: QuizLoanModalProps) {
  const { usedQuizIds, attemptQuizLoan } = useGameStore()
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [result, setResult] = useState<'correct' | 'wrong' | null>(null)

  // Pick unused quiz
  const availableQuizzes = QUIZ_EVENTS.filter(q => !usedQuizIds.has(q.id))
  const quiz = availableQuizzes.length > 0
    ? availableQuizzes[Math.floor(Math.random() * availableQuizzes.length)]
    : null

  // Use a stable quiz reference via useState to prevent re-randomizing
  const [stableQuiz] = useState(() => quiz)

  if (!stableQuiz) {
    return (
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="bal-panel p-6 max-w-md w-full font-pixel text-center"
        >
          <div className="text-4xl mb-4">📝</div>
          <h3 className="text-lg text-white font-bold mb-2">퀴즈 소진</h3>
          <p className="text-sm text-bal-text-dim mb-6">
            이번 런에서 사용 가능한 퀴즈를 모두 소진했습니다.
          </p>
          <button onClick={onClose} className="bal-btn w-full">닫기</button>
        </motion.div>
      </motion.div>
    )
  }

  const handleAnswer = (index: number) => {
    if (result) return
    setSelectedAnswer(index)

    const isCorrect = attemptQuizLoan(stableQuiz.id, index, shortfall)
    if (isCorrect) {
      SFX.quizCorrect()
      setResult('correct')
      // Delayed success callback
      setTimeout(() => onSuccess(), 1500)
    } else {
      SFX.quizWrong()
      setResult('wrong')
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4"
    >
      <motion.div
        initial={{ scale: 0.85, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="bal-panel p-6 max-w-lg w-full font-pixel"
        style={{ borderColor: '#9b72cf', boxShadow: '0 0 20px rgba(155,114,207,0.2)' }}
      >
        {/* Header */}
        <div className="text-center mb-4">
          <div className="text-4xl mb-2">{stableQuiz.icon}</div>
          <h3 className="text-lg text-white font-bold mb-1">퀴즈로 RP 충당</h3>
          <p className="text-xs text-bal-text-dim">
            <span className="text-bal-purple font-bold">{itemName}</span> 구매에
            <span className="text-bal-red font-bold ml-1">{shortfall} RP</span> 가 부족합니다
          </p>
          <p className="text-xs text-bal-text-dim mt-1">
            정답을 맞히면 부족한 RP를 충당할 수 있습니다!
          </p>
        </div>

        {/* Question */}
        <div className="bal-panel-inset p-4 mb-4">
          <p className="text-sm text-white leading-relaxed">{stableQuiz.question}</p>
        </div>

        {/* Options */}
        <div className="space-y-2 mb-4">
          {stableQuiz.options?.map((option, i) => {
            const isSelected = selectedAnswer === i
            const isCorrectAnswer = i === stableQuiz.correctIndex
            let borderClass = 'border-white/10 hover:border-bal-purple/40 hover:bg-bal-purple/5'
            let textExtra = ''

            if (result) {
              if (isCorrectAnswer) {
                borderClass = 'border-bal-green/60 bg-bal-green/10'
                textExtra = 'text-bal-green'
              } else if (isSelected && !isCorrectAnswer) {
                borderClass = 'border-bal-red/60 bg-bal-red/10'
                textExtra = 'text-bal-red'
              } else {
                borderClass = 'border-white/5 opacity-40'
              }
            }

            return (
              <button
                key={i}
                onClick={() => handleAnswer(i)}
                disabled={result !== null}
                className={`w-full text-left px-4 py-3 border rounded-lg transition-all ${
                  result ? '' : 'cursor-pointer'
                } ${borderClass}`}
              >
                <div className={`text-sm font-bold ${textExtra || 'text-white'}`}>
                  {String.fromCharCode(65 + i)}. {option}
                </div>
              </button>
            )
          })}
        </div>

        {/* Result feedback */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="bal-panel-inset p-4 mb-4"
            >
              {result === 'correct' ? (
                <>
                  <p className="text-bal-green font-bold text-sm mb-1">
                    🎉 정답! +{shortfall} RP 충당 완료
                  </p>
                  <p className="text-xs text-bal-text-dim leading-relaxed">
                    {stableQuiz.explanation}
                  </p>
                  <p className="text-xs text-bal-purple mt-2 font-bold">
                    자동으로 구매가 완료됩니다...
                  </p>
                </>
              ) : (
                <>
                  <p className="text-bal-red font-bold text-sm mb-1">
                    😢 오답입니다
                  </p>
                  <p className="text-xs text-bal-text-dim mb-1">
                    정답: {stableQuiz.options?.[stableQuiz.correctIndex ?? 0]}
                  </p>
                  <p className="text-xs text-bal-text-dim leading-relaxed">
                    {stableQuiz.explanation}
                  </p>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Close/dismiss */}
        {result === 'wrong' && (
          <motion.button
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
            onClick={onClose}
            className="bal-btn w-full"
          >
            닫기
          </motion.button>
        )}

        {!result && (
          <button onClick={onClose} className="w-full text-center text-xs text-bal-text-dim hover:text-white transition-colors cursor-pointer mt-2">
            취소
          </button>
        )}
      </motion.div>
    </motion.div>
  )
}
