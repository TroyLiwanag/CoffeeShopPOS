package com.cafecorazon.pos.data.local.dao

import androidx.room.*
import com.cafecorazon.pos.data.local.entity.PromoEntity
import kotlinx.coroutines.flow.Flow

data class PromoWithUsageCount(
    @Embedded val promo: PromoEntity,
    val usageCount: Int
)

data class PromoStatsResult(
    val totalPromos: Int,
    val activePromos: Int,
    val expiredPromos: Int,
    val usageToday: Int
)

@Dao
interface PromoDao {
    @Query("""
        SELECT p.*,
               (SELECT COUNT(*) FROM promo_history ph WHERE ph.promo_id = p.id AND ph.action = 'Promo Used') AS usageCount
        FROM promos p
        ORDER BY p.created_at DESC
    """)
    fun getAllPromosWithUsage(): Flow<List<PromoWithUsageCount>>

    @Query("SELECT * FROM promos WHERE id = :id LIMIT 1")
    suspend fun getPromoById(id: Long): PromoEntity?

    @Query("SELECT * FROM promos WHERE promo_name = :name LIMIT 1")
    suspend fun getPromoByName(name: String): PromoEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertPromo(promo: PromoEntity): Long

    @Update
    suspend fun updatePromo(promo: PromoEntity)

    @Query("DELETE FROM promos WHERE id = :id")
    suspend fun deletePromo(id: Long)

    @Query("UPDATE promos SET status = 'Expired' WHERE end_date < :todayDate AND status IN ('Active', 'Scheduled')")
    suspend fun expireOutdatedPromos(todayDate: String)

    @Query("UPDATE promos SET status = 'Active' WHERE start_date <= :todayDate AND end_date >= :todayDate AND status = 'Scheduled'")
    suspend fun activateScheduledPromos(todayDate: String)

    @Query("SELECT COUNT(*) FROM promos")
    suspend fun getTotalPromosCount(): Int

    @Query("SELECT COUNT(*) FROM promos WHERE status = 'Active'")
    suspend fun getActivePromosCount(): Int

    @Query("SELECT COUNT(*) FROM promos WHERE status = 'Expired'")
    suspend fun getExpiredPromosCount(): Int
}
