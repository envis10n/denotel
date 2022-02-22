import { assertEquals } from "https://deno.land/std@0.126.0/testing/asserts.ts";
import { EventType, buildGMCP } from "../events.ts";
import { TelnetParser } from "../../mod.ts";

const utf8 = new TextEncoder();

Deno.test("event parse", () => {
  const parser = new TelnetParser();
  const input_data = new Uint8Array([
    255,
    251,
    201,
    ...utf8.encode("Welcome to a test telnet connection!"),
    255,
    250,
    201,
    ...utf8.encode("Core.Hello {}"),
    255,
    240,
    ...utf8.encode("Some more text."),
    255,
    249,
  ]);
  const packets = parser.receive(input_data);
  assertEquals(packets.length, 6);
  const subneg = new Uint8Array([255, 250, 201, ...new TextEncoder().encode("Core.Hello {}"), 255, 240]);
  assertEquals(buildGMCP("Core.Hello", {}).buffer, subneg);
});
