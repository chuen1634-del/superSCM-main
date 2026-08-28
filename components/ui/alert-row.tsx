import type { ReactNode } from 'react';

export default function AlertRow({ title, children, critical = false }: { title: string; children: ReactNode; critical?: boolean }) {
  return <div className={`scm-alert-row ${critical ? 'scm-alert-row--critical' : ''}`} role="status"><div><div className="scm-alert-row__title">{title}</div><div className="scm-alert-row__message">{children}</div></div></div>;
}
