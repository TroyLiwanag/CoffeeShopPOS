package com.cafecorazon.pos.ui.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.cafecorazon.pos.CafeCorazonApplication
import com.cafecorazon.pos.ui.attendance.AttendanceScreen
import com.cafecorazon.pos.ui.attendance.AttendanceViewModel
import com.cafecorazon.pos.ui.audit.AuditLogsScreen
import com.cafecorazon.pos.ui.audit.AuditLogsViewModel
import com.cafecorazon.pos.ui.auth.AuthViewModel
import com.cafecorazon.pos.ui.auth.ForgotPasswordScreen
import com.cafecorazon.pos.ui.auth.LoginScreen
import com.cafecorazon.pos.ui.employees.EmployeesScreen
import com.cafecorazon.pos.ui.employees.EmployeesViewModel
import com.cafecorazon.pos.ui.inventory.InventoryScreen
import com.cafecorazon.pos.ui.menu.MenuManagementScreen
import com.cafecorazon.pos.ui.orders.OrderHistoryScreen
import com.cafecorazon.pos.ui.payroll.PayrollScreen
import com.cafecorazon.pos.ui.payroll.PayrollViewModel
import com.cafecorazon.pos.ui.pos.PosScreen
import com.cafecorazon.pos.ui.pos.PosViewModel
import com.cafecorazon.pos.ui.products.ProductsScreen
import com.cafecorazon.pos.ui.products.ProductsViewModel
import com.cafecorazon.pos.ui.promos.PromosScreen
import com.cafecorazon.pos.ui.promos.PromosViewModel
import com.cafecorazon.pos.ui.receipt.ReceiptScreen
import com.cafecorazon.pos.ui.receipt.ReceiptViewModel
import com.cafecorazon.pos.ui.reports.ReportsScreen
import com.cafecorazon.pos.ui.reports.ReportsViewModel
import com.cafecorazon.pos.ui.settings.SettingsScreen
import com.cafecorazon.pos.ui.settings.SettingsViewModel
import com.cafecorazon.pos.ui.verification.VerificationCodesScreen
import com.cafecorazon.pos.ui.verification.VerificationCodesViewModel

