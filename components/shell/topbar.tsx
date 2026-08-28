import type { ReactNode } from 'react';
import { logoutAction } from '@/app/(auth)/logout/actions';

export default function Topbar({ title, children }: { title: string; children?: ReactNode }) {
  return <header className="scm-topbar"><div><div className="eyebrow">MONTHLY PROCUREMENT CONTROL</div><h1>{title}</h1></div><div className="top-meta">{children ?? <span className="local-badge">SUPABASE LIVE</span>}<form action={logoutAction}><button className="button" type="submit">로그아웃</button></form></div></header>;
}
