import type { BreakingNewsData } from './types'

export type { BreakingNewsData }

export const BREAKING_NEWS_POOL: BreakingNewsData[] = [
  {
    id: 'bn_tariff_hike',
    headline: '특보: 미 정부, 중국산 수입품 관세 25% 인상 발표',
    body: '미국 정부가 중국산 수입품에 대한 관세를 기존 10%에서 25%로 인상한다고 발표했습니다. 이번 조치는 기술 부품과 소비재 전반에 영향을 미칠 것으로 예상되며, 글로벌 공급망 재편이 불가피할 것으로 보입니다. 전문가들은 단기적으로 관련 업종 주가에 부정적 영향이 있을 것으로 전망합니다.',
    source: 'official',
    category: 'government',
    sectorImpacts: [
      { sector: 'tech', impact: -0.15, duration: 4 },
      { sector: 'consumer', impact: -0.10, duration: 4 },
    ],
  },
  {
    id: 'bn_rate_cut',
    headline: '특보: 연준, 기준금리 0.5%p 긴급 인하 단행',
    body: '미국 연방준비제도(Fed)가 경기 침체 우려에 대응하여 기준금리를 0.5%포인트 긴급 인하했습니다. 시장에서는 예상보다 큰 폭의 인하에 놀라움을 표하고 있으며, 금융주와 전반적인 시장 심리에 긍정적 영향이 예상됩니다.',
    source: 'official',
    category: 'economic',
    sectorImpacts: [
      { sector: 'finance', impact: 0.12, duration: 3 },
      { sector: 'all', impact: 0.08, duration: 3 },
    ],
  },
  {
    id: 'bn_cyber_attack',
    headline: '특보: 대형 클라우드 서비스 사이버 보안 사고 발생',
    body: '글로벌 주요 클라우드 서비스 제공업체에서 대규모 사이버 보안 사고가 발생했습니다. 수백만 건의 기업 데이터가 유출된 것으로 확인되었으며, 관련 기술 기업들의 주가에 즉각적인 영향이 예상됩니다. 보안 업계 전문가들은 피해 규모 파악에 수일이 걸릴 것으로 보고 있습니다.',
    source: 'financial',
    category: 'technology',
    sectorImpacts: [
      { sector: 'tech', impact: -0.20, duration: 3 },
    ],
  },
  {
    id: 'bn_oil_crisis',
    headline: '특보: 원유 공급망 위기, OPEC 긴급 회의 소집',
    body: '중동 지역 긴장 고조로 원유 공급에 차질이 빚어지면서 OPEC이 긴급 회의를 소집했습니다. 국제 유가가 장중 15% 이상 급등하며 에너지 관련 종목이 일제히 상승하고 있습니다. 반면 운송비 상승 우려로 소비재 업종은 하락 압력을 받고 있습니다.',
    source: 'financial',
    category: 'commodity',
    sectorImpacts: [
      { sector: 'energy', impact: 0.25, duration: 5 },
      { sector: 'consumer', impact: -0.08, duration: 3 },
    ],
  },
  {
    id: 'bn_fda_approval',
    headline: '특보: FDA, 혁신 항암제 긴급 승인 발표',
    body: 'FDA가 새로운 메커니즘의 혁신 항암제에 대해 긴급 승인을 발표했습니다. 임상 3상에서 기존 치료법 대비 생존율 40% 향상이 확인되었으며, 관련 바이오 및 헬스케어 기업들의 주가가 급등하고 있습니다.',
    source: 'official',
    category: 'technology',
    sectorImpacts: [
      { sector: 'healthcare', impact: 0.18, duration: 3 },
    ],
  },
  {
    id: 'bn_chip_shortage',
    headline: '특보: 글로벌 반도체 공급 부족 심화, 생산 차질 확대',
    body: '글로벌 반도체 공급 부족이 심화되면서 주요 전자기기 및 자동차 생산에 심각한 차질이 빚어지고 있습니다. 주요 파운드리 업체들의 가동률이 한계에 도달한 가운데, 정상화까지 최소 3~6개월이 걸릴 것으로 전망됩니다.',
    source: 'analyst',
    category: 'technology',
    sectorImpacts: [
      { sector: 'tech', impact: -0.12, duration: 4 },
    ],
  },
  {
    id: 'bn_climate_deal',
    headline: '특보: 주요 20개국 기후 탄소세 협약 전격 체결',
    body: 'G20 정상회의에서 글로벌 탄소세 도입에 전격 합의했습니다. 화석 연료 기반 에너지 기업에는 추가 비용 부담이, 친환경 헬스케어 및 바이오 기업에는 보조금 혜택이 예상됩니다. 에너지 전환의 속도가 가속화될 전망입니다.',
    source: 'official',
    category: 'government',
    sectorImpacts: [
      { sector: 'energy', impact: -0.10, duration: 4 },
      { sector: 'healthcare', impact: 0.08, duration: 4 },
    ],
  },
  {
    id: 'bn_bank_crisis',
    headline: '특보: 대형 은행 유동성 위기설, 금융시장 긴장',
    body: '글로벌 대형 은행 중 하나가 유동성 위기에 처했다는 보도가 나오면서 금융시장이 크게 동요하고 있습니다. 해당 은행은 루머를 부인했지만, 금융주 전반이 급락하고 안전자산 선호 심리가 강화되고 있습니다.',
    source: 'financial',
    category: 'economic',
    sectorImpacts: [
      { sector: 'finance', impact: -0.20, duration: 3 },
      { sector: 'all', impact: -0.05, duration: 2 },
    ],
  },
  {
    id: 'bn_ai_breakthrough',
    headline: '특보: AI 범용인공지능(AGI) 실현 임박 보도',
    body: '주요 AI 연구소에서 범용인공지능(AGI) 실현에 근접했다는 보도가 나오면서 기술주가 급등하고 있습니다. 관련 AI 칩, 클라우드, 소프트웨어 기업들이 동반 상승하고 있으며, 기존 산업의 디지털 전환 가속화 기대감이 높아지고 있습니다.',
    source: 'analyst',
    category: 'technology',
    sectorImpacts: [
      { sector: 'tech', impact: 0.22, duration: 4 },
    ],
  },
  {
    id: 'bn_consumer_boom',
    headline: '특보: 글로벌 소비심리지수 역대 최고치 기록',
    body: '주요국 소비심리지수가 동시에 역대 최고치를 기록하면서 글로벌 소비 확대 기대감이 높아지고 있습니다. 특히 럭셔리, 식품, 유통 등 소비재 관련 기업들의 실적 전망이 크게 상향 조정되었습니다.',
    source: 'financial',
    category: 'economic',
    sectorImpacts: [
      { sector: 'consumer', impact: 0.15, duration: 3 },
      { sector: 'all', impact: 0.05, duration: 2 },
    ],
  },
  // ═════════════════ LLM-generated batch ═════════════════
  {
    id: 'bn_earthquake_supply',
    headline: '특보: 태평양 연안 강진, 반도체 공장 가동 중단',
    body: '태평양 연안에서 규모 7.2 강진이 발생해 주요 반도체 공장 3곳의 생산라인이 긴급 가동 중단되었습니다. 공급 차질이 수주간 이어질 것으로 전망되며, 관련 부품 가격 급등이 예상됩니다.',
    source: 'official',
    category: 'disaster',
    sectorImpacts: [
      { sector: 'tech', impact: -0.18, duration: 4 },
      { sector: 'consumer', impact: -0.05, duration: 2 },
    ],
  },
  {
    id: 'bn_crypto_regulation',
    headline: '특보: 금융위, 가상자산 거래소 긴급 규제안 발표',
    body: '금융위원회가 가상자산 거래소에 대한 긴급 규제안을 발표했습니다. 고객 자산 분리 보관 의무화, 레버리지 거래 제한 등이 포함되어 핀테크·크립토 관련 금융주에 영향이 예상됩니다.',
    source: 'official',
    category: 'government',
    sectorImpacts: [
      { sector: 'finance', impact: -0.15, duration: 3 },
    ],
  },
  {
    id: 'bn_green_deal',
    headline: '특보: EU-한국 탄소중립 공동투자 100억 유로 합의',
    body: 'EU와 한국이 탄소중립 기술 공동 투자에 100억 유로 규모의 합의를 달성했습니다. 신재생에너지, 수소 인프라, 전기차 배터리 분야에서 한국 기업의 수주 기회가 크게 늘어날 전망입니다.',
    source: 'official',
    category: 'geopolitics',
    sectorImpacts: [
      { sector: 'energy', impact: 0.20, duration: 4 },
      { sector: 'tech', impact: 0.10, duration: 3 },
    ],
  },
  {
    id: 'bn_pandemic_variant',
    headline: '특보: 신종 변이 바이러스 확산, WHO 경계 단계 상향',
    body: 'WHO가 신종 변이 바이러스에 대한 경계 단계를 상향 조정했습니다. 각국 방역 강화 조치로 여행·소비 관련 업종에 타격이 예상되며, 반대로 바이오·헬스케어 업종에는 수혜가 전망됩니다.',
    source: 'official',
    category: 'disaster',
    sectorImpacts: [
      { sector: 'healthcare', impact: 0.15, duration: 3 },
      { sector: 'consumer', impact: -0.12, duration: 3 },
    ],
  },
  {
    id: 'bn_merger_megadeal',
    headline: '특보: 국내 2위 보험사, 1위 자산운용사 인수 발표',
    body: '국내 2위 보험사가 1위 자산운용사를 5조 원에 인수한다고 발표했습니다. 금융업 대형 M&A로 업계 재편이 예상되며, 금융 섹터 전반에 단기 변동성이 확대될 전망입니다.',
    source: 'financial',
    category: 'economic',
    sectorImpacts: [
      { sector: 'finance', impact: 0.18, duration: 3 },
    ],
  },
]

/**
 * 속보 롤링: 투자 페이즈 진입 시 호출
 * 턴 6 이후, ~20% 확률로 속보 발생
 */
export function rollBreakingNews(
  turn: number,
  runNumber: number,
  usedIds: Set<string>,
): BreakingNewsData | null {
  if (turn < 6) return null

  // 시드 기반 랜덤
  let seed = turn * 8831 + runNumber * 53
  const rng = () => {
    seed = (seed * 1664525 + 1013904223) & 0xffffffff
    return (seed >>> 0) / 0xffffffff
  }

  // ~20% 확률
  if (rng() > 0.20) return null

  const available = BREAKING_NEWS_POOL.filter(bn => !usedIds.has(bn.id))
  if (available.length === 0) return null

  return available[Math.floor(rng() * available.length)]
}
