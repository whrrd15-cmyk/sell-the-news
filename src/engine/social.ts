/**
 * SNS 여론 게시글 생성 엔진
 *
 * 시장 상태를 간접적으로 반영하되 직접적인 지표 표현은 하지 않음.
 * 유저가 여론의 분위기를 읽고 시장 방향을 추론해야 함.
 * 가끔 거짓 정보/루머도 섞여 팩트체크는 유저 몫.
 */

export interface SocialPost {
  id: string
  author: string
  avatar: string
  content: string
  likes: number
  comments: number
  shares: number
  minutesAgo: number
  isReliable: boolean  // 내부 데이터: UI에 표시하지 않음
}

const BULLISH_AUTHORS = [
  { name: '@수익왕', avatar: '🤑' },
  { name: '@주식천재', avatar: '🧠' },
  { name: '@강남트레이더', avatar: '💎' },
  { name: '@10배수익', avatar: '🚀' },
]

const BEARISH_AUTHORS = [
  { name: '@신중파', avatar: '🛡️' },
  { name: '@리스크관리', avatar: '⚠️' },
  { name: '@현실주의자', avatar: '📉' },
  { name: '@가치투자', avatar: '🔍' },
]

const NEUTRAL_AUTHORS = [
  { name: '@경제박사', avatar: '📊' },
  { name: '@시장관찰자', avatar: '👀' },
  { name: '@개미투자자', avatar: '🐜' },
  { name: '@주린이', avatar: '🌱' },
]

const RUMORERS = [
  { name: '@찌라시봇', avatar: '🤖' },
  { name: '@내부자X', avatar: '🕵️' },
  { name: '@대박정보', avatar: '💰' },
]

// 감정별 게시글 풀 (직접적 시장 용어 회피)
const BULLISH_POSTS = [
  '오늘 분위기 좋다... 뭔가 올 것 같은 느낌 ㅎㅎ',
  '주변에서 다들 사고 있다는데 나만 안 사면 바보 아닌가?',
  '이번에 진짜 크게 온다고 봄. 준비하신 분?',
  '아 진짜 오늘 기분 좋다. 통장이 웃고 있음',
  '친구가 대출받아서 주식 넣었다는데... 그 정도까지는 아니지만 나도 좀 더 넣을까',
  '이 정도면 거의 확정 아님? 안 사면 후회할 듯',
  '와 뉴스 보니까 완전 좋은 신호인데',
  '직감인데 이번 주는 좋을 것 같아',
]

const BEARISH_POSTS = [
  '뭔가 이상하다... 너무 조용해서 불안함',
  '지금 사면 물릴 것 같은 느낌이 강하게 옴',
  '주변에서 다 팔고 있다는데 나도 좀 정리해야 하나...',
  '뉴스 보면 볼수록 안 좋은데 왜 다들 모르는 거지?',
  '손절할 때가 된 것 같아. 더 기다리면 늦을지도',
  '이번에 진짜 큰 거 올 수도 있어. 조심해야 할 듯',
  '오늘은 그냥 관망. 들어가면 안 될 것 같은 날',
  '자꾸 떨어지는데... 언제까지 버틸 수 있을까',
]

const NEUTRAL_POSTS = [
  '요즘 시장 뭔가 애매하지 않나? 올라갈 것 같기도 하고...',
  '어떻게 해야 할지 모르겠다. 그냥 들고 있는 중',
  '솔직히 지금은 뉴스 분석하는 게 제일 중요한 시기인 듯',
  '한쪽으로 확실히 갈 때까지 기다리는 게 맞는 건가',
  '오늘 뉴스 많이 나왔는데 다들 어떻게 보시나요?',
  '경제 지표 좀 찾아봤는데 해석이 어렵네...',
]

const RUMOR_POSTS = [
  '내부 정보인데 다음 주에 대형 호재 발표 예정이래요 (확인 안 됨)',
  '어떤 애널리스트가 그러는데 곧 폭락한다고... 믿어야 하나?',
  '소문인데 이번 달 안에 금리 인하한다고',
  '찌라시인데 특정 기업 M&A 소문 돌고 있음',
  '친구 증권사 다니는데 큰손들 다 빠지고 있대',
  '오늘 밤에 뭔가 발표된다는 소문이 도는데...',
]

function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    return (s >>> 0) / 0xffffffff
  }
}

export function generateSocialPosts(
  herdSentiment: number,
  panicLevel: number,
  tickCount: number,
  count: number = 8,
): SocialPost[] {
  const rng = seededRandom(tickCount * 1337 + 42)
  const posts: SocialPost[] = []

  for (let i = 0; i < count; i++) {
    const roll = rng()
    const rumorChance = 0.15

    let content: string
    let author: { name: string; avatar: string }
    let isReliable = true

    if (roll < rumorChance) {
      // 루머/거짓 정보
      content = RUMOR_POSTS[Math.floor(rng() * RUMOR_POSTS.length)]
      author = RUMORERS[Math.floor(rng() * RUMORERS.length)]
      isReliable = false
    } else {
      // 시장 심리 반영 (확률적)
      const sentimentRoll = rng()
      const bullishThreshold = 0.3 + herdSentiment * 0.3 // sentiment 높으면 낙관 게시글 많음
      const bearishThreshold = bullishThreshold + (0.3 - herdSentiment * 0.2 + panicLevel * 0.3)

      if (sentimentRoll < bullishThreshold) {
        content = BULLISH_POSTS[Math.floor(rng() * BULLISH_POSTS.length)]
        author = BULLISH_AUTHORS[Math.floor(rng() * BULLISH_AUTHORS.length)]
      } else if (sentimentRoll < bearishThreshold) {
        content = BEARISH_POSTS[Math.floor(rng() * BEARISH_POSTS.length)]
        author = BEARISH_AUTHORS[Math.floor(rng() * BEARISH_AUTHORS.length)]
      } else {
        content = NEUTRAL_POSTS[Math.floor(rng() * NEUTRAL_POSTS.length)]
        author = NEUTRAL_AUTHORS[Math.floor(rng() * NEUTRAL_AUTHORS.length)]
      }
    }

    posts.push({
      id: `social_${tickCount}_${i}`,
      author: author.name,
      avatar: author.avatar,
      content,
      likes: Math.floor(rng() * 2000),
      comments: Math.floor(rng() * 300),
      shares: Math.floor(rng() * 150),
      minutesAgo: Math.floor(1 + rng() * 30),
      isReliable,
    })
  }

  // 시간순 정렬 (최신 먼저)
  posts.sort((a, b) => a.minutesAgo - b.minutesAgo)

  return posts
}
