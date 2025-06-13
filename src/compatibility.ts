import { Option } from "./telnet.ts";
import { Bitflags } from "./lib/bitflags.ts";

/**
 * Compatibility Entry enum.
 */
export enum CompatEntry {
    LOCAL = 0b1,
    REMOTE = 0b10,
    LOCAL_ENABLED = 0b100,
    REMOTE_ENABLED = 0b1000,
}

/**
 * Meta type for all flags.
 */
export const COMPAT_ALL: CompatEntry = CompatEntry.LOCAL | CompatEntry.REMOTE |
    CompatEntry.LOCAL_ENABLED | CompatEntry.REMOTE_ENABLED;

/**
 * Meta type for all local flags.
 */
export const COMPAT_LOCAL: CompatEntry = CompatEntry.LOCAL |
    CompatEntry.LOCAL_ENABLED;

/**
 * Meta type for all remote flags.
 */
export const COMPAT_REMOTE: CompatEntry = CompatEntry.REMOTE |
    CompatEntry.REMOTE_ENABLED;

/**
 * Factory for Bitflags<CompatEntry>.
 */
export const BCompatFlags = Bitflags.factory<CompatEntry>();

/**
 * Type alias for Bitflags<CompatEntry>.
 */
export type CompatFlags = Bitflags<CompatEntry>;

/**
 * Compatbility configuration entry.
 */
export interface CompatConf {
    option: Option;
    state: CompatEntry;
}

/**
 * Telnet compability entry wrapper.
 */
export class Compatibility {
    /**
     * The current option's flags.
     */
    public get state(): CompatFlags {
        return this._table.getState(this.option);
    }
    /**
     * The current option's flags.
     */
    public set state(v: CompatFlags) {
        this._table.setState(this.option, v);
    }
    /**
     * The current local support state.
     */
    public get local(): boolean {
        return this.state.has(CompatEntry.LOCAL);
    }
    /**
     * The current local support state.
     */
    public set local(v: boolean) {
        const t = this.state;
        if (v) t.set(CompatEntry.LOCAL);
        else t.unset(CompatEntry.LOCAL);
        this.state = t;
    }
    /**
     * The current local enabled state.
     */
    public get local_state(): boolean {
        return this.state.has(CompatEntry.LOCAL_ENABLED);
    }
    /**
     * The current local enabled state.
     */
    public set local_state(v: boolean) {
        const t = this.state;
        if (v) t.set(CompatEntry.LOCAL_ENABLED);
        else t.unset(CompatEntry.LOCAL_ENABLED);
        this.state = t;
    }
    /**
     * The current remote support state.
     */
    public get remote(): boolean {
        return this.state.has(CompatEntry.REMOTE);
    }
    /**
     * The current remote support state.
     */
    public set remote(v: boolean) {
        const t = this.state;
        if (v) t.set(CompatEntry.REMOTE);
        else t.unset(CompatEntry.REMOTE);
        this.state = t;
    }
    /**
     * The current remote enabled state.
     */
    public get remote_state(): boolean {
        return this.state.has(CompatEntry.REMOTE_ENABLED);
    }
    /**
     * The current remote enabled state.
     */
    public set remote_state(v: boolean) {
        const t = this.state;
        if (v) t.set(CompatEntry.REMOTE_ENABLED);
        else t.unset(CompatEntry.REMOTE_ENABLED);
        this.state = t;
    }
    constructor(
        private readonly _table: CompatTable,
        private readonly option: Option,
    ) {}
}

/**
 * Telnet compatibility options table.
 */
export class CompatTable {
    public table = new Uint8Array(256);
    constructor();
    constructor(config: CompatConf[]);
    constructor(config?: CompatConf[]) {
        if (config != undefined) {
            for (const conf of config) {
                this.table[conf.option] = conf.state;
            }
        }
    }
    /**
     * Set the current state of an option.
     * @param option The option to set.
     * @param state The new state.
     */
    public setState(option: Option, state: CompatFlags) {
        this.table[option] = state.bits;
    }
    /**
     * Get the current state of an option.
     * @param option The option to get.
     * @returns Bitflags for the option.
     */
    public getState(option: Option): CompatFlags {
        return BCompatFlags(this.table[option]);
    }
    /**
     * Get a wrapper `Compatibility` object for an option.
     * @param option The option to get.
     * @returns A wrapper object for manipulating the option's state.
     */
    public getOption(option: Option): Compatibility {
        return new Compatibility(this, option);
    }
    /**
     * Get a copy of the table.
     * @returns A copy of the table.
     */
    public clone(): CompatTable {
        const n = new CompatTable();
        n.table = this.table.slice();
        return n;
    }
}
