package com.cafecorazon.pos.data.local.seed

import com.cafecorazon.pos.data.local.AppDatabase
import com.cafecorazon.pos.data.local.entity.*
import com.cafecorazon.pos.security.PasswordHasher
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

object DatabaseInitializer {

    private val DEFAULT_PRODUCTS = listOf(
        ProductEntity(name = "V60 Single Origin (Hot)", category = "Coffee", price = 49.0, stock = 100, status = "available"),
        ProductEntity(name = "Americano (Hot)", category = "Coffee", price = 65.0, stock = 100, status = "available"),
        ProductEntity(name = "Cappuccino (Hot)", category = "Coffee", price = 85.0, stock = 100, status = "available"),
        ProductEntity(name = "Cafe Latte (Hot)", category = "Coffee", price = 85.0, stock = 100, status = "available"),
        ProductEntity(name = "Iced Choco", category = "Non-Coffee", price = 65.0, stock = 100, status = "available"),
        ProductEntity(name = "Cappuccino Frappe", category = "Iced Blended", price = 120.0, stock = 100, status = "available"),
        ProductEntity(name = "Fries (Plain/Cheese/Sour Cream/BBQ)", category = "Snacks", price = 90.0, stock = 50, status = "available"),
        ProductEntity(name = "Shang-silog (Shanghai, Rice, Egg)", category = "Rice Meals", price = 70.0, stock = 30, status = "available")
    )

    private val DEFAULT_MENU_ITEMS = listOf(
        MenuItemEntity(name = "V60 Single Origin (Hot)", category = "Coffee", price = 49.0, stock = 100, icon = "coffee", status = "available"),
        MenuItemEntity(name = "Americano (Hot)", category = "Coffee", price = 65.0, stock = 100, icon = "coffee", status = "available"),
        MenuItemEntity(name = "Cappuccino (Hot)", category = "Coffee", price = 85.0, stock = 100, icon = "coffee", status = "available"),
        MenuItemEntity(name = "Cafe Latte (Hot)", category = "Coffee", price = 85.0, stock = 100, icon = "coffee", status = "available"),
        MenuItemEntity(name = "Cafe Mocha (Hot)", category = "Coffee", price = 95.0, stock = 100, icon = "coffee", status = "available"),
        MenuItemEntity(name = "Caramel Macchiato (Hot)", category = "Coffee", price = 95.0, stock = 100, icon = "coffee", status = "available"),
        MenuItemEntity(name = "Americano (Iced)", category = "Coffee", price = 65.0, stock = 100, icon = "coffee", status = "available"),
        MenuItemEntity(name = "Cafe Latte (Iced)", category = "Coffee", price = 65.0, stock = 100, icon = "coffee", status = "available"),
        MenuItemEntity(name = "Iced Choco", category = "Non-Coffee", price = 65.0, stock = 100, icon = "drinks", status = "available"),
        MenuItemEntity(name = "Oreo Milk", category = "Non-Coffee", price = 65.0, stock = 100, icon = "drinks", status = "available"),
        MenuItemEntity(name = "Strawberry Latte", category = "Non-Coffee", price = 65.0, stock = 100, icon = "drinks", status = "available"),
        MenuItemEntity(name = "Cappuccino Frappe", category = "Iced Blended", price = 120.0, stock = 100, icon = "coffee", status = "available"),
        MenuItemEntity(name = "Java Chip Frappe", category = "Iced Blended", price = 120.0, stock = 100, icon = "coffee", status = "available"),
        MenuItemEntity(name = "Fries (Plain/Cheese/Sour Cream/BBQ)", category = "Snacks", price = 90.0, stock = 50, icon = "snacks", status = "available"),
        MenuItemEntity(name = "Nachos", category = "Snacks", price = 95.0, stock = 50, icon = "snacks", status = "available"),
        MenuItemEntity(name = "Shang-silog (Shanghai, Rice, Egg)", category = "Rice Meals", price = 70.0, stock = 30, icon = "rice", status = "available"),
        MenuItemEntity(name = "Tapa-silog", category = "Rice Meals", price = 85.0, stock = 30, icon = "rice", status = "available"),
        MenuItemEntity(name = "Longsilog", category = "Rice Meals", price = 80.0, stock = 30, icon = "rice", status = "available")
    )

