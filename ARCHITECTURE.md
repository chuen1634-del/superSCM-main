# superSCM 아키텍처

> 기기·옵션 월간 발주계획 MVP의 현재 코드 구조와 파일별 책임을 정리한 문서입니다.
>
> 기준일: 2026-08-27  
> 기준 상태: Phase 1 업무 흐름 프로토타입 + Supabase 리드타임·소진위험 분석 화면

## 1. 한눈에 보는 요약

### 1.1 프로젝트 목적

한국후지필름BI가 해외 생산법인에서 조달하는 기기·옵션·부품·소모품의 월간 발주계획을 수요 확정부터 공급 준비, 마스터 검증, 발주량 계산, 보고자료 생성까지 하나의 흐름으로 확인하는 웹 프로토타입이다.

### 1.2 현재 구현 요약

| 영역 | 현재 역할 | 데이터 상태 |
|---|---|---|
| `/` | 6단계 업무 흐름을 보여주는 단일 클라이언트 화면 | 컴포넌트 내부 샘플 데이터 |
| `/analysis/leadtime` | 공급처별 마스터 리드타임과 실적 P80 격차 분석 | Supabase `analytics.v_leadtime_gap` 조회 |
| `/analysis/stockout` | 품목별 재고 소진 위험 분석 | Supabase `analytics.v_stockout_risk`, `v_stockout_kpi` 조회 |
| `/api/health/supabase` | Supabase 환경변수 설정 여부 확인 | 환경변수만 확인, DB 조회 없음 |
| `lib/scm-model.ts` | 분석 행 타입과 컬럼명 정규화 | 순수 함수 |
| `lib/scm.ts` | 분석용 Supabase 조회 함수 | 서버에서 조회 |
| `supabase/migrations/` | 수요확정 핵심 테이블 생성 | PostgreSQL 마이그레이션 |
| `sql/` | Supabase 권한 및 수업용 RLS 정책 | 수동 실행 SQL |

### 1.3 핵심 아키텍처 원칙

- Next.js App Router를 화면과 API 라우팅의 진입점으로 사용한다.
- 워크플로우 프로토타입은 `ProcurementApp`이 현재 단계를 상태로 관리하고 각 단계 컴포넌트를 전환한다.
- 분석 화면은 `페이지 → lib/scm.ts 조회 함수 → Supabase analytics 뷰` 흐름으로 데이터를 읽는다.
- 분석 화면에서 Supabase를 직접 호출하지 않고, `lib/scm.ts`에 조회를 모은다.
- DB 원본(`raw`)은 직접 조회·수정하지 않고, `core`의 정제·기준과 `analytics`의 화면용 뷰를 사용한다.
- 화면용 타입과 컬럼명 차이 처리는 `lib/scm-model.ts`의 정규화 함수가 담당한다.
- 스타일은 `app/globals.css`의 순수 CSS를 사용하며 Tailwind, CSS Modules, styled-components는 사용하지 않는다.
- 현재 워크플로우의 수치와 입력은 대부분 샘플값이며, 실제 저장·계산·파일 출력은 후속 단계 범위다.

## 2. 시스템 흐름

### 2.1 현재 실행 흐름

```text
브라우저
  |
  +--> / ----------------------> app/page.tsx
  |                                  |
  |                                  v
  |                            ProcurementApp
  |                                  |
  |             active StepId ------+------> DashboardStep
  |                                  +------> DemandStep
  |                                  +------> SupplyStep
  |                                  +------> MasterStep
  |                                  +------> CalculationStep
  |                                  +------> ReportStep
  |
  +--> /analysis/leadtime ------> app/analysis/leadtime/page.tsx
                                     |
                                     v
                                lib/scm.ts
                                     |
                                     v
                         Supabase analytics.v_leadtime_gap
                                     |
                                     v
                            scm-model 정규화
                                     |
                                     v
                         AnalysisFrame + DataTable
```

### 2.2 데이터 계층

```text
raw  (CSV 원본, 직접 조회하지 않음)
  |
  v
core (공급처 매핑, 리드타임·사용량 기준, 정제 뷰)
  |
  v
analytics (화면·AI 조회용 뷰)
  |
  v
lib/scm.ts (조회 함수)
  |
  v
Next.js 서버 페이지 / 분석 컴포넌트
```

