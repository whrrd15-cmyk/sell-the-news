import type { ReactNode } from 'react'

interface IconProps {
  size?: number
  color?: string
}

// ═══════════════════════════════════════════
//  스킬 아이콘 (16개)
// ═══════════════════════════════════════════

function TechnicalAnalysisIcon({ size = 24, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 18 7 12 11 15 15 8 21 4" />
      <path d="M15 4h6v6" opacity={0.5} />
      <path d="M3 20h18" strokeWidth={1} opacity={0.3} />
    </svg>
  )
}

function DeepNewsIcon({ size = 24, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="14" height="18" rx="1" />
      <line x1="6" y1="7" x2="14" y2="7" />
      <line x1="6" y1="10" x2="14" y2="10" />
      <line x1="6" y1="13" x2="10" y2="13" />
      <circle cx="18" cy="18" r="4" fill="none" />
      <line x1="21" y1="21" x2="22" y2="22" />
    </svg>
  )
}

function InsiderInfoIcon({ size = 24, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 5c-5 0-9 4-9 7s4 7 9 7 9-4 9-7-4-7-9-7z" opacity={0.4} />
      <path d="M9 3v2M15 3v2" strokeWidth={1.5} />
      <circle cx="12" cy="12" r="1" fill={color} />
    </svg>
  )
}

function SectorAnalysisIcon({ size = 24, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3v9l6.36 3.64" />
      <path d="M12 12L5.64 15.64" opacity={0.5} />
    </svg>
  )
}

function FactCheckIcon({ size = 24, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3L4 7v6c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V7l-8-4z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  )
}

function SourceTrackingIcon({ size = 24, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7" cy="18" r="2" fill={color} opacity={0.3} />
      <circle cx="12" cy="14" r="2" fill={color} opacity={0.5} />
      <circle cx="17" cy="10" r="2" fill={color} opacity={0.7} />
      <path d="M7 18l5-4 5-4" strokeDasharray="2 2" />
      <circle cx="20" cy="6" r="1.5" fill={color} />
    </svg>
  )
}

function ConflictDetectionIcon({ size = 24, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 20h20L12 2z" />
      <line x1="12" y1="9" x2="12" y2="14" />
      <circle cx="12" cy="17" r="0.5" fill={color} />
    </svg>
  )
}

function BiasWarningIcon({ size = 24, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 4c-2 0-4 1-5 3-1 2-1 4 0 6 1 1.5 2 2.5 5 3 3-.5 4-1.5 5-3 1-2 1-4 0-6-1-2-3-3-5-3z" />
      <path d="M9 20h6" />
      <path d="M10 22h4" />
      <line x1="12" y1="16" x2="12" y2="18" />
      <path d="M8 9c1-1 2-1 4-1s3 0 4 1" opacity={0.4} />
      <circle cx="9" cy="11" r="1" fill={color} opacity={0.6} />
      <circle cx="15" cy="11" r="1" fill={color} opacity={0.6} />
    </svg>
  )
}

function StaleDetectionIcon({ size = 24, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <polyline points="12 6 12 12 16 14" />
      <line x1="4" y1="4" x2="20" y2="20" strokeWidth={2.5} opacity={0.6} />
    </svg>
  )
}

function LeverageIcon({ size = 24, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <text x="5" y="17" fontSize="14" fontWeight="bold" fill={color} stroke="none" fontFamily="monospace">x2</text>
      <path d="M3 6l3-3 3 3" opacity={0.5} />
      <line x1="6" y1="3" x2="6" y2="10" opacity={0.5} />
      <path d="M18 6l3-3" strokeWidth={1.5} opacity={0.4} />
    </svg>
  )
}

function ShortSellingIcon({ size = 24, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 7 10 11 7 15 14 21 20" />
      <path d="M21 14v6h-6" />
      <line x1="3" y1="3" x2="3" y2="20" strokeWidth={1} opacity={0.3} />
      <line x1="3" y1="20" x2="21" y2="20" strokeWidth={1} opacity={0.3} />
    </svg>
  )
}

function DoubleTradeIcon({ size = 24, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 4l-4 8h8L8 20" />
      <path d="M16 4l-4 8h8L16 20" opacity={0.5} />
    </svg>
  )
}

function StopLossIcon({ size = 24, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3L4 7v6c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V7l-8-4z" />
      <line x1="8" y1="12" x2="16" y2="12" strokeWidth={2.5} />
    </svg>
  )
}

