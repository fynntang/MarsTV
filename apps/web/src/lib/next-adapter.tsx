'use client';

import type { LinkProps } from '@marstv/ui-web';
import NextLink from 'next/link';
import type { ComponentType } from 'react';

export const NextLinkComponent: ComponentType<LinkProps> = ({
  href,
  replace,
  scroll,
  className,
  title,
  children,
}) => (
  <NextLink href={href} replace={replace} scroll={scroll} className={className} title={title}>
    {children}
  </NextLink>
);
