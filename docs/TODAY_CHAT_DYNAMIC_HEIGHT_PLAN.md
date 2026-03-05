# Today Page — Dynamic Tomo Chat Height

## Problem

On the Today page, the TOMO AI chat section has a fixed height (driven by the persisted split ratio, currently default 70%). When users send prompts and the conversation grows, the chat content stays fixed—older messages scroll out of view and the container does not expand. Users cannot comfortably see the full conversation.

## Desired Behavior

- **Default:** 50/50 split (chat area 50%, bottom section 50%). This respects the bottom-min-50% constraint from the start. Change the persisted default from 70 to 50.
- **On chat activity:** Dynamically increase the chat area height as messages accumulate (up to the cap).
- **Cap:** Chat area ≤ 50% (bottom section ≥ 50%). The resize handle enforces this; users cannot drag the chat beyond 50%.
- **User control:** The existing resize handle continues to work; users can manually shrink (25–50% for chat) or expand within the cap.

## Complexity Assessment

**Low–medium complexity.** The layout and resize logic already exist. The main work is:

1. Reacting to message count changes.
2. Computing an effective split ratio that respects both content and user preference.
3. A small refactor so the component that owns the split has access to `useTomoChat()`.

## Implementation Plan

### Phase 1: Enable Message-Aware Split (Required Refactor)

**Why:** `splitRatio` and the split container live in `HomePage`, which is rendered *outside* `TomoChatProvider`. `useTomoChat()` only works inside the provider. The split UI is passed as `listContent` into `AppShell`, which renders it inside `TomoChatProvider`. So any component that is part of `listContent` can call `useTomoChat()`.

**Approach:** Extract the Today list/split content into a dedicated component that is rendered as `listContent`. That component will use both `useTomoChat()` and `usePersistentState()` for the split.

**Steps:**

1. Create `TodayListContent` (or `TodayPageSplit`) in `src/app/home/page.tsx` (or a separate file).
2. Move into it:
   - `splitRatio` / `setSplitRatio` (via `usePersistentState`)
   - `draggingSplit` / `setDraggingSplit`
   - `splitContainerRef`
   - Resize `useEffect`
   - The entire split JSX (greeting, chat area, resize handle, bottom lists).
3. Pass in as props: `selection`, `setSelection`, `showDailyBrief`, `setShowDailyBrief`, `greeting`, `userName`, `sortedActionItems`, `sortedCommitments`, `filteredBriefs`, `addToast`, `getActivityLogEntries`, etc.
4. In `HomePage`, replace the inline `listContent` with:
   ```tsx
   const listContent = (
     <TodayListContent
       selection={selection}
       setSelection={setSelection}
       ...
     />
   );
   ```

### Phase 2: Dynamic Split Ratio Logic

Inside `TodayListContent`:

```tsx
const tomo = useTomoChat();
const messages = tomo?.messages ?? [];
const messagesWithoutGreeting = messages.filter(
  (m) => m.text !== "What can I help you with today?"
);
const messageCount = messagesWithoutGreeting.length;

// When user has an active chat (2+ messages), grow chat area
// Bottom section must stay ≥ 50%, so chat (top) is capped at 50%
const MAX_TOP_RATIO = 50;  // bottom section min 50%

const displayRatio = useMemo(() => {
  if (messageCount < 2) return Math.min(MAX_TOP_RATIO, splitRatio);
  // When active: grow up to 50% (e.g. from default ~40% to 50%)
  const targetForActive = Math.min(50, 40 + Math.min(messageCount - 2, 5) * 2);
  return Math.min(MAX_TOP_RATIO, Math.max(splitRatio, targetForActive));
}, [splitRatio, messageCount]);
```

Use `displayRatio` instead of `splitRatio` in the flex styles:

```tsx
style={{ flex: `${displayRatio} 1 0` }}
// and for bottom:
style={{ flex: `${100 - displayRatio} 1 0` }}
```

**Alternative (simpler):** Use a single threshold:

```tsx
const MAX_TOP = 50;  // bottom section min 50%
const displayRatio = messageCount >= 2
  ? Math.min(MAX_TOP, Math.max(splitRatio, 50))
  : Math.min(MAX_TOP, splitRatio);
```

### Phase 3: Optional Smooth Transition

Add a short CSS transition so the height change is not jarring:

```tsx
<div
  className="flex min-h-[160px] min-w-0 flex-col overflow-hidden bg-white px-4 py-3 transition-[flex] duration-300 ease-out"
  style={{ flex: `${displayRatio} 1 0` }}
>
```

(Note: `transition-[flex]` may not animate flex-basis in all browsers. A fallback is to animate `min-height` or use a fixed height derived from the ratio.)

### Phase 4: Resize Handle Clamp

The resize handle currently clamps to 25–75%:

```tsx
const clamped = Math.min(75, Math.max(25, newRatio));
```

Update so the top section is capped at 50% (bottom min 50%):

```tsx
const clamped = Math.min(50, Math.max(25, newRatio));
```

**Required:** Change the persisted default in `usePersistentState("tomo-today-split-ratio", 70)` to `50` so the default matches the 50/50 split.

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-------------|
| **User preference overwritten** | If we call `setSplitRatio()` when messages grow, we overwrite the user’s manual resize. | Do **not** persist auto-expansion. Use a derived `displayRatio` for rendering only. Keep `splitRatio` as the stored value. |
| **Bottom section too small** | Auto-growing the chat shrinks “What needs your attention” and “Coming up”. | Cap chat at 50% so the bottom always has ≥50%. |
| **Jarring layout jump** | Sudden height change when the 2nd message arrives. | Add a short transition (Phase 3). Optionally use a softer threshold (e.g. 3 messages) or a smaller step. |
| **Extraction complexity** | Moving logic into `TodayListContent` may introduce bugs. | Extract in small steps, run tests after each change. Keep `TomoChatInline` as-is. |
| **SSR / hydration** | `useTomoChat()` may be null during SSR. | Guard with `tomo ?` and default `messageCount` to 0. |

## Alternative: Content-Based Min-Height

Instead of changing the split ratio, we could give the chat container a `min-height` that grows with message count:

```tsx
const chatMinHeight = Math.min(400, 200 + messageCount * 60);
```

This avoids the refactor but can conflict with the flex layout (flex children with `min-height` can behave unexpectedly). The split-ratio approach is more predictable and works with the existing resize handle.

## Summary

| Item | Effort |
|------|--------|
| Extract `TodayListContent` | ~30 min |
| Add `displayRatio` logic | ~15 min |
| Update resize clamp | ~2 min |
| Optional transition | ~10 min |
| **Total** | **~1 hour** |

The change is localized to the Today page and does not affect the drawer, workflows, or other Tomo chat surfaces.
