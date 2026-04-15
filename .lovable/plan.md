

# Chat UI Enhancement Plan

## Overview
Polish the ChatWindow component with better visual design, more WhatsApp-native styling, and additional controls to create a richer, more professional chat experience on both mobile and desktop.

## Changes

### 1. Message Bubbles — Visual Refinement
- Add WhatsApp-style green tint for outgoing bubbles (replace current solid primary gradient with a softer teal/green)
- Better message grouping spacing — tighter within groups, more gap between different senders
- Forwarded message label support (small italic "Forwarded" text above content)
- Improve reply-to quote styling with colored accent bar and rounded corners
- Character count indicator when message exceeds 500 chars (subtle counter near send button)

### 2. Mobile Header — Cleaner & More Native
- Add teal/green gradient accent to header background matching WhatsApp style
- Show conversation status badge inline (active/waiting/resolved) instead of just online dot
- Improve avatar with gradient ring for active conversations
- Add search icon to mobile chat header for in-chat message search

### 3. Input Area — Richer Controls
- Add emoji picker button (popover with grid of common emojis — ~40 popular ones in categories)
- Add template shortcut button visible on mobile (small FileText icon next to attach)
- Better visual separation between attach menu items with colored icon backgrounds
- Show "typing..." indicator animation above input when user is composing
- Improve recording UI with smoother waveform animation

### 4. Desktop Chat — Enhanced Layout
- Better AI suggestions panel with card-style layout and clearer approve/reject actions
- Add keyboard shortcut hints in tooltips (Ctrl+Enter to send, Esc to cancel reply, / for templates)
- Improve empty state design with animated illustration
- Add unread message divider ("X unread messages" separator in message list)

### 5. Message Actions — Better UX
- Improve mobile long-press menu with larger touch targets and smoother animation
- Add "Forward" option to message actions
- Desktop hover actions: show in a floating pill that appears smoothly
- Better reaction picker with recent/frequently used section

### 6. CSS Polish
- Refine `.wa-chat-bg` pattern to be more subtle and WhatsApp-like
- Add `.wa-typing-dots` animation (3 bouncing dots)
- Improve bubble tail shapes to look more natural
- Add smooth scroll-to-bottom transition

## Files to Edit
1. `src/components/whatsapp/ChatWindow.tsx` — All bubble, header, input, and action improvements
2. `src/index.css` — Typing dots animation, refined chat background, bubble tail polish

## Priority Order
1. Emoji picker + input area polish (most user-facing impact)
2. Message bubble visual refinement (green tint outgoing, better grouping)
3. Mobile header improvements (gradient, status, search)
4. Desktop enhancements (keyboard hints, AI panel, unread divider)
5. Message actions UX (forward, better long-press)
6. CSS animations and micro-interactions

