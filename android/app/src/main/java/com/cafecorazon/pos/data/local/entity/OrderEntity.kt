package com.cafecorazon.pos.data.local.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "orders",
    foreignKeys = [
        ForeignKey(
            entity = UserEntity::class,
            parentColumns = ["id"],
            childColumns = ["created_by"],
            onDelete = ForeignKey.SET_NULL
        )
    ],
    indices = [Index(value = ["created_by"])]
)
data class OrderEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,

    @ColumnInfo(name = "customer_name")
    val customerName: String? = null,

    @ColumnInfo(name = "total_amount")
    val totalAmount: Double,

    @ColumnInfo(name = "payment_method")
    val paymentMethod: String = "Cash",

    @ColumnInfo(name = "order_status")
    val orderStatus: String = "completed", // "pending", "completed", "cancelled"

    @ColumnInfo(name = "promo_id")
    val promoId: Long? = null,

    @ColumnInfo(name = "promo_name")
    val promoName: String? = null,

    @ColumnInfo(name = "promo_discount_amount")
    val promoDiscountAmount: Double = 0.0,

    @ColumnInfo(name = "created_by")
    val createdBy: Long? = null,

    @ColumnInfo(name = "created_at")
    val createdAt: Long = System.currentTimeMillis()
)
