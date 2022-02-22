import * as telnet from "./telnet.ts";

/**
 * A type describing the contained event data.
 */
export enum EventType {
  Normal,
  IAC,
  Send,
  Negotiation,
  Subnegotation,
}

/**
 * Parse a buffer into a usable event object.
 * @param src The source buffer.
 * @returns A parsed event.
 */
export function parseEvent(src: Uint8Array): TelnetEvent {
  if (src[0] == 255) {
    // IAC
    if (src.byteLength == 2) {
      // Non-negotiation
      return {
        type: EventType.IAC,
        command: src[1] as telnet.Negotiation,
        buffer: src,
      };
    } else if (src.byteLength == 3) {
      return {
        type: EventType.Negotiation,
        command: src[1] as telnet.Negotiation,
        option: src[2] as telnet.Option,
        buffer: src,
      };
    } else {
      return {
        type: EventType.Subnegotation,
        option: src[2] as telnet.Option,
        data: src.slice(3, src.byteLength - 2),
        buffer: src,
      };
    }
  } else {
    return {
      type: EventType.Normal,
      buffer: src,
    };
  }
}

/**
 * An object representing a telnet event.
 */
export type TelnetEvent = TelnetEventSend
  | TelnetEventMessage
  | TelnetEventIAC
  | TelnetEventNegotiation
  | TelnetEventSubnegotiation;

/**
 * A base description of a telnet event.
 */
export interface TelnetEventBase {
  type: EventType;
  buffer: Uint8Array;
}

export type TelnetEventSend = {
  type: EventType.Send;
} & TelnetEventBase;

/**
 * A telnet event that contains no control sequence.
 */
export type TelnetEventMessage = {
  type: EventType.Normal;
} & TelnetEventBase;

/**
 * A telnet control sequence with no option.
 */
export type TelnetEventIAC = {
  type: EventType.IAC;
  command: telnet.Negotiation;
} & TelnetEventBase;

/**
 * A telnet control sequence negotiation.
 */
export type TelnetEventNegotiation = {
  type: EventType.Negotiation;
  option: telnet.Option;
  command: telnet.Negotiation;
} & TelnetEventBase;

/**
 * A telnet control sequence with out-of-band subnegotiation data.
 */
export type TelnetEventSubnegotiation = {
  type: EventType.Subnegotation;
  option: telnet.Option;
  data: Uint8Array;
} & TelnetEventBase;
