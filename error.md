# 오류 기록

## 2026-08-28 — Next.js route group 경로 충돌

- 증상: `/(admin)/page`, `/(user)/page`, `app/page.tsx`가 모두 `/`로 해석되어 `You cannot have two parallel pages that resolve to the same path` 빌드 오류 발생.
- 원인: Next.js route group의 괄호 폴더는 URL 경로에 포함되지 않으므로 각 그룹의 `page.tsx`가 동일한 루트 경로를 점유함.
- 해결: 사용자 루트는 `app/(user)/page.tsx` 하나만 유지하고, 관리자 화면은 `app/(admin)/admin/page.tsx`로 이동하여 `/admin` 경로를 사용하도록 변경함. 기존 `app/page.tsx`와 충돌하는 관리자 루트 페이지는 제거함.

## 2026-08-28 — Supabase CLI 미설치

- 증상: `supabase --version` 및 `supabase migration new` 실행 시 명령을 찾을 수 없음.
- 원인: 현재 개발 환경 PATH에 Supabase CLI가 설치되어 있지 않음.
- 해결: migration 파일은 프로젝트의 기존 timestamp 규칙에 맞춰 직접 작성하고, SQL은 Supabase SQL Editor 또는 CLI가 설치된 환경에서 적용하도록 수동 설정에 기록함.

## 2026-08-28 — SSR cookie adapter implicit any

- 증상: `lib/supabase/server.ts`의 `setAll(cookiesToSet)`에서 TypeScript가 매개변수의 암시적 `any`를 거부함.
- 원인: `@supabase/ssr`의 cookie adapter 콜백 타입이 해당 객체 리터럴에서 자동 추론되지 않음.
- 해결: `name`, `value`, `options`를 가진 cookie tuple 타입을 명시해 `setAll` 계약을 안전하게 고정함.
- 추가 조치: middleware의 `setAll`에도 동일한 cookie tuple 타입을 적용함.

## 2026-08-28 — 관리자 사용자 route re-export 경로 오류

- 증상: `/admin/users` 이동 후 `Module not found: Can't resolve '../../../users/page'` 발생.
- 원인: `app/(admin)/admin/users/page.tsx`에서 같은 route group 내부의 구현 페이지까지 올라가는 상대경로 단계가 하나 많았음.
- 해결: re-export 경로를 `../../users/page`로 수정해 기존 사용자 관리 구현을 `/admin/users`에서 사용하도록 함.
- 추가 조치: 기존 구현 페이지가 삭제되어 re-export 대상이 없었으므로 `/admin/users/page.tsx`에 실제 페이지를 생성하고 action/form만 재사용함.

## 2026-08-28 — PowerShell 괄호 경로 해석 오류

- 증상: `Get-ChildItem app\(admin)\...` 실행 시 `admin`을 명령으로 해석해 파일 목록 조회가 실패함.
- 원인: PowerShell에서 괄호가 포함된 경로를 따옴표 없이 입력함.
- 해결: route group 경로를 `'app/(admin)/...'`처럼 따옴표로 감싸거나 `-LiteralPath`를 사용함.

## 2026-08-28 — 존재하지 않는 public.planning_runs에 RLS 정책 생성

- 증상: `ERROR: 42P01: relation "public.planning_runs" does not exist`가 `drop policy ... on public.planning_runs`에서 발생함.
- 원인: `alter table if exists`는 없는 테이블을 건너뛰지만, 이후 PL/pgSQL 반복문에서 `drop policy`와 `create policy`를 무조건 실행함.
- 해결: 실제 존재하는 테이블만 대상으로 반복문을 실행하도록 `to_regclass(format('public.%I', table_name)) is not null` 조건을 추가하거나, 해당 프로젝트에 없는 테이블 이름을 배열에서 제거함.

## 2026-08-28 — SQL 예시의 줄임표 실행

