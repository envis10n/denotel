/**
 * DenoTel
 *
 * A telnet parser library for Deno.
 */

import * as _bytes from "./deps/bytes.ts";
import { Buffer } from "./lib/buffer.ts";

export class TelnetParser {
  private _internal_buffer: Buffer;
  constructor(public readonly bufferSize: number = 128) {
    this._internal_buffer = new Buffer(this.bufferSize);
  }
  public process(bytes: Uint8Array) {
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
