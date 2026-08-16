# Project Brief — Wizloft Harness

## Purpose

Wizloft Harness is a reusable engineering substrate for Wizloft projects. It helps humans and coding agents reliably discover repository authority, assemble bounded context, retain learned memory, select validation, and record evidence without moving project truth into a hidden control-plane database.

## First users

1. **Wizloft Harness itself** — self-hosting proves the contracts are usable.
2. **Wizloft CLI** — brownfield, multi-module, CommonJS-to-TypeScript rewrite; validates onboarding, authority hierarchy, validation routing, external CLI integration, and behavior-preserving migration.
3. **Meldmark** — domain-rich product with extensive decisions/design/specs; validates domain plugins, long-lived memory, product authority, and complex context routing.

## Product position

Wizloft Harness is not a replacement for Codex, Claude Code, DeepSeek Harness, or another agent runtime. It provides an agent-agnostic repository/engineering layer that those runtimes can consume.

## v0 goal

Reach **Minimum Useful Harness (MUH)**: enough reliable capability to use Harness while rebuilding Wizloft CLI. v0 is not platform completeness.

## Long-term direction

A small stable kernel with a composable ecosystem of capability providers, policies, stack plugins, domain plugins, project profiles, skills, and agent/runtime adapters. DeepSeek Harness should be integrable later in either direction without forcing Wizloft to adopt its runtime today.