- 증상: `syntax error at or near ".."`가 `alter table ...` 줄에서 발생함.
- 원인: 설명용 자리표시자 `...`를 실제 SQL로 실행함.
- 해결: `public` 테이블이 없는 환경에서는 해당 레거시 구간 전체를 실행하지 않고, 실제 존재하는 스키마의 SQL만 실행함.

## 2026-08-28 — PowerShell npm.ps1 실행 정책 차단

- 증상: `npm run dev` 실행 시 `이 시스템에서 스크립트를 실행할 수 없으므로 npm.ps1 파일을 로드할 수 없습니다`가 발생함.
- 원인: PowerShell 실행 정책이 `npm.ps1` 스크립트 실행을 차단함.
- 해결: 시스템 정책을 변경하지 않고 `npm.cmd run dev`를 사용하거나, 현재 터미널에만 임시로 `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`를 적용함.

## 2026-08-28 — 상태 확인 도구 입력 문법 오류

- 증상: 마지막 Git 상태 확인 명령을 실행하기 전 도구 입력의 JavaScript 객체 문법 오류가 발생함.
- 원인: `max_output_tokens` 속성의 콜론을 잘못 작성함.
- 해결: 명령 자체는 변경하지 않고 올바른 도구 입력 형식으로 다시 실행함.

## 2026-08-28 — STEP 4 RED 테스트의 미구현 모듈 import 오류

- 증상: `lib/import/types.test.ts` 실행 시 `Cannot find module .../lib/import/schema`가 발생함.
- 원인: TDD RED 단계에서 아직 생성하지 않은 `lib/import/schema.ts`를 테스트가 import함.
- 해결: 실패 원인을 확인한 뒤 테스트가 요구하는 타입·스키마 모듈을 구현해 GREEN 단계로 진행함.

## 2026-08-28 — STEP 4 validation RED 테스트의 미구현 모듈 import 오류

- 증상: `lib/import/validate.test.ts` 실행 시 `Cannot find module .../lib/import/validate.ts`가 발생함.
- 원인: validation 구현 전 RED 단계에서 테스트가 아직 존재하지 않는 모듈을 import함.
- 해결: 실패 원인을 확인한 뒤 `validateRows` 공통 검증 모듈을 구현함.

## 2026-08-28 — STEP 4 parse RED 테스트의 미구현 모듈 import 오류

- 증상: `lib/import/parse.test.ts` 실행 시 `Cannot find module .../lib/import/parse.ts`가 발생함.
- 원인: CSV/XLSX 파서 구현 전 RED 단계에서 테스트가 아직 존재하지 않는 모듈을 import함.
- 해결: 실패 원인을 확인한 뒤 `parseFile` 서버 파서를 구현함.

## 2026-08-28 — STEP 4 UI 모델 테스트 도구 경로 입력 오류

- 증상: UI 모델 RED 테스트를 실행하기 전 도구 입력에서 `Unexpected identifier`가 발생함.
- 원인: worktree 경로 문자열을 도구 호출 JavaScript 객체에 잘못 입력함.
- 해결: 파일과 구현에는 변경이 없음을 확인하고 올바른 worktree 경로로 테스트를 다시 실행함.

## 2026-08-28 — STEP 4 UI 모델 RED 테스트의 미구현 모듈 import 오류

- 증상: `lib/import/ui-model.test.ts` 실행 시 `Cannot find module .../lib/import/ui-model.ts`가 발생함.
- 원인: wizard 상태 구현 전 RED 단계에서 테스트가 아직 존재하지 않는 모듈을 import함.
- 해결: 실패 원인을 확인한 뒤 wizard 상태 계산 모듈을 구현함.

## 2026-08-28 — STEP 4 UI 모델 재검증 도구 입력 오류

- 증상: UI 모델 수정 후 재검증 명령을 실행하기 전 도구 입력에서 JavaScript 문자열 오류가 발생함.
- 원인: worktree 경로가 포함된 도구 호출 문자열을 잘못 작성함.
- 해결: 코드 변경 없이 올바른 worktree 경로로 재검증함.

## 2026-08-28 — STEP 4 빌드 polling 세션 ID 누락

