import type { Sector, EventCategory } from './types'

export const SECTOR_LABELS: Record<Sector, string> = {
  tech: '기술',
  energy: '에너지',
  finance: '금융',
  consumer: '소비재',
  healthcare: '헬스케어',
}

export const SECTOR_COLORS: Record<Sector, string> = {
  tech: '#5b9bd5',
  energy: '#e88c3a',
  finance: '#5ec269',
  consumer: '#9b72cf',
  healthcare: '#e8534a',
}

export const CATEGORY_LABELS: Record<EventCategory, string> = {
  government: '정부',
  geopolitics: '지정학',
  economic: '경제',
  technology: '기술',
  disaster: '재해',
  social: '사회',
  commodity: '원자재',
}

export const CATEGORY_COLORS: Record<EventCategory, string> = {
  government: '#5b9bd5',
  economic: '#f0b429',
  technology: '#5ec269',
  geopolitics: '#e8534a',
  disaster: '#e88c3a',
  social: '#9b72cf',
  commodity: '#8888aa',
}

export const CATEGORY_ICONS: Record<EventCategory, string> = {
  government: '🏛️',
  economic: '💰',
  technology: '💻',
  geopolitics: '🌍',
  disaster: '⚠️',
  social: '👥',
  commodity: '📦',
}

export const SOURCE_ICONS: Record<string, { icon: string; color: string }> = {
  official: { icon: '🏛️', color: '#5ec269' },
  financial: { icon: '📊', color: '#5ec269' },
  analyst: { icon: '📋', color: '#e88c3a' },
  social: { icon: '📱', color: '#e8534a' },
  anonymous: { icon: '👤', color: '#e8534a' },
  insider: { icon: '🕵️', color: '#e88c3a' },
}
