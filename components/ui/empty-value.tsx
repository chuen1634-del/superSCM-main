import { formatEmptyValue } from '@/lib/ui-model';

export default function EmptyValue({ value, reasonCode }: { value: unknown; reasonCode?: string | null }) {
  return <span className="scm-empty-value">{formatEmptyValue(value, reasonCode)}</span>;
}
