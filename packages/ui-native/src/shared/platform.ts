import { Platform } from 'react-native';

export type DeviceVariant = 'mobile' | 'tablet' | 'tv';

export function isTV(): boolean {
  return (Platform.OS as string) === 'tvos';
}

export function getDeviceVariant(): DeviceVariant {
  if (isTV()) return 'tv';
  const { width } = require('react-native').Dimensions.get('window');
  return width >= 768 ? 'tablet' : 'mobile';
}
