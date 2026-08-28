import type { ReactNode } from 'react';

export default function PageHeader({ title, description, eyebrow = 'ANALYSIS', actions }: { title: string; description: string; eyebrow?: string; actions?: ReactNode }) {
  return <div className="scm-page-header"><div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2><p>{description}</p></div>{actions ? <div className="scm-button-group button-row">{actions}</div> : null}</div>;
}
