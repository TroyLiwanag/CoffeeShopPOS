package com.cafecorazon.pos.data.local.dao

import androidx.room.*
import com.cafecorazon.pos.data.local.entity.PayrollRateEntity

@Dao
interface PayrollRateDao {
    @Query("SELECT * FROM payroll_rates WHERE user_id = :userId LIMIT 1")
    suspend fun getRateForUser(userId: Long): PayrollRateEntity?

    @Query("SELECT * FROM payroll_rates")
    suspend fun getAllRates(): List<PayrollRateEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertOrUpdateRate(rate: PayrollRateEntity): Long
}
