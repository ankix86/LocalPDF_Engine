# Quick Implementation Guide - Touch UX Pattern

This guide shows how to apply the mobile/touch UX improvements to the remaining tools in ~10-20 minutes per tool.

## Step-by-Step Pattern

### 1. Add Imports (Top of file)

```typescript
import TouchHint from "@/components/shared/TouchHint";
import PageJumpInput from "@/components/shared/PageJumpInput";
import { preventScrollDuringTouch, isTouchDevice } from "@/lib/touch-utils";
```

### 2. Add Constants (After type definitions)

```typescript
// Touch-optimized sizes
const HANDLE_SIZE = 44; // 44x44px minimum touch target
const ROTATE_HANDLE_SIZE = 44; // For rotation handles if needed
```

### 3. Add State & Effect (In component)

```typescript
const [isTouch] = useState(() => isTouchDevice());

// Prevent scroll during touch interaction
useEffect(() => {
  const cleanup = preventScrollDuringTouch(overlayRef.current); // or wrapRef.current
  return cleanup;
}, []);
```

### 4. Update Preview Section Header

**Before:**
```tsx
<div className="flex items-start justify-between gap-3 mb-4">
  <div className="min-w-0">
    <p className="text-sm font-semibold text-slate-700">Preview title</p>
    <p className="text-xs text-slate-500 mt-0.5">
      Static instruction text
    </p>
  </div>
  <span className="text-xs font-medium text-slate-500 shrink-0">
    Page {targetPage + 1} / {pageCount}
  </span>
</div>
```

**After:**
```tsx
<div className="flex items-start justify-between gap-3 mb-4">
  <div className="min-w-0">
    <p className="text-sm font-semibold text-slate-700">Preview title</p>
    <TouchHint
      text={isTouch ? "Touch-specific instruction" : "Desktop instruction"}
      icon="relevant_icon"
      className="mt-2"
    />
  </div>
  <div className="flex items-center gap-2 shrink-0">
    <PageJumpInput
      currentPage={targetPage}
      totalPages={pageCount}
      onJump={goToPage}
    />
  </div>
</div>
```

### 5. Update Interactive Overlay

**Add to overlay div:**
```tsx
className="absolute inset-0 touch-none select-none no-select"
```

### 6. Update Handle Sizes

**Resize handles:**
```tsx
// Before
className="absolute w-5 h-5 bg-white border-2 ..."

// After
className="absolute bg-white border-2 ..."
style={{ width: `${HANDLE_SIZE}px`, height: `${HANDLE_SIZE}px` }}
```

**Rotation handles:**
```tsx
// Before
className="w-9 h-9 bg-white border-2 ..."

// After
style={{ width: `${ROTATE_HANDLE_SIZE}px`, height: `${ROTATE_HANDLE_SIZE}px` }}
```

**Delete buttons:**
```tsx
// Before
className="... w-10 h-10 ..."

// After
className="... active:scale-95"
style={{ width: `${HANDLE_SIZE}px`, height: `${HANDLE_SIZE}px` }}
```

### 7. Update Navigation Buttons

**Before:**
```tsx
className="... h-11 w-11 ..."
```

**After:**
```tsx
className="... active:scale-95"
style={{ width: "44px", height: "44px" }}
```

### 8. Update Thumbnails Section

**Add prop:**
```tsx
<PDFThumbnails
  // ... existing props
  mobileHorizontalScroll={true}
/>
```

## Tool-Specific Notes

### Sign PDF
- Signature pad already has good touch support
- Focus on placement handles (same as Stamp PDF)
- Add TouchHint: "Draw signature below, then tap to place"

### Draw/Highlight PDF
- Stroke canvas needs `touch-none` class
- Add TouchHint: "Drag to draw · Tap highlight to delete"
- Undo button needs 44x44px minimum
- Color picker buttons already good size

### Organize PDF
- Drag handles on thumbnails need visual feedback
- Add TouchHint: "Drag to reorder · Tap × to remove"
- Delete buttons need 44x44px minimum
- Consider adding `active:scale-95` to draggable items

## Icon Suggestions

| Tool | Icon | Hint Text (Touch) |
|------|------|-------------------|
| Crop | `crop` | "Drag corners or edges to resize crop area" |
| Stamp | `approval` | "Tap to place · Drag to move · Pinch corners to resize" |
| Sign | `draw` | "Draw signature below, then tap preview to place" |
| Highlight | `draw` | "Drag to draw or highlight · Tap to select and delete" |
| Organize | `grid_view` | "Drag thumbnails to reorder · Tap × to remove pages" |

## Testing Checklist Per Tool

- [ ] All handles are 44x44px minimum
- [ ] No scroll while dragging
- [ ] Touch hint appears and is dismissible
- [ ] Page jump input works
- [ ] Thumbnails scroll horizontally on mobile
- [ ] Navigation buttons are 44x44px
- [ ] Active feedback on touch (scale animation)
- [ ] No console errors
- [ ] Works on desktop (no regressions)

## Common Pitfalls

1. **Forgetting `no-select` class** - Text gets selected during drag
2. **Not using `style` for sizes** - Tailwind classes don't support dynamic values
3. **Missing cleanup in useEffect** - Memory leaks from event listeners
4. **Wrong ref for scroll prevention** - Use the overlay/wrap ref, not canvas
5. **Forgetting `active:scale-95`** - No visual feedback on touch

## Time Estimates

- **Sign PDF:** 15 min (similar to Stamp)
- **Highlight PDF:** 20 min (stroke canvas needs attention)
- **Organize PDF:** 10 min (simpler, mostly thumbnails)

**Total:** ~45 minutes for all three

## Quick Test Command

```bash
# Start dev server
npm run dev

# Open in browser
# Test on mobile: Chrome DevTools > Toggle device toolbar
# Test touch: Use touch simulation in DevTools
```

## Done!

Once all tools are updated:
1. Test on real devices (iOS Safari, Android Chrome)
2. Run accessibility audit
3. Update README with mobile improvements
4. Close GitHub issue