function DividendIcon({ size = 24, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="10" r="6" />
      <text x="9.5" y="13" fontSize="8" fontWeight="bold" fill={color} stroke="none" fontFamily="monospace">$</text>
      <path d="M8 18c1 2 2.5 3 4 3s3-1 4-3" opacity={0.5} />
      <path d="M6 20l-2 1M18 20l2 1" strokeWidth={1} opacity={0.3} />
    </svg>
  )
}

function IntuitionIcon({ size = 24, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" opacity={0.5} />
      <circle cx="12" cy="12" r="1.5" fill={color} />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2" strokeWidth={1} opacity={0.3} />
    </svg>
  )
}

function InterestIcon({ size = 24, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="8" width="18" height="12" rx="2" />
      <path d="M3 8l9-5 9 5" />
      <line x1="7" y1="12" x2="7" y2="16" />
      <line x1="12" y1="12" x2="12" y2="16" />
      <line x1="17" y1="12" x2="17" y2="16" />
      <line x1="3" y1="20" x2="21" y2="20" strokeWidth={2.5} />
    </svg>
  )
}

// ═══════════════════════════════════════════
//  아이템 아이콘 (9개)
// ═══════════════════════════════════════════

// ═══════════════════════════════════════════
//  픽셀 아이템 아이콘 (16x16 grid, crispEdges)
// ═══════════════════════════════════════════

function HintCardIcon({ size = 24, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" style={{ imageRendering: 'pixelated' as const }}>
      {/* Card body */}
      <rect x={4} y={1} width={8} height={13} fill={color} opacity={0.15} />
      <rect x={4} y={1} width={8} height={1} fill={color} />
      <rect x={4} y={13} width={8} height={1} fill={color} />
      <rect x={4} y={1} width={1} height={13} fill={color} />
      <rect x={11} y={1} width={1} height={13} fill={color} />
      {/* ? mark */}
      <rect x={6} y={4} width={4} height={1} fill={color} />
      <rect x={9} y={5} width={1} height={2} fill={color} />
      <rect x={7} y={7} width={2} height={1} fill={color} />
      <rect x={7} y={9} width={2} height={1} fill={color} />
      <rect x={7} y={11} width={2} height={1} fill={color} />
    </svg>
  )
}

function RerollNewsIcon({ size = 24, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" style={{ imageRendering: 'pixelated' as const }}>
      {/* Paper */}
      <rect x={2} y={2} width={9} height={12} fill={color} opacity={0.15} />
      <rect x={2} y={2} width={9} height={1} fill={color} />
      <rect x={2} y={13} width={9} height={1} fill={color} />
      <rect x={2} y={2} width={1} height={12} fill={color} />
      <rect x={10} y={2} width={1} height={12} fill={color} />
      {/* Text lines */}
      <rect x={4} y={4} width={5} height={1} fill={color} opacity={0.6} />
      <rect x={4} y={6} width={4} height={1} fill={color} opacity={0.4} />
      <rect x={4} y={8} width={5} height={1} fill={color} opacity={0.6} />
      <rect x={4} y={10} width={3} height={1} fill={color} opacity={0.4} />
      {/* Refresh arrow */}
      <rect x={12} y={5} width={1} height={4} fill={color} />
      <rect x={13} y={4} width={1} height={1} fill={color} />
      <rect x={13} y={9} width={1} height={1} fill={color} />
      <rect x={14} y={5} width={1} height={1} fill={color} opacity={0.7} />
      <rect x={11} y={9} width={1} height={1} fill={color} opacity={0.7} />
    </svg>
  )
}

function CashBoostIcon({ size = 24, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" style={{ imageRendering: 'pixelated' as const }}>
      {/* Bottom coin */}
      <rect x={4} y={11} width={8} height={3} fill={color} opacity={0.2} />
      <rect x={4} y={11} width={8} height={1} fill={color} />
      <rect x={4} y={13} width={8} height={1} fill={color} />
      <rect x={4} y={11} width={1} height={3} fill={color} />
      <rect x={11} y={11} width={1} height={3} fill={color} />
      {/* Middle coin */}
      <rect x={4} y={7} width={8} height={3} fill={color} opacity={0.15} />
      <rect x={4} y={7} width={8} height={1} fill={color} opacity={0.7} />
      <rect x={4} y={9} width={8} height={1} fill={color} opacity={0.7} />
      <rect x={4} y={7} width={1} height={3} fill={color} opacity={0.7} />
      <rect x={11} y={7} width={1} height={3} fill={color} opacity={0.7} />
      {/* Top coin */}
      <rect x={4} y={3} width={8} height={3} fill={color} opacity={0.1} />
      <rect x={4} y={3} width={8} height={1} fill={color} opacity={0.45} />
      <rect x={4} y={5} width={8} height={1} fill={color} opacity={0.45} />
      <rect x={4} y={3} width={1} height={3} fill={color} opacity={0.45} />
      <rect x={11} y={3} width={1} height={3} fill={color} opacity={0.45} />
      {/* $ symbol on front coin */}
      <rect x={7} y={12} width={2} height={1} fill={color} />
    </svg>
  )
}

