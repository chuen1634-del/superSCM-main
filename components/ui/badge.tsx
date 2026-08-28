import type { ReactNode } from 'react';
import { statusTone, type Status } from '@/lib/ui-model';

export default function Badge({ status, children }: { status?: Status; children: ReactNode }) {
  const tone = status ? statusTone(status) : 'gray';
  return <span className={`scm-badge scm-badge--${tone}`}>{children}</span>;
}
