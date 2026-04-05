import { create } from 'zustand'
import type { NewsCard, RunConfig, ChainEvent, WeeklyRule, GameTime } from '../data/types'
import { generateTurnNews } from '../engine/news'
import type { ClockEvent } from '../engine/clock'
import { useMarketStore } from './marketStore'

/**
 * 뉴스 드립 스토어
 *
 * 교육 포인트: "뉴스는 한꺼번에 오지 않는다.
 * 실시간으로 들어오는 정보를 분석하고 판단하는 능력이 중요하다."
 *
 * 기존 generateTurnNews()의 뉴스 풀 생성 로직을 재사용하되,
 * 일괄 표시 대신 시간에 따라 하나씩 드립한다.
 */

interface ScheduledNews {
  card: NewsCard
  publishAtDay: number   // 발행 예정 일 (1-5)
  publishAtHour: number  // 발행 예정 시 (9-16)
  published: boolean
}

interface NewsStoreState {
  /** 이번 주 뉴스 풀 (스케줄링됨) */
  weeklyPool: ScheduledNews[]
  /** 발행된 뉴스 (최신순) */
  publishedNews: NewsCard[]
  /** 뉴스 신선도 (id → 0.0~1.0) */
  freshness: Record<string, number>
  /** 읽은 뉴스 */
  readNewsIds: Set<string>
  /** 안 읽은 뉴스 수 */
  unreadCount: number

  // 내부 상태
  _currentWeek: number
  _pendingChains: ChainEvent[]
  _usedEventIds: Set<string>

  // 액션
  generateWeekPool: (week: number, config: RunConfig, weeklyRule: WeeklyRule | null) => void
  handleClockEvents: (events: ClockEvent[], gameTime: GameTime) => void
  markAsRead: (newsId: string) => void
  reset: () => void
}

export const useNewsStore = create<NewsStoreState>((set, get) => ({
  weeklyPool: [],
  publishedNews: [],
  freshness: {},
  readNewsIds: new Set(),
  unreadCount: 0,
  _currentWeek: 0,
  _pendingChains: [],
  _usedEventIds: new Set(),

  generateWeekPool: (week, config, weeklyRule) => {
    const { _pendingChains, _usedEventIds, _currentWeek } = get()
    if (week === _currentWeek) return // 이미 생성됨

    // 기존 generateTurnNews 재사용 (week를 turn으로 사용)
    const { news, newChainEvents } = generateTurnNews(
      config, week, _pendingChains, _usedEventIds, weeklyRule
    )

    // 뉴스를 주 전체에 분산 스케줄링
    const scheduled: ScheduledNews[] = news.map((card, i) => {
      // 임팩트 뉴스는 장중(9-15시)에 배치, 노이즈는 아무 때나
      const isImpact = !card.isNoise
      const day = 1 + Math.floor(i * 5 / news.length) // 균등 분배
      const hour = isImpact
        ? 9 + Math.floor(Math.random() * 6)   // 9-14시 (장중 앞부분)
        : 8 + Math.floor(Math.random() * 8)    // 8-15시

      return {
        card,
        publishAtDay: Math.min(day, 5),
        publishAtHour: hour,
        published: false,
      }
    })

    // 시간순 정렬
    scheduled.sort((a, b) => (a.publishAtDay * 100 + a.publishAtHour) - (b.publishAtDay * 100 + b.publishAtHour))

    // 체인 이벤트 업데이트
    const remainingChains = _pendingChains.filter(c => c.triggersAtTurn > week)

    set({
      weeklyPool: scheduled,
      _currentWeek: week,
      _pendingChains: [...remainingChains, ...newChainEvents],
      _usedEventIds: new Set([..._usedEventIds, ...news.map(n => n.id)]),
    })
  },

  handleClockEvents: (events, gameTime) => {
    let currentPool = get().weeklyPool
    let newPublished = [...get().publishedNews]
    const newFreshness = { ...get().freshness }
    // 이미 발행된 ID 추적 (배치 내 중복 발행 방지)
    const publishedIds = new Set(newPublished.map(n => n.id))
    let changed = false

    for (const event of events) {
      if (event.type === 'TICK') {
        // 틱마다 신선도 감소
        for (const id of Object.keys(newFreshness)) {
          newFreshness[id] = Math.max(0, newFreshness[id] - 0.008)
        }
        changed = true

        // 스케줄된 뉴스 발행 체크 — 로컬 pool을 갱신하여 배치 중복 방지
        currentPool = currentPool.map(sn => {
          if (sn.published) return sn
          if (publishedIds.has(sn.card.id)) return { ...sn, published: true }
          if (gameTime.day >= sn.publishAtDay && gameTime.hour >= sn.publishAtHour) {
            // 발행!
            newPublished = [sn.card, ...newPublished]
            publishedIds.add(sn.card.id)
            newFreshness[sn.card.id] = 1.0

            // 뉴스의 실제 영향을 시장에 적용
            if (sn.card.actualImpact && sn.card.actualImpact.length > 0) {
              useMarketStore.getState().applyNewsEffect(
                sn.card.id,
                sn.card.actualImpact,
                sn.card.headline,
              )
            }

            return { ...sn, published: true }
          }
          return sn
        })
      }

      if (event.type === 'WEEK_END') {
        // 주 종료: 오래된 뉴스 정리 (최근 20개만 유지)
        newPublished = newPublished.slice(0, 20)
        changed = true
      }
    }

    if (changed) {
      const { readNewsIds } = get()
      const unreadCount = newPublished.filter(n => !readNewsIds.has(n.id)).length
      set({ weeklyPool: currentPool, publishedNews: newPublished, freshness: newFreshness, unreadCount })
    }
  },

  markAsRead: (newsId) => {
    const { readNewsIds, publishedNews } = get()
    const newRead = new Set(readNewsIds)
    newRead.add(newsId)
    const unreadCount = publishedNews.filter(n => !newRead.has(n.id)).length
    set({ readNewsIds: newRead, unreadCount })
  },

  reset: () => set({
    weeklyPool: [],
    publishedNews: [],
    freshness: {},
    readNewsIds: new Set(),
    unreadCount: 0,
    _currentWeek: 0,
    _pendingChains: [],
    _usedEventIds: new Set(),
  }),
}))