function InsuranceIcon({ size = 24, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" style={{ imageRendering: 'pixelated' as const }}>
      {/* Shield outline */}
      <rect x={7} y={1} width={2} height={1} fill={color} />
      <rect x={5} y={2} width={2} height={1} fill={color} />
      <rect x={9} y={2} width={2} height={1} fill={color} />
      <rect x={4} y={3} width={1} height={6} fill={color} />
      <rect x={11} y={3} width={1} height={6} fill={color} />
      <rect x={5} y={9} width={1} height={2} fill={color} />
      <rect x={10} y={9} width={1} height={2} fill={color} />
      <rect x={6} y={11} width={1} height={1} fill={color} />
      <rect x={9} y={11} width={1} height={1} fill={color} />
      <rect x={7} y={12} width={2} height={1} fill={color} />
      {/* Shield fill */}
      <rect x={5} y={3} width={6} height={6} fill={color} opacity={0.12} />
      {/* Checkmark */}
      <rect x={6} y={7} width={1} height={1} fill={color} />
      <rect x={7} y={8} width={1} height={1} fill={color} />
      <rect x={8} y={7} width={1} height={1} fill={color} />
      <rect x={9} y={6} width={1} height={1} fill={color} />
    </svg>
  )
}

function DoubleRpIcon({ size = 24, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" style={{ imageRendering: 'pixelated' as const }}>
      {/* Circle */}
      <rect x={4} y={2} width={6} height={1} fill={color} />
      <rect x={3} y={3} width={1} height={1} fill={color} />
      <rect x={10} y={3} width={1} height={1} fill={color} />
      <rect x={2} y={4} width={1} height={6} fill={color} />
      <rect x={11} y={4} width={1} height={6} fill={color} />
      <rect x={3} y={10} width={1} height={1} fill={color} />
      <rect x={10} y={10} width={1} height={1} fill={color} />
      <rect x={4} y={11} width={6} height={1} fill={color} />
      <rect x={3} y={3} width={8} height={8} fill={color} opacity={0.1} />
      {/* R letter */}
      <rect x={4} y={5} width={1} height={4} fill={color} />
      <rect x={5} y={5} width={2} height={1} fill={color} />
      <rect x={7} y={6} width={1} height={1} fill={color} />
      <rect x={5} y={7} width={2} height={1} fill={color} />
      <rect x={7} y={8} width={1} height={1} fill={color} />
      {/* x2 */}
      <rect x={12} y={10} width={1} height={1} fill={color} opacity={0.8} />
      <rect x={14} y={10} width={1} height={1} fill={color} opacity={0.8} />
      <rect x={13} y={11} width={1} height={1} fill={color} opacity={0.8} />
      <rect x={12} y={12} width={1} height={1} fill={color} opacity={0.8} />
      <rect x={14} y={12} width={1} height={1} fill={color} opacity={0.8} />
    </svg>
  )
}

function MarketReportIcon({ size = 24, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" style={{ imageRendering: 'pixelated' as const }}>
      {/* Document */}
      <rect x={3} y={1} width={10} height={14} fill={color} opacity={0.12} />
      <rect x={3} y={1} width={10} height={1} fill={color} />
      <rect x={3} y={14} width={10} height={1} fill={color} />
      <rect x={3} y={1} width={1} height={14} fill={color} />
      <rect x={12} y={1} width={1} height={14} fill={color} />
      {/* Text lines */}
      <rect x={5} y={3} width={6} height={1} fill={color} opacity={0.5} />
      <rect x={5} y={5} width={4} height={1} fill={color} opacity={0.3} />
      {/* Chart line going up */}
      <rect x={5} y={11} width={1} height={1} fill={color} />
      <rect x={6} y={10} width={1} height={1} fill={color} />
      <rect x={7} y={11} width={1} height={1} fill={color} />
      <rect x={8} y={9} width={1} height={1} fill={color} />
      <rect x={9} y={8} width={1} height={1} fill={color} />
      <rect x={10} y={7} width={1} height={1} fill={color} />
    </svg>
  )
}

