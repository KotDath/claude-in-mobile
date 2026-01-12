package com.anthropic.desktop.accessibility

import com.anthropic.desktop.*

/**
 * macOS Accessibility implementation
 * Uses AppleScript as a simpler alternative to JNA AXUIElement bindings
 */
class MacOSAccessibility : BaseAccessibilityService() {

    override fun checkPermissions(): PermissionStatus {
        return try {
            // Check if we have accessibility permissions by trying to get frontmost app
            val script = """
                tell application "System Events"
                    name of first application process whose frontmost is true
                end tell
            """.trimIndent()

            val process = ProcessBuilder("osascript", "-e", script).start()
            val exitCode = process.waitFor()

            if (exitCode == 0) {
                PermissionStatus(granted = true)
            } else {
                openAccessibilityPreferences()
                PermissionStatus(
                    granted = false,
                    instructions = listOf(
                        "1. System Settings > Privacy & Security > Accessibility",
                        "2. Click the lock to make changes",
                        "3. Enable access for Terminal or your IDE",
                        "4. Restart the MCP server"
                    )
                )
            }
        } catch (e: Exception) {
            openAccessibilityPreferences()
            PermissionStatus(
                granted = false,
                instructions = listOf(
                    "1. Open System Settings > Privacy & Security > Accessibility",
                    "2. Enable access for Terminal or your IDE",
                    "3. Restart the MCP server",
                    "Error: ${e.message}"
                )
            )
        }
    }

    private fun openAccessibilityPreferences() {
        try {
            ProcessBuilder(
                "open",
                "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility"
            ).start()
        } catch (e: Exception) {
            System.err.println("Failed to open accessibility preferences: ${e.message}")
        }
    }

    override fun getHierarchy(windowId: String?): UiHierarchy {
        resetIndex()
        val windows = windowManager.getWindows()
        val scaleFactor = ScreenCapture().getScaleFactor()

        // Try to get UI elements from frontmost app
        val elements = try {
            getUIElementsFromFrontmostApp()
        } catch (e: Exception) {
            System.err.println("Failed to get UI elements: ${e.message}")
            emptyList()
        }

        cachedElements = elements

        return UiHierarchy(
            windows = windows,
            elements = elements,
            scaleFactor = scaleFactor
        )
    }

    private fun getUIElementsFromFrontmostApp(): List<UiElement> {
        val elements = mutableListOf<UiElement>()

        try {
            // Get UI elements using AppleScript
            val script = """
                tell application "System Events"
                    set frontApp to first application process whose frontmost is true
                    set uiElements to {}

                    tell frontApp
                        repeat with win in windows
                            -- Get window info
                            set winPos to position of win
                            set winSize to size of win

                            -- Get all UI elements in the window
                            set allElements to entire contents of win
                            repeat with elem in allElements
                                try
                                    set elemClass to class of elem as string
                                    set elemRole to role of elem
                                    set elemTitle to ""
                                    set elemDesc to ""
                                    set elemPos to {0, 0}
                                    set elemSize to {0, 0}
                                    set elemEnabled to true
                                    set elemFocused to false

                                    try
                                        set elemTitle to title of elem
                                    end try
                                    try
                                        set elemTitle to value of elem
                                    end try
                                    try
                                        set elemDesc to description of elem
                                    end try
                                    try
                                        set elemPos to position of elem
                                    end try
                                    try
                                        set elemSize to size of elem
                                    end try
                                    try
                                        set elemEnabled to enabled of elem
                                    end try
                                    try
                                        set elemFocused to focused of elem
                                    end try

                                    if item 1 of elemSize > 0 and item 2 of elemSize > 0 then
                                        set end of uiElements to {elemRole, elemTitle, elemDesc, item 1 of elemPos, item 2 of elemPos, item 1 of elemSize, item 2 of elemSize, elemEnabled, elemFocused}
                                    end if
                                end try
                            end repeat
                        end repeat
                    end tell

                    return uiElements
                end tell
            """.trimIndent()

            val process = ProcessBuilder("osascript", "-e", script).start()
            val output = process.inputStream.bufferedReader().readText()
            val exitCode = process.waitFor()

            if (exitCode == 0 && output.isNotBlank()) {
                parseAppleScriptElements(output, elements)
            }
        } catch (e: Exception) {
            System.err.println("Error getting UI elements: ${e.message}")
        }

        // If no elements found, provide at least screen bounds
        if (elements.isEmpty()) {
            val screenSize = ScreenCapture().getScreenSize()
            elements.add(
                createElement(
                    text = "Screen",
                    role = "AXWindow",
                    x = 0,
                    y = 0,
                    width = screenSize.first,
                    height = screenSize.second,
                    clickable = true
                )
            )
        }

        return elements
    }

    private fun parseAppleScriptElements(output: String, elements: MutableList<UiElement>) {
        // Parse AppleScript list output
        // Format: {{role, title, desc, x, y, w, h, enabled, focused}, ...}
        val pattern = Regex("""\{([^,]*),\s*([^,]*),\s*([^,]*),\s*(-?\d+),\s*(-?\d+),\s*(\d+),\s*(\d+),\s*(true|false),\s*(true|false)\}""")

        pattern.findAll(output).forEach { match ->
            val groups = match.groupValues
            val role = groups[1].trim()
            val title = groups[2].trim()
            val desc = groups[3].trim()
            val x = groups[4].toIntOrNull() ?: 0
            val y = groups[5].toIntOrNull() ?: 0
            val w = groups[6].toIntOrNull() ?: 0
            val h = groups[7].toIntOrNull() ?: 0
            val enabled = groups[8] == "true"
            val focused = groups[9] == "true"

            // Determine if clickable based on role
            val clickable = role in listOf(
                "AXButton", "AXLink", "AXCheckBox", "AXRadioButton",
                "AXMenuItem", "AXMenuButton", "AXTab", "AXTextField",
                "AXTextArea", "AXComboBox", "AXPopUpButton"
            )

            elements.add(
                createElement(
                    text = title.ifEmpty { null },
                    id = null,
                    role = role,
                    x = x,
                    y = y,
                    width = w,
                    height = h,
                    clickable = clickable,
                    enabled = enabled,
                    focused = focused
                )
            )
        }
    }
}
