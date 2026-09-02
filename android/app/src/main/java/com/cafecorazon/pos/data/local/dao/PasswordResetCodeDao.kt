package com.cafecorazon.pos.data.local.dao

import androidx.room.*
import com.cafecorazon.pos.data.local.entity.PasswordResetCodeEntity
import com.cafecorazon.pos.data.local.entity.UserEntity
import kotlinx.coroutines.flow.Flow

data class ResetCodeWithUser(
    @Embedded val code: PasswordResetCodeEntity,
    @Relation(
        parentColumn = "user_id",
        entityColumn = "id"
    )
    val user: UserEntity?
)

@Dao
interface PasswordResetCodeDao {
    @Transaction
    @Query("SELECT * FROM password_reset_codes ORDER BY created_at DESC")
    fun getAllCodesWithUser(): Flow<List<ResetCodeWithUser>>

    @Query("SELECT * FROM password_reset_codes WHERE id = :id LIMIT 1")
    suspend fun getCodeById(id: Long): PasswordResetCodeEntity?

    @Query("""
        SELECT * FROM password_reset_codes
        WHERE user_id = :userId
        AND used_at IS NULL
        AND expires_at > :nowTimestamp
        ORDER BY created_at DESC LIMIT 1
    """)
    suspend fun getActiveCodeForUser(userId: Long, nowTimestamp: Long): PasswordResetCodeEntity?

    @Query("UPDATE password_reset_codes SET used_at = :nowTimestamp WHERE user_id = :userId AND used_at IS NULL")
    suspend fun invalidatePreviousCodesForUser(userId: Long, nowTimestamp: Long)

    @Query("UPDATE password_reset_codes SET attempts_count = attempts_count + 1 WHERE id = :id")
    suspend fun incrementAttempts(id: Long)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertCode(code: PasswordResetCodeEntity): Long

    @Update
    suspend fun updateCode(code: PasswordResetCodeEntity)

    @Query("UPDATE password_reset_codes SET used_at = :usedAtTimestamp WHERE id = :id")
    suspend fun markCodeAsUsed(id: Long, usedAtTimestamp: Long)

    @Query("DELETE FROM password_reset_codes WHERE id = :id")
    suspend fun deleteCode(id: Long)

    @Query("DELETE FROM password_reset_codes WHERE id IN (:ids)")
    suspend fun deleteCodesBulk(ids: List<Long>)

    @Query("DELETE FROM password_reset_codes")
    suspend fun deleteAllCodes()
}
