package com.cafecorazon.pos.ui.menu

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
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.cafecorazon.pos.data.local.entity.MenuItemEntity
import com.cafecorazon.pos.data.repository.MenuRepository
import com.cafecorazon.pos.security.SessionUser
import com.cafecorazon.pos.ui.components.AppShell
import com.cafecorazon.pos.ui.navigation.Screen
import com.cafecorazon.pos.ui.theme.CaramelAccent
import com.cafecorazon.pos.ui.theme.CreamBackground
import com.cafecorazon.pos.ui.theme.EspressoPrimary
import com.cafecorazon.pos.ui.theme.SuccessGreen
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MenuManagementScreen(
    menuRepository: MenuRepository,
    sessionUser: SessionUser?,
    onNavigate: (Screen) -> Unit,
    onLogout: () -> Unit
) {
    val scope = rememberCoroutineScope()
    var search by remember { mutableStateOf("") }
    var selectedCategory by remember { mutableStateOf<String?>(null) }

    val menuItemsFlow = remember(categoryKey(selectedCategory), search) {
        menuRepository.searchMenuItems(selectedCategory, search)
    }
    val menuList by menuItemsFlow.collectAsState(initial = emptyList())

    val categoriesFlow = remember { menuRepository.categoriesFlow }
    val categoriesList by categoriesFlow.collectAsState(initial = emptyList())

    var showCreateDialog by remember { mutableStateOf(false) }
    var editingItem by remember { mutableStateOf<MenuItemEntity?>(null) }
    var deletingItem by remember { mutableStateOf<MenuItemEntity?>(null) }

    var successMsg by remember { mutableStateOf<String?>(null) }
    var errorMsg by remember { mutableStateOf<String?>(null) }

    AppShell(
        title = "Menu Catalog Management",
        currentScreenRoute = Screen.Menu.route,
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
            // Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("POS Menu Items", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = EspressoPrimary)
                Button(
                    onClick = { showCreateDialog = true },
                    colors = ButtonDefaults.buttonColors(containerColor = EspressoPrimary, contentColor = CreamBackground)
                ) {
                    Icon(Icons.Default.Add, contentDescription = null)
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Add Menu Item")
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

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

            // Search Bar & Filter Chips
            OutlinedTextField(
                value = search,
                onValueChange = { search = it },
                placeholder = { Text("Search menu items...") },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                trailingIcon = {
                    if (search.isNotEmpty()) {
                        IconButton(onClick = { search = "" }) {
                            Icon(Icons.Default.Clear, contentDescription = null)
                        }
                    }
                },
                singleLine = true,
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(modifier = Modifier.height(8.dp))

            val allCats = listOf("All") + categoriesList
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                allCats.forEach { cat ->
                    FilterChip(
                        selected = (cat == "All" && selectedCategory == null) || selectedCategory == cat,
                        onClick = { selectedCategory = if (cat == "All") null else cat },
                        label = { Text(cat) }
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Menu Items List
            if (menuList.isEmpty()) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text("No menu items found.", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 14.sp)
                }
            } else {
                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                    modifier = Modifier.fillMaxSize()
                ) {
                    items(menuList, key = { it.id }) { item ->
                        val isAvailable = item.status == "available"

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
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Text(item.name, fontWeight = FontWeight.Bold, fontSize = 15.sp, color = EspressoPrimary)
                                        Spacer(modifier = Modifier.width(8.dp))
                                        Surface(color = CaramelAccent.copy(alpha = 0.15f), shape = RoundedCornerShape(4.dp)) {
                                            Text(item.category, fontSize = 10.sp, fontWeight = FontWeight.Bold, color = EspressoPrimary, modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp))
                                        }
                                        Spacer(modifier = Modifier.width(6.dp))
                                        Surface(
                                            color = if (isAvailable) SuccessGreen.copy(alpha = 0.15f) else MaterialTheme.colorScheme.errorContainer,
                                            shape = RoundedCornerShape(4.dp)
                                        ) {
                                            Text(
                                                text = if (isAvailable) "Active" else "Disabled",
                                                fontSize = 10.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = if (isAvailable) SuccessGreen else MaterialTheme.colorScheme.error,
                                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                            )
                                        }
                                    }
                                    if (!item.description.isNull_or_blank()) {
                                        Text(item.description!!, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    }
                                    Text("Price: ₱${String.format("%.2f", item.price)} · Stock: ${item.stock}", fontSize = 13.sp, color = CaramelAccent, fontWeight = FontWeight.SemiBold)
                                }

                                Row {
                                    IconButton(onClick = {
                                        scope.launch {
                                            val res = menuRepository.toggleMenuItemStatus(item.id, sessionUser?.id, sessionUser?.fullname)
                                            if (res.isSuccess) successMsg = "Menu item status updated" else errorMsg = res.exceptionOrNull()?.message
                                        }
                                    }) {
                                        Icon(Icons.Default.PowerSettingsNew, contentDescription = "Toggle Status", tint = if (isAvailable) SuccessGreen else MaterialTheme.colorScheme.error)
                                    }
                                    IconButton(onClick = { editingItem = item }) {
                                        Icon(Icons.Default.Edit, contentDescription = "Edit", tint = EspressoPrimary)
                                    }
                                    IconButton(onClick = { deletingItem = item }) {
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

    // Create Dialog
    if (showCreateDialog) {
        MenuItemFormDialog(
            title = "Create New Menu Item",
            initialItem = null,
            onDismiss = { showCreateDialog = false },
            onConfirm = { item ->
                scope.launch {
                    val res = menuRepository.createMenuItem(item, sessionUser?.id, sessionUser?.fullname)
                    if (res.isSuccess) {
                        successMsg = "Menu item \"${item.name}\" created successfully!"
                        showCreateDialog = false
                    } else {
                        errorMsg = res.exceptionOrNull()?.message ?: "Failed to create menu item"
                    }
                }
            }
        )
    }

    // Edit Dialog
    if (editingItem != null) {
        MenuItemFormDialog(
            title = "Edit Menu Item #${editingItem!!.id}",
            initialItem = editingItem,
            onDismiss = { editingItem = null },
            onConfirm = { item ->
                scope.launch {
                    val res = menuRepository.updateMenuItem(item, sessionUser?.id, sessionUser?.fullname)
                    if (res.isSuccess) {
                        successMsg = "Menu item \"${item.name}\" updated successfully!"
                        editingItem = null
                    } else {
                        errorMsg = res.exceptionOrNull()?.message ?: "Failed to update menu item"
                    }
                }
            }
        )
    }

    // Confirm Delete Dialog
    if (deletingItem != null) {
        AlertDialog(
            onDismissRequest = { deletingItem = null },
            title = { Text("Confirm Menu Item Action", fontWeight = FontWeight.Bold, color = EspressoPrimary) },
            text = {
                Text("Are you sure you want to disable or delete \"${deletingItem!!.name}\"? Disabling keeps historical order data safe.", fontSize = 14.sp)
            },
            confirmButton = {
                Button(
                    onClick = {
                        scope.launch {
                            menuRepository.toggleMenuItemStatus(deletingItem!!.id, sessionUser?.id, sessionUser?.fullname)
                            deletingItem = null
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = EspressoPrimary, contentColor = CreamBackground)
                ) {
                    Text("Disable Item")
                }
            },
            dismissButton = {
                TextButton(
                    onClick = {
                        scope.launch {
                            menuRepository.deleteMenuItem(deletingItem!!.id, sessionUser?.id, sessionUser?.fullname)
                            deletingItem = null
                        }
                    }
                ) {
                    Text("Delete Permanently", color = MaterialTheme.colorScheme.error)
                }
            }
        )
    }
}

@Composable
fun MenuItemFormDialog(
    title: String,
    initialItem: MenuItemEntity?,
    onDismiss: () -> Unit,
    onConfirm: (MenuItemEntity) -> Unit
) {
    var name by remember { mutableStateOf(initialItem?.name ?: "") }
    var category by remember { mutableStateOf(initialItem?.category ?: "Coffee") }
    var priceText by remember { mutableStateOf(initialItem?.price?.toString() ?: "0.0") }
    var stockText by remember { mutableStateOf(initialItem?.stock?.toString() ?: "100") }
    var description by remember { mutableStateOf(initialItem?.description ?: "") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(title, fontWeight = FontWeight.Bold, color = EspressoPrimary) },
        text = {
            Column(modifier = Modifier.fillMaxWidth()) {
                OutlinedTextField(value = name, onValueChange = { name = it }, label = { Text("Item Name *") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                Spacer(modifier = Modifier.height(8.dp))
                OutlinedTextField(value = category, onValueChange = { category = it }, label = { Text("Category *") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                Spacer(modifier = Modifier.height(8.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(value = priceText, onValueChange = { priceText = it }, label = { Text("Price (₱) *") }, singleLine = true, modifier = Modifier.weight(1f))
                    OutlinedTextField(value = stockText, onValueChange = { stockText = it }, label = { Text("Initial Stock *") }, singleLine = true, modifier = Modifier.weight(1f))
                }
                Spacer(modifier = Modifier.height(8.dp))
                OutlinedTextField(value = description, onValueChange = { description = it }, label = { Text("Description") }, modifier = Modifier.fillMaxWidth())
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    val price = priceText.toDoubleOrNull() ?: 0.0
                    val stock = stockText.toIntOrNull() ?: 0
                    val item = (initialItem ?: MenuItemEntity(name = name, category = category, price = price)).copy(
                        name = name.trim(),
                        category = category.trim(),
                        price = price,
                        stock = stock,
                        description = description.trim()
                    )
                    onConfirm(item)
                },
                colors = ButtonDefaults.buttonColors(containerColor = EspressoPrimary, contentColor = CreamBackground)
            ) {
                Text("Save Menu Item")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Cancel") }
        }
    )
}

private fun categoryKey(cat: String?): String = cat ?: "ALL"

private fun String?.isNull_or_blank(): Boolean = this == null || this.trim().isEmpty()
