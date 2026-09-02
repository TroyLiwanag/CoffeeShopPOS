package com.cafecorazon.pos.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import com.cafecorazon.pos.data.local.dao.*
import com.cafecorazon.pos.data.local.entity.*

@Database(
    entities = [
        UserEntity::class,
        EmployeePermissionEntity::class,
        MenuItemEntity::class,
        ProductEntity::class,
        OrderEntity::class,
        OrderItemEntity::class,
        InventoryLogEntity::class,
        SalesReportEntity::class,
        PayrollRateEntity::class,
        AttendanceRecordEntity::class,
        PromoEntity::class,
        PromoHistoryEntity::class,
        PasswordResetCodeEntity::class,
        ShopSettingsEntity::class,
        AuditLogEntity::class
    ],
    version = 2,
    exportSchema = false
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun userDao(): UserDao
    abstract fun employeePermissionDao(): EmployeePermissionDao
    abstract fun menuItemDao(): MenuItemDao
    abstract fun productDao(): ProductDao
    abstract fun orderDao(): OrderDao
    abstract fun orderItemDao(): OrderItemDao
    abstract fun inventoryLogDao(): InventoryLogDao
    abstract fun salesReportDao(): SalesReportDao
    abstract fun payrollRateDao(): PayrollRateDao
    abstract fun attendanceRecordDao(): AttendanceRecordDao
    abstract fun promoDao(): PromoDao
    abstract fun promoHistoryDao(): PromoHistoryDao
    abstract fun passwordResetCodeDao(): PasswordResetCodeDao
    abstract fun shopSettingsDao(): ShopSettingsDao
    abstract fun auditLogDao(): AuditLogDao

    companion object {
        @Volatile
        private var INSTANCE: AppDatabase? = null

        fun getInstance(context: Context): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "cafecorazon.db"
                )
                .fallbackToDestructiveMigration()
                .build()
                INSTANCE = instance
                instance
            }
        }
    }
}
