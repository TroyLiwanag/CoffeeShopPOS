package com.cafecorazon.pos.ui.verification

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Key
import androidx.compose.material.icons.filled.Person
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
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun VerificationCodesScreen(
    viewModel: VerificationCodesViewModel,
    sessionUser: SessionUser?,
    onNavigate: (Screen) -> Unit,
    onLogout: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()
    val usersWithPerms by viewModel.usersFlow.collectAsState()

    var staffEmail by remember { mutableStateOf("") }
    var dropdownExpanded by remember { mutableStateOf(false) }

    val staffList = usersWithPerms.filter { it.user.status == "active" }

    AppShell(
        title = "Staff Password Reset Management",
        currentScreenRoute = Screen.VerificationCodes.route,
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
            Card(
                colors = CardDefaults.cardColors(containerColor = Color.White),
                elevation = CardDefaults.cardElevation(defaultElevation = 3.dp),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("Generate Staff Reset Code", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = EspressoPrimary)
                    Text("Generates a local 10-minute verification code for staff password resets. Invalidates any previous code for the staff member.", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)

                    Spacer(modifier = Modifier.height(14.dp))

                    if (uiState.errorMessage != null) {
                        Surface(color = MaterialTheme.colorScheme.errorContainer, shape = RoundedCornerShape(8.dp), modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp)) {
                            Text(uiState.errorMessage!!, color = MaterialTheme.colorScheme.onErrorContainer, fontSize = 12.sp, modifier = Modifier.padding(10.dp))
                        }
                    }

                    if (uiState.generatedCode != null) {
                        Surface(
                            color = CaramelAccent.copy(alpha = 0.18f),
                            shape = RoundedCornerShape(10.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(bottom = 14.dp)
                        ) {
                            Row(
                                modifier = Modifier.padding(14.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column {
                                    Text("Generated Reset Code (Valid for 10 minutes):", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = EspressoPrimary)
                                    Text(uiState.generatedCode!!, fontSize = 32.sp, fontWeight = FontWeight.Bold, color = CaramelAccent)
                                }
                                Text("Provide code to staff member", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = EspressoPrimary)
                            }
                        }
                    }

                    // Staff User Selector Dropdown & Generation Row
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        ExposedDropdownMenuBox(
                            expanded = dropdownExpanded,
                            onExpandedChange = { dropdownExpanded = !dropdownExpanded },
                            modifier = Modifier.weight(1f)
                        ) {
                            OutlinedTextField(
                                value = staffEmail,
                                onValueChange = { staffEmail = it },
                                label = { Text("Select Staff Account") },
                                placeholder = { Text("Select staff member...") },
                                leadingIcon = { Icon(Icons.Default.Person, contentDescription = null, tint = EspressoPrimary) },
                                singleLine = true,
                                readOnly = false,
                                modifier = Modifier
                                    .menuAnchor()
                                    .fillMaxWidth()
                            )

                            ExposedDropdownMenu(
                                expanded = dropdownExpanded,
                                onDismissRequest = { dropdownExpanded = false }
                            ) {
                                staffList.forEach { item ->
                                    DropdownMenuItem(
                                        text = {
                                            Column {
                                                Text(item.user.fullname, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                                                Text("${item.user.email} (${item.user.role})", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                            }
                                        },
                                        onClick = {
                                            staffEmail = item.user.email
                                            dropdownExpanded = false
                                        }
                                    )
                                }
                            }
                        }

                        Button(
                            onClick = { viewModel.generateCode(staffEmail, sessionUser) },
                            enabled = !uiState.isLoading,
                            colors = ButtonDefaults.buttonColors(containerColor = EspressoPrimary, contentColor = CreamBackground),
                            shape = RoundedCornerShape(10.dp),
                            modifier = Modifier.height(52.dp)
                        ) {
                            Icon(Icons.Default.Add, contentDescription = null)
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Generate Reset Code", fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("Generated Security Codes History", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = EspressoPrimary)
                if (uiState.codes.isNotEmpty()) {
                    TextButton(onClick = { viewModel.deleteAllCodes(sessionUser) }) {
                        Text("Delete All", color = MaterialTheme.colorScheme.error, fontSize = 12.sp)
                    }
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            LazyColumn(
                verticalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.fillMaxSize()
            ) {
                items(uiState.codes, key = { it.code.id }) { item ->
                    val c = item.code
                    val user = item.user
                    val isUsed = c.usedAt != null
                    val isExpired = System.currentTimeMillis() > c.expiresAt

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
                            Column {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text(c.codePlain ?: "******", fontWeight = FontWeight.Bold, fontSize = 20.sp, color = CaramelAccent)
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Surface(
                                        color = when {
                                            isUsed -> MaterialTheme.colorScheme.outline.copy(alpha = 0.2f)
                                            isExpired -> MaterialTheme.colorScheme.errorContainer
                                            else -> SuccessGreen.copy(alpha = 0.15f)
                                        },
                                        shape = RoundedCornerShape(4.dp)
                                    ) {
                                        Text(
                                            text = when {
                                                isUsed -> "Used"
                                                isExpired -> "Expired"
                                                else -> "Active (10m)"
                                            },
                                            fontSize = 10.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = when {
                                                isUsed -> MaterialTheme.colorScheme.onSurfaceVariant
                                                isExpired -> MaterialTheme.colorScheme.error
                                                else -> SuccessGreen
                                            },
                                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                        )
                                    }
                                }
                                Text("Staff: ${user?.fullname ?: "Staff #"+c.userId} (${user?.email ?: ""})", fontSize = 12.sp, color = EspressoPrimary)
                                Text("Expires: ${SimpleDateFormat("M/d/yy, h:mm a", Locale.getDefault()).format(Date(c.expiresAt))} | Attempts: ${c.attemptsCount}/5", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }

                            Row {
                                if (!isUsed) {
                                    IconButton(onClick = { viewModel.markUsed(c.id, sessionUser) }) {
                                        Icon(Icons.Default.Check, contentDescription = "Mark Used", tint = SuccessGreen)
                                    }
                                }
                                IconButton(onClick = { viewModel.deleteCode(c.id, sessionUser) }) {
                                    Icon(Icons.Default.Delete, contentDescription = "Delete", tint = MaterialTheme.colorScheme.error)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
