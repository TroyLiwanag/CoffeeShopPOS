package com.cafecorazon.pos.ui.settings

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Backup
import androidx.compose.material.icons.filled.Print
import androidx.compose.material.icons.filled.Save
import androidx.compose.material.icons.filled.Store
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.cafecorazon.pos.data.repository.ShopSettingsModel
import com.cafecorazon.pos.security.SessionUser
import com.cafecorazon.pos.ui.components.AppShell
import com.cafecorazon.pos.ui.navigation.Screen
import com.cafecorazon.pos.ui.theme.CaramelAccent
import com.cafecorazon.pos.ui.theme.CreamBackground
import com.cafecorazon.pos.ui.theme.EspressoPrimary
import com.cafecorazon.pos.ui.theme.SuccessGreen

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    viewModel: SettingsViewModel,
    sessionUser: SessionUser?,
    onNavigate: (Screen) -> Unit,
    onLogout: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()
    val model = uiState.settingsModel

    var shopName by remember(model.shopName) { mutableStateOf(model.shopName) }
    var businessStyle by remember(model.businessStyle) { mutableStateOf(model.businessStyle) }
    var receiptFooter by remember(model.receiptFooter) { mutableStateOf(model.receiptFooter) }
    var vatRateText by remember(model.vatRate) { mutableStateOf(model.vatRate.toString()) }
    var seniorRateText by remember(model.seniorDiscountRate) { mutableStateOf(model.seniorDiscountRate.toString()) }
    var printerTransport by remember(model.printerTransport) { mutableStateOf(model.printerTransport) }
    var printerAddress by remember(model.printerAddress) { mutableStateOf(model.printerAddress) }

    AppShell(
        title = "Shop Settings & Backup",
        currentScreenRoute = Screen.Settings.route,
        sessionUser = sessionUser,
        onNavigate = onNavigate,
        onLogout = onLogout
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .background(CreamBackground)
                .verticalScroll(rememberScrollState())
                .padding(16.dp)
        ) {
            if (uiState.successMessage != null) {
                Surface(color = SuccessGreen.copy(alpha = 0.15f), shape = RoundedCornerShape(8.dp), modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp)) {
                    Text(uiState.successMessage!!, color = SuccessGreen, fontWeight = FontWeight.Bold, fontSize = 13.sp, modifier = Modifier.padding(10.dp))
                }
            }

            if (uiState.errorMessage != null) {
                Surface(color = MaterialTheme.colorScheme.errorContainer, shape = RoundedCornerShape(8.dp), modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp)) {
                    Text(uiState.errorMessage!!, color = MaterialTheme.colorScheme.onErrorContainer, fontSize = 13.sp, modifier = Modifier.padding(10.dp))
                }
            }

            // Store Branding Card
            Card(
                colors = CardDefaults.cardColors(containerColor = Color.White),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Store, contentDescription = null, tint = EspressoPrimary)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Store Branding & Receipt Info", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = EspressoPrimary)
                    }

                    HorizontalDivider(modifier = Modifier.padding(vertical = 12.dp))

                    OutlinedTextField(value = shopName, onValueChange = { shopName = it }, label = { Text("Shop Name") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                    Spacer(modifier = Modifier.height(8.dp))
                    OutlinedTextField(value = businessStyle, onValueChange = { businessStyle = it }, label = { Text("Business Tagline") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                    Spacer(modifier = Modifier.height(8.dp))
                    OutlinedTextField(value = receiptFooter, onValueChange = { receiptFooter = it }, label = { Text("Receipt Footer Message") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                    Spacer(modifier = Modifier.height(8.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedTextField(value = vatRateText, onValueChange = { vatRateText = it }, label = { Text("VAT Rate (%)") }, singleLine = true, modifier = Modifier.weight(1f))
                        OutlinedTextField(value = seniorRateText, onValueChange = { seniorRateText = it }, label = { Text("Senior/PWD Rate (%)") }, singleLine = true, modifier = Modifier.weight(1f))
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Thermal Receipt Printer Configuration Card
            Card(
                colors = CardDefaults.cardColors(containerColor = Color.White),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Print, contentDescription = null, tint = EspressoPrimary)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Thermal Printer Settings", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = EspressoPrimary)
                    }

                    HorizontalDivider(modifier = Modifier.padding(vertical = 12.dp))

                    Text("Printer Transport Type:", fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(vertical = 4.dp)) {
                        FilterChip(selected = printerTransport == "Bluetooth", onClick = { printerTransport = "Bluetooth" }, label = { Text("Bluetooth RFCOMM") })
                        FilterChip(selected = printerTransport == "USB", onClick = { printerTransport = "USB" }, label = { Text("USB Host") })
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    OutlinedTextField(
                        value = printerAddress,
                        onValueChange = { printerAddress = it },
                        label = { Text(if (printerTransport == "Bluetooth") "Bluetooth MAC Address (e.g. 00:11:22:33:44:55)" else "USB Device Name / ID") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            Button(
                onClick = {
                    val updatedModel = ShopSettingsModel(
                        shopName = shopName,
                        businessStyle = businessStyle,
                        receiptFooter = receiptFooter,
                        vatRate = vatRateText.toDoubleOrNull() ?: 12.0,
                        seniorDiscountRate = seniorRateText.toDoubleOrNull() ?: 20.0,
                        pwdDiscountRate = seniorRateText.toDoubleOrNull() ?: 20.0,
                        printerTransport = printerTransport,
                        printerAddress = printerAddress
                    )
                    viewModel.saveSettings(updatedModel, sessionUser)
                },
                colors = ButtonDefaults.buttonColors(containerColor = EspressoPrimary, contentColor = CreamBackground),
                shape = RoundedCornerShape(10.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(48.dp)
            ) {
                Icon(Icons.Default.Save, contentDescription = null)
                Spacer(modifier = Modifier.width(8.dp))
                Text("Save Settings Configuration", fontWeight = FontWeight.Bold)
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Database Backup & Restore Card
            Card(
                colors = CardDefaults.cardColors(containerColor = Color.White),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Backup, contentDescription = null, tint = EspressoPrimary)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Database Backup & Restore", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = EspressoPrimary)
                    }

                    HorizontalDivider(modifier = Modifier.padding(vertical = 12.dp))

                    Text(
                        text = "Because all Café Corazon data is stored locally in Room SQLite, you can export JSON database backups to device storage or restore them anytime.",
                        fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }
    }
}
