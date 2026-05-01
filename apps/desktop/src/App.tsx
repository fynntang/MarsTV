import { useState } from 'react';
import { Titlebar } from './components/Titlebar';
import { HomePage } from './pages/HomePage';
import { PlayerPage } from './pages/PlayerPage';
import { SearchPage } from './pages/SearchPage';
import { SettingsPage } from './pages/SettingsPage';

type Page = 'home' | 'search' | 'player' | 'settings';

interface PageState {
  page: Page;
  params?: Record<string, string>;
}

export function App() {
  const [state, setState] = useState<PageState>({ page: 'home' });

  const handleNavigate = (page: string, params?: Record<string, string>) => {
    setState({ page: page as Page, params });
  };

  return (
    <div className="app" style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Titlebar onNavigate={(p) => setState({ page: p as Page })} currentPage={state.page} />
      <main style={{ flex: 1, overflow: 'auto' }}>
        {state.page === 'home' && <HomePage onNavigate={handleNavigate} />}
        {state.page === 'search' && <SearchPage onNavigate={handleNavigate} />}
        {state.page === 'player' && state.params && (
          <PlayerPage
            source={state.params.source ?? ''}
            id={state.params.id ?? ''}
            onNavigate={handleNavigate}
          />
        )}
        {state.page === 'player' && !state.params && (
          <div style={{ padding: 24, textAlign: 'center', color: '#888' }}>
            No video selected. Go back to search.
          </div>
        )}
        {state.page === 'settings' && <SettingsPage />}
      </main>
    </div>
  );
}
