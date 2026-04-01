# SELL THE NEWS — 전체 구조 문서

## 1. 프로젝트 개요

**주식 트레이딩 로그라이크 교육 게임** — 뉴스를 분석하고, 가짜뉴스를 감별하며, 주식을 매매하는 실시간 시뮬레이션

| 항목 | 기술 |
|------|------|
| 프레임워크 | React 19 + TypeScript |
| 상태관리 | Zustand (4개 스토어) |
| 스타일링 | Tailwind CSS + 커스텀 Balatro 테마 |
| 빌드 | Vite 8 |
| 애니메이션 | Framer Motion (`motion/react`) |
| 차트 | lightweight-charts v5 (Baseline/Candlestick) |
| 배경 | OGL (WebGL 셰이더) |
| 사운드 | Howler.js |
| 인증/저장 | Firebase Auth + Firestore |

---

## 2. 디렉토리 구조

```
src/
├── App.tsx                  # 화면 라우터 (Screen → Component 매핑)
├── main.tsx                 # React 진입점
├── index.css                # 글로벌 스타일
│
├── stores/                  # Zustand 상태 관리
│   ├── gameStore.ts         # 핵심 게임 상태 (1219줄)
│   ├── timeStore.ts         # 실시간 시간/틱
│   ├── marketStore.ts       # 실시간 시장 가격
│   └── newsStore.ts         # 뉴스 풀/발행/읽음
│
├── engine/                  # 순수 함수 게임 엔진
│   ├── clock.ts             # 시간 진행 & 틱 발생
│   ├── market.ts            # 가격 시뮬레이션 (605줄)
│   ├── news.ts              # 뉴스 생성 & 가짜뉴스
│   ├── portfolio.ts         # 매수/매도/포지션 관리
│   ├── autoTrade.ts         # 자동매매 룰 실행
│   ├── marketCondition.ts   # 시장 상태 감지 (bull/bear/range)
│   ├── social.ts            # SNS 의견 생성
│   └── indicators.ts        # 경제 지표 생성
│
├── data/                    # 게임 데이터 & 타입 정의
│   ├── types.ts             # 전체 TypeScript 인터페이스 (403줄)
│   ├── stocks.ts            # 10종목 + 4 ETF 정의
│   ├── events.ts            # 40+ 뉴스 이벤트 템플릿 (1640줄)
│   ├── specialEvents.ts     # 선택/퀴즈/블랙스완 이벤트
│   ├── breakingNews.ts      # 속보 뉴스 풀
│   ├── weeklyRules.ts       # 10개 주간 특수 규칙
│   ├── items.ts             # 소모품 아이템
│   ├── cursedItems.ts       # 저주 아이템 (양날의 검)
│   ├── skills.ts            # 스킬 트리 (4카테고리)
│   ├── metaUpgrades.ts      # 영구 메타 업그레이드
│   ├── constants.ts         # 색상, 라벨 상수
│   └── features.ts          # 기능 플래그
│
├── components/              # UI 컴포넌트 (82개)
│   ├── layout/              # 화면 컴포넌트 (12개)
│   ├── trade/               # 거래 패널 (8개)
│   ├── news/                # 뉴스 관련 (8개)
│   ├── charts/              # 차트 (2개)
│   ├── stocks/              # 종목 표시 (4개)
│   ├── effects/             # 이펙트/애니메이션 (14개)
│   ├── ui/                  # 범용 UI 위젯 (25개)
│   ├── pages/               # 사이드바 페이지 (3개)
│   ├── tutorial/            # 튜토리얼 (2개)
│   ├── cards/               # 카드 컴포넌트 (2개)
│   ├── icons/               # 아이콘 (2개)
│   └── reactbits/text/      # 텍스트 이펙트 (2개)
│
├── hooks/                   # 커스텀 훅
│   ├── useCardTilt.ts       # 카드 기울기 효과
│   └── useScreenShake.ts    # 화면 흔들림 효과
│
└── utils/                   # 유틸리티
    ├── firebase.ts          # Firebase 초기화
    ├── cloudSave.ts         # 클라우드 저장/불러오기
    ├── save.ts              # localStorage 저장
    ├── settings.ts          # 사용자 설정
    └── sound.ts             # SFX/BGM 관리
```

---

## 3. 화면 흐름 (Screen Flow)

