/**
 * 사이드바 네비게이션 — 픽셀 아이콘
 */

export type PageId = 'trading' | 'news' | 'analysis' | 'market'

interface SidebarNavProps {
  activePage: PageId
  onNavigate: (page: PageId) => void
  unreadNewsCount?: number
  guideActive?: boolean
  onToggleGuide?: () => void
}

const NAV_ITEMS: { id: PageId; iconSrc: string; label: string; color: string }[] = [
  { id: 'trading', iconSrc: '/icons/nav-trading.png', label: '매매', color: '#5ec269' },
  { id: 'news', iconSrc: '/icons/nav-news.png', label: '뉴스', color: '#5b9bd5' },
  { id: 'analysis', iconSrc: '/icons/nav-social.png', label: '사회', color: '#e88c3a' },
  { id: 'market', iconSrc: '/icons/nav-trading.png', label: '마켓', color: '#e599f7' },
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
            <img src={item.iconSrc} alt="" className="sidebar-nav-pixel-icon" />
            <span className="sidebar-nav-label">{item.label}</span>
            {item.id === 'news' && unreadNewsCount > 0 && (
              <span className="sidebar-nav-badge">{unreadNewsCount}</span>
            )}
            {isActive && <span className="sidebar-nav-indicator" />}
          </button>
        )
      })}

      <div style={{ marginTop: 'auto' }}>
        <button
          className={`sidebar-nav-item ${guideActive ? 'sidebar-nav-item--active' : ''}`}
          style={{ '--nav-color': '#f0b429' } as React.CSSProperties}
          onClick={onToggleGuide}
          title="가이드"
        >
          <img src="/icons/nav-guide.png" alt="" className="sidebar-nav-pixel-icon" />
          <span className="sidebar-nav-label">가이드</span>
          {guideActive && <span className="sidebar-nav-indicator" />}
        </button>
      </div>
    </nav>
  )
}
