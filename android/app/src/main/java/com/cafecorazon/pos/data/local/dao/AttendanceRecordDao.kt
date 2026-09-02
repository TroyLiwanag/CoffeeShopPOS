package com.cafecorazon.pos.data.local.dao

import androidx.room.*
import com.cafecorazon.pos.data.local.entity.AttendanceRecordEntity
import com.cafecorazon.pos.data.local.entity.UserEntity
import kotlinx.coroutines.flow.Flow

data class AttendanceWithUser(
    @Embedded val record: AttendanceRecordEntity,
    @Relation(
        parentColumn = "user_id",
        entityColumn = "id"
    )
    val user: UserEntity?
)

data class HoursSummaryResult(
    val userId: Long,
    val regularHours: Double,
    val overtimeHours: Double,
    val daysRecorded: Int
)

@Dao
interface AttendanceRecordDao {
    @Transaction
    @Query("""
        SELECT * FROM attendance_records
        WHERE (:userId IS NULL OR user_id = :userId)
        ORDER BY work_date DESC, created_at DESC
    """)
    fun getAttendanceRecords(userId: Long?): Flow<List<AttendanceWithUser>>

    @Transaction
    @Query("SELECT * FROM attendance_records WHERE user_id = :userId AND work_date = :workDate LIMIT 1")
    suspend fun getRecordForUserAndDate(userId: Long, workDate: String): AttendanceWithUser?

    @Transaction
    @Query("SELECT * FROM attendance_records WHERE id = :id LIMIT 1")
    suspend fun getRecordById(id: Long): AttendanceWithUser?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertRecord(record: AttendanceRecordEntity): Long

    @Update
    suspend fun updateRecord(record: AttendanceRecordEntity)

    @Query("DELETE FROM attendance_records WHERE id = :id")
    suspend fun deleteRecord(id: Long)

    @Query("""
        SELECT
            user_id AS userId,
            COALESCE(SUM(hours_worked), 0.0) AS regularHours,
            COALESCE(SUM(overtime_hours), 0.0) AS overtimeHours,
            COUNT(*) AS daysRecorded
        FROM attendance_records
        WHERE work_date >= :sinceWorkDate
        GROUP BY user_id
    """)
    suspend fun getHoursSummarySinceDate(sinceWorkDate: String): List<HoursSummaryResult>
}
