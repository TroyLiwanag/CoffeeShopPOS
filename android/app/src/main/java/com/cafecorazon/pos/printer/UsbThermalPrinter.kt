package com.cafecorazon.pos.printer

import android.content.Context
import android.hardware.usb.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class UsbThermalPrinter(private val context: Context) : ThermalPrinterManager {

    private var usbManager: UsbManager? = context.getSystemService(Context.USB_SERVICE) as? UsbManager
    private var usbConnection: UsbDeviceConnection? = null
    private var usbEndpoint: UsbEndpoint? = null

    override suspend fun connect(address: String): Result<Boolean> = withContext(Dispatchers.IO) {
        try {
            val manager = usbManager ?: return@withContext Result.failure(Exception("USB service not available"))
            val deviceList = manager.deviceList
            val device = deviceList.values.find { it.deviceName == address || "${it.vendorId}:${it.productId}" == address }
                ?: deviceList.values.firstOrNull()
                ?: return@withContext Result.failure(Exception("No USB printer device found"))

            val intf = device.getInterface(0)
            val endpoint = intf.getEndpoint(0)

            val connection = manager.openDevice(device)
                ?: return@withContext Result.failure(Exception("Failed to open USB connection"))

            connection.claimInterface(intf, true)
            usbConnection = connection
            usbEndpoint = endpoint

            Result.success(true)
        } catch (e: Exception) {
            disconnect()
            Result.failure(e)
        }
    }

    override suspend fun printReceipt(bytes: ByteArray): Result<Boolean> = withContext(Dispatchers.IO) {
        try {
            val conn = usbConnection ?: return@withContext Result.failure(Exception("USB printer not connected"))
            val ep = usbEndpoint ?: return@withContext Result.failure(Exception("USB endpoint missing"))

            val transferred = conn.bulkTransfer(ep, bytes, bytes.size, 5000)
            if (transferred >= 0) {
                Result.success(true)
            } else {
                Result.failure(Exception("USB bulk transfer failed"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun disconnect() {
        withContext(Dispatchers.IO) {
            try {
                usbConnection?.close()
            } catch (ignored: Exception) {
            } finally {
                usbConnection = null
                usbEndpoint = null
            }
        }
    }

    override fun isConnected(): Boolean {
        return usbConnection != null
    }
}
