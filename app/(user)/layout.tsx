import type { ReactNode } from 'react';
import Sidebar from '@/components/shell/sidebar';
import Topbar from '@/components/shell/topbar';
import { getMenuForRole } from '@/lib/menu';
import { requireUser } from '@/lib/auth';

export default async function UserLayout({ children }: { children: ReactNode }) {
  const { profile } = await requireUser();
  return <div className="scm-shell"><Sidebar menu={getMenuForRole(profile.role)} /><main className="scm-main"><Topbar title="월간 발주계획" /><div className="scm-content">{children}</div></main></div>;
}
