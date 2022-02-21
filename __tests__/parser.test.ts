import { TelnetParser } from "../mod.ts";
import { assertEquals } from "https://deno.land/std@0.126.0/testing/asserts.ts";
import { parseEvent } from "../events.ts";

Deno.test("parser", () => {
  const encoder = new TextEncoder();
  const parser = new TelnetParser();
  const b = parser.receive([
    255,
    253,
    200,
    ...encoder.encode("Hello, world!"),
    255,
    249,
  ]);
  const expected = [
    new Uint8Array([255, 253, 200]),
    encoder.encode("Hello, world!"),
    new Uint8Array([
      255,
      249,
    ]),
  ].map((e) => parseEvent(e));
  assertEquals(b, expected);
});
