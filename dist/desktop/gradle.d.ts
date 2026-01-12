/**
 * Gradle task detection and launcher for Compose Desktop projects
 */
import { ChildProcess } from "child_process";
import type { GradleProject, LaunchOptions } from "./types.js";
export declare class GradleLauncher {
    /**
     * Check if Gradle wrapper exists in project
     */
    hasGradleWrapper(projectPath: string): boolean;
    /**
     * Get Gradle executable (wrapper or system gradle)
     */
    private getGradleExecutable;
    /**
     * Detect available desktop run tasks in the project
     */
    detectDesktopTasks(projectPath: string): Promise<string[]>;
    /**
     * Analyze Gradle project and return info
     */
    analyzeProject(projectPath: string): Promise<GradleProject>;
    /**
     * Launch desktop app via Gradle
     * Returns the spawned process
     */
    launch(options: LaunchOptions): ChildProcess;
    /**
     * Synchronous version of detectDesktopTasks (for launch)
     */
    private detectDesktopTasksSync;
    /**
     * Stop a running Gradle process
     */
    stop(process: ChildProcess): void;
    /**
     * Check if Gradle daemon is running
     */
    isGradleDaemonRunning(projectPath: string): boolean;
    /**
     * Stop Gradle daemon
     */
    stopGradleDaemon(projectPath: string): void;
}
//# sourceMappingURL=gradle.d.ts.map