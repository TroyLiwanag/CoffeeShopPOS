package com.cafecorazon.pos.printer

import android.annotation.SuppressLint
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothSocket
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.OutputStream
import java.util.UUID

class BluetoothThermalPrinter : ThermalPrinterManager {

    private var socket: BluetoothSocket? = null
    private var outputStream: OutputStream? = null

    // Standard SerialPortServiceClass_UUID for Bluetooth thermal printers
    private val PRINTER_UUID: UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB")

    @SuppressLint("MissingPermission")
    override suspend fun connect(address: String): Result<Boolean> = withContext(Dispatchers.IO) {
        try {
            val adapter = BluetoothAdapter.getDefaultAdapter()
                ?: return@withContext Result.failure(Exception("Bluetooth not supported on this device"))

            if (!adapter.isEnabled) {
                return@withContext Result.failure(Exception("Bluetooth is disabled"))
            }

            val device: BluetoothDevice = adapter.getRemoteDevice(address)
            socket = device.createRfcommSocketToServiceRecord(PRINTER_UUID)
            adapter.cancelDiscovery()
            socket?.connect()
            outputStream = socket?.outputStream

            Result.success(true)
        } catch (e: Exception) {
            disconnect()
            Result.failure(e)
        }
    }

    override suspend fun printReceipt(bytes: ByteArray): Result<Boolean> = withContext(Dispatchers.IO) {
        try {
            val os = outputStream
                ?: return@withContext Result.failure(Exception("Printer not connected"))
            os.write(bytes)
            os.flush()
            Result.success(true)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun disconnect() {
        withContext(Dispatchers.IO) {
            try {
                outputStream?.close()
                socket?.close()
            } catch (ignored: Exception) {
            } finally {
                outputStream = null
                socket = null
            }
        }
    }

    override fun isConnected(): Boolean {
        return socket?.isConnected == true
    }
}