```
┌──────────┐
│  title   │ ← 메인 메뉴 (새 게임 / 이어하기 / 메타 / 설정)
└────┬─────┘
     │ startNewRun()
     ▼
┌────────────┐   첫 플레이 시
│ onboarding │ ← 멘토 대화 + 교육 슬라이드 (선택)
└────┬───────┘
     │
     ▼
┌──────────────┐   runNumber ≤ 8
│ stockpicker  │ ← 10개 종목 중 1개 선택
└────┬─────────┘
     │ setPickedStock(id)
     ▼
┌──────────┐                    ┌──────────┐
│   game   │ ◄─── 매 13턴 ────►│   shop   │
│          │   (자동/수동 방문)  │          │
│ [메인 루프]│                    │ 스킬/아이템│
└────┬─────┘                    └──────────┘
     │ turn > maxTurns (52)
     ▼
┌──────────┐   성공 & run=8
│  result  │ ─────────────────► ┌──────────┐
│ 분기 결과 │                    │  clear   │
└────┬─────┘                    │ 엔딩 화면 │
     │ 실패 or 다음 런           └──────────┘
     ▼
   title (반복)

* 무한 모드 (runNumber > 8): stockpicker 건너뜀 → 전체 종목 해금
* 부가 화면: meta (메타 업그레이드), settings (설정)
```

**화면 전환 맵** (`src/App.tsx`):

| Screen | 컴포넌트 | 진입 조건 |
|--------|---------|----------|
| `title` | TitleScreen | 앱 시작, 런 종료 |
| `onboarding` | OnboardingScreen | 첫 플레이 시 |
| `stockpicker` | StockPickerScreen | startNewRun (run ≤ 8) |
| `game` | TradingTerminal / GameScreen | setPickedStock / 무한모드 |
| `shop` | ShopScreen | 매 13턴 자동 / 수동 방문 |
| `result` | ResultScreen | turn > maxTurns |
| `meta` | MetaUpgradeScreen | 타이틀에서 진입 |
| `settings` | SettingsScreen | 타이틀에서 진입 |
| `clear` | ClearScreen | run 8 성공 시 |

---

## 4. 게임 루프 (Turn Lifecycle)

### 턴 단위 흐름

```
┌─────────────────────────────────────────────────┐
│                  1턴 = 1주                       │
│                                                  │
│  ┌──────────┐   ┌──────────────┐   ┌──────────┐ │
│  │ 뉴스 분석 │──►│ 투자 (매매)   │──►│ 결과 정산 │ │
│  │  phase:   │   │  phase:      │   │  phase:  │ │
│  │  'news'   │   │ 'investment' │   │ 'result' │ │
│  └──────────┘   └──────────────┘   └──────────┘ │
│                                         │        │
│                                    nextTurn()    │
│                                         │        │
│                            ┌────────────┘        │
│                            ▼                     │
│                   turn > 52? ──Y──► result 화면  │
│                       │                          │
│                       N                          │
│                       ▼                          │
│                  다음 턴 시작                     │
└─────────────────────────────────────────────────┘
```

### 각 페이즈 상세

**뉴스 페이즈** (`advanceToNewsPhase`)
- 주간 뉴스 풀 생성 (6~8개: 진짜 2~3 + 노이즈 3~5)
- 주간 특수 규칙 판정 (15~35% 확률)
- 속보 뉴스 판정 (5% 확률)
- 특수 이벤트 판정 (선택/퀴즈/블랙스완)

**투자 페이즈** (`advanceToInvestmentPhase`)
- 종목 선택 & 차트 분석
- 매수/매도 실행 (기본 1회, double_trade 스킬 시 2회)
- 아이템 사용 가능

**결과 페이즈** (`advanceToResultPhase`)
- `simulateTurn()` → 가격 변동 계산
- 뉴스 효과 적용 (`applyNewsEffect`)
- 자동매매 룰 실행 (`processAutoTrades`)
- 포트폴리오 가치 갱신
- RP 지급 & 패시브 효과 (이자, 배당)
- 결과 캐스케이드 애니메이션

### 실시간 시간 구조

| 게임 시간 | 실제 시간 (1x) | 비고 |
|-----------|---------------|------|
| 1분 | ~0.03초 | |
| 1시간 | ~1.75초 | |
| 1일 (8h) | 14초 | 장시간 8:00~17:00 |
| 1주 (5일) | 70초 | |
| 1분기 (13주) | ~15분 | = 1런 |

