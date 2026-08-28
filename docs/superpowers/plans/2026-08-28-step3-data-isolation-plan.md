# STEP 3 데이터 모델·학습 검증 격리 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** raw 적재 모델과 운영 정책을 확장하고 train/test 데이터를 DB view로 격리한다.

**Architecture:** 기존 raw 테이블은 ALTER로 적재 추적 컬럼만 추가하고 신규 raw 테이블은 자연키 중심으로 생성한다. `core.forecast_setting`이 train/test 기간을 소유하며 `core.v_train_demand`, `core.v_test_actual`이 raw 사용 이력을 각각의 기간으로 제한한다. `analytics` view는 관리자 검증 화면에 coverage와 정책을 제공한다.

**Tech Stack:** Supabase PostgreSQL, Next.js 15 App Router, TypeScript, Node test runner

**Spec:** `AGENTS.md`, `SCHEMA.md`, STEP 3 사용자 요구사항

## Global Constraints

- 기존 raw 데이터와 analytics view를 drop/recreate하지 않는다.
- raw.usage_history를 학습/forecast 코드에서 직접 조회하지 않는다.
- train/test 날짜를 SQL/TypeScript에 고정하지 않는다.
- null을 0으로 변환하지 않는다.
- anon 접근을 허용하지 않으며, 설정 변경은 ADMIN만 가능하게 한다.

### Task 1: schema migration

**Files:** `supabase/migrations/20260828000200_create_data_isolation.sql`, `supabase/tests/data-isolation.sql`

- raw 신규 테이블 3개, 기존 raw 적재 추적 컬럼, core 정책/forecast 설정 테이블을 생성한다.
- train/test view와 coverage/review analytics view를 생성한다.
- authenticated select, ADMIN mutation RLS/GRANT를 추가한다.

### Task 2: 모델·정적 테스트

**Files:** `lib/forecast-model.ts`, `lib/forecast-model.test.ts`

- coverage 상태를 계산하는 순수 함수를 추가한다.
- migration이 raw 직접 학습 경로를 만들지 않는지 파일 기반 테스트로 검증한다.

### Task 3: 관리자 검증 화면

**Files:** `app/(admin)/admin/forecast-settings/page.tsx`, `lib/menu.ts`

- `requireAdmin()` 후 `analytics.v_forecast_setting_review`를 조회한다.
- 기간·granularity·coverage·정책 요약을 표시한다.

### Task 4: verification

- `npm test`, `npm run build` 실행
- raw 직접 조회, 날짜 리터럴, anon write, `using(true)` mutation 정적 점검
- 실제 Supabase migration 적용과 데이터 기간 설정은 수동 설정으로 보고한다.
