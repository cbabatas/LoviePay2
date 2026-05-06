<!--
Sync Impact Report
Version change: template -> 1.0.0
Modified principles:
- template principle 1 -> I. Code Quality Is Required
- template principle 2 -> II. Tests Prove Behavior
- template principle 3 -> III. User Experience Stays Consistent
- template principle 4 -> IV. Performance Has Budgets
- template principle 5 -> V. Simplicity Before Abstraction
Added sections:
- Engineering Standards
- Delivery Workflow
Removed sections:
- Placeholder Section 2
- Placeholder Section 3
Templates requiring updates:
- ✅ .specify/templates/plan-template.md
- ✅ .specify/templates/spec-template.md
- ✅ .specify/templates/tasks-template.md
- ✅ .specify/templates/commands/*.md (not present)
- ✅ AGENTS.md
Follow-up TODOs: none
-->

# LoviePay2 Constitution

## Core Principles

### I. Code Quality Is Required
All production code MUST be readable, cohesive, and consistent with the existing project
patterns. Names MUST describe intent, duplicated logic MUST be removed when the duplication
creates maintenance risk, and public contracts MUST be explicit. Changes MUST stay scoped to
the requested behavior unless a broader edit is required to keep the system correct.

Rationale: quality is maintained through clear, local decisions that make future changes
cheaper without turning every change into a redesign.

### II. Tests Prove Behavior
Every feature or bug fix MUST include automated tests for the behavior it changes, unless the
plan documents why automation is impractical and lists the manual verification performed.
Tests MUST cover the primary user path, important edge cases, and regressions found during
implementation. Test code MUST be deterministic and run through the project-standard test
commands.

Rationale: tests are the evidence that the implementation works and that future changes can
be made with confidence.

### III. User Experience Stays Consistent
User-facing changes MUST follow the existing product language, interaction patterns,
accessibility expectations, and visual system. New UI states MUST cover loading, empty,
error, and success outcomes when those states can occur. Copy MUST be clear and task-focused,
and the same concept MUST use the same label across the product.

Rationale: consistency reduces user effort and prevents features from feeling unrelated or
unfinished.

### IV. Performance Has Budgets
Plans MUST state measurable performance goals for user-visible latency, throughput,
resource use, or rendering smoothness when the feature can affect them. Implementations MUST
avoid unnecessary work in critical paths, large unbounded payloads, and avoidable blocking
operations. Performance-sensitive changes MUST include measurement or a documented reason
why existing coverage is sufficient.

Rationale: performance is part of correctness for users, and budgets prevent vague late-stage
tuning.

### V. Simplicity Before Abstraction
The default solution MUST be the simplest design that satisfies the current validated
requirements. New frameworks, layers, shared abstractions, background jobs, distributed
components, or generalized configuration systems MUST have a written reason tied to an
active requirement. Speculative extensibility and premature reuse are not acceptable
justifications.

Rationale: avoiding overengineering keeps delivery fast and makes the system easier to
understand, test, and change.

## Engineering Standards

Implementation plans MUST identify the real project structure, standard commands, and
dependencies before work begins. Code MUST pass formatting, linting, type checking, and test
commands that are already established for the affected area. When no standard command exists,
the plan MUST define the smallest useful verification command for the change.

Data contracts, API boundaries, and user-visible behavior MUST be documented where they are
introduced or changed. Error handling MUST be intentional: failures that users can act on
MUST produce useful feedback, and failures that operators must diagnose MUST leave enough
runtime evidence to investigate.

## Delivery Workflow

Work MUST be sliced by independently valuable user stories whenever possible. Each story
MUST define acceptance criteria, test coverage, UX states, and any performance budget before
implementation starts. Complexity that violates this constitution MUST be recorded in the
plan with the simpler alternative that was rejected.

Review MUST check constitution compliance before implementation and again before delivery.
No feature is complete until its intended behavior is verified, existing behavior is not
knowingly regressed, and any accepted gaps are documented in the plan or task list.

## Governance

This constitution supersedes conflicting local practices for planning and delivery. Changes
to the constitution MUST be made in `.specify/memory/constitution.md`, include a Sync Impact
Report, and update dependent templates in the same change when their guidance is affected.

Versioning follows semantic versioning:
- MAJOR for removing or redefining principles in a backward-incompatible way.
- MINOR for adding principles, sections, or materially expanding governance.
- PATCH for clarifications that do not change required behavior.

Every plan, specification, task list, and review MUST treat the Core Principles as gates.
Any exception MUST be explicit, justified, and limited to the smallest practical scope.

**Version**: 1.0.0 | **Ratified**: 2026-05-06 | **Last Amended**: 2026-05-06
