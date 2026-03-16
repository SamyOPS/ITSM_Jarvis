# Contributing Rules

This file defines the minimum collaboration rules for the repository.
Its goal is to make `P0.1` explicit in the codebase: branch strategy,
pull request rules, issue format, and Definition of Done.

## Workflow
- 1 issue = 1 branch = 1 pull request.
- Start every branch from `dev`.
- Open pull requests to `dev`.
- Merge `dev` to `main` only when `dev` is stable and releasable.
- Keep pull requests small and focused on a single unit of work.
- Do not mix feature work, refactors, and unrelated fixes in the same PR.

## Branch Naming

Use lowercase names with hyphens.

- `feature/<issue-id>-<short-name>` for new features.
- `fix/<issue-id>-<short-name>` for bug fixes.
- `chore/<issue-id>-<short-name>` for maintenance and technical tasks.
- `docs/<issue-id>-<short-name>` for documentation changes.

Examples:
- `feature/P0.2-init-back-structure`
- `fix/P3.5-ticket-status-transition`
- `docs/P0.1-repo-conventions`

## Commit Naming

Use conventional commit prefixes:

- `feat: ...` for feature work.
- `fix: ...` for bug fixes.
- `chore: ...` for maintenance or technical tasks.
- `docs: ...` for documentation changes.
- `refactor: ...` for internal code restructuring.
- `test: ...` for tests.

Examples:
- `feat: add ticket list endpoint`
- `fix: validate missing auth token`
- `docs: define pull request workflow`

## Pull Request Rules

- A PR must be linked to exactly one main issue.
- The PR title should be short and action-oriented.
- The PR description must explain:
  - the goal,
  - the main changes,
  - how it was tested,
  - any remaining limitations.
- CI must pass before merge.
- Do not self-merge without at least one review when team workflow allows it.
- Rebase or update the branch if it has drifted too far from `dev`.

## Definition of Done

An issue is considered done only if all applicable points below are true:

- code is committed on its dedicated branch,
- scope matches the issue,
- lint passes,
- tests pass or the absence of tests is explicitly justified,
- build passes for impacted apps,
- documentation or environment variables are updated if needed,
- no secret or local-only file is committed,
- the PR description is filled in clearly.

## Issue Structure

Each issue should include:

- `Goal`: expected result for the user or team.
- `Scope`: what is included and excluded.
- `Tasks`: concrete implementation steps.
- `Definition of Done`: validation criteria.
- `Labels`: package (`P0` to `P6`) and technical area (`front`, `back`, `db`, `infra`, `tests`, `ia`).

## Recommended Labels

- `P0`, `P1`, `P2`, `P3`, `P4`, `P5`, `P6`
- `front`
- `back`
- `db`
- `infra`
- `tests`
- `ia`
- `docs`
- `priority-high`
- `priority-medium`
- `priority-low`

## Protected Branch Policy

These rules must be configured in GitHub when repository settings are available:

- protect `main`,
- forbid direct pushes to `main`,
- require a pull request before merge,
- require CI checks to pass,
- optionally require at least one approval.
