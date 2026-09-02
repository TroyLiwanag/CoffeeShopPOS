package com.cafecorazon.pos

import android.app.Application
import com.cafecorazon.pos.data.local.AppDatabase
import com.cafecorazon.pos.data.local.seed.DatabaseInitializer
import com.cafecorazon.pos.data.repository.*
import com.cafecorazon.pos.security.UserSessionManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class CafeCorazonApplication : Application() {

    lateinit var database: AppDatabase
        private set

    lateinit var sessionManager: UserSessionManager
        private set

    lateinit var authRepository: AuthRepository
        private set

    lateinit var userRepository: UserRepository
        private set

    lateinit var menuRepository: MenuRepository
        private set

    lateinit var productRepository: ProductRepository
        private set

    lateinit var orderRepository: OrderRepository
        private set

    lateinit var inventoryRepository: InventoryRepository
        private set

    lateinit var promoRepository: PromoRepository
        private set

    lateinit var reportRepository: ReportRepository
        private set

    lateinit var attendanceRepository: AttendanceRepository
        private set

    lateinit var payrollRepository: PayrollRepository
        private set

    lateinit var verificationCodeRepository: VerificationCodeRepository
        private set

    lateinit var auditLogRepository: AuditLogRepository
        private set

    lateinit var settingsRepository: SettingsRepository
        private set

    lateinit var backupRepository: BackupRepository
        private set

    override fun onCreate() {
        super.onCreate()

        database = AppDatabase.getInstance(this)
        sessionManager = UserSessionManager(this)

        authRepository = AuthRepository(
            userDao = database.userDao(),
            passwordResetCodeDao = database.passwordResetCodeDao(),
            auditLogDao = database.auditLogDao(),
            sessionManager = sessionManager
        )

        userRepository = UserRepository(
            userDao = database.userDao(),
            permissionDao = database.employeePermissionDao(),
            auditLogDao = database.auditLogDao()
        )

        menuRepository = MenuRepository(
            menuItemDao = database.menuItemDao(),
            auditLogDao = database.auditLogDao()
        )

        productRepository = ProductRepository(
            productDao = database.productDao(),
            auditLogDao = database.auditLogDao()
        )

        orderRepository = OrderRepository(
            orderDao = database.orderDao(),
            orderItemDao = database.orderItemDao(),
            menuItemDao = database.menuItemDao(),
            productDao = database.productDao(),
            inventoryLogDao = database.inventoryLogDao(),
            promoHistoryDao = database.promoHistoryDao(),
            auditLogDao = database.auditLogDao()
        )

        inventoryRepository = InventoryRepository(
            productDao = database.productDao(),
            inventoryLogDao = database.inventoryLogDao(),
            auditLogDao = database.auditLogDao()
        )

        promoRepository = PromoRepository(
            promoDao = database.promoDao(),
            promoHistoryDao = database.promoHistoryDao(),
            auditLogDao = database.auditLogDao()
        )

        reportRepository = ReportRepository(
            orderDao = database.orderDao(),
            salesReportDao = database.salesReportDao(),
            auditLogDao = database.auditLogDao()
        )

        attendanceRepository = AttendanceRepository(
            attendanceDao = database.attendanceRecordDao(),
            auditLogDao = database.auditLogDao()
        )

        payrollRepository = PayrollRepository(
            userDao = database.userDao(),
            payrollRateDao = database.payrollRateDao(),
            attendanceDao = database.attendanceRecordDao(),
            auditLogDao = database.auditLogDao()
        )

        verificationCodeRepository = VerificationCodeRepository(
            passwordResetCodeDao = database.passwordResetCodeDao(),
            userDao = database.userDao(),
            auditLogDao = database.auditLogDao()
        )

        auditLogRepository = AuditLogRepository(
            auditLogDao = database.auditLogDao()
        )

        settingsRepository = SettingsRepository(
            shopSettingsDao = database.shopSettingsDao(),
            auditLogDao = database.auditLogDao()
        )

        backupRepository = BackupRepository(
            context = this,
            database = database,
            auditLogDao = database.auditLogDao()
        )

        // Seed initial admin, products, menu items and settings
        CoroutineScope(Dispatchers.IO).launch {
            try {
                DatabaseInitializer.seed(database)
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }
}
