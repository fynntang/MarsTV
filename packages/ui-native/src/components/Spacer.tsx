import { View } from 'react-native';

export function Spacer({ size = 16 }: { size?: number }) {
  return <View style={{ height: size, width: size }} />;
}
