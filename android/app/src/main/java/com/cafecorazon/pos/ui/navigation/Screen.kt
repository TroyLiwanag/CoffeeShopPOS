package com.cafecorazon.pos.ui.navigation

sealed class Screen(val route: String, val title: String) {
    object Login : Screen("login", "Login")
    object ForgotPassword : Screen("forgot_password", "Reset Password")
    object Pos : Screen("pos", "POS Terminal")
    object Checkout : Screen("checkout", "Checkout")
    object Receipt : Screen("receipt/{orderId}", "Receipt") {
        fun createRoute(orderId: Long) = "receipt/$orderId"
    }
    object Menu : Screen("menu", "Menu Items")
    object Products : Screen("products", "Products")
    object Inventory : Screen("inventory", "Inventory Stock")
    object Orders : Screen("orders", "Order History")
    object Reports : Screen("reports", "Sales Reports")
    object Promos : Screen("promos", "Promotions")
    object Employees : Screen("employees", "Employees & Roles")
    object Attendance : Screen("attendance", "Attendance & Shift")
    object Payroll : Screen("payroll", "Payroll")
    object VerificationCodes : Screen("verification_codes", "Verification Codes")
    object AuditLogs : Screen("audit_logs", "Audit Logs")
    object Settings : Screen("settings", "Shop Settings")
}
