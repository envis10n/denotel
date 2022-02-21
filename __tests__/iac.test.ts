import { escapeIAC, unescapeIAC } from "../mod.ts";
import { assertEquals } from "https://deno.land/std@0.126.0/testing/asserts.ts";

Deno.test("iac escape", () => {
  const a = new Uint8Array([255, 56, 27, 22, 255, 32]);
  const b = new Uint8Array([255, 255, 56, 27, 22, 255, 255, 32]);
  const a_result = escapeIAC(a);
  const b_result = unescapeIAC(b);
  assertEquals(a_result, b);
  assertEquals(b_result, a);
});
