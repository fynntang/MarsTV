import type { ComponentType, ReactNode } from 'react';

export interface LinkProps {
  href: string;
  replace?: boolean;
  scroll?: boolean;
  className?: string;
  title?: string;
  children: ReactNode;
}

export type LinkComponent = ComponentType<LinkProps>;

export const DefaultLink: LinkComponent = ({ href, children, className, title }: LinkProps) => (
  <a href={href} className={className} title={title}>
    {children}
  </a>
);