`core`와 `analytics`는 Supabase PostgreSQL의 별도 스키마다. 클라이언트 조회 시 `.schema('analytics')`처럼 스키마를 명시해야 하며, Supabase Dashboard의 Exposed schemas 설정과 API 롤 권한이 함께 필요하다.

## 3. 폴더·파일 구조 요약

### 3.1 요약 목록

| 경로 | 기능 | 내부 파일의 역할 |
|---|---|---|
| `app/` | Next.js App Router 라우트와 전역 스타일 | 루트 레이아웃, 홈 화면, 분석 화면, 헬스 API, CSS |
| `app/analysis/leadtime/` | 리드타임 분석 라우트 | Supabase 결과를 KPI와 표로 렌더링 |
| `app/analysis/stockout/` | 소진위험 분석 라우트 | 소진위험 KPI와 품목별 위험 표 렌더링 |
| `app/api/health/supabase/` | Supabase 설정 상태 API | 환경변수 유무를 JSON으로 응답 |
| `components/` | 화면 조합과 재사용 UI | 전체 앱 셸, 분석 프레임·표, 6개 업무 단계 |
| `components/analysis/` | 분석 화면 공통 UI | 분석 레이아웃·탭·범용 데이터 표 |
| `components/workflow/` | 월간 발주 업무 단계 UI | 현황, 수요, 공급, 마스터, 계산, 보고 화면 |
| `lib/` | 도메인 모델·데이터 접근·Supabase 연결 | 타입/정규화, 조회, 클라이언트 생성 |
| `lib/supabase/` | Supabase 연결 구현 | 환경변수, 브라우저 클라이언트, 서버 클라이언트 |
| `supabase/` | Supabase CLI 설정과 DB 변경 이력 | CLI 설정과 마이그레이션 |
| `sql/` | 운영·수업 환경용 권한 SQL | 읽기 권한, 쓰기 정책, RLS |
| `docs/` | 실습·설계 문서 | 실습 안내, 계획, 요구사항 사본 |
| `outputs/` | 생성된 문서·미리보기 산출물 | Excel, 검사 로그, PNG 미리보기 |
| 루트 설정 파일 | 실행·빌드·배포·프로젝트 규칙 | `package.json`, `next.config.ts`, `vercel.json`, `tsconfig.json` 등 |
| 루트 데이터/스크립트 | 샘플 데이터·워크북 생성 보조 | `.mjs` 스크립트와 `dump.sql` |

### 3.2 의존 방향

```text
app/page.tsx
  -> components/procurement-app.tsx
     -> components/workflow/*.tsx
     -> app/globals.css

app/analysis/leadtime/page.tsx
  -> components/analysis/*.tsx
  -> lib/scm.ts
     -> lib/supabase.ts
        -> lib/supabase/server.ts
        -> lib/supabase/env.ts
     -> lib/scm-model.ts

app/analysis/stockout/page.tsx
  -> components/analysis/*.tsx
  -> lib/scm.ts
     -> lib/supabase/server.ts
     -> lib/scm-model.ts

app/api/health/supabase/route.ts
  -> lib/supabase/env.ts
```

원칙적으로 `components/workflow`는 도메인 저장소나 Supabase를 직접 호출하지 않는다. 새 분석 화면은 `lib/scm-model.ts → lib/scm.ts → app/analysis/<이름>/page.tsx` 순서로 추가한다.

## 4. `app/` 상세

### `app/layout.tsx`

- 모든 라우트의 루트 레이아웃이다.
- `app/globals.css`를 전역으로 불러온다.
- 브라우저 언어를 `ko`로 설정한다.
- 문서 제목과 설명 메타데이터를 정의한다.
- 실제 업무 화면은 직접 그리지 않고 `children`을 출력한다.

### `app/page.tsx`

- `/` 홈 라우트다.
- `ProcurementApp`을 렌더링하는 얇은 라우트 어댑터다.
- 업무 단계 상태와 화면 조합은 `components/procurement-app.tsx`에 위임한다.

### `app/globals.css`

- 프로젝트 전체의 색상 토큰, 글꼴, 레이아웃, 카드, 버튼, 배지, 표, 분석 화면 스타일을 정의한다.
- 주요 레이아웃 클래스는 `app-shell`, `sidebar`, `main`, `topbar`, `content`다.
- 업무 단계용 클래스는 진행 표시, `page-heading`, `card`, `metric`, `table-wrap` 등이다.
- 분석용 클래스는 `analysis-page`, `analysis-heading`, `analysis-table-wrap`, `analysis-table` 등이다.
- 외부 Google Fonts의 Noto Sans KR을 사용한다.
- 새 UI 스타일은 우선 이 파일의 기존 클래스를 재사용한다.

