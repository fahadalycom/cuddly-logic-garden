
Let me explore the relevant files to understand current client structure.
<lov-tool-use id="toolu_vrtx_01S1prMbPqNKQdFbq9E5wboo" name="code--exec" integration-id="code" data="{\"command\": \"grep -rn \\\"email\\\" src/pages/Clients.tsx src/pages/ClientProfile.tsx src/pages/NewOrder.tsx src/components/conversations/ConversationContextPanel.tsx 2>/dev/null | head -50\", \"user_facing_description\": \"Scanning client-related files for email references\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01Q4FKXQb3bsUypadFe1D7n5" name="supabase--read_query" integration-id="supabase" data="{\"query\": \"SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name='clients' ORDER BY ordinal_position;\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01W2db5UUwnVrSjeX9pbecCa" name="supabase--read_query" integration-id="supabase" data="{\"query\": \"SELECT count(*) as total, count(email) as with_email, count(DISTINCT phone) as unique_phones, count(*) FILTER (WHERE phone IS NULL) as null_phones FROM public.clients;\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01FuNduorRnNj5hJ3gHEiBp6" name="code--search_files" integration-id="code" data="{\"query\": \"clients?\\\\.\\\\??email|client\\\\.email|client_email|clients\\\\.email\", \"include_patterns\": \"*.ts,*.tsx\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01WGcUjcgz4FMC8vinYwtzU1" name="supabase--read_query" integration-id="supabase" data="{\"query\": \"SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name='clients' ORDER BY ordinal_position;\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_016K5p4u6kVeHZq4s5xqhL9v" name="supabase--read_query" integration-id="supabase" data="{\"query\": \"SELECT count(*) total, count(email) with_email, count(*) FILTER (WHERE phone IS NULL OR phone='') no_phone FROM public.clients;\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01EES8gGxKjuugYBLEN3ZmUJ" name="code--search_files" integration-id="code" data="{\"query\": \"client\\\\.email|clients\\\\.email|\\\\.email\\\\b\", \"include_patterns\": \"src/pages/Clients.tsx,src/pages/ClientProfile.tsx,src/pages/NewOrder.tsx,src/pages/Reminders.tsx,src/pages/Renewals.tsx,src/pages/OldClients.tsx\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01KdvfwUQU7eAnFhuR3ywnbg" name="code--search_files" integration-id="code" data="{\"query\": \"email\", \"include_patterns\": \"src/components/conversations/ConversationContextPanel.tsx,src/lib/template-engine.ts,src/lib/conversations-data.ts\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01UpbFoKpzVbNz6pEvon1hZT" name="code--search_files" integration-id="code" data="{\"include_patterns\": \"src/**/*.ts,src/**/*.tsx,supabase/functions/**/*.ts\", \"query\": \"email\", \"exclude_patterns\": \"src/integrations/supabase/types.ts,src/components/ui/*\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_018vi3en1Qptnz7nqA225Tgs" name="code--view" integration-id="code" data="{\"file_path\": \"src/pages/NewOrder.tsx\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01EbMpKA1cfRjb2sb7zB1VDf" name="code--search_files" integration-id="code" data="{\"include_patterns\": \"supabase/functions/whatsapp-webhook/index.ts,supabase/functions/messenger-webhook/index.ts\", \"query\": \"clients|email|name:\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01PiQoEhcbDG7AqSdAyk6yjd" name="code--view" integration-id="code" data="{\"file_path\": \"src/components/conversations/ConversationContextPanel.tsx\", \"lines\": \"120-150\"}">
</lov-tool-use>
I have enough context. Let me present the plan.

<lov-plan>
## Plan: Remove email from clients only; identify by WhatsApp number with auto-generated names

### Database (migration)
1. Drop `clients.email` column.
2. Make `clients.whatsapp_number` `NOT NULL` and add a `UNIQUE` index.
3. Backfill `whatsapp_number` from `phone` where missing; deduplicate any collisions by archiving older duplicates.
4. Add Postgres function `public.upsert_client_by_whatsapp(_wa text)` that:
   - Normalizes the number,
   - Returns existing client id if found,
   - Otherwise inserts a new client with auto name `Client N` using a sequence (`clients_auto_name_seq`).
5. Update `whatsapp-webhook` insert to call this function instead of inserting `name = customerName || from` (no email, name auto-generated as `Client N`). Same in `messenger-webhook`.

Vendor/staff/profile email is untouched. Only `public.clients.email` is removed.

### Frontend changes
1. **`src/pages/Clients.tsx`** — remove Email column; search now matches `name` + `whatsapp_number`; remove email from row rendering.
2. **`src/pages/ClientProfile.tsx`** — remove Email info card; show only WhatsApp number + Since.
3. **`src/pages/NewOrder.tsx`** — replace Name+Phone form with a single **WhatsApp Number** input. On submit, call the new RPC `upsert_client_by_whatsapp` to get the client id (auto-create if needed). Remove `clientName` state and validation. Pre-invoice uses returned auto name.
4. **`src/components/conversations/ConversationContextPanel.tsx`** — remove the `{ctx.email && ...}` row.
5. **`src/lib/conversations-data.ts` / context mapper** — drop `email` from customer context object (keep type optional but never populated).
6. Any other client-form/dialog references to email: remove (none currently exist outside the above based on grep).

### Out of scope (kept as-is)
- `staff_profiles.email`, `auth.users` email, vendor `contact_email`, invoice `customerEmail`, channel "email", agent panels — untouched.
- `mock-data.ts` provisioning emails (account pool emails, not client emails).

### Verification
- Send a new WhatsApp message from an unknown number → client auto-created as `Client N`, conversation linked, no email anywhere in UI.
- Create order with only a WhatsApp number → existing client linked or new one auto-created.
- Clients list / profile / context panel show no email field.
- Existing clients still load (email column gone, no UI breakage).
