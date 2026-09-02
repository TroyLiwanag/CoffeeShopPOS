package com.cafecorazon.pos.ui.pos

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.cafecorazon.pos.data.local.entity.MenuItemEntity
import com.cafecorazon.pos.security.SessionUser
import com.cafecorazon.pos.ui.components.AppShell
import com.cafecorazon.pos.ui.navigation.Screen
import com.cafecorazon.pos.ui.theme.CaramelAccent
import com.cafecorazon.pos.ui.theme.CreamBackground
import com.cafecorazon.pos.ui.theme.EspressoPrimary

@Composable
fun PosScreen(
    viewModel: PosViewModel,
    sessionUser: SessionUser?,
    onNavigate: (Screen) -> Unit,
    onLogout: () -> Unit,
    onOrderCreated: (Long) -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()
    var showCheckoutDialog by remember { mutableStateOf(false) }

    AppShell(
        title = "POS Terminal",
        currentScreenRoute = Screen.Pos.route,
        sessionUser = sessionUser,
        onNavigate = onNavigate,
        onLogout = onLogout
    ) { padding ->
        Row(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .background(CreamBackground)
        ) {
            // Main Product Grid Section
            Column(
                modifier = Modifier
                    .weight(0.65f)
                    .fillMaxHeight()
                    .padding(16.dp)
            ) {
                // Search Bar
                OutlinedTextField(
                    value = uiState.searchQuery,
                    onValueChange = { viewModel.setSearchQuery(it) },
                    placeholder = { Text("Search coffee, drinks, snacks...") },
                    leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = EspressoPrimary) },
                    trailingIcon = {
                        if (uiState.searchQuery.isNotEmpty()) {
                            IconButton(onClick = { viewModel.setSearchQuery("") }) {
                                Icon(Icons.Default.Clear, contentDescription = "Clear")
                            }
                        }
                    },
                    shape = RoundedCornerShape(12.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedContainerColor = Color.White,
                        unfocusedContainerColor = Color.White
                    ),
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(12.dp))

                // Categories Row
                LazyRow(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    items(uiState.categories) { cat ->
                        val isSelected = uiState.selectedCategory == cat
                        FilterChip(
                            selected = isSelected,
                            onClick = { viewModel.selectCategory(cat) },
                            label = {
                                Text(
                                    text = cat,
                                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
                                )
                            },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = EspressoPrimary,
                                selectedLabelColor = CreamBackground,
                                containerColor = Color.White,
                                labelColor = EspressoPrimary
                            )
                        )
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                // Product Items Grid
                val filteredItems = uiState.menuItems.filter { item ->
                    val matchesCategory = uiState.selectedCategory == "All" || item.category == uiState.selectedCategory
                    val matchesSearch = uiState.searchQuery.isBlank() ||
                            item.name.contains(uiState.searchQuery, ignoreCase = true) ||
                            (item.description?.contains(uiState.searchQuery, ignoreCase = true) == true)
                    matchesCategory && matchesSearch
                }

                if (filteredItems.isEmpty()) {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(32.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "No products found",
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            fontSize = 16.sp
                        )
                    }
                } else {
                    LazyVerticalGrid(
                        columns = GridCells.Adaptive(minSize = 160.dp),
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                        modifier = Modifier.fillMaxSize()
                    ) {
                        items(filteredItems) { menuItem ->
                            ProductCard(
                                menuItem = menuItem,
                                onClick = { viewModel.addToCart(menuItem) }
                            )
                        }
                    }
                }
            }

            // Right Cart Panel
            Surface(
                color = Color.White,
                tonalElevation = 4.dp,
                modifier = Modifier
                    .weight(0.35f)
                    .fillMaxHeight()
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(16.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Current Order",
                            fontWeight = FontWeight.Bold,
                            fontSize = 18.sp,
                            color = EspressoPrimary
                        )
                        if (uiState.cartItems.isNotEmpty()) {
                            TextButton(onClick = { viewModel.clearCart() }) {
                                Text("Clear", color = MaterialTheme.colorScheme.error, fontSize = 12.sp)
                            }
                        }
                    }

                    HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))

                    if (uiState.cartItems.isEmpty()) {
                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .fillMaxWidth(),
                            contentAlignment = Alignment.Center
                        ) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Icon(
                                    imageVector = Icons.Default.ShoppingCart,
                                    contentDescription = null,
                                    tint = MaterialTheme.colorScheme.outline,
                                    modifier = Modifier.size(48.dp)
                                )
                                Spacer(modifier = Modifier.height(8.dp))
                                Text(
                                    text = "Cart is empty",
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    fontSize = 14.sp
                                )
                            }
                        }
                    } else {
                        LazyColumn(
                            modifier = Modifier.weight(1f),
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            items(uiState.cartItems, key = { it.id }) { cartItem ->
                                CartItemRow(
                                    cartItem = cartItem,
                                    onQtyChange = { delta -> viewModel.updateCartItemQty(cartItem.id, delta) }
                                )
                            }
                        }
                    }

                    // Cart Summary & Checkout Button
                    if (uiState.cartItems.isNotEmpty()) {
                        val subtotal = viewModel.getSubtotal()
                        val total = viewModel.getTotalAmount()

                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(top = 12.dp)
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text("Subtotal:", fontSize = 14.sp)
                                Text("₱${String.format("%.2f", subtotal)}", fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                            }

                            Spacer(modifier = Modifier.height(4.dp))

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text("Total:", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = EspressoPrimary)
                                Text("₱${String.format("%.2f", total)}", fontSize = 20.sp, fontWeight = FontWeight.Bold, color = EspressoPrimary)
                            }

                            Spacer(modifier = Modifier.height(16.dp))

                            Button(
                                onClick = { showCheckoutDialog = true },
                                colors = ButtonDefaults.buttonColors(containerColor = EspressoPrimary, contentColor = CreamBackground),
                                shape = RoundedCornerShape(10.dp),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(52.dp)
                            ) {
                                Text("Proceed to Payment", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                            }
                        }
                    }
                }
            }
        }
    }

    if (showCheckoutDialog) {
        CheckoutDialog(
            viewModel = viewModel,
            sessionUser = sessionUser,
            onDismiss = { showCheckoutDialog = false },
            onOrderCompleted = { orderId ->
                showCheckoutDialog = false
                viewModel.clearCart()
                onOrderCreated(orderId)
            }
        )
    }
}

