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