- 증상: 실행 중인 빌드 세션을 polling하는 도구 호출에서 `ReferenceError: Cannot access 'r' before initialization`이 발생함.
- 원인: 이전 실행 결과의 세션 ID를 저장하지 않고 다음 polling 호출에서 초기화 중인 변수를 참조함.
- 해결: 빌드 프로세스의 실패로 판단하지 않고 빌드를 새로 실행해 종료 코드까지 확인함.

## 2026-08-28 — STEP 4 ValidationIssue severity 타입 오류

- 증상: Next.js build에서 `ValidationSeverity`의 `SUCCESS`가 오류 목록의 `WARNING/ERROR` 타입에 할당될 수 없다는 TypeScript 오류가 발생함.
- 원인: 행 전체 상태와 오류 기록의 severity 타입을 하나로 사용함.
- 해결: 오류 기록 전용 `IssueSeverity`를 `WARNING/ERROR`로 분리하고 행 상태에는 기존 `ValidationSeverity`를 유지함.

## 2026-08-28 — STEP 4 CSV parser callback implicit any

- 증상: Next.js build에서 `parse.ts` CSV `error` 콜백 매개변수가 암시적 `any`라는 TypeScript 오류가 발생함.
- 원인: Papa Parse 콜백의 오류 매개변수 타입이 객체 문맥에서 추론되지 않음.
- 해결: 콜백 매개변수에 `Error` 타입을 명시함.

## 2026-08-28 — STEP 4 repository auth context destructuring 타입 오류

- 증상: Next.js build에서 `authUser`가 `adminClient()` 반환값에 직접 존재하지 않는다는 TypeScript 오류가 발생함.
- 원인: `adminClient()`이 `{ context: { authUser, profile }, supabase }` 구조를 반환하는데 중첩 객체를 직접 구조분해함.
- 해결: `context`를 먼저 구조분해한 뒤 `context.authUser`를 사용하도록 수정함.

## 2026-08-28 — STEP 4 repository context 변수 중복 선언

- 증상: Next.js build에서 `Identifier 'context' has already been declared`가 발생함.
- 원인: 인증 context와 validation context에 같은 지역 변수명을 사용함.
- 해결: 인증 값은 `authContext`, 검증 값은 `validationContext`로 이름을 분리함.

## 2026-08-28 — worktree의 `.env.local` 누락

- 증상: worktree에서 Next.js build가 Supabase 환경변수 누락 오류로 페이지 생성에 실패함.
- 원인: Git worktree에는 Git에서 추적하지 않는 루트 `.env.local`이 자동 복사되지 않음.
- 해결: 루트의 로컬 `.env.local`을 격리 worktree에 복사해 빌드 검증 환경을 맞춤. 해당 파일은 `.gitignore` 대상이라 커밋하지 않음.

## 2026-08-28 — worktree 상위 경로 지정 오류

- 증상: `.env.local` 복사 시 `Cannot find path '..\\.env.local'`가 발생함.
- 원인: worktree는 `.worktrees\\step4-data-import` 아래에 있어 프로젝트 루트가 두 단계 상위인데 한 단계만 이동함.
- 해결: 프로젝트 루트의 `..\\..\\.env.local`을 대상으로 다시 복사함.

## 2026-08-28 — STEP 5 Demand Profile RED 테스트의 미구현 모델 import 오류

- 증상: `lib/demand-profile-model.test.ts` 실행 시 `Cannot find module .../lib/demand-profile-model.ts`가 발생함.
- 원인: TDD RED 단계에서 Demand Profile 정규화 모델을 구현하기 전에 테스트가 해당 모듈을 import함.
- 해결: 실패가 새 기능의 미구현 때문임을 확인한 뒤 `demand-profile-model.ts`에 코드값, null/reason 보존, 저장 결과 필터 함수를 구현함.

## 2026-08-28 — STEP 5 정적 참조 검색 PowerShell 따옴표 오류

