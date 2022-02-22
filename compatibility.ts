import { Negotiation, Option } from "./telnet.ts";
import { Bitflags } from "./lib/bitflags.ts";

export enum CompatEntry {
    LOCAL,
    REMOTE,
    LOCAL_ENABLED,
    REMOTE_ENABLED,
}

export const BCompatFlags = Bitflags.factory<CompatEntry>();

export type CompatFlags = Bitflags<CompatEntry>;

export interface CompatConf {
    option: Option,
    state: Bitflags<CompatEntry>,
}

export class CompatTable {
    public table = new Uint8Array(256);
    constructor();
    constructor(config: CompatConf[]);
    constructor(config?: CompatConf[]) {
        if (config != undefined) {
            for (const conf of config) {
                this.table[conf.option] = conf.state.bits;
            }
        }
    }
    public getState(option: number): CompatFlags;
    public getState(option: Option): CompatFlags;
    public getState(option: Option | number): CompatFlags {
        return BCompatFlags(this.table[option]);
    }
    public clone(): CompatTable {
        const n = new CompatTable();
        n.table = this.table.slice();
        return n;
    }
}