/**
 * 스킬 & 아이템 아이콘 — PixelLab 고해상도 픽셀 아트
 */

const SKILL_ICON_SRC: Record<string, string> = {
  technical_analysis: '/icons/skills/technical-analysis.png',
  deep_news: '/icons/skills/deep-news.png',
  insider_info: '/icons/skills/insider-info.png',
  sector_analysis: '/icons/skills/sector-analysis.png',
  social_analysis: '/icons/skills/social-analysis.png',
  correlation_view: '/icons/skills/correlation-view.png',
  fact_check: '/icons/skills/fact-check.png',
  source_tracking: '/icons/skills/source-tracking.png',
  conflict_detection: '/icons/skills/conflict-detection.png',
  bias_warning: '/icons/skills/bias-warning.png',
  stale_detection: '/icons/skills/stale-detection.png',
  noise_filter: '/icons/skills/noise-filter.png',
  leverage: '/icons/skills/leverage.png',
  short_selling: '/icons/skills/short-selling.png',
  stop_loss: '/icons/skills/stop-loss.png',
  trailing_stop: '/icons/skills/trailing-stop.png',
  dca_strategy: '/icons/skills/dca-strategy.png',
  portfolio_hedge: '/icons/skills/portfolio-hedge.png',
  dividend: '/icons/skills/dividend.png',
  interest: '/icons/skills/interest.png',
  forex_hedge: '/icons/skills/forex-hedge.png',
  compound_interest: '/icons/skills/compound-interest.png',
  market_intuition: '/icons/skills/market-intuition.png',
}

export function getSkillIcon(id: string, size: number = 24, _color?: string): JSX.Element {
  const src = SKILL_ICON_SRC[id]
  if (!src) return <span style={{ width: size, height: size, display: 'inline-block' }} />
  return <img src={src} alt="" style={{ width: size, height: size, imageRendering: 'pixelated' as const }} />
}

const ITEM_ICON_SRC: Record<string, string> = {
  hint_card: '/icons/items/hint-card.png',
  cash_boost_small: '/icons/items/cash-boost.png',
  emergency_fund: '/icons/items/emergency-fund.png',
  insurance: '/icons/items/insurance.png',
  double_rp: '/icons/items/double-rp.png',
  market_report: '/icons/items/market-report.png',
  sector_report: '/icons/items/sector-report.png',
  insider_tip: '/icons/items/insider-tip.png',
  volatility_shield: '/icons/items/volatility-shield.png',
  crystal_ball: '/icons/items/crystal-ball.png',
  insider_network: '/icons/items/insider-network.png',
}

export function getItemIcon(id: string, size: number = 24, _color?: string): JSX.Element {
  const src = ITEM_ICON_SRC[id]
  if (!src) return <span style={{ width: size, height: size, display: 'inline-block' }} />
  return <img src={src} alt="" style={{ width: size, height: size, imageRendering: 'pixelated' as const }} />
}

export function getSectorIcon(sector: string, size: number = 14, color: string = 'currentColor'): JSX.Element {
  switch (sector) {
    case 'tech': return <svg width={size} height={size} viewBox="0 0 14 14" fill="none"><rect x="2" y="3" width="10" height="7" rx="1" stroke={color} strokeWidth="1.2"/><line x1="5" y1="10" x2="9" y2="10" stroke={color} strokeWidth="1.2"/><line x1="7" y1="10" x2="7" y2="12" stroke={color} strokeWidth="1.2"/></svg>
    case 'energy': return <svg width={size} height={size} viewBox="0 0 14 14" fill="none"><path d="M8 1L4 8h3l-1 5 5-7H8l1-5z" stroke={color} strokeWidth="1.2" strokeLinejoin="round"/></svg>
    case 'finance': return <svg width={size} height={size} viewBox="0 0 14 14" fill="none"><rect x="2" y="5" width="10" height="7" rx="1" stroke={color} strokeWidth="1.2"/><path d="M4 5V3a3 3 0 016 0v2" stroke={color} strokeWidth="1.2"/></svg>
    case 'consumer': return <svg width={size} height={size} viewBox="0 0 14 14" fill="none"><path d="M3 4h8l-1 6H4L3 4z" stroke={color} strokeWidth="1.2" strokeLinejoin="round"/><line x1="5" y1="1" x2="7" y2="4" stroke={color} strokeWidth="1.2"/></svg>
    case 'healthcare': return <svg width={size} height={size} viewBox="0 0 14 14" fill="none"><path d="M7 3C5.5 1 2 1.5 2 4.5S7 9 7 9s5-1.5 5-4.5S8.5 1 7 3z" stroke={color} strokeWidth="1.2"/><line x1="7" y1="4.5" x2="7" y2="7.5" stroke={color} strokeWidth="1"/><line x1="5.5" y1="6" x2="8.5" y2="6" stroke={color} strokeWidth="1"/></svg>
    case 'etf': return <svg width={size} height={size} viewBox="0 0 14 14" fill="none"><rect x="1" y="1" width="12" height="12" rx="2" stroke={color} strokeWidth="1.2"/><line x1="1" y1="7" x2="13" y2="7" stroke={color} strokeWidth="0.8"/><line x1="7" y1="1" x2="7" y2="13" stroke={color} strokeWidth="0.8"/></svg>
    default: return <span style={{ width: size, height: size }} />
  }
}

export function ShopIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2 4l1-3h10l1 3" strokeLinejoin="round" />
      <rect x="2" y="4" width="12" height="9" rx="1" />
      <path d="M6 8h4" strokeLinecap="round" />
    </svg>
  )
}