### `app/analysis/leadtime/page.tsx`

- `/analysis/leadtime` 서버 페이지다.
- `dynamic = 'force-dynamic'`으로 페이지 캐시를 끄고 최신 분석 결과를 조회한다.
- `getLeadtimeGap()`을 호출해 공급처별 데이터를 받는다.
- 조회 오류와 정상 응답을 구분해 오류 카드를 보여준다.
- 공급처 수, 실제 리드타임이 더 긴 공급처 수, 표본 부족 공급처 수를 화면에서 집계한다.
- `GapCell`에서 양수 격차를 위험 색상으로 표시한다.
- 컬럼 정의는 `DataTable`에 전달하고, 상세 표 표현은 공통 컴포넌트에 맡긴다.
- 화면에서 수행하는 계산은 표시용 집계·색상 판정이며, 리드타임 통계 자체는 DB 뷰가 제공한다.

### `app/analysis/stockout/page.tsx`

- `/analysis/stockout` 서버 페이지다.
- `getStockoutRisk()`와 `getStockoutKpi()`를 병렬 호출한다.
- 전체 품목, 위험 품목, 30일 이내 소진, 계산 불가 품목 KPI를 표시한다.
- 품목코드·품목명·공급처·가용수량·일평균 사용량·계획 리드타임·소진일수·소진예정일·상태를 표로 표시한다.
- `SAFE`, `CRITICAL`, `UNKNOWN` 상태를 한국어 배지로 변환한다.
- 사용량이나 리드타임이 없는 행은 `null`과 계산 불가 상태를 그대로 표시한다.
- SQL 뷰가 계산한 위험상태와 KPI를 사용하며 화면에서 소진일수나 위험판정을 재계산하지 않는다.

### `app/api/health/supabase/route.ts`

- `GET /api/health/supabase`를 제공하는 Route Handler다.
- `getSupabaseEnv()`로 URL과 publishable key가 모두 있는지만 확인한다.
- 설정이 없으면 HTTP 503과 `configured: false`를 반환한다.
- 설정이 있으면 HTTP 200과 `configured: true`를 반환한다.
- 실제 Supabase 연결, 권한, 뷰 존재 여부까지 검증하는 엔드포인트는 아니다.

## 5. `components/` 상세

### `components/procurement-app.tsx`

- 전체 프로토타입의 클라이언트 셸이다(`'use client'`).
- `StepId` 유니온과 6단계 목록을 정의한다.
- `active` 상태로 현재 단계를 관리한다.
- 사이드바와 상단 진행 표시에서 단계 이동을 제공한다.
- `useMemo` 안의 `switch`로 현재 단계에 맞는 화면 컴포넌트를 선택한다.
- `onNext`, `onBack`, `onOpenStep` 콜백을 단계 컴포넌트에 주입한다.
- 현재 단계 이전을 완료 단계처럼 표현하지만, 실제 저장 상태나 서버 상태를 관리하지는 않는다.
- `Icons` 객체는 여러 아이콘을 묶어 내보내지만 현재 단계 화면에서 공통으로 직접 사용하는 핵심 API는 아니다.

### `components/analysis/analysis-frame.tsx`

- 분석 라우트의 공통 외곽 레이아웃이다.
- 분석 라벨, 제목, 설명, `SUPABASE LIVE` 배지를 출력한다.
- 실제 데이터 조회나 분석 계산은 하지 않는다.

### `components/analysis/analysis-tabs.tsx`

- `/analysis/*` 화면 사이를 이동하는 클라이언트 탭 내비게이션이다.
- 현재 리드타임 격차와 재고 소진 위험 링크를 제공한다.
- `usePathname`으로 현재 경로를 활성 탭으로 표시한다.
- 새 분석 화면을 만들 때 `tabs` 목록에 경로와 라벨을 추가한다.

### `components/analysis/data-table.tsx`

- 제네릭 컬럼 정의를 받아 여러 분석 데이터 유형을 표시하는 범용 표다.
- `Column<T>`은 키, 라벨, 정렬, 사용자 정의 `render`를 표현한다.
- `formatNumber`는 `null`을 `—`로 표시하고 정수·소수 한 자리 형식과 접미사를 처리한다.
- 행이 비어 있으면 전달받은 `empty` 문구를 보여준다.
- `rowKey`가 있으면 사용자 키를 사용하고 없으면 행 인덱스를 사용한다.
- 현재는 클라이언트 상태 관리나 페이지네이션 없이 단순 목록 렌더링에 집중한다.

