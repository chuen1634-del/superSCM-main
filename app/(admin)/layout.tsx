import type { ReactNode } from 'react';
import Sidebar from '@/components/shell/sidebar';
import Topbar from '@/components/shell/topbar';
import { adminMenu } from '@/lib/menu';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <div className="scm-shell"><Sidebar menu={adminMenu} title="SCM 관리자" subtitle="Administration" /><main className="scm-main"><Topbar title="관리자" /><div className="scm-content">{children}</div></main></div>;
}
