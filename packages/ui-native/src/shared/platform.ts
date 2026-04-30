import { Platform } from 'react-native';

export type DeviceVariant = 'mobile' | 'tablet' | 'tv';

export function getDeviceVariant(): DeviceVariant {
  if ((Platform.OS as string) === 'tvos') return 'tv';
  const { width } = require('react-native').Dimensions.get('window');
  return width >= 768 ? 'tablet' : 'mobile';
}
