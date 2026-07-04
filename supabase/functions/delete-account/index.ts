// NutriSync — full account deletion (GDPR erasure, backlog D4)
// Supabase Edge Function (Deno). Deletes the caller's data rows AND their auth
// identity. Uses the service_role key, which lives ONLY here on the server and
// is NEVER shipped to the app.
//
// Deploy:  supabase functions deploy delete-account
// (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically by the
//  Supabase Edge runtime — no manual secrets needed.)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const USER_TABLES = [
  "meal_logs", "daily_scores", "nutrition_checklist", "movement_checklist",
  "daily_logs", "cycles", "user_phase_averages",
];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  try {
    // 1. Identify the caller from their access token
    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "").trim();
    if (!token) return json({ error: "missing token" }, 401);

    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData?.user) return json({ error: "invalid token" }, 401);
    const uid = userData.user.id;

    // 2. Delete all user-owned data (authoritative, bypasses RLS via service role)
    for (const t of USER_TABLES) {
      await admin.from(t).delete().eq("user_id", uid);
    }
    await admin.from("users").delete().eq("id", uid);

    // 3. Delete the auth identity itself — the part the app cannot do
    const { error: delErr } = await admin.auth.admin.deleteUser(uid);
    if (delErr) return json({ error: delErr.message }, 500);

    return json({ ok: true, deleted: uid });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
