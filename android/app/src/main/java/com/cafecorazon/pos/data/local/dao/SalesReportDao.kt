package com.cafecorazon.pos.data.local.dao

import androidx.room.*
import com.cafecorazon.pos.data.local.entity.SalesReportEntity
import com.cafecorazon.pos.data.local.entity.UserEntity
import kotlinx.coroutines.flow.Flow

data class SalesReportWithUser(
    @Embedded val report: SalesReportEntity,
    @Relation(
        parentColumn = "generated_by",
        entityColumn = "id"
    )
    val generatedByUser: UserEntity?
)

@Dao
interface SalesReportDao {
    @Transaction
    @Query("SELECT * FROM sales_reports ORDER BY created_at DESC")
    fun getAllReports(): Flow<List<SalesReportWithUser>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertReport(report: SalesReportEntity): Long
}
