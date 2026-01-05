import { AdbClient } from "./adb/client.js";
import { IosClient } from "./ios/client.js";
import { type CompressOptions } from "./utils/image.js";
export type Platform = "android" | "ios";
export interface Device {
    id: string;
    name: string;
    platform: Platform;
    state: string;
    isSimulator: boolean;
}
export declare class DeviceManager {
    private androidClient;
    private iosClient;
    private activeDevice?;
    constructor();
    /**
     * Get all connected devices (Android + iOS)
     */
    getAllDevices(): Device[];
    /**
     * Get devices filtered by platform
     */
    getDevices(platform?: Platform): Device[];
    /**
     * Set active device
     */
    setDevice(deviceId: string, platform?: Platform): Device;
    /**
     * Get active device
     */
    getActiveDevice(): Device | undefined;
    /**
     * Get the appropriate client for current device or specified platform
     */
    private getClient;
    /**
     * Get current platform
     */
    getCurrentPlatform(): Platform | undefined;
    /**
     * Take screenshot with optional compression
     */
    screenshot(platform?: Platform, compress?: boolean, options?: CompressOptions): Promise<{
        data: string;
        mimeType: string;
    }>;
    /**
     * Take screenshot without compression (legacy)
     */
    screenshotRaw(platform?: Platform): string;
    /**
     * Tap at coordinates
     */
    tap(x: number, y: number, platform?: Platform): void;
    /**
     * Long press
     */
    longPress(x: number, y: number, durationMs?: number, platform?: Platform): void;
    /**
     * Swipe
     */
    swipe(x1: number, y1: number, x2: number, y2: number, durationMs?: number, platform?: Platform): void;
    /**
     * Swipe direction
     */
    swipeDirection(direction: "up" | "down" | "left" | "right", platform?: Platform): void;
    /**
     * Input text
     */
    inputText(text: string, platform?: Platform): void;
    /**
     * Press key
     */
    pressKey(key: string, platform?: Platform): void;
    /**
     * Launch app
     */
    launchApp(packageOrBundleId: string, platform?: Platform): string;
    /**
     * Stop app
     */
    stopApp(packageOrBundleId: string, platform?: Platform): void;
    /**
     * Install app
     */
    installApp(path: string, platform?: Platform): string;
    /**
     * Get UI hierarchy
     */
    getUiHierarchy(platform?: Platform): string;
    /**
     * Execute shell command
     */
    shell(command: string, platform?: Platform): string;
    /**
     * Get Android client directly
     */
    getAndroidClient(): AdbClient;
    /**
     * Get iOS client directly
     */
    getIosClient(): IosClient;
    /**
     * Get device logs
     */
    getLogs(options?: {
        platform?: Platform;
        level?: string;
        tag?: string;
        lines?: number;
        package?: string;
    }): string;
    /**
     * Clear logs
     */
    clearLogs(platform?: Platform): string;
    /**
     * Get system info (battery, memory, etc.)
     */
    getSystemInfo(platform?: Platform): string;
}
//# sourceMappingURL=device-manager.d.ts.map