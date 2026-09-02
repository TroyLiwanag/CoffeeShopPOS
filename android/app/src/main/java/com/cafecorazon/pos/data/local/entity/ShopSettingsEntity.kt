package com.cafecorazon.pos.data.local.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "shop_settings",
    foreignKeys = [
        ForeignKey(
            entity = UserEntity::class,
            parentColumns = ["id"],
            childColumns = ["updated_by"],
            onDelete = ForeignKey.SET_NULL
        )
    ],
    indices = [Index(value = ["updated_by"])]
)
data class ShopSettingsEntity(
    @PrimaryKey
    val id: Int = 1,

    @ColumnInfo(name = "settings_json")
    val settingsJson: String,

    @ColumnInfo(name = "updated_by")
    val updatedBy: Long? = null,

    @ColumnInfo(name = "updated_at")
    val updatedAt: Long = System.currentTimeMillis()
)
