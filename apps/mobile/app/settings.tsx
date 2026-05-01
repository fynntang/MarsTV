import { colors, fontSize, radius } from '@marstv/config';
import { Container, Spacer, TextView } from '@marstv/ui-native';
import { getApiBase, setApiBase, getSources, addSource, removeSource } from '@marstv/ui-shared';
import type { CmsSource } from '@marstv/core';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

export default function SettingsScreen() {
  const [apiUrl, setApiUrl] = useState(getApiBase());
  const [saved, setSaved] = useState(false);
  const [sources, setSourcesState] = useState<CmsSource[]>([]);
  const [newKey, setNewKey] = useState('');
  const [newName, setNewName] = useState('');
  const [newApi, setNewApi] = useState('');
  const [showSources, setShowSources] = useState(false);

  const handleSave = () => {
    const trimmed = apiUrl.trim();
    if (!trimmed) {
      Alert.alert('Error', 'API URL cannot be empty');
      return;
    }
    setApiBase(trimmed);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  useEffect(() => {
    getSources().then(setSourcesState);
  }, []);

  const handleAddSource = async () => {
    const key = newKey.trim();
    const name = newName.trim();
    const api = newApi.trim();
    if (!key || !name || !api) {
      Alert.alert('Error', 'All fields are required');
      return;
    }
    await addSource({ key, name, api });
    setSourcesState(await getSources());
    setNewKey('');
    setNewName('');
    setNewApi('');
  };

  const handleRemoveSource = async (key: string) => {
    await removeSource(key);
    setSourcesState(await getSources());
  };

  return (
    <Container>
      <ScrollView contentContainerStyle={styles.content}>
        <TextView variant="heading">Settings</TextView>
        <Spacer size={24} />

        {/* API Server Section */}
        <TextView variant="body" style={styles.sectionTitle}>
          API Server
        </TextView>
        <Spacer size={8} />
        <TextView variant="caption" color={colors.textMuted}>
          Enter your MarsTV server URL. All API requests will be sent to this address.
        </TextView>
        <Spacer size={12} />
        <TextInput
          style={styles.input}
          value={apiUrl}
          onChangeText={setApiUrl}
          placeholder="https://your-server.com"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />
        <Spacer size={12} />
        <TouchableOpacity
          style={[styles.button, saved && styles.buttonSaved]}
          onPress={handleSave}
          activeOpacity={0.7}
        >
          <TextView variant="body" color="#FFFFFF">
            {saved ? '✓ Saved' : 'Save'}
          </TextView>
        </TouchableOpacity>

        {/* CMS Sources */}
        <Spacer size={24} />
        <TextView variant="body" style={styles.sectionTitle}>CMS Sources</TextView>
        <Spacer size={8} />
        <TextView variant="caption" color={colors.textMuted}>
          Add CMS sources by key, name, and API URL. Sources are stored locally.
        </TextView>
        <Spacer size={12} />

        <TouchableOpacity
          style={styles.toggleButton}
          onPress={() => setShowSources(!showSources)}
          activeOpacity={0.7}
        >
          <TextView variant="body" color={colors.primary}>
            {showSources ? 'Hide Sources' : `Manage Sources (${sources.length} configured)`}
          </TextView>
        </TouchableOpacity>

        {showSources && (
          <>
            <Spacer size={12} />
            <TextInput
              style={styles.input}
              value={newKey}
              onChangeText={setNewKey}
              placeholder="Key (e.g. heimuer)"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
            />
            <Spacer size={8} />
            <TextInput
              style={styles.input}
              value={newName}
              onChangeText={setNewName}
              placeholder="Name"
              placeholderTextColor={colors.textMuted}
            />
            <Spacer size={8} />
            <TextInput
              style={styles.input}
              value={newApi}
              onChangeText={setNewApi}
              placeholder="API URL"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              keyboardType="url"
            />
            <Spacer size={12} />
            <TouchableOpacity style={styles.button} onPress={handleAddSource} activeOpacity={0.7}>
              <TextView variant="body" color="#FFFFFF">Add Source</TextView>
            </TouchableOpacity>

            <Spacer size={16} />
            {sources.length > 0 ? (
              sources.map((s) => (
                <View key={s.key} style={styles.sourceCard}>
                  <View style={{ flex: 1 }}>
                    <TextView variant="body">{s.name}</TextView>
                    <TextView variant="caption" color={colors.textMuted} numberOfLines={1}>
                      {s.api}
                    </TextView>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleRemoveSource(s.key)}
                    style={styles.removeButton}
                    activeOpacity={0.7}
                  >
                    <TextView variant="caption" color="#FFFFFF">Remove</TextView>
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <TextView variant="caption" color={colors.textMuted} style={{ textAlign: 'center' }}>
                No sources configured. Add one above.
              </TextView>
            )}
          </>
        )}

        <Spacer size={32} />

        {/* About Section */}
        <TextView variant="body" style={styles.sectionTitle}>
          About
        </TextView>
        <Spacer size={8} />
        <View style={styles.aboutRow}>
          <TextView variant="caption" color={colors.textMuted}>
            App
          </TextView>
          <TextView variant="body">MarsTV</TextView>
        </View>
        <Spacer size={4} />
        <View style={styles.aboutRow}>
          <TextView variant="caption" color={colors.textMuted}>
            Version
          </TextView>
          <TextView variant="body">0.0.0</TextView>
        </View>
        <Spacer size={4} />
        <View style={styles.aboutRow}>
          <TextView variant="caption" color={colors.textMuted}>
            Platform
          </TextView>
          <TextView variant="body">Expo 52 · React Native 0.76</TextView>
        </View>

        <Spacer size={32} />
        <TextView variant="caption" color={colors.textMuted} style={{ textAlign: 'center' }}>
          MarsTV is open source under MIT License.{'\n'}
          No video content is bundled — deployers must configure their own CMS sources.
        </TextView>
      </ScrollView>
    </Container>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16 },
  sectionTitle: { fontWeight: '600' },
  input: {
    height: 48,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    fontSize: fontSize.base,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  button: {
    height: 48,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSaved: {
    backgroundColor: '#22C55E',
  },
  toggleButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
  },
  sourceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.sm,
    padding: 12,
    marginBottom: 8,
  },
  removeButton: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.sm,
    marginLeft: 8,
  },
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
});
