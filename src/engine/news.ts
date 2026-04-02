import type { NewsCard, RunConfig, EventTemplate, ChainEvent, NewsSource, WeeklyRule } from '../data/types'
import { EVENT_TEMPLATES } from '../data/events'

/**
 * 뉴스/이벤트 생성 엔진
 * - 이벤트 풀에서 랜덤 선택
 * - 가짜 뉴스 비율 적용
 * - 연쇄 이벤트 관리
 * - 노이즈 뉴스 포함 (6~8개/턴)
 */

function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    return (s >>> 0) / 0xffffffff
  }
}

function pickRandom<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]
}

function weightedPick(templates: EventTemplate[], rng: () => number): EventTemplate {
  const totalWeight = templates.reduce((sum, t) => sum + t.weight, 0)
  let r = rng() * totalWeight
  for (const t of templates) {
    r -= t.weight
    if (r <= 0) return t
  }
  return templates[templates.length - 1]
}

const SOURCE_LABELS: Record<NewsSource, string> = {
  official: '공영방송',
  financial: '경제 전문지',
  analyst: '애널리스트 리포트',
  social: 'SNS',
  anonymous: '익명 블로그',
  insider: '내부자 제보',
}

export function getSourceLabel(source: NewsSource): string {
  return SOURCE_LABELS[source]
}

const SOURCE_RELIABILITY: Record<NewsSource, number> = {
  official: 0.95,
  financial: 0.85,
  analyst: 0.65,
  social: 0.35,
  anonymous: 0.15,
  insider: 0.50,
}

/**
 * 한 턴의 뉴스 카드 생성 (6~8개: 실질 2~3 + 노이즈 4~5)
 */
export function generateTurnNews(
  config: RunConfig,
  turn: number,
  pendingChainEvents: ChainEvent[],
  usedEventIds: Set<string>,
  weeklyRule?: WeeklyRule | null,
  gameSeed?: number,
): { news: NewsCard[]; newChainEvents: ChainEvent[] } {
  const rng = seededRandom(turn * 3571 + config.runNumber * 17 + (gameSeed ?? 0))
  const impactfulCount = 2 + Math.floor(rng() * 2) // 실질 영향 뉴스 2~3개
  const extraNoise = weeklyRule?.effect.type === 'news_overload' ? weeklyRule.effect.extraNews : 0
  const noiseCount = 3 + Math.floor(rng() * 3) + extraNoise // 노이즈 뉴스 3~5개 + 주간규칙 추가
  const news: NewsCard[] = []
  const newChainEvents: ChainEvent[] = []

  // 실질 뉴스와 노이즈 뉴스 분리
  const impactfulTemplates = EVENT_TEMPLATES.filter(t => !t.isNoise)
  const noiseTemplates = EVENT_TEMPLATES.filter(t => t.isNoise)

  // 1. 연쇄 이벤트 처리
  const triggeredChains = pendingChainEvents.filter((c) => c.triggersAtTurn <= turn)
  for (const chain of triggeredChains) {
    const template = impactfulTemplates.find((t) => t.id === chain.eventId)
    if (template) {
      news.push(createNewsFromTemplate(template, true, rng))
      usedEventIds.add(template.id)
    }
  }

  // 1.5 sector_blackout: 해당 섹터 뉴스 필터링
  const blackoutSector = weeklyRule?.effect.type === 'sector_blackout' ? weeklyRule.effect.sector : null

  // 2. 실질 영향 뉴스 채우기
  const availableImpactful = impactfulTemplates.filter(
    (t) => t.minDifficulty <= config.runNumber && !usedEventIds.has(t.id)
      && (!blackoutSector || !t.sectorImpacts?.some(si => si.sector === blackoutSector)),
  )

  const remainingImpactful = impactfulCount - news.length
  for (let i = 0; i < remainingImpactful && availableImpactful.length > 0; i++) {
    const isFake = rng() < config.fakeNewsRatio
    const template = weightedPick(availableImpactful, rng)

    if (isFake && template.fakeVariants && template.fakeVariants.length > 0) {
      const variant = pickRandom(template.fakeVariants, rng)
      const source = pickFakeSource(variant.fakeType, rng)
      news.push({
        id: `fake_${turn}_${i}`,
        headline: variant.headline,
        content: variant.content,
        body: variant.body,
        source,
        category: template.category,
        reliability: SOURCE_RELIABILITY[source] * 0.5,
        isReal: false,
        actualImpact: variant.actualImpact,
        perceivedImpact: variant.perceivedImpact,
        educationalNote: variant.educationalNote,
        fakeType: variant.fakeType,
      })
    } else {
      const card = createNewsFromTemplate(template, true, rng)
      news.push(card)

      if (template.chainEventId && template.chainDelay) {
        newChainEvents.push({
          eventId: template.chainEventId,
          triggersAtTurn: turn + template.chainDelay,
        })
      }
    }

    const idx = availableImpactful.indexOf(template)
    if (idx >= 0) availableImpactful.splice(idx, 1)
  }

  // 3. 노이즈 뉴스 채우기
  const availableNoise = noiseTemplates.filter(
    (t) => !usedEventIds.has(t.id),
  )

  for (let i = 0; i < noiseCount && availableNoise.length > 0; i++) {
    const template = weightedPick(availableNoise, rng)
    const card = createNewsFromTemplate(template, true, rng)
    card.isNoise = true
    news.push(card)

    const idx = availableNoise.indexOf(template)
    if (idx >= 0) availableNoise.splice(idx, 1)
  }

  // 4. 뉴스 셔플
  for (let i = news.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[news[i], news[j]] = [news[j], news[i]]
  }

  return { news, newChainEvents }
}