**틱 발생**: 장중(9:00~16:00) 매 1초마다 TICK 이벤트 → 가격 갱신

**ClockEvent 종류**: `TICK`, `MARKET_OPEN`, `MARKET_CLOSE`, `DAY_END`, `WEEK_END`, `QUARTER_END`

---

## 5. 상태 관리 (Stores)

### 5-1. gameStore (핵심)

`src/stores/gameStore.ts` — 게임의 모든 상태를 관리하는 중앙 스토어

**주요 상태:**
```typescript
screen: Screen              // 현재 화면
phase: GamePhase            // 'news' | 'investment' | 'result' | ...
runConfig: RunConfig        // 런 설정 (난이도, 목표 수익률)
turn: number                // 현재 턴 (1~52)
market: MarketState         // 시장 가격/효과/추세
portfolio: Portfolio        // 현금/포지션/RP
currentNews: NewsCard[]     // 이번 턴 뉴스
pickedStockId: string|null  // 선택 종목 (무한모드: null)
inventory: Item[]           // 소지 아이템
unlockedSkills: string[]    // 해금 스킬
autoTradeRules: AutoTradeRule[] // 자동매매 규칙
meta: MetaProgress          // 메타 진행도
```

**주요 액션:**
```typescript
startNewRun(runNumber?)     // 런 초기화
executeBuy(stockId, amount) // 매수
executeSell(stockId, shares)// 매도
advanceToResultPhase()      // 결과 정산
nextTurn()                  // 다음 턴
useItem(itemId)             // 아이템 사용
unlockSkill(skillId, cost)  // 스킬 해금
```

### 5-2. timeStore

`src/stores/timeStore.ts` — 실시간 시간 진행

```typescript
gameTime: GameTime          // week, day, hour, minute, tickCount
speed: TimeSpeed            // 'paused' | '1x' | '2x' | '4x'
session: MarketSession      // isOpen, preMarket, afterHours
```

### 5-3. marketStore

`src/stores/marketStore.ts` — 실시간 시장 데이터

```typescript
market: MarketState         // 가격, 효과, 버블, 패닉
marketConditions: Record<string, MarketCondition>
dangerLevel: number         // 성공 → 난이도 상승
```

### 5-4. newsStore

`src/stores/newsStore.ts` — 뉴스 발행 시스템

```typescript
weeklyPool: ScheduledNews[] // 이번 주 예정 뉴스
publishedNews: NewsCard[]   // 발행된 뉴스 (최대 20)
freshness: Record<string, number> // 뉴스 신선도 (0~1)
unreadCount: number         // 안읽은 뉴스 수
```

### 스토어 간 데이터 흐름

```
  유저 액션 (매수/매도/턴 진행)
       │
       ▼
  ┌─────────────┐
  │  gameStore   │ ◄──── 턴 진행, 매매, 아이템 사용
  │  (중앙 허브)  │
  └──┬──┬──┬────┘
     │  │  │
     │  │  └──► newsStore ──► 뉴스 생성/발행
     │  │           │
     │  │           ▼
     │  └──────► marketStore ──► applyNewsEffect() → 가격 변동
     │               │
     │               ▼
     └──────────► timeStore ──► ClockEvent 발행
                     │
                     ▼
              TICK → marketStore.handleClockEvents()
                   → newsStore.handleClockEvents()
```

---

## 6. 엔진 시스템 (Engine)

### 6-1. clock.ts — 시간 엔진

```typescript
advanceGameTime(current, deltaRealMs, speed): ClockTickResult
// 실시간 ms → 게임 시간 변환 + ClockEvent 발행
// TICK은 장중(9~16시)에만 발생
```

| 상수 | 값 | 설명 |
|------|----|------|
| `TICK_INTERVAL_SECONDS` | 1 | 틱 발생 주기 (게임 초) |
| `MARKET_OPEN_HOUR` | 9 | 장 시작 |
| `MARKET_CLOSE_HOUR` | 16 | 장 마감 |
| `WEEKS_PER_QUARTER` | 13 | 분기당 주수 |
| `DAYS_PER_WEEK` | 5 | 주당 영업일 |

