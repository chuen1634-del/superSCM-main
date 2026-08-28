import type { ReactNode } from 'react';

export default function KpiCard({ label, value, unit, foot, tone }: { label: string; value: ReactNode; unit?: string; foot?: ReactNode; tone?: 'good' | 'warn' | 'danger' }) {
  return <section className="card scm-panel scm-kpi"><div className="scm-kpi__label">{label}</div><div className={`scm-kpi__value ${tone ? `metric-foot ${tone}` : ''}`}>{value}{unit ? <small> {unit}</small> : null}</div>{foot ? <div className="scm-kpi__foot">{foot}</div> : null}</section>;
}