### `components/workflow/` 공통 특성

- 현재 업무 흐름을 설명하는 프레젠테이션 중심 컴포넌트 묶음이다.
- 대부분 `StepFrame`을 사용해 이전·다음 버튼과 프로토타입 안내를 공유한다.
- Supabase나 영속 저장소를 직접 호출하지 않는다.
- 카드, 표, 체크리스트, 입력 예시를 샘플값으로 구성한다.

#### `dashboard-step.tsx`

- 전체 현황 단계다.
- 총 발주금액, 수요 상태, 발주량 예외, 보고자료 상태를 요약 카드로 보여준다.
- 준비상태 체크리스트와 발주계획 목록을 제공한다.
- 카드 클릭과 키보드 Enter/Space로 다른 단계로 이동할 수 있다.

#### `demand-step.tsx`

- 수요 확정 단계다.
- OL, SFDC, Bulk-deal, Trend, 수급회의 탭을 제공한다.
- `useState`로 선택 월, 탭, OL 행, SFDC 행, Bulk 행, 회의 정보를 관리한다.
- OL·SFDC·Bulk 행의 추가, 수정, 상태 변경, 검색·필터 등 프로토타입 상호작용을 제공한다.
- 월별 샘플 OL은 `monthRows`와 `baseOl`에서 생성된다.
- 현재 입력은 서버 저장·마이그레이션 테이블과 연결되지 않는다.

#### `supply-step.tsx`

- 재고 및 Open PO 확인 단계다.
- 가용재고, 가용 Open PO, 납기 위험 PO를 요약한다.
- 재고 상태별 반영 규칙과 Open PO 입고 가능성 예시를 보여준다.
- Supplier, Lead Time, 운송·통관, 검수 입력 예정 영역을 안내한다.

#### `master-step.tsx`

- 품목·기종, BOM·Common품, 장착율·사용량, MOQ·발주단위, Lead Time, Flexibility Rule의 관리 대상을 설명한다.
- 업로드·검증 버튼과 마스터별 상태를 프로토타입으로 보여준다.
- 실제 CRUD, 파일 업로드, 검증 로직은 아직 연결되지 않았다.

#### `calculation-step.tsx`

- 발주량 계산 및 예외 검토 단계다.
- 기기·옵션/부품 발주량, 총액, 예외 건수의 샘플 KPI를 보여준다.
- 순소요량·최종발주량·예외 표와 Flex/MOQ/납기 검토 순서를 제공한다.
- 수동 조정 기능은 비활성 상태이며, 조정량·사유·조정자·일시를 저장할 후속 구조를 안내한다.

#### `report-step.tsx`

- 사장 보고자료 단계다.
- 당월 총액과 전월·전년·OL 대비 비교 KPI를 보여준다.
- 기기와 옵션·부품 금액 비교 및 보고서 미리보기 목업을 제공한다.
- Excel/PDF 다운로드 버튼은 Phase 2 예정 기능으로 비활성화되어 있다.

#### `step-frame.tsx`

- 업무 단계 화면의 공통 하단 내비게이션이다.
- `children`을 출력하고 이전·다음 콜백 버튼을 렌더링한다.
- 기본 다음 버튼 라벨은 `다음 단계`이며 단계별로 재정의할 수 있다.

## 6. `lib/` 상세

### `lib/scm-model.ts`

- 분석 도메인 타입과 외부 행 데이터 정규화를 담당한다.
- `LeadtimeGap`은 공급처, 국가, 마스터 리드타임, 표본 수, 실적 평균, P80, 격차를 화면 표준 형태로 표현한다.
- `StockoutRisk`와 `StockoutKpi`는 소진위험 목록·요약 화면의 표준 타입이다.
- `value`는 후보 컬럼명을 순서대로 검색해 첫 유효값을 반환한다.
- `numberValue`는 숫자 변환 실패나 비유한 값을 `null`로 처리한다.
- `normalizeLeadtimeGap`은 영어·한국어·별칭 컬럼명을 표준 필드로 바꾼다.
- `normalizeStockoutRisk`와 `normalizeStockoutKpi`는 analytics 뷰의 영어·한국어 별칭과 계산 불가 값을 정규화한다.
- 뷰 컬럼명이 바뀌어도 화면이 깨지지 않게 하는 경계 계층이다.

