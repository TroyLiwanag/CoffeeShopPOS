package com.cafecorazon.pos.data.local.dao

import androidx.room.*
import com.cafecorazon.pos.data.local.entity.PromoHistoryEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface PromoHistoryDao {
    @Query("SELECT * FROM promo_history ORDER BY created_at DESC LIMIT 500")
    fun getAllHistory(): Flow<List<PromoHistoryEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertHistory(entry: PromoHistoryEntity): Long

    @Query("SELECT COUNT(*) FROM promo_history WHERE action = 'Promo Used' AND strftime('%Y-%m-%d', datetime(created_at / 1000, 'unixepoch', 'localtime')) = :todayDate")
    suspend fun getUsageTodayCount(todayDate: String): Int
}