### 6-2. market.ts — 가격 시뮬레이션 (핵심)

**틱당 가격 변동 공식** (`tickMarket`):

```
가격변동 = trendEffect      (시장 추세, ±0.03%)
         + eventEffect      (뉴스 영향 × 종목 민감도)
         + momentum         (섹터 모멘텀 × 1%)
         + herdEffect       (군중 심리 × 0.05%)
         + meanReversion    (기준가 회귀 × 0.3%)
         + noise            (변동성 × 위험도 × 랜덤)
         + bubblePop        (버블 붕괴 시 -8~15%)
         + flashCrash       (플래시 크래시 시 -10%)

클램프: 틱당 최대 ±1.5%
```

**위험도 스케일링** (`calculateDangerLevel`):
- 수익이 높을수록 시장 변동성 증가
- `danger = min(1.0, (return - 0.05) × (0.5 + quarter × 0.1))`

**섹터 버블**: deviation > 15%이면 버블 축적 → 0.8 이상에서 폭락 확률 급증

### 6-3. news.ts — 뉴스 생성

```
generateTurnNews(config, turn, pendingChains, usedIds)
→ { news: NewsCard[], newChainEvents: ChainEvent[] }
```

- 진짜 뉴스 2~3개 (가중치 기반 템플릿 선택)
- 노이즈 뉴스 3~5개 (시장 영향 없음)
- 가짜뉴스 확률: `config.fakeNewsRatio` (10~40%)
- 가짜뉴스 타입: rumor, pump_and_dump, fud, stale_news, bias_trap, conflict
- 체인 이벤트: 일부 뉴스가 N턴 후 후속 뉴스 트리거

### 6-4. portfolio.ts — 포트폴리오 관리

```typescript
buyStock(portfolio, stockId, price, amount, feeReduction?)
// 수수료 0.5% (forex_hedge 스킬로 최소 0.1%까지 감소)
// 평단가 = (기존주수×기존가 + 신규주수×매수가) / 총주수

sellStock(portfolio, stockId, price, shares, feeReduction?)
// 수수료 0.5%, 전량 매도 시 포지션 삭제
```

| 항목 | 값 |
|------|----|
| 초기 자금 | $10,000 |
| 매매 수수료 | 0.5% (기본) |
| 최소 수수료 | 0.1% (스킬 적용 시) |

### 6-5. autoTrade.ts — 자동매매

| 규칙 | 트리거 조건 | 동작 |
|------|-----------|------|
| stop_loss | 수익률 ≤ threshold (-10%) | 전량 매도 |
| trailing_stop | 수익률 ≥ target (+10%) | 전량 매도 |
| dca | 가격 5% 하락마다 | 분할 매수 |
| rebalance | 레인지 상/하단 도달 | 매수 or 30% 매도 |

### 6-6. 기타 엔진

- **social.ts**: SNS 포스트 생성 (강세/약세/중립/루머 성향 작성자)
- **indicators.ts**: 주간 경제 지표 (GDP, 실업률, 금리, CPI, PMI 등)
- **marketCondition.ts**: 이동평균 기반 시장 상태 감지 (bull/bear/range/neutral)

---

## 7. 데이터 구조 (Data)

### 종목 테이블 (`stocks.ts`)

| ID | 티커 | 이름 | 섹터 | 기준가 | 변동성 | 민감도 |
|----|------|------|------|--------|--------|--------|
| pixeltech | PXT | PixelTech | tech | $150 | 0.7 | 0.8 |
| neonsoft | NSF | NeonSoft | tech | $85 | 0.8 | 0.9 |
| greenpower | GRP | GreenPower | energy | $60 | 0.6 | 0.7 |
| oilmax | OLM | OilMax | energy | $45 | 0.5 | 0.8 |
| cryptobank | CBK | CryptoBank | finance | $120 | 0.9 | 0.9 |
| safevault | SVT | SafeVault | finance | $200 | 0.3 | 0.5 |
| foodchain | FCH | FoodChain | consumer | $35 | 0.3 | 0.4 |
| luxbrand | LXB | LuxBrand | consumer | $300 | 0.5 | 0.6 |
| biogen | BGN | BioGen | healthcare | $90 | 0.8 | 0.9 |
| medcore | MDC | MedCore | healthcare | $70 | 0.4 | 0.5 |

