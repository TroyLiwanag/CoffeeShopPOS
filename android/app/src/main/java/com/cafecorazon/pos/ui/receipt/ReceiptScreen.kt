package com.cafecorazon.pos.ui.receipt

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Print
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.cafecorazon.pos.R
import com.cafecorazon.pos.security.SessionUser
import com.cafecorazon.pos.ui.components.AppShell
import com.cafecorazon.pos.ui.navigation.Screen
import com.cafecorazon.pos.ui.theme.CaramelAccent
import com.cafecorazon.pos.ui.theme.CreamBackground
import com.cafecorazon.pos.ui.theme.EspressoPrimary
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@Composable
fun ReceiptScreen(
    orderId: Long,
    viewModel: ReceiptViewModel,
    sessionUser: SessionUser?,
    onNavigate: (Screen) -> Unit,
    onLogout: () -> Unit
) {
    val context = LocalContext.current
    val uiState by viewModel.uiState.collectAsState()

    LaunchedEffect(orderId) {
        viewModel.loadOrder(orderId)
    }

    val details = uiState.orderDetails
    val settings = uiState.settings

    AppShell(
        title = "Receipt #${String.format("%07d", orderId)}",
        currentScreenRoute = Screen.Receipt.route,
        sessionUser = sessionUser,
        onNavigate = onNavigate,
        onLogout = onLogout
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .background(CreamBackground),
            contentAlignment = Alignment.TopCenter
        ) {
            if (uiState.isLoading || details == null) {
                CircularProgressIndicator(
                    color = EspressoPrimary,
                    modifier = Modifier.padding(32.dp)
                )
            } else {
                val order = details.order
                val items = details.items
                val formattedDate = SimpleDateFormat("M/d/yy, h:mm a", Locale.getDefault()).format(Date(order.createdAt))

                Column(
                    modifier = Modifier
                        .fillMaxWidth(0.95f)
                        .widthIn(max = 480.dp)
                        .padding(vertical = 16.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    // Back to POS Button
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.Start
                    ) {
                        OutlinedButton(
                            onClick = { onNavigate(Screen.Pos) },
                            colors = ButtonDefaults.outlinedButtonColors(contentColor = EspressoPrimary)
                        ) {
                            Icon(Icons.Default.ArrowBack, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Return to POS")
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    if (uiState.printMessage != null) {
                        Surface(
                            color = CaramelAccent.copy(alpha = 0.2f),
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(bottom = 12.dp)
                        ) {
                            Text(
                                text = uiState.printMessage!!,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color = EspressoPrimary,
                                modifier = Modifier.padding(10.dp)
                            )
                        }
                    }

                    // Printable Receipt Layout
                    Card(
                        colors = CardDefaults.cardColors(containerColor = Color.White),
                        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(
                            modifier = Modifier.padding(20.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            // Top Header Metadata
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text(formattedDate, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, fontFamily = FontFamily.Monospace)
                                Text("#${String.format("%07d", order.id)}", fontSize = 11.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace)
                            }

                            HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))

                            // Official Café Corazon Logo Header on Receipt Ticket
                            Image(
                                painter = painterResource(id = R.drawable.logo),
                                contentDescription = "Café Corazon Logo",
                                modifier = Modifier
                                    .size(80.dp)
                                    .padding(bottom = 4.dp)
                            )

                            Text(settings.shopName, fontSize = 18.sp, fontWeight = FontWeight.Bold, color = EspressoPrimary)
                            Text(settings.businessStyle, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)

                            Spacer(modifier = Modifier.height(8.dp))

                            // Staff & POS Metadata
                            Column(modifier = Modifier.fillMaxWidth()) {
                                Text("Employee: ${details.createdByUser?.fullname ?: "Staff"}", fontSize = 11.sp, fontFamily = FontFamily.Monospace)
                                Text("POS: POS 1", fontSize = 11.sp, fontFamily = FontFamily.Monospace)
                                Text("Order Type: Dine in", fontSize = 11.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace)
                            }

                            HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))

                            // Order Items List
                            Column(modifier = Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                items.forEach { item ->
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween
                                    ) {
                                        Column {
                                            Text("Item #${item.menuItemId ?: item.productId ?: 0}", fontWeight = FontWeight.Bold, fontSize = 13.sp, fontFamily = FontFamily.Monospace)
                                            Text("${item.quantity} x ₱${String.format("%.2f", item.price)}", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, fontFamily = FontFamily.Monospace)
                                        }
                                        Text("₱${String.format("%.2f", item.price * item.quantity)}", fontWeight = FontWeight.Bold, fontSize = 13.sp, fontFamily = FontFamily.Monospace)
                                    }
                                }
                            }

                            HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))

                            // Totals & Discounts
                            val subtotal = items.sumOf { it.price * it.quantity }
                            val isExempt = order.discountType == "Senior" || order.discountType == "PWD"
                            val discRate = if (order.discountRate > 0) order.discountRate else 20.0

                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("Subtotal", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, fontFamily = FontFamily.Monospace)
                                Text("₱${String.format("%.2f", subtotal)}", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, fontFamily = FontFamily.Monospace)
                            }

                            if (order.promoDiscountAmount > 0) {
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                    Text("Promo (${order.promoName ?: ""})", fontSize = 12.sp, color = CaramelAccent, fontFamily = FontFamily.Monospace)
                                    Text("-₱${String.format("%.2f", order.promoDiscountAmount)}", fontSize = 12.sp, color = CaramelAccent, fontFamily = FontFamily.Monospace)
                                }
                            }

                            if (isExempt && order.discountAmount > 0) {
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                    Text("${order.discountType} Discount (${discRate.toInt()}%)", fontSize = 12.sp, color = CaramelAccent, fontFamily = FontFamily.Monospace)
                                    Text("-₱${String.format("%.2f", order.discountAmount)}", fontSize = 12.sp, color = CaramelAccent, fontFamily = FontFamily.Monospace)
                                }
                            }

                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 4.dp),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text("Total", fontSize = 16.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace)
                                Text("₱${String.format("%.2f", order.totalAmount)}", fontSize = 18.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace)
                            }

                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("Payment (${order.paymentMethod})", fontSize = 12.sp, fontFamily = FontFamily.Monospace)
                                Text("₱${String.format("%.2f", order.totalAmount)}", fontSize = 12.sp, fontFamily = FontFamily.Monospace)
                            }

                            val hasCustomer = !order.customerName.isNull_or_blank()
                            val hasPromo = !order.promoName.isNull_or_blank()
                            if (hasCustomer || isExempt || hasPromo) {
                                HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))
                                Column(modifier = Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                                    if (hasCustomer) {
                                        Text("Customer: ${order.customerName}", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, fontFamily = FontFamily.Monospace)
                                    }
                                    if (hasPromo) {
                                        Text("Applied Promo: ${order.promoName} (-₱${String.format("%.2f", order.promoDiscountAmount)})", fontSize = 11.sp, color = CaramelAccent, fontFamily = FontFamily.Monospace)
                                    }
                                    if (isExempt) {
                                        Text("Applied Discount: ${order.discountType} (${discRate.toInt()}%)", fontSize = 11.sp, color = CaramelAccent, fontFamily = FontFamily.Monospace)
                                        if (!order.discountIdNumber.isNull_or_blank()) {
                                            Text("${order.discountType} ID: ${order.discountIdNumber}", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, fontFamily = FontFamily.Monospace)
                                        }
                                        if (!order.beneficiaryName.isNull_or_blank()) {
                                            Text("Beneficiary: ${order.beneficiaryName}", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, fontFamily = FontFamily.Monospace)
                                        }
                                    }
                                }
                            }

                            HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))

                            Text(
                                text = settings.receiptFooter,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.SemiBold,
                                textAlign = TextAlign.Center,
                                modifier = Modifier.padding(top = 4.dp)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    Button(
                        onClick = { viewModel.printThermalReceipt(context) },
                        enabled = !uiState.isPrinting,
                        colors = ButtonDefaults.buttonColors(containerColor = EspressoPrimary, contentColor = CreamBackground),
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(48.dp)
                    ) {
                        if (uiState.isPrinting) {
                            CircularProgressIndicator(color = CreamBackground, modifier = Modifier.size(20.dp))
                        } else {
                            Icon(Icons.Default.Print, contentDescription = null)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Print Thermal Receipt", fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
    }
}

private fun String?.isNull_or_blank(): Boolean = this == null || this.trim().isEmpty()
