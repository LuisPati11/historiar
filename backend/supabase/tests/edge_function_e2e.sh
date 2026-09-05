#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../.."

task_status_json=$(supabase status -o json 2>/dev/null)
task_api_url=$(jq -er '.API_URL' <<<"$task_status_json")
task_function_url="$(jq -er '.FUNCTIONS_URL // (.API_URL + "/functions/v1")' <<<"$task_status_json")/validate-visit"
task_public_key=$(jq -er '.PUBLISHABLE_KEY // .ANON_KEY' <<<"$task_status_json")
task_secret_key=$(jq -er '.SECRET_KEY // .SERVICE_ROLE_KEY' <<<"$task_status_json")
task_tmp_dir=$(mktemp -d)
task_user_id=""
task_email="edge-e2e-$(date +%s)-$RANDOM@example.test"
task_password="CorrectHorseBattery9!"

cleanup() {
  if [[ -n "${task_function_pid:-}" ]] && kill -0 "$task_function_pid" 2>/dev/null; then
    kill "$task_function_pid" 2>/dev/null || true
    wait "$task_function_pid" 2>/dev/null || true
  fi
  if [[ -n "$task_user_id" ]]; then
    curl -sS -o /dev/null -X DELETE "$task_api_url/auth/v1/admin/users/$task_user_id" \
      -H "apikey: $task_secret_key" \
      -H "Authorization: Bearer $task_secret_key" || true
  fi
  rm -rf "$task_tmp_dir"
}
trap cleanup EXIT

assert_status() {
  local expected=$1
  local actual=$2
  local label=$3
  if [[ "$actual" != "$expected" ]]; then
    echo "$label: expected HTTP $expected, received $actual" >&2
    cat "$task_tmp_dir/functions.log" >&2
    exit 1
  fi
}

supabase functions serve >"$task_tmp_dir/functions.log" 2>&1 &
task_function_pid=$!

task_ready=false
for _ in {1..30}; do
  task_status=$(curl -sS -o /dev/null -w '%{http_code}' -X OPTIONS "$task_function_url" || true)
  if [[ "$task_status" == "204" ]]; then
    task_ready=true
    break
  fi
  sleep 1
done
if [[ "$task_ready" != "true" ]]; then
  echo "validate-visit did not become ready" >&2
  cat "$task_tmp_dir/functions.log" >&2
  exit 1
fi

task_status=$(curl -sS -o /dev/null -w '%{http_code}' "$task_function_url")
assert_status 401 "$task_status" "unauthenticated request"

task_admin_payload=$(jq -cn --arg email "$task_email" --arg password "$task_password" '{
  email: $email,
  password: $password,
  email_confirm: true,
  user_metadata: {username: "Edge E2E", avatar: "sancho", locale: "en"}
}')
task_admin_body=$(curl -sS --fail-with-body -X POST "$task_api_url/auth/v1/admin/users" \
  -H "apikey: $task_secret_key" \
  -H "Authorization: Bearer $task_secret_key" \
  -H 'Content-Type: application/json' \
  --data "$task_admin_payload")
task_user_id=$(jq -er '.id' <<<"$task_admin_body")

task_token_payload=$(jq -cn --arg email "$task_email" --arg password "$task_password" '{email: $email, password: $password}')
task_token_body=$(curl -sS --fail-with-body -X POST "$task_api_url/auth/v1/token?grant_type=password" \
  -H "apikey: $task_public_key" \
  -H 'Content-Type: application/json' \
  --data "$task_token_payload")
task_access_token=$(jq -er '.access_token' <<<"$task_token_body")
task_auth_headers=(-H "apikey: $task_public_key" -H "Authorization: Bearer $task_access_token")

task_status=$(curl -sS -o /dev/null -w '%{http_code}' "$task_function_url" "${task_auth_headers[@]}")
assert_status 405 "$task_status" "unsupported method"

task_status=$(curl -sS -o /dev/null -w '%{http_code}' -X POST "$task_function_url" \
  "${task_auth_headers[@]}" -H 'Content-Type: application/json-invalid' --data '{}')
assert_status 415 "$task_status" "invalid JSON media type"

task_large_body=$(printf '%2049s' '')
task_status=$(curl -sS -o /dev/null -w '%{http_code}' -X POST "$task_function_url" \
  "${task_auth_headers[@]}" -H 'Content-Type: application/json' \
  -H 'Transfer-Encoding: chunked' --data-binary "$task_large_body")
assert_status 413 "$task_status" "oversized chunked payload"

task_status=$(curl -sS -o /dev/null -w '%{http_code}' -X POST "$task_function_url" \
  "${task_auth_headers[@]}" -H 'Content-Type: application/json' \
  --data '{"action":"start","monument_id":"11111111-1111-1111-8111-111111111111","lat":38.9863,"lng":-3.9286,"user_id":"injected"}')
assert_status 400 "$task_status" "unexpected payload field"

task_status=$(curl -sS -o /dev/null -w '%{http_code}' -X POST "$task_function_url" \
  "${task_auth_headers[@]}" -H 'Content-Type: application/json' \
  --data '{"action":"start","monument_id":"11111111-1111-1111-8111-111111111111","lat":0,"lng":0}')
assert_status 403 "$task_status" "outside geofence"

task_start_body=$(curl -sS --fail-with-body -X POST "$task_function_url" \
  "${task_auth_headers[@]}" -H 'Content-Type: application/json' \
  --data '{"action":"start","monument_id":"11111111-1111-1111-8111-111111111111","lat":38.9863,"lng":-3.9286}')
task_attempt_id=$(jq -er 'select(.verified_geo == true) | .attempt_id' <<<"$task_start_body")

task_complete_payload=$(jq -cn --arg attempt_id "$task_attempt_id" '{
  action: "complete",
  attempt_id: $attempt_id,
  monument_id: "11111111-1111-1111-8111-111111111111",
  lat: 38.9863,
  lng: -3.9286,
  image_tracked: true
}')
task_complete_body=$(curl -sS --fail-with-body -X POST "$task_function_url" \
  "${task_auth_headers[@]}" -H 'Content-Type: application/json' \
  --data "$task_complete_payload")
jq -e '.verified_geo == true and .verified_image == true' <<<"$task_complete_body" >/dev/null

task_status=$(curl -sS -o /dev/null -w '%{http_code}' -X POST "$task_function_url" \
  "${task_auth_headers[@]}" -H 'Content-Type: application/json' \
  --data "$task_complete_payload")
assert_status 409 "$task_status" "replayed challenge"

task_visit_count=$(curl -sS --fail-with-body \
  "$task_api_url/rest/v1/visits?select=id&user_id=eq.$task_user_id&verified_geo=is.true&verified_image=is.true" \
  "${task_auth_headers[@]}" | jq 'length')
if [[ "$task_visit_count" != "1" ]]; then
  echo "expected exactly one verified visit, received $task_visit_count" >&2
  exit 1
fi

echo "validate-visit end-to-end: PASS"
