# STEP 2 인증·Role·RBAC Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Supabase Auth 세션, ADMIN/USER 서버·DB 권한, 사용자 관리와 감사 로그를 구현한다.

**Architecture:** Supabase Auth는 `@supabase/ssr` cookie session을 사용하고, 서버는 매 요청 `auth.getUser()`와 `core.app_user`로 role을 확인한다. DB는 `core.is_admin()`을 RLS 정책에 사용하며 관리자 변경은 RLS 보호된 SQL 함수로 audit log와 함께 원자적으로 처리한다.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, `@supabase/ssr`, Supabase PostgreSQL/RLS

**Spec:** `AGENTS.md`, `SCHEMA.md`, STEP 2 사용자 요구사항

## Global Constraints

- service role key를 브라우저에 노출하지 않는다.
- anon write와 `using(true)` 관리자 정책을 허용하지 않는다.
- role은 `user_metadata`나 클라이언트 상태를 권한 판정에 사용하지 않는다.
- 기존 데이터 계산 SQL과 `lib/scm.ts` 조회 계약을 변경하지 않는다.
- 관리자 mutation은 서버 helper와 DB RLS/function 양쪽에서 검증한다.
- role/active 변경은 `core.audit_log`에 before/after JSON으로 기록한다.

### Task 1: DB schema, trigger, RLS

**Files:**
- Create: `supabase/migrations/20260828000100_create_auth_rbac.sql`
- Modify: `sql/01-grants.sql`
- Replace: `sql/02-policies.sql`
- Create: `supabase/tests/auth-rbac.sql`

**Interfaces:** `core.app_user`, `core.audit_log`, `core.is_admin()`, `core.admin_update_user(uuid,text,boolean)`

- [ ] Write SQL security assertions first and run them against the local/linked DB when available.
- [ ] Create tables, trigger, indexes, safe grants, RLS policies, and admin function with fixed `search_path`.
- [ ] Revoke anon writes and authenticated direct mutations; expose only authenticated select plus the guarded admin function.

### Task 2: Cookie SSR client and auth helpers

**Files:**
- Modify: `lib/supabase/server.ts`
- Modify: `lib/supabase/client.ts`
- Create: `lib/auth.ts`
- Create: `lib/auth.test.ts`

**Interfaces:** `requireUser()`, `requireAdmin()`, `getRole()`

- [ ] Test role/status decision helpers with unauthenticated, inactive, USER, and ADMIN cases.
- [ ] Use `createServerClient` with Next `cookies()` and `getUser()`; never use service role.
- [ ] Make `requireAdmin()` return a typed user context or throw/redirect according to caller.

### Task 3: Middleware and server actions

**Files:**
- Create: `middleware.ts`
- Create: `app/(auth)/login/actions.ts`
- Create: `app/(auth)/login/login-form.tsx`
- Create: `app/(auth)/logout/actions.ts`
- Create: `app/(admin)/users/actions.ts`

- [ ] Protect `/analysis/*`, `/admin/*`, and `/workflow` with `/login?next=...` redirects.
- [ ] Use `requireAdmin()` as the first operation in admin actions, validate self-protection rules, then call the guarded DB function.
- [ ] Implement login failure copy and safe next-path handling; implement logout through server action.

### Task 4: route pages and admin users screen

**Files:**
- Modify: `app/(auth)/login/page.tsx`
- Modify: `app/(admin)/layout.tsx`
- Create: `app/(admin)/users/page.tsx`
- Modify: `lib/menu.ts`

- [ ] Render login form with `next` query value.
- [ ] Add `/admin/users` to admin menu.
- [ ] Query users only after `requireAdmin()` and render role/active controls.

### Task 5: verification

**Files:**
- Modify: `error.md` only if a new error occurs.

- [ ] Run `npm test`.
- [ ] Run `npm run build`.
- [ ] Scan for `service_role`, anon write grants, and `using(true)`.
- [ ] Verify route list and report manual Supabase settings: migration execution, exposed schemas, Auth email/provider, redirect URLs, and initial ADMIN promotion.
