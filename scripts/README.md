# scripts/

개발용 유틸리티 스크립트.

---

## `generate-events.mjs` — 뉴스 이벤트 자동 생성

Claude API로 `EventTemplate` JSON을 생성. 수동 검수 후 `src/data/events.ts`에 추가.

### 사전 준비

```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

### 사용법

**기본** (기술 섹터 5개):
```bash
node scripts/generate-events.mjs --count 5 --category technology
```

**가짜뉴스 포함**:
```bash
node scripts/generate-events.mjs --count 10 --category economic --with-fake
```

**특정 섹터에 영향**:
```bash
node scripts/generate-events.mjs --count 8 --sectors tech,energy --min-difficulty 3
```

**도움말**:
```bash
node scripts/generate-events.mjs --help
```

### 옵션

| 옵션 | 설명 | 기본 |
|------|------|------|
| `--count N` | 생성할 이벤트 수 | 5 |
| `--category X` | EventCategory 지정 | (무제한) |
| `--sectors X,Y` | 영향 섹터 제한 | (무제한) |
| `--min-difficulty N` | 최소 난이도 (1-8) | 1 |
| `--with-fake` | fakeVariants 포함 | false |
| `--model NAME` | Claude 모델 | claude-sonnet-4-5 |

### 출력

`scripts/output/draft-YYYY-MM-DDTHH-MM-SS.ts` 형식으로 저장.
스키마 검증이 자동 실행되며, 실패 항목은 콘솔에 표시됨.

### 검수 → 통합 워크플로우

```bash
# 1. 생성
node scripts/generate-events.mjs --count 10 --with-fake

# 2. 결과 확인
cat scripts/output/draft-*.ts

# 3. 품질 좋은 것만 골라서 src/data/events.ts EVENT_TEMPLATES 배열에 수동 append

# 4. 빌드 확인
npx tsc --noEmit
```

### 생성 비용

claude-sonnet-4-5 기준:
- 입력 ~2K 토큰 (시스템 + 예시) — $0.006
- 출력 ~3K 토큰 (10개 이벤트) — $0.045
- **~$0.05 / 10개 이벤트**

### 품질 체크리스트 (검수 시)

- [ ] headline이 자연스러운 한국어 헤드라인인가
- [ ] sectorImpacts의 섹터와 방향이 매크로 이론에 부합하는가
- [ ] minDifficulty가 적절한가 (복잡한 뉴스는 2+)
- [ ] fakeVariants의 educationalNote가 "왜 가짜인지" 명확히 설명하는가
- [ ] 기존 이벤트와 내용이 중복되지 않는가
- [ ] id가 snake_case이고 카테고리 prefix를 따르는가
