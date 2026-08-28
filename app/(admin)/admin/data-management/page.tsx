import { requireAdmin } from '@/lib/auth';
import { getHistory } from '@/lib/import/repository.ts';
import ImportWizard from './import-wizard';

export const dynamic = 'force-dynamic';

export default async function DataManagementPage() {
  await requireAdmin();
  const history = await getHistory();
  return (
    <main className="content">
      <div className="page-heading"><div><div className="eyebrow">DATA MANAGEMENT</div><h2>데이터 적재 관리</h2><p>원본 파일을 검증하고 승인된 데이터만 RAW 계층에 적재합니다.</p></div></div>
      <ImportWizard initialHistory={history} />
    </main>
  );
}
