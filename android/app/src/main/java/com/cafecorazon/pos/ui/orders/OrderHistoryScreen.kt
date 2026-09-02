package com.cafecorazon.pos.ui.orders

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Receipt
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.cafecorazon.pos.data.repository.OrderRepository
import com.cafecorazon.pos.security.SessionUser
import com.cafecorazon.pos.ui.components.AppShell
import com.cafecorazon.pos.ui.navigation.Screen
import com.cafecorazon.pos.ui.theme.CaramelAccent
import com.cafecorazon.pos.ui.theme.CreamBackground
import com.cafecorazon.pos.ui.theme.EspressoPrimary
import com.cafecorazon.pos.ui.theme.SuccessGreen
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@Composable
fun OrderHistoryScreen(
    orderRepository: OrderRepository,
    sessionUser: SessionUser?,
    onNavigate: (Screen) -> Unit,
    onLogout: () -> Unit,
    onViewReceipt: (Long) -> Unit
) {
    val ordersFlow = remember { orderRepository.ordersWithDetailsFlow }
    val ordersList by ordersFlow.collectAsState(initial = emptyList())

    AppShell(
        title = "Order Transactions",
        currentScreenRoute = Screen.Orders.route,
        sessionUser = sessionUser,
        onNavigate = onNavigate,
        onLogout = onLogout
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .background(CreamBackground)
                .padding(16.dp)
        ) {
            Text("Order History", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = EspressoPrimary)

            Spacer(modifier = Modifier.height(12.dp))

            LazyColumn(
                verticalArrangement = Arrangement.spacedBy(10.dp),
                modifier = Modifier.fillMaxSize()
            ) {
                items(ordersList, key = { it.order.id }) { item ->
                    val o = item.order
                    val user = item.createdByUser
                    val dateFormat = SimpleDateFormat("M/d/yy, h:mm a", Locale.getDefault())

                    Card(
                        colors = CardDefaults.cardColors(containerColor = Color.White),
                        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier
                                .padding(16.dp)
                                .fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text("#${String.format("%07d", o.id)}", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = EspressoPrimary)
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Surface(
                                        color = when (o.orderStatus) {
                                            "completed" -> SuccessGreen.copy(alpha = 0.15f)
                                            "cancelled" -> MaterialTheme.colorScheme.errorContainer
                                            else -> CaramelAccent.copy(alpha = 0.15f)
                                        },
                                        shape = RoundedCornerShape(4.dp)
                                    ) {
                                        Text(
                                            text = o.orderStatus.uppercase(),
                                            fontSize = 10.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = when (o.orderStatus) {
                                                "completed" -> SuccessGreen
                                                "cancelled" -> MaterialTheme.colorScheme.error
                                                else -> CaramelAccent
                                            },
                                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                        )
                                    }
                                }
                                if (!o.customerName.isNull_or_blank()) {
                                    Text("Customer: ${o.customerName}", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                                Text("Cashier: ${user?.fullname ?: "Staff"} · ${dateFormat.format(Date(o.createdAt))}", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                Text("${item.items.size} item(s) · ${o.paymentMethod}", fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = CaramelAccent)
                            }

                            Column(horizontalAlignment = Alignment.End) {
                                Text("₱${String.format("%.2f", o.totalAmount)}", fontWeight = FontWeight.Bold, fontSize = 18.sp, color = EspressoPrimary)
                                IconButton(onClick = { onViewReceipt(o.id) }) {
                                    Icon(Icons.Default.Receipt, contentDescription = "View Receipt", tint = EspressoPrimary)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

private fun String?.isNull_or_blank(): Boolean = this == null || this.trim().isEmpty()