    suspend fun seed(database: AppDatabase) = withContext(Dispatchers.IO) {
        val userDao = database.userDao()
        val permDao = database.employeePermissionDao()
        val productDao = database.productDao()
        val menuDao = database.menuItemDao()
        val promoDao = database.promoDao()
        val historyDao = database.promoHistoryDao()
        val settingsDao = database.shopSettingsDao()

        // 1. Seed Default Admin User if not exists
        val existingAdmin = userDao.getUserByEmail("admin@gmail.com")
        if (existingAdmin == null) {
            val hashedPassword = PasswordHasher.hashPassword("admin123")
            val adminId = userDao.insertUser(
                UserEntity(
                    fullname = "Administrator",
                    email = "admin@gmail.com",
                    passwordHash = hashedPassword,
                    role = "admin",
                    status = "active"
                )
            )
            permDao.insertPermission(
                EmployeePermissionEntity(
                    userId = adminId,
                    canViewDashboard = true,
                    canManageUsers = true,
                    canManageProducts = true,
                    canManageMenu = true,
                    canManageOrders = true,
                    canManageInventory = true,
                    canManageSales = true,
                    canManageAttendance = true,
                    canManageReports = true,
                    canManageSettings = true,
                    canExportReports = true,
                    canManagePromos = true,
                    canManageVerificationCodes = true
                )
            )
        }

        // 2. Seed Default Products
        val currentAdmin = userDao.getUserByEmail("admin@gmail.com")
        val adminId = currentAdmin?.id ?: 1L

        if (productDao.getProductsList().isEmpty()) {
            DEFAULT_PRODUCTS.forEach { p ->
                productDao.insertProduct(p)
            }
        }

        // 3. Seed Default Menu Items
        if (menuDao.getMenuItemsList().isEmpty()) {
            DEFAULT_MENU_ITEMS.forEach { m ->
                menuDao.insertMenuItem(m)
            }
        }

        // 4. Seed Default Promo if not exists
        val existingPromo = promoDao.getPromoByName("Happy Father's Day")
        if (existingPromo == null) {
            val promoId = promoDao.insertPromo(
                PromoEntity(
                    promoName = "Happy Father's Day",
                    description = "Celebrate Father's Day with a special discount.",
                    discountType = "percentage",
                    discountValue = 20.0,
                    eligibleCustomer = "Fathers",
                    startDate = "2026-06-01",
                    endDate = "2026-12-31",
                    startTime = "08:00:00",
                    endTime = "22:00:00",
                    status = "Active",
                    createdBy = adminId,
                    createdByName = "Administrator"
                )
            )
            historyDao.insertHistory(
                PromoHistoryEntity(
                    promoId = promoId,
                    promoName = "Happy Father's Day",
                    action = "Promo Created",
                    performedBy = adminId,
                    performedByName = "Administrator"
                )
            )
        }

        // 5. Seed Default Shop Settings if not exists
        val settings = settingsDao.getSettings()
        if (settings == null) {
            val defaultSettingsJson = """
                {
                    "shopName": "Café Corazon",
                    "businessStyle": "Kapeng may Puso 🖤",
                    "receiptFooter": "Thank you for supporting Local!!!",
                    "vatRate": 12.0,
                    "seniorDiscountRate": 20.0,
                    "pwdDiscountRate": 20.0,
                    "defaultHourlyRate": 80.0
                }
            """.trimIndent()
            settingsDao.insertOrUpdateSettings(
                ShopSettingsEntity(
                    id = 1,
                    settingsJson = defaultSettingsJson,
                    updatedBy = adminId
                )
            )
        }
    }
}
