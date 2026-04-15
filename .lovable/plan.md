

# Chat Interface — Modern & Elegant Redesign

## Overview
Complete visual overhaul of the ChatWindow to transform it from basic to a polished, premium chat experience with modern design patterns, especially on mobile.

## Changes

### 1. Mobile Header — Premium Redesign
- Replace flat header with a rich gradient header (subtle teal-to-dark gradient like WhatsApp)
- Larger avatar with gradient border ring and animated online pulse
- Bolder typography for contact name, refined status line
- Action buttons with glassmorphism background pills instead of bare icons
- Add a subtle bottom shadow/blur for depth separation from messages

### 2. Message Bubbles — Elevated Design
- Outgoing bubbles: richer gradient with subtle inner shadow for depth
- Incoming bubbles: softer card style with left accent border for visual grouping
- Better border-radius pattern: rounded corners except where the tail connects (like native WhatsApp)
- Time + read receipts in a more elegant inline layout with subtle separator
- AI bot messages: distinctive card with gradient border and sparkle accent
- Larger touch targets for reactions on mobile
- Add subtle entrance animation per bubble (staggered slide-up)

### 3. Input Area — Complete Overhaul (Mobile)
- Redesign as a floating bottom bar with rounded container and glassmorphism
- Group emoji/attach/template buttons into a sleek icon row above the text input (or collapsible toolbar)
- Larger, more tactile send button with gradient and shadow
- Recording UI: full-width animated waveform with slide-to-cancel gesture hint
- Reply preview: more prominent card with colored left strip and avatar
- Add smooth height animation when textarea grows

### 4. Input Area — Desktop Polish
- Cleaner layout with better spacing
- Input field with subtle inner shadow and smooth focus transition
- Better visual hierarchy for action buttons

### 5. Mobile Long-Press Actions — Sheet Style
- Replace the small floating popup with a proper bottom sheet overlay
- Larger emoji reaction row with bounce animation
- Action items as full-width list items with icons and descriptions
- Smooth spring animation for sheet entrance

### 6. Empty State — Beautiful Illustration
- Animated gradient background orb
- Better copy and call-to-action hints
- Subtle floating animation

### 7. Scroll-to-Bottom FAB
- Add unread message count badge on the scroll button
- Smoother entrance/exit animation
- Better shadow and positioning

### 8. Templates Dialog — Mobile Bottom Sheet
- On mobile, render templates as a slide-up bottom sheet instead of centered dialog
- Category filter chips at top
- Better card design for each template

## Files to Edit
1. `src/components/whatsapp/ChatWindow.tsx` — All component changes
2. `src/index.css` — New utility classes for gradients, glassmorphism, bottom sheet animations
3. `src/components/whatsapp/EmojiPicker.tsx` — Larger grid, better mobile UX

## Priority
1. Mobile header + input bar (biggest visual impact)
2. Message bubble styling
3. Long-press bottom sheet
4. Empty state + scroll FAB
5. Templates bottom sheet
6. Desktop polish

