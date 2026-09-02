package com.cafecorazon.pos.ui.promos

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Clear
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.PowerSettingsNew
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.cafecorazon.pos.data.local.dao.PromoWithUsageCount
import com.cafecorazon.pos.data.local.entity.PromoEntity
import com.cafecorazon.pos.security.SessionUser
import com.cafecorazon.pos.ui.components.AppShell
import com.cafecorazon.pos.ui.navigation.Screen
import com.cafecorazon.pos.ui.theme.CaramelAccent
import com.cafecorazon.pos.ui.theme.CreamBackground
import com.cafecorazon.pos.ui.theme.EspressoPrimary
import com.cafecorazon.pos.ui.theme.SuccessGreen

@Composable
fun PromosScreen(
    viewModel: PromosViewModel,
    sessionUser: SessionUser?,
    onNavigate: (Screen) -> Unit,
    onLogout: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()
    var showCreateDialog by remember { mutableStateOf(false) }
    var editingPromoItem by remember { mutableStateOf<PromoWithUsageCount?>(null) }
    var deletingPromoItem by remember { mutableStateOf<PromoWithUsageCount?>(null) }

    AppShell(
        title = "Promotions Management",
        currentScreenRoute = Screen.Promos.route,
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
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("Active Promos & Discounts", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = EspressoPrimary)
                Button(
                    onClick = { showCreateDialog = true },
                    colors = ButtonDefaults.buttonColors(containerColor = EspressoPrimary, contentColor = CreamBackground)
                ) {
                    Icon(Icons.Default.Add, contentDescription = null)
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Add Promo")
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            if (uiState.errorMessage != null) {
                Surface(color = MaterialTheme.colorScheme.errorContainer, shape = RoundedCornerShape(8.dp), modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp)) {
                    Text(uiState.errorMessage!!, color = MaterialTheme.colorScheme.onErrorContainer, fontSize = 12.sp, modifier = Modifier.padding(10.dp))
                }
            }

            val stats = uiState.stats
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Card(colors = CardDefaults.cardColors(containerColor = Color.White), modifier = Modifier.weight(1f)) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Text("Active Promos", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text("${stats?.activePromos ?: 0}", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = SuccessGreen)
                    }
                }
                Card(colors = CardDefaults.cardColors(containerColor = Color.White), modifier = Modifier.weight(1f)) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Text("Usage Today", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text("${stats?.usageToday ?: 0}", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = CaramelAccent)
                    }
                }
                Card(colors = CardDefaults.cardColors(containerColor = Color.White), modifier = Modifier.weight(1f)) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Text("Total Promos", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text("${stats?.totalPromos ?: 0}", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = EspressoPrimary)
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            LazyColumn(
                verticalArrangement = Arrangement.spacedBy(10.dp),
                modifier = Modifier.fillMaxSize()
            ) {
                items(uiState.promos, key = { it.promo.id }) { item ->
                    val promo = item.promo
                    val isActive = promo.status == "Active"

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
                                    Text(promo.promoName, fontWeight = FontWeight.Bold, fontSize = 16.sp, color = EspressoPrimary)
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Surface(
                                        color = if (isActive) SuccessGreen.copy(alpha = 0.15f) else MaterialTheme.colorScheme.errorContainer,
                                        shape = RoundedCornerShape(4.dp)
                                    ) {
                                        Text(
                                            text = promo.status,
                                            fontSize = 10.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = if (isActive) SuccessGreen else MaterialTheme.colorScheme.error,
                                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                        )
                                    }
                                }
                                if (!promo.description.isNull_or_blank()) {
                                    Text(promo.description!!, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                                Text(
                                    text = "Discount: ${if (promo.discountType == "percentage") "${promo.discountValue.toInt()}%" else "₱${promo.discountValue}"} · For: ${promo.eligibleCustomer}",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    color = CaramelAccent
                                )
                                Text("Valid: ${promo.startDate} to ${promo.endDate} · Used: ${item.usageCount} times", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }

                            Row {
                                IconButton(onClick = { viewModel.togglePromoStatus(item, sessionUser) }) {
                                    Icon(Icons.Default.PowerSettingsNew, contentDescription = "Toggle Status", tint = if (isActive) SuccessGreen else MaterialTheme.colorScheme.error)
                                }
                                IconButton(onClick = { editingPromoItem = item }) {
                                    Icon(Icons.Default.Edit, contentDescription = "Edit", tint = EspressoPrimary)
                                }
                                IconButton(onClick = { deletingPromoItem = item }) {
                                    Icon(Icons.Default.Delete, contentDescription = "Delete", tint = MaterialTheme.colorScheme.error)
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    if (showCreateDialog) {
        PromoFormDialog(
            title = "Create Promotion",
            initialPromo = null,
            onDismiss = { showCreateDialog = false },
            onConfirm = { promo ->
                viewModel.createPromo(promo, sessionUser) {
                    showCreateDialog = false
                }
            }
        )
    }

    if (editingPromoItem != null) {
        PromoFormDialog(
            title = "Edit Promotion #${editingPromoItem!!.promo.id}",
            initialPromo = editingPromoItem!!.promo,
            onDismiss = { editingPromoItem = null },
            onConfirm = { promo ->
                viewModel.updatePromo(promo, sessionUser) {
                    editingPromoItem = null
                }
            }
        )
    }

    if (deletingPromoItem != null) {
        AlertDialog(
            onDismissRequest = { deletingPromoItem = null },
            title = { Text("Confirm Promotion Action", fontWeight = FontWeight.Bold, color = EspressoPrimary) },
            text = { Text("Are you sure you want to delete promo \"${deletingPromoItem!!.promo.promoName}\"? You can also toggle status to Inactive.", fontSize = 14.sp) },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.deletePromo(deletingPromoItem!!.promo.id, sessionUser)
                        deletingPromoItem = null
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error)
                ) {
                    Text("Delete Promo")
                }
            },
            dismissButton = {
                TextButton(onClick = { deletingPromoItem = null }) { Text("Cancel") }
            }
        )
    }
}

@Composable
fun PromoFormDialog(
    title: String,
    initialPromo: PromoEntity?,
    onDismiss: () -> Unit,
    onConfirm: (PromoEntity) -> Unit
) {
    var promoName by remember { mutableStateOf(initialPromo?.promoName ?: "") }
    var description by remember { mutableStateOf(initialPromo?.description ?: "") }
    var discountType by remember { mutableStateOf(initialPromo?.discountType ?: "percentage") }
    var discountValueText by remember { mutableStateOf(initialPromo?.discountValue?.toString() ?: "20") }
    var eligibleCustomer by remember { mutableStateOf(initialPromo?.eligibleCustomer ?: "Everyone") }
    var startDate by remember { mutableStateOf(initialPromo?.startDate ?: "2026-06-01") }
    var endDate by remember { mutableStateOf(initialPromo?.endDate ?: "2026-12-31") }
    var status by remember { mutableStateOf(initialPromo?.status ?: "Active") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(title, fontWeight = FontWeight.Bold, color = EspressoPrimary) },
        text = {
            Column(modifier = Modifier.fillMaxWidth()) {
                OutlinedTextField(value = promoName, onValueChange = { promoName = it }, label = { Text("Promo Name *") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                Spacer(modifier = Modifier.height(8.dp))
                OutlinedTextField(value = description, onValueChange = { description = it }, label = { Text("Description") }, modifier = Modifier.fillMaxWidth())
                Spacer(modifier = Modifier.height(8.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    FilterChip(selected = discountType == "percentage", onClick = { discountType = "percentage" }, label = { Text("Percentage (%)") })
                    FilterChip(selected = discountType == "fixed", onClick = { discountType = "fixed" }, label = { Text("Fixed Amount (₱)") })
                }
                Spacer(modifier = Modifier.height(8.dp))
                OutlinedTextField(value = discountValueText, onValueChange = { discountValueText = it }, label = { Text("Discount Value *") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                Spacer(modifier = Modifier.height(8.dp))
                OutlinedTextField(value = eligibleCustomer, onValueChange = { eligibleCustomer = it }, label = { Text("Eligible Customers") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                Spacer(modifier = Modifier.height(8.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(value = startDate, onValueChange = { startDate = it }, label = { Text("Start Date") }, singleLine = true, modifier = Modifier.weight(1f))
                    OutlinedTextField(value = endDate, onValueChange = { endDate = it }, label = { Text("End Date") }, singleLine = true, modifier = Modifier.weight(1f))
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    val discVal = discountValueText.toDoubleOrNull() ?: 0.0
                    val promo = (initialPromo ?: PromoEntity(promoName = promoName, discountType = discountType, discountValue = discVal, startDate = startDate, endDate = endDate)).copy(
                        promoName = promoName.trim(),
                        description = description.trim(),
                        discountType = discountType,
                        discountValue = discVal,
                        eligibleCustomer = eligibleCustomer.trim(),
                        startDate = startDate.trim(),
                        endDate = endDate.trim(),
                        status = status
                    )
                    onConfirm(promo)
                },
                colors = ButtonDefaults.buttonColors(containerColor = EspressoPrimary, contentColor = CreamBackground)
            ) {
                Text("Save Promotion")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Cancel") }
        }
    )
}

private fun String?.isNull_or_blank(): Boolean = this == null || this.trim().isEmpty()
