/** public 폴더 에셋 경로를 base URL에 맞게 변환 */
export function asset(path: string): string {
  const base = import.meta.env.BASE_URL ?? '/'
  // 이미 base가 포함된 경우 그대로
  if (path.startsWith(base)) return path
  // 앞의 / 제거 후 base와 결합
  const clean = path.startsWith('/') ? path.slice(1) : path
  return `${base}${clean}`
}
