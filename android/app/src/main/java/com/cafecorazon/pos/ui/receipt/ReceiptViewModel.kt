package com.cafecorazon.pos.ui.receipt

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.cafecorazon.pos.data.local.dao.OrderWithDetails
import com.cafecorazon.pos.data.repository.OrderRepository
import com.cafecorazon.pos.data.repository.SettingsRepository
import com.cafecorazon.pos.data.repository.ShopSettingsModel
import com.cafecorazon.pos.printer.BluetoothThermalPrinter
import com.cafecorazon.pos.printer.EscPosBuilder
import com.cafecorazon.pos.printer.UsbThermalPrinter
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

data class ReceiptUiState(
    val isLoading: Boolean = false,
    val orderDetails: OrderWithDetails? = null,
    val settings: ShopSettingsModel = ShopSettingsModel(),
    val isPrinting: Boolean = false,
    val printMessage: String? = null
)

class ReceiptViewModel(
    private val orderRepository: OrderRepository,
    private val settingsRepository: SettingsRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(ReceiptUiState())
    val uiState: StateFlow<ReceiptUiState> = _uiState.asStateFlow()

    fun loadOrder(orderId: Long) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)
            val order = orderRepository.getOrderById(orderId)
            val settings = settingsRepository.getSettingsModel()
            _uiState.value = _uiState.value.copy(
                isLoading = false,
                orderDetails = order,
                settings = settings
            )
        }
    }

    fun printThermalReceipt(context: android.content.Context) {
        val details = _uiState.value.orderDetails ?: return
        val settings = _uiState.value.settings
        val order = details.order
        val items = details.items

        val dateFormat = SimpleDateFormat("M/d/yy, h:mm a", Locale.getDefault())
        val dateStr = dateFormat.format(Date(order.createdAt))
        val orderNo = String.format("#%07d", order.id)

        val escBuilder = EscPosBuilder()
            .alignCenter()
            .textDoubleSize()
            .bold(true)
            .printLine(settings.shopName)
            .textNormal()
            .bold(false)
            .printLine(settings.businessStyle)
            .printDashedLine()
            .alignLeft()
            .printRow("Date: $dateStr", orderNo)
            .printLine("Employee: ${details.createdByUser?.fullname ?: "Staff"}")
            .printLine("POS: POS 1")
            .printDashedLine()

        items.forEach { item ->
            val name = "Item #${item.menuItemId ?: item.productId ?: 0}"
            val total = item.price * item.quantity
            escBuilder.printRow(name, "P${String.format("%.2f", total)}")
            escBuilder.printLine("  ${item.quantity} x P${String.format("%.2f", item.price)}")
        }

        val subtotal = items.sumOf { it.price * it.quantity }
        val isExempt = order.discountType == "Senior" || order.discountType == "PWD"
        val discRate = if (order.discountRate > 0) order.discountRate else 20.0

        escBuilder.printDashedLine()
            .printRow("Subtotal:", "P${String.format("%.2f", subtotal)}")

        if (order.promoDiscountAmount > 0) {
            escBuilder.printRow("Promo (${order.promoName ?: ""})", "-P${String.format("%.2f", order.promoDiscountAmount)}")
        }

        if (isExempt && order.discountAmount > 0) {
            escBuilder.printRow("${order.discountType} Disc (${discRate.toInt()}%):", "-P${String.format("%.2f", order.discountAmount)}")
        }

        escBuilder.bold(true)
            .printRow("TOTAL:", "P${String.format("%.2f", order.totalAmount)}")
            .bold(false)
            .printDashedLine()

        val hasCustomerMeta = !order.customerName.isNull_or_blank()
        val hasPromoMeta = !order.promoName.isNull_or_blank()
        if (hasCustomerMeta || isExempt || hasPromoMeta) {
            escBuilder.alignLeft()
            if (hasCustomerMeta) escBuilder.printLine("Customer: ${order.customerName}")
            if (hasPromoMeta) escBuilder.printLine("Applied Promo: ${order.promoName}")
            if (isExempt) {
                escBuilder.printLine("Discount: ${order.discountType} (${discRate.toInt()}%)")
                if (!order.discountIdNumber.isNull_or_blank()) escBuilder.printLine("${order.discountType} ID: ${order.discountIdNumber}")
                if (!order.beneficiaryName.isNull_or_blank()) escBuilder.printLine("Beneficiary: ${order.beneficiaryName}")
            }
            escBuilder.printDashedLine()
        }

        escBuilder.alignCenter()
            .printLine(settings.receiptFooter.ifBlank { "Thank you for supporting Local!!!" })
            .printDashedLine()
            .printQrCode("POS-ORD#$orderNo-${order.id}", size = 5)
            .printLine("*$orderNo*")
            .cut()

        val printBytes = escBuilder.build()

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isPrinting = true, printMessage = null)

            val transport = settings.printerTransport
            val address = settings.printerAddress.ifBlank { "86:67:7A:00:4C:9D" }

            val printer = if (transport == "USB") {
                UsbThermalPrinter(context)
            } else {
                BluetoothThermalPrinter()
            }

            if (address.isBlank()) {
                _uiState.value = _uiState.value.copy(
                    isPrinting = false,
                    printMessage = "Thermal receipt rendered! (Configure Bluetooth/USB printer MAC/ID in Settings)"
                )
                return@launch
            }

            val connRes = printer.connect(address)
            if (connRes.isSuccess) {
                val printRes = printer.printReceipt(printBytes)
                printer.disconnect()

                if (printRes.isSuccess) {
                    _uiState.value = _uiState.value.copy(isPrinting = false, printMessage = "Receipt printed successfully!")
                } else {
                    _uiState.value = _uiState.value.copy(isPrinting = false, printMessage = "Print error: ${printRes.exceptionOrNull()?.message}")
                }
            } else {
                _uiState.value = _uiState.value.copy(isPrinting = false, printMessage = "Printer connection failed: ${connRes.exceptionOrNull()?.message}")
            }
        }
    }

    class Factory(
        private val orderRepository: OrderRepository,
        private val settingsRepository: SettingsRepository
    ) : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T {
            return ReceiptViewModel(orderRepository, settingsRepository) as T
        }
    }
}
