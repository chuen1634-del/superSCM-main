import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function ForecastRunCompatibilityPage() {
  redirect('/admin/forecast-runs');
}