### `lib/scm.ts`

- 화면에서 사용할 SCM 조회 함수를 모은다.
- `getLeadtimeGap`은 서버 Supabase 클라이언트로 `analytics.v_leadtime_gap`을 조회하고 각 행을 정규화한다.
- `getStockoutRisk`는 `analytics.v_stockout_risk`의 품목별 행을 조회하고 `normalizeStockoutRisk`로 변환한다.
- `getStockoutKpi`는 `analytics.v_stockout_kpi`의 한 행을 `normalizeStockoutKpi`로 변환한다.
- 조회 실패 시 `{ rows/data: 빈 값, error: 메시지 }` 형태로 반환해 화면이 오류와 빈 결과를 구분할 수 있게 한다.
- 계산식이나 화면 마크업은 포함하지 않는다.

### `lib/supabase.ts`

- Supabase 관련 공개 진입점(barrel)이다.
- 브라우저 클라이언트, 서버 클라이언트, 환경변수 함수를 재-export한다.
- 호출부가 내부 파일 경로를 알 필요 없도록 연결 계층을 단순화한다.

### `lib/supabase/env.ts`

- `NEXT_PUBLIC_SUPABASE_URL`과 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`를 한 곳에서 읽는다.
- `getSupabaseEnv`는 미설정 시 `null`을 반환한다.
- `requireSupabaseEnv`는 미설정 시 한국어 안내가 포함된 오류를 던진다.
- secret key는 다루지 않으며 브라우저 코드에 노출하지 않는 프로젝트 규칙을 반영한다.

### `lib/supabase/client.ts`

- 클라이언트 컴포넌트용 Supabase JS 클라이언트를 만든다.
- publishable key를 사용한다.
- 현재 코드에서는 연결 기능을 준비해 두었고, 실제 워크플로우 입력 저장에는 아직 사용하지 않는다.

### `lib/supabase/server.ts`

- 서버 컴포넌트와 서버 조회 함수용 Supabase 클라이언트를 만든다.
- `persistSession`, `autoRefreshToken`을 끄고 읽기 중심의 서버 조회에 맞춘다.
- 현재 `lib/scm.ts`의 분석 조회가 이 클라이언트를 사용한다.

### `lib/scm-model.test.ts`

- Node 내장 테스트 러너와 `assert`로 `normalizeLeadtimeGap`을 검증한다.
- 한국어·영어 후보 컬럼명, 숫자 변환, 누락값 처리 같은 정규화 경계를 테스트한다.
- 실행 명령은 `npm test`다.

## 7. `supabase/`와 `sql/` 상세

### `supabase/config.toml`

- Supabase CLI의 로컬 프로젝트 설정 파일이다.
- 마이그레이션과 CLI 작업의 프로젝트 설정 기준이 된다.

### `supabase/.temp/cli-latest`

- Supabase CLI가 기록한 로컬 버전·실행 메타데이터 성격의 임시 파일이다.
- 애플리케이션 런타임이나 데이터 모델의 일부가 아니다.

### `supabase/migrations/20260813000100_create_procurement_demand_core.sql`

- 수요확정 기능의 PostgreSQL 테이블을 생성한다.
- `public.planning_runs`에 발주계획, 상태, 기준월도, 대상월도, 계산 버전을 저장한다.
- `public.ol_demand`에 부서별 OL 수요를 저장한다.
- `public.sfdc_pipeline`에 SFDC 파이프라인을 저장한다.
- `public.bulk_deals`에 Bulk-deal과 사전재고 확보·반영률을 저장한다.
- `public.historical_actuals`에 과거 실적을 저장한다.
- `public.demand_confirmations`에 수급회의 결과와 확정수요 요약을 저장한다.
- 외래키, 수량·확률·상태 체크 제약, 조회 인덱스를 만든다.
- `set_updated_at` 트리거 함수로 수정 시각을 자동 갱신한다.
- 이 마이그레이션의 테이블은 현재 `analytics` 분석 뷰와 별개이며, 워크플로우 프로토타입 화면과도 아직 연결되지 않았다.

### `sql/01-grants.sql`

- `anon`, `authenticated` 롤에 `core`, `analytics` 스키마 사용 권한과 조회 권한을 부여한다.
- 향후 생성되는 core/analytics 뷰에도 기본 조회 권한을 부여한다.
- `raw` 스키마는 의도적으로 열지 않는다.
- 리드타임 분석 화면이 `permission denied` 없이 analytics 뷰를 읽기 위해 실행한다.

### `sql/02-policies.sql`

- `core.leadtime_plan`, `core.usage_profile`에 수업용 쓰기 권한과 전체 허용 RLS 정책을 설정한다.
- 운영 환경에서는 현재 정책이 너무 넓으므로 `auth.uid()` 등으로 범위를 제한해야 한다.
- 화면 저장 기능을 활성화할 때만 적용하는 보조 SQL이다.

## 8. 데이터베이스 구조

### 8.1 분석용 Supabase 스키마

`SCHEMA.md` 기준으로 화면은 다음 계층을 사용한다.

| 스키마 | 책임 | 예시 |
|---|---|---|
| `raw` | CSV 원본 보관, 직접 수정하지 않음 | `shipment_log`, `usage_history`, `inventory` |
| `core` | 표기 정제, 기준값, 계산에 쓰는 유효 데이터 | `supplier_alias`, `leadtime_plan`, `usage_profile` |
| `analytics` | 화면과 AI가 조회하는 결과 뷰 | `v_leadtime_gap`, `v_stockout_risk`, `v_stockout_kpi` |

주요 분석 뷰는 `v_leadtime_gap`, `v_stockout_risk`, `v_stockout_kpi`, `v_usage_profile`, `v_usage_anomaly`이며, 실제 통계 계산과 위험 판정은 DB 뷰에서 수행한다.

### 8.2 수요확정 저장 테이블

마이그레이션은 현재 `public` 스키마에 수요확정용 테이블을 만든다. 즉, 저장 모델과 분석 모델이 현재 완전히 하나로 통합된 상태는 아니다.

```text
planning_runs
  ├── ol_demand
  ├── sfdc_pipeline
  ├── bulk_deals
  ├── historical_actuals
  └── demand_confirmations
