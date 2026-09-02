package com.cafecorazon.pos.data.local.dao

import androidx.room.*
import com.cafecorazon.pos.data.local.entity.AuditLogEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface AuditLogDao {
    @Query("""
        SELECT * FROM audit_logs
        WHERE (:search IS NULL OR user_name LIKE '%' || :search || '%' OR action_type LIKE '%' || :search || '%' OR module_name LIKE '%' || :search || '%' OR description LIKE '%' || :search || '%')
        AND (:module IS NULL OR module_name = :module)
        AND (:userId IS NULL OR user_id = :userId)
        AND (:actionType IS NULL OR action_type = :actionType)
        AND (:sinceTimestamp IS NULL OR created_at >= :sinceTimestamp)
        ORDER BY created_at DESC
        LIMIT :limit OFFSET :offset
    """)
    suspend fun getFilteredLogs(
        search: String?,
        module: String?,
        userId: Long?,
        actionType: String?,
        sinceTimestamp: Long?,
        limit: Int,
        offset: Int
    ): List<AuditLogEntity>

    @Query("""
        SELECT COUNT(*) FROM audit_logs
        WHERE (:search IS NULL OR user_name LIKE '%' || :search || '%' OR action_type LIKE '%' || :search || '%' OR module_name LIKE '%' || :search || '%' OR description LIKE '%' || :search || '%')
        AND (:module IS NULL OR module_name = :module)
        AND (:userId IS NULL OR user_id = :userId)
        AND (:actionType IS NULL OR action_type = :actionType)
        AND (:sinceTimestamp IS NULL OR created_at >= :sinceTimestamp)
    """)
    suspend fun getFilteredLogsCount(
        search: String?,
        module: String?,
        userId: Long?,
        actionType: String?,
        sinceTimestamp: Long?
    ): Int

    @Query("SELECT DISTINCT module_name FROM audit_logs ORDER BY module_name ASC")
    suspend fun getDistinctModules(): List<String>

    @Query("SELECT DISTINCT user_id, user_name FROM audit_logs WHERE user_name IS NOT NULL ORDER BY user_name ASC")
    suspend fun getDistinctUsers(): List<AuditUserTuple>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertLog(log: AuditLogEntity): Long

    @Query("DELETE FROM audit_logs WHERE id = :id")
    suspend fun deleteLog(id: Long)

    @Query("DELETE FROM audit_logs WHERE id IN (:ids)")
    suspend fun deleteLogsBulk(ids: List<Long>)
}

data class AuditUserTuple(
    @ColumnInfo(name = "user_id") val userId: Long?,
    @ColumnInfo(name = "user_name") val userName: String?
)
