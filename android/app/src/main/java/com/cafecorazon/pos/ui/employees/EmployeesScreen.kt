package com.cafecorazon.pos.ui.employees

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Clear
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.cafecorazon.pos.data.local.dao.UserWithPermissions
import com.cafecorazon.pos.data.local.entity.EmployeePermissionEntity
import com.cafecorazon.pos.data.local.entity.UserEntity
import com.cafecorazon.pos.security.SessionUser
import com.cafecorazon.pos.ui.components.AppShell
import com.cafecorazon.pos.ui.navigation.Screen
import com.cafecorazon.pos.ui.theme.CaramelAccent
import com.cafecorazon.pos.ui.theme.CreamBackground
import com.cafecorazon.pos.ui.theme.EspressoPrimary
import com.cafecorazon.pos.ui.theme.SuccessGreen

@Composable
fun EmployeesScreen(
    viewModel: EmployeesViewModel,
    sessionUser: SessionUser?,
    onNavigate: (Screen) -> Unit,
    onLogout: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()
    var showCreateDialog by remember { mutableStateOf(false) }
    var editingUserItem by remember { mutableStateOf<UserWithPermissions?>(null) }
    var deletingUserItem by remember { mutableStateOf<UserWithPermissions?>(null) }

    AppShell(
        title = "Employees & Permissions",
        currentScreenRoute = Screen.Employees.route,
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
                Text("User Accounts", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = EspressoPrimary)
                Button(
                    onClick = { showCreateDialog = true },
                    colors = ButtonDefaults.buttonColors(containerColor = EspressoPrimary, contentColor = CreamBackground)
                ) {
                    Icon(Icons.Default.Add, contentDescription = null)
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Add Employee")
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            if (uiState.successMessage != null) {
                Surface(color = SuccessGreen.copy(alpha = 0.15f), shape = RoundedCornerShape(8.dp), modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp)) {
                    Row(modifier = Modifier.padding(10.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                        Text(uiState.successMessage!!, color = SuccessGreen, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                        IconButton(onClick = { viewModel.clearMessages() }, modifier = Modifier.size(18.dp)) {
                            Icon(Icons.Default.Clear, contentDescription = null, tint = SuccessGreen)
                        }
                    }
                }
            }

            if (uiState.errorMessage != null) {
                Surface(color = MaterialTheme.colorScheme.errorContainer, shape = RoundedCornerShape(8.dp), modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp)) {
                    Row(modifier = Modifier.padding(10.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                        Text(uiState.errorMessage!!, color = MaterialTheme.colorScheme.onErrorContainer, fontSize = 12.sp)
                        IconButton(onClick = { viewModel.clearMessages() }, modifier = Modifier.size(18.dp)) {
                            Icon(Icons.Default.Clear, contentDescription = null, tint = MaterialTheme.colorScheme.onErrorContainer)
                        }
                    }
                }
            }

            LazyColumn(
                verticalArrangement = Arrangement.spacedBy(10.dp),
                modifier = Modifier.fillMaxSize()
            ) {
                items(uiState.users, key = { it.user.id }) { uwp ->
                    val u = uwp.user
                    val isProtected = u.email == "admin@gmail.com" || u.id == sessionUser?.id

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
                                    Text(u.fullname, fontWeight = FontWeight.Bold, fontSize = 16.sp, color = EspressoPrimary)
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Surface(
                                        color = if (u.role == "admin") EspressoPrimary else CaramelAccent,
                                        shape = RoundedCornerShape(4.dp)
                                    ) {
                                        Text(
                                            text = u.role.uppercase(),
                                            fontSize = 10.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = CreamBackground,
                                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                        )
                                    }
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Surface(
                                        color = if (u.status == "active") SuccessGreen.copy(alpha = 0.15f) else MaterialTheme.colorScheme.errorContainer,
                                        shape = RoundedCornerShape(4.dp)
                                    ) {
                                        Text(
                                            text = u.status,
                                            fontSize = 10.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = if (u.status == "active") SuccessGreen else MaterialTheme.colorScheme.error,
                                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                        )
                                    }
                                }
                                Text(u.email, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }

                            Row {
                                IconButton(onClick = { editingUserItem = uwp }) {
                                    Icon(Icons.Default.Edit, contentDescription = "Edit", tint = EspressoPrimary)
                                }
                                if (!isProtected) {
                                    IconButton(onClick = { deletingUserItem = uwp }) {
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

    if (showCreateDialog) {
        CreateUserDialog(
            viewModel = viewModel,
            sessionUser = sessionUser,
            onDismiss = { showCreateDialog = false }
        )
    }

    if (editingUserItem != null) {
        EditUserDialog(
            uwp = editingUserItem!!,
            viewModel = viewModel,
            sessionUser = sessionUser,
            onDismiss = { editingUserItem = null }
        )
    }

    if (deletingUserItem != null) {
        AlertDialog(
            onDismissRequest = { deletingUserItem = null },
            title = { Text("Confirm Employee Deletion", fontWeight = FontWeight.Bold, color = EspressoPrimary) },
            text = { Text("Are you sure you want to delete employee \"${deletingUserItem!!.user.fullname}\"? Or prefer disabling their status.", fontSize = 14.sp) },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.deleteUser(deletingUserItem!!.user.id, sessionUser)
                        deletingUserItem = null
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error)
                ) {
                    Text("Delete Account")
                }
            },
            dismissButton = {
                TextButton(onClick = { deletingUserItem = null }) { Text("Cancel") }
            }
        )
    }
}

@Composable
fun CreateUserDialog(
    viewModel: EmployeesViewModel,
    sessionUser: SessionUser?,
    onDismiss: () -> Unit
) {
    var fullname by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var role by remember { mutableStateOf("staff") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Create Employee Account", fontWeight = FontWeight.Bold, color = EspressoPrimary) },
        text = {
            Column(modifier = Modifier.fillMaxWidth()) {
                OutlinedTextField(value = fullname, onValueChange = { fullname = it }, label = { Text("Full Name *") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                Spacer(modifier = Modifier.height(8.dp))
                OutlinedTextField(value = email, onValueChange = { email = it }, label = { Text("Email Address *") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                Spacer(modifier = Modifier.height(8.dp))
                OutlinedTextField(value = password, onValueChange = { password = it }, label = { Text("Initial Password *") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                Spacer(modifier = Modifier.height(8.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    FilterChip(selected = role == "staff", onClick = { role = "staff" }, label = { Text("Staff Role") })
                    FilterChip(selected = role == "admin", onClick = { role = "admin" }, label = { Text("Admin Role") })
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    viewModel.createUser(
                        user = UserEntity(fullname = fullname.trim(), email = email.trim(), passwordHash = "", role = role, status = "active"),
                        rawPass = password,
                        permissions = null,
                        sessionUser = sessionUser,
                        onSuccess = onDismiss
                    )
                },
                colors = ButtonDefaults.buttonColors(containerColor = EspressoPrimary, contentColor = CreamBackground)
            ) {
                Text("Create User")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Cancel") }
        }
    )
}

@Composable
fun EditUserDialog(
    uwp: UserWithPermissions,
    viewModel: EmployeesViewModel,
    sessionUser: SessionUser?,
    onDismiss: () -> Unit
) {
    val u = uwp.user
    val p = uwp.permissions ?: EmployeePermissionEntity(userId = u.id)

    var fullname by remember { mutableStateOf(u.fullname) }
    var email by remember { mutableStateOf(u.email) }
    var role by remember { mutableStateOf(u.role) }
    var status by remember { mutableStateOf(u.status) }
    var newPassword by remember { mutableStateOf("") }

    var canViewDashboard by remember { mutableStateOf(p.canViewDashboard) }
    var canManageUsers by remember { mutableStateOf(p.canManageUsers) }
    var canManageProducts by remember { mutableStateOf(p.canManageProducts) }
    var canManageMenu by remember { mutableStateOf(p.canManageMenu) }
    var canManageOrders by remember { mutableStateOf(p.canManageOrders) }
    var canManageInventory by remember { mutableStateOf(p.canManageInventory) }
    var canManageSales by remember { mutableStateOf(p.canManageSales) }
    var canManageAttendance by remember { mutableStateOf(p.canManageAttendance) }
    var canManageReports by remember { mutableStateOf(p.canManageReports) }
    var canManageSettings by remember { mutableStateOf(p.canManageSettings) }
    var canManagePromos by remember { mutableStateOf(p.canManagePromos) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Edit Employee & Permissions", fontWeight = FontWeight.Bold, color = EspressoPrimary) },
        text = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState())
            ) {
                OutlinedTextField(value = fullname, onValueChange = { fullname = it }, label = { Text("Full Name") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                Spacer(modifier = Modifier.height(8.dp))
                OutlinedTextField(value = email, onValueChange = { email = it }, label = { Text("Email Address") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                Spacer(modifier = Modifier.height(8.dp))
                OutlinedTextField(value = newPassword, onValueChange = { newPassword = it }, label = { Text("New Password (optional)") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                Spacer(modifier = Modifier.height(8.dp))

                Text("Role & Account Status", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = EspressoPrimary)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(vertical = 4.dp)) {
                    FilterChip(selected = role == "staff", onClick = { role = "staff" }, label = { Text("Staff") })
                    FilterChip(selected = role == "admin", onClick = { role = "admin" }, label = { Text("Admin") })
                    FilterChip(selected = status == "active", onClick = { status = "active" }, label = { Text("Active") })
                    FilterChip(selected = status == "inactive", onClick = { status = "inactive" }, label = { Text("Inactive") })
                }

                HorizontalDivider(modifier = Modifier.padding(vertical = 12.dp))

                Text("Granular Module Permissions", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = EspressoPrimary)
                Spacer(modifier = Modifier.height(4.dp))

                val permList = listOf(
                    "View Dashboard" to canViewDashboard,
                    "Manage Users" to canManageUsers,
                    "Manage Products" to canManageProducts,
                    "Manage Menu" to canManageMenu,
                    "Manage Orders" to canManageOrders,
                    "Manage Inventory" to canManageInventory,
                    "Manage Sales" to canManageSales,
                    "Manage Attendance" to canManageAttendance,
                    "Manage Reports" to canManageReports,
                    "Manage Settings" to canManageSettings,
                    "Manage Promos" to canManagePromos
                )

                permList.forEach { (label, isChecked) ->
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(label, fontSize = 12.sp)
                        Switch(
                            checked = isChecked,
                            onCheckedChange = { checked ->
                                when (label) {
                                    "View Dashboard" -> canViewDashboard = checked
                                    "Manage Users" -> canManageUsers = checked
                                    "Manage Products" -> canManageProducts = checked
                                    "Manage Menu" -> canManageMenu = checked
                                    "Manage Orders" -> canManageOrders = checked
                                    "Manage Inventory" -> canManageInventory = checked
                                    "Manage Sales" -> canManageSales = checked
                                    "Manage Attendance" -> canManageAttendance = checked
                                    "Manage Reports" -> canManageReports = checked
                                    "Manage Settings" -> canManageSettings = checked
                                    "Manage Promos" -> canManagePromos = checked
                                }
                            }
                        )
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    val updatedPerms = p.copy(
                        canViewDashboard = canViewDashboard,
                        canManageUsers = canManageUsers,
                        canManageProducts = canManageProducts,
                        canManageMenu = canManageMenu,
                        canManageOrders = canManageOrders,
                        canManageInventory = canManageInventory,
                        canManageSales = canManageSales,
                        canManageAttendance = canManageAttendance,
                        canManageReports = canManageReports,
                        canManageSettings = canManageSettings,
                        canManagePromos = canManagePromos
                    )
                    viewModel.updateUser(
                        userId = u.id,
                        fullname = fullname.trim(),
                        email = email.trim(),
                        role = role,
                        status = status,
                        newPassword = newPassword.ifBlank { null },
                        permissions = updatedPerms,
                        sessionUser = sessionUser,
                        onSuccess = onDismiss
                    )
                },
                colors = ButtonDefaults.buttonColors(containerColor = EspressoPrimary, contentColor = CreamBackground)
            ) {
                Text("Save Changes")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Cancel") }
        }
    )
}