```

향후 구현에서는 이 저장 모델을 업무 서비스와 연결하고, 저장된 확정수요·재고·Open PO·마스터를 계산 결과 및 analytics 뷰와 연결해야 한다.

## 9. 루트 설정·문서·스크립트

### 실행·빌드 설정

- `package.json`: 프로젝트 메타데이터, 의존성, `dev`, `build`, `start`, `test` 스크립트 정의.
- `package-lock.json`: npm 의존성의 재현 가능한 버전 잠금 파일.
- `next.config.ts`: Next.js 설정. 현재 React Strict Mode를 활성화한다.
- `tsconfig.json`: TypeScript 컴파일 설정과 `@/*` 경로 별칭을 정의한다.
- `vercel.json`: Vercel이 Next.js 프로젝트로 인식하도록 설정한다.
- `.gitignore`: 로컬 환경파일, 빌드 산출물, 의존성 등 버전 관리 제외 대상을 정의한다.
- `.env.example`: 환경변수 예시 파일.
- `.env.local.example`: 로컬에서 복사해 사용할 Supabase 환경변수 예시.

### 프로젝트 규칙·설계 문서

- `AGENTS.md`: 구현 시 지켜야 할 데이터 계층, CSS, 검증, 한국어 작성, 빌드 규칙의 기준 문서.
- `SCHEMA.md`: raw/core/analytics 스키마 책임, 뷰 컬럼, 접속 방법, 예상 건수의 기준 문서.
- `README.md`: 설치·실행 방법, 현재 Phase 1 상태, Supabase 연결 개요와 후속 구현 목록.
- `README_배포전_확인.md`: 배포 전 확인 절차 문서.
- `2026-08-13-procurement-planning-mvp-prd.md`: 월간 발주계획 MVP의 제품 요구사항, 업무 흐름, 계산 규칙, 완료 기준.
- `적용방법.md`: 준비 커밋을 다른 저장소에 적용하고 Supabase를 수업 전에 준비하는 안내서.

### 샘플 데이터·생성 스크립트

- `build_dummy_demand_data.mjs`: 수요확정 실습용 더미 데이터 생성 스크립트.
- `build_workbook.mjs`: 프로세스 정의서 Excel과 관련 미리보기 산출물을 만드는 스크립트.
- `dump.sql`: Supabase 원본·정제·분석 객체를 포함한 대규모 DB 덤프. 복원·검증용이며 애플리케이션 코드가 직접 읽는 파일은 아니다.

### `docs/`

- `docs/04-실습안내.md`: 4회차 실습 진행 안내.
- `docs/superpowers/04-실습안내.md`: Superpowers 작업 문맥에서 사용하는 실습 안내 사본.
- `docs/superpowers/plans/2026-08-13-procurement-planning-mvp-plan.md`: MVP 구현 계획 문서.
- `docs/superpowers/specs/2026-08-13-procurement-planning-mvp-prd.md`: PRD 사본. 루트 PRD와 요구사항 기준이 겹치므로 변경 시 동기화 여부를 확인해야 한다.

### `outputs/`

- 생성된 프로세스 정의서 Excel, 검사 NDJSON, PNG 미리보기 파일을 보관한다.
- 애플리케이션 런타임의 소스나 필수 모듈이 아니라 문서화·검토용 산출물이다.
- 파일명에 생성 실행 ID가 포함되어 있어 실행별 산출물을 분리한다.
- `기기_옵션_월간발주_프로세스정의서.xlsx`는 원본 문서 산출물이다.
- `.inspect.ndjson`는 산출물 검사 결과 로그다.
- `preview_00_사용안내.png`부터 `preview_11_FXLIVE연계정의.png`까지는 Excel 시트별 시각 미리보기다.

루트의 `~$차 강의안_수정.docx`는 Microsoft Office가 문서를 열 때 만드는 임시 잠금 파일로, 애플리케이션 코드나 배포 산출물이 아니다.

## 10. 현재 상태와 주의할 점

### 구현된 것

- 6단계 업무 흐름을 브라우저에서 이동할 수 있다.
- 수요 단계의 일부 샘플 상호작용을 확인할 수 있다.
- 리드타임 분석 라우트가 Supabase analytics 뷰를 조회하도록 연결되어 있다.
- 컬럼명 정규화와 오류 반환 패턴이 마련되어 있다.
- 수요확정 핵심 저장 테이블의 첫 마이그레이션이 있다.

### 아직 샘플 또는 미연결인 것

- `/`의 KPI, 표, 상태는 대부분 하드코딩된 샘플이다.
- 워크플로우 단계의 입력 저장·재조회가 없다.
- 실제 발주량 계산 서비스가 없다.
- 수동 조정 이력, Excel/CSV 업로드 저장, Excel/PDF 다운로드가 없다.
- 인증·권한·다중 사용자 기능이 없다.
- `getStockoutKpi`와 `getStockoutRisk`는 `/analysis/stockout`에서 사용한다.
- 현재 마이그레이션의 수요확정 테이블과 `analytics` 분석 뷰의 연결 계약이 문서 수준에서만 존재한다.

### 구현 시 지켜야 할 경계

- 화면 컴포넌트에서 Supabase를 직접 호출하지 않는다.
- `raw`를 화면에서 직접 조회하지 않는다.
- 통계·평균·분위수·위험 판정은 SQL/모델 계층에 두고 화면은 결과를 표시한다.
- 데이터가 없을 때와 조회 오류를 같은 문구로 처리하지 않는다.
- 계산 불가 값은 임의의 숫자로 대체하지 않고 `null`과 사유 코드를 유지한다.
- 새 분석 화면은 `lib/scm-model.ts → lib/scm.ts → app/analysis/<이름>/page.tsx` 순서를 따른다.
- 변경 후 `npm run build`와 필요한 경우 `npm test`를 실행한다.

## 11. 향후 권장 목표 구조

PRD의 목표인 실제 발주계획 시스템으로 확장할 때는 다음 흐름으로 발전시키는 것이 자연스럽다.

```text
App Router 화면
  -> Server Actions / API Routes
  -> 업무 서비스
     ├── 수요확정 서비스
     ├── 재고·Open PO 서비스
     ├── 마스터 검증 서비스
     ├── 발주량 계산 서비스
     └── 보고서 생성 서비스
  -> Repository / Supabase 조회·저장 계층
  -> PostgreSQL core·analytics
  -> Storage (업로드·보고서 파일)
```

계산 서비스에는 확정수요, 재고·Open PO 차감, BOM·장착율, Common품 합산, 평균 사용량, MOQ, Flexibility Rule, 수동 조정 이력을 분리해 두어야 한다. 화면은 계산 결과와 예외를 소비하고, 규칙 자체를 중복 구현하지 않아야 한다.
