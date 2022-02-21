import { Buffer } from "./lib/buffer.ts";
import * as telnet from "./telnet.ts";
import { parseEvent, TelnetEvent } from "./events.ts";

/**
 * Escape IAC bytes (0xFF) by doubling them up.
 * @param arr The source buffer.
 * @returns The source buffer with IAC bytes doubled.
 */
export function escapeIAC<T extends Iterable<number>>(arr: T): Uint8Array {
  const temp: number[] = [];
  for (const byte of arr) {
    temp.push(byte);
    if (byte == 255) temp.push(255);
  }
  return new Uint8Array(temp);
}

/**
 * Reverse an escaped buffer by removing duplicate IAC bytes (0xFF).
 * @param arr The source buffer.
 * @returns The source buffer with double IAC bytes removed.
 */
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

/**
 * A telnet parser with an internal buffer.
 */
export class TelnetParser {
  private _internal_buffer: Buffer;
  constructor(public readonly bufferSize: number = 128) {
    this._internal_buffer = new Buffer(this.bufferSize);
  }
  /**
   * Receive bytes from one end of a connection and process them for the other side.
   * 
   * As a server, you would read from a client into this parser and handle events as they are parsed.
   * 
   * As a client, you would read from the socket into this parser and handle events as they are parsed.
   * @param bytes_in The source bytes being received.
   * @returns An array of parsed telnet events.
   */
  public receive<T extends Iterable<number>>(bytes_in: T): TelnetEvent[] {
    enum State {
      Normal,
      IAC,
      Neg,
      Sub,
    }
    const bytes = new Uint8Array(bytes_in);
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
    const events: Uint8Array[] = [];
    let iter_state = State.Normal;
    let cmd_begin = 0;
    let index = 0;
    for (const val of buf) {
      if (iter_state == State.Normal) {
        if (val == 255) {
          if (cmd_begin < index) {
            events.push(buf.slice(cmd_begin, index));
          }
          cmd_begin = index;
          iter_state = State.IAC;
        }
      } else if (iter_state == State.IAC) {
        if (val == 255) {
          iter_state = State.Normal; // Double IAC
        } else if (
          val == telnet.Negotiation.GA ||
          val == telnet.Negotiation.NOP ||
          val == telnet.Negotiation.EOR
        ) {
          events.push(buf.slice(cmd_begin, index + 1));
          cmd_begin = index + 1;
          iter_state = State.Normal;
        } else if (val == telnet.Negotiation.SB) {
          iter_state = State.Sub;
        } else {
          iter_state = State.Neg;
        }
      } else if (iter_state == State.Neg) {
        events.push(buf.slice(cmd_begin, index + 1));
        cmd_begin = index + 1;
        iter_state = State.Normal;
      } else if (iter_state == State.Sub) {
        if (val == telnet.Negotiation.SE) {
          events.push(buf.slice(cmd_begin, index + 1));
          cmd_begin = index + 1;
          iter_state = State.Normal;
        }
      }
      index++;
    }
    if (cmd_begin < buf.byteLength) {
      events.push(buf.slice(cmd_begin));
    }
    return events.map((ev) => parseEvent(ev));
  }
}
