import { Text, type TextProps, Platform } from 'react-native';
import { colors, fontSize } from '@marstv/config/tokens';

interface TextViewProps extends TextProps {
  variant?: 'body' | 'caption' | 'heading';
  color?: string;
}

export function TextView({ variant = 'body', color, style, ...rest }: TextViewProps) {
  const sizes: Record<NonNullable<TextViewProps['variant']>, number> = {
    body: fontSize.base,
    caption: fontSize.sm,
    heading: fontSize.xl,
  };

  return (
    <Text
      style={[
        {
          fontSize: sizes[variant] + ((Platform.OS as string) === 'tvos' ? 2 : 0),
          color: color ?? colors.text,
        },
        style,
      ]}
      {...rest}
    />
  );
}
