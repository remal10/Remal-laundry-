import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const allowedItems = new Set([
  "Bedsheets", "Duvet Cover", "Pillow covers", "Bath towels",
  "Hand Towels", "Face Towels", "Bath Mats", "Bath Robes", "Dusters",
]);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return json({ error: "Server configuration error" }, 500);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const pin = typeof body.pin === "string" ? body.pin.trim() : "";
  const operation = body.operation;
  if (!pin || pin.length > 32) return json({ error: "PIN required" }, 401);
  if (!["list", "create", "delete"].includes(String(operation))) {
    return json({ error: "Unsupported operation" }, 400);
  }

  const db = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Authenticate every request against the staff table; never trust browser localStorage.
  const { data: staffRows, error: staffError } = await db
    .from("laundry_staff")
    .select("id,name,role")
    .eq("pin_code", pin)
    .eq("is_active", true)
    .limit(2);

  if (staffError) return json({ error: "Authentication unavailable" }, 503);
  if (!staffRows || staffRows.length !== 1) return json({ error: "Invalid PIN" }, 401);
  const staff = staffRows[0];
  const isAdmin = String(staff.role ?? "").trim().toLowerCase() === "admin";

  if (operation === "list") {
    const { data, error } = await db
      .from("linen_control_sheets")
      .select("id,type,location_number,pickup_date,items,status,created_by,created_at,delivery_date")
      .order("created_at", { ascending: false })
      .limit(5);
    if (error) return json({ error: "Could not load linen sheets" }, 500);
    return json({ sheets: data ?? [] });
  }

  // Creation and deletion are restricted to administrators server-side.
  if (!isAdmin) return json({ error: "Administrator PIN required" }, 403);

  if (operation === "create") {
    const type = body.type;
    const location = typeof body.location_number === "string" ? body.location_number.trim() : "";
    const pickupDate = typeof body.pickup_date === "string" ? body.pickup_date : "";
    const rawItems = body.items;
    if (type !== "hotel" && type !== "villa") return json({ error: "Invalid sheet type" }, 400);
    if (!location || location.length > 100) return json({ error: "Invalid location" }, 400);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(pickupDate) || Number.isNaN(Date.parse(pickupDate))) {
      return json({ error: "Invalid pickup date" }, 400);
    }
    if (!rawItems || typeof rawItems !== "object" || Array.isArray(rawItems)) {
      return json({ error: "Invalid items" }, 400);
    }
    const items: Record<string, number> = {};
    for (const [name, qty] of Object.entries(rawItems as Record<string, unknown>)) {
      if (!allowedItems.has(name) || !Number.isInteger(qty) || Number(qty) < 1 || Number(qty) > 10000) {
        return json({ error: "Invalid item quantity" }, 400);
      }
      items[name] = Number(qty);
    }
    if (Object.keys(items).length === 0) return json({ error: "At least one item is required" }, 400);

    const { data, error } = await db
      .from("linen_control_sheets")
      .insert([{
        type,
        location_number: location,
        pickup_date: pickupDate,
        items,
        created_by: `staff ( ${String(staff.name ?? "unknown").slice(0, 80)} )`,
      }])
      .select("id,type,location_number,pickup_date,items,status,created_by,created_at,delivery_date")
      .single();
    if (error) return json({ error: "Could not save linen sheet" }, 500);
    return json({ sheet: data }, 201);
  }

  const sheetId = typeof body.sheet_id === "string" ? body.sheet_id : "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sheetId)) {
    return json({ error: "Invalid sheet ID" }, 400);
  }
  const { error: deleteError, count } = await db
    .from("linen_control_sheets")
    .delete({ count: "exact" })
    .eq("id", sheetId);
  if (deleteError) return json({ error: "Could not delete linen sheet" }, 500);
  if (count === 0) return json({ error: "Sheet not found" }, 404);
  return json({ deleted: true });
});
