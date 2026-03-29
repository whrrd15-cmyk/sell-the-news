import type { MarketCondition, Sector } from '../../data/types'

interface MarketConditionModalProps {
  conditions: Record<string, MarketCondition>
  onClose: () => void
}

const SECTOR_LABELS: Record<Sector, string> = {
  tech: '기술',
  energy: '에너지',
  finance: '금융',
  consumer: '소비재',
  healthcare: '헬스케어',
}

const CONDITION_INFO: Record<MarketCondition, { label: string; icon: string; color: string; strategy: string }> = {
  bull_trend: {
    label: '상승 추세',
    icon: '📈',
    color: '#5ec269',
    strategy: '추세 매매: 상승 모멘텀을 따라 적극적으로 매수하세요. 단, 추세 전환에 주의!',
  },
  range_bound: {
    label: '횡보',
    icon: '📊',
    color: '#e88c3a',
    strategy: '박스권 리밸런싱: 상단에서 매도, 하단에서 매수하는 기계적 전략이 효과적입니다.',
  },
  bear_market: {
    label: '하락 추세',
    icon: '📉',
    color: '#e8534a',
    strategy: '분할 매수(DCA): 바닥을 잡으려 하지 말고, 정해진 금액을 기계적으로 분할 매수하세요.',
  },
  neutral: {
    label: '중립',
    icon: '➖',
    color: '#8888aa',
    strategy: '관망: 뚜렷한 추세가 없으므로 신중하게 접근하세요.',
  },
}

const SECTORS: Sector[] = ['tech', 'energy', 'finance', 'consumer', 'healthcare']

export function MarketConditionModal({ conditions, onClose }: MarketConditionModalProps) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#1a1a2e',
          border: '1px solid #7799ff33',
          borderRadius: 12,
          padding: 20,
          maxWidth: 420,
          width: '90%',
          boxShadow: '0 0 30px rgba(119,153,255,0.15)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ fontSize: 14, fontWeight: 700, color: '#7799ff', marginBottom: 16 }}>
          📋 시장 상황 리포트
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {SECTORS.map(sector => {
            const condition = conditions[sector] ?? 'neutral'
            const info = CONDITION_INFO[condition]
            return (
              <div
                key={sector}
                style={{
                  background: `${info.color}08`,
                  border: `1px solid ${info.color}22`,
                  borderRadius: 8,
                  padding: '10px 12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#ddd' }}>
                    {SECTOR_LABELS[sector]}
                  </span>
                  <span style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: info.color,
                    background: `${info.color}15`,
                    padding: '1px 6px',
                    borderRadius: 3,
                  }}>
                    {info.icon} {info.label}
                  </span>
                </div>
                <div style={{ fontSize: 10, color: '#aaa', lineHeight: 1.4 }}>
                  💡 {info.strategy}
                </div>
              </div>
            )
          })}
        </div>

        <button
          style={{
            marginTop: 16,
            width: '100%',
            padding: '8px 0',
            background: '#7799ff22',
            border: '1px solid #7799ff44',
            borderRadius: 6,
            color: '#7799ff',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
          }}
          onClick={onClose}
        >
          확인
        </button>
      </div>
    </div>
  )
}
