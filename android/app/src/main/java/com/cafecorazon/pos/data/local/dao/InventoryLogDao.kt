package com.cafecorazon.pos.data.local.dao

import androidx.room.*
import com.cafecorazon.pos.data.local.entity.InventoryLogEntity
import com.cafecorazon.pos.data.local.entity.ProductEntity
import com.cafecorazon.pos.data.local.entity.UserEntity
import kotlinx.coroutines.flow.Flow

data class InventoryLogWithDetails(
    @Embedded val log: InventoryLogEntity,
    @Relation(
        parentColumn = "product_id",
        entityColumn = "id"
    )
    val product: ProductEntity?,
    @Relation(
        parentColumn = "performed_by",
        entityColumn = "id"
    )
    val performedByUser: UserEntity?
)

@Dao
interface InventoryLogDao {
    @Transaction
    @Query("SELECT * FROM inventory_logs ORDER BY created_at DESC LIMIT 200")
    fun getAllLogsWithDetails(): Flow<List<InventoryLogWithDetails>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertLog(log: InventoryLogEntity): Long
}
