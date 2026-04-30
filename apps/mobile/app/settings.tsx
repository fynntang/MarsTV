import { colors, fontSize, radius } from '@marstv/config';
import { Container, Spacer, TextView } from '@marstv/ui-native';
import { getApiBase, setApiBase } from '@marstv/ui-shared';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

export default function SettingsScreen() {
  const [apiUrl, setApiUrl] = useState(getApiBase());
  const [saved, setSaved] = useState(false);

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
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
});
