package com.cafecorazon.pos.ui.payroll

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Payments
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.cafecorazon.pos.data.repository.RateInput
import com.cafecorazon.pos.security.SessionUser
import com.cafecorazon.pos.ui.components.AppShell
import com.cafecorazon.pos.ui.navigation.Screen
import com.cafecorazon.pos.ui.theme.CaramelAccent
import com.cafecorazon.pos.ui.theme.CreamBackground
import com.cafecorazon.pos.ui.theme.EspressoPrimary
import com.cafecorazon.pos.ui.theme.SuccessGreen

@Composable
fun PayrollScreen(
    viewModel: PayrollViewModel,
    sessionUser: SessionUser?,
    onNavigate: (Screen) -> Unit,
    onLogout: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()
    var editingUser by remember { mutableStateOf<Long?>(null) }
    var editRateText by remember { mutableStateOf("") }

    AppShell(
        title = "Payroll & Rates",
        currentScreenRoute = Screen.Payroll.route,
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
            // Period Selector
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("Payroll Summary", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = EspressoPrimary)

                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf(7 to "7 Days", 15 to "15 Days", 30 to "30 Days").forEach { (days, label) ->
                        FilterChip(
                            selected = uiState.daysPeriod == days,
                            onClick = { viewModel.loadPayroll(days) },
                            label = { Text(label) }
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            if (uiState.isLoading) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = EspressoPrimary)
                }
            } else {
                val totalPayout = uiState.overviewList.sumOf { it.totalPay }

                Card(
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier.padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Surface(color = SuccessGreen.copy(alpha = 0.15f), shape = RoundedCornerShape(8.dp)) {
                            Icon(Icons.Default.Payments, contentDescription = null, tint = SuccessGreen, modifier = Modifier.padding(10.dp))
                        }
                        Spacer(modifier = Modifier.width(12.dp))
                        Column {
                            Text("Total Estimated Payout (${uiState.daysPeriod} Days)", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Text("₱${String.format("%.2f", totalPayout)}", fontSize = 22.sp, fontWeight = FontWeight.Bold, color = EspressoPrimary)
                        }
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                    modifier = Modifier.fillMaxSize()
                ) {
                    items(uiState.overviewList, key = { it.id }) { emp ->
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
                                        Text(emp.fullname, fontWeight = FontWeight.Bold, fontSize = 16.sp, color = EspressoPrimary)
                                        Spacer(modifier = Modifier.width(8.dp))
                                        Surface(color = CaramelAccent.copy(alpha = 0.15f), shape = RoundedCornerShape(4.dp)) {
                                            Text(
                                                text = "₱${emp.hourlyRate}/hr",
                                                fontSize = 11.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = EspressoPrimary,
                                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                            )
                                        }
                                    }
                                    Text("${emp.email} · ${emp.role.uppercase()}", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    Text(
                                        text = "Hours: ${emp.regularHours}h regular + ${emp.overtimeHours}h OT (${emp.hoursSource})",
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Medium,
                                        color = CaramelAccent
                                    )
                                }

                                Column(horizontalAlignment = Alignment.End) {
                                    Text("₱${String.format("%.2f", emp.totalPay)}", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = SuccessGreen)
                                    IconButton(onClick = {
                                        editingUser = emp.id
                                        editRateText = emp.hourlyRate.toString()
                                    }) {
                                        Icon(Icons.Default.Edit, contentDescription = "Edit Rate", tint = EspressoPrimary)
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    if (editingUser != null) {
        AlertDialog(
            onDismissRequest = { editingUser = null },
            title = { Text("Edit Hourly Rate", fontWeight = FontWeight.Bold, color = EspressoPrimary) },
            text = {
                OutlinedTextField(
                    value = editRateText,
                    onValueChange = { editRateText = it },
                    label = { Text("Hourly Rate (₱)") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        val rate = editRateText.toDoubleOrNull() ?: 80.0
                        viewModel.saveRates(
                            listOf(RateInput(userId = editingUser!!, hourlyRate = rate)),
                            sessionUser,
                            onSuccess = { editingUser = null }
                        )
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = EspressoPrimary, contentColor = CreamBackground)
                ) {
                    Text("Save Rate")
                }
            },
            dismissButton = {
                TextButton(onClick = { editingUser = null }) { Text("Cancel") }
            }
        )
    }
}
