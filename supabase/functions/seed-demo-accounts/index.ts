import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Get first 3 active employees
    const { data: employees } = await supabase
      .from("employees")
      .select("id, first_name, last_name, email, branch_id")
      .eq("status", "active")
      .limit(3);

    if (!employees || employees.length < 3) {
      throw new Error("Need at least 3 active employees for demo accounts");
    }

    const demoAccounts = [
      { email: "admin@hris.com", password: "Admin@123", role: "admin" },
      { email: "leader@hris.com", password: "Leader@123", role: "leader" },
      { email: "employee@hris.com", password: "Employee@123", role: "employee" },
    ];

    const results: any[] = [];

    for (let i = 0; i < demoAccounts.length; i++) {
      const { email, password, role } = demoAccounts[i];
      const emp = employees[i];

      try {
        // Create auth user
        const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        });

        if (authErr) throw authErr;

        // Create user_account
        const { data: uaData, error: uaErr } = await supabase
          .from("user_accounts")
          .insert({
            user_id: authData.user.id,
            employee_id: emp.id,
            branch_id: emp.branch_id,
            role,
            device_type: "web",
            is_active: true,
          })
          .select();

        if (uaErr) throw uaErr;

        results.push({
          email,
          role,
          employee: `${emp.first_name} ${emp.last_name}`,
          success: true,
        });
      } catch (err: any) {
        // User might already exist
        if (err.message?.includes("already exists")) {
          results.push({
            email,
            role,
            success: false,
            error: "User already exists",
          });
        } else {
          throw err;
        }
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
