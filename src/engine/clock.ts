import type { GameTime, TimeSpeed, MarketSession } from '../data/types'

/**
 * 게임 시간 엔진
 *
 * 시간 매핑 (1x 속도):
 *   1게임일 = 8시간(9:00-17:00) = 14실초
 *   1게임주 = 5일 = 70실초
 *   1분기 = 13주 = 910실초 (~15분)
 *   가격 틱 = 3실초마다
 *
 * 교육 포인트: "시장은 24시간 열리지 않는다"
 * → 장전(뉴스 확인), 장중(매매), 장후(정리) 리듬을 체험
 */

// ═══ 상수 ═══

/** 1게임분 = 실초 (1x 속도) */
const GAME_MINUTE_IN_REAL_SECONDS = 14 / (8 * 60) // 8시간 = 14실초 → 1분 ≈ 0.0292실초

/** 틱 간격 (실초) */
export const TICK_INTERVAL_SECONDS = 3

/** 1주 실시간 (초) */
export const WEEK_REAL_SECONDS = 70

/** 장 시작/종료 시간 */
export const MARKET_OPEN_HOUR = 9
export const MARKET_CLOSE_HOUR = 16
export const DAY_START_HOUR = 8
export const DAY_END_HOUR = 17

/** 분기 설정 */
export const WEEKS_PER_QUARTER = 13
export const DAYS_PER_WEEK = 5

// ═══ 초기값 ═══

export function createInitialGameTime(): GameTime {
  return {
    week: 1,
    day: 1,
    hour: 8,
    minute: 0,
    tickCount: 0,
    totalSeconds: 0,
  }
}

// ═══ 세션 판단 ═══

export function getMarketSession(time: GameTime): MarketSession {
  const h = time.hour
  return {
    isOpen: h >= MARKET_OPEN_HOUR && h < MARKET_CLOSE_HOUR,
    preMarket: h >= DAY_START_HOUR && h < MARKET_OPEN_HOUR,
    afterHours: h >= MARKET_CLOSE_HOUR && h < DAY_END_HOUR,
  }
}

// ═══ 시간 진행 ═══

export interface ClockTickResult {
  newTime: GameTime
  events: ClockEvent[]
}

export type ClockEvent =
  | { type: 'TICK' }
  | { type: 'MARKET_OPEN' }
  | { type: 'MARKET_CLOSE' }
  | { type: 'DAY_END'; day: number }
  | { type: 'WEEK_END'; week: number }
  | { type: 'QUARTER_END' }

/**
 * 게임 시계를 deltaRealMs만큼 진행시키고 발생한 이벤트를 반환.
 * speed가 'paused'면 시간이 진행되지 않는다.
 */
export function advanceGameTime(
  current: GameTime,
  deltaRealMs: number,
  speed: TimeSpeed,
): ClockTickResult {
  if (speed === 'paused') {
    return { newTime: current, events: [] }
  }

  const speedMult = speed === '1x' ? 1 : speed === '2x' ? 2 : 4
  const deltaRealSec = (deltaRealMs / 1000) * speedMult

  // 게임 내 경과 분 계산
  // 14실초 = 8시간(480분) → 1실초 = 480/14 ≈ 34.29게임분
  const gameMinutesPerRealSec = (8 * 60) / 14
  const deltaGameMinutes = deltaRealSec * gameMinutesPerRealSec

  const events: ClockEvent[] = []

  let { week, day, hour, minute, tickCount, totalSeconds } = current
  totalSeconds += deltaRealSec

  // 분 누적
  let rawMinutes = minute + deltaGameMinutes
  while (rawMinutes >= 60) {
    rawMinutes -= 60
    const prevHour = hour
    hour++

    // 장 오픈
    if (prevHour < MARKET_OPEN_HOUR && hour >= MARKET_OPEN_HOUR) {
      events.push({ type: 'MARKET_OPEN' })
    }
    // 장 마감
    if (prevHour < MARKET_CLOSE_HOUR && hour >= MARKET_CLOSE_HOUR) {
      events.push({ type: 'MARKET_CLOSE' })
    }
    // 일 종료
    if (hour >= DAY_END_HOUR) {
      events.push({ type: 'DAY_END', day })
      hour = DAY_START_HOUR
      day++

      // 주 종료
      if (day > DAYS_PER_WEEK) {
        events.push({ type: 'WEEK_END', week })
        day = 1
        week++

        // 분기 종료
        if (week > WEEKS_PER_QUARTER) {
          events.push({ type: 'QUARTER_END' })
          // week는 14로 남겨두고, 외부에서 처리
        }
      }
    }
  }

  minute = Math.floor(rawMinutes)

  // 틱 이벤트: 장중일 때만 가격 틱 발생
  const isMarketOpen = hour >= MARKET_OPEN_HOUR && hour < MARKET_CLOSE_HOUR
  const tickThreshold = TICK_INTERVAL_SECONDS * (speed === '1x' ? 1 : speed === '2x' ? 0.5 : 0.25)
  const prevTickCount = current.tickCount
  const newTickCount = isMarketOpen
    ? prevTickCount + Math.floor(deltaRealSec / tickThreshold)
    : prevTickCount

  for (let i = prevTickCount; i < newTickCount; i++) {
    events.push({ type: 'TICK' })
  }

  return {
    newTime: { week, day, hour, minute, tickCount: newTickCount, totalSeconds },
    events,
  }
}

// ═══ 포맷팅 ═══

const DAY_NAMES = ['', '월', '화', '수', '목', '금']

export function formatGameTime(time: GameTime): string {
  return `${time.week}주차 ${DAY_NAMES[time.day] ?? ''}요일 ${time.hour.toString().padStart(2, '0')}:${time.minute.toString().padStart(2, '0')}`
}

export function formatWeekDay(time: GameTime): string {
  return `W${time.week} ${DAY_NAMES[time.day] ?? ''}${time.hour}:${time.minute.toString().padStart(2, '0')}`
}

export function getQuarterProgress(time: GameTime): number {
  // 0.0 ~ 1.0
  const totalWeekMinutes = DAYS_PER_WEEK * (DAY_END_HOUR - DAY_START_HOUR) * 60
  const currentWeekMinutes = ((time.day - 1) * (DAY_END_HOUR - DAY_START_HOUR) * 60)
    + ((time.hour - DAY_START_HOUR) * 60)
    + time.minute
  const weekProgress = currentWeekMinutes / totalWeekMinutes
  return ((time.week - 1) + weekProgress) / WEEKS_PER_QUARTER
}
