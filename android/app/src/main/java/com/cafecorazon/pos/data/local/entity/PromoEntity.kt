package com.cafecorazon.pos.data.local.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "promos",
    indices = [
        Index(value = ["promo_name"], unique = true),
        Index(value = ["status"]),
        Index(value = ["start_date", "end_date"])
    ]
)
data class PromoEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,

    @ColumnInfo(name = "promo_name")
    val promoName: String,

    @ColumnInfo(name = "description")
    val description: String? = null,

    @ColumnInfo(name = "discount_type")
    val discountType: String = "percentage", // "percentage" or "fixed"

    @ColumnInfo(name = "discount_value")
    val discountValue: Double,

    @ColumnInfo(name = "eligible_customer")
    val eligibleCustomer: String = "Everyone",

    @ColumnInfo(name = "start_date")
    val startDate: String, // YYYY-MM-DD

    @ColumnInfo(name = "end_date")
    val endDate: String, // YYYY-MM-DD

    @ColumnInfo(name = "start_time")
    val startTime: String? = null, // HH:mm:ss

    @ColumnInfo(name = "end_time")
    val endTime: String? = null, // HH:mm:ss

    @ColumnInfo(name = "status")
    val status: String = "Active", // "Active", "Inactive", "Expired", "Scheduled", "Disabled"

    @ColumnInfo(name = "created_by")
    val createdBy: Long? = null,

    @ColumnInfo(name = "created_by_name")
    val createdByName: String? = null,

    @ColumnInfo(name = "created_at")
    val createdAt: Long = System.currentTimeMillis(),

    @ColumnInfo(name = "updated_at")
    val updatedAt: Long = System.currentTimeMillis()
)
