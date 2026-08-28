# STEP 1 디자인 시스템 기반 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 공통 디자인 토큰·셸·UI 컴포넌트·메뉴·route group을 만들고 Lead Time/Stockout 화면에 적용한다.

**Architecture:** `app/globals.css`는 토큰과 전역 기본값만 담당하고 `styles/shell.css`, `styles/components.css`, `styles/chart.css`가 영역별 스타일을 담당한다. `app/(user)`와 `app/(admin)`은 공통 셸을 사용하며, 기존 workflow는 `app/(legacy)/workflow`로 이동한다. 분석 데이터 조회와 계산은 기존 `lib/scm.ts`, `lib/scm-model.ts`를 그대로 사용한다.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, 순수 CSS, lucide-react, Node test runner

**Spec:** `design.md`, `AGENTS.md`, `SCHEMA.md`

## Global Constraints

- Tailwind, styled-components, CSS Modules, 차트 라이브러리를 추가하지 않는다.
- 화면의 색상·간격·상태 색상은 CSS 토큰과 공통 컴포넌트로 관리한다.
- `SAFE`, `WARNING`, `CRITICAL`, `CALCULATION_UNAVAILABLE` 상태를 공통 타입과 배지로 표현한다.
- 계산 불가 값은 `— + reason_code` 형식으로 표시하며 임의의 숫자로 대체하지 않는다.
- `raw` 조회와 기존 DB 계산 로직을 변경하지 않는다.
- 사용자 문구와 주석은 한국어로 작성한다.

### Task 1: 공통 상태·메뉴 모델과 실패 테스트

**Files:**
- Create: `lib/ui-model.ts`
- Create: `lib/menu.ts`
- Create: `lib/ui-model.test.ts`

**Interfaces:**
- `Status = 'SAFE' | 'WARNING' | 'CRITICAL' | 'CALCULATION_UNAVAILABLE'`
- `MenuItem = { href: string; label: string; description?: string; icon?: string }`
- `userMenu`, `adminMenu`, `getMenuForRole(role)` exports

- [ ] **Step 1: Write the failing test**

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { formatEmptyValue } from './ui-model';
import { getMenuForRole } from './menu';

test('계산 불가 값은 reason code를 포함한다', () => {
  assert.equal(formatEmptyValue(null, 'NO_USAGE'), '— + NO_USAGE');
});