function InsiderTipIcon({ size = 24, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" style={{ imageRendering: 'pixelated' as const }}>
      {/* Megaphone body */}
      <rect x={2} y={6} width={3} height={4} fill={color} opacity={0.2} />
      <rect x={2} y={6} width={1} height={4} fill={color} />
      <rect x={4} y={6} width={1} height={4} fill={color} />
      <rect x={5} y={5} width={1} height={6} fill={color} />
      <rect x={6} y={4} width={1} height={8} fill={color} />
      <rect x={7} y={3} width={1} height={10} fill={color} />
      <rect x={8} y={3} width={2} height={1} fill={color} />
      <rect x={8} y={12} width={2} height={1} fill={color} />
      <rect x={10} y={3} width={1} height={10} fill={color} />
      {/* Sound waves */}
      <rect x={12} y={5} width={1} height={1} fill={color} opacity={0.5} />
      <rect x={12} y={7} width={1} height={2} fill={color} opacity={0.5} />
      <rect x={12} y={10} width={1} height={1} fill={color} opacity={0.5} />
      <rect x={14} y={7} width={1} height={2} fill={color} opacity={0.3} />
      {/* ! dot */}
      <rect x={8} y={6} width={1} height={3} fill={color} />
      <rect x={8} y={10} width={1} height={1} fill={color} />
    </svg>
  )
}

function TimeRewindIcon({ size = 24, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" style={{ imageRendering: 'pixelated' as const }}>
      {/* Clock circle */}
      <rect x={5} y={1} width={6} height={1} fill={color} />
      <rect x={4} y={2} width={1} height={1} fill={color} />
      <rect x={11} y={2} width={1} height={1} fill={color} />
      <rect x={3} y={3} width={1} height={8} fill={color} />
      <rect x={12} y={3} width={1} height={8} fill={color} />
      <rect x={4} y={11} width={1} height={1} fill={color} />
      <rect x={11} y={11} width={1} height={1} fill={color} />
      <rect x={5} y={12} width={6} height={1} fill={color} />
      <rect x={4} y={2} width={8} height={10} fill={color} opacity={0.08} />
      {/* Clock hands */}
      <rect x={7} y={4} width={1} height={4} fill={color} />
      <rect x={8} y={7} width={2} height={1} fill={color} />
      {/* Rewind arrow (left) */}
      <rect x={1} y={6} width={1} height={1} fill={color} opacity={0.7} />
      <rect x={0} y={7} width={1} height={1} fill={color} />
      <rect x={1} y={8} width={1} height={1} fill={color} opacity={0.7} />
      <rect x={1} y={7} width={2} height={1} fill={color} />
    </svg>
  )
}

function CrystalBallIcon({ size = 24, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" style={{ imageRendering: 'pixelated' as const }}>
      {/* Sphere */}
      <rect x={5} y={2} width={6} height={1} fill={color} />
      <rect x={4} y={3} width={1} height={1} fill={color} />
      <rect x={11} y={3} width={1} height={1} fill={color} />
      <rect x={3} y={4} width={1} height={6} fill={color} />
      <rect x={12} y={4} width={1} height={6} fill={color} />
      <rect x={4} y={10} width={1} height={1} fill={color} />
      <rect x={11} y={10} width={1} height={1} fill={color} />
      <rect x={5} y={11} width={6} height={1} fill={color} />
      <rect x={4} y={3} width={8} height={8} fill={color} opacity={0.1} />
      {/* Inner sparkles */}
      <rect x={6} y={5} width={1} height={1} fill={color} opacity={0.7} />
      <rect x={9} y={4} width={1} height={1} fill={color} opacity={0.5} />
      <rect x={7} y={8} width={1} height={1} fill={color} opacity={0.4} />
      <rect x={10} y={7} width={1} height={1} fill={color} opacity={0.6} />
      {/* Base/pedestal */}
      <rect x={4} y={12} width={8} height={1} fill={color} opacity={0.6} />
      <rect x={5} y={13} width={6} height={1} fill={color} />
    </svg>
  )
}

// ═══════════════════════════════════════════
//  공용 아이콘 (상점, 인벤토리 등)
// ═══════════════════════════════════════════

export function ShopIcon({ size = 24, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9h18l-2 11H5L3 9z" />
      <path d="M3 9l2-5h14l2 5" />
      <path d="M9 9v2a3 3 0 0 0 6 0V9" opacity={0.5} />
    </svg>
  )
}

export function BackpackIcon({ size = 24, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="8" width="14" height="13" rx="2" />
      <path d="M8 8V6a4 4 0 0 1 8 0v2" />
      <line x1="5" y1="14" x2="19" y2="14" opacity={0.4} />
      <rect x="9" y="12" width="6" height="4" rx="1" opacity={0.3} fill={color} />
    </svg>
  )
}

// ═══════════════════════════════════════════
//  섹터 아이콘 (6개)
// ═══════════════════════════════════════════

export function SectorTechIcon({ size = 24, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="14" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="18" x2="12" y2="21" />
      <path d="M7 9h3M14 9h3M7 12h10" strokeWidth={1.5} opacity={0.5} />
    </svg>
  )
}

export function SectorEnergyIcon({ size = 24, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2L4 14h7l-2 8 9-12h-7l2-8z" />
    </svg>
  )
}

export function SectorFinanceIcon({ size = 24, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21h18" />
      <path d="M5 21V10" />
      <path d="M19 21V10" />
      <path d="M9 21V14" />
      <path d="M15 21V14" />
      <path d="M12 3L3 10h18L12 3z" />
    </svg>
  )
}

export function SectorConsumerIcon({ size = 24, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  )
}

export function SectorHealthIcon({ size = 24, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" />
      <path d="M12 9v6M9 12h6" strokeWidth={1.5} opacity={0.6} />
    </svg>
  )
}

export function SectorETFIcon({ size = 24, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <polyline points="7 16 10 11 13 14 17 8" />
      <path d="M17 8h-3" strokeWidth={1.5} />
      <path d="M14 8v3" strokeWidth={1.5} />
    </svg>
  )
}

export const SECTOR_ICON_MAP: Record<string, (props: IconProps) => ReactNode> = {
  tech: SectorTechIcon,
  energy: SectorEnergyIcon,
  finance: SectorFinanceIcon,
  consumer: SectorConsumerIcon,
  healthcare: SectorHealthIcon,
  etf: SectorETFIcon,
}

export function getSectorIcon(sector: string, size = 24, color = 'currentColor'): ReactNode {
  const Icon = SECTOR_ICON_MAP[sector]
  return Icon ? <Icon size={size} color={color} /> : null
}

// ═══════════════════════════════════════════
//  매핑 함수
// ═══════════════════════════════════════════

const SKILL_ICON_MAP: Record<string, (props: IconProps) => ReactNode> = {
  technical_analysis: TechnicalAnalysisIcon,
  deep_news: DeepNewsIcon,
  insider_info: InsiderInfoIcon,
  sector_analysis: SectorAnalysisIcon,
  fact_check: FactCheckIcon,
  source_tracking: SourceTrackingIcon,
  conflict_detection: ConflictDetectionIcon,
  bias_warning: BiasWarningIcon,
  stale_detection: StaleDetectionIcon,
  leverage: LeverageIcon,
  short_selling: ShortSellingIcon,
  double_trade: DoubleTradeIcon,
  stop_loss: StopLossIcon,
  dividend: DividendIcon,
  intuition: IntuitionIcon,
  interest: InterestIcon,
}

const ITEM_ICON_MAP: Record<string, (props: IconProps) => ReactNode> = {
  hint_card: HintCardIcon,
  reroll_news: RerollNewsIcon,
  cash_boost_small: CashBoostIcon,
  insurance: InsuranceIcon,
  double_rp: DoubleRpIcon,
  market_report: MarketReportIcon,
  insider_tip: InsiderTipIcon,
  time_rewind: TimeRewindIcon,
  crystal_ball: CrystalBallIcon,
}

export function getSkillIcon(id: string, size = 24, color = 'currentColor'): ReactNode {
  const Icon = SKILL_ICON_MAP[id]
  return Icon ? <Icon size={size} color={color} /> : <span style={{ fontSize: size * 0.8 }}>?</span>
}

export function getItemIcon(id: string, size = 24, color = 'currentColor'): ReactNode {
  const Icon = ITEM_ICON_MAP[id]
  return Icon ? <Icon size={size} color={color} /> : <span style={{ fontSize: size * 0.8 }}>?</span>
}
