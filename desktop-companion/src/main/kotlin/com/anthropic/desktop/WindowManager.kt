package com.anthropic.desktop

import com.sun.jna.Native
import com.sun.jna.Pointer
import com.sun.jna.platform.mac.CoreFoundation.*
import com.sun.jna.platform.win32.User32
import com.sun.jna.platform.win32.WinDef
import com.sun.jna.platform.win32.WinUser
import java.awt.Rectangle

/**
 * Cross-platform window management
 */
class WindowManager {
    private val isMac = System.getProperty("os.name").lowercase().contains("mac")
    private val isWindows = System.getProperty("os.name").lowercase().contains("windows")

    /**
     * Get list of all visible windows
     */
    fun getWindows(): List<WindowInfo> {
        return when {
            isMac -> getMacWindows()
            isWindows -> getWindowsWindows()
            else -> getLinuxWindows()
        }
    }

    /**
     * Get window info result with active window
     */
    fun getWindowListResult(): WindowListResult {
        val windows = getWindows()
        val activeId = windows.find { it.focused }?.id
        return WindowListResult(windows, activeId)
    }

    /**
     * Get bounds of a specific window
     */
    fun getWindowBounds(windowId: String): Rectangle {
        val windows = getWindows()
        val window = windows.find { it.id == windowId }
            ?: throw IllegalArgumentException("Window not found: $windowId")

        return Rectangle(
            window.bounds.x,
            window.bounds.y,
            window.bounds.width,
            window.bounds.height
        )
    }

    /**
     * Focus a window
     */
    fun focusWindow(windowId: String) {
        when {
            isMac -> focusMacWindow(windowId)
            isWindows -> focusWindowsWindow(windowId)
            else -> focusLinuxWindow(windowId)
        }
    }

    /**
     * Resize a window
     */
    fun resizeWindow(windowId: String?, width: Int, height: Int) {
        when {
            isMac -> resizeMacWindow(windowId, width, height)
            isWindows -> resizeWindowsWindow(windowId, width, height)
            else -> resizeLinuxWindow(windowId, width, height)
        }
    }

    // ============ macOS Implementation ============

    private fun getMacWindows(): List<WindowInfo> {
        val windows = mutableListOf<WindowInfo>()

        try {
            // Use AppleScript to get window list (simpler than CoreGraphics JNA)
            val script = """
                tell application "System Events"
                    set windowList to {}
                    repeat with proc in (processes whose background only is false)
                        set procName to name of proc
                        repeat with win in windows of proc
                            set winName to name of win
                            set winPos to position of win
                            set winSize to size of win
                            set end of windowList to {procName, winName, item 1 of winPos, item 2 of winPos, item 1 of winSize, item 2 of winSize}
                        end repeat
                    end repeat
                    return windowList
                end tell
            """.trimIndent()

            val process = ProcessBuilder("osascript", "-e", script).start()
            val output = process.inputStream.bufferedReader().readText()
            process.waitFor()

            // Parse AppleScript output
            // Format: {{procName, winName, x, y, w, h}, ...}
            parseAppleScriptWindowList(output, windows)
        } catch (e: Exception) {
            System.err.println("Error getting macOS windows: ${e.message}")
        }

        // Mark first window as focused (simplified)
        if (windows.isNotEmpty()) {
            windows[0] = windows[0].copy(focused = true)
        }

        return windows
    }

    private fun parseAppleScriptWindowList(output: String, windows: MutableList<WindowInfo>) {
        // Simple parsing of AppleScript list output
        var index = 0
        val pattern = Regex("""\{([^,]+),\s*([^,]*),\s*(-?\d+),\s*(-?\d+),\s*(\d+),\s*(\d+)\}""")

        pattern.findAll(output).forEach { match ->
            val (procName, winName, x, y, w, h) = match.destructured
            windows.add(
                WindowInfo(
                    id = "mac_${index++}",
                    title = winName.trim().ifEmpty { procName.trim() },
                    bounds = Bounds(x.toInt(), y.toInt(), w.toInt(), h.toInt()),
                    focused = false,
                    ownerName = procName.trim()
                )
            )
        }
    }

    private fun focusMacWindow(windowId: String) {
        val windows = getMacWindows()
        val window = windows.find { it.id == windowId } ?: return

        val script = """
            tell application "${window.ownerName}"
                activate
            end tell
        """.trimIndent()

        ProcessBuilder("osascript", "-e", script).start().waitFor()
    }

    private fun resizeMacWindow(windowId: String?, width: Int, height: Int) {
        val script = """
            tell application "System Events"
                set frontApp to first application process whose frontmost is true
                tell frontApp
                    set size of window 1 to {$width, $height}
                end tell
            end tell
        """.trimIndent()

        ProcessBuilder("osascript", "-e", script).start().waitFor()
    }

