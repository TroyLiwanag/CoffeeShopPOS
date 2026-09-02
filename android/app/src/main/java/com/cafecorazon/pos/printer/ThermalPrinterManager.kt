package com.cafecorazon.pos.printer

interface ThermalPrinterManager {
    suspend fun connect(address: String): Result<Boolean>
    suspend fun printReceipt(bytes: ByteArray): Result<Boolean>
    suspend fun disconnect()
    fun isConnected(): Boolean
}
