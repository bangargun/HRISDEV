import { createClient } from "npm:@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname.replace("/hr-api", "").replace("/functions/v1/hr-api", "");

    // Route: GET /tables/:table - fetch all rows
    // Route: GET /tables/:table/:id - fetch single row
    // Route: POST /tables/:table - insert row
    // Route: PUT /tables/:table/:id - update row
    // Route: DELETE /tables/:table/:id - delete row

    const tableMatch = path.match(/^\/tables\/([^/]+)(?:\/([^/]+))?$/);
    if (!tableMatch) {
      return new Response(JSON.stringify({ error: "Invalid path. Use /tables/:table or /tables/:table/:id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const table = tableMatch[1];
    const id = tableMatch[2];

    // Allowed tables whitelist
    const allowedTables = [
      "departments", "positions", "employees", "attendance",
      "leave_types", "leave_requests", "salary_components",
      "employee_salaries", "salary_formulas", "salary_formula_components",
      "trainings", "training_enrollments", "branches",
      "user_accounts", "permissions", "role_permissions", "user_permissions",
    ];

    if (!allowedTables.includes(table)) {
      return new Response(JSON.stringify({ error: `Table '${table}' not allowed` }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "GET") {
      const params = Object.fromEntries(url.searchParams.entries());

      if (id) {
        const { data, error } = await supabase.from(table).select("*").eq("id", id).maybeSingle();
        if (error) throw error;
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let query = supabase.from(table).select(params.select || "*");

      // Apply filters from query params
      for (const [key, value] of url.searchParams.entries()) {
        if (key === "select") continue;
        if (key.endsWith("_eq")) {
          query = query.eq(key.replace("_eq", ""), value);
        } else if (key.endsWith("_neq")) {
          query = query.neq(key.replace("_neq", ""), value);
        } else if (key.endsWith("_gt")) {
          query = query.gt(key.replace("_gt", ""), value);
        } else if (key.endsWith("_gte")) {
          query = query.gte(key.replace("_gte", ""), value);
        } else if (key.endsWith("_lt")) {
          query = query.lt(key.replace("_lt", ""), value);
        } else if (key.endsWith("_lte")) {
          query = query.lte(key.replace("_lte", ""), value);
        } else if (key.endsWith("_like")) {
          query = query.like(key.replace("_like", ""), value);
        } else if (key.endsWith("_in")) {
          query = query.in(key.replace("_in", ""), value.split(","));
        } else if (key.endsWith("_is")) {
          query = query.is(key.replace("_is", ""), value === "null" ? null : value);
        } else if (key.endsWith("_not")) {
          query = query.not(key.replace("_not", ""), "eq", value);
        } else if (key === "order") {
          const parts = value.split(".");
          if (parts.length === 2) {
            query = query.order(parts[0], { ascending: parts[1] === "asc" });
          } else {
            query = query.order(value, { ascending: true });
          }
        } else if (key === "limit") {
          query = query.limit(Number(value));
        } else if (key === "filter") {
          // Custom filter: filter=branch_id.eq.value
          const filterParts = value.split(".");
          if (filterParts.length >= 3) {
            query = query.filter(filterParts[0], filterParts[1], filterParts.slice(2).join("."));
          }
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "POST") {
      const body = await req.json();
      const { data, error } = await supabase.from(table).insert(body).select();
      if (error) throw error;
      return new Response(JSON.stringify(data), {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "PUT" || req.method === "PATCH") {
      if (!id) {
        return new Response(JSON.stringify({ error: "ID required for update" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const body = await req.json();
      const { data, error } = await supabase.from(table).update(body).eq("id", id).select();
      if (error) throw error;
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "DELETE") {
      if (!id) {
        return new Response(JSON.stringify({ error: "ID required for delete" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
