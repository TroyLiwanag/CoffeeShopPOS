package com.cafecorazon.pos.printer

import java.io.ByteArrayOutputStream
import java.nio.charset.Charset

class EscPosBuilder(private val paperWidthChars: Int = 32) { // 32 chars for 58mm (POS58D), 48 chars for 80mm

    private val outputStream = ByteArrayOutputStream()

    companion object {
        val ESC: Byte = 0x1B
        val GS: Byte = 0x1D
        val INIT = byteArrayOf(ESC, 0x40) // Initialize
        val ALIGN_LEFT = byteArrayOf(ESC, 0x61, 0x00)
        val ALIGN_CENTER = byteArrayOf(ESC, 0x61, 0x01)
        val ALIGN_RIGHT = byteArrayOf(ESC, 0x61, 0x02)
        val BOLD_ON = byteArrayOf(ESC, 0x45, 0x01)
        val BOLD_OFF = byteArrayOf(ESC, 0x45, 0x00)
        val TEXT_NORMAL = byteArrayOf(GS, 0x21, 0x00)
        val TEXT_DOUBLE_SIZE = byteArrayOf(GS, 0x21, 0x11)
        val FEED_LINE = byteArrayOf(0x0A)
        val CUT_PAPER = byteArrayOf(GS, 0x56, 0x41, 0x00)
        val CODEPAGE_PC850 = byteArrayOf(ESC, 0x74, 0x02) // Select PC850 character table (as seen on printer self-test)
    }

    init {
        outputStream.write(INIT)
        outputStream.write(CODEPAGE_PC850)
    }

    fun alignLeft(): EscPosBuilder {
        outputStream.write(ALIGN_LEFT)
        return this
    }

    fun alignCenter(): EscPosBuilder {
        outputStream.write(ALIGN_CENTER)
        return this
    }

    fun alignRight(): EscPosBuilder {
        outputStream.write(ALIGN_RIGHT)
        return this
    }

    fun bold(enable: Boolean): EscPosBuilder {
        outputStream.write(if (enable) BOLD_ON else BOLD_OFF)
        return this
    }

    fun textNormal(): EscPosBuilder {
        outputStream.write(TEXT_NORMAL)
        return this
    }

    fun textDoubleSize(): EscPosBuilder {
        outputStream.write(TEXT_DOUBLE_SIZE)
        return this
    }

    fun printText(text: String): EscPosBuilder {
        try {
            outputStream.write(text.toByteArray(Charset.forName("Cp850")))
        } catch (e: Exception) {
            outputStream.write(text.toByteArray(Charset.forName("UTF-8")))
        }
        return this
    }

    fun printLine(text: String = ""): EscPosBuilder {
        if (text.isNotEmpty()) {
            printText(text)
        }
        outputStream.write(FEED_LINE)
        return this
    }

    fun printDashedLine(): EscPosBuilder {
        val dash = "-".repeat(paperWidthChars)
        printLine(dash)
        return this
    }

    fun printRow(left: String, right: String): EscPosBuilder {
        val maxLen = paperWidthChars
        val rightLen = right.length
        val leftMax = maxOf(0, maxLen - rightLen - 1)

        val trimmedLeft = if (left.length > leftMax) left.substring(0, leftMax) else left
        val padding = maxOf(1, maxLen - trimmedLeft.length - rightLen)

        val line = trimmedLeft + " ".repeat(padding) + right
        printLine(line)
        return this
    }

    fun printQrCode(data: String, size: Int = 6): EscPosBuilder {
        try {
            val bytes = data.toByteArray(Charset.forName("UTF-8"))
            val len = bytes.size + 3

            // GS ( k pL pH cn fn n1 n2 (Set model)
            outputStream.write(byteArrayOf(GS, 0x28, 0x6B, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00))
            // GS ( k pL pH cn fn n (Set module size)
            outputStream.write(byteArrayOf(GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, size.toByte()))
            // GS ( k pL pH cn fn n (Set error correction level L)
            outputStream.write(byteArrayOf(GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x45, 0x30))
            // GS ( k pL pH cn fn m d1...dk (Store data)
            val pL = (len % 256).toByte()
            val pH = (len / 256).toByte()
            outputStream.write(byteArrayOf(GS, 0x28, 0x6B, pL, pH, 0x31, 0x50, 0x30))
            outputStream.write(bytes)
            // GS ( k pL pH cn fn m (Print QR code)
            outputStream.write(byteArrayOf(GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30))
            outputStream.write(FEED_LINE)
        } catch (ignored: Exception) {
        }
        return this
    }

    fun feedLines(count: Int = 3): EscPosBuilder {
        for (i in 0 until count) {
            outputStream.write(FEED_LINE)
        }
        return this
    }

    fun cut(): EscPosBuilder {
        feedLines(2)
        outputStream.write(CUT_PAPER)
        return this
    }

    fun build(): ByteArray {
        return outputStream.toByteArray()
    }
}
