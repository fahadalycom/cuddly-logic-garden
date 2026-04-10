import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const DEMO_USERS = [
  { email: "admin@demo.com", password: "Demo@1234", role: "admin", name: "Admin User" },
  { email: "sales@demo.com", password: "Demo@1234", role: "sales_rep", name: "Sales Rep" },
  { email: "support@demo.com", password: "Demo@1234", role: "support_expert", name: "Support Expert" },
  { email: "crm@demo.com", password: "Demo@1234", role: "client_relation_manager", name: "CRM Manager" },
  { email: "accountant@demo.com", password: "Demo@1234", role: "accountant", name: "Accountant" },
  { email: "creator@demo.com", password: "Demo@1234", role: "accounts_creator", name: "Accounts Creator" },
];

Deno.serve(async () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const results = [];

  for (const user of DEMO_USERS) {
    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: { full_name: user.name },
    });

    if (authError) {
      results.push({ email: user.email, error: authError.message });
      continue;
    }

    // Assign role
    const { error: roleError } = await supabase
      .from("user_roles")
      .insert({ user_id: authData.user.id, role: user.role });

    results.push({
      email: user.email,
      role: user.role,
      success: !roleError,
      error: roleError?.message,
    });
  }

  return new Response(JSON.stringify({ results }, null, 2), {
    headers: { "Content-Type": "application/json" },
  });
});
