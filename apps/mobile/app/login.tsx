import { colors, fontSize, radius } from '@marstv/config';
import { Container, Spacer, TextView } from '@marstv/ui-native';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from 'react-native';

export default function LoginScreen() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!password.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        router.replace('/');
        return;
      }
      if (res.status === 401) {
        setError('Invalid password');
      } else if (res.status === 503) {
        setError('Site password not configured');
      } else {
        setError('Login failed, please try again');
      }
    } catch {
      setError('Network error, please try again');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.center}
      >
        <TextView variant="heading">MarsTV</TextView>
        <Spacer size={8} />
        <TextView variant="caption" color={colors.textMuted}>
          Enter site password to continue
        </TextView>
        <Spacer size={32} />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={colors.textMuted}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          onSubmitEditing={handleLogin}
          returnKeyType="go"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Spacer size={12} />
        {error && (
          <>
            <TextView variant="caption" color={colors.danger}>
              {error}
            </TextView>
            <Spacer size={8} />
          </>
        )}
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.7}
        >
          <TextView variant="body" color="#FFFFFF">
            {loading ? 'Verifying...' : 'Sign In'}
          </TextView>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Container>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  input: {
    width: '100%',
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
    width: '100%',
    height: 48,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
