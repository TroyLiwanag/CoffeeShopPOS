package com.cafecorazon.pos.ui.reports

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Assessment
import androidx.compose.material.icons.filled.AttachMoney
import androidx.compose.material.icons.filled.Receipt
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.cafecorazon.pos.security.SessionUser
import com.cafecorazon.pos.ui.components.AppShell
import com.cafecorazon.pos.ui.navigation.Screen
import com.cafecorazon.pos.ui.theme.CaramelAccent
import com.cafecorazon.pos.ui.theme.CreamBackground
import com.cafecorazon.pos.ui.theme.EspressoPrimary
import com.cafecorazon.pos.ui.theme.SuccessGreen

@Composable
fun ReportsScreen(
    viewModel: ReportsViewModel,
    sessionUser: SessionUser?,
    onNavigate: (Screen) -> Unit,
    onLogout: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()

    AppShell(
        title = "Sales Reports & Analytics",
        currentScreenRoute = Screen.Reports.route,
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
            // Period Filter Buttons
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf(7 to "7 Days", 30 to "30 Days", null to "All Time").forEach { (days, label) ->
                        FilterChip(
                            selected = uiState.selectedDaysFilter == days,
                            onClick = { viewModel.loadSummary(days) },
                            label = { Text(label) }
                        )
                    }
                }

                Button(
                    onClick = { viewModel.generateSalesSnapshot(sessionUser) },
                    colors = ButtonDefaults.buttonColors(containerColor = EspressoPrimary, contentColor = CreamBackground)
                ) {
                    Icon(Icons.Default.Assessment, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Generate Snapshot")
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            if (uiState.isLoading) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = EspressoPrimary)
                }
            } else {
                val data = uiState.summaryData

                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(16.dp),
                    modifier = Modifier.fillMaxSize()
                ) {
                    // Summary Stat Cards
                    item {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            Card(
                                colors = CardDefaults.cardColors(containerColor = Color.White),
                                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                                modifier = Modifier.weight(1f)
                            ) {
                                Row(
                                    modifier = Modifier.padding(16.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Surface(color = SuccessGreen.copy(alpha = 0.15f), shape = RoundedCornerShape(8.dp)) {
                                        Icon(Icons.Default.AttachMoney, contentDescription = null, tint = SuccessGreen, modifier = Modifier.padding(8.dp))
                                    }
                                    Spacer(modifier = Modifier.width(12.dp))
                                    Column {
                                        Text("Total Revenue", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                        Text("₱${String.format("%.2f", data?.totalSales ?: 0.0)}", fontSize = 20.sp, fontWeight = FontWeight.Bold, color = EspressoPrimary)
                                    }
                                }
                            }

                            Card(
                                colors = CardDefaults.cardColors(containerColor = Color.White),
                                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                                modifier = Modifier.weight(1f)
                            ) {
                                Row(
                                    modifier = Modifier.padding(16.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Surface(color = CaramelAccent.copy(alpha = 0.15f), shape = RoundedCornerShape(8.dp)) {
                                        Icon(Icons.Default.Receipt, contentDescription = null, tint = CaramelAccent, modifier = Modifier.padding(8.dp))
                                    }
                                    Spacer(modifier = Modifier.width(12.dp))
                                    Column {
                                        Text("Completed Orders", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                        Text("${data?.totalOrders ?: 0}", fontSize = 20.sp, fontWeight = FontWeight.Bold, color = EspressoPrimary)
                                    }
                                }
                            }
                        }
                    }

                    // Top Best Selling Items
                    item {
                        Card(
                            colors = CardDefaults.cardColors(containerColor = Color.White),
                            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(Icons.Default.Star, contentDescription = null, tint = CaramelAccent)
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text("Top Best Selling Items", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = EspressoPrimary)
                                }

                                HorizontalDivider(modifier = Modifier.padding(vertical = 12.dp))

                                val topItems = data?.topProducts ?: emptyList()
                                if (topItems.isEmpty()) {
                                    Text("No sales data available for this period", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                } else {
                                    topItems.forEachIndexed { index, prod ->
                                        Row(
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .padding(vertical = 6.dp),
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Row(verticalAlignment = Alignment.CenterVertically) {
                                                Text("#${index + 1}", fontWeight = FontWeight.Bold, color = CaramelAccent, fontSize = 13.sp, modifier = Modifier.width(28.dp))
                                                Text(prod.name, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = EspressoPrimary)
                                            }
                                            Column(horizontalAlignment = Alignment.End) {
                                                Text("₱${String.format("%.2f", prod.revenue ?: 0.0)}", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = EspressoPrimary)
                                                Text("${prod.qty ?: 0} sold", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // Daily Sales Breakdown
                    item {
                        Card(
                            colors = CardDefaults.cardColors(containerColor = Color.White),
                            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Text("Daily Sales Trend", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = EspressoPrimary)
                                HorizontalDivider(modifier = Modifier.padding(vertical = 12.dp))

                                val daysTrend = data?.byDay ?: emptyList()
                                if (daysTrend.isEmpty()) {
                                    Text("No daily trend data available", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                } else {
                                    daysTrend.forEach { day ->
                                        Row(
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .padding(vertical = 6.dp),
                                            horizontalArrangement = Arrangement.SpaceBetween
                                        ) {
                                            Text(day.day, fontWeight = FontWeight.Medium, fontSize = 13.sp, color = EspressoPrimary)
                                            Text("${day.orders ?: 0} orders — ₱${String.format("%.2f", day.sales ?: 0.0)}", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = CaramelAccent)
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
