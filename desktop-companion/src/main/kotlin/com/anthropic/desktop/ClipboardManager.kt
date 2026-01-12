package com.anthropic.desktop

import java.awt.Toolkit
import java.awt.datatransfer.DataFlavor
import java.awt.datatransfer.StringSelection

/**
 * System clipboard management
 */
class ClipboardManager {
    private val clipboard = Toolkit.getDefaultToolkit().systemClipboard

    /**
     * Get text from clipboard
     */
    fun getText(): String? {
        return try {
            if (clipboard.isDataFlavorAvailable(DataFlavor.stringFlavor)) {
                clipboard.getData(DataFlavor.stringFlavor) as? String
            } else {
                null
            }
        } catch (e: Exception) {
            null
        }
    }

    /**
     * Set text to clipboard
     */
    fun setText(text: String) {
        clipboard.setContents(StringSelection(text), null)
    }

    /**
     * Check if clipboard has text
     */
    fun hasText(): Boolean {
        return try {
            clipboard.isDataFlavorAvailable(DataFlavor.stringFlavor)
        } catch (e: Exception) {
            false
        }
    }

    /**
     * Check if clipboard has image
     */
    fun hasImage(): Boolean {
        return try {
            clipboard.isDataFlavorAvailable(DataFlavor.imageFlavor)
        } catch (e: Exception) {
            false
        }
    }

    /**
     * Clear clipboard
     */
    fun clear() {
        clipboard.setContents(StringSelection(""), null)
    }
}
