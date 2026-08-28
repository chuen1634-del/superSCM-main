'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { MenuItem } from '@/lib/menu';

const iconByName: Record<string, string> = { dashboard: '▦', demand: '◒', supply: '▤', master: '◇', calculation: '⌁', report: '▧', timeline: '⌁', inventory: '▤', settings: '⚙', workflow: '↗', users: '♙', forecast: '⌁', upload: '⇧' };

export default function Sidebar({ menu, title = '월간 발주계획', subtitle = 'Procurement Planning' }: { menu: MenuItem[]; title?: string; subtitle?: string }) {
  const pathname = usePathname();
  return (
    <aside className="scm-sidebar">
      <div className="brand scm-sidebar__brand">
        <div className="brand-mark">OP</div>
        <div className="brand-copy"><strong>{title}</strong><span>{subtitle}</span></div>
      </div>
      <div className="scm-sidebar__nav-label">MENU</div>
      <nav className="scm-sidebar__nav" aria-label="주요 메뉴">
        {menu.map((item) => (
          <Link key={item.href} href={item.href} className="scm-nav-link" aria-current={pathname === item.href ? 'page' : undefined}>
            <span className="scm-nav-link__icon" aria-hidden="true">{iconByName[item.icon ?? ''] ?? '•'}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
      <div className="scm-sidebar__footer">데이터 기준과 상태를 확인한 뒤<br />다음 업무 단계로 진행하세요.</div>
    </aside>
  );
}
