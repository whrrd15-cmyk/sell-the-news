import { useEffect } from 'react'
import { motion } from 'motion/react'
import { useGameStore } from '../../stores/gameStore'
import { useMarketStore } from '../../stores/marketStore'
import { getPortfolioValue, getTotalReturn } from '../../engine/portfolio'
import { BalatroBackground } from '../effects/BalatroBackground'
import { SFX, bgm } from '../../utils/sound'

const INITIAL_CASH = 10000

export function ResultScreen() {
  const { portfolio, market, runConfig, stats, setScreen, startNewRun } = useGameStore()
  const rtMarket = useMarketStore(s => s.market)
  // 실시간 모드에서는 marketStore 가격 사용, 폴백으로 gameStore.market
  const prices = rtMarket?.prices ?? market.prices

  const portfolioValue = getPortfolioValue(portfolio, prices)
  const totalReturn = getTotalReturn(portfolio, prices, INITIAL_CASH)
  const isSuccess = totalReturn >= runConfig.targetReturn

  useEffect(() => { bgm.fadeOut(1000) }, [])
  useEffect(() => {
    // Q8 클리어 시 → 클리어 화면으로 이동
    if (isSuccess && runConfig.runNumber === 8) {
      const timer = setTimeout(() => { SFX.success(); setScreen('clear') }, 600)
      return () => clearTimeout(timer)
    }
    const timer = setTimeout(() => { isSuccess ? SFX.success() : SFX.failure() }, 400)
    return () => clearTimeout(timer)
  }, [isSuccess, runConfig.runNumber, setScreen])

  const fakeRate = stats.fakeNewsTotal > 0 ? ((stats.fakeNewsDetected / stats.fakeNewsTotal) * 100).toFixed(1) : '0.0'
  const predRate = stats.totalTurns > 0 ? ((stats.correctPredictions / stats.totalTurns) * 100).toFixed(1) : '0.0'

  return (
    <div className="min-h-screen text-white font-pixel flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden">
      <BalatroBackground mood={isSuccess ? 'profit' : 'loss'} />

      {/* 결과 헤더 */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 text-center mb-8"
      >
        <h1
          className="text-5xl md:text-7xl font-bold mb-3"
          style={{
            color: isSuccess ? (runConfig.runNumber >= 8 ? '#f0b429' : '#5ec269') : '#e8534a',
            textShadow: isSuccess
              ? (runConfig.runNumber >= 8 ? '0 0 30px #f0b42955' : '0 0 30px #5ec26955')
              : '0 0 30px #e8534a55',
          }}
        >
          {isSuccess
            ? (runConfig.runNumber >= 8 ? '정규직 전환!' : '성공!')
            : '실패'}
        </h1>
        <p className="text-bal-text-dim text-sm">
          {isSuccess
            ? (runConfig.runNumber >= 8
                ? '축하합니다! 8분기 인턴 과정을 모두 통과하여 정규직 전환이 확정되었습니다!'
                : '목표 수익률을 달성했습니다!')
            : '아쉽지만 목표 수익률에 도달하지 못했습니다.'}
        </p>
      </motion.div>

      {/* 최종 성과 */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="relative z-10 bal-panel p-6 max-w-lg w-full mb-4">
        <div className="bal-panel-header">최종 성과</div>
        <div className="grid grid-cols-2 gap-4 text-center p-3">
          <ResultStat label="최종 자산" value={`$${Math.floor(portfolioValue).toLocaleString()}`} color="text-white" />
          <ResultStat label="총 수익률" value={`${(totalReturn * 100).toFixed(1)}%`} color={totalReturn >= 0 ? 'text-bal-green' : 'text-bal-red'} />
          <ResultStat label="목표 수익률" value={`${(runConfig.targetReturn * 100).toFixed(0)}%`} color="text-bal-text-dim" />
          <ResultStat label="초기 자본" value={`$${INITIAL_CASH.toLocaleString()}`} color="text-bal-text-dim" />
        </div>
      </motion.div>

      {/* 런 통계 */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
        className="relative z-10 bal-panel p-6 max-w-lg w-full mb-4">
        <div className="bal-panel-header">런 통계</div>
        <div className="space-y-2 text-sm p-3">
          <StatRow label="진행 턴" value={`${stats.totalTurns} / ${runConfig.maxTurns}`} />
          <StatRow label="가짜 뉴스 탐지율" value={`${fakeRate}%`} accent={Number(fakeRate) >= 50} />
          <StatRow label="예측 정확도" value={`${predRate}%`} accent={Number(predRate) >= 50} />
          <StatRow label="펌프앤덤프 회피" value={`${stats.pumpDumpAvoided} / ${stats.pumpDumpTotal}`} />
          <StatRow label="FUD 회피" value={`${stats.fudAvoided} / ${stats.fudTotal}`} />
        </div>
      </motion.div>

      {/* 학습 리포트 */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
        className="relative z-10 bal-panel p-6 max-w-lg w-full mb-8" style={{ borderColor: '#5b9bd5' }}>
        <div className="bal-panel-header" style={{ color: '#5b9bd5', borderBottomColor: '#5b9bd533' }}>학습 리포트</div>
        <div className="p-3">
          {stats.learnedConcepts.length > 0 ? (
            <ul className="space-y-1.5">
              {stats.learnedConcepts.map((concept, i) => (
                <motion.li key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.8 + i * 0.08 }}
                  className="flex items-start gap-2 text-sm text-bal-text">
                  <span className="text-bal-blue shrink-0">▸</span><span>{concept}</span>
                </motion.li>
              ))}
            </ul>
          ) : (
            <p className="text-bal-text-dim text-sm">다음 런에서는 더 많은 개념을 학습해보세요!</p>
          )}
        </div>
      </motion.div>

      {/* 버튼 */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 }}
        className="relative z-10 flex gap-2 flex-wrap justify-center">
        {isSuccess && runConfig.runNumber !== 8 && (
          <button className="bal-btn bal-btn-green text-lg px-8" onClick={() => startNewRun(runConfig.runNumber + 1)}>다음 분기 →</button>
        )}
        <button className="bal-btn bal-btn-primary text-lg px-8" onClick={() => startNewRun(runConfig.runNumber)}>다시 도전</button>
        <button className="bal-btn bal-btn-gold text-lg px-8" onClick={() => setScreen('meta')}>메타 업그레이드</button>
        <button className="bal-btn text-lg px-8" onClick={() => setScreen('title')}>타이틀</button>
      </motion.div>
    </div>
  )
}

function ResultStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <p className="text-[10px] text-bal-text-dim mb-1">{label}</p>
      <p className={`${color} text-lg font-bold`}>{value}</p>
    </div>
  )
}

function StatRow({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-bal-text-dim">{label}</span>
      <span className={accent ? 'text-bal-green font-bold' : 'text-white'}>{value}</span>
    </div>
  )
}
