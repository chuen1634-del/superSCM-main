# STEP 6 Forecast Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 학습 데이터만 사용하는 SQL Baseline Forecast와 모델/실행/결과 이력을 구축한다.

**Architecture:** `core.model_config`의 enabled 모델 정의를 실행 시 `core.model_version`에 snapshot하고, `core.v_train_demand` 기반 월 Grid로 `core.forecast_run`과 `core.forecast_result`를 생성한다. 화면은 analytics view만 조회한다.

**Tech Stack:** PostgreSQL/Supabase security definer function and views, Next.js 15 App Router, React 19, TypeScript, 순수 CSS, Node test runner.

**Spec:** 사용자 제공 STEP 6 Forecast Engine 요구사항

## Global Constraints

- Forecast 계산은 학습 구간 데이터와 `core.v_train_demand`만 사용한다.
- test actual과 raw usage를 Forecast 계산에 사용하지 않는다.
- 모델 parameters와 적용 Demand Type은 DB에서 관리한다.
- 데이터 부족, sigma 부족은 null/미생성으로 남기며 0이나 임의값으로 대체하지 않는다.
- 화면은 계산하지 않고 analytics view에 저장된 결과만 조회한다.
- ADMIN만 모델 변경과 Forecast 실행을 할 수 있다.

### Task 1: 모델 계약 테스트

- [ ] 모델 코드와 실행 상태 정규화 테스트를 작성한다.
- [ ] stale 판정과 계산 불가 표시 계약을 구현한다.

### Task 2: Registry/Run/Result SQL

- [ ] `core.model_config`, `core.model_version`, `core.forecast_run`, `core.forecast_result`를 만든다.
- [ ] RLS와 ADMIN-only mutation을 추가한다.
- [ ] analytics model/run/result/KPI view를 만든다.

### Task 3: Baseline 실행 함수

- [ ] MA_3M, MA_6M, WMA_3M, PY_SAME_MONTH, SEASONAL_NAIVE를 DB에 등록한다.
- [ ] train monthly grid와 fitted residual sigma를 SQL로 계산한다.
- [ ] horizon은 forecast_setting 설정에서 읽고 미래 날짜를 하드코딩하지 않는다.
- [ ] model version snapshot과 run status/오류 처리를 구현한다.

### Task 4: 관리자 화면과 조회

- [ ] `/admin/forecast-models`에서 모델 설정을 조회한다.
- [ ] `/admin/forecast-runs`에서 실행 이력과 stale 상태를 조회한다.
- [ ] 실행 Server Action은 `requireAdmin()`으로 보호한다.

### Task 5: 검증

- [ ] Baseline/부족 데이터/sigma/version/stale/data leakage SQL 테스트를 추가한다.
- [ ] `npm test`와 `npm run build`를 실행한다.
- [ ] SQL Editor 적용 절차를 `적용방법.md`에 기록한다.
