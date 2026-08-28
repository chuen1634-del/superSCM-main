import type { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) { return <main className="scm-content">{children}</main>; }
