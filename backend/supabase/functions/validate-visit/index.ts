// Edge Function: validate-visit
// Cliente envía { monument_id, lat, lng, image_tracked }.
// Comprueba server-side que el usuario está dentro del radio del monumento
// y marca la visita como verificada. El trigger SQL otorga las medallas elegibles.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RADIUS_METERS = 75;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type",
  "Access-Control-Max-Age": "86400",
};

interface Payload {
  monument_id: string;
  lat: number;
  lng: number;
  image_tracked: boolean;
}

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { ...CORS_HEADERS, "content-type": "application/json", ...(init.headers ?? {}) },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: CORS_HEADERS });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return jsonResponse({ error: "missing_authorization" }, { status: 401 });

  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: { user }, error: userErr } = await userClient.auth.getUser();
  if (userErr || !user) return jsonResponse({ error: "unauthorized" }, { status: 401 });

  const { monument_id, lat, lng, image_tracked } = (await req.json()) as Payload;
  if (!monument_id || typeof lat !== "number" || typeof lng !== "number") {
    return jsonResponse({ error: "bad_payload" }, { status: 400 });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: geoCheck, error: geoErr } = await admin.rpc("monument_within", {
    p_monument_id: monument_id,
    p_lat: lat,
    p_lng: lng,
    p_radius_m: RADIUS_METERS,
  });
  if (geoErr) return jsonResponse({ error: geoErr.message }, { status: 500 });

  const verified_geo = geoCheck === true;
  const verified_image = !!image_tracked && verified_geo;

  const { error: upsertErr } = await admin
    .from("visits")
    .upsert(
      { user_id: user.id, monument_id, verified_geo, verified_image },
      { onConflict: "user_id,monument_id" },
    );
  if (upsertErr) return jsonResponse({ error: upsertErr.message }, { status: 500 });

  return jsonResponse({ verified_geo, verified_image });
});
