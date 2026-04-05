#!/usr/bin/env node
/**
 * 뉴스 이벤트 템플릿 자동 생성 스크립트 (LLM 개발 도구)
 *
 * 사용법:
 *   export ANTHROPIC_API_KEY=sk-ant-...
 *   node scripts/generate-events.mjs --count 5 --category technology --with-fake
 *   node scripts/generate-events.mjs --count 10 --sectors tech,energy --min-difficulty 3
 *
 * 출력: scripts/output/draft-{timestamp}.ts
 * 사람이 검수 후 src/data/events.ts에 수동으로 append
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const OUTPUT_DIR = path.join(__dirname, 'output')

// ═══════════════ Schema Constants ═══════════════
const SECTORS = ['tech', 'energy', 'finance', 'consumer', 'healthcare']
const SECTOR_OR_ALL = [...SECTORS, 'all']
const SOURCES = ['official', 'financial', 'analyst', 'social', 'anonymous', 'insider']
const FAKE_TYPES = ['rumor', 'pump_and_dump', 'fud', 'stale_news', 'bias_trap', 'conflict']
const CATEGORIES = ['government', 'geopolitics', 'economic', 'technology', 'disaster', 'social', 'commodity']

// ═══════════════ Few-shot Examples ═══════════════
const FEW_SHOT_EXAMPLES = [
  {
    id: 'gov_semiconductor_subsidy',
    headline: '정부, 반도체 산업에 10조 원 규모 지원책 발표',
    content: '산업통상자원부가 차세대 반도체 연구개발과 생산시설 확충을 위한 10조 원 규모의 종합 지원 패키지를 발표했다. 세액공제 확대, 인력양성, 연구비 지원이 주요 골자다.',
    body: '산업통상자원부가 오늘 \'반도체 초강대국 달성 전략\'을 발표하며, 향후 5년간 10조 원 규모의 종합 지원 패키지를 투입하겠다고 밝혔다.\n\n주요 내용은 △반도체 설비 투자 세액공제율 25%로 확대 △차세대 반도체(GAA, 2나노) R&D에 3조 원 투입 △반도체 인력 10만 명 양성 프로그램 등이다.\n\n업계에서는 환영하는 분위기지만, "실제 집행까지 시간이 걸릴 것"이라는 신중론도 있다.',
    category: 'government',
    sources: ['official', 'financial'],
    sectorImpacts: [{ sector: 'tech', impact: 0.4, duration: 4 }],
    minDifficulty: 1,
    weight: 7,
    fakeVariants: [
      {
        headline: '반도체 지원 예산 전액 삭감 위기... 야당 반발',
        content: 'SNS에서 "여야 갈등으로 반도체 지원 예산이 전액 삭감될 수 있다"는 소문이 퍼지고 있다.',
        fakeType: 'fud',
        perceivedImpact: [{ sector: 'tech', impact: -0.35, duration: 3 }],
        actualImpact: [{ sector: 'tech', impact: 0.11, duration: 2 }],
        educationalNote: 'FUD는 이미 공식 발표된 정책을 뒤집을 수 있다는 두려움을 조장합니다. 정부 예산은 국회 심의를 거치므로 갑자기 전액 삭감되기 어렵습니다.',
      },
    ],
  },
  {
    id: 'com_opec_cut_extend',
    headline: 'OPEC+, 일일 200만 배럴 감산 연장 결정',
    content: 'OPEC+ 정례회의에서 감산 합의를 내년 말까지 연장하기로 결정했다. 국제 유가는 10% 이상 급등했다.',
    category: 'commodity',
    sources: ['official', 'financial'],
    sectorImpacts: [
      { sector: 'energy', impact: 0.35, duration: 3 },
      { sector: 'consumer', impact: -0.1, duration: 2 },
    ],
    minDifficulty: 2,
    weight: 6,
  },
]

// ═══════════════ Schema Description (for prompt) ═══════════════
const SCHEMA_DESC = `
EventTemplate JSON 스키마:
{
  "id": string (snake_case, 카테고리 prefix, 예: "tech_ai_breakthrough"),
  "headline": string (한국어 헤드라인, 30자 이내),
  "content": string (2-3 문장 요약, 80-150자),
  "body": string (전문 기사 3-5 문단, 선택),
  "category": "${CATEGORIES.join('" | "')}",
  "sources": Array<"${SOURCES.join('" | "')}">,
  "sectorImpacts": [{
    "sector": "${SECTOR_OR_ALL.join('" | "')}",
    "impact": number (-1.0 ~ 1.0, 보통 -0.4 ~ 0.4),
    "duration": number (1-5 턴)
  }],
  "minDifficulty": number (1-8, 어려운 뉴스는 2+),
  "weight": number (1-10, 자주 나와야 하면 높게),
  "chainEventId"?: string (후속 이벤트 ID),
  "chainDelay"?: number (후속까지 턴 수),
  "isNoise"?: boolean (시장 영향 없는 노이즈),
  "fakeVariants"?: [{
    "headline": string,
    "content": string,
    "body"?: string,
    "fakeType": "${FAKE_TYPES.join('" | "')}",
    "perceivedImpact": SectorImpact[] (표면적 영향),
    "actualImpact": SectorImpact[] (실제는 거의 없거나 반대),
    "educationalNote": string (플레이어에게 가르치는 교훈, 100자+)
  }]
}

가짜 뉴스 유형:
- rumor: 출처 불명 루머
- pump_and_dump: 작전세력 과대포장 → 급락
- fud: 공포·불확실성·의심 조장
- stale_news: 이미 반영된 헌뉴스 재포장
- bias_trap: 확증편향 자극
- conflict: 이해충돌 있는 편향 보고서

품질 기준:
- 한국 주식시장 맥락 (KRX, 원화, 국내 기업/정책)
- 교육적 가치 (실제 투자 판단에 도움)
- 현실적 수치와 구체성
- 섹터 영향은 매크로 이론에 부합 (예: 금리 ↑ → 금융 ↑, 기술 ↓)
- fakeVariants의 educationalNote는 반드시 "왜 가짜인지" 설명
`.trim()

// ═══════════════ CLI Arg Parsing ═══════════════
function parseArgs(argv) {
  const args = { count: 5, withFake: false, minDifficulty: 1 }
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--count') args.count = parseInt(argv[++i], 10)
    else if (a === '--category') args.category = argv[++i]
    else if (a === '--sectors') args.sectors = argv[++i].split(',')
    else if (a === '--min-difficulty') args.minDifficulty = parseInt(argv[++i], 10)
    else if (a === '--with-fake') args.withFake = true
    else if (a === '--model') args.model = argv[++i]
    else if (a === '--help' || a === '-h') {
      console.log(`
Usage: node scripts/generate-events.mjs [options]

Options:
  --count N              생성할 이벤트 개수 (기본 5)
  --category X           EventCategory 지정 (${CATEGORIES.join('|')})
  --sectors tech,energy  영향 섹터 제한
  --min-difficulty N     최소 난이도 (1-8, 기본 1)
  --with-fake            각 이벤트에 fakeVariant 1개 이상 생성
  --model NAME           Claude 모델 (기본 claude-sonnet-4-5)
  --help                 이 메시지 표시

환경변수:
  ANTHROPIC_API_KEY  (필수)
`)
      process.exit(0)
    }
  }
  return args
}

// ═══════════════ Anthropic API Call ═══════════════
async function callClaude({ model, system, userMessage, apiKey }) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 8000,
      system,
      messages: [{ role: 'user', content: userMessage }],
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Anthropic API ${response.status}: ${err}`)
  }

  const data = await response.json()
  const text = data.content?.[0]?.text ?? ''
  return { text, usage: data.usage }
}

// ═══════════════ JSON Extraction ═══════════════
function extractJson(text) {
  // JSON 배열 찾기 (```json ... ``` 또는 [...] 직접)
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const raw = fenceMatch ? fenceMatch[1] : text
  const arrStart = raw.indexOf('[')
  const arrEnd = raw.lastIndexOf(']')
  if (arrStart < 0 || arrEnd < 0) throw new Error('JSON 배열을 찾을 수 없음')
  const jsonStr = raw.slice(arrStart, arrEnd + 1)
  return JSON.parse(jsonStr)
}

// ═══════════════ Schema Validation ═══════════════
function validateSectorImpact(si, path) {
  const errors = []
  if (!SECTOR_OR_ALL.includes(si.sector)) errors.push(`${path}.sector: "${si.sector}" invalid`)
  if (typeof si.impact !== 'number' || Math.abs(si.impact) > 1) errors.push(`${path}.impact out of range`)
  if (!Number.isInteger(si.duration) || si.duration < 1 || si.duration > 10) errors.push(`${path}.duration invalid`)
  return errors
}

function validateEvent(e, idx) {
  const errors = []
  const p = `[${idx}]`
  if (!e.id || typeof e.id !== 'string') errors.push(`${p}.id missing`)
  if (!e.headline || typeof e.headline !== 'string') errors.push(`${p}.headline missing`)
  if (!e.content || typeof e.content !== 'string') errors.push(`${p}.content missing`)
  if (!CATEGORIES.includes(e.category)) errors.push(`${p}.category "${e.category}" invalid`)
  if (!Array.isArray(e.sources) || e.sources.length === 0) errors.push(`${p}.sources missing`)
  else {
    for (const s of e.sources) if (!SOURCES.includes(s)) errors.push(`${p}.sources: "${s}" invalid`)
  }
  if (!Array.isArray(e.sectorImpacts)) errors.push(`${p}.sectorImpacts missing`)
  else e.sectorImpacts.forEach((si, i) => errors.push(...validateSectorImpact(si, `${p}.sectorImpacts[${i}]`)))
  if (!Number.isInteger(e.minDifficulty) || e.minDifficulty < 1 || e.minDifficulty > 8) errors.push(`${p}.minDifficulty invalid`)
  if (!Number.isInteger(e.weight) || e.weight < 1 || e.weight > 10) errors.push(`${p}.weight invalid`)
  if (e.fakeVariants) {
    e.fakeVariants.forEach((fv, i) => {
      const fp = `${p}.fakeVariants[${i}]`
      if (!fv.headline) errors.push(`${fp}.headline missing`)
      if (!FAKE_TYPES.includes(fv.fakeType)) errors.push(`${fp}.fakeType "${fv.fakeType}" invalid`)
      if (!Array.isArray(fv.perceivedImpact)) errors.push(`${fp}.perceivedImpact missing`)
      else fv.perceivedImpact.forEach((si, j) => errors.push(...validateSectorImpact(si, `${fp}.perceivedImpact[${j}]`)))
      if (!Array.isArray(fv.actualImpact)) errors.push(`${fp}.actualImpact missing`)
      else fv.actualImpact.forEach((si, j) => errors.push(...validateSectorImpact(si, `${fp}.actualImpact[${j}]`)))
      if (!fv.educationalNote || fv.educationalNote.length < 50) errors.push(`${fp}.educationalNote too short`)
    })
  }
  return errors
}

// ═══════════════ TS Formatting ═══════════════
function formatAsTS(events) {
  const stringify = (obj, indent = 2) => {
    const pad = ' '.repeat(indent)
    const childPad = ' '.repeat(indent + 2)
    if (Array.isArray(obj)) {
      if (obj.length === 0) return '[]'
      const items = obj.map(x => childPad + stringify(x, indent + 2))
      return '[\n' + items.join(',\n') + '\n' + pad + ']'
    }
    if (obj && typeof obj === 'object') {
      const keys = Object.keys(obj)
      if (keys.length === 0) return '{}'
      const lines = keys.map(k => {
        const v = obj[k]
        const key = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(k) ? k : JSON.stringify(k)
        return childPad + key + ': ' + stringify(v, indent + 2)
      })
      return '{\n' + lines.join(',\n') + ',\n' + pad + '}'
    }
    if (typeof obj === 'string') {
      if (obj.includes('\n')) {
        return '`' + obj.replace(/`/g, '\\`').replace(/\$/g, '\\$') + '`'
      }
      return JSON.stringify(obj)
    }
    return JSON.stringify(obj)
  }
  return events.map(e => '  ' + stringify(e, 2)).join(',\n')
}

// ═══════════════ Main ═══════════════
async function main() {
  const args = parseArgs(process.argv)
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    console.error('ERROR: ANTHROPIC_API_KEY 환경변수가 설정되지 않음')
    console.error('  export ANTHROPIC_API_KEY=sk-ant-...')
    process.exit(1)
  }

  const model = args.model ?? 'claude-sonnet-4-5'

  // 유저 프롬프트 구성
  let request = `다음 조건으로 EventTemplate ${args.count}개를 JSON 배열로 생성해주세요.\n\n`
  if (args.category) request += `- 카테고리: ${args.category}\n`
  if (args.sectors) request += `- 주로 영향받는 섹터: ${args.sectors.join(', ')}\n`
  request += `- 최소 난이도: ${args.minDifficulty}\n`
  if (args.withFake) request += `- 각 이벤트는 반드시 fakeVariants 1개 이상 포함\n`
  request += `\n다양한 유형과 강도의 뉴스를 만들어주세요. 기존 예시와 중복되지 않게.`
  request += `\n\n반드시 순수 JSON 배열만 출력하세요. 설명문이나 마크다운 헤더 없이.`

  const system = `당신은 한국 주식시장 전문 뉴스 편집자입니다. 교육용 트레이딩 게임 "Sell The News"의 뉴스 콘텐츠를 생성합니다.

${SCHEMA_DESC}

참고 예시 2건:
${JSON.stringify(FEW_SHOT_EXAMPLES, null, 2)}
`

  console.log(`🎯 생성 시작: ${args.count}개 이벤트, 모델: ${model}`)
  const start = Date.now()
  const { text, usage } = await callClaude({ model, system, userMessage: request, apiKey })
  const duration = ((Date.now() - start) / 1000).toFixed(1)

  console.log(`📡 API 응답 수신 (${duration}s)`)
  console.log(`   입력 토큰: ${usage?.input_tokens}, 출력: ${usage?.output_tokens}`)

  // JSON 추출
  let events
  try {
    events = extractJson(text)
  } catch (e) {
    console.error('❌ JSON 파싱 실패:', e.message)
    await fs.mkdir(OUTPUT_DIR, { recursive: true })
    const rawPath = path.join(OUTPUT_DIR, `raw-${Date.now()}.txt`)
    await fs.writeFile(rawPath, text, 'utf8')
    console.error(`   원문 저장: ${rawPath}`)
    process.exit(1)
  }

  if (!Array.isArray(events)) {
    console.error('❌ 응답이 배열이 아닙니다')
    process.exit(1)
  }

  // 검증
  const allErrors = []
  events.forEach((e, i) => {
    const errs = validateEvent(e, i)
    allErrors.push(...errs)
  })

  if (allErrors.length > 0) {
    console.error(`⚠️  검증 실패 (${allErrors.length}건):`)
    allErrors.slice(0, 20).forEach(e => console.error(`   ${e}`))
    if (allErrors.length > 20) console.error(`   ... 외 ${allErrors.length - 20}건`)
  } else {
    console.log('✅ 전체 검증 통과')
  }

  // TS 파일로 저장
  await fs.mkdir(OUTPUT_DIR, { recursive: true })
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
  const outPath = path.join(OUTPUT_DIR, `draft-${timestamp}.ts`)
  const tsContent = `// Auto-generated: ${new Date().toISOString()}
// Model: ${model}
// Count: ${events.length}
// 검증 상태: ${allErrors.length === 0 ? '통과' : `경고 ${allErrors.length}건`}
//
// 사용법: 이 파일 내용을 검수 후 src/data/events.ts의 EVENT_TEMPLATES 배열에 append
import type { EventTemplate } from '../../src/data/types'

export const GENERATED_EVENTS: EventTemplate[] = [
${formatAsTS(events)}
]
`
  await fs.writeFile(outPath, tsContent, 'utf8')
  console.log(`📝 저장 완료: ${outPath}`)
  console.log(`   생성된 이벤트: ${events.length}건`)
  console.log(`   fakeVariants 있는 이벤트: ${events.filter(e => e.fakeVariants?.length > 0).length}건`)
}

main().catch(e => {
  console.error('❌ 실행 실패:', e.message)
  process.exit(1)
})
