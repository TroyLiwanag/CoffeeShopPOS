package com.cafecorazon.pos.data.local.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "promo_history",
    indices = [
        Index(value = ["promo_id"]),
        Index(value = ["order_id"]),
        Index(value = ["created_at"])
    ]
)
data class PromoHistoryEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,

    @ColumnInfo(name = "promo_id")
    val promoId: Long? = null,

    @ColumnInfo(name = "promo_name")
    val promoName: String,

    @ColumnInfo(name = "action")
    val action: String, // "Promo Created", "Promo Used", "Promo Activated", "Promo Deactivated", "Promo Deleted"

    @ColumnInfo(name = "performed_by")
    val performedBy: Long? = null,

    @ColumnInfo(name = "performed_by_name")
    val performedByName: String? = null,

    @ColumnInfo(name = "order_id")
    val orderId: Long? = null,

    @ColumnInfo(name = "created_at")
    val createdAt: Long = System.currentTimeMillis()
)
