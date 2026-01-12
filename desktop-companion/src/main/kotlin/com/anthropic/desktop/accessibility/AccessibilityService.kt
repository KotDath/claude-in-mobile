package com.anthropic.desktop.accessibility

import com.anthropic.desktop.PermissionStatus
import com.anthropic.desktop.UiElement
import com.anthropic.desktop.UiHierarchy
import com.anthropic.desktop.WindowInfo
import com.anthropic.desktop.WindowManager

/**
 * Interface for platform-specific accessibility services
 */
interface AccessibilityService {
    /**
     * Check if accessibility permissions are granted
     */
    fun checkPermissions(): PermissionStatus

    /**
     * Get UI hierarchy from accessibility tree
     */
    fun getHierarchy(windowId: String? = null): UiHierarchy

    /**
     * Find elements by text
     */
    fun findByText(text: String): List<UiElement>

    /**
     * Find element by ID
     */
    fun findById(id: String): UiElement?

    companion object {
        /**
         * Create platform-specific accessibility service
         */
        fun create(): AccessibilityService {
            val osName = System.getProperty("os.name").lowercase()
            return when {
                osName.contains("mac") -> MacOSAccessibility()
                osName.contains("windows") -> WindowsAccessibility()
                else -> LinuxAccessibility()
            }
        }
    }
}

/**
 * Fallback implementation that provides basic functionality without OS accessibility
 */
abstract class BaseAccessibilityService : AccessibilityService {
    protected val windowManager = WindowManager()
    protected var cachedElements: List<UiElement> = emptyList()
    protected var elementIndex = 0

    override fun findByText(text: String): List<UiElement> {
        val searchText = text.lowercase()
        return cachedElements.filter {
            it.text?.lowercase()?.contains(searchText) == true ||
            it.contentDescription?.lowercase()?.contains(searchText) == true
        }
    }

    override fun findById(id: String): UiElement? {
        return cachedElements.find { it.id == id }
    }

    /**
     * Create a UI element from basic info
     */
    protected fun createElement(
        text: String? = null,
        id: String? = null,
        role: String = "unknown",
        x: Int,
        y: Int,
        width: Int,
        height: Int,
        clickable: Boolean = true,
        enabled: Boolean = true,
        focused: Boolean = false
    ): UiElement {
        return UiElement(
            index = elementIndex++,
            id = id,
            text = text,
            contentDescription = null,
            className = role,
            role = role,
            bounds = com.anthropic.desktop.Bounds(x, y, width, height),
            clickable = clickable,
            enabled = enabled,
            focused = focused,
            focusable = clickable,
            centerX = x + width / 2,
            centerY = y + height / 2
        )
    }

    protected fun resetIndex() {
        elementIndex = 0
    }
}
