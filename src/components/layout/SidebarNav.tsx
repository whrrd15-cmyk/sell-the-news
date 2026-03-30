/**
 * 사이드바 네비게이션
 *
 * 3개 페이지 + 가이드 토글 버튼
 */

export type PageId = 'trading' | 'news' | 'analysis'

interface SidebarNavProps {
  activePage: PageId
  onNavigate: (page: PageId) => void
  unreadNewsCount?: number
  guideActive?: boolean
  onToggleGuide?: () => void
}

const NAV_ITEMS: { id: PageId; icon: string; label: string; color: string }[] = [
  { id: 'trading', icon: '📊', label: '매매', color: '#5ec269' },
  { id: 'news', icon: '📰', label: '뉴스', color: '#5b9bd5' },
  { id: 'analysis', icon: '💬', label: '사회', color: '#e88c3a' },
]

export function SidebarNav({ activePage, onNavigate, unreadNewsCount = 0, guideActive, onToggleGuide }: SidebarNavProps) {
  return (
    <nav className="sidebar-nav">
      {NAV_ITEMS.map(item => {
        const isActive = activePage === item.id
        return (
          <button
            key={item.id}
            className={`sidebar-nav-item ${isActive ? 'sidebar-nav-item--active' : ''}`}
            style={{ '--nav-color': item.color } as React.CSSProperties}
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

      {/* 가이드 토글 (하단에 분리) */}
      <div style={{ marginTop: 'auto' }}>
        <button
          className={`sidebar-nav-item ${guideActive ? 'sidebar-nav-item--active' : ''}`}
          style={{ '--nav-color': '#f0b429' } as React.CSSProperties}
          onClick={onToggleGuide}
          title="가이드"
        >
          <span className="sidebar-nav-icon">?</span>
          <span className="sidebar-nav-label">가이드</span>
          {guideActive && <span className="sidebar-nav-indicator" />}
        </button>
      </div>
    </nav>
  )
}
