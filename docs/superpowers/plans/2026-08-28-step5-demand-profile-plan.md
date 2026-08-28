# STEP 5 SKU Demand Profile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 학습 구간만 사용해 SKU별 수요 패턴을 SQL에서 계산하고, 분석 화면과 STEP 6 모델 선택에 제공한다.

**Architecture:** `core.v_train_demand`를 월별 grid로 집계하는 `analytics.v_sku_demand_profile`과 KPI view를 추가한다. 서버 조회 함수는 analytics만 읽고, 화면은 공통 Badge/EmptyValue/DataTable을 재사용한다.

**Tech Stack:** PostgreSQL/Supabase SQL views, Next.js 15 App Router, React 19, TypeScript, 순수 CSS, Node test runner.

**Spec:** 사용자 제공 STEP 5 SKU Demand Profile 요구사항

## Global Constraints

- Demand Profile은 `core.v_train_demand`만 사용한다.
- `raw.usage_history`, `core.v_test_actual` 및 검증기간 데이터는 계산에 사용하지 않는다.
- ADI/CV²/Trend/Seasonality 계산은 SQL에서 수행한다.
- 계산 불가 값은 null과 명확한 `reason_code`로 반환한다.
- 화면 컴포넌트에는 계산식과 hex 색상을 작성하지 않는다.
- 기존 raw 계산 SQL과 STEP 3 객체는 삭제하거나 재작성하지 않는다.

### Task 1: 실패 테스트와 모델 계약

**Files:**
- Create: `lib/demand-profile-model.test.ts`
- Create: `lib/demand-profile-model.ts`

- [ ] Demand Type 코드와 계산 불가 표시 계약을 테스트로 정의한다.
- [ ] SQL view 행을 화면 모델로 정규화하는 최소 함수를 구현한다.
- [ ] 테스트를 실행해 RED를 확인한 뒤 GREEN으로 만든다.

### Task 2: 학습기간 월별 Grid와 analytics views

**Files:**
- Create: `supabase/migrations/20260828000400_create_demand_profile.sql`
- Create: `supabase/tests/demand-profile.sql`

- [ ] `core.v_train_demand`만 참조하는 item × month grid를 만든다.
- [ ] ADI, CV, CV², zero-demand rate, trend, recent change, peak period를 SQL로 계산한다.
- [ ] Syntetos-Boylan-Croston 기준으로 Demand Type을 분류한다.
- [ ] 24개월 미만 seasonality는 null/`INSUFFICIENT_PERIODS`로 반환한다.
- [ ] `analytics.v_sku_demand_profile`과 `analytics.v_demand_profile_kpi`를 추가한다.
- [ ] authenticated SELECT 권한을 추가하고 anon 접근은 허용하지 않는다.
- [ ] test 기간 데이터가 view에 들어오지 않는 정적 검증 SQL을 추가한다.

### Task 3: 조회 함수와 화면

**Files:**
- Modify: `lib/scm-model.ts`
- Modify: `lib/scm.ts`
- Create: `app/(user)/analysis/demand-profile/page.tsx`
- Modify: `lib/menu.ts`

- [ ] analytics view 조회와 오류/빈 결과 구분을 추가한다.
- [ ] Demand Type, 계산 가능 여부, SKU 검색 필터를 저장 결과에 적용한다.
- [ ] 공통 Badge와 EmptyValue를 사용해 계산 불가 값을 표현한다.
- [ ] USER 메뉴에 `/analysis/demand-profile`을 추가한다.

### Task 4: 검증

- [ ] 수요 패턴 4종, 무수요, 기간 부족, seasonality 부족 케이스를 테스트한다.
- [ ] train view만 참조하는지 `rg`와 SQL 검토로 확인한다.
- [ ] `npm test`를 실행한다.
- [ ] `npm run build`를 실행한다.
- [ ] migration 적용 절차와 검증 쿼리를 `적용방법.md`에 기록한다.
