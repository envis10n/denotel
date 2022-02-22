import { assertEquals } from "https://deno.land/std@0.126.0/testing/asserts.ts";
import { EventType } from "../events.ts";
import { TelnetParser } from "../mod.ts";

const utf8 = new TextEncoder();
const utf8dec = new TextDecoder();

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
  assertEquals(packets.length, 5);
  for (const event of packets) {
    switch (event.type) {
      case EventType.Normal:
        console.log("Text:", utf8dec.decode(event.buffer));
        break;
      case EventType.IAC:
        console.log("IAC Command:", event.command);
        break;
      case EventType.Negotiation:
        console.log(
          "Negotiation Command:",
          event.command,
          "Option:",
          event.option,
        );
        break;
      case EventType.Subnegotation:
        console.log(
          "Subnegotiation Option:",
          event.option,
          "Data:",
          utf8dec.decode(event.data),
        );
        break;
    }
  }
});
