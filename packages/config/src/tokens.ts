// ============================================================================
// MarsTV Design Tokens
// 同一份 token 同时供 Tailwind theme extend 和 RN StyleSheet 使用。
// ============================================================================

export const colors = {
  /** 深空背景 */
  background: '#0B0D17',
  surface: '#141829',
  surfaceElevated: '#1D2236',
  /** 火星橙 —— 主强调色 */
  primary: '#FF6B35',
  primaryHover: '#FF8659',
  primaryMuted: '#3A1F16',
  /** 辅助色 */
  accent: '#4ECDC4',
  danger: '#E63946',
  warning: '#F4A261',
  success: '#2A9D8F',
  /** 文字 */
  text: '#F5F5F7',
  textMuted: '#9CA3AF',
  textDim: '#6B7280',
  /** 边框/分隔 */
  border: '#2A2F45',
  borderStrong: '#3D4263',
} as const;

export const radius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 24,
  full: 9999,
} as const;

export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
} as const;

export const fontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
} as const;

export const breakpoints = {
  /** phone upper bound (inclusive) */
  phone: 767,
  /** tablet upper bound (inclusive) */
  tablet: 1023,
  /** anything >= desktop counts as desktop; >= tv counts as TV */
  desktop: 1024,
  tv: 1440,
} as const;

/** 响应式设备档 */
export type DeviceBucket = 'phone' | 'tablet' | 'desktop' | 'tv';
