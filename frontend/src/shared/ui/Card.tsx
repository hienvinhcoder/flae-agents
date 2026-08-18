import type { HTMLAttributes, ReactNode } from 'react';

type CardElement = 'article' | 'div' | 'section';
type CardPadding = 'none' | 'sm' | 'md';
type CardVariant = 'default' | 'inverse' | 'muted';

export interface CardProps extends HTMLAttributes<HTMLElement> {
  as?: CardElement;
  children: ReactNode;
  padding?: CardPadding;
  variant?: CardVariant;
}

const paddingClasses: Record<CardPadding, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-5 sm:p-6',
};

const variantClasses: Record<CardVariant, string> = {
  default: 'border-border bg-card text-card-foreground',
  inverse: 'border-sidebar-border bg-sidebar text-sidebar-foreground',
  muted: 'border-border bg-muted text-foreground',
};

export function Card({
  as: Element = 'div',
  children,
  className = '',
  padding = 'md',
  variant = 'default',
  ...props
}: CardProps) {
  return (
    <Element
      {...props}
      className={`rounded-ui-panel border ${variantClasses[variant]} ${paddingClasses[padding]} ${className}`}
    >
      {children}
    </Element>
  );
}
