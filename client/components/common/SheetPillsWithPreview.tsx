"use client";

interface Sheet {
  name: string;
}

interface SheetPillsWithPreviewProps {
  sheets: Sheet[];
  /** Set of sheet names currently selected for export */
  selectedSet: Set<string>;
  /** Index of the sheet currently shown in the preview table */
  activeSheetIdx: number;
  /** Called when user clicks a pill to preview that sheet (does NOT change selection) */
  onPreview: (idx: number) => void;
  /** Called when user clicks the checkbox to include/exclude a sheet (does NOT change preview) */
  onToggle: (name: string) => void;
}

/**
 * Renders sheet pill buttons with two separate interactions:
 *  - Click the pill  → preview that sheet (does not change selection)
 *  - Click the checkbox inside → toggle include/exclude (does not change preview)
 *
 * Active (previewed) sheet gets a box-shadow ring + distinct background.
 * Selected (included) sheets get a filled background.
 */
export default function SheetPillsWithPreview({
  sheets,
  selectedSet,
  activeSheetIdx,
  onPreview,
  onToggle,
}: SheetPillsWithPreviewProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {sheets.map((sheet, idx) => {
        const isSelected = selectedSet.has(sheet.name);
        const isActive = activeSheetIdx === idx;

        return (
          <button
            key={sheet.name}
            type="button"
            onClick={() => onPreview(idx)}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-sm transition"
            style={{
              backgroundColor: "var(--tag-bg)",
              color: "var(--tag-text)",
              borderColor: isActive ? "var(--tag-selected-bg)" : "var(--tag-border)",
              boxShadow: isActive ? "0 0 0 1.5px var(--tag-selected-bg)" : "none",
            }}
          >
            {/* Checkbox — click toggles selection without changing preview */}
            <span
              aria-hidden="true"
              onClick={(e) => {
                e.stopPropagation();
                onToggle(sheet.name);
              }}
              className="flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center rounded border transition-colors"
              style={{
                borderColor: isSelected
                  ? "var(--tag-selected-bg)"
                  : "rgba(128,128,128,0.45)",
                backgroundColor: isSelected
                  ? "var(--tag-selected-bg)"
                  : "transparent",
              }}
            >
              {isSelected && (
                <svg
                  width="8"
                  height="6"
                  viewBox="0 0 8 6"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M1 3l2 2 4-4"
                    stroke="var(--tag-selected-text)"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </span>
            {sheet.name}
          </button>
        );
      })}
    </div>
  );
}