@Composable
fun AppNavigation(
    navController: NavHostController = rememberNavController()
) {
    val context = LocalContext.current
    val app = context.applicationContext as CafeCorazonApplication

    val authViewModel: AuthViewModel = viewModel(factory = AuthViewModel.Factory(app.authRepository))
    val sessionUser by authViewModel.currentSession.collectAsState(initial = null)

    NavHost(
        navController = navController,
        startDestination = Screen.Login.route
    ) {
        composable(Screen.Login.route) {
            LoginScreen(
                viewModel = authViewModel,
                onLoginSuccess = { navController.navigate(Screen.Pos.route) { popUpTo(Screen.Login.route) { inclusive = true } } },
                onNavigateForgotPassword = { navController.navigate(Screen.ForgotPassword.route) }
            )
        }

        composable(Screen.ForgotPassword.route) {
            ForgotPasswordScreen(
                viewModel = authViewModel,
                onNavigateBack = { navController.popBackStack() }
            )
        }

        composable(Screen.Pos.route) {
            val posViewModel: PosViewModel = viewModel(factory = PosViewModel.Factory(app.menuRepository, app.orderRepository, app.promoRepository, app.settingsRepository))
            PosScreen(
                viewModel = posViewModel,
                sessionUser = sessionUser,
                onNavigate = { screen -> navController.navigate(screen.route) },
                onLogout = { authViewModel.logout { navController.navigate(Screen.Login.route) { popUpTo(0) } } },
                onOrderCreated = { orderId -> navController.navigate(Screen.Receipt.createRoute(orderId)) }
            )
        }

        composable(
            route = Screen.Receipt.route,
            arguments = listOf(navArgument("orderId") { type = NavType.LongType })
        ) { backStackEntry ->
            val orderId = backStackEntry.arguments?.getLong("orderId") ?: 0L
            val receiptViewModel: ReceiptViewModel = viewModel(factory = ReceiptViewModel.Factory(app.orderRepository, app.settingsRepository))
            ReceiptScreen(
                orderId = orderId,
                viewModel = receiptViewModel,
                sessionUser = sessionUser,
                onNavigate = { screen -> navController.navigate(screen.route) },
                onLogout = { authViewModel.logout { navController.navigate(Screen.Login.route) { popUpTo(0) } } }
            )
        }

        composable(Screen.Menu.route) {
            MenuManagementScreen(
                menuRepository = app.menuRepository,
                sessionUser = sessionUser,
                onNavigate = { screen -> navController.navigate(screen.route) },
                onLogout = { authViewModel.logout { navController.navigate(Screen.Login.route) { popUpTo(0) } } }
            )
        }

        composable(Screen.Products.route) {
            val productsViewModel: ProductsViewModel = viewModel(factory = ProductsViewModel.Factory(app.productRepository))
            ProductsScreen(
                viewModel = productsViewModel,
                sessionUser = sessionUser,
                onNavigate = { screen -> navController.navigate(screen.route) },
                onLogout = { authViewModel.logout { navController.navigate(Screen.Login.route) { popUpTo(0) } } }
            )
        }

        composable(Screen.Inventory.route) {
            InventoryScreen(
                productRepository = app.productRepository,
                inventoryRepository = app.inventoryRepository,
                sessionUser = sessionUser,
                onNavigate = { screen -> navController.navigate(screen.route) },
                onLogout = { authViewModel.logout { navController.navigate(Screen.Login.route) { popUpTo(0) } } }
            )
        }

        composable(Screen.Orders.route) {
            OrderHistoryScreen(
                orderRepository = app.orderRepository,
                sessionUser = sessionUser,
                onNavigate = { screen -> navController.navigate(screen.route) },
                onLogout = { authViewModel.logout { navController.navigate(Screen.Login.route) { popUpTo(0) } } },
                onViewReceipt = { orderId -> navController.navigate(Screen.Receipt.createRoute(orderId)) }
            )
        }

        composable(Screen.Reports.route) {
            val reportsViewModel: ReportsViewModel = viewModel(factory = ReportsViewModel.Factory(app.reportRepository))
            ReportsScreen(
                viewModel = reportsViewModel,
                sessionUser = sessionUser,
                onNavigate = { screen -> navController.navigate(screen.route) },
                onLogout = { authViewModel.logout { navController.navigate(Screen.Login.route) { popUpTo(0) } } }
            )
        }

        composable(Screen.Promos.route) {
            val promosViewModel: PromosViewModel = viewModel(factory = PromosViewModel.Factory(app.promoRepository))
            PromosScreen(
                viewModel = promosViewModel,
                sessionUser = sessionUser,
                onNavigate = { screen -> navController.navigate(screen.route) },
                onLogout = { authViewModel.logout { navController.navigate(Screen.Login.route) { popUpTo(0) } } }
            )
        }

        composable(Screen.Employees.route) {
            val employeesViewModel: EmployeesViewModel = viewModel(factory = EmployeesViewModel.Factory(app.userRepository))
            EmployeesScreen(
                viewModel = employeesViewModel,
                sessionUser = sessionUser,
                onNavigate = { screen -> navController.navigate(screen.route) },
                onLogout = { authViewModel.logout { navController.navigate(Screen.Login.route) { popUpTo(0) } } }
            )
        }

        composable(Screen.Attendance.route) {
            val attendanceViewModel: AttendanceViewModel = viewModel(factory = AttendanceViewModel.Factory(app.attendanceRepository))
            AttendanceScreen(
                viewModel = attendanceViewModel,
                sessionUser = sessionUser,
                onNavigate = { screen -> navController.navigate(screen.route) },
                onLogout = { authViewModel.logout { navController.navigate(Screen.Login.route) { popUpTo(0) } } }
            )
        }

        composable(Screen.Payroll.route) {
            val payrollViewModel: PayrollViewModel = viewModel(factory = PayrollViewModel.Factory(app.payrollRepository))
            PayrollScreen(
                viewModel = payrollViewModel,
                sessionUser = sessionUser,
                onNavigate = { screen -> navController.navigate(screen.route) },
                onLogout = { authViewModel.logout { navController.navigate(Screen.Login.route) { popUpTo(0) } } }
            )
        }

        composable(Screen.VerificationCodes.route) {
            val verificationViewModel: VerificationCodesViewModel = viewModel(factory = VerificationCodesViewModel.Factory(app.verificationCodeRepository, app.userRepository))
            VerificationCodesScreen(
                viewModel = verificationViewModel,
                sessionUser = sessionUser,
                onNavigate = { screen -> navController.navigate(screen.route) },
                onLogout = { authViewModel.logout { navController.navigate(Screen.Login.route) { popUpTo(0) } } }
            )
        }

        composable(Screen.AuditLogs.route) {
            val auditViewModel: AuditLogsViewModel = viewModel(factory = AuditLogsViewModel.Factory(app.auditLogRepository))
            AuditLogsScreen(
                viewModel = auditViewModel,
                sessionUser = sessionUser,
                onNavigate = { screen -> navController.navigate(screen.route) },
                onLogout = { authViewModel.logout { navController.navigate(Screen.Login.route) { popUpTo(0) } } }
            )
        }

        composable(Screen.Settings.route) {
            val settingsViewModel: SettingsViewModel = viewModel(factory = SettingsViewModel.Factory(app.settingsRepository, app.backupRepository))
            SettingsScreen(
                viewModel = settingsViewModel,
                sessionUser = sessionUser,
                onNavigate = { screen -> navController.navigate(screen.route) },
                onLogout = { authViewModel.logout { navController.navigate(Screen.Login.route) { popUpTo(0) } } }
            )
        }
    }
}
