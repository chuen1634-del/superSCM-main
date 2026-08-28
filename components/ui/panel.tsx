import type { ReactNode } from 'react';

export default function Panel({ title, meta, children, className = '' }: { title?: string; meta?: ReactNode; children: ReactNode; className?: string }) {
  return <section className={`card scm-panel ${className}`}>
    {title ? <div className="scm-panel__title"><h3>{title}</h3>{meta ? <span>{meta}</span> : null}</div> : null}
    {children}
  </section>;
}
