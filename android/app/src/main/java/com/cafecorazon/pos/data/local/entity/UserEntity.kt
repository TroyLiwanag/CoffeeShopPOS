package com.cafecorazon.pos.data.local.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "users")
data class UserEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,

    @ColumnInfo(name = "fullname")
    val fullname: String,

    @ColumnInfo(name = "email")
    val email: String,

    @ColumnInfo(name = "password")
    val passwordHash: String,

    @ColumnInfo(name = "role")
    val role: String = "staff", // "admin" or "staff"

    @ColumnInfo(name = "status")
    val status: String = "active", // "active" or "inactive"

    @ColumnInfo(name = "profile_image")
    val profileImage: String? = null,

    @ColumnInfo(name = "created_at")
    val createdAt: Long = System.currentTimeMillis(),

    @ColumnInfo(name = "updated_at")
    val updatedAt: Long = System.currentTimeMillis()
)
