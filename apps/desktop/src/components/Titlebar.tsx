const NAV_ITEMS = [
  { key: 'home', label: 'Home' },
  { key: 'search', label: 'Search' },
  { key: 'settings', label: 'Settings' },
] as const;

interface TitlebarProps {
  onNavigate: (page: string) => void;
  currentPage: string;
}

export function Titlebar({ onNavigate, currentPage }: TitlebarProps) {
  return (
    <header
      data-tauri-drag-region
      style={{
        display: 'flex',
        alignItems: 'center',
        height: 40,
        padding: '0 8px',
        background: '#0D0D1A',
        borderBottom: '1px solid #1A1A2E',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      <span style={{ fontWeight: 700, color: '#FF6B35', marginRight: 24, paddingLeft: 8 }}>
        MarsTV
      </span>
      <nav style={{ display: 'flex', gap: 4 }}>
        {NAV_ITEMS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => onNavigate(item.key)}
            style={{
              padding: '4px 12px',
              borderRadius: 4,
              border: 'none',
              cursor: 'pointer',
              fontSize: 13,
              background: currentPage === item.key ? '#FF6B3520' : 'transparent',
              color: currentPage === item.key ? '#FF6B35' : '#888',
            }}
          >
            {item.label}
          </button>
        ))}
      </nav>
      <div style={{ flex: 1 }} data-tauri-drag-region />
    </header>
  );
}