+ ETF 4종: TKETF, ENETF, FNETF, HLETF (각 섹터 종합)

### 런 난이도 테이블 (`types.ts`)

| 런 | 이름 | 목표 수익률 | 변동성 배율 | 가짜뉴스 비율 |
|----|------|-----------|-----------|-------------|
| 1 | 골디락스 | 5% | 0.5x | 10% |
| 2 | 강세장 | 8% | 0.7x | 10% |
| 3 | 테이퍼링 | 12% | 0.9x | 15% |
| 4 | 금리 인상기 | 15% | 1.2x | 20% |
| 5 | 버블 경제 | 20% | 1.5x | 25% |
| 6 | 리세션 | 18% | 1.8x | 30% |
| 7 | 블랙 스완 | 25% | 2.2x | 35% |
| 8 | 퍼펙트 스톰 | 30% | 2.5x | 40% |

무한 모드 (run > 8): target = min(0.30 + 0.05×log₂(wave+1), 0.60)

### 주간 특수 규칙 (`weeklyRules.ts`)

| ID | 이름 | 효과 | 최소 분기 |
|----|------|------|----------|
| volatile_week | FOMC 주간 | 변동성 2배 | Q2 |
| fomo_week | 실적 시즌 | 모멘텀 3배 | Q2 |
| news_overload | IPO 러쉬 | 뉴스 +5개 | Q2 |
| sector_blackout | 서킷브레이커 | 섹터 1개 뉴스 차단 | Q3 |
| double_or_nothing | 쿼드러플 위칭 | 가격변동 2배 | Q3 |
| no_selling | 공매도 금지 | 매도 불가 | Q4 |
| fog_of_war | HTS 장애 | 차트 비표시 | Q4 |
| flash_crash_risk | 플래시 크래시 | 15% 확률 -10% 폭락 | Q5 |
| pandemic_week | 글로벌 위기 | 변동성 3배 + 패닉 | Q5 |
| strategy_week | MSCI 리밸런싱 | 섹터별 강세/약세 강제 | Q3 |

### 뉴스 구조 요약

```typescript
NewsCard {
  headline, content, body    // 제목, 요약, 전문
  source: NewsSource         // official|financial|analyst|social|anonymous|insider
  category: EventCategory    // government|geopolitics|economic|technology|disaster|social|commodity
  reliability: 0~1           // 출처 신뢰도
  isReal: boolean            // 진짜 여부
  actualImpact[]             // 실제 시장 영향
  perceivedImpact[]          // 겉보기 영향 (가짜뉴스 시 다름)
  fakeType?                  // rumor|pump_and_dump|fud|stale_news|bias_trap|conflict
  educationalNote            // 교육 피드백
}
```

### 스킬 카테고리 (`skills.ts`)

| 카테고리 | 스킬 | 효과 |
|---------|------|------|
| **분석** | moving_average, reveal_impact, next_turn_hint, sector_trend | 차트/뉴스 분석 도구 |
| **리터러시** | fact_check, source_tracking, conflict_detection, bias_warning, stale_detection | 가짜뉴스 감별 |
| **투자** | leverage, short_selling, stop_loss, dca, trailing_stop, forex_hedge | 매매 기법 해금 |
| **패시브** | dividend, interest, double_trade, correlation, noise_filter, portfolio_hedge | 자동 수익/보호 |

### 아이템 등급 (`items.ts`)

| 등급 | 비용 | 예시 |
|------|------|------|
| Common | 8~10 RP | 애널리스트 노트, 긴급자금 |
| Uncommon | 15~20 RP | 풋옵션, 더블RP, 시장리포트 |
| Rare | 30 RP | 인사이더팁, 변동성 방패 |
| Legendary | 45 RP | 퀀트시그널, 프라임브로커채널 |

---

## 8. 컴포넌트 맵

### 화면 (Layout)

