

# WhatsApp Mobile Chat Layout — Complete Fix & Polish

## Problem
The mobile chat screen overflows the viewport (header/input shift off-screen). The CSS Grid approach with `auto 1fr auto` rows isn't reliably constraining the layout in mobile/iframe contexts. Multiple UI polish items remain.

## Root Cause
- The `ChatWindow` uses CSS Grid on mobile but the parent in `WhatsApp.tsx` uses `fixed inset-0` with `100dvh` — the grid `height: 100%` works, but the message area's `flex-1 min-h-0` doesn't interact well with grid rows, and `overscroll-contain` can cause bounce issues.
- The scroll-to-bottom button position (`bottom-[72px]`) may misalign with actual input height.

## Plan

### 1. Rewrite ChatWindow mobile layout to use absolute positioning
Replace the grid/flex hybrid with a simple, bulletproof structure:
- **Header**: `absolute top-0 left-0 right-0` with known height
- **Input area**: `absolute bottom-0 left-0 right-0` with safe-area padding
- **Messages area**: `absolute` filling the space between header and input using `top-[header-height] bottom-[input-height]` with `overflow-y: auto`
- This eliminates all flex/grid height calculation issues

### 2. Fix WhatsApp.tsx mobile wrapper
- Keep `fixed inset-0 z-[100]` with `height: 100dvh`
- Remove any conflicting flex-col from the container since ChatWindow will self-position

### 3. Mobile UI polish improvements
- **Header**: Compact to ~56px, tighter spacing, larger touch targets
- **Message bubbles**: Slightly wider `max-w-[85vw]`, better padding
- **Input bar**: Ensure 44px minimum touch target, proper safe-area-inset-bottom
- **Scroll-to-bottom button**: Position dynamically relative to the fixed input bar
- **AI suggestions bar**: Collapse to single-line swipeable on mobile, `flex-shrink-0`
- **Reply preview**: More compact on mobile
- **Long-press actions**: Position smarter to avoid going off-screen (use `bottom-full` instead of `-top-14`)
- **Empty state**: Center properly in the absolute-positioned messages area
- **Conversation list**: Increase tap area, ensure smooth scrolling

### 4. ConversationList minor polish
- Ensure assigned agent name displays with proper truncation
- Better unread badge sizing on mobile

## Files to Edit
1. `src/components/whatsapp/ChatWindow.tsx` — Major mobile layout rewrite (absolute positioning), UI polish
2. `src/pages/WhatsApp.tsx` — Simplify mobile chat wrapper

## Technical Approach
```text
┌──────────────────────────┐ fixed inset-0
│  Header (absolute top)   │ ~56px
├──────────────────────────┤
│                          │
│  Messages (absolute)     │ top:56px bottom:60px
│  overflow-y: auto        │
│                          │
├──────────────────────────┤
│  Input (absolute bottom) │ ~60px + safe-area
└──────────────────────────┘
```

This approach is immune to flex/grid sizing bugs and works reliably in iframes, mobile browsers, and PWA contexts.