@Composable
fun ProductCard(
    menuItem: MenuItemEntity,
    onClick: () -> Unit
) {
    Card(
        onClick = onClick,
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        shape = RoundedCornerShape(12.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Surface(
                    color = CaramelAccent.copy(alpha = 0.15f),
                    shape = RoundedCornerShape(6.dp)
                ) {
                    Text(
                        text = menuItem.category,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        color = EspressoPrimary,
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                    )
                }
                Text(
                    text = "Stock: ${menuItem.stock}",
                    fontSize = 11.sp,
                    color = if (menuItem.stock > 0) MaterialTheme.colorScheme.onSurfaceVariant else MaterialTheme.colorScheme.error
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = menuItem.name,
                fontWeight = FontWeight.Bold,
                fontSize = 14.sp,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
                color = EspressoPrimary
            )

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = "₱${String.format("%.2f", menuItem.price)}",
                fontWeight = FontWeight.Bold,
                fontSize = 16.sp,
                color = CaramelAccent
            )
        }
    }
}

@Composable
fun CartItemRow(
    cartItem: CartItem,
    onQtyChange: (Int) -> Unit
) {
    Surface(
        color = CreamBackground,
        shape = RoundedCornerShape(8.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier
                .padding(10.dp)
                .fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = cartItem.menuItem.name,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 13.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    color = EspressoPrimary
                )
                Text(
                    text = "₱${String.format("%.2f", cartItem.unitPrice)}",
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            Row(verticalAlignment = Alignment.CenterVertically) {
                IconButton(
                    onClick = { onQtyChange(-1) },
                    modifier = Modifier.size(28.dp)
                ) {
                    Icon(Icons.Default.Remove, contentDescription = "Decrease", tint = EspressoPrimary)
                }

                Text(
                    text = "${cartItem.quantity}",
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp,
                    modifier = Modifier.padding(horizontal = 6.dp)
                )

                IconButton(
                    onClick = { onQtyChange(1) },
                    modifier = Modifier.size(28.dp)
                ) {
                    Icon(Icons.Default.Add, contentDescription = "Increase", tint = EspressoPrimary)
                }
            }
        }
    }
}
