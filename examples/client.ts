import { buildGMCP, EventType, TelnetParser, Option, Negotiation } from "../mod.ts";
import {
  iterateReader,
} from "https://deno.land/std@0.126.0/streams/conversion.ts";
import { readLines } from "https://deno.land/std@0.126.0/io/mod.ts";

const CONN_HOST = Deno.args[0];
const CONN_PORT = parseInt(Deno.args[1]);
const CONN_STRING = `${CONN_HOST}:${CONN_PORT}`;
const conn = await Deno.connect({ hostname: CONN_HOST, port: CONN_PORT });

let input_on = false;
let TELNET_GA = false;
let TELNET_GMCP = false;

const parser = new TelnetParser(1024);

const gmcp = parser.compatibility.getOption(Option.GMCP);

async function print(...items: string[]) {
  await Deno.stdout.write(new TextEncoder().encode(items.join(" ") + "\n"));
}

gmcp.local = true;
gmcp.remote = true;

interface GMCP {
  [key: string]: any;
  _namespace: string;
}

interface CharacterInfo {
  name: string;
  level: number;
  hp: number;
  en: number;
  xp: number;
  nl: number;
  st: number;
  room: {
    name: string;
    zone: string;
  };
}

const char: CharacterInfo = {
  name: "",
  level: -1,
  hp: -1,
  en: -1,
  xp: -1,
  nl: -1,
  st: -1,
  room: {
    name: "",
    zone: "",
  },
};

async function handleGMCP(gmcp: GMCP) {
  switch (gmcp._namespace) {
    case "char.status":
    case "room.info":
    case "char.vitals":
      if (gmcp._namespace == "char.status") {
        char.name = gmcp.name;
        char.level = gmcp.level;
      } else if (gmcp._namespace == "char.vitals") {
        char.hp = gmcp.hp;
        char.en = gmcp.en;
        char.xp = gmcp.xp;
        char.nl = gmcp.nl;
        char.st = gmcp.st;
      } else {
        char.room.name = gmcp.name;
        char.room.zone = gmcp.zone;
      }
      if (char.xp != -1) {
        const title =
          `[L${char.level}] ${char.name} ${char.hp} HP ${char.en} EN ${char.st} ST | XP: ${char.xp}/${char.nl} | Zone: ${char.room.zone} - ${char.room.name}`;
        await setTitle(title);
      }
      break;
  }
}

async function setTitle(title: string) {
  let t = TELNET_GA || TELNET_GMCP ? " " : "";
  if (TELNET_GA) t += "[GA]";
  if (TELNET_GMCP) t += "[GMCP]";
  await Deno.stdout.write(
    (new TextEncoder()).encode(`\x1b]2;${title} | ${CONN_STRING}${t}\x07`),
  );
}

await setTitle("DenoTel MUD Client");

async function client() {
  for await (const chunk of iterateReader(conn)) {
    for (const event of parser.receive(chunk)) {
      // Send events must go out.
      if (event.type == EventType.Send) {
        await conn.write(event.buffer);
        if (event.buffer[1] == Negotiation.DO && event.buffer[2] == Option.GMCP) {
          // Responding to GMCP enable.
          await conn.write(
            buildGMCP("Core.Hello", {
              version: "0.1.6",
              client: "DenoTel (Deno)",
            }).buffer,
          );
        }
      }

      if (event.type == EventType.IAC && event.command == Negotiation.GA) {
        if (!TELNET_GA) TELNET_GA = true;
        input_on = true;
      }

      if (event.type == EventType.Normal) {
        await Deno.stdout.write(event.buffer);
      } else if (event.type == EventType.Negotiation) {
        if (event.option == Option.GMCP && event.command == Negotiation.WILL) {
          TELNET_GMCP = true;
        }
      } else if (event.type == EventType.Subnegotation) {
        if (event.option == Option.GMCP) {
          const data = (new TextDecoder()).decode(event.data);
          const offset = data.indexOf(" ");
          if (offset != -1) {
            const namespace = data.substring(0, offset);
            const json = data.substring(offset + 1);
            try {
              const gobj: GMCP = Object.assign({
                _namespace: namespace.toLowerCase(),
              }, JSON.parse(json));
              await handleGMCP(gobj);
            } catch (e) {
              await print("[GMCP] JSON parse error:", json);
            }
          }
        } else {
          //
        }
      }
    }
  }
  Deno.exit();
}

async function input() {
  input_on = true;
  for await (let line of readLines(Deno.stdin)) {
    input_on = false;
    if (!line.endsWith("\n")) line = line + "\n";
    const buf = parser.send(line);
    await conn.write(buf);
    if (!TELNET_GA) input_on = true;
  }
}

client();
input();
