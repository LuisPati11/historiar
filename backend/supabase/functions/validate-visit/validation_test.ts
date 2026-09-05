import { strict as assert } from "node:assert";
import {
  isCompletePayload,
  isStartPayload,
  isVerificationAttempt,
} from "./validation.ts";

const MONUMENT_ID = "00000000-0000-4000-8000-000000000001";
const ATTEMPT_ID = "00000000-0000-4000-8000-000000000002";

Deno.test("accepts a valid start payload", () => {
  assert.equal(
    isStartPayload({
      action: "start",
      monument_id: MONUMENT_ID,
      lat: 38.986,
      lng: -3.927,
    }),
    true,
  );
});

Deno.test("accepts coordinate boundaries", () => {
  assert.equal(
    isStartPayload({
      action: "start",
      monument_id: MONUMENT_ID,
      lat: -90,
      lng: 180,
    }),
    true,
  );
});

Deno.test("rejects invalid or non-finite coordinates", () => {
  for (
    const [lat, lng] of [[91, 0], [-91, 0], [0, 181], [0, -181], [
      Number.NaN,
      0,
    ], [0, Number.POSITIVE_INFINITY]]
  ) {
    assert.equal(
      isStartPayload({ action: "start", monument_id: MONUMENT_ID, lat, lng }),
      false,
    );
  }
});

Deno.test("rejects malformed UUIDs and arrays", () => {
  assert.equal(
    isStartPayload({
      action: "start",
      monument_id: "not-a-uuid",
      lat: 0,
      lng: 0,
    }),
    false,
  );
  assert.equal(isStartPayload([]), false);
});

Deno.test("rejects unexpected start fields", () => {
  assert.equal(
    isStartPayload({
      action: "start",
      monument_id: MONUMENT_ID,
      lat: 0,
      lng: 0,
      user_id: ATTEMPT_ID,
    }),
    false,
  );
});

Deno.test("accepts a valid completion payload", () => {
  assert.equal(
    isCompletePayload({
      action: "complete",
      attempt_id: ATTEMPT_ID,
      monument_id: MONUMENT_ID,
      lat: 38.986,
      lng: -3.927,
      image_tracked: true,
    }),
    true,
  );
});

Deno.test("completion requires literal image tracking confirmation", () => {
  const base = {
    action: "complete",
    attempt_id: ATTEMPT_ID,
    monument_id: MONUMENT_ID,
    lat: 0,
    lng: 0,
  };
  assert.equal(isCompletePayload({ ...base, image_tracked: false }), false);
  assert.equal(isCompletePayload({ ...base, image_tracked: "true" }), false);
  assert.equal(isCompletePayload(base), false);
});

Deno.test("completion rejects mismatched and extra identifiers", () => {
  const base = {
    action: "complete",
    attempt_id: "00000000-0000-0000-0000-000000000000",
    monument_id: MONUMENT_ID,
    lat: 0,
    lng: 0,
    image_tracked: true,
  };
  assert.equal(isCompletePayload(base), false);
  assert.equal(
    isCompletePayload({ ...base, attempt_id: ATTEMPT_ID, user_id: ATTEMPT_ID }),
    false,
  );
});

Deno.test("accepts only well-formed verification attempt results", () => {
  assert.equal(
    isVerificationAttempt({
      attempt_id: ATTEMPT_ID,
      attempt_expires_at: "2026-09-04T10:00:00Z",
    }),
    true,
  );
  assert.equal(
    isVerificationAttempt({
      attempt_id: "invalid",
      attempt_expires_at: "2026-09-04T10:00:00Z",
    }),
    false,
  );
  assert.equal(
    isVerificationAttempt({
      attempt_id: ATTEMPT_ID,
      attempt_expires_at: "not-a-date",
    }),
    false,
  );
  assert.equal(isVerificationAttempt(null), false);
});