| 컴포넌트 | 파일 | 역할 |
|---------|------|------|
| TitleScreen | layout/TitleScreen.tsx | 메인 메뉴, 세이브 정보 |
| OnboardingScreen | layout/OnboardingScreen.tsx | 멘토 대화 + 교육 슬라이드 |
| StockPickerScreen | layout/StockPickerScreen.tsx | 종목 1개 선택 |
| TradingTerminal | layout/TradingTerminal.tsx | 메인 게임 화면 (멀티윈도우) |
| GameScreen | layout/GameScreen.tsx | 메인 게임 화면 (싱글윈도우) |
| ShopScreen | layout/ShopScreen.tsx | 스킬/아이템 구매 |
| ResultScreen | layout/ResultScreen.tsx | 분기 결과 통계 |
| MetaUpgradeScreen | layout/MetaUpgradeScreen.tsx | 영구 업그레이드 |
| SettingsScreen | layout/SettingsScreen.tsx | 게임 설정 |
| ClearScreen | layout/ClearScreen.tsx | 런8 클리어 엔딩 |
| SpecialEventOverlay | layout/SpecialEventOverlay.tsx | 선택/퀴즈 모달 |
| SidebarNav | layout/SidebarNav.tsx | 좌측 네비게이션 (트레이딩/뉴스/분석) |

### 거래 (Trade)

| 컴포넌트 | 역할 |
|---------|------|
| TradePanel | 매수/매도 + 자동매매 규칙 설정 |
| TradingPanel | 거래 패널 래퍼 |
| StockTabBar | 종목 탭 (가격/변동률 표시) |
| OrderPanel | 지정가/스탑로스 주문 |
| OrderBookPanel | 호가창 표시 |
| TradeLogPanel | 거래 내역 |
| ShortPanel | 공매도 인터페이스 |
| LeveragePanel | 레버리지 설정 |

### 뉴스 (News)

| 컴포넌트 | 역할 |
|---------|------|
| NewsPanel | 카테고리 탭 + 리스트/상세 분할 |
| NewsListItem | 뉴스 항목 (헤드라인, 출처, 신뢰도) |
| NewsArticleView | 전문 기사 + 팩트체크 |
| CausalityChain | 뉴스→섹터→주가 인과관계 시각화 |
| SectorImpactSummary | 섹터별 영향 버블 차트 |
| NewsCardMain/Compact | 카드형 뉴스 표시 |
| NewsFeedPanel | 뉴스 피드 래퍼 |

### 차트 (Charts)

| 컴포넌트 | 역할 |
|---------|------|
| CandlestickChart | 캔들스틱 OHLCV + 이벤트 마커 |
| RealtimeLineChart | 실시간 베이스라인 차트 (장중 틱) |

### 이펙트 & 애니메이션

| 컴포넌트 | 역할 |
|---------|------|
| BalatroBackground | WebGL 무드 배경 (수익/손실/위험 색상) |
| BreakingNewsBanner | 속보 배너 (자동 소멸) |
| WeeklyRuleBanner | 주간 규칙 표시 |
| ScoreCascade | 결과 캐스케이드 (뉴스→주가→아이템→합산) |
| CRTOverlay | CRT 스캔라인 효과 |
| ItemUseEffect | 아이템 사용 이펙트 |
| BouncyText / ShinyText / GradientText | 텍스트 효과 |
| ClickSpark / CountUp | 인터랙션 효과 |

### UI 위젯 (주요)

| 컴포넌트 | 역할 |
|---------|------|
| BalChip | 색상 뱃지 (현금/RP/수익률) |
| BalPanel | 프레임 패널 |
| AnimatedNumber | 숫자 애니메이션 |
| PhaseProgressBar | 턴/페이즈 진행 바 |
| PhaseCTA | 페이즈 전환 버튼 |
| PortfolioOverview | 포트폴리오 요약 |
| MarketPulseBar | 시장 지표 바 (심리/패닉/버블/위험) |
| NewsToast | 뉴스 토스트 (자동 소멸 8초) |
| InventoryDropdown | 아이템 드롭다운 |
| NewsReferenceDrawer | 뉴스 서랍 |
| GoogleLoginButton | 구글 로그인 |

### 페이지 (Pages) — 사이드바 라우팅

| 컴포넌트 | 역할 |
|---------|------|
| NewsPage | 뉴스 허브 (속보/일반/노이즈) |
| AnalysisPage | 시장 분석 (섹터별 상태, 인과 체인) |
| SocialPage | SNS 피드 + 거시경제 지표 |

### 튜토리얼

| 컴포넌트 | 역할 |
|---------|------|
| GuideOverlay | 7챕터 인터랙티브 가이드 (UI→매매→뉴스→심리→주문→스킬) |
| SpotlightTutorial | 8단계 스포트라이트 (게임 내 요소 하이라이트) |

