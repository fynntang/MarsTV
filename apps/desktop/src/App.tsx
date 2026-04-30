import { useState } from 'react';
import { Titlebar } from './components/Titlebar';
import { HomePage } from './pages/HomePage';
import { SettingsPage } from './pages/SettingsPage';

type Page = 'home' | 'search' | 'player' | 'settings';

export function App() {
  const [page, setPage] = useState<Page>('home');

  return (
    <div className="app" style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Titlebar onNavigate={(p) => setPage(p as Page)} currentPage={page} />
      <main style={{ flex: 1, overflow: 'auto' }}>
        {page === 'home' && <HomePage onNavigate={(p) => setPage(p as Page)} />}
        {page === 'settings' && <SettingsPage />}
      </main>
    </div>
  );
}
