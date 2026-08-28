import type { ReactNode } from 'react';
import Sidebar from '@/components/shell/sidebar';
import Topbar from '@/components/shell/topbar';
import { userMenu } from '@/lib/menu';

export default function UserLayout({ children }: { children: ReactNode }) {
  return <div className="scm-shell"><Sidebar menu={userMenu} /><main className="scm-main"><Topbar title="월간 발주계획" /><div className="scm-content">{children}</div></main></div>;
}
