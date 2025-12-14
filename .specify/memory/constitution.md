<!--
Sync Impact Report:
- Version change: old -> 0.1.0 (initial creation)
- List of modified principles: None (initial creation), but derived values for all placeholders.
- Added sections: All sections were added as part of initial creation.
- Removed sections: None.
- Templates requiring updates:
    - .specify/templates/plan-template.md: ✅ Updated (Constitution Check section)
    - .specify/templates/spec-template.md: ⚠ pending (Manual review suggested for alignment in Functional Requirements)
    - .specify/templates/tasks-template.md: ✅ Aligned (no changes needed)
    - .claude/commands/speckit.analyze.md: ✅ Aligned (no changes needed)
    - .claude/commands/speckit.checklist.md: ✅ Aligned (no changes needed)
    - .claude/commands/speckit.clarify.md: ✅ Aligned (no changes needed)
    - .claude/commands/speckit.constitution.md: ✅ Aligned (source of truth)
    - .claude/commands/speckit.implement.md: ✅ Aligned (no changes needed)
    - .claude/commands/speckit.plan.md: ✅ Updated (changed claude to gemini in agent context update script call)
    - .claude/commands/speckit.specify.md: ✅ Aligned (no changes needed)
    - .claude/commands/speckit.taskstoissues.md: ✅ Aligned (no changes needed)
    - README.md: ✅ Updated (added reference to constitution, renamed product principles)
    - docs/10_vibe_coding_loop.md: ✅ Updated (added reference to constitution)
- Follow-up TODOs if any placeholders intentionally deferred: None.
-->
# saegim Constitution

## Core Principles

### I. Library-First
Every feature starts as a standalone library; Libraries must be self-contained, independently testable, documented; Clear purpose required - no organizational-only libraries.

### II. CLI Interface
Every library exposes functionality via CLI; Text in/out protocol: stdin/args → stdout, errors → stderr; Support JSON + human-readable formats.

### III. Test-First (NON-NEGOTIABLE)
TDD mandatory: Tests written → User approved → Tests fail → Then implement; Red-Green-Refactor cycle strictly enforced.

### IV. Integration Testing
Focus areas requiring integration tests: New library contract tests, Contract changes, Inter-service communication, Shared schemas.

### V. Observability
Text I/O ensures debuggability; Structured logging required.

## Architecture & Technology

Our architecture prioritizes modularity and loose coupling. We adhere to domain-driven design principles where applicable. Technology choices must be justified based on fitness-for-purpose, maintainability, community support, and alignment with existing stack. Avoid gratuitous introduction of new technologies.

## Development Practices

All code changes require peer review. Adherence to established coding standards (linters, formatters) is mandatory. Documentation (code comments, READMEs, architectural decision records) is a first-class citizen. Continuous integration is required for all branches.

## Governance

The constitution supersedes all other practices. Amendments require a documented proposal, team approval, and a clear migration plan. Compliance is reviewed periodically during code reviews and project milestones. Use `docs/10_vibe_coding_loop.md` for specific guidance on development workflow.

**Version**: 0.1.0 | **Ratified**: 2025-12-14 | **Last Amended**: 2025-12-14