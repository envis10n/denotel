import * as _assert from "https://deno.land/std@0.126.0/testing/asserts.ts";
import { Buffer } from "../lib/buffer.ts";

Deno.test("buffer", () => {
  const a = new Buffer(16);
  const a2 = new Buffer(16);
  a2.put([1, 2, 3, 4, 5]);
  const a3 = a2.split();
  _assert.assertEquals(a2.capacity, 11);
  _assert.assertEquals(a3.capacity, 5);
  _assert.assertEquals(a.capacity, 16);
  _assert.assertEquals(a.length, 0);
  a.put([1, 2, 3, 4, 5]);
  _assert.assertEquals(a.length, 5);
  const b = a.freeze();
  _assert.assertEquals(b, new Uint8Array([1, 2, 3, 4, 5]));
  a.reserve(256);
  _assert.assertEquals(a.capacity, 256 + 16);
  _assert.assertEquals(a.length, 5);
  a.resize(1);
  _assert.assertEquals(a.freeze(), new Uint8Array([1]));
  a.split();
  _assert.assertEquals(a.length, 0);
  a.resize(64);
  a.put([1, 2, 3, 4, 5]);
  a.put([6, 7, 8, 9, 10]);
  _assert.assertEquals(a.length, 10);
  _assert.assertEquals(
    a.freeze(),
    new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
  );
});
