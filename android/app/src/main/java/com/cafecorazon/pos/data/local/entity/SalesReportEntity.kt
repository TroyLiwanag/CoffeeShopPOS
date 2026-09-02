package com.cafecorazon.pos.data.local.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "sales_reports",
    foreignKeys = [
        ForeignKey(
            entity = UserEntity::class,
            parentColumns = ["id"],
            childColumns = ["generated_by"],
            onDelete = ForeignKey.SET_NULL
        )
    ],
    indices = [Index(value = ["generated_by"])]
)
data class SalesReportEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,

    @ColumnInfo(name = "total_sales")
    val totalSales: Double,

    @ColumnInfo(name = "total_orders")
    val totalOrders: Int,

    @ColumnInfo(name = "generated_by")
    val generatedBy: Long? = null,

    @ColumnInfo(name = "created_at")
    val createdAt: Long = System.currentTimeMillis()
)
