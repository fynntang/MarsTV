import type { CmsSource } from '@marstv/core';
import { addSource, getApiBase, getSources, removeSource, setApiBase } from '@marstv/ui-shared';
import { useEffect, useState } from 'react';

export function SettingsPage() {
  const [apiUrl, setApiUrl] = useState(getApiBase());
  const [saved, setSaved] = useState(false);
  const [sources, setSources] = useState<CmsSource[]>([]);
  const [newKey, setNewKey] = useState('');
  const [newName, setNewName] = useState('');
  const [newApi, setNewApi] = useState('');

  useEffect(() => {
    getSources().then(setSources);
  }, []);

  const handleSaveApi = () => {
    setApiBase(apiUrl);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleAddSource = async () => {
    const key = newKey.trim();
    const name = newName.trim();
    const api = newApi.trim();
    if (!key || !name || !api) return;
    await addSource({ key, name, api });
    setSources(await getSources());
    setNewKey('');
    setNewName('');
    setNewApi('');
  };

  const handleRemoveSource = async (key: string) => {
    await removeSource(key);
    setSources(await getSources());
  };

  const inputStyle: React.CSSProperties = {
    height: 40,
    padding: '0 12px',
    borderRadius: 6,
    border: '1px solid #2A2A3E',
    background: '#1A1A2E',
    color: '#FFF',
    fontSize: 14,
  };

  const btnStyle: React.CSSProperties = {
    height: 36,
    padding: '0 16px',
    borderRadius: 6,
    border: 'none',
    color: '#FFF',
    fontWeight: 600,
    cursor: 'pointer',
    background: '#FF6B35',
  };

  return (
    <div style={{ padding: 24, maxWidth: 640, margin: '0 auto' }}>
      <h2 style={{ color: '#FF6B35', marginBottom: 24 }}>Settings</h2>

      {/* API Server */}
      <section style={{ marginBottom: 32 }}>
        <h3 style={{ color: '#CCC', fontSize: 14, marginBottom: 8 }}>API Server</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="url"
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
            placeholder="http://localhost:3000"
            style={{ ...inputStyle, flex: 1 }}
          />
          <button
            type="button"
            onClick={handleSaveApi}
            style={{ ...btnStyle, height: 40, background: saved ? '#22C55E' : '#FF6B35' }}
          >
            {saved ? 'Saved' : 'Save'}
          </button>
        </div>
      </section>

      {/* CMS Sources */}
      <section style={{ marginBottom: 32 }}>
        <h3 style={{ color: '#CCC', fontSize: 14, marginBottom: 8 }}>CMS Sources</h3>
        <p style={{ color: '#888', fontSize: 12, marginBottom: 12 }}>
          Add CMS sources by key, name, and API URL. Sources are persisted to the app data
          directory.
        </p>

        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input
            type="text"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            placeholder="Key (e.g. heimuer)"
            style={{ ...inputStyle, flex: 1 }}
          />
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Name"
            style={{ ...inputStyle, flex: 1 }}
          />
          <input
            type="url"
            value={newApi}
            onChange={(e) => setNewApi(e.target.value)}
            placeholder="API URL"
            style={{ ...inputStyle, flex: 2 }}
          />
          <button type="button" onClick={handleAddSource} style={btnStyle}>
            Add
          </button>
        </div>

        {sources.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {sources.map((s) => (
              <div
                key={s.key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderRadius: 6,
                  background: '#1A1A2E',
                  border: '1px solid #2A2A3E',
                }}
              >
                <div>
                  <span style={{ color: '#FFF', fontWeight: 600 }}>{s.name}</span>
                  <span style={{ color: '#888', fontSize: 12, marginLeft: 8 }}>{s.api}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveSource(s.key)}
                  style={{ ...btnStyle, background: '#DC2626', height: 28, fontSize: 12 }}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        {sources.length === 0 && (
          <p style={{ color: '#666', fontSize: 13 }}>No sources configured. Add one above.</p>
        )}
      </section>

      {/* About */}
      <section>
        <h3 style={{ color: '#CCC', fontSize: 14, marginBottom: 8 }}>About</h3>
        <div style={{ color: '#888', fontSize: 13, lineHeight: 1.6 }}>
          MarsTV Desktop v0.1.0
          <br />
          Cross-platform video aggregation
          <br />
          MIT License · Open Source
        </div>
      </section>
    </div>
  );
}
