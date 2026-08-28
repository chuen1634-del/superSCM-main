'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { IMPORT_SCHEMAS } from '@/lib/import/schema.ts';
import { canImportBatch } from '@/lib/import/ui-model.ts';
import type { ColumnMapping, ImportMode, ImportType, UploadBatch } from '@/lib/import/types.ts';
import {
  confirmReplaceAction,
  downloadErrorCsvAction,
  importBatchAction,
  rollbackBatchAction,
  stageUploadAction,
  validateBatchAction,
  type ImportActionResult,
} from './actions';

const typeLabels: Record<ImportType, string> = {
  usage_history: '사용 이력',
  inventory: '재고',
  item_master: '품목 마스터',
  supplier_master: '공급처 마스터',
  purchase_order: '발주',
  goods_receipt: '입고',
  sales_order: '판매 주문',
  business_event: '비즈니스 이벤트',
};

const modeLabels: Record<ImportMode, string> = {
  append: 'Append · 추가',
  upsert: 'Upsert · 갱신/추가',
  replace: 'Replace · 전체 교체',
};

export default function ImportWizard({ initialHistory }: { initialHistory: UploadBatch[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [file, setFile] = useState<File | null>(null);
  const [importType, setImportType] = useState<ImportType>('usage_history');
  const [importMode, setImportMode] = useState<ImportMode>('append');
  const [stage, setStage] = useState<ImportActionResult | null>(null);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [validation, setValidation] = useState<ImportActionResult['validation']>();
  const [replaceConfirmed, setReplaceConfirmed] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [history, setHistory] = useState(initialHistory);

  function submitStage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) return setMessage('CSV 또는 Excel 파일을 선택하세요.');
    const formData = new FormData();
    formData.set('file', file);
    formData.set('import_type', importType);
    formData.set('import_mode', importMode);
    startTransition(async () => {
      const result = await stageUploadAction(formData);
      setStage(result);
      setMappings(result.mappings ?? []);
      setValidation(undefined);
      setMessage(result.error ?? result.success ?? null);
    });
  }

  function submitValidation() {
    if (!stage?.batchId) return;
    startTransition(async () => {
      const result = await validateBatchAction(stage.batchId as string, importType, JSON.stringify(mappings));
      setValidation(result.validation);
      setMessage(result.error ?? '검증 결과를 확인하세요.');
    });
  }

  function submitImport() {
    if (!stage?.batchId || !validation) return;
    startTransition(async () => {
      if (importMode === 'replace' && !replaceConfirmed) {
        setMessage('Replace는 확인 체크 후 실행할 수 있습니다.');
        return;
      }
      if (importMode === 'replace') await confirmReplaceAction(stage.batchId as string);
      const result = await importBatchAction(stage.batchId as string);
      setMessage(result.error ?? result.success ?? null);
      if (!result.error) router.refresh();
    });
  }

  function downloadErrors() {
    if (!stage?.batchId) return;
    startTransition(async () => {
      const result = await downloadErrorCsvAction(stage.batchId as string);
      if (result.csv) {
        const url = URL.createObjectURL(new Blob([result.csv], { type: 'text/csv;charset=utf-8' }));
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `${stage.fileName ?? 'import'}-errors.csv`;
        anchor.click();
        URL.revokeObjectURL(url);
      }
      setMessage(result.error ?? null);
    });
  }

  function rollback(batchId: string) {
    if (!window.confirm('이 batch로 적재된 데이터만 rollback합니다. 계속할까요?')) return;
    startTransition(async () => {
      const result = await rollbackBatchAction(batchId);
      setMessage(result.error ?? result.success ?? null);
      if (!result.error) setHistory((current) => current.map((batch) => batch.batchId === batchId ? { ...batch, status: 'ROLLED_BACK' } : batch));
    });
  }

  const importAllowed = Boolean(stage?.batchId && validation && canImportBatch(
    validation.errorRows > 0 ? 'FAILED' : 'VALIDATED',
    validation.errorRows,
    replaceConfirmed,
    importMode,
  ));

  return (
    <div className="import-management">
      <section className="scm-panel">
        <div className="scm-panel__title"><h3>File Upload</h3><span>staging → validation → RAW</span></div>
        <form className="form-stack" onSubmit={submitStage}>
          <label>파일 선택<input className="form-input" type="file" accept=".csv,.xlsx,.xls" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></label>
          <div className="grid grid-2">
            <label>데이터 종류<select className="form-input" value={importType} onChange={(event) => setImportType(event.target.value as ImportType)}>{Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label>Import Mode<select className="form-input" value={importMode} onChange={(event) => setImportMode(event.target.value as ImportMode)}>{Object.entries(modeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          </div>
          <div className="button-row"><button className="scm-button scm-button--primary" type="submit" disabled={isPending || !file}>Parse & Preview</button></div>
        </form>
        {message && <p className="callout blue">{message}</p>}
      </section>

      {stage?.batchId && (
        <>
          <section className="scm-panel">
            <div className="scm-panel__title"><h3>Preview</h3><span>staging 기준 미리보기 · 최대 20행</span></div>
            <div className="table-wrap"><table><thead><tr>{(stage.headers ?? []).map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{(stage.previewRows ?? []).map((row, rowIndex) => <tr key={rowIndex}>{(stage.headers ?? []).map((header) => <td key={header}>{row[header] === null || row[header] === undefined || row[header] === '' ? '—' : String(row[header])}</td>)}</tr>)}</tbody></table></div>
          </section>
          <section className="scm-panel">
            <div className="scm-panel__title"><h3>Column Mapping</h3><span>{stage.totalRows ?? 0}행 · 미리보기 20행</span></div>
            <div className="table-wrap"><table><thead><tr><th>원본 컬럼</th><th>시스템 컬럼</th><th>추정</th></tr></thead><tbody>{mappings.map((mapping, index) => <tr key={mapping.sourceHeader}><td>{mapping.sourceHeader}</td><td><select className="table-select" value={mapping.targetColumn ?? ''} onChange={(event) => setMappings((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, targetColumn: event.target.value || null } : item))}><option value="">매핑 안 함</option>{Object.keys(IMPORT_SCHEMAS[importType].aliases).map((target) => <option key={target} value={target}>{target}</option>)}</select></td><td>{mapping.confidence === 1 ? <span className="tag green">자동 추정</span> : <span className="tag gray">확인 필요</span>}</td></tr>)}</tbody></table></div>
            <div className="button-row"><button className="scm-button scm-button--primary" type="button" onClick={submitValidation} disabled={isPending}>Validation 실행</button></div>
          </section>

          {validation && <section className="scm-panel">
            <div className="scm-panel__title"><h3>Validation Result</h3><span className={`tag ${validation.errorRows > 0 ? 'red' : validation.warningRows > 0 ? 'amber' : 'green'}`}>{validation.status}</span></div>
            <div className="grid grid-4"><div className="card"><span className="metric-label">전체 행</span><div className="metric-value">{validation.totalRows}</div></div><div className="card"><span className="metric-label">성공</span><div className="metric-value">{validation.successRows}</div></div><div className="card"><span className="metric-label">경고</span><div className="metric-value">{validation.warningRows}</div></div><div className="card"><span className="metric-label">오류</span><div className="metric-value">{validation.errorRows}</div></div></div>
            {validation.issues.length > 0 && <div className="table-wrap section"><table><thead><tr><th>행</th><th>필드</th><th>코드</th><th>메시지</th><th>심각도</th></tr></thead><tbody>{validation.issues.slice(0, 100).map((issue, index) => <tr key={`${issue.rowNumber}-${issue.errorCode}-${index}`}><td>{issue.rowNumber}</td><td>{issue.fieldName}</td><td>{issue.errorCode}</td><td>{issue.errorMessage}</td><td><span className={`tag ${issue.severity === 'ERROR' ? 'red' : 'amber'}`}>{issue.severity}</span></td></tr>)}</tbody></table></div>}
            <div className="button-row section"><button className="scm-button" type="button" onClick={downloadErrors} disabled={isPending || validation.issues.length === 0}>오류·경고 CSV 다운로드</button>{importMode === 'replace' && <label className="user-active"><input type="checkbox" checked={replaceConfirmed} onChange={(event) => setReplaceConfirmed(event.target.checked)} /> Replace 전체 교체를 확인합니다.</label>}<button className="scm-button scm-button--primary" type="button" onClick={submitImport} disabled={isPending || !importAllowed}>사용자 확인 후 Import</button></div>
          </section>}
        </>
      )}

      <section className="scm-panel section"><div className="scm-panel__title"><h3>Import History</h3><span>최근 100건</span></div><div className="table-wrap"><table><thead><tr><th>파일명</th><th>타입</th><th>모드</th><th>행</th><th>성공</th><th>경고</th><th>오류</th><th>사용자</th><th>시간</th><th>상태</th><th>작업</th></tr></thead><tbody>{history.length === 0 ? <tr><td colSpan={11}>Import 이력이 없습니다.</td></tr> : history.map((batch) => <tr key={batch.batchId}><td>{batch.fileName}</td><td>{typeLabels[batch.importType]}</td><td>{modeLabels[batch.importMode]}</td><td>{batch.totalRows}</td><td>{batch.successRows}</td><td>{batch.warningRows}</td><td>{batch.errorRows}</td><td>{batch.uploadedBy}</td><td>{new Date(batch.uploadedAt).toLocaleString('ko-KR')}</td><td><span className="tag gray">{batch.status}</span></td><td>{batch.status === 'IMPORTED' && <button className="scm-button" type="button" onClick={() => rollback(batch.batchId)} disabled={isPending}>Rollback</button>}</td></tr>)}</tbody></table></div></section>
    </div>
  );
}
