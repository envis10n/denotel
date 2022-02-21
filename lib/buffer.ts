import * as _bytes from "../deps/bytes.ts";

export class Buffer {
  private _cursor = 0;
  private _internal: Uint8Array;
  constructor(length: number = 0) {
    this._internal = new Uint8Array(length);
  }
  public static from(arr: Uint8Array): Buffer;
  public static from(arr: number[]): Buffer;
  public static from(arr: Uint8Array | number[]): Buffer {
    if (!(arr instanceof Uint8Array)) arr = new Uint8Array(arr);
    const buf = new Buffer(arr.byteLength);
    buf.put(arr);
    return buf;
  }
  public clear() {
    this._internal = new Uint8Array(this._internal.byteLength);
    this._cursor = 0;
  }
  public reserve(size: number) {
    const temp = this._internal.slice(0, this._cursor);
    this._internal = new Uint8Array(this._internal.byteLength + size);
    _bytes.copy(temp, this._internal);
  }
  public get capacity(): number {
    return this._internal.byteLength;
  }
  public get length(): number {
    return this._cursor;
  }
  public put(src: Uint8Array): void;
  public put(src: number[]): void;
  public put(src: Uint8Array | number[]) {
    if (!(src instanceof Uint8Array)) {
      src = new Uint8Array(src);
    }
    if (this._cursor + src.byteLength > this._internal.byteLength) {
      throw new Error("Insufficient capacity");
    }
    _bytes.copy(src, this._internal, this._cursor);
    this._cursor += src.byteLength;
  }
  public split(): Buffer {
    const temp = this._internal.slice(0, this._cursor);
    this._internal = new Uint8Array(this._internal.byteLength - this._cursor);
    this._cursor = 0;
    return Buffer.from(temp);
  }
  public resize(size: number) {
    if (size > this._internal.byteLength) {
      this.reserve(size - this._internal.byteLength);
    } else if (size < this._internal.byteLength) {
      const temp = this._internal.slice(0, size);
      this._internal = temp;
      if (this._cursor > this._internal.byteLength) {
        this._cursor = this._internal.byteLength;
      }
    }
  }
  public freeze(): Uint8Array {
    return this._internal.slice(0, this._cursor);
  }
  public clone(): Buffer {
    return Buffer.from(this._internal.slice());
  }
}
