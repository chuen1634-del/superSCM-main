# STEP 4 데이터 적재 파이프라인 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** CSV/XLSX를 staging에서 검증하고 ADMIN 승인 후 raw에 batch 단위로 적재·조회·rollback할 수 있는 Import Pipeline을 구축한다.

**Architecture:** 브라우저는 파일과 확인 상태만 전달하고, 서버가 parse/normalize/validate를 수행한다. staging과 오류를 먼저 저장한 뒤 승인 RPC가 raw를 쓰며, upload_batch가 모든 단계의 상태와 건수를 추적한다. raw 쓰기와 rollback은 DB 함수에서 ADMIN과 batch를 재검증한다.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Supabase PostgreSQL/RLS, `papaparse`, `xlsx`, 순수 CSS.

**Spec:** `docs/superpowers/specs/2026-08-28-step4-data-import-design.md`

## Global Constraints

- Supabase 원본 데이터는 `raw` 스키마에서 직접 수정하지 않습니다.
- 화면은 원칙적으로 `analytics` 만 조회합니다.
- 계산식은 화면 컴포넌트에 넣지 말고 순수 모델 함수에 둡니다.
- Tailwind, styled-components, CSS Modules를 추가하지 않습니다.
- `service_role`/`sb_secret_` 키를 브라우저에 노출하지 않습니다.
- null을 0으로 바꾸거나 잘못된 값을 추정·보정하지 않습니다.
- `AGENTS.md`는 사용자 변경사항이므로 커밋하지 않습니다.

---

### Task 1: Import 타입과 DB 계약 고정

**Files:**
- Create: `supabase/migrations/20260828000300_create_import_pipeline.sql`
- Create: `supabase/tests/import-pipeline.sql`
- Create: `lib/import/types.ts`
- Create: `lib/import/schema.ts`
- Test: `lib/import/types.test.ts`

**Interfaces:**
- Produces `ImportType`, `ImportMode`, `BatchStatus`, `StagingRow`, `ValidationIssue`, `ColumnMapping`, `IMPORT_SCHEMAS`.
- DB produces `core.upload_batch`, `core.import_staging`, `core.validation_error`, `core.column_mapping`, `core.import_backup`.

- [ ] **Step 1: Write failing type/schema tests**

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { IMPORT_SCHEMAS, isSupportedImportType } from './schema';

test('실제 raw 입력 타입만 지원한다', () => {
  assert.equal(isSupportedImportType('usage_history'), true);
  assert.equal(isSupportedImportType('forecast'), false);
});

