import type { ReactNode } from 'react';

export default function InsightBanner({ title, children }: { title: string; children: ReactNode }) {
  return <aside className="scm-insight-banner"><div className="scm-insight-banner__title">{title}</div><div>{children}</div></aside>;
}
