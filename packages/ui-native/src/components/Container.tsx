import { View, type ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ContainerProps extends ViewProps {
  useSafeArea?: boolean;
}

export function Container({ useSafeArea = true, style, ...rest }: ContainerProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        {
          flex: 1,
          paddingTop: useSafeArea ? insets.top : 0,
          paddingBottom: useSafeArea ? insets.bottom : 0,
        },
        style,
      ]}
      {...rest}
    />
  );
}
