import type { ReactNode } from 'react';

export default function Topbar({ title, children }: { title: string; children?: ReactNode }) {
  return <header className="scm-topbar"><div><div className="eyebrow">MONTHLY PROCUREMENT CONTROL</div><h1>{title}</h1></div><div className="top-meta">{children ?? <span className="local-badge">SUPABASE LIVE</span>}</div></header>;
}
