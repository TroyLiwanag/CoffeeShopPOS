package com.cafecorazon.pos.data.local.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "password_reset_codes",
    foreignKeys = [
        ForeignKey(
            entity = UserEntity::class,
            parentColumns = ["id"],
            childColumns = ["user_id"],
            onDelete = ForeignKey.CASCADE
        )
    ],
    indices = [
        Index(value = ["user_id"]),
        Index(value = ["expires_at"])
    ]
)
data class PasswordResetCodeEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,

    @ColumnInfo(name = "user_id")
    val userId: Long,

    @ColumnInfo(name = "code_hash")
    val codeHash: String,

    @ColumnInfo(name = "code_plain")
    val codePlain: String? = null,

    @ColumnInfo(name = "expires_at")
    val expiresAt: Long,

    @ColumnInfo(name = "used_at")
    val usedAt: Long? = null,

    @ColumnInfo(name = "attempts_count")
    val attemptsCount: Int = 0,

    @ColumnInfo(name = "generated_by")
    val generatedBy: Long? = null,

    @ColumnInfo(name = "generated_by_name")
    val generatedByName: String? = null,

    @ColumnInfo(name = "created_at")
    val createdAt: Long = System.currentTimeMillis()
)
