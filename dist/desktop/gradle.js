/**
 * Gradle task detection and launcher for Compose Desktop projects
 */
import { execSync, spawn } from "child_process";
import * as path from "path";
import * as fs from "fs";
// Known desktop run task patterns
const DESKTOP_TASK_PATTERNS = [
    ":desktopApp:run",
    ":composeApp:desktopRun",
    ":desktop:run",
    ":app:desktopRun",
    "desktopRun",
    "runDesktop",
];
export class GradleLauncher {
    /**
     * Check if Gradle wrapper exists in project
     */
    hasGradleWrapper(projectPath) {
        const wrapperScript = process.platform === "win32" ? "gradlew.bat" : "gradlew";
        const wrapperPath = path.join(projectPath, wrapperScript);
        return fs.existsSync(wrapperPath);
    }
    /**
     * Get Gradle executable (wrapper or system gradle)
     */
    getGradleExecutable(projectPath) {
        if (this.hasGradleWrapper(projectPath)) {
            return process.platform === "win32"
                ? path.join(projectPath, "gradlew.bat")
                : path.join(projectPath, "gradlew");
        }
        return "gradle";
    }
    /**
     * Detect available desktop run tasks in the project
     */
    async detectDesktopTasks(projectPath) {
        const gradle = this.getGradleExecutable(projectPath);
        try {
            // Run gradle tasks and parse output
            const output = execSync(`"${gradle}" tasks --all`, {
                cwd: projectPath,
                encoding: "utf-8",
                maxBuffer: 10 * 1024 * 1024,
                timeout: 60000,
            });
            const tasks = [];
            const lines = output.split("\n");
            for (const line of lines) {
                const trimmed = line.trim();
                // Look for task lines (format: "taskName - description" or just "taskName")
                const taskMatch = trimmed.match(/^(:\S+|[a-zA-Z]\S*)\s*(-|$)/);
                if (taskMatch) {
                    const taskName = taskMatch[1];
                    // Check if it matches known desktop patterns
                    for (const pattern of DESKTOP_TASK_PATTERNS) {
                        if (taskName.includes(pattern) ||
                            taskName.toLowerCase().includes("desktop") && taskName.toLowerCase().includes("run")) {
                            tasks.push(taskName);
                            break;
                        }
                    }
                }
            }
            // Deduplicate and sort
            return [...new Set(tasks)].sort();
        }
        catch (error) {
            // Fallback: check common task names directly
            const commonTasks = [];
            for (const pattern of DESKTOP_TASK_PATTERNS) {
                try {
                    execSync(`"${gradle}" ${pattern} --dry-run`, {
                        cwd: projectPath,
                        encoding: "utf-8",
                        timeout: 30000,
                        stdio: "pipe",
                    });
                    commonTasks.push(pattern);
                }
                catch {
                    // Task doesn't exist
                }
            }
            return commonTasks;
        }
    }
    /**
     * Analyze Gradle project and return info
     */
    async analyzeProject(projectPath) {
        if (!fs.existsSync(projectPath)) {
            throw new Error(`Project path does not exist: ${projectPath}`);
        }
        // Check for build.gradle or build.gradle.kts
        const hasBuildGradle = fs.existsSync(path.join(projectPath, "build.gradle")) ||
            fs.existsSync(path.join(projectPath, "build.gradle.kts"));
        if (!hasBuildGradle) {
            throw new Error(`No build.gradle or build.gradle.kts found in: ${projectPath}`);
        }
        const desktopTasks = await this.detectDesktopTasks(projectPath);
        return {
            path: projectPath,
            desktopTasks,
            selectedTask: desktopTasks[0], // Default to first detected task
        };
    }
    /**
     * Launch desktop app via Gradle
     * Returns the spawned process
     */
    launch(options) {
        const { projectPath, task, jvmArgs = [], env = {} } = options;
        if (!projectPath) {
            throw new Error("projectPath is required to launch via Gradle");
        }
        if (!fs.existsSync(projectPath)) {
            throw new Error(`Project path does not exist: ${projectPath}`);
        }
        const gradle = this.getGradleExecutable(projectPath);
        // Determine task to run
        let targetTask = task;
        if (!targetTask) {
            // Auto-detect
            const detected = this.detectDesktopTasksSync(projectPath);
            if (detected.length === 0) {
                throw new Error(`No desktop run task found in project. ` +
                    `Please specify task explicitly or ensure project has Compose Desktop configured.`);
            }
            targetTask = detected[0];
        }
        // Build command args
        const args = [targetTask];
        // Add JVM args
        if (jvmArgs.length > 0) {
            args.push(`-Dorg.gradle.jvmargs=${jvmArgs.join(" ")}`);
        }
        // Add --console=plain for cleaner output
        args.push("--console=plain");
        // Merge environment
        const processEnv = {
            ...process.env,
            ...env,
        };
        // Spawn Gradle process
        const child = spawn(gradle, args, {
            cwd: projectPath,
            env: processEnv,
            stdio: ["pipe", "pipe", "pipe"],
            shell: process.platform === "win32",
        });
        return child;
    }
    /**
     * Synchronous version of detectDesktopTasks (for launch)
     */
    detectDesktopTasksSync(projectPath) {
        const gradle = this.getGradleExecutable(projectPath);
        const tasks = [];
        // Quick check for common patterns
        for (const pattern of DESKTOP_TASK_PATTERNS) {
            try {
                execSync(`"${gradle}" ${pattern} --dry-run`, {
                    cwd: projectPath,
                    encoding: "utf-8",
                    timeout: 30000,
                    stdio: "pipe",
                });
                tasks.push(pattern);
            }
            catch {
                // Task doesn't exist
            }
        }
        return tasks;
    }
    /**
     * Stop a running Gradle process
     */
    stop(process) {
        if (process && !process.killed) {
            // Try graceful shutdown first
            process.kill("SIGTERM");
            // Force kill after timeout
            setTimeout(() => {
                if (!process.killed) {
                    process.kill("SIGKILL");
                }
            }, 5000);
        }
    }
    /**
     * Check if Gradle daemon is running
     */
    isGradleDaemonRunning(projectPath) {
        const gradle = this.getGradleExecutable(projectPath);
        try {
            const output = execSync(`"${gradle}" --status`, {
                cwd: projectPath,
                encoding: "utf-8",
                timeout: 10000,
            });
            return output.includes("IDLE") || output.includes("BUSY");
        }
        catch {
            return false;
        }
    }
    /**
     * Stop Gradle daemon
     */
    stopGradleDaemon(projectPath) {
        const gradle = this.getGradleExecutable(projectPath);
        try {
            execSync(`"${gradle}" --stop`, {
                cwd: projectPath,
                encoding: "utf-8",
                timeout: 30000,
            });
        }
        catch {
            // Ignore errors
        }
    }
}
//# sourceMappingURL=gradle.js.map