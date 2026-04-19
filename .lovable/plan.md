

Quick scan: `AppSidebar.tsx` has a "WhatsApp" item under the "Inbox" group pointing to `/whatsapp`. `App.tsx` mounts `WhatsAppPage` at `/whatsapp` outside the normal layout. The `WhatsApp.tsx` page and `src/components/whatsapp/*` components are only used by that page. The Conversations module at `/conversations` is independent and uses its own components in `src/components/conversations/*` — safe to leave untouched. Backend (`wa_messages`, `wa_conversations`, edge functions `whatsapp-send`, `whatsapp-webhook`, `whatsapp-retry-message`, etc.) is shared transport infrastructure used by Conversations too — must stay.

## Plan: Remove standalone WhatsApp sidebar entry

### 1. Sidebar (`src/components/layout/AppSidebar.tsx`)
- Remove the `{ title: "WhatsApp", url: "/whatsapp", icon: MessageCircle }` item from the "Inbox" group. The group keeps "Conversations", so no empty group / spacing issues.
- Drop the now-unused `MessageCircle` icon import only if no other nav item uses it (Templates uses it — keep the import).

### 2. Routing (`src/App.tsx`)
- Replace the `/whatsapp` route with a redirect to `/conversations`:
  ```tsx
  <Route path="/whatsapp" element={<Navigate to="/conversations" replace />} />
  ```
- Remove the `import WhatsAppPage from "./pages/WhatsApp"` line.
- Anyone with a bookmarked `/whatsapp` URL lands cleanly in Conversations.

### 3. Files to delete (only standalone-WhatsApp UI, nothing shared)
- `src/pages/WhatsApp.tsx` — only mounted by the removed route.
- `src/components/whatsapp/*` — verified used only by `WhatsApp.tsx`:
  - `AgentConfigPanel.tsx`, `ChatWindow.tsx`, `ContactInfoPanel.tsx`, `ConversationList.tsx`, `EmojiPicker.tsx`, `MessageSearch.tsx`, `QueuePanel.tsx`, `VoiceNotePlayer.tsx`
- Quick safety check before deletion: grep each file's import path across the repo. If any file outside `src/pages/WhatsApp.tsx` and the `whatsapp/` folder itself imports them, leave that specific file in place.

### 4. Explicitly NOT touched (safety)
- `src/pages/Conversations.tsx` and `src/components/conversations/*` — the unified module.
- `src/components/settings/WhatsAppApiSettings.tsx`, `WhatsAppAgentSettings.tsx`, `WhatsAppAiSettings.tsx`, `WhatsAppNotificationSettings.tsx`, `WhatsAppThemeSettings.tsx` — admin/settings, separate from sidebar nav.
- All `wa_*` tables, RLS, and migrations.
- Edge functions: `whatsapp-send`, `whatsapp-webhook`, `whatsapp-retry-message`, `whatsapp-ai-respond`, `whatsapp-media`, `whatsapp-queue-manager`, `whatsapp-routing-scanner` — all transport/backend, used by Conversations and Channel Integrations.
- `useNotifications`, `useMessageRetry`, `message-status.ts`, channel integration code.

### 5. Files

**Edited**
- `src/components/layout/AppSidebar.tsx` — remove WhatsApp nav item.
- `src/App.tsx` — drop import, convert `/whatsapp` route to `<Navigate>` redirect.

**Deleted**
- `src/pages/WhatsApp.tsx`
- `src/components/whatsapp/` (entire folder, after import-check confirms no external usage)

### 6. Verification after change
- Sidebar "Inbox" group shows only "Conversations" — no gap.
- Visiting `/whatsapp` redirects to `/conversations`.
- Active highlight on `/conversations` still works (logic unchanged).
- No TypeScript errors from dangling imports.

