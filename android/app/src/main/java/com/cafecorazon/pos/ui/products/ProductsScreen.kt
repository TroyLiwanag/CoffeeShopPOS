package com.cafecorazon.pos.ui.products

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
import com.cafecorazon.pos.data.local.entity.ProductEntity
import com.cafecorazon.pos.security.SessionUser
import com.cafecorazon.pos.ui.components.AppShell
import com.cafecorazon.pos.ui.navigation.Screen
import com.cafecorazon.pos.ui.theme.CaramelAccent
import com.cafecorazon.pos.ui.theme.CreamBackground
import com.cafecorazon.pos.ui.theme.EspressoPrimary
import com.cafecorazon.pos.ui.theme.SuccessGreen

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProductsScreen(
    viewModel: ProductsViewModel,
    sessionUser: SessionUser?,
    onNavigate: (Screen) -> Unit,
    onLogout: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()

    var showCreateDialog by remember { mutableStateOf(false) }
    var editingProduct by remember { mutableStateOf<ProductEntity?>(null) }
    var deletingProduct by remember { mutableStateOf<ProductEntity?>(null) }

    AppShell(
        title = "Products Inventory Catalog",
        currentScreenRoute = Screen.Products.route,
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
            // Header Bar
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("Product Inventory", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = EspressoPrimary)
                Button(
                    onClick = { showCreateDialog = true },
                    colors = ButtonDefaults.buttonColors(containerColor = EspressoPrimary, contentColor = CreamBackground)
                ) {
                    Icon(Icons.Default.Add, contentDescription = null)
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Add Product")
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Feedback Messages
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

            // Search Bar & Filter Chips
            OutlinedTextField(
                value = uiState.searchQuery,
                onValueChange = { viewModel.setSearchQuery(it) },
                placeholder = { Text("Search products...") },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                trailingIcon = {
                    if (uiState.searchQuery.isNotEmpty()) {
                        IconButton(onClick = { viewModel.setSearchQuery("") }) {
                            Icon(Icons.Default.Clear, contentDescription = null)
                        }
                    }
                },
                singleLine = true,
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(modifier = Modifier.height(8.dp))

            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                uiState.categories.forEach { cat ->
                    FilterChip(
                        selected = (cat == "All" && uiState.selectedCategory == null) || uiState.selectedCategory == cat,
                        onClick = { viewModel.setSelectedCategory(if (cat == "All") null else cat) },
                        label = { Text(cat) }
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Products List
            if (uiState.products.isEmpty()) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text("No products found matching your search.", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 14.sp)
                }
            } else {
                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                    modifier = Modifier.fillMaxSize()
                ) {
                    items(uiState.products, key = { it.id }) { item ->
                        val isAvailable = item.status == "available"
                        val isLowStock = item.stock <= 10

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
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Text("Price: ₱${String.format("%.2f", item.price)}", fontSize = 13.sp, color = CaramelAccent, fontWeight = FontWeight.Bold)
                                        Spacer(modifier = Modifier.width(12.dp))
                                        Surface(
                                            color = if (isLowStock) MaterialTheme.colorScheme.errorContainer else SuccessGreen.copy(alpha = 0.1f),
                                            shape = RoundedCornerShape(4.dp)
                                        ) {
                                            Text(
                                                text = "Stock: ${item.stock}",
                                                fontSize = 11.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = if (isLowStock) MaterialTheme.colorScheme.error else SuccessGreen,
                                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                            )
                                        }
                                    }
                                }

                                Row {
                                    IconButton(onClick = { viewModel.toggleProductStatus(item.id, sessionUser) }) {
                                        Icon(Icons.Default.PowerSettingsNew, contentDescription = "Toggle Status", tint = if (isAvailable) SuccessGreen else MaterialTheme.colorScheme.error)
                                    }
                                    IconButton(onClick = { editingProduct = item }) {
                                        Icon(Icons.Default.Edit, contentDescription = "Edit", tint = EspressoPrimary)
                                    }
                                    IconButton(onClick = { deletingProduct = item }) {
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

    // Create Product Dialog
    if (showCreateDialog) {
        ProductFormDialog(
            title = "Create New Product",
            initialProduct = null,
            onDismiss = { showCreateDialog = false },
            onConfirm = { p ->
                viewModel.createProduct(p, sessionUser) {
                    showCreateDialog = false
                }
            }
        )
    }

    // Edit Product Dialog
    if (editingProduct != null) {
        ProductFormDialog(
            title = "Edit Product #${editingProduct!!.id}",
            initialProduct = editingProduct,
            onDismiss = { editingProduct = null },
            onConfirm = { p ->
                viewModel.updateProduct(p, sessionUser) {
                    editingProduct = null
                }
            }
        )
    }

    // Confirm Delete Dialog
    if (deletingProduct != null) {
        AlertDialog(
            onDismissRequest = { deletingProduct = null },
            title = { Text("Confirm Product Action", fontWeight = FontWeight.Bold, color = EspressoPrimary) },
            text = {
                Text("Are you sure you want to disable or delete \"${deletingProduct!!.name}\"? Disabling will preserve historical sales records.", fontSize = 14.sp)
            },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.toggleProductStatus(deletingProduct!!.id, sessionUser)
                        deletingProduct = null
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = EspressoPrimary, contentColor = CreamBackground)
                ) {
                    Text("Disable Product")
                }
            },
            dismissButton = {
                TextButton(
                    onClick = {
                        viewModel.deleteProduct(deletingProduct!!.id, sessionUser)
                        deletingProduct = null
                    }
                ) {
                    Text("Delete Permanently", color = MaterialTheme.colorScheme.error)
                }
            }
        )
    }
}

@Composable
fun ProductFormDialog(
    title: String,
    initialProduct: ProductEntity?,
    onDismiss: () -> Unit,
    onConfirm: (ProductEntity) -> Unit
) {
    var name by remember { mutableStateOf(initialProduct?.name ?: "") }
    var category by remember { mutableStateOf(initialProduct?.category ?: "Coffee") }
    var priceText by remember { mutableStateOf(initialProduct?.price?.toString() ?: "0.0") }
    var stockText by remember { mutableStateOf(initialProduct?.stock?.toString() ?: "50") }
    var description by remember { mutableStateOf(initialProduct?.description ?: "") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(title, fontWeight = FontWeight.Bold, color = EspressoPrimary) },
        text = {
            Column(modifier = Modifier.fillMaxWidth()) {
                OutlinedTextField(value = name, onValueChange = { name = it }, label = { Text("Product Name *") }, singleLine = true, modifier = Modifier.fillMaxWidth())
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
                    val product = (initialProduct ?: ProductEntity(name = name, price = price)).copy(
                        name = name.trim(),
                        category = category.trim(),
                        price = price,
                        stock = stock,
                        description = description.trim()
                    )
                    onConfirm(product)
                },
                colors = ButtonDefaults.buttonColors(containerColor = EspressoPrimary, contentColor = CreamBackground)
            ) {
                Text("Save Product")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Cancel") }
        }
    )
}

private fun String?.isNull_or_blank(): Boolean = this == null || this.trim().isEmpty()