function createNewsFromTemplate(
  template: EventTemplate,
  isReal: boolean,
  rng: () => number,
): NewsCard {
  const source = pickRandom(template.sources, rng)
  return {
    id: `news_${template.id}_${Math.floor(rng() * 10000)}`,
    headline: template.headline,
    content: template.content,
    body: template.body,
    source,
    category: template.category,
    reliability: SOURCE_RELIABILITY[source],
    isReal,
    actualImpact: template.sectorImpacts,
    perceivedImpact: template.sectorImpacts,
    educationalNote: generateEducationalNote(template),
    isNoise: template.isNoise,
  }
}

function pickFakeSource(fakeType: string, rng: () => number): NewsSource {
  switch (fakeType) {
    case 'pump_and_dump':
      return pickRandom(['social', 'anonymous', 'insider'] as NewsSource[], rng)
    case 'fud':
      return pickRandom(['social', 'anonymous'] as NewsSource[], rng)
    case 'rumor':
      return pickRandom(['social', 'anonymous', 'insider'] as NewsSource[], rng)
    case 'stale_news':
      return pickRandom(['financial', 'analyst', 'social'] as NewsSource[], rng)
    case 'bias_trap':
      return pickRandom(['analyst', 'financial'] as NewsSource[], rng)
    case 'conflict':
      return 'analyst'
    default:
      return 'social'
  }
}

function generateEducationalNote(template: EventTemplate): string {
  if (template.isNoise || template.sectorImpacts.length === 0) {
    return '이 뉴스는 시장에 직접적인 영향을 미치지 않는 일반 뉴스입니다. 모든 뉴스가 투자에 영향을 주는 것은 아닙니다.'
  }

  const impactDesc = template.sectorImpacts
    .map((si) => {
      const direction = si.impact > 0 ? '상승' : '하락'
      const sectorName = si.sector === 'all' ? '전체 시장' : sectorLabel(si.sector)
      return `${sectorName} ${direction} (${Math.abs(si.impact * 100).toFixed(0)}% 영향, ${si.duration}턴 지속)`
    })
    .join(', ')

  return `이 뉴스의 영향: ${impactDesc}`
}

function sectorLabel(sector: string): string {
  const labels: Record<string, string> = {
    tech: '기술 섹터',
    energy: '에너지 섹터',
    finance: '금융 섹터',
    consumer: '소비재 섹터',
    healthcare: '헬스케어 섹터',
  }
  return labels[sector] || sector
}
