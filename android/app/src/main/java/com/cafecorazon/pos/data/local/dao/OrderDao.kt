package com.cafecorazon.pos.data.local.dao

import androidx.room.*
import com.cafecorazon.pos.data.local.entity.OrderEntity
import com.cafecorazon.pos.data.local.entity.OrderItemEntity
import com.cafecorazon.pos.data.local.entity.UserEntity
import kotlinx.coroutines.flow.Flow

data class OrderWithDetails(
    @Embedded val order: OrderEntity,
    @Relation(
        parentColumn = "created_by",
        entityColumn = "id"
    )
    val createdByUser: UserEntity?,
    @Relation(
        parentColumn = "id",
        entityColumn = "order_id"
    )
    val items: List<OrderItemEntity>
)

data class SalesSummaryResult(
    val totalSales: Double?,
    val totalOrders: Int?
)

data class DailySalesResult(
    val day: String,
    val sales: Double?,
    val orders: Int?
)

data class TopProductResult(
    val name: String,
    val qty: Int?,
    val revenue: Double?
)

@Dao
interface OrderDao {
    @Transaction
    @Query("SELECT * FROM orders ORDER BY created_at DESC")
    fun getAllOrdersWithDetails(): Flow<List<OrderWithDetails>>

    @Transaction
    @Query("SELECT * FROM orders WHERE id = :id LIMIT 1")
    suspend fun getOrderWithDetailsById(id: Long): OrderWithDetails?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertOrder(order: OrderEntity): Long

    @Query("UPDATE orders SET order_status = :status WHERE id = :id")
    suspend fun updateStatus(id: Long, status: String)

    @Query("""
        SELECT COALESCE(SUM(total_amount), 0.0) AS totalSales, COUNT(*) AS totalOrders
        FROM orders
        WHERE order_status = 'completed'
        AND (:sinceTimestamp IS NULL OR created_at >= :sinceTimestamp)
    """)
    suspend fun getSalesSummary(sinceTimestamp: Long?): SalesSummaryResult

    @Query("""
        SELECT
            strftime('%Y-%m-%d', datetime(created_at / 1000, 'unixepoch', 'localtime')) AS day,
            SUM(total_amount) AS sales,
            COUNT(*) AS orders
        FROM orders
        WHERE order_status = 'completed'
        AND (:sinceTimestamp IS NULL OR created_at >= :sinceTimestamp)
        GROUP BY day
        ORDER BY day DESC
        LIMIT 30
    """)
    suspend fun getDailySalesTrend(sinceTimestamp: Long?): List<DailySalesResult>

    @Query("""
        SELECT
            COALESCE(m.name, p.name, 'Unknown Item') AS name,
            SUM(oi.quantity) AS qty,
            SUM(oi.quantity * oi.price) AS revenue
        FROM order_items oi
        INNER JOIN orders o ON o.id = oi.order_id AND o.order_status = 'completed'
        LEFT JOIN menu_items m ON m.id = oi.menu_item_id
        LEFT JOIN products p ON p.id = oi.product_id
        WHERE (:sinceTimestamp IS NULL OR o.created_at >= :sinceTimestamp)
        GROUP BY oi.menu_item_id, oi.product_id, m.name, p.name
        ORDER BY revenue DESC
        LIMIT 10
    """)
    suspend fun getTopSellingProducts(sinceTimestamp: Long?): List<TopProductResult>
}