- 증상: raw 직접 조회 여부를 확인하는 `rg` 명령 실행 시 PowerShell `ParserError`가 발생함.
- 원인: 정규식 안의 따옴표와 괄호를 PowerShell 문자열에서 잘못 이스케이프함.
- 해결: 코드에는 변경이 없음을 확인하고, 단순한 문자열 검색 명령으로 검증을 다시 수행함.

## 2026-08-28 — STEP 5 Demand Profile SQL의 round 타입 오류

- 증상: `round(double precision, integer) does not exist`가 `round(trend_per_period, 4)`에서 발생함.
- 원인: PostgreSQL `regr_slope()`가 `double precision`을 반환하지만 두 번째 인자를 받는 `round` 함수는 `numeric` 타입을 요구함.
- 해결: 계산식은 변경하지 않고 `trend_per_period::numeric`으로 명시적 형변환한 뒤 반올림하도록 수정함.

## 2026-08-28 — STEP 5 로컬 브라우저 확인 도구 경로 오류

- 증상: 브라우저 화면을 자동 확인하려는 중 `browser-client.mjs`를 찾지 못함.
- 원인: 현재 세션에 표시된 skill 경로와 실제 설치 경로가 일치하지 않음.
- 해결: 애플리케이션 파일과 실행 폴더를 기준으로 원인을 확인하고, 브라우저 도구는 경로 확인 후 재시도함.

## 2026-08-28 — 로컬 로그인 실패와 개발 서버 포트 충돌

- 증상: 배포에서는 로그인되지만 `localhost:3000`에서 로그인 실패 메시지가 표시됨.
- 원인: `localhost:3000`은 `main` 폴더 서버가 사용 중이고, 해당 루트 `.env.local`에는 예시 Supabase URL이 남아 있었음. STEP 5 worktree 서버는 다른 포트로 실행되어 브라우저가 올바른 환경을 사용하지 못함.
- 해결: `main`과 worktree의 개발 서버를 모두 종료한 뒤, 실제 Supabase 환경변수가 있는 STEP 5 worktree에서 하나의 개발 서버만 실행하고 그 포트로 접속함.

## 2026-08-28 — STEP 6 Forecast Engine RED 테스트의 미구현 모델 import 오류

- 증상: `lib/forecast-engine-model.test.ts` 실행 시 `Cannot find module .../lib/forecast-engine-model.ts`가 발생함.
- 원인: Forecast 화면 모델을 구현하기 전에 TDD 테스트가 해당 모듈을 import함.
- 해결: RED 결과를 확인한 후 Forecast run 정규화, stale 판정, 계산 불가 표시 함수를 구현함.

## 2026-08-28 — SQL Editor에서 Forecast 실행 시 관리자 권한 오류

- 증상: `select core.run_baseline_forecast(...)` 실행 시 `42501: 관리자 권한이 필요합니다.`가 발생함.
- 원인: Supabase SQL Editor는 애플리케이션 로그인 세션의 JWT가 없으므로 `auth.uid()`가 null이고, `core.is_admin()`이 false를 반환함.
- 해결: RLS와 ADMIN 검사를 우회하지 않고, ADMIN으로 로그인한 `/admin/forecast-runs` 화면의 Server Action에서 RPC를 실행함. SQL Editor에서는 결과 조회와 검증 쿼리만 실행함.

## 2026-08-28 — 로컬 관리자 화면 Forbidden

- 증상: 로컬 `/admin/forecast-runs` 접근 시 `Forbidden` 응답이 표시됨.
- 원인: `middleware`가 로그인 사용자의 `core.app_user.role`이 `ADMIN`이고 `active`가 true인지 서버에서 확인하는데, 동시에 main/worktree 개발 서버가 실행 중이면 잘못된 환경에 접근할 수 있음.
- 해결: 두 개발 서버를 종료하고 STEP 6 worktree 서버 하나만 실행한 뒤, 로그인 계정의 `core.app_user` role/active를 확인함. 권한 검사를 제거하거나 클라이언트에서만 판단하지 않음.

