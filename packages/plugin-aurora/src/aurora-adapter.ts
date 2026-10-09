/**
 * AuroraAdapter -- wraps AuroraClient.
 *
 * Implements core interaction, app lifecycle and inventory, shell/logs,
 * file transfer, and synchronous screenshots.
 *
 * Permissions use the audb system agent on phones and emulators.
 */

import type {
  AppInventoryAdapter,
  AppManagementAdapter,
  CorePlatformAdapter,
  FileTransferAdapter,
  PermissionAdapter,
  ShellAdapter,
  SyncScreenshotAdapter,
} from "mcp-devices/adapters/platform-adapter";
import type { Device } from "mcp-devices/device-manager";
import { AuroraClient } from "./client.js";
import { compressScreenshot } from "mcp-devices/utils/image";
import type { CompressOptions } from "mcp-devices/utils/image";

export class AuroraAdapter
  implements
    CorePlatformAdapter,
    AppManagementAdapter,
    AppInventoryAdapter,
    ShellAdapter,
    FileTransferAdapter,
    PermissionAdapter,
    SyncScreenshotAdapter
{
  readonly platform = "aurora" as const;
  private client: AuroraClient;

  constructor(client?: AuroraClient) {
    this.client = client ?? new AuroraClient();
  }

  /** Raw client access -- needed by tools that call getAuroraClient(). */
  getClient(deviceId?: string): AuroraClient {
    return deviceId ? this.client.forDevice(deviceId) : this.client;
  }

  listDevices(): Device[] { return this.client.listDevices(); }
  selectDevice(deviceId: string): void { this.client.selectDevice(deviceId); }
  getSelectedDeviceId(): string | undefined { return this.client.getSelectedDeviceId(); }
  autoDetectDevice(): Device | undefined {
    const devices = this.listDevices();
    try {
      const id = this.client.getActiveDevice();
      return devices.find(d => d.id === id);
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "DEVICE_REQUIRED") return undefined;
      throw error;
    }
  }

  // ============ Core actions ============

  async tap(x: number, y: number, _targetPid?: number, deviceId?: string): Promise<void> {
    this.getClient(deviceId).tap(x, y);
  }

  async doubleTap(x: number, y: number, intervalMs: number = 100, deviceId?: string): Promise<void> {
    // Aurora: two taps with interval
    const client = this.getClient(deviceId).forDevice();
    client.tap(x, y);
    await new Promise(resolve => setTimeout(resolve, intervalMs));
    client.tap(x, y);
  }

  async longPress(x: number, y: number, durationMs: number = 1000, deviceId?: string): Promise<void> {
    this.getClient(deviceId).longPress(x, y, durationMs);
  }

  async swipe(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    durationMs?: number,
    deviceId?: string,
  ): Promise<void> {
    this.getClient(deviceId).swipe(x1, y1, x2, y2, durationMs);
  }

  async swipeDirection(direction: "up" | "down" | "left" | "right", deviceId?: string): Promise<void> {
    this.getClient(deviceId).swipeDirection(direction);
  }

  async inputText(text: string, _targetPid?: number, deviceId?: string): Promise<void> {
    this.getClient(deviceId).inputText(text);
  }

  async pressKey(key: string, _targetPid?: number, deviceId?: string): Promise<void> {
    this.getClient(deviceId).pressKey(key);
  }

  // ============ Screenshot ============

  async screenshotAsync(
    compress: boolean = true,
    options?: CompressOptions & { monitorIndex?: number },
    deviceId?: string,
  ): Promise<{ data: string; mimeType: string }> {
    const buffer = this.getClient(deviceId).screenshotRaw();
    if (compress) {
      return compressScreenshot(buffer, options);
    }
    return { data: buffer.toString("base64"), mimeType: "image/png" };
  }

  async getScreenshotBufferAsync(deviceId?: string): Promise<Buffer> {
    return this.getClient(deviceId).screenshotRaw();
  }

  screenshotRaw(): string {
    return this.client.screenshot();
  }

  // ============ UI ============

  async getUiHierarchy(deviceId?: string): Promise<string> {
    return this.getClient(deviceId).getUiHierarchy();
  }

  // ============ App management (AppManagementAdapter) ============

  openUrl(url: string, deviceId?: string): string {
    return this.getClient(deviceId).openUrl(url);
  }

  launchApp(packageName: string, deviceId?: string): string {
    return this.getClient(deviceId).launchApp(packageName);
  }

  stopApp(packageName: string, deviceId?: string): void {
    this.getClient(deviceId).stopApp(packageName);
  }

  installApp(path: string, deviceId?: string): string {
    return this.getClient(deviceId).installApp(path);
  }

  // ============ App inventory (AppInventoryAdapter) ============

  listApps(deviceId?: string): string[] {
    return this.getClient(deviceId).listPackages();
  }

  uninstallApp(packageName: string, deviceId?: string): string {
    return this.getClient(deviceId).uninstallApp(packageName);
  }

  // ============ Shell / Logs (ShellAdapter) ============

  shell(command: string, deviceId?: string): string {
    return this.getClient(deviceId).shell(command);
  }

  getLogs(options: {
    level?: string;
    tag?: string;
    lines?: number;
    package?: string;
  } = {}, deviceId?: string): string {
    return this.getClient(deviceId).getLogs(options);
  }

  clearLogs(deviceId?: string): string {
    return this.getClient(deviceId).clearLogs();
  }

  // ============ File transfer (FileTransferAdapter) ============

  pushFile(localPath: string, remotePath: string, deviceId?: string): string {
    return this.getClient(deviceId).pushFile(localPath, remotePath);
  }

  pullFile(remotePath: string, localPath?: string, deviceId?: string): string {
    return this.getClient(deviceId).pullFile(remotePath, localPath);
  }

  grantPermission(id: string, permission: string, deviceId?: string): string {
    return this.getClient(deviceId).grantPermission(id, permission);
  }
  revokePermission(id: string, permission: string, deviceId?: string): string {
    return this.getClient(deviceId).revokePermission(id, permission);
  }
  resetPermissions(id: string, deviceId?: string): string {
    return this.getClient(deviceId).resetPermissions(id);
  }

  // ============ System info ============

  async getSystemInfo(deviceId?: string): Promise<string> {
    return this.getClient(deviceId).getSystemInfo();
  }
}
