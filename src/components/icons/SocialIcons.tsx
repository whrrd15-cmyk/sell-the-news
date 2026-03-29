/**
 * SVG 아이콘 — 이모지 대신 사용
 * 발라트로 게임 미학에 맞는 미니멀 아이콘
 */

interface IconProps {
  size?: number
  color?: string
}

// 사용자 아바타 (원형 + 이니셜)
export function AvatarIcon({ size = 16, color = '#5b9bd5' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="7" stroke={color} strokeWidth="1.5" fill={`${color}15`} />
      <circle cx="8" cy="6" r="2.5" fill={color} opacity="0.6" />
      <path d="M3 14c0-2.8 2.2-5 5-5s5 2.2 5 5" stroke={color} strokeWidth="1.5" fill={`${color}20`} />
    </svg>
  )
}

// 좋아요 하트
export function HeartIcon({ size = 12, color = '#e8534a' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none">
      <path d="M6 10.5l-4.5-4.5c-1.2-1.2-1.2-3 0-4.2 1.2-1.2 3-1.2 4.2 0L6 2.1l.3-.3c1.2-1.2 3-1.2 4.2 0 1.2 1.2 1.2 3 0 4.2L6 10.5z" fill={color} opacity="0.8" />
    </svg>
  )
}

// 댓글 말풍선
export function CommentIcon({ size = 12, color = '#8888aa' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none">
      <path d="M1 2.5A1.5 1.5 0 012.5 1h7A1.5 1.5 0 0111 2.5v5A1.5 1.5 0 019.5 9H5L2 11V9h-.5A1.5 1.5 0 010 7.5v-5z" fill={color} opacity="0.3" stroke={color} strokeWidth="1" />
    </svg>
  )
}

// 공유/리트윗
export function ShareIcon({ size = 12, color = '#8888aa' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none">
      <path d="M9 1l2 2-2 2M3 11l-2-2 2-2" stroke={color} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M11 3H5.5A2.5 2.5 0 003 5.5V6M1 9h5.5A2.5 2.5 0 009 6.5V6" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

// 말풍선 (탭 아이콘)
export function ChatBubbleIcon({ size = 14, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <path d="M2 2.5A1.5 1.5 0 013.5 1h7A1.5 1.5 0 0112 2.5v6A1.5 1.5 0 0110.5 10H6L3 13V10H2.5A1.5 1.5 0 011 8.5v-6z" fill={`${color}20`} stroke={color} strokeWidth="1.2" />
      <circle cx="5" cy="5.5" r="0.6" fill={color} />
      <circle cx="7" cy="5.5" r="0.6" fill={color} />
      <circle cx="9" cy="5.5" r="0.6" fill={color} />
    </svg>
  )
}

// 차트/지표 (탭 아이콘)
export function ChartBarIcon({ size = 14, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <rect x="1" y="8" width="3" height="5" rx="0.5" fill={color} opacity="0.4" />
      <rect x="5.5" y="4" width="3" height="9" rx="0.5" fill={color} opacity="0.6" />
      <rect x="10" y="1" width="3" height="12" rx="0.5" fill={color} opacity="0.8" />
    </svg>
  )
}

// 번개 (큰 변동)
export function BoltIcon({ size = 10, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" fill="none">
      <path d="M6 0L2 6h2.5L3 10l5-6H5.5L6 0z" fill={color} />
    </svg>
  )
}

// 핀 (주목)
export function PinIcon({ size = 10, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" fill="none">
      <path d="M5 0a3 3 0 00-3 3c0 2.5 3 5 3 5s3-2.5 3-5a3 3 0 00-3-3zm0 4a1 1 0 110-2 1 1 0 010 2z" fill={color} />
    </svg>
  )
}

// 전구 (팁)
export function LightbulbIcon({ size = 10, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" fill="none">
      <path d="M5 0.5a3 3 0 00-1.5 5.6V7.5a1 1 0 001 1h1a1 1 0 001-1V6.1A3 3 0 005 0.5z" fill={color} opacity="0.7" />
      <line x1="4" y1="9.5" x2="6" y2="9.5" stroke={color} strokeWidth="0.8" />
    </svg>
  )
}
