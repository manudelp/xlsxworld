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

- Use existing CSS variables (`--background`, `--surface`, `--surface-2`, `--border`, `--muted`, `--muted-2`, `--tag-*`, `--primary`, `--danger`).
- Prefer semantic state tokens in `globals.css` for special states (for example `--danger-soft`, reorder/highlight tokens) instead of hardcoded hex/rgba values.
- Avoid introducing random one-off colors.
- Keep spacing consistent and modest.
- Prefer small, readable typography over decorative styles.
- Use subtle borders and shadows only when they improve hierarchy.

## Layout Patterns

- Follow the upload-first progressive disclosure pattern: show only the dropzone initially, then reveal settings, summary, and actions after upload.
- Keep section hierarchy consistent: upload area -> selection/settings card -> summary/insights -> action row.
- Place secondary control buttons (`Select all`, `Clear`, ordering actions) in the top-right header actions area of the relevant card.
- Use a consistent primary action row: helper text on the left and primary CTA aligned right.
- Keep utility controls near the content they affect (avoid detached controls).

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
- For selectable chips, use `aria-pressed` and tokenized selected/unselected states.
- For drag and reorder interactions, provide clear feedback (highlight + short status text).
- For validation in upload flows, prefer contextual feedback on the dropzone state instead of detached/floating error toasts.

## Error And Feedback Rules

- Show errors where the user is currently acting (for uploads, highlight the dropzone and show a nearby message).
- Keep success/progress/status messages short and task-oriented.
- Avoid duplicate feedback (do not repeat the same metric in multiple chips/labels).

## Table And Data Preview Rules

- Show one sheet at a time when possible.
- Use tabs for sheet switching instead of long stacked sections.
- Avoid unnecessary scrollbars.
- Prefer horizontal organization in dense insight panels.
- Keep sort/filter behavior predictable and easy to reset.
- For large datasets, use paging and explicit "Load more" / "Load all" actions.

## Summary And Insights Rules

- Summary cards must add information, not restate title-level text.
- Prefer compact chips for key metrics only (counts, selected items, output type, preview limits).
- If summary is not useful for a flow, remove it.
- Use one-line, width-efficient summaries when possible.

## Conversion And Export UX Rules

- Support both focused and bulk export paths when workbooks have multiple sheets.
- In sheet export flows, offer:
	- one selected sheet download,
	- selected sheets bulk download,
	- all sheets bulk download when applicable.
- Label export actions explicitly (`Download Selected CSV`, `Download Selected CSVs (ZIP)`, `Download All CSVs (ZIP)`).
- Make export behavior adaptive to selection count, and keep unavailable actions hidden or clearly disabled.

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
- Primary and secondary actions follow the agreed placement pattern.
- New colors are tokenized in `globals.css` (no hardcoded state colors).
- Upload-first screens hide non-essential UI before file selection.
- Summaries are concise and non-duplicative.
- No TypeScript or lint errors in changed files.
