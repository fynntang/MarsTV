import React from 'react';

export const View = React.forwardRef((props: Record<string, unknown>, ref: React.Ref<unknown>) =>
  React.createElement('View', { ...props, ref }),
);

export const Text = React.forwardRef((props: Record<string, unknown>, ref: React.Ref<unknown>) =>
  React.createElement('Text', { ...props, ref }),
);

export const Platform = {
  OS: 'ios' as string,
  select: (obj: Record<string, unknown>) => obj.ios ?? obj.default,
};

export const StyleSheet = {
  flatten: (style: unknown) => style ?? {},
  create: <T extends Record<string, unknown>>(styles: T): T => styles,
};

export type TextProps = Record<string, unknown>;
