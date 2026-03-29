/**
 * 사이드바 네비게이션
 *
 * 3개 페이지를 전환하는 왼쪽 고정 사이드바.
 * 유저가 능동적으로 정보를 찾아가는 구조를 만든다.
 *
 * 매매: 차트와 매매에 집중 (원시 정보만)
 * 뉴스: 기사를 읽고 분석 (유저가 직접 해석)
 * 분석: 시장 지표 확인 (유저가 필요할 때만)
 */

export type PageId = 'trading' | 'news' | 'analysis'

interface SidebarNavProps {
  activePage: PageId
  onNavigate: (page: PageId) => void
  unreadNewsCount?: number
}

const NAV_ITEMS: { id: PageId; icon: string; label: string; color: string }[] = [
  { id: 'trading', icon: '📊', label: '매매', color: '#5ec269' },
  { id: 'news', icon: '📰', label: '뉴스', color: '#5b9bd5' },
  { id: 'analysis', icon: '🔍', label: '분석', color: '#e88c3a' },
]

export function SidebarNav({ activePage, onNavigate, unreadNewsCount = 0 }: SidebarNavProps) {
  return (
    <nav className="sidebar-nav">
      {NAV_ITEMS.map(item => {
        const isActive = activePage === item.id
        return (
          <button
            key={item.id}
            className={`sidebar-nav-item ${isActive ? 'sidebar-nav-item--active' : ''}`}
            style={{
              '--nav-color': item.color,
            } as React.CSSProperties}
            onClick={() => onNavigate(item.id)}
            title={item.label}
          >
            <span className="sidebar-nav-icon">{item.icon}</span>
            <span className="sidebar-nav-label">{item.label}</span>
            {item.id === 'news' && unreadNewsCount > 0 && (
              <span className="sidebar-nav-badge">{unreadNewsCount}</span>
            )}
            {isActive && <span className="sidebar-nav-indicator" />}
          </button>
        )
      })}
    </nav>
  )
}
