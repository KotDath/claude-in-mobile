import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs/promises";

const execAsync = promisify(exec);

export interface ScreenshotOptions {
  compress?: boolean;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

export interface ScreenshotResult {
  data: string;
  mimeType: string;
}

export interface Device {
  id: string;
  name: string;
  platform: "aurora";
  state: string;
  isSimulator: boolean;
  host?: string;
}

export class AuroraClient {
  private async runCommand(command: string): Promise<string> {
    try {
      const { stdout, stderr } = await execAsync(command);
      if (stderr?.includes("No device selected")) {
        throw new Error(
          "No Aurora device selected. Run:\n" +
          "  1. audb device list\n" +
          "  2. audb select <device>"
        );
      }
      return stdout.trim();
    } catch (error: unknown) {
      if (error instanceof Error) {
        if (error.message.includes("audb: command not found")) {
          throw new Error("audb not found. Install: cargo install audb-client");
        }
        throw new Error(`Command '${command}' failed: ${error.message}`);
      }
      throw new Error(`Command '${command}' failed with unknown error`);
    }
  }

  async checkAvailability(): Promise<boolean> {
    try {
      await execAsync("audb --version");
      return true;
    } catch {
      return false;
    }
  }

  async listDevices(): Promise<Device[]> {
    // TODO: parse audb device list output
    return [];
  }

  async getActiveDevice(): Promise<string> {
    try {
      const path = `${process.env.HOME}/.config/audb/current_device`;
      return await fs.readFile(path, "utf-8");
    } catch {
      throw new Error("No device selected");
    }
  }

  /**
   * Performs a tap at the specified coordinates.
   * @param x - X coordinate in pixels
   * @param y - Y coordinate in pixels
   */
  async tap(x: number, y: number): Promise<void> {
    await this.runCommand(`audb tap ${x} ${y}`);
  }

  /**
   * Performs a long press at the specified coordinates.
   * @param x - X coordinate in pixels
   * @param y - Y coordinate in pixels
   * @param duration - Duration of the press in milliseconds
   */
  async longPress(x: number, y: number, duration: number): Promise<void> {
    await this.runCommand(`audb tap ${x} ${y} --duration ${duration}`);
  }

  /**
   * Performs a swipe in the specified direction.
   * @param direction - Direction to swipe: "up", "down", "left", or "right"
   */
  async swipeDirection(direction: "up"|"down"|"left"|"right"): Promise<void> {
    await this.runCommand(`audb swipe ${direction}`);
  }

  /**
   * Performs a swipe from one coordinate to another.
   * @param x1 - Starting X coordinate in pixels
   * @param y1 - Starting Y coordinate in pixels
   * @param x2 - Ending X coordinate in pixels
   * @param y2 - Ending Y coordinate in pixels
   */
  async swipeCoords(x1: number, y1: number, x2: number, y2: number): Promise<void> {
    await this.runCommand(`audb swipe ${x1} ${y1} ${x2} ${y2}`);
  }

  /**
   * Sends a keyboard key event to the device.
   * @param key - Key name to send (e.g., "Enter", "Back", "Home")
   */
  async pressKey(key: string): Promise<void> {
    await this.runCommand(`audb key ${key}`);
  }
}

export const auroraClient = new AuroraClient();

