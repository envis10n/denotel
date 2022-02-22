import { TelnetParser, EventType } from "../mod.ts";
import { iterateReader } from "https://deno.land/std@0.126.0/streams/conversion.ts";
import { readLines } from "https://deno.land/std@0.126.0/io/mod.ts";

const conn = await Deno.connect({hostname: Deno.args[0], port: parseInt(Deno.args[1])});

const UTF8 = {
    encoder: new TextEncoder(),
    decoder: new TextDecoder(),
};

const parser = new TelnetParser(1024);

async function client() {
    for await (const chunk of iterateReader(conn)) {
        for (const event of parser.receive(chunk)) {
            if (event.type == EventType.Normal) {
                await Deno.stdout.write(event.buffer);
            } else if (event.type == EventType.Subnegotation) {
                const t = UTF8.decoder.decode(event.data);
                const res = UTF8.encoder.encode(`[SB] ${event.option} ${t}\n`);
                await Deno.stdout.write(res);
            } else {
                await Deno.stdout.write(UTF8.encoder.encode(JSON.stringify(event) + "\n"));
            }
        }
    }
    Deno.exit();
}

async function input() {
    for await (let line of readLines(Deno.stdin)) {
        if (!line.endsWith("\n")) line = line + "\n";
        const buf = parser.send(line);
        await conn.write(buf);
    }
}

client();
input();