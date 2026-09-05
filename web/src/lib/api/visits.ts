import { supabase } from "../supabaseClient";
import {
  isSuccessfulVisitVerification,
  isVisitVerificationAttempt,
  type SuccessfulVisitVerification,
  type VisitVerificationAttempt,
} from "../visitVerification";

export type { VisitVerificationAttempt } from "../visitVerification";

export async function startVisitVerification(
  monumentId: string,
  lat: number,
  lng: number,
): Promise<VisitVerificationAttempt | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const { data, error } = await supabase.functions.invoke("validate-visit", {
    body: { action: "start", monument_id: monumentId, lat, lng },
  });
  if (error) throw error;
  if (!isVisitVerificationAttempt(data)) throw new Error("Invalid visit verification response");
  return data;
}

export async function completeVisitVerification(
  attemptId: string,
  monumentId: string,
  lat: number,
  lng: number,
): Promise<SuccessfulVisitVerification> {
  const { data, error } = await supabase.functions.invoke("validate-visit", {
    body: {
      action: "complete",
      attempt_id: attemptId,
      monument_id: monumentId,
      lat,
      lng,
      image_tracked: true,
    },
  });
  if (error) throw error;
  if (!isSuccessfulVisitVerification(data)) throw new Error("Invalid visit verification response");
  return data;
}
