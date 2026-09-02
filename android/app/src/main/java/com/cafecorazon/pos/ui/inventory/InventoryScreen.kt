package com.cafecorazon.pos.ui.inventory

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Clear
import androidx.compose.material.icons.filled.DeleteSweep
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Remove
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.cafecorazon.pos.data.local.entity.ProductEntity
import com.cafecorazon.pos.data.repository.InventoryRepository
import com.cafecorazon.pos.data.repository.ProductRepository
import com.cafecorazon.pos.security.SessionUser
import com.cafecorazon.pos.ui.components.AppShell
import com.cafecorazon.pos.ui.navigation.Screen
import com.cafecorazon.pos.ui.theme.CaramelAccent
import com.cafecorazon.pos.ui.theme.CreamBackground
import com.cafecorazon.pos.ui.theme.EspressoPrimary
import com.cafecorazon.pos.ui.theme.SuccessGreen
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@Composable
fun InventoryScreen(
    productRepository: ProductRepository,
    inventoryRepository: InventoryRepository,
    sessionUser: SessionUser?,
    onNavigate: (Screen) -> Unit,
    onLogout: () -> Unit
) {
    val scope = rememberCoroutineScope()
    val productsFlow = remember { productRepository.productsFlow }
    val productsList by productsFlow.collectAsState(initial = emptyList())

    val logsFlow = remember { inventoryRepository.logsFlow }
    val logsList by logsFlow.collectAsState(initial = emptyList())

    var selectedTab by remember { mutableIntStateOf(0) } // 0: Products Stock, 1: Transaction Logs

    var activeDialogProduct by remember { mutableStateOf<ProductEntity?>(null) }
    var activeDialogType by remember { mutableStateOf<String?>(null) } // "stock_in", "stock_out", "spoilage", "adjustment"

    var successMsg by remember { mutableStateOf<String?>(null) }
    var errorMsg by remember { mutableStateOf<String?>(null) }

    AppShell(
        title = "Inventory & Stock Logs",
        currentScreenRoute = Screen.Inventory.route,
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
            // Tab Header
            TabRow(selectedTabIndex = selectedTab, containerColor = Color.White, contentColor = EspressoPrimary) {
                Tab(selected = selectedTab == 0, onClick = { selectedTab = 0 }) {
                    Text("Products Stock Overview", fontWeight = FontWeight.Bold, modifier = Modifier.padding(12.dp))
                }
                Tab(selected = selectedTab == 1, onClick = { selectedTab = 1 }) {
                    Text("Stock Activity Logs", fontWeight = FontWeight.Bold, modifier = Modifier.padding(12.dp))
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Feedback Banners
            if (successMsg != null) {
                Surface(color = SuccessGreen.copy(alpha = 0.15f), shape = RoundedCornerShape(8.dp), modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp)) {
                    Row(modifier = Modifier.padding(10.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                        Text(successMsg!!, color = SuccessGreen, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                        IconButton(onClick = { successMsg = null }, modifier = Modifier.size(18.dp)) {
                            Icon(Icons.Default.Clear, contentDescription = null, tint = SuccessGreen)
                        }
                    }
                }
            }

            if (errorMsg != null) {
                Surface(color = MaterialTheme.colorScheme.errorContainer, shape = RoundedCornerShape(8.dp), modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp)) {
                    Row(modifier = Modifier.padding(10.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                        Text(errorMsg!!, color = MaterialTheme.colorScheme.onErrorContainer, fontSize = 12.sp)
                        IconButton(onClick = { errorMsg = null }, modifier = Modifier.size(18.dp)) {
                            Icon(Icons.Default.Clear, contentDescription = null, tint = MaterialTheme.colorScheme.onErrorContainer)
                        }
                    }
                }
            }

            if (selectedTab == 0) {
                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                    modifier = Modifier.fillMaxSize()
                ) {
                    items(productsList, key = { it.id }) { p ->
                        val isLowStock = p.stock <= 10

                        Card(
                            colors = CardDefaults.cardColors(containerColor = Color.White),
                            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Row(
                                modifier = Modifier
                                    .padding(14.dp)
                                    .fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(p.name, fontWeight = FontWeight.Bold, fontSize = 15.sp, color = EspressoPrimary)
                                    Text("Category: ${p.category ?: "General"} · ₱${String.format("%.2f", p.price)}", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }

                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Surface(
                                        color = if (isLowStock) MaterialTheme.colorScheme.errorContainer else SuccessGreen.copy(alpha = 0.15f),
                                        shape = RoundedCornerShape(6.dp)
                                    ) {
                                        Text(
                                            text = "Stock: ${p.stock}",
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 12.sp,
                                            color = if (isLowStock) MaterialTheme.colorScheme.error else SuccessGreen,
                                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                        )
                                    }

                                    Spacer(modifier = Modifier.width(6.dp))

                                    // Stock In Button
                                    FilledTonalButton(
                                        onClick = {
                                            activeDialogProduct = p
                                            activeDialogType = "stock_in"
                                        },
                                        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp),
                                        colors = ButtonDefaults.filledTonalButtonColors(containerColor = SuccessGreen.copy(alpha = 0.15f), contentColor = SuccessGreen)
                                    ) {
                                        Icon(Icons.Default.Add, contentDescription = "Stock In", modifier = Modifier.size(16.dp))
                                        Text("In", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                    }

                                    Spacer(modifier = Modifier.width(4.dp))

                                    // Stock Out Button
                                    FilledTonalButton(
                                        onClick = {
                                            activeDialogProduct = p
                                            activeDialogType = "stock_out"
                                        },
                                        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp),
                                        colors = ButtonDefaults.filledTonalButtonColors(containerColor = MaterialTheme.colorScheme.errorContainer, contentColor = MaterialTheme.colorScheme.error)
                                    ) {
                                        Icon(Icons.Default.Remove, contentDescription = "Stock Out", modifier = Modifier.size(16.dp))
                                        Text("Out", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                    }

                                    Spacer(modifier = Modifier.width(4.dp))

                                    // Spoilage Button
                                    IconButton(
                                        onClick = {
                                            activeDialogProduct = p
                                            activeDialogType = "spoilage"
                                        }
                                    ) {
                                        Icon(Icons.Default.DeleteSweep, contentDescription = "Spoilage", tint = MaterialTheme.colorScheme.error)
                                    }
                                }
                            }
                        }
                    }
                }
            } else {
                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.fillMaxSize()
                ) {
                    items(logsList, key = { it.log.id }) { item ->
                        val log = item.log
                        val prod = item.product
                        val user = item.performedByUser
                        val dateFormat = SimpleDateFormat("M/d/yy, h:mm a", Locale.getDefault())

                        Card(
                            colors = CardDefaults.cardColors(containerColor = Color.White),
                            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Row(
                                modifier = Modifier
                                    .padding(12.dp)
                                    .fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column {
                                    Text(prod?.name ?: "Product #${log.productId}", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = EspressoPrimary)
                                    Text("Action: ${log.actionType} · By: ${user?.fullname ?: "System"}", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    Text(dateFormat.format(Date(log.createdAt)), fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }

                                val sign = if (log.quantity > 0) "+" else ""
                                Text(
                                    text = "$sign${log.quantity}",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 16.sp,
                                    color = if (log.quantity > 0) SuccessGreen else MaterialTheme.colorScheme.error
                                )
                            }
                        }
                    }
                }
            }
        }
    }

    // Stock Adjust Dialogs
    if (activeDialogProduct != null && activeDialogType != null) {
        StockAdjustmentDialog(
            product = activeDialogProduct!!,
            actionType = activeDialogType!!,
            onDismiss = {
                activeDialogProduct = null
                activeDialogType = null
            },
            onConfirm = { qty, reason, supplierRef ->
                scope.launch {
                    val finalQty = if (activeDialogType == "stock_out" || activeDialogType == "spoilage") -qty else qty
                    val res = inventoryRepository.adjustStock(
                        productId = activeDialogProduct!!.id,
                        quantity = finalQty,
                        actionType = activeDialogType,
                        reason = reason,
                        supplierRef = supplierRef,
                        actorUserId = sessionUser?.id,
                        actorUserName = sessionUser?.fullname
                    )

                    if (res.isSuccess) {
                        successMsg = "Stock adjusted successfully for ${activeDialogProduct!!.name}"
                    } else {
                        errorMsg = res.exceptionOrNull()?.message ?: "Failed to adjust stock"
                    }

                    activeDialogProduct = null
                    activeDialogType = null
                }
            }
        )
    }
}

@Composable
fun StockAdjustmentDialog(
    product: ProductEntity,
    actionType: String,
    onDismiss: () -> Unit,
    onConfirm: (quantity: Int, reason: String, supplierRef: String?) -> Unit
) {
    val title = when (actionType) {
        "stock_in" -> "Stock In: ${product.name}"
        "stock_out" -> "Stock Out: ${product.name}"
        "spoilage" -> "Record Spoilage / Waste: ${product.name}"
        else -> "Adjust Stock: ${product.name}"
    }

    var qtyText by remember { mutableStateOf("10") }
    var reason by remember { mutableStateOf("") }
    var supplierRef by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(title, fontWeight = FontWeight.Bold, color = EspressoPrimary, fontSize = 16.sp) },
        text = {
            Column(modifier = Modifier.fillMaxWidth()) {
                Text("Current Available Stock: ${product.stock}", fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = CaramelAccent)
                Spacer(modifier = Modifier.height(12.dp))

                OutlinedTextField(
                    value = qtyText,
                    onValueChange = { qtyText = it },
                    label = { Text("Quantity *") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(8.dp))

                OutlinedTextField(
                    value = reason,
                    onValueChange = { reason = it },
                    label = { Text("Reason / Remarks *") },
                    placeholder = { Text(if (actionType == "spoilage") "Expired, damaged, etc." else "Delivery, regular usage, etc.") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )

                if (actionType == "stock_in") {
                    Spacer(modifier = Modifier.height(8.dp))
                    OutlinedTextField(
                        value = supplierRef,
                        onValueChange = { supplierRef = it },
                        label = { Text("Supplier / Invoice Ref (Optional)") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    val qty = qtyText.toIntOrNull() ?: 0
                    if (qty <= 0) return@Button
                    onConfirm(qty, reason.trim(), supplierRef.ifBlank { null })
                },
                colors = ButtonDefaults.buttonColors(containerColor = EspressoPrimary, contentColor = CreamBackground)
            ) {
                Text("Confirm Stock Action")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Cancel") }
        }
    )
}
