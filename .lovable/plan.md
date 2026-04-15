

# WhatsApp Mobile Full-Screen Layout Overhaul

## Problem
On mobile, the WhatsApp page still shows inside the AppLayout wrapper (header, sidebar padding). Both the conversation list and chat window need to be truly full-screen — covering the entire viewport with no app chrome visible.

## Current State
- **Conversation list**: Uses `fixed inset-0 z-40` but the AppLayout header is `z-30` — it overlays but still has visual weight from padding
- **Chat window**: Uses `fixed inset-0 z-[100]` with `absolute inset-0` inside — works but layout can still shift
- **AppLayout**: Always renders a `h-16` header + `p-5` padding around content, even on mobile WhatsApp

## Plan

### 1. Make WhatsApp page bypass AppLayout padding on mobile
- On mobile, the WhatsApp page should render as a `fixed inset-0` overlay at a z-index above the AppLayout header (`z-30`)
- Both conversation list AND chat views should be full-screen, edge-to-edge
- Ensure `z-[100]` on both views so sidebar/header are completely hidden

### 2. Improve conversation list full-screen layout
- Full viewport height with proper safe-area padding (notch, home indicator)
- WhatsApp-style header: green accent, clean title, search + notification icons
- Remove any extra padding that wastes screen space
- Make conversation items taller with better touch targets (min 72px)

### 3. Improve chat window full-screen layout
- Ensure header, messages, and input are locked to viewport edges using flex column with `flex-shrink-0` for header/input and `flex-1 min-h-0 overflow-y-auto` for messages
- Header: back button, avatar, name/status, notification toggle, more menu — compact single row
- Input bar: proper safe-area-inset-bottom, rounded textarea, attach/send/mic buttons
- Messages area: full remaining space, smooth scroll, `overscroll-contain`
- Scroll-to-bottom button positioned relative to input bar

### 4. Mobile long-press actions fix
- Use `bottom-full` positioning instead of `-top-14` to prevent action sheet from going off-screen at the top

## Files to Edit
1. **`src/pages/WhatsApp.tsx`** — Both mobile views use `fixed inset-0 z-[100]` consistently; remove redundant wrappers
2. **`src/components/whatsapp/ChatWindow.tsx`** — Solidify the flex-column layout; polish header/input/messages spacing; fix long-press positioning

## Technical Approach
```text
Mobile Conversation List:          Mobile Chat:
┌─────────────────────────┐       ┌─────────────────────────┐
│ fixed inset-0 z-[100]   │       │ fixed inset-0 z-[100]   │
│ ┌─────────────────────┐ │       │ ┌─────────────────────┐ │
│ │ Header (shrink-0)   │ │       │ │ Header (shrink-0)   │ │
│ │ Tabs (shrink-0)     │ │       │ ├─────────────────────┤ │
│ ├─────────────────────┤ │       │ │ Messages (flex-1)   │ │
│ │ List (flex-1)       │ │       │ │ overflow-y-auto     │ │
│ │ overflow-y-auto     │ │       │ ├─────────────────────┤ │
│ │                     │ │       │ │ Input (shrink-0)    │ │
│ │                     │ │       │ │ + safe-area-bottom  │ │
│ └─────────────────────┘ │       │ └─────────────────────┘ │
└─────────────────────────┘       └─────────────────────────┘
```

Both views will be fully edge-to-edge, covering the entire mobile viewport with no app header or sidebar visible.

