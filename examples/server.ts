import { TelnetParser, buildGMCP, escapeIAC, CompatTable, Negotiation, Option, EventType, buildIAC, buildNeg } from "../mod.ts";
import { iterateReader } from "https://deno.land/std@0.126.0/streams/conversion.ts";

const CONN_HOST = Deno.args[0];
const CONN_PORT = parseInt(Deno.args[1]);

const listener = Deno.listen({hostname: CONN_HOST, port: CONN_PORT});

interface TelnetClient {
    socket: Deno.Conn;
    uuid: string;
    send: (data: string) => Promise<number>;
    write: (data: Uint8Array) => Promise<number>;
    negotiate: (command: Negotiation, option: Option) => Promise<number>;
    gmcp: (namespace: string, payload: {[key: string]: any;}) => Promise<number>;
}

const CLIENTS: Map<string, TelnetClient> = new Map();

const DEFAULT_COMPAT = new CompatTable();

const _gmcp = DEFAULT_COMPAT.getOption(Option.GMCP);

_gmcp.local = true;
_gmcp.remote = true;

interface GMCP {
    [key: string]: any;
    _namespace: string;
}

async function handleGMCP(client: TelnetClient, gmcp: GMCP): Promise<void> {
    console.log("GMCP", client.uuid, gmcp);
}

console.log("Listening on", `${CONN_HOST}:${CONN_PORT}...`);

for await (const socket of listener) {
    const parser = new TelnetParser(1024, DEFAULT_COMPAT.clone());
    const uuid = crypto.randomUUID();
    const client: TelnetClient = {
        socket,
        uuid,
        send: async (data: string): Promise<number> => {
            if (!data.endsWith("\n")) data += "\n";
            return await client.write(escapeIAC(new TextEncoder().encode(data)));
        },
        write: async (data: Uint8Array): Promise<number> => {
            return await client.socket.write(data);
        },
        negotiate: async (command: Negotiation, option: Option): Promise<number> => {
            return await client.socket.write(buildNeg(command, option).buffer);
        },
        gmcp: async (namespace: string, payload: {[key: string]: any;}): Promise<number> => {
            return await client.socket.write(buildGMCP(namespace, payload).buffer);
        }
    };
    CLIENTS.set(uuid, client);
    console.log("Client", uuid, "connected.");
    await client.negotiate(Negotiation.WILL, Option.GMCP);
    try {
        for await (const chunk of iterateReader(socket)) {

            const events = parser.receive(chunk);

            for (const sev of events.filter((e) => e.type == EventType.Send)) {
                await client.write(sev.buffer);
            }

            for (const ev of events) {
                switch (ev.type) {
                    case EventType.Normal:
                        // Regular text data. For now, echo back.
                        await client.write(ev.buffer);
                        await client.write(buildIAC(Negotiation.GA).buffer);
                        break;
                    case EventType.IAC:
                        // GA
                        break;
                    case EventType.Negotiation:
                        if (ev.option == Option.GMCP) {
                            // GMCP
                            if (ev.command == Negotiation.DO) {
                                // Enabled.
                                console.log("GMCP Enabled for", uuid);
                            }
                        }
                        break;
                    case EventType.Subnegotation:
                        if (ev.option == Option.GMCP) {
                            // GMCP data
                            const data = new TextDecoder().decode(ev.data);
                            const offset = data.indexOf(" ");
                            const namespace = offset != -1 ? data.substring(0, offset) : data;
                            const json = offset != -1 ? data.substring(offset + 1) : "";
                            let jobj: GMCP = {_namespace: namespace.toLowerCase()};
                            if (json != "") {
                                try {
                                    const obj = JSON.parse(json);
                                    jobj = Object.assign(jobj, obj);
                                } catch (_e) {
                                    console.error("GMCP JSON Parse Error:", _e);
                                }
                            }
                            await handleGMCP(client, jobj);
                        }
                        break;
                }
            }
        }
    } catch (e) {
        console.error("Client", uuid, "error:", e);
    }
    CLIENTS.delete(uuid);
    console.log("Client", uuid, "disconnected.");
}