import { createClient } from "@supabase/supabase-js";
import { PayloadTooLargeError, readJsonBody } from "./body.ts";
import {
  isCompletePayload,
  isStartPayload,
  isVerificationAttempt,
  MAX_BODY_BYTES,
  RADIUS_METERS,
} from "./validation.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, apikey, x-client-info, content-type",
  "Access-Control-Max-Age": "86400",
};

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      ...CORS_HEADERS,
      "cache-control": "no-store",
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "method_not_allowed" }, { status: 405 });
  }
  if (
    req.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !==
      "application/json"
  ) {
    return jsonResponse({ error: "unsupported_media_type" }, { status: 415 });
  }

  const contentLength = Number(req.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return jsonResponse({ error: "payload_too_large" }, { status: 413 });
  }

  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    return jsonResponse({ error: "missing_authorization" }, { status: 401 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    console.error("validate-visit: missing Supabase environment variables");
    return jsonResponse({ error: "server_misconfigured" }, { status: 500 });
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error: userError } = await userClient.auth.getUser();
  if (userError || !user) {
    return jsonResponse({ error: "unauthorized" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await readJsonBody(req);
  } catch (error) {
    if (error instanceof PayloadTooLargeError) {
      return jsonResponse({ error: "payload_too_large" }, { status: 413 });
    }
    return jsonResponse({ error: "invalid_json" }, { status: 400 });
  }

  if (!isStartPayload(payload) && !isCompletePayload(payload)) {
    return jsonResponse({ error: "bad_payload" }, { status: 400 });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: isWithinRadius, error: geoError } = await admin.rpc(
    "monument_within",
    {
      p_monument_id: payload.monument_id,
      p_lat: payload.lat,
      p_lng: payload.lng,
      p_radius_m: RADIUS_METERS,
    },
  );
  if (geoError) {
    console.error("validate-visit: geofence query failed", geoError);
    return jsonResponse({ error: "verification_failed" }, { status: 500 });
  }
  if (isWithinRadius !== true) {
    return jsonResponse({ verified_geo: false, verified_image: false }, {
      status: 403,
    });
  }

  if (payload.action === "start") {
    const { data: attempt, error: insertError } = await admin
      .rpc("start_visit_verification", {
        p_user_id: user.id,
        p_monument_id: payload.monument_id,
      })
      .maybeSingle();
    if (insertError) {
      console.error("validate-visit: attempt creation failed", insertError);
      return jsonResponse({ error: "verification_failed" }, { status: 500 });
    }
    if (!attempt) {
      return jsonResponse({ error: "too_many_attempts" }, { status: 429 });
    }
    if (!isVerificationAttempt(attempt)) {
      console.error("validate-visit: malformed attempt response");
      return jsonResponse({ error: "verification_failed" }, { status: 500 });
    }
    return jsonResponse({
      attempt_id: attempt.attempt_id,
      expires_at: attempt.attempt_expires_at,
      verified_geo: true,
    });
  }

  const { data: completed, error: completeError } = await admin.rpc(
    "complete_visit_verification",
    {
      p_attempt_id: payload.attempt_id,
      p_user_id: user.id,
      p_monument_id: payload.monument_id,
    },
  );
  if (completeError) {
    console.error("validate-visit: completion failed", completeError);
    return jsonResponse({ error: "verification_failed" }, { status: 500 });
  }
  if (completed !== true) {
    return jsonResponse({ error: "attempt_expired_or_used" }, { status: 409 });
  }

  return jsonResponse({ verified_geo: true, verified_image: true });
});
