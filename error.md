# 오류 기록

## 2026-08-28 — Next.js route group 경로 충돌

- 증상: `/(admin)/page`, `/(user)/page`, `app/page.tsx`가 모두 `/`로 해석되어 `You cannot have two parallel pages that resolve to the same path` 빌드 오류 발생.
- 원인: Next.js route group의 괄호 폴더는 URL 경로에 포함되지 않으므로 각 그룹의 `page.tsx`가 동일한 루트 경로를 점유함.
- 해결: 사용자 루트는 `app/(user)/page.tsx` 하나만 유지하고, 관리자 화면은 `app/(admin)/admin/page.tsx`로 이동하여 `/admin` 경로를 사용하도록 변경함. 기존 `app/page.tsx`와 충돌하는 관리자 루트 페이지는 제거함.
