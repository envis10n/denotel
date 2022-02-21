import * as telnet from "./telnet.ts";

export enum EventType {
  Normal,
  IAC,
  Negotiation,
  Subnegotation,
}

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

export type TelnetEvent =
  | TelnetEventMessage
  | TelnetEventIAC
  | TelnetEventNegotiation
  | TelnetEventSubnegotiation;

export interface TelnetEventBase {
  type: EventType;
  buffer: Uint8Array;
}

export type TelnetEventMessage = {
  type: EventType.Normal;
} & TelnetEventBase;

export type TelnetEventIAC = {
  type: EventType.IAC;
  command: telnet.Negotiation;
} & TelnetEventBase;

export type TelnetEventNegotiation = {
  type: EventType.Negotiation;
  option: telnet.Option;
  command: telnet.Negotiation;
} & TelnetEventBase;

export type TelnetEventSubnegotiation = {
  type: EventType.Subnegotation;
  option: telnet.Option;
  data: Uint8Array;
} & TelnetEventBase;
