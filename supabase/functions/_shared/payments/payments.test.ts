// Run: deno test supabase/functions/_shared
import { assert, assertEquals, assertMatch, assertRejects } from "jsr:@std/assert@1";
import { generateReference, hmacHex } from "../crypto.ts";
import { normalizeSomaliPhone, sanitizeText } from "../validation.ts";
import { SandboxProvider } from "./sandbox.ts";

const SECRET = "test-secret";
const provider = new SandboxProvider("hormuud", ["61", "77"], SECRET);
const past = new Date(Date.now() - 60_000).toISOString();

Deno.test("normalizes Somali phone formats", () => {
  assertEquals(normalizeSomaliPhone("61 234 5678"), "252612345678");
  assertEquals(normalizeSomaliPhone("0612345678"), "252612345678");
  assertEquals(normalizeSomaliPhone("+252 77 123 4567"), "252771234567");
  assertEquals(normalizeSomaliPhone("12345"), null);
  assertEquals(normalizeSomaliPhone("+1 555 123 4567"), null);
});

Deno.test("sanitizes user text", () => {
  assertEquals(sanitizeText("  <b>hi</b>\u0000 there "), "hi there");
});

Deno.test("references are unique and well-formed", () => {
  const a = generateReference();
  assertMatch(a, /^ITG-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  assert(a !== generateReference());
});

Deno.test("sandbox only supports Hormuud prefixes", () => {
  assert(provider.supportsPhone("252612345678"));
  assert(provider.supportsPhone("252771234567"));
  assert(!provider.supportsPhone("252631234567")); // Telesom
});

Deno.test("sandbox outcomes are driven by the test number", async () => {
  const run = async (phone: string) => {
    const created = await provider.createPayment({ reference: "ITG-TEST", amount: 3, currency: "USD", phone, description: "t" });
    assertEquals(created.status, "processing");
    return (await provider.checkPaymentStatus({ reference: "ITG-TEST", providerTransactionId: created.providerTransactionId, createdAt: past })).status;
  };
  assertEquals(await run("252612345678"), "successful");
  assertEquals(await run("252612340000"), "failed");
  assertEquals(await run("252612341111"), "cancelled");
});

Deno.test("sandbox stays processing until the approval delay passes", async () => {
  const created = await provider.createPayment({ reference: "ITG-TEST", amount: 3, currency: "USD", phone: "252612345678", description: "t" });
  const res = await provider.checkPaymentStatus({ reference: "ITG-TEST", providerTransactionId: created.providerTransactionId, createdAt: new Date().toISOString() });
  assertEquals(res.status, "processing");
});

Deno.test("callback requires a valid signature", async () => {
  const body = JSON.stringify({ reference: "ITG-AAAA-BBBB-CCCC-DDDD", status: "successful" });
  const good = new Request("http://x", { method: "POST", headers: { "x-signature": await hmacHex(SECRET, body) } });
  const event = await provider.parseCallback(good, body);
  assertEquals(event.claimedStatus, "successful");

  const bad = new Request("http://x", { method: "POST", headers: { "x-signature": "deadbeef" } });
  await assertRejects(() => provider.parseCallback(bad, body));
});
