# Frontend Development Guidelines

This document defines the frontend standards for this project.

## Goal

Build interfaces that are:

- Simple
- Minimal
- Professional
- Consistent

## Core Principles

- Prefer clarity over cleverness.
- Keep layouts clean and focused on user tasks.
- Reduce visual noise and unnecessary controls.
- Match existing design tokens and patterns.
- Reuse components before creating new custom UI.

## Styling Rules

- Use existing CSS variables (`--background`, `--surface`, `--border`, `--muted`, `--tag-*`).
- Avoid introducing random one-off colors.
- Keep spacing consistent and modest.
- Prefer small, readable typography over decorative styles.
- Use subtle borders and shadows only when they improve hierarchy.

## Component Rules

- Create reusable components for repeated behavior.
- Keep components single-purpose.
- Keep props minimal and explicit.
- Avoid deeply nested component trees for simple UIs.
- Move shared UX patterns into `client/components/utility/`.

## Interaction Rules

- All clickable controls must show pointer cursor.
- Buttons with icons must include accessible labels.
- Use clear hover/focus states.
- Close dropdowns and popovers on outside click.
- Add tooltips when icon-only actions may be ambiguous.

## Table And Data Preview Rules

- Show one sheet at a time when possible.
- Use tabs for sheet switching instead of long stacked sections.
- Avoid unnecessary scrollbars.
- Prefer horizontal organization in dense insight panels.
- Keep sort/filter behavior predictable and easy to reset.
- For large datasets, use paging and explicit "Load more" / "Load all" actions.

## UX Rules For Long Pages

- Provide a reusable back-to-top action for long views.
- Make the control visible only after meaningful scroll.
- Keep it fixed, minimal, and non-obtrusive.

## Icons

- Use `lucide-react` for UI icons.
- Keep icon size consistent (typically 16-18px in controls).
- Do not mix icon libraries in the same feature unless required.

## Accessibility

- Use semantic controls (`button`, `label`, `input`, `select`).
- Provide `aria-label` for icon-only buttons.
- Ensure keyboard focus states are visible.
- Maintain readable color contrast.

## Performance

- Keep client-side logic lightweight.
- For large files, fetch data incrementally.
- Avoid rendering very large lists all at once when paging is available.

## Implementation Checklist

Before merging frontend work, confirm:

- The UI is simple, minimal, and professional.
- Styling follows existing tokens and patterns.
- Reusable patterns are extracted into shared components when appropriate.
- Interactions are clear (pointer, labels, tooltip if needed).
- Dropdowns and panels close correctly.
- No TypeScript or lint errors in changed files.
