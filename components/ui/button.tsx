import type { ButtonHTMLAttributes, ReactNode } from 'react';

export default function Button({ children, variant = 'default', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode; variant?: 'default' | 'primary' }) {
  return <button {...props} className={`scm-button ${variant === 'primary' ? 'scm-button--primary' : ''} ${props.className ?? ''}`}>{children}</button>;
}
