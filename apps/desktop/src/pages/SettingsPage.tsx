import { getApiBase, setApiBase } from '@marstv/ui-shared';
import { useState } from 'react';

export function SettingsPage() {
  const [apiUrl, setApiUrl] = useState(getApiBase());
  const [saved, setSaved] = useState(false);
  const [sources, setSources] = useState<Array<{ key: string; name: string; api: string }>>([]);
  const [sourceJson, setSourceJson] = useState('');

  const handleSaveApi = () => {
    setApiBase(apiUrl);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleImportSources = () => {
    try {
      const parsed = JSON.parse(sourceJson);
      if (Array.isArray(parsed)) {
        setSources(parsed);
        setSourceJson('');
      }
    } catch {
      alert('Invalid JSON');
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 640, margin: '0 auto' }}>
      <h2 style={{ color: '#FF6B35', marginBottom: 24 }}>Settings</h2>

      <section style={{ marginBottom: 32 }}>
        <h3 style={{ color: '#CCC', fontSize: 14, marginBottom: 8 }}>API Server</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="url"
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
            placeholder="http://localhost:3000"
            style={{
              flex: 1,
              height: 40,
              padding: '0 12px',
              borderRadius: 6,
              border: '1px solid #2A2A3E',
              background: '#1A1A2E',
              color: '#FFF',
              fontSize: 14,
            }}
          />
          <button
            type="button"
            onClick={handleSaveApi}
            style={{
              height: 40,
              padding: '0 16px',
              borderRadius: 6,
              border: 'none',
              background: saved ? '#22C55E' : '#FF6B35',
              color: '#FFF',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {saved ? 'Saved' : 'Save'}
          </button>
        </div>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h3 style={{ color: '#CCC', fontSize: 14, marginBottom: 8 }}>CMS Sources</h3>
        <p style={{ color: '#888', fontSize: 12, marginBottom: 8 }}>
          Paste a JSON array of CMS source configs. Each source needs: key, name, api.
        </p>
        <textarea
          value={sourceJson}
          onChange={(e) => setSourceJson(e.target.value)}
          placeholder='[{"key":"src1","name":"Source 1","api":"https://example.com/api"}]'
          rows={6}
          style={{
            width: '100%',
            padding: 12,
            borderRadius: 6,
            border: '1px solid #2A2A3E',
            background: '#1A1A2E',
            color: '#FFF',
            fontSize: 13,
            fontFamily: 'monospace',
            resize: 'vertical',
          }}
        />
        <button
          type="button"
          onClick={handleImportSources}
          style={{
            marginTop: 8,
            height: 36,
            padding: '0 16px',
            borderRadius: 6,
            border: 'none',
            background: '#FF6B35',
            color: '#FFF',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Import Sources ({sources.length} loaded)
        </button>
      </section>

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