    // ============ Windows Implementation ============

    private fun getWindowsWindows(): List<WindowInfo> {
        val windows = mutableListOf<WindowInfo>()

        try {
            val user32 = User32.INSTANCE
            val foreground = user32.GetForegroundWindow()

            user32.EnumWindows({ hwnd, _ ->
                if (user32.IsWindowVisible(hwnd)) {
                    val title = CharArray(512)
                    user32.GetWindowText(hwnd, title, 512)
                    val titleStr = String(title).trim('\u0000')

                    if (titleStr.isNotEmpty()) {
                        val rect = WinDef.RECT()
                        user32.GetWindowRect(hwnd, rect)

                        windows.add(
                            WindowInfo(
                                id = "win_${hwnd.pointer}",
                                title = titleStr,
                                bounds = Bounds(
                                    rect.left,
                                    rect.top,
                                    rect.right - rect.left,
                                    rect.bottom - rect.top
                                ),
                                focused = hwnd == foreground
                            )
                        )
                    }
                }
                true
            }, null)
        } catch (e: Exception) {
            System.err.println("Error getting Windows windows: ${e.message}")
        }

        return windows
    }

    private fun focusWindowsWindow(windowId: String) {
        try {
            val user32 = User32.INSTANCE
            // Extract pointer from window ID
            val ptrStr = windowId.removePrefix("win_")
            val ptr = Pointer(ptrStr.toLong())
            val hwnd = WinDef.HWND(ptr)

            user32.SetForegroundWindow(hwnd)
            user32.BringWindowToTop(hwnd)
        } catch (e: Exception) {
            System.err.println("Error focusing window: ${e.message}")
        }
    }

    private fun resizeWindowsWindow(windowId: String?, width: Int, height: Int) {
        try {
            val user32 = User32.INSTANCE
            val hwnd = if (windowId != null) {
                val ptrStr = windowId.removePrefix("win_")
                WinDef.HWND(Pointer(ptrStr.toLong()))
            } else {
                user32.GetForegroundWindow()
            }

            val rect = WinDef.RECT()
            user32.GetWindowRect(hwnd, rect)

            user32.MoveWindow(hwnd, rect.left, rect.top, width, height, true)
        } catch (e: Exception) {
            System.err.println("Error resizing window: ${e.message}")
        }
    }

    // ============ Linux Implementation ============

    private fun getLinuxWindows(): List<WindowInfo> {
        val windows = mutableListOf<WindowInfo>()

        try {
            // Use wmctrl to list windows
            val process = ProcessBuilder("wmctrl", "-l", "-G").start()
            val output = process.inputStream.bufferedReader().readText()
            process.waitFor()

            // Parse wmctrl output
            // Format: 0x12345678  0 x y w h hostname title
            val pattern = Regex("""(0x[0-9a-f]+)\s+\d+\s+(-?\d+)\s+(-?\d+)\s+(\d+)\s+(\d+)\s+\S+\s+(.*)""")

            pattern.findAll(output).forEach { match ->
                val (id, x, y, w, h, title) = match.destructured
                windows.add(
                    WindowInfo(
                        id = id,
                        title = title.trim(),
                        bounds = Bounds(x.toInt(), y.toInt(), w.toInt(), h.toInt()),
                        focused = false
                    )
                )
            }

            // Get active window
            val activeProcess = ProcessBuilder("xdotool", "getactivewindow").start()
            val activeId = activeProcess.inputStream.bufferedReader().readText().trim()
            activeProcess.waitFor()

            // Mark active window
            windows.replaceAll { win ->
                if (win.id.contains(activeId)) win.copy(focused = true) else win
            }
        } catch (e: Exception) {
            System.err.println("Error getting Linux windows: ${e.message}")
        }

        return windows
    }

    private fun focusLinuxWindow(windowId: String) {
        try {
            ProcessBuilder("wmctrl", "-i", "-a", windowId).start().waitFor()
        } catch (e: Exception) {
            System.err.println("Error focusing window: ${e.message}")
        }
    }

    private fun resizeLinuxWindow(windowId: String?, width: Int, height: Int) {
        try {
            val id = windowId ?: run {
                val process = ProcessBuilder("xdotool", "getactivewindow").start()
                val output = process.inputStream.bufferedReader().readText().trim()
                process.waitFor()
                output
            }

            ProcessBuilder("wmctrl", "-i", "-r", id, "-e", "0,-1,-1,$width,$height").start().waitFor()
        } catch (e: Exception) {
            System.err.println("Error resizing window: ${e.message}")
        }
    }
}
