import { Buffer } from "./lib/buffer.ts";
import * as telnet from "./telnet.ts";
import {
  buildNeg,
  buildSend,
  buildSubNeg,
  EventType,
  parseEvent,
  TelnetEvent,
} from "./events.ts";
import { CompatTable } from "./compatibility.ts";

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
  private _compat: CompatTable = new CompatTable();
  public get compatibility(): CompatTable {
    return this._compat;
  }
  private _internal_buffer: Buffer;
  constructor(public readonly bufferSize: number = 128, table?: CompatTable) {
    this._internal_buffer = new Buffer(this.bufferSize);
    if (table != undefined) this._compat = table;
  }
  /**
   * Clone this parser's compatibility table.
   * @returns A copy of this parser's compatibility table.
   */
  public cloneTable(): CompatTable {
    return this._compat.clone();
  }
  /**
   * Build an IAC Negotiation sequence.
   * @param command The command for the sequence.
   * @param option The option for the sequence.
   * @returns A TelnetEventNegotiation.
   */
  public negotiate(
    command: telnet.Negotiation | number,
    option: telnet.Option | number,
  ): TelnetEvent {
    const ev = buildNeg(command, option);
    return buildSend(ev.buffer);
  }
  /**
   * Build a WILL Negotiation using the compatibility table.
   * @param option The option for the sequence.
   * @returns A TelnetEventNegotiation if the option is supported, otherwise null.
   */
  public will(option: telnet.Option | number): TelnetEvent | null {
    const opt = this._compat.getOption(option);
    if (opt.local && !opt.local_state) {
      opt.local_state = true;
      return this.negotiate(telnet.Negotiation.WILL, option);
    }
    return null;
  }
  /**
   * Build a WONT Negotiation using the compatibility table.
   * @param option The option for the sequence.
   * @returns A TelnetEventNegotiation if the option is supported, otherwise null.
   */
  public wont(option: telnet.Option | number): TelnetEvent | null {
    const opt = this._compat.getOption(option);
    if (opt.local_state) {
      opt.local_state = false;
      return this.negotiate(telnet.Negotiation.WONT, option);
    }
    return null;
  }
  /**
   * Build a DO Negotiation using the compatibility table.
   * @param option The option for the sequence.
   * @returns A TelnetEventNegotiation if the option is supported, otherwise null.
   */
  public do(option: telnet.Option | number): TelnetEvent | null {
    const opt = this._compat.getOption(option);
    if (opt.remote && !opt.remote_state) {
      return this.negotiate(telnet.Negotiation.DO, option);
    }
    return null;
  }
  /**
   * Build a DONT Negotiation using the compatibility table.
   * @param option The option for the sequence.
   * @returns A TelnetEventNegotiation if the option is supported, otherwise null.
   */
  public dont(option: telnet.Option | number): TelnetEvent | null {
    const opt = this._compat.getOption(option);
    if (opt.remote_state) {
      return this.negotiate(telnet.Negotiation.DONT, option);
    }
    return null;
  }
  /**
   * Build an IAC Subnegotiation sequence using the compatibility table.
   * @param option The option for the sequence.
   * @param data The data payload.
   * @returns A TelnetEventSubnegotiation if the option is support, otherwise null.
   */
  public subnegotiation(
    option: telnet.Option | number,
    data: Uint8Array | Iterable<number> | string,
  ): TelnetEvent | null {
    const opt = this._compat.getOption(option);
    if (opt.local && opt.local_state) {
      let d: Uint8Array;
      if (typeof data == "string") d = (new TextEncoder()).encode(data);
      else if (!(data instanceof Uint8Array)) d = new Uint8Array(data);
      else d = data.slice();
      buildSend(buildSubNeg(option, d).buffer);
    }
    return null;
  }
  public send(data: string): Uint8Array;
  public send(data: Uint8Array): Uint8Array;
  /**
   * Escape data to be sent to the remote end.
   * @param data The data to be sent.
   * @returns An IAC escaped buffer to be sent.
   */
  public send(data: string | Uint8Array): Uint8Array {
    if (typeof data == "string") data = (new TextEncoder()).encode(data);
    return escapeIAC(data);
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

    const result = events.map((ev) => parseEvent(ev)).filter((ev) => {
      if (ev.type == EventType.Subnegotation) {
        if (
          ev.buffer[ev.buffer.length - 2] != 255 ||
          ev.buffer[ev.buffer.length - 1] != telnet.Negotiation.SE
        ) {
          this._internal_buffer.reserve(ev.buffer.byteLength);
          this._internal_buffer.put(ev.buffer);
          return false;
        }
      }
      return true;
    });

    // Process negotiations based on options table.
    for (const ev of result.filter((e) => e.type == EventType.Negotiation)) {
      if (ev.type == EventType.Negotiation) {
        const opt = this._compat.getOption(ev.option);
        if (ev.command == telnet.Negotiation.WILL) {
          if (opt.remote && !opt.remote_state) {
            opt.remote_state = true;
            result.push(buildSend(buildNeg(telnet.Negotiation.DO, ev.option)));
          } else if (!opt.remote) {
            result.push(
              buildSend(buildNeg(telnet.Negotiation.DONT, ev.option)),
            );
          }
        } else if (ev.command == telnet.Negotiation.WONT) {
          if (opt.remote_state) {
            opt.remote_state = false;
            result.push(
              buildSend(buildNeg(telnet.Negotiation.DONT, ev.option)),
            );
          }
        } else if (ev.command == telnet.Negotiation.DO) {
          if (opt.local && !opt.local_state) {
            opt.local_state = true;
            opt.remote_state = true;
            result.push(
              buildSend(buildNeg(telnet.Negotiation.WILL, ev.option)),
            );
          } else if (!opt.local) {
            result.push(
              buildSend(buildNeg(telnet.Negotiation.WONT, ev.option)),
            );
          }
        } else if (ev.command == telnet.Negotiation.DONT) {
          if (opt.local_state) {
            opt.local_state = false;
            result.push(
              buildSend(buildNeg(telnet.Negotiation.WONT, ev.option)),
            );
          }
        }
      }
    }

    return result;
  }
}