test('사용자와 관리자 메뉴를 분리한다', () => {
  assert.ok(getMenuForRole('USER').every((item) => item.href !== '/admin'));
  assert.ok(getMenuForRole('ADMIN').some((item) => item.href === '/admin'));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test lib/ui-model.test.ts`
Expected: FAIL because the new modules do not exist.

- [ ] **Step 3: Write minimal implementation**

`formatEmptyValue`는 `null`/`undefined`에서 `— + reason_code`를 반환하고, 값이 있으면 문자열로 반환한다. `lib/menu.ts`는 `/`, `/analysis/leadtime`, `/analysis/stockout`를 USER에, `/admin`을 ADMIN 전용으로 제공한다.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS.

### Task 2: CSS 토큰과 스타일 파일 분리

**Files:**
- Modify: `app/globals.css`
- Create: `styles/shell.css`
- Create: `styles/components.css`
- Create: `styles/chart.css`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Write the failing test**

셸 클래스와 토큰의 존재를 검증하는 `lib/ui-model.test.ts` 정적 검증을 추가한다.

```ts
test('상태 이름은 네 가지로 고정된다', () => {
  assert.deepEqual(['SAFE', 'WARNING', 'CRITICAL', 'CALCULATION_UNAVAILABLE'], STATUS_VALUES);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test lib/ui-model.test.ts`
Expected: FAIL because `STATUS_VALUES` is not exported.

- [ ] **Step 3: Write minimal implementation**

기존 토큰을 유지·확장하고, 레이아웃 규칙은 `shell.css`, 카드/표/입력/상태는 `components.css`, 차트용 규칙은 `chart.css`로 이동한다. `layout.tsx`에서 세 파일을 import한다. 기존 클래스명은 호환성을 위해 유지한다.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS.

### Task 3: Shell 및 UI 컴포넌트

**Files:**
- Create: `components/shell/sidebar.tsx`
- Create: `components/shell/topbar.tsx`
- Create: `components/shell/page-header.tsx`
- Create: `components/ui/kpi-card.tsx`
- Create: `components/ui/panel.tsx`
- Create: `components/ui/badge.tsx`
- Create: `components/ui/button.tsx`
- Create: `components/ui/data-table.tsx`
- Create: `components/ui/alert-row.tsx`
- Create: `components/ui/insight-banner.tsx`
- Create: `components/ui/empty-value.tsx`

- [ ] **Step 1: Write the failing test**

`EmptyValue`의 포맷 함수와 status tone 매핑을 `lib/ui-model.test.ts`에서 검증한다.

```ts
test('계산 불가 상태는 gray tone을 사용한다', () => {
  assert.equal(statusTone('CALCULATION_UNAVAILABLE'), 'gray');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL because `statusTone` is not implemented.

- [ ] **Step 3: Write minimal implementation**

모든 컴포넌트는 토큰 클래스만 사용한다. `EmptyValue`는 `value`, `reasonCode`를 받아 null일 때 `— + reason_code`를 렌더링한다. `DataTable`은 기존 `Column<T>` API를 수용하고 `render` 결과를 그대로 표시한다.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS.

### Task 4: Route group과 레거시 격리

**Files:**
- Create: `app/(auth)/layout.tsx`
- Create: `app/(auth)/login/page.tsx`
- Create: `app/(user)/layout.tsx`
- Create: `app/(user)/page.tsx`
- Create: `app/(user)/analysis/leadtime/page.tsx`
- Create: `app/(user)/analysis/stockout/page.tsx`
- Create: `app/(admin)/layout.tsx`
- Create: `app/(admin)/page.tsx`
- Create: `app/(legacy)/workflow/page.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: Write the failing test**

라우트 파일이 존재하고 핵심 메뉴 href가 실제 파일로 연결되는지 `lib/ui-model.test.ts`에서 파일 존재 검사로 추가한다.

```ts
test('주요 route group 페이지가 존재한다', () => {
  for (const file of ['app/(user)/page.tsx', 'app/(admin)/page.tsx', 'app/(auth)/login/page.tsx', 'app/(legacy)/workflow/page.tsx']) {
    assert.equal(existsSync(file), true, file);
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL because route group files do not exist.

- [ ] **Step 3: Write minimal implementation**

`(user)` 레이아웃은 새 Sidebar/Topbar 셸을 제공하고 `(admin)`은 ADMIN 메뉴를 전달한다. 기존 `ProcurementApp`은 `/legacy/workflow`에서만 렌더링한다. `/`는 `(user)` 진입 화면과 동일한 사용자 대시보드로 연결한다.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS.

### Task 5: 분석 화면을 공통 UI로 전환

**Files:**
- Modify: `app/(user)/analysis/leadtime/page.tsx`
- Modify: `app/(user)/analysis/stockout/page.tsx`
- Modify: `components/analysis/analysis-frame.tsx`
- Modify: `components/analysis/data-table.tsx`
- Modify: `app/analysis/layout.tsx`
- Remove or replace: `app/analysis/leadtime/page.tsx`, `app/analysis/stockout/page.tsx`

- [ ] **Step 1: Write the failing test**

기존 분석 모델 테스트에 `null` 값이 `EmptyValue` 사용 대상임을 확인하는 모델 수준 테스트를 추가한다.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL until the new formatter contract is wired.

- [ ] **Step 3: Write minimal implementation**

Lead Time과 Stockout의 조회 함수, 컬럼, 오류/빈 결과 분기는 유지한다. 화면의 직접 `tag`/`muted`/`—` 표현을 공통 `Badge`, `EmptyValue`, `Panel`, `KpiCard`, `DataTable`로 바꾼다. 화면 파일에는 hex 색상을 넣지 않는다.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS.

### Task 6: 전체 검증

**Files:**
- No new production files.

- [ ] **Step 1: Run tests**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 2: Scan for forbidden screen colors**

Run: `rg -n "#[0-9a-fA-F]{3,8}" app components --glob "*.tsx"`
Expected: no screen-component hex color matches.

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: successful Next.js production build with all intended routes listed.

