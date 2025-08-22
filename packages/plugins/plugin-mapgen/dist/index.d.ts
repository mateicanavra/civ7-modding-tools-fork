export interface MapgenConfig {
    seed?: number | string;
    width?: number;
    height?: number;
    [key: string]: unknown;
}
export interface MapgenResult {
    width: number;
    height: number;
    tiles: unknown;
    metadata?: Record<string, unknown>;
}
export type Logger = (message: string) => void;
export declare const VERSION = "0.0.0-stub";
export declare function describe(): string;
export declare function generateMap(config?: MapgenConfig, log?: Logger): Promise<MapgenResult>;
export declare function buildMapMod(srcDir: string, outDir: string, log?: Logger): Promise<void>;
