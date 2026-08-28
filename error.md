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
