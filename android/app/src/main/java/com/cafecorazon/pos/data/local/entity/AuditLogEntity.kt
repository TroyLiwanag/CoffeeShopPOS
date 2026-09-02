package com.cafecorazon.pos.data.local.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "audit_logs",
    foreignKeys = [
        ForeignKey(
            entity = UserEntity::class,
            parentColumns = ["id"],
            childColumns = ["user_id"],
            onDelete = ForeignKey.SET_NULL
        )
    ],
    indices = [
        Index(value = ["user_id"]),
        Index(value = ["action_type"]),
        Index(value = ["module_name"]),
        Index(value = ["created_at"])
    ]
)
data class AuditLogEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,

    @ColumnInfo(name = "user_id")
    val userId: Long? = null,

    @ColumnInfo(name = "user_name")
    val userName: String? = null,

    @ColumnInfo(name = "action_type")
    val actionType: String,

    @ColumnInfo(name = "module_name")
    val moduleName: String,

    @ColumnInfo(name = "description")
    val description: String? = null,

    @ColumnInfo(name = "ip_address")
    val ipAddress: String? = "127.0.0.1 (Local Android)",

    @ColumnInfo(name = "device_info")
    val deviceInfo: String? = "Native Android Device",

    @ColumnInfo(name = "created_at")
    val createdAt: Long = System.currentTimeMillis()
)
