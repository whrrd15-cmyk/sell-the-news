# Cinematic Tutorial Cutscene Design

## Overview

타이틀 화면에서 첫 런 시작 시 7씬 풀스크린 시네마틱 컷씬 재생.
PixelLab 고해상도 에셋(128px pro 캐릭터, 400x400 배경)을 React에서 조합.
첫 런에만 자동 재생, 이후 스킵. 시네마 자막 스타일 대사 표시.

## Trigger

- `startNewRun()` → 첫 런(`metaProgress.totalRuns === 0`) → `setScreen('onboarding')`
- 이후 런은 바로 `'stockpicker'`로 이동 (현재 로직 유지)

## Scene Sequence

| # | Scene ID | Background | Characters | Subtitle | Overlay |
|---|----------|-----------|------------|----------|---------|
| 0 | street | 새벽 도시 거리, 증권사 빌딩 | 인턴 (뒷모습, walk) | "첫 출근. 한국투자증권 리서치센터." | 없음 |
| 1 | logo | 기존 cosmic 배경 (CSS) | 없음 | 없음 | "SELL THE NEWS" 타이틀 + 글리치 |
| 2 | floor | 트레이딩 플로어 (모니터, 책상) | 멘토 (정면, idle) + 인턴 (정면, idle) | "리서치센터 차장이야. 네 OJT 담당." | 없음 |
| 3 | briefing | 브리핑룸 (화이트보드, 의자) | 멘토 (point 포즈) | "8분기 동안 살아남아야 해." | 분기별 난이도 테이블 (기존 로직 재사용) |
| 4 | rules | 멘토 클로즈업 배경 | 멘토 (point 포즈, 확대) | "세 가지만 기억해." | 규칙 카드 3장 순차 등장 (기존 로직 재사용) |
| 5 | desk | 트레이딩 데스크 클로즈업 | 인턴 (뒷모습, idle) | "여기가 네 자리야. 화면 잘 봐." | 없음 |
| 6 | depart | 사무실 전경 (원거리) | 멘토 (뒷모습, walk) | "행운을 빌어, 인턴." | "QUARTER 1 골디락스" 골드 타이틀 |

## PixelLab Assets

### Characters (128px, pro mode)

#### Mentor (멘토)
- **Description**: Male office worker in dark navy suit, white shirt, red tie. Short black hair, confident expression. Korean securities firm senior manager. Pixel art style.
- **Size**: 128px
- **Mode**: pro
- **View**: side
- **Proportions**: realistic_male
- **Outline**: selective outline
- **Shading**: detailed shading
- **Detail**: high detail
- **Directions**: 8 (전방위 — 정면, 뒷모습, 좌우 등)
- **Animations**: idle, walk, point (커스텀 — "pointing forward with right hand, explaining")

#### Intern (인턴/플레이어)
- **Description**: Young male office worker in light grey suit, slightly nervous expression. Short dark hair, carrying a small bag. Fresh graduate entering first day at work. Pixel art style.
- **Size**: 128px
- **Mode**: pro
- **View**: side
- **Proportions**: realistic_male
- **Outline**: selective outline
- **Shading**: detailed shading
- **Detail**: high detail
- **Directions**: 8
- **Animations**: idle, walk

### Backgrounds (map_object, 400x400)

모든 배경 공통 설정:
- **View**: side
- **Outline**: selective outline
- **Shading**: detailed shading
- **Detail**: high detail

#### 1. street (새벽 도시 거리)
- **Description**: Early morning city street with tall financial district buildings. Dawn sky with orange and purple gradients. Street lights still on. Korean-style securities firm building entrance visible. Dark pixel art style.
- **Width**: 400, **Height**: 400

#### 2. floor (트레이딩 플로어)
- **Description**: Inside a securities trading floor. Multiple computer monitors showing stock charts. Office desks arranged in rows. Fluorescent office lighting. Dark blue carpet. Busy professional atmosphere. Pixel art style.
- **Width**: 400, **Height**: 400

#### 3. briefing (브리핑룸)
- **Description**: Small corporate meeting room. Whiteboard on the wall with charts and graphs drawn on it. A long conference table with chairs. Projector screen. Dim lighting with spotlight on the whiteboard. Pixel art style.
- **Width**: 400, **Height**: 400

#### 4. desk (트레이딩 데스크 클로즈업)
- **Description**: Close-up of a trading desk workstation. Three computer monitors showing stock charts and candlestick graphs. Keyboard, mouse, coffee cup. Dark environment with screen glow illuminating the desk. Pixel art style.
- **Width**: 400, **Height**: 400

#### 5. depart (사무실 전경)
- **Description**: Wide view of the entire trading floor office from behind. Rows of desks with monitors. Large windows showing city skyline in the background. Evening golden hour light streaming in. Pixel art style.
- **Width**: 400, **Height**: 400

## Screen Layout

```
+------------------------------------------+
|                                          |
|         Background (400x400)             |
|         CSS: cover, pixelated            |
|                                          |
|     [Character 128px, 2-3x scaled]       |
|         absolute positioned              |
|                                          |
|                                          |
|  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~|
|  gradient overlay (transparent → black)  |
|  "자막 텍스트가 여기에 타이핑 효과로"      |
|  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~|
|              [click to continue]         |
+------------------------------------------+
```

- 배경: `object-fit: cover` + `image-rendering: pixelated`로 풀스크린
- 캐릭터: 128px 원본 → CSS scale 2~3배, 배경 위 absolute 배치
- 자막: 하단 20% 영역, `linear-gradient(transparent, rgba(0,0,0,0.8))` 위에 흰색 텍스트
- 자막 타이핑 효과: 현재 OnboardingScreen의 타이핑 로직 재사용
- 클릭/스페이스: 타이핑 중 → 전체 표시, 완료 후 → 다음 씬
- ESC: 전체 스킵 → stockpicker로 이동

## Scene Transitions

- 씬 간 전환: Framer Motion `AnimatePresence` + fade (opacity 0→1, duration 0.8s)
- 캐릭터 등장: slide-in (좌/우에서 들어옴, duration 0.5s)
- 오버레이 (테이블, 규칙 카드): 기존 애니메이션 로직 재사용

## Data Structure

```ts
interface CutsceneScene {
  id: string
  background: string              // public/cutscene/bg-{id}.png
  characters: {
    id: 'mentor' | 'intern'
    position: 'left' | 'center' | 'right'
    animation: 'idle' | 'walk' | 'point'
    facing: 'left' | 'right'
    scale?: number                // default 2.5
  }[]
  subtitle: string | null
  overlay?: 'logo' | 'difficulty-table' | 'rules-cards' | 'quarter-title'
  bgm?: string                   // optional BGM change
}
```

## File Structure

```
public/cutscene/
  bg-street.png
  bg-floor.png
  bg-briefing.png
  bg-desk.png
  bg-depart.png
  mentor-idle.png      (spritesheet or individual frames)
  mentor-walk.png
  mentor-point.png
  intern-idle.png
  intern-walk.png

src/components/layout/OnboardingScreen.tsx    (리뉴얼)
src/data/cutsceneData.ts                      (씬 배열 정의)
```

## Scope

- OnboardingScreen.tsx 리뉴얼 (기존 5씬 로직 → 7씬 시네마틱)
- PixelLab 에셋 생성: 캐릭터 2개 + 애니메이션 + 배경 5개
- 씬 데이터 파일 분리
- 기존 오버레이 로직 (난이도 테이블, 규칙 카드) 재사용
- 자막 스타일 CSS 추가
