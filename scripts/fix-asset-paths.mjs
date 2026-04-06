#!/usr/bin/env node
/**
 * 빌드 후처리: dist/ 내 JS 파일의 절대 에셋 경로에 base prefix 적용
 * /icons/ → /sell-the-news/icons/
 * /audio/ → /sell-the-news/audio/
 * /images/ → /sell-the-news/images/
 */
import fs from 'node:fs/promises'
import path from 'node:path'

const DIST = path.resolve('dist')
const BASE = '/sell-the-news'

// 치환 대상: public/ 하위 모든 디렉토리 (icons, audio, characters, cutscene, ui, images)
const DIRS = 'icons|audio|characters|cutscene|ui|images'
const REPLACEMENTS = [
  [new RegExp(`"\\/(${DIRS})\\/`, 'g'), `"${BASE}/$1/`],
  [new RegExp(`"\\/(${DIRS})"`, 'g'), `"${BASE}/$1"`],
  [new RegExp(`'\\/(${DIRS})\\/`, 'g'), `'${BASE}/$1/`],
  [new RegExp(`'\\/(${DIRS})'`, 'g'), `'${BASE}/$1'`],
  [new RegExp(`\`\\/(${DIRS})\\/`, 'g'), `\`${BASE}/$1/`],
  [new RegExp(`\`\\/(${DIRS})\``, 'g'), `\`${BASE}/$1\``],
]

async function processFile(filePath) {
  let content = await fs.readFile(filePath, 'utf8')
  let changed = false
  for (const [pattern, replacement] of REPLACEMENTS) {
    const before = content
    content = content.replace(pattern, replacement)
    if (content !== before) changed = true
  }
  if (changed) {
    await fs.writeFile(filePath, content, 'utf8')
    console.log(`  ✓ ${path.relative(DIST, filePath)}`)
  }
}

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) await walk(full)
    else if (entry.name.endsWith('.js') || entry.name.endsWith('.css')) {
      await processFile(full)
    }
  }
}

console.log(`🔧 에셋 경로 fix (base: ${BASE})`)
await walk(DIST)
console.log('✅ 완료')