---

## 9. 핵심 데이터 흐름

### 매매 파이프라인

```
유저: "매수" 클릭
  │
  ▼
TradePanel.onBuy(stockId, amount)
  │
  ▼
gameStore.executeBuy(stockId, amount)
  ├── portfolio.buyStock() → 현금 차감, 포지션 추가
  ├── tradesThisTurn++
  └── writeSaveData() → localStorage 저장
```

### 뉴스 → 시장 영향 파이프라인

```
gameStore.advanceToResultPhase()
  │
  ├── currentNews.forEach(news => {
  │     marketStore.applyNewsEffect(news.id, news.actualImpact)
  │   })
  │     └── ActiveEffect 생성 (섹터 영향 + 지속 턴수)
  │
  ├── simulateTurn(market, config, ...)
  │     └── tickMarket() × N
  │           ├── activeEffects → eventEffect 계산
  │           ├── + momentum + herd + noise + ...
  │           └── 가격 갱신
  │
  └── resultCascadeData 생성 → ScoreCascade 컴포넌트로 전달
```

### 실시간 틱 파이프라인

```
setInterval(100ms)
  │
  ▼
timeStore.tick(deltaMs)
  ├── advanceGameTime() → GameTime 갱신
  ├── ClockEvents 발행 [TICK, MARKET_OPEN, DAY_END, ...]
  │
  ├──► marketStore.handleClockEvents(events)
  │      └── TICK → tickMarket() → 가격 실시간 갱신
  │
  └──► newsStore.handleClockEvents(events)
         └── TICK → 예정된 뉴스 발행 (시간 도래 시)
```

---

## 10. 메타 진행 & 저장

### 메타 업그레이드 (`metaUpgrades.ts`)

| 업그레이드 | 효과 | 최대 레벨 | 비용 |
|-----------|------|----------|------|
| 시드 머니 | 초기 자금 +$1,000 | 3 | 2 MP |
| 평판 보너스 | 초기 RP +5 | 2 | 3 MP |
| 뉴스 정확도 | 신뢰도 +0.1 | 2 | 4 MP |
| 뉴스 슬롯 | 뉴스 +1개 표시 | 1 | 3 MP |
| 스킬 할인 | 스킬 비용 -15% | 2 | 5 MP |

메타 포인트 획득: 런 시도 시 +1, 클리어 시 +runNumber

### 저장 시스템

| 저장소 | 용도 | 키 |
|--------|------|----|
| localStorage | 메타 진행 | `sell-the-news-meta` |
| localStorage | 턴별 세이브 | `sell-the-news-save` |
| Firestore | 클라우드 동기화 | `users/{uid}/meta` |

세이브 데이터: 화면, 페이즈, 턴, 시장 상태, 포트폴리오, 뉴스, 아이템, 스킬, 이벤트 전체 스냅샷

---

## 11. 외부 연동

### Firebase

| 서비스 | 용도 | 파일 |
|--------|------|------|
| Auth | Google 로그인 (signInWithRedirect) | `utils/firebase.ts` |
| Firestore | 메타 진행 클라우드 저장 | `utils/cloudSave.ts` |

### 기타

| 서비스 | 용도 |
|--------|------|
| PixelLab | 픽셀 아이콘 생성 (아이템/스킬/주간룰) |
| Howler.js | SFX (매매, 뉴스, 턴 전환) + BGM 크로스페이드 |

---

## 12. 교육 시스템 요약

게임을 통해 학습하는 금융 리터러시:

| 영역 | 게임 메커닉 | 학습 내용 |
|------|-----------|----------|
| 뉴스 리터러시 | 가짜뉴스 감별 | 출처 신뢰도, 펌프앤덤프, FUD 패턴 |
| 시장 심리 | 군중 심리/패닉 | FOMO, 공포 매도, 확증 편향 |
| 리스크 관리 | 자동매매 룰 | 손절, 분할매수(DCA), 리밸런싱 |
| 기술적 분석 | 차트/지표 스킬 | 이동평균, 섹터 로테이션, 추세 감지 |
| 포트폴리오 | 포지션 관리 | 분산투자, 포지션 사이징, 수수료 |
| 거시경제 | 경제 지표/주간룰 | 금리, GDP, FOMC, 서킷브레이커 |
