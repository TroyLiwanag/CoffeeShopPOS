package com.cafecorazon.pos.data.local.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "attendance_records",
    foreignKeys = [
        ForeignKey(
            entity = UserEntity::class,
            parentColumns = ["id"],
            childColumns = ["user_id"],
            onDelete = ForeignKey.CASCADE
        ),
        ForeignKey(
            entity = UserEntity::class,
            parentColumns = ["id"],
            childColumns = ["recorded_by"],
            onDelete = ForeignKey.SET_NULL
        )
    ],
    indices = [
        Index(value = ["user_id", "work_date"], unique = true),
        Index(value = ["work_date"]),
        Index(value = ["recorded_by"])
    ]
)
data class AttendanceRecordEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,

    @ColumnInfo(name = "user_id")
    val userId: Long,

    @ColumnInfo(name = "work_date")
    val workDate: String, // YYYY-MM-DD

    @ColumnInfo(name = "clock_in")
    val clockIn: Long? = null,

    @ColumnInfo(name = "clock_out")
    val clockOut: Long? = null,

    @ColumnInfo(name = "hours_worked")
    val hoursWorked: Double = 0.0,

    @ColumnInfo(name = "overtime_hours")
    val overtimeHours: Double = 0.0,

    @ColumnInfo(name = "notes")
    val notes: String? = null,

    @ColumnInfo(name = "recorded_by")
    val recordedBy: Long? = null,

    @ColumnInfo(name = "created_at")
    val createdAt: Long = System.currentTimeMillis(),

    @ColumnInfo(name = "updated_at")
    val updatedAt: Long = System.currentTimeMillis()
)
