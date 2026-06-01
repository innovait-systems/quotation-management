# Implementation Plan: Column-wise & Side-by-side Block Alignment

This implementation plan covers the design and execution steps to allow column-wise (side-by-side) layout configurations inside the dynamic Document Template Designer. This enables users to align components (e.g. `company_details` and `customer_details`) side-by-side instead of strictly stacked vertically.

---

## User Review Required

> [!IMPORTANT]
> **Implicit Grid Grouping Rules:**
> Side-by-side alignment is configured by setting any individual block to a width of **½ Column** (`'half'`). 
> - If two consecutive visible blocks in the layout sequence are configured as `'half'`, they are grouped into a responsive, premium side-by-side grid (2 columns) in both the live preview canvas and the generated PDF.
> - If a `'half'` block stands alone (i.e. is not flanked by another `'half'` block), it occupies exactly half of the row, leaving the other half empty (rather than stretching), ensuring precise visual alignment based on user preference.
> - Hidden blocks are filtered out *before* grouping, so they don't leave empty columns or break side-by-side layouts.

---

## Open Questions

None. The design leverages standard Tailwind grid styles in the canvas preview and inline CSS Flexbox rules in the PDF export engine for high compatibility.

---

## Proposed Changes

### 1. State Management Upgrades

#### [MODIFY] [templatesStore.ts](file:///e:/Development/flutter_projects/Quotation/app/client/src/store/templatesStore.ts)
- Add `blockWidths?: Record<string, 'full' | 'half'>` field to the `TemplateConfig` interface.
- Ensure that updates to the config merge `blockWidths` objects correctly.

---

### 2. Template Designer UI Upgrades

#### [MODIFY] [TemplatesView.tsx](file:///e:/Development/flutter_projects/Quotation/app/client/src/app/dashboard/views/TemplatesView.tsx)
- **Layout Toolbox UI**:
  - Inside the drag-and-drop block card loop, add a modern, pill-style toggle button on the right side of each card.
  - The toggle button allows switching between **Full** width and **½ Column** width.
  - Clicking the toggle updates `activeTemplate.config.blockWidths` in the templates store.
- **Preview Canvas Rendering Engine**:
  - Implement a helper `isBlockVisible(blockId: string): boolean` to filter out hidden elements.
  - Extract the massive `switch(blockId)` preview rendering loop into a clean `renderPreviewBlock(blockId: string)` helper.
  - Implement the consecutive-grouping algorithm in the preview renderer:
    - Map visible blocks.
    - If a block is `'half'`, check if the next visible block is also `'half'`. If yes, wrap them together in a `<div className="grid grid-cols-2 gap-6 w-full mb-6 items-start">` row.
    - If no, wrap the single `'half'` block in a grid with an empty column.
    - Otherwise, wrap the `'full'` block normally.

---

### 3. PDF Export Layout Generation

#### [MODIFY] [pdfExporter.ts](file:///e:/Development/flutter_projects/Quotation/app/client/src/utils/pdfExporter.ts)
- **Block Layout Grouping**:
  - Implement a helper `isBlockVisible(blockId: string): boolean` based on document type and configurations.
  - Refactor the main layout compiler to group consecutive `'half'` visible blocks into a flex container using inline styles:
    ```html
    <div style="display: flex; gap: 20px; width: 100%; margin-bottom: 25px; align-items: flex-start; page-break-inside: avoid;">
      <div style="flex: 1; min-width: 0;">
        ${compileBlock(blockId)}
      </div>
      <div style="flex: 1; min-width: 0;">
        ${compileBlock(nextBlockId)}
      </div>
    </div>
    ```
  - Standardize `.details-box` and other components to support dynamic resizing (`width: 100%`) when embedded in column columns.

---

## Verification Plan

### Automated Tests
- Run compiler diagnostics to ensure complete type safety and successful Next.js builds:
  ```powershell
  npx tsc --noEmit
  ```

### Manual Verification
1. **Toggle Column Layout**:
   - Access **Document Templates** designer.
   - Find the layout cards: `2. Company Address details` and `3. Customer Billing address`.
   - Click the width toggle on both cards to set them to **½ Column**.
   - Verify that the **Live Preview mockup canvas** immediately rearranges them side-by-side!
2. **Reordering Half-width Blocks**:
   - Verify that dragging a `'half'` block next to another `'half'` block automatically merges them side-by-side.
   - Verify that dragging a `'full'` block between them splits them into two rows with empty column fillers, maintaining precise layout boundaries.
3. **PDF Export**:
   - Go to **Quotations** or **Invoices**.
   - Create a draft, select the customized template theme, and click **Export PDF**.
   - Verify that the printed A4 sheet groups the blocks side-by-side with beautiful grid alignment and zero overlaps.
