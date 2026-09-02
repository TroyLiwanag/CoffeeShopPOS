package com.cafecorazon.pos.ui.components

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.cafecorazon.pos.R
import com.cafecorazon.pos.security.SessionUser
import com.cafecorazon.pos.ui.navigation.Screen
import com.cafecorazon.pos.ui.theme.CaramelAccent
import com.cafecorazon.pos.ui.theme.CreamBackground
import com.cafecorazon.pos.ui.theme.EspressoPrimary
import kotlinx.coroutines.launch

data class NavigationMenuItem(
    val screen: Screen,
    val icon: ImageVector,
    val requiredPermission: (SessionUser) -> Boolean
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AppShell(
    title: String,
    currentScreenRoute: String,
    sessionUser: SessionUser?,
    onNavigate: (Screen) -> Unit,
    onLogout: () -> Unit,
    content: @Composable (PaddingValues) -> Unit
) {
    val drawerState = rememberDrawerState(initialValue = DrawerValue.Closed)
    val scope = rememberCoroutineScope()

    val menuItems = listOf(
        NavigationMenuItem(Screen.Pos, Icons.Default.PointOfSale) { true },
        NavigationMenuItem(Screen.Orders, Icons.Default.ReceiptLong) { u -> u.role == "admin" || u.permissions.canManageOrders },
        NavigationMenuItem(Screen.Menu, Icons.Default.RestaurantMenu) { u -> u.role == "admin" || u.permissions.canManageMenu },
        NavigationMenuItem(Screen.Products, Icons.Default.Category) { u -> u.role == "admin" || u.permissions.canManageProducts },
        NavigationMenuItem(Screen.Inventory, Icons.Default.Inventory2) { u -> u.role == "admin" || u.permissions.canManageInventory },
        NavigationMenuItem(Screen.Promos, Icons.Default.LocalOffer) { u -> u.role == "admin" || u.permissions.canManagePromos },
        NavigationMenuItem(Screen.Reports, Icons.Default.Assessment) { u -> u.role == "admin" || u.permissions.canManageReports || u.permissions.canManageSales },
        NavigationMenuItem(Screen.Attendance, Icons.Default.AccessTime) { u -> u.role == "admin" || u.permissions.canManageAttendance || u.permissions.canManageSales },
        NavigationMenuItem(Screen.Payroll, Icons.Default.Payments) { u -> u.role == "admin" },
        NavigationMenuItem(Screen.Employees, Icons.Default.People) { u -> u.role == "admin" || u.permissions.canManageUsers },
        NavigationMenuItem(Screen.VerificationCodes, Icons.Default.Key) { u -> u.role == "admin" || u.permissions.canManageVerificationCodes },
        NavigationMenuItem(Screen.AuditLogs, Icons.Default.History) { u -> u.role == "admin" },
        NavigationMenuItem(Screen.Settings, Icons.Default.Settings) { u -> u.role == "admin" || u.permissions.canManageSettings }
    )

    ModalNavigationDrawer(
        drawerState = drawerState,
        drawerContent = {
            ModalDrawerSheet(
                drawerContainerColor = EspressoPrimary,
                drawerContentColor = CreamBackground,
                modifier = Modifier.width(300.dp)
            ) {
                // Sidebar Header with Logo
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(EspressoPrimary)
                        .padding(20.dp)
                ) {
                    Column {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Image(
                                painter = painterResource(id = R.drawable.logo),
                                contentDescription = "Café Corazon Logo",
                                modifier = Modifier
                                    .size(54.dp)
                                    .background(Color.White, shape = MaterialTheme.shapes.small)
                                    .padding(2.dp)
                            )
                            Spacer(modifier = Modifier.width(12.dp))
                            Column {
                                Text(
                                    text = "Café Corazon",
                                    fontSize = 22.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = CaramelAccent
                                )
                                Text(
                                    text = "Kapeng may Puso 🖤",
                                    fontSize = 11.sp,
                                    color = CreamBackground.copy(alpha = 0.8f)
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(16.dp))

                        if (sessionUser != null) {
                            Surface(
                                shape = MaterialTheme.shapes.small,
                                color = CaramelAccent.copy(alpha = 0.2f),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Row(
                                    modifier = Modifier.padding(8.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.AccountCircle,
                                        contentDescription = null,
                                        tint = CaramelAccent,
                                        modifier = Modifier.size(32.dp)
                                    )
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Column {
                                        Text(
                                            text = sessionUser.fullname,
                                            fontWeight = FontWeight.SemiBold,
                                            fontSize = 14.sp,
                                            color = CreamBackground
                                        )
                                        Text(
                                            text = sessionUser.role.uppercase(),
                                            fontSize = 11.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = CaramelAccent
                                        )
                                    }
                                }
                            }
                        }
                    }
                }

                HorizontalDivider(color = CaramelAccent.copy(alpha = 0.3f))

                // Scrollable Navigation Items List
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .verticalScroll(rememberScrollState())
                        .padding(horizontal = 12.dp, vertical = 8.dp)
                ) {
                    menuItems.forEach { item ->
                        val isAllowed = sessionUser != null && item.requiredPermission(sessionUser)
                        if (isAllowed) {
                            val isSelected = currentScreenRoute == item.screen.route
                            NavigationDrawerItem(
                                label = { Text(item.screen.title, fontSize = 14.sp) },
                                selected = isSelected,
                                onClick = {
                                    scope.launch { drawerState.close() }
                                    onNavigate(item.screen)
                                },
                                icon = { Icon(item.icon, contentDescription = null) },
                                colors = NavigationDrawerItemDefaults.colors(
                                    selectedContainerColor = CaramelAccent,
                                    selectedIconColor = EspressoPrimary,
                                    selectedTextColor = EspressoPrimary,
                                    unselectedContainerColor = Color.Transparent,
                                    unselectedIconColor = CreamBackground.copy(alpha = 0.9f),
                                    unselectedTextColor = CreamBackground.copy(alpha = 0.9f)
                                ),
                                modifier = Modifier.padding(vertical = 2.dp)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    // Logout Button
                    Surface(
                        onClick = onLogout,
                        color = Color.Red.copy(alpha = 0.15f),
                        shape = MaterialTheme.shapes.medium,
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 12.dp)
                    ) {
                        Row(
                            modifier = Modifier.padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.Logout,
                                contentDescription = "Logout",
                                tint = Color(0xFFFF6B6B)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = "Logout",
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFFFF6B6B)
                            )
                        }
                    }
                }
            }
        }
    ) {
        Scaffold(
            topBar = {
                TopAppBar(
                    title = {
                        Text(
                            text = title,
                            fontWeight = FontWeight.Bold,
                            color = CreamBackground
                        )
                    },
                    navigationIcon = {
                        IconButton(onClick = { scope.launch { drawerState.open() } }) {
                            Icon(
                                imageVector = Icons.Default.Menu,
                                contentDescription = "Open Menu",
                                tint = CreamBackground
                            )
                        }
                    },
                    actions = {
                        if (sessionUser != null) {
                            Surface(
                                shape = MaterialTheme.shapes.extraSmall,
                                color = CaramelAccent,
                                modifier = Modifier.padding(end = 12.dp)
                            ) {
                                Text(
                                    text = sessionUser.role.uppercase(),
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 11.sp,
                                    color = EspressoPrimary,
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                )
                            }
                        }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(
                        containerColor = EspressoPrimary,
                        titleContentColor = CreamBackground
                    )
                )
            },
            content = content
        )
    }
}
