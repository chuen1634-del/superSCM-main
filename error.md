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