## 2026-08-28 — 로컬 화면에 로그아웃 버튼 미표시

- 증상: `localhost:3001` 로그인 후 공통 화면에 로그아웃 버튼이 보이지 않음.
- 원인: 로그아웃 Server Action은 존재했지만 공통 `Topbar`에 form으로 연결되어 있지 않았음.
- 해결: Topbar에 `logoutAction`을 연결한 서버 form 버튼을 추가해 USER/ADMIN 화면에서 공통으로 사용하도록 수정함.

## 2026-08-28 — localhost:3001 화면이 기본 브라우저 스타일로 표시됨

- 증상: 페이지 HTML은 열리지만 사이드바, 카드, 버튼 등의 CSS가 적용되지 않고 기본 링크/텍스트로 표시됨.
- 원인: worktree 개발 서버가 HTML에서 참조한 `/_next/static/css/app/layout.css` 요청에 404를 반환함. 빌드 산출물에는 CSS가 정상 생성되어 있어 애플리케이션 CSS 파일 삭제나 CSS 문법 오류가 아니라 개발 서버의 stale 상태로 확인됨.
- 해결: worktree의 개발 서버를 종료 후 재시작하고, CSS 요청이 200으로 응답하는지 확인한다. 다른 main 서버는 종료하지 않는다.

## 2026-08-28 — 관리자 Forecast 실행 단수 경로 404

- 증상: `/admin/forecast-run`으로 접근하면 404가 표시됨.
- 원인: 실제 페이지 라우트는 `/admin/forecast-runs`(복수형)인데 단수형 호환 라우트가 없었음.
- 해결: 단수형 `/admin/forecast-run`을 복수형 `/admin/forecast-runs`로 redirect하는 호환 페이지를 추가함. 메뉴의 정식 경로는 복수형을 유지함.

## 2026-08-28 — 개발 서버 재시작 후 CSS 404 재발

- 증상: `localhost:3001/admin/forecast-runs`에서 다시 기본 브라우저 스타일만 표시됨.
- 원인: 개발 서버 실행 중 `npm run build`가 동일한 `.next` 디렉터리를 다시 생성해, 실행 중인 dev 서버가 참조하던 CSS 가상 경로와 산출물이 불일치함.
- 해결: worktree dev 서버만 종료 후 재시작함. 재시작 후 `/_next/static/css/app/layout.css`가 200으로 응답하는 것을 확인함. 개발 서버 실행 중에는 별도 터미널에서 build를 실행하지 않는다.

## 2026-08-28 — `/admin/users` Forbidden

- 증상: 로그인 후 `/admin/users`에 접근하면 `Forbidden`이 표시됨.
- 원인: middleware와 `requireAdmin()`이 로그인한 Auth 사용자와 `core.app_user.user_id`가 일치하는 행의 `role = 'ADMIN'`, `active = true`를 모두 요구함. 이메일만 변경했거나 새 Auth 사용자를 생성한 경우 해당 profile이 `USER`이거나 기존 profile과 user_id가 달라질 수 있음.
- 해결: Supabase Auth에 로그인한 계정의 user id와 `core.app_user`를 대조하고, 관리자 계정에만 `ADMIN`/`true`를 설정한다. 권한 검사를 제거하거나 클라이언트에서만 처리하지 않는다.
## 2026-08-28 — Vercel 빌드의 Forecast 호환 경로 환경변수 오류

- 증상: Vercel `next build`에서 `/admin/forecast-run` prerender 중 `NEXT_PUBLIC_SUPABASE_URL` 및 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` 누락 오류가 발생함.
- 원인: 관리자 레이아웃의 인증 검사가 단수형 redirect 호환 페이지의 빌드 시점 prerender에서도 실행됨. Vercel 프로젝트 환경변수 미설정 상태에서 정적 생성이 진행됨.
- 해결: 호환 페이지에 `dynamic = 'force-dynamic'`을 지정해 빌드 시 인증을 실행하지 않도록 함. 배포 환경에는 Supabase 환경변수를 별도로 설정해야 한다.
