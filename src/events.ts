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
 * Build an IAC sequence (GoAhead)
 * @param command The command for the sequence.
 * @returns A TelnetEventIAC.
 */
export function buildIAC(command: telnet.Negotiation): TelnetEvent {
  return {
    type: EventType.IAC,
    command,
    buffer: new Uint8Array([255, command]),
  };
}

/**
 * Build an IAC Negotiation sequence.
 * @param command The command for the sequence.
 * @param option The option for the sequence.
 * @returns A TelnetEventNegotiation.
 */
export function buildNeg(
  command: telnet.Negotiation,
  option: telnet.Option,
): TelnetEvent {
  return {
    type: EventType.Negotiation,
    command,
    option,
    buffer: new Uint8Array([255, command, option]),
  };
}

/**
 * Build an IAC Subnegotiation sequence.
 * @param option The option for the sequence.
 * @param data The data payload.
 * @returns A TelnetEventSubnegotiation.
 */
export function buildSubNeg(
  option: telnet.Option,
  data: Uint8Array | string,
): TelnetEvent {
  if (typeof data == "string") data = (new TextEncoder()).encode(data);
  return {
    type: EventType.Subnegotation,
    option,
    data: data.slice(),
    buffer: new Uint8Array([
      255,
      telnet.Negotiation.SB,
      ...data,
      255,
      telnet.Negotiation.SE,
    ]),
  };
}

/**
 * Build a TelnetEventSend for sending to the remote end.
 * @param data The buffer to be sent.
 * @returns A TelnetEventSend.
 */
export function buildSend(
  data: Uint8Array | string | TelnetEvent,
): TelnetEvent {
  if (typeof data == "string") data = (new TextEncoder()).encode(data);
  else if (!(data instanceof Uint8Array)) data = data.buffer;
  return {
    type: EventType.Send,
    buffer: data.slice(),
  };
}

/**
 * Build a GMCP Subnegotiation sequence.
 * @param namespace The namespace (package). ex: Core.Hello
 * @param payload The payload object data.
 * @returns A TelnetEventSubnegotiation.
 */
export function buildGMCP(
  namespace: string,
  payload: { [key: string]: any },
): TelnetEvent {
  const data = (new TextEncoder()).encode(
    `${namespace} ${JSON.stringify(payload)}`,
  );
  return buildSubNeg(telnet.Option.GMCP, data);
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
export type TelnetEvent =
  | TelnetEventSend
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

/**
 * A wrapper event for other event types. To be sent to the remote end.
 */
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
