import { PayloadTooLargeError, readJsonBody } from "./body.ts";
import { MAX_BODY_BYTES } from "./validation.ts";

function request(chunks: Uint8Array[], cancel = () => {}) {
  return new Request("http://localhost/", {
    method: "POST",
    body: new ReadableStream({
      pull(controller) {
        const chunk = chunks.shift();
        if (chunk) controller.enqueue(chunk);
        else controller.close();
      },
      cancel,
    }),
  });
}

Deno.test("reads JSON with UTF-8 characters split across chunks", async () => {
  const bytes = new TextEncoder().encode('{"name":"España"}');
  const result = await readJsonBody(
    request([...bytes].map((byte) => new Uint8Array([byte]))),
  );
  if (JSON.stringify(result) !== '{"name":"España"}') {
    throw new Error("Wrong JSON");
  }
});

Deno.test("rejects and cancels an oversized streamed body without Content-Length", async () => {
  let cancelled = false;
  try {
    await readJsonBody(request([
      new Uint8Array(MAX_BODY_BYTES),
      new Uint8Array(1),
      new Uint8Array(100),
    ], () => {
      cancelled = true;
    }));
    throw new Error("Accepted oversized body");
  } catch (error) {
    if (!(error instanceof PayloadTooLargeError)) throw error;
  }
  if (!cancelled) throw new Error("Did not cancel stream");
});

Deno.test("allows a JSON body exactly at the byte limit", async () => {
  const text = '"' + "a".repeat(MAX_BODY_BYTES - 2) + '"';
  const result = await readJsonBody(request([new TextEncoder().encode(text)]));
  if (result !== "a".repeat(MAX_BODY_BYTES - 2)) throw new Error("Wrong value");
});

Deno.test("rejects malformed JSON", async () => {
  try {
    await readJsonBody(request([new TextEncoder().encode("{invalid")]));
    throw new Error("Accepted malformed JSON");
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
  }
});
