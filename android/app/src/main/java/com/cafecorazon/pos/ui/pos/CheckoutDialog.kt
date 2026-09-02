package com.cafecorazon.pos.ui.pos

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Clear
import androidx.compose.material.icons.filled.DoNotDisturbOn
import androidx.compose.material.icons.filled.LocalOffer
import androidx.compose.material.icons.filled.Payments
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.cafecorazon.pos.data.local.entity.PromoEntity
import com.cafecorazon.pos.security.SessionUser
import com.cafecorazon.pos.ui.theme.CaramelAccent
import com.cafecorazon.pos.ui.theme.CreamBackground
import com.cafecorazon.pos.ui.theme.EspressoPrimary
import com.cafecorazon.pos.ui.theme.SuccessGreen

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CheckoutDialog(
    viewModel: PosViewModel,
    sessionUser: SessionUser?,
    onDismiss: () -> Unit,
    onOrderCompleted: (Long) -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()

    var customerName by remember { mutableStateOf(if (uiState.customerName.isBlank()) "Walk-in" else uiState.customerName) }
    var tinNumber by remember { mutableStateOf(uiState.tinNumber) }
    var address by remember { mutableStateOf(uiState.customerAddress) }

    var cashText by remember { mutableStateOf(if (uiState.cashGiven > 0) String.format("%.2f", uiState.cashGiven) else "") }
    var discountType by remember { mutableStateOf(uiState.selectedDiscountType) }
    var discountId by remember { mutableStateOf(uiState.discountIdNumber) }

    var showPromoSelector by remember { mutableStateOf(false) }

    val subtotal = viewModel.getSubtotal()
    val discountAmt = viewModel.getDiscountAmount()
    val promoAmt = viewModel.getPromoDiscountAmount()
    val total = viewModel.getTotalAmount()

    val vatableSales = total / 1.12
    val vatAmount = total - vatableSales

    val cashVal = cashText.toDoubleOrNull() ?: 0.0
    val changeVal = maxOf(0.0, cashVal - total)

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(CreamBackground)
                .padding(24.dp)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
            ) {
                // Top Screen Header Title
                Text(
                    text = "Payment",
                    fontSize = 32.sp,
                    fontWeight = FontWeight.Bold,
                    fontFamily = FontFamily.Serif,
                    color = EspressoPrimary
                )

                Spacer(modifier = Modifier.height(20.dp))

                if (uiState.errorMessage != null) {
                    Surface(
                        color = MaterialTheme.colorScheme.errorContainer,
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(bottom = 16.dp)
                    ) {
                        Row(
                            modifier = Modifier.padding(12.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(uiState.errorMessage!!, color = MaterialTheme.colorScheme.onErrorContainer, fontSize = 13.sp)
                            IconButton(onClick = { viewModel.clearError() }, modifier = Modifier.size(20.dp)) {
                                Icon(Icons.Default.Clear, contentDescription = null, tint = MaterialTheme.colorScheme.onErrorContainer)
                            }
                        }
                    }
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(20.dp)
                ) {
                    // LEFT COLUMN (Order summary, Promos, Customer Details, Discounts)
                    Column(
                        modifier = Modifier.weight(0.58f),
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        // 1. Order Summary Card
                        Card(
                            colors = CardDefaults.cardColors(containerColor = Color.White),
                            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                            shape = RoundedCornerShape(14.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(modifier = Modifier.padding(20.dp)) {
                                Text("Order summary", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = EspressoPrimary)
                                Spacer(modifier = Modifier.height(14.dp))

                                uiState.cartItems.forEach { cartItem ->
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Column {
                                            Text("${cartItem.quantity}× ${cartItem.menuItem.name}", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = EspressoPrimary)
                                            Text("Large, Whole - Batch", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                        }
                                        Text("₱${String.format("%.2f", cartItem.unitPrice * cartItem.quantity)}", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = EspressoPrimary)
                                    }
                                    Spacer(modifier = Modifier.height(8.dp))
                                }

                                HorizontalDivider(modifier = Modifier.padding(vertical = 10.dp), color = MaterialTheme.colorScheme.outlineVariant)

                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                    Text("Gross Sales", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    Text("₱${String.format("%.2f", subtotal)}", fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = EspressoPrimary)
                                }
                                Spacer(modifier = Modifier.height(4.dp))
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                    Text("VATable Sales", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    Text("₱${String.format("%.2f", vatableSales)}", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                                Spacer(modifier = Modifier.height(4.dp))
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                    Text("VAT (12%)", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    Text("₱${String.format("%.2f", vatAmount)}", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }

                                if (discountAmt > 0) {
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                        Text("$discountType Discount (20%)", fontSize = 13.sp, color = CaramelAccent)
                                        Text("-₱${String.format("%.2f", discountAmt)}", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = CaramelAccent)
                                    }
                                }

                                if (promoAmt > 0) {
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                        Text("Promo Discount", fontSize = 13.sp, color = CaramelAccent)
                                        Text("-₱${String.format("%.2f", promoAmt)}", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = CaramelAccent)
                                    }
                                }

                                HorizontalDivider(modifier = Modifier.padding(vertical = 10.dp), color = MaterialTheme.colorScheme.outlineVariant)

                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text("Total", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = EspressoPrimary)
                                    Text("₱${String.format("%.2f", total)}", fontSize = 22.sp, fontWeight = FontWeight.Bold, color = EspressoPrimary, fontFamily = FontFamily.Serif)
                                }
                            }
                        }

                        // 2. Promotions Card
                        Card(
                            colors = CardDefaults.cardColors(containerColor = Color.White),
                            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                            shape = RoundedCornerShape(14.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Icon(Icons.Default.LocalOffer, contentDescription = null, tint = CaramelAccent, modifier = Modifier.size(20.dp))
                                        Spacer(modifier = Modifier.width(8.dp))
                                        Text("Promotions", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = EspressoPrimary)
                                    }

                                    Button(
                                        onClick = { showPromoSelector = true },
                                        colors = ButtonDefaults.buttonColors(containerColor = EspressoPrimary, contentColor = CreamBackground),
                                        shape = RoundedCornerShape(8.dp)
                                    ) {
                                        Icon(Icons.Default.AutoAwesome, contentDescription = null, modifier = Modifier.size(16.dp))
                                        Spacer(modifier = Modifier.width(4.dp))
                                        Text("Apply Promo", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                    }
                                }

                                Spacer(modifier = Modifier.height(8.dp))

                                if (uiState.selectedPromo == null) {
                                    Text(
                                        text = "No promo applied. Click \"Apply Promo\" to select an active store promotion.",
                                        fontSize = 12.sp,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                } else {
                                    Surface(color = CaramelAccent.copy(alpha = 0.15f), shape = RoundedCornerShape(8.dp), modifier = Modifier.fillMaxWidth()) {
                                        Row(
                                            modifier = Modifier.padding(10.dp),
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Text(
                                                text = "Applied: ${uiState.selectedPromo!!.promoName} (${if (uiState.selectedPromo!!.discountType == "percentage") "${uiState.selectedPromo!!.discountValue.toInt()}% Off" else "₱${uiState.selectedPromo!!.discountValue} Off"})",
                                                fontWeight = FontWeight.Bold,
                                                fontSize = 12.sp,
                                                color = EspressoPrimary
                                            )
                                            IconButton(onClick = { viewModel.setPromo(null) }, modifier = Modifier.size(20.dp)) {
                                                Icon(Icons.Default.Clear, contentDescription = "Remove", tint = EspressoPrimary)
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        // 3. Customer details (for receipt) Card
                        Card(
                            colors = CardDefaults.cardColors(containerColor = Color.White),
                            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                            shape = RoundedCornerShape(14.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Text("Customer details (for receipt)", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = EspressoPrimary)
                                Spacer(modifier = Modifier.height(12.dp))

                                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                    OutlinedTextField(
                                        value = customerName,
                                        onValueChange = { customerName = it; viewModel.setCustomerName(it) },
                                        label = { Text("Customer name") },
                                        placeholder = { Text("Walk-in") },
                                        singleLine = true,
                                        shape = RoundedCornerShape(12.dp),
                                        modifier = Modifier.weight(1f)
                                    )

                                    OutlinedTextField(
                                        value = tinNumber,
                                        onValueChange = { tinNumber = it; viewModel.setTinNumber(it) },
                                        label = { Text("TIN") },
                                        placeholder = { Text("Optional") },
                                        singleLine = true,
                                        shape = RoundedCornerShape(12.dp),
                                        modifier = Modifier.weight(1f)
                                    )
                                }

                                Spacer(modifier = Modifier.height(10.dp))

                                OutlinedTextField(
                                    value = address,
                                    onValueChange = { address = it; viewModel.setCustomerAddress(it) },
                                    label = { Text("Address") },
                                    placeholder = { Text("Optional") },
                                    singleLine = true,
                                    shape = RoundedCornerShape(12.dp),
                                    modifier = Modifier.fillMaxWidth()
                                )
                            }
                        }

                        // 4. Discounts (Senior / PWD) Card
                        Card(
                            colors = CardDefaults.cardColors(containerColor = Color.White),
                            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                            shape = RoundedCornerShape(14.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(Icons.Default.DoNotDisturbOn, contentDescription = null, tint = CaramelAccent, modifier = Modifier.size(20.dp))
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text("Discounts (Senior / PWD)", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = EspressoPrimary)
                                }

                                Spacer(modifier = Modifier.height(12.dp))

                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                                ) {
                                    listOf("None", "Senior", "PWD").forEach { type ->
                                        val isSelected = discountType == type
                                        Button(
                                            onClick = {
                                                discountType = type
                                                viewModel.setDiscountType(type, discountId)
                                            },
                                            colors = ButtonDefaults.buttonColors(
                                                containerColor = if (isSelected) EspressoPrimary else Color.White,
                                                contentColor = if (isSelected) CreamBackground else EspressoPrimary
                                            ),
                                            shape = RoundedCornerShape(10.dp),
                                            border = if (!isSelected) ButtonDefaults.outlinedButtonBorder else null,
                                            modifier = Modifier
                                                .weight(1f)
                                                .height(44.dp)
                                        ) {
                                            Text(type, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                                        }
                                    }
                                }

                                if (discountType == "Senior" || discountType == "PWD") {
                                    Spacer(modifier = Modifier.height(10.dp))
                                    OutlinedTextField(
                                        value = discountId,
                                        onValueChange = { discountId = it; viewModel.setDiscountType(discountType, it) },
                                        label = { Text("$discountType ID Number *") },
                                        singleLine = true,
                                        shape = RoundedCornerShape(12.dp),
                                        modifier = Modifier.fillMaxWidth()
                                    )
                                }
                            }
                        }
                    }

                    // RIGHT COLUMN (Payment Method & Action Buttons)
                    Column(
                        modifier = Modifier.weight(0.42f),
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        // Payment Method Card
                        Card(
                            colors = CardDefaults.cardColors(containerColor = Color.White),
                            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                            shape = RoundedCornerShape(14.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(modifier = Modifier.padding(20.dp)) {
                                Text("Payment method", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = EspressoPrimary, fontFamily = FontFamily.Serif)
                                Spacer(modifier = Modifier.height(14.dp))

                                // Selected Cash Option Container
                                Surface(
                                    color = Color(0xFFEFECE6),
                                    shape = RoundedCornerShape(12.dp),
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Row(
                                        modifier = Modifier.padding(14.dp),
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Icon(Icons.Default.Payments, contentDescription = null, tint = EspressoPrimary, modifier = Modifier.size(28.dp))
                                        Spacer(modifier = Modifier.width(12.dp))
                                        Column {
                                            Text("Cash Payment", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = EspressoPrimary)
                                            Text("Cash payment on counter", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                        }
                                    }
                                }

                                Spacer(modifier = Modifier.height(16.dp))

                                Text("Cash received", fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = EspressoPrimary)
                                Spacer(modifier = Modifier.height(6.dp))

                                OutlinedTextField(
                                    value = cashText,
                                    onValueChange = {
                                        cashText = it
                                        val c = it.toDoubleOrNull() ?: 0.0
                                        viewModel.setCashGiven(c)
                                    },
                                    placeholder = { Text("0.00") },
                                    singleLine = true,
                                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number, imeAction = ImeAction.Done),
                                    shape = RoundedCornerShape(12.dp),
                                    colors = OutlinedTextFieldDefaults.colors(
                                        focusedContainerColor = Color(0xFFFAF8F5),
                                        unfocusedContainerColor = Color(0xFFFAF8F5)
                                    ),
                                    modifier = Modifier.fillMaxWidth()
                                )

                                Spacer(modifier = Modifier.height(12.dp))

                                // Quick Cash Denomination Buttons
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                                ) {
                                    listOf(50, 100, 200, 500, 1000).forEach { denom ->
                                        OutlinedButton(
                                            onClick = {
                                                val current = cashText.toDoubleOrNull() ?: 0.0
                                                val next = if (current == 0.0) denom.toDouble() else current + denom
                                                cashText = String.format("%.2f", next)
                                                viewModel.setCashGiven(next)
                                            },
                                            shape = RoundedCornerShape(8.dp),
                                            contentPadding = PaddingValues(horizontal = 4.dp, vertical = 6.dp),
                                            modifier = Modifier.weight(1f)
                                        ) {
                                            Text("₱$denom", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = EspressoPrimary)
                                        }
                                    }
                                }

                                Spacer(modifier = Modifier.height(18.dp))

                                HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)

                                Spacer(modifier = Modifier.height(12.dp))

                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text("Change", fontSize = 15.sp, fontWeight = FontWeight.SemiBold, color = EspressoPrimary)
                                    Text(
                                        text = "₱${String.format("%.2f", changeVal)}",
                                        fontSize = 18.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = if (cashVal >= total && total > 0) CaramelAccent else MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                            }
                        }

                        // Bottom Action Buttons Row
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            OutlinedButton(
                                onClick = onDismiss,
                                shape = RoundedCornerShape(10.dp),
                                modifier = Modifier
                                    .weight(1f)
                                    .height(48.dp)
                            ) {
                                Text("Cancel", color = EspressoPrimary, fontWeight = FontWeight.Bold)
                            }

                            Button(
                                onClick = {
                                    viewModel.checkout(sessionUser) { orderId ->
                                        onOrderCompleted(orderId)
                                    }
                                },
                                enabled = !uiState.isLoading && cashVal >= total && total > 0,
                                colors = ButtonDefaults.buttonColors(containerColor = EspressoPrimary, contentColor = CreamBackground),
                                shape = RoundedCornerShape(10.dp),
                                modifier = Modifier
                                    .weight(1.4f)
                                    .height(48.dp)
                            ) {
                                if (uiState.isLoading) {
                                    CircularProgressIndicator(color = CreamBackground, modifier = Modifier.size(20.dp))
                                } else {
                                    Text("Confirm payment", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // Apply Promo Selector Dialog
    if (showPromoSelector) {
        AlertDialog(
            onDismissRequest = { showPromoSelector = false },
            title = { Text("Select Store Promotion", fontWeight = FontWeight.Bold, color = EspressoPrimary) },
            text = {
                val promos = uiState.availablePromos
                if (promos.isEmpty()) {
                    Text("No active store promotions available right now.", fontSize = 13.sp)
                } else {
                    LazyColumn(
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        items(promos) { p ->
                            Surface(
                                onClick = {
                                    viewModel.setPromo(p)
                                    showPromoSelector = false
                                },
                                color = CreamBackground,
                                shape = RoundedCornerShape(8.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Column(modifier = Modifier.padding(12.dp)) {
                                    Text(p.promoName, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = EspressoPrimary)
                                    Text(
                                        text = if (p.discountType == "percentage") "${p.discountValue.toInt()}% Off" else "₱${p.discountValue} Off",
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = CaramelAccent
                                    )
                                    Text("Valid: ${p.startDate} to ${p.endDate}", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                            }
                        }
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { showPromoSelector = false }) { Text("Close") }
            }
        )
    }
}
