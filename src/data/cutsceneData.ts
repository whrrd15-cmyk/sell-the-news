// ═══════════════════════════════════════════
// 시네마틱 튜토리얼 컷씬 데이터
// ═══════════════════════════════════════════

export interface CutsceneCharacter {
  id: 'mentor' | 'intern'
  position: 'left' | 'center' | 'right'
  animation: 'idle' | 'walk'
  facing: 'left' | 'right'
  scale?: number // default 2.5
}

export interface CutsceneScene {
  id: string
  background: string | null          // public/cutscene/bg-{id}.png, null = CSS-only
  characters: CutsceneCharacter[]
  subtitle: string | null
  subtitleDelay?: number             // ms before subtitle starts typing
  overlay?: 'logo' | 'difficulty-table' | 'rules-cards' | 'quarter-title'
}

export const CUTSCENE_SCENES: CutsceneScene[] = [
  {
    id: 'street',
    background: '/cutscene/bg-street.png',
    characters: [
      { id: 'intern', position: 'center', animation: 'walk', facing: 'right', scale: 3 },
    ],
    subtitle: '첫 출근. 한국투자증권 리서치센터.',
    subtitleDelay: 800,
  },
  {
    id: 'logo',
    background: null, // CSS cosmic background
    characters: [],
    subtitle: null,
    overlay: 'logo',
  },
  {
    id: 'floor',
    background: '/cutscene/bg-floor.png',
    characters: [
      { id: 'mentor', position: 'left', animation: 'idle', facing: 'right', scale: 2.5 },
      { id: 'intern', position: 'right', animation: 'idle', facing: 'left', scale: 2.5 },
    ],
    subtitle: '리서치센터 차장이야. 네 OJT 담당.',
    subtitleDelay: 600,
  },
  {
    id: 'briefing',
    background: '/cutscene/bg-briefing.png',
    characters: [
      { id: 'mentor', position: 'left', animation: 'idle', facing: 'right', scale: 2.5 },
    ],
    subtitle: '8분기 동안 살아남아야 해. 각 분기마다 난이도가 올라간다.',
    subtitleDelay: 400,
    overlay: 'difficulty-table',
  },
  {
    id: 'rules',
    background: '/cutscene/bg-briefing.png',
    characters: [
      { id: 'mentor', position: 'left', animation: 'idle', facing: 'right', scale: 3 },
    ],
    subtitle: '세 가지만 기억해.',
    subtitleDelay: 300,
    overlay: 'rules-cards',
  },
  {
    id: 'desk',
    background: '/cutscene/bg-desk.png',
    characters: [
      { id: 'intern', position: 'center', animation: 'idle', facing: 'right', scale: 2.5 },
    ],
    subtitle: '여기가 네 자리야. 화면 잘 봐.',
    subtitleDelay: 600,
  },
  {
    id: 'depart',
    background: '/cutscene/bg-depart.png',
    characters: [
      { id: 'mentor', position: 'center', animation: 'walk', facing: 'right', scale: 2.5 },
    ],
    subtitle: '행운을 빌어, 인턴.',
    subtitleDelay: 500,
    overlay: 'quarter-title',
  },
]

// 캐릭터 스프라이트 경로 (정적)
export const CHARACTER_SPRITES: Record<string, Record<string, string>> = {
  mentor: {
    idle: '/cutscene/mentor-south.png',
    walk: '/cutscene/mentor-east.png',
  },
  intern: {
    idle: '/cutscene/intern-south.png',
    walk: '/cutscene/intern-east.png',
  },
}

// walk 애니메이션 프레임 (6프레임 순환)
const WALK_FRAME_COUNT = 6
export const WALK_FRAMES: Record<string, string[]> = {
  mentor: Array.from({ length: WALK_FRAME_COUNT }, (_, i) =>
    `/cutscene/mentor-walk-east/frame_${String(i).padStart(3, '0')}.png`
  ),
  // 인턴 walk 프레임은 추후 추가 (현재 정적 스프라이트 사용)
}

// 난이도 테이블 데이터 (기존 OnboardingScreen에서 이동)
export const DIFFICULTY_TABLE = [
  { quarter: 1, name: '골디락스',    target: '5%',  volatility: '낮음', fake: '10%', grade: 'E' },
  { quarter: 2, name: '강세장',      target: '8%',  volatility: '낮음', fake: '10%', grade: 'D' },
  { quarter: 3, name: '테이퍼링',    target: '12%', volatility: '보통', fake: '15%', grade: 'C' },
  { quarter: 4, name: '금리 인상기', target: '15%', volatility: '높음', fake: '20%', grade: 'B' },
  { quarter: 5, name: '버블 경제',   target: '20%', volatility: '높음', fake: '25%', grade: 'B+' },
  { quarter: 6, name: '리세션',      target: '18%', volatility: '매우높음', fake: '30%', grade: 'A' },
  { quarter: 7, name: '블랙 스완',   target: '25%', volatility: '극한', fake: '35%', grade: 'A+' },
  { quarter: 8, name: '퍼펙트 스톰', target: '30%', volatility: '극한', fake: '40%', grade: 'S' },
]

// 규칙 카드 데이터
export const RULE_CARDS = [
  { number: 1, title: '뉴스를 읽어라', desc: '모든 정보에는 의도가 있다.\n출처를 확인하고, 팩트를 검증하라.' },
  { number: 2, title: '감정을 배제해라', desc: '공포와 탐욕은 최악의 조언자다.\n데이터로 판단하라.' },
  { number: 3, title: '분산 투자해라', desc: '한 바구니에 모든 달걀을 담지 마라.\n리스크를 관리하라.' },
]