test('각 타입은 필수 표준 컬럼을 가진다', () => {
  assert.ok(IMPORT_SCHEMAS.usage_history.required.includes('item_id'));
  assert.ok(IMPORT_SCHEMAS.usage_history.required.includes('use_date'));
  assert.ok(IMPORT_SCHEMAS.usage_history.required.includes('qty'));
});
```

- [ ] **Step 2: Run `npm test` and confirm the new test fails because the import modules do not exist.**
- [ ] **Step 3: Implement the shared types and per-table schema definitions.** Define required, optional, date, numeric, natural key, and alias headers for all eight supported types. Keep raw column names aligned with `SCHEMA.md` and the existing dump.
- [ ] **Step 4: Add the migration.** Create idempotent tables with UUID `batch_id` references, JSONB row payloads, severity checks, unique `(batch_id,row_number,field_name,error_code)`, and backup payloads. Add RLS, authenticated SELECT grants, ADMIN mutation policies, and server RPC execute grants without granting raw table writes.
- [ ] **Step 5: Run the focused test and inspect the migration for literal ellipsis placeholders, `public.*`, and secret keys.**

Expected: the focused test passes and `supabase/tests/import-pipeline.sql` contains checks for all five tables, RLS, and anon denial.

### Task 2: Server-side parsing and validation

**Files:**
- Modify: `package.json`, `package-lock.json`
- Create: `lib/import/parse.ts`
- Create: `lib/import/validate.ts`
- Create: `lib/import/validate.test.ts`

**Interfaces:**
- `parseFile(file: File, type: ImportType): Promise<ParsedImport>`
- `validateRows(type: ImportType, rows: ParsedRow[], context: ValidationContext): Promise<ValidationSummary>`
- `ValidationContext` supplies master IDs and intra-batch keys; no React or Supabase client dependency.

- [ ] **Step 1: Add failing tests for malformed dates, missing required values, bad item IDs, duplicates, and valid rows.**
- [ ] **Step 2: Run `npm test` and confirm each new validation test fails for the expected missing behavior.**
- [ ] **Step 3: Add pinned `papaparse` and `xlsx` dependencies.** Parse CSV and XLSX on the server only; cap file size and reject unsupported extensions before parsing.
- [ ] **Step 4: Implement validation as a pure, reusable module.** Preserve original values, emit `ERROR`/`WARNING`/`SUCCESS`, use explicit codes such as `REQUIRED_VALUE_MISSING`, `INVALID_DATE`, `INVALID_NUMBER`, `UNKNOWN_ITEM`, `UNKNOWN_SUPPLIER`, `DUPLICATE_SOURCE_RECORD`, `NEGATIVE_VALUE`, and `INVALID_DATE_ORDER`.
- [ ] **Step 5: Run focused and full tests.**

Expected: bad dates/items/required values are `ERROR`; duplicates and warnings are retained; no value is silently changed or dropped.

### Task 3: Staging, mapping, preview, and error CSV server actions

**Files:**
- Create: `lib/import/repository.ts`
- Create: `lib/import/history.ts`
- Create: `app/(admin)/admin/data-management/actions.ts`
- Create: `app/(admin)/admin/data-management/error-csv.ts`
- Create: `lib/import/repository.test.ts`

**Interfaces:**
- `createUploadBatch(input): Promise<UploadBatch>`
- `stageParsedRows(batchId, rows): Promise<void>`
- `saveValidationResult(batchId, summary): Promise<void>`
- `approveImport(batchId): Promise<ImportResult>`
- `rollbackBatch(batchId): Promise<void>`
- `buildErrorCsv(batchId): Promise<string>`

- [ ] **Step 1: Write failing repository tests asserting raw is not written during staging and import is rejected before `VALIDATED`.**
- [ ] **Step 2: Run tests and confirm they fail because repository functions are absent.**
- [ ] **Step 3: Implement server actions with `requireAdmin()` as the first authorization call.** Create a batch before parsing persistence, save original and normalized JSONB rows, load saved column mappings, and update counts/status transactionally through SQL RPCs.
- [ ] **Step 4: Implement `buildErrorCsv` with original columns plus `row_number,error_code,error_message,severity`.** Escape commas, quotes, and line breaks according to CSV rules.
- [ ] **Step 5: Run focused and full tests.**

Expected: staging and validation never write raw; import cannot run with errors or before validation; error CSV contains only ERROR/WARNING rows.

### Task 4: DB import/rollback RPC and stale marker

**Files:**
- Modify: `supabase/migrations/20260828000300_create_import_pipeline.sql`
- Create: `supabase/tests/import-rpc.sql`

**Interfaces:**
- `core.import_approved_batch(target_batch_id uuid) returns jsonb`
- `core.rollback_batch(target_batch_id uuid) returns jsonb`

- [ ] **Step 1: Add SQL tests for append, upsert backup, replace confirmation requirement, batch-scoped rollback, and non-admin rejection.**
- [ ] **Step 2: Run the SQL test after applying the migration and confirm it fails before RPC definitions exist.**
- [ ] **Step 3: Implement RPCs with fixed target-table branches for the eight supported import types.** Use explicit column lists, `batch_id`, `source_type = 'FILE_UPLOAD'`, `loaded_at = now()`, and `source_record_id`; never interpolate an arbitrary table or column name from user input.
- [ ] **Step 4: Implement append, upsert, and replace separately.** Store overwritten rows in `core.import_backup`; reject replace unless the batch has explicit confirmation and backup support. Set `forecast_stale` for demand imports and preserve `data_snapshot_at`.
- [ ] **Step 5: Implement rollback by batch ID only.** Restore backups for upsert/replace and delete rows inserted by the target batch; update batch status to `ROLLED_BACK`.
- [ ] **Step 6: Run SQL tests and inspect policies/grants.**

Expected: anon has no execute/write path, USER cannot execute import/rollback, ADMIN can import only validated batches, and rollback cannot affect another batch.

### Task 5: Admin Data Management UI

**Files:**
- Create: `app/(admin)/admin/data-management/page.tsx`
- Create: `app/(admin)/admin/data-management/import-wizard.tsx`
- Create: `app/(admin)/admin/data-management/import-history.tsx`
- Modify: `lib/menu.ts`
- Modify: `components/shell/sidebar.tsx` only if a new icon is required
- Test: `lib/import/ui-model.test.ts`

**Interfaces:**
- Wizard state: `SELECT_FILE | SELECT_TYPE | PREVIEW | MAPPING | VALIDATING | RESULT | CONFIRM | IMPORTED`.
- Server action responses expose status and reason codes, not raw secrets or database credentials.

- [ ] **Step 1: Write UI-model tests for disabled import before validation, error-state blocking, replace confirmation, and type menu values.**
- [ ] **Step 2: Run focused tests and confirm the expected failures.**
- [ ] **Step 3: Implement the wizard with server action calls.** Keep file parsing, mapping, validation, and mode behavior out of React components; display preview counts and explicit errors.
- [ ] **Step 4: Add Import History and Validation Errors sections.** Show file, type, mode, counts, user, time, status, stale marker, rollback action, and error CSV download.
- [ ] **Step 5: Add `Data Management` under the existing ADMIN menu only.** Do not expose upload actions to USER or anon.
- [ ] **Step 6: Run focused tests and `npm run build`.**

Expected: an ADMIN can progress through the wizard, cannot import before validation/confirmation, and can see history/errors; USER has no route access.

### Task 6: End-to-end verification and documentation

**Files:**
- Modify: `README.md` or `적용방법.md`
- Modify: `error.md` only if a new error occurs

- [ ] **Step 1: Run `npm test` and confirm all tests pass.**
- [ ] **Step 2: Run `npm run build` and confirm all routes compile.**
- [ ] **Step 3: Apply the migration in Supabase SQL Editor and run `supabase/tests/import-pipeline.sql` and `supabase/tests/import-rpc.sql`.** Record actual SQL results; do not claim DB verification from local tests.
- [ ] **Step 4: Manually test one CSV and one XLSX through preview → mapping → validation → approval → history → rollback.** Check row counts and batch metadata in raw.
- [ ] **Step 5: Run `git diff --check`, inspect `git status`, and report the exact remaining operational constraints.**

Expected: CSV/XLSX, validation blocking, error CSV, raw metadata, history, rollback, and stale marker are all verified with evidence.
