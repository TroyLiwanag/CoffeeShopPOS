package com.cafecorazon.pos.data.local.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "employee_permissions",
    foreignKeys = [
        ForeignKey(
            entity = UserEntity::class,
            parentColumns = ["id"],
            childColumns = ["user_id"],
            onDelete = ForeignKey.CASCADE
        )
    ],
    indices = [Index(value = ["user_id"])]
)
data class EmployeePermissionEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,

    @ColumnInfo(name = "user_id")
    val userId: Long,

    @ColumnInfo(name = "can_view_dashboard")
    val canViewDashboard: Boolean = true,

    @ColumnInfo(name = "can_manage_users")
    val canManageUsers: Boolean = false,

    @ColumnInfo(name = "can_manage_products")
    val canManageProducts: Boolean = false,

    @ColumnInfo(name = "can_manage_menu")
    val canManageMenu: Boolean = false,

    @ColumnInfo(name = "can_manage_orders")
    val canManageOrders: Boolean = false,

    @ColumnInfo(name = "can_manage_inventory")
    val canManageInventory: Boolean = false,

    @ColumnInfo(name = "can_manage_sales")
    val canManageSales: Boolean = false,

    @ColumnInfo(name = "can_manage_attendance")
    val canManageAttendance: Boolean = false,

    @ColumnInfo(name = "can_manage_reports")
    val canManageReports: Boolean = false,

    @ColumnInfo(name = "can_manage_settings")
    val canManageSettings: Boolean = false,

    @ColumnInfo(name = "can_export_reports")
    val canExportReports: Boolean = false,

    @ColumnInfo(name = "can_manage_promos")
    val canManagePromos: Boolean = false,

    @ColumnInfo(name = "can_manage_verification_codes")
    val canManageVerificationCodes: Boolean = false,

    @ColumnInfo(name = "created_at")
    val createdAt: Long = System.currentTimeMillis(),

    @ColumnInfo(name = "updated_at")
    val updatedAt: Long = System.currentTimeMillis()
)
