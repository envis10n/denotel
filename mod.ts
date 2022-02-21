/**
 * DenoTel
 *
 * A telnet parser library for Deno.
 */

import * as _bytes from "./deps/bytes.ts";
import { Buffer } from "./lib/buffer.ts";

export function escapeIAC<T extends Iterable<number>>(arr: T): Uint8Array {
  const temp: number[] = [];
  for (const byte of arr) {
    temp.push(byte);
    if (byte == 255) temp.push(255);
  }
  return new Uint8Array(temp);
}

export function unescapeIAC<T extends Iterable<number>>(arr: T): Uint8Array {
  const temp: number[] = [];
  let last = 0;
  for (const byte of arr) {
    if (byte == 255 && last == 255) continue;
    last = byte;
    temp.push(byte);
  }
  return new Uint8Array(temp);
}

export class TelnetParser {
  private _internal_buffer: Buffer;
  constructor(public readonly bufferSize: number = 128) {
    this._internal_buffer = new Buffer(this.bufferSize);
  }
  public receive(bytes: Uint8Array) {
    if (
      this._internal_buffer.capacity <
        bytes.byteLength + this._internal_buffer.length
    ) {
      this._internal_buffer.reserve(
        bytes.byteLength + this._internal_buffer.length -
          this._internal_buffer.capacity,
      );
    }
    this._internal_buffer.put(bytes);
    const buf = this._internal_buffer.split().freeze();
    // TODO: Parse buffer here
  }
}
