package com.cafecorazon.pos.data.local.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "menu_items",
    indices = [
        Index(value = ["category"]),
        Index(value = ["status"]),
        Index(value = ["name"])
    ]
)
data class MenuItemEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,

    @ColumnInfo(name = "name")
    val name: String,

    @ColumnInfo(name = "category")
    val category: String,

    @ColumnInfo(name = "description")
    val description: String? = null,

    @ColumnInfo(name = "price")
    val price: Double,

    @ColumnInfo(name = "image")
    val image: String? = null,

    @ColumnInfo(name = "icon")
    val icon: String? = "coffee",

    @ColumnInfo(name = "stock")
    val stock: Int = 0,

    @ColumnInfo(name = "status")
    val status: String = "available", // "available" or "unavailable"

    @ColumnInfo(name = "created_at")
    val createdAt: Long = System.currentTimeMillis(),

    @ColumnInfo(name = "updated_at")
    val updatedAt: Long = System.currentTimeMillis()
)
