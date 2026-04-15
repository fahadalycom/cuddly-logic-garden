
Goal: Make WhatsApp a standalone, immersive section of the app so opening `/whatsapp` hides the main system shell completely and shows only the WhatsApp interface.

What I found
- `/whatsapp` is currently rendered inside `AppLayout`, so the global sidebar, top header, and page padding still exist at the routing level.
- The current mobile fullscreen behavior is mostly done with overlays/z-index inside `WhatsApp.tsx` and `ChatWindow.tsx`, which is why the shell still leaks conceptually and visually.
- The clean fix is architectural: WhatsApp should live outside the main app shell, not fight it with CSS.

Implementation plan

1. Move WhatsApp out of the main app shell
- Update `src/App.tsx` so `/whatsapp` becomes its own protected route instead of being nested under `<AppLayout />`.
- Keep authentication/permission protection, but render WhatsApp directly without the global layout wrapper.
- Result: no sidebar, no app header, no main content padding, no shell chrome at all.

2. Make WhatsApp its own full-screen workspace
- Refine `src/pages/WhatsApp.tsx` so the page itself owns the full viewport on all screen sizes.
- Use a dedicated root container with full viewport sizing (`fixed inset-0` / `min-h-[100dvh]`) and internal panels only.
- Remove any remaining layout assumptions that were compensating for AppLayout spacing.

3. Make mobile chat truly 100% immersive
- Ensure that when a conversation opens on mobile, only the chat screen is visible.
- Keep just WhatsApp-native controls inside the chat header (back, notifications, chat identity).
- No tabs, no external menus, no website navigation, no app-level UI while a chat is open.

4. Keep WhatsApp navigation inside WhatsApp only
- The conversation list, queue, agents, search, and chat should all remain inside the WhatsApp workspace.
- On mobile:
  - list view = full-screen WhatsApp inbox
  - chat view = full-screen WhatsApp chat
- On desktop:
  - WhatsApp still fills the whole screen, but can keep its own internal split layout.

5. Clean up shell-vs-overlay logic
- Remove reliance on “cover the app with a higher z-index” as the main strategy.
- Keep only the viewport-safe behavior needed for mobile stability and safe areas.
- This makes the experience more robust and easier to maintain.

Files to update
- `src/App.tsx` — move `/whatsapp` outside `AppLayout`
- `src/pages/WhatsApp.tsx` — make WhatsApp the full-screen root workspace
- `src/components/whatsapp/ChatWindow.tsx` — ensure mobile opened chat stays fully immersive and self-contained
- Possibly `src/components/layout/AppLayout.tsx` only if minor route-specific cleanup is still needed

Technical details
```text
Current:
ProtectedRoute
└── AppLayout
    ├── Sidebar
    ├── Header
    └── /whatsapp

Target:
ProtectedRoute
├── AppLayout
│   └── all normal app pages
└── WhatsAppPage
    └── full-screen WhatsApp workspace
```

Expected result
- Clicking WhatsApp opens a dedicated full-screen interface.
- No main sidebar/header/navigation is visible.
- Mobile chat opens as a completely immersive chat screen.
- WhatsApp behaves like a separate system section, not like a normal page inside the website.
