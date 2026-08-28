# STEP 4 데이터 적재 파이프라인 설계

## 목표

CSV/XLSX를 서버에서 파싱·검증한 뒤 사용자의 승인을 거쳐 raw 계층에 저장하고, batch 단위 이력·오류·rollback을 제공한다.

## 범위와 지원 타입

현재 `raw` 스키마에 실제로 존재하는 입력 테이블을 기준으로 다음 타입만 지원한다.

- `usage_history`
- `inventory`
- `item_master`
- `supplier_master`
- `purchase_order`
- `goods_receipt`
- `sales_order`
- `business_event`

`forecast`, `shipment_log`, `item_substitute`는 이번 UI의 Import Type 목록에서 제외한다. 각각 월별 계산 결과, 복합 원본 구조, 관계형 보조 데이터라서 별도 요구사항 없이 일반 행 Import로 노출하지 않는다.

## 데이터 흐름

```text
파일 선택 → 서버 Parse → staging 저장 → 컬럼 매핑 → validation
→ preview/오류 CSV → ADMIN 승인 → raw 저장 → upload_batch 완료
→ history 조회 / batch rollback
```

승인 전에는 raw 테이블을 쓰지 않는다. staging 행은 `jsonb` 원본과 정규화 결과를 보존한다. 검증 오류는 `validation_error`에 행 단위로 저장한다.

## DB 경계

- `core.upload_batch`: 파일명, 타입, 모드, 건수, 상태, 사용자, 시각을 저장한다.
- `core.import_staging`: batch별 원본/정규화 행을 저장한다.
- `core.validation_error`: 원본 값과 오류 코드를 행·필드 단위로 저장한다.
- `core.column_mapping`: 타입별 소스 헤더와 표준 컬럼의 확인된 매핑을 재사용한다.
- `core.import_backup`: upsert/replace로 덮어쓴 raw 원본을 보관한다.

모든 테이블은 RLS를 적용하고, 조회는 authenticated, mutation은 ADMIN으로 제한한다. raw 쓰기는 `core.import_approved_batch(batch_id)` RPC가 수행하며 함수 안에서 `core.is_admin()`과 batch 상태를 재검증한다.

## Import 모드

- `append`: staging의 정상 행을 그대로 추가한다. `batch_id`로 완전 rollback 가능하다.
- `upsert`: 자연키 충돌 행을 갱신하고 나머지는 추가한다. 갱신 전 값을 backup에 저장해 rollback 시 복원한다.
- `replace`: 해당 import type의 기존 데이터 대체를 수행한다. ADMIN 확인을 추가하고, backup 없이는 실행하지 않는다. 완전 복원이 불가능한 대상은 실행 전에 제한 메시지를 표시한다.

## 검증

`lib/import/validate.ts`가 단일 진입점이다. 필수값, null, 숫자, 날짜, duplicate, master 존재 여부, 음수, 날짜 관계를 검사하고 `SUCCESS/WARNING/ERROR`로 분류한다. 값은 추정·보정·조용한 삭제를 하지 않는다.

## 보안

파일 업로드·preview·validation·승인·rollback 모두 서버에서 `requireAdmin()`을 호출한다. 브라우저에는 service role/secret key를 노출하지 않는다. raw는 client role에 직접 쓰기 권한을 부여하지 않는다.

## Forecast stale

수요 계열(`usage_history`, 필요 시 `sales_order`)의 승인 Import가 완료되면 기존 forecast 결과를 삭제하지 않고 stale 표시를 남긴다. 기존 forecast run 구조가 없으면 `core.upload_batch`의 `forecast_stale`와 `data_snapshot_at`으로 다음 Forecast 연결을 위한 상태를 보존한다.
