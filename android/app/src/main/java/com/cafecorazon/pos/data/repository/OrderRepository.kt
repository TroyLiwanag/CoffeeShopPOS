package com.cafecorazon.pos.data.repository

import com.cafecorazon.pos.data.local.dao.*
import com.cafecorazon.pos.data.local.entity.*
import kotlinx.coroutines.flow.Flow

data class OrderCartItemInput(
    val menuItemId: Long? = null,
    val productId: Long? = null,
    val quantity: Int,
    val price: Double
)

class OrderRepository(
    private val orderDao: OrderDao,
    private val orderItemDao: OrderItemDao,
    private val menuItemDao: MenuItemDao,
    private val productDao: ProductDao,
    private val inventoryLogDao: InventoryLogDao,
    private val promoHistoryDao: PromoHistoryDao,
    private val auditLogDao: AuditLogDao
) {

    val ordersWithDetailsFlow: Flow<List<OrderWithDetails>> = orderDao.getAllOrdersWithDetails()

    suspend fun getOrderById(id: Long): OrderWithDetails? = orderDao.getOrderWithDetailsById(id)

    suspend fun createOrder(
        customerName: String?,
        totalAmount: Double,
        paymentMethod: String?,
        orderStatus: String?,
        items: List<OrderCartItemInput>,
        promoId: Long?,
        promoName: String?,
        promoDiscountAmount: Double,
        actorUserId: Long?,
        actorUserName: String?
    ): Result<Long> {
        if (items.isEmpty()) {
            return Result.failure(Exception("Cart is empty"))
        }

        val status = orderStatus ?: "completed"
        val orderEntity = OrderEntity(
            customerName = customerName?.takeIf { it.isNotBlank() }?.trim(),
            totalAmount = totalAmount,
            paymentMethod = paymentMethod ?: "Cash",
            orderStatus = status,
            promoId = promoId,
            promoName = promoName,
            promoDiscountAmount = promoDiscountAmount,
            createdBy = actorUserId,
            createdAt = System.currentTimeMillis()
        )

        val orderId = orderDao.insertOrder(orderEntity)

        items.forEach { item ->
            val menuItemId = item.menuItemId
            val productId = item.productId

            if (menuItemId != null && menuItemId > 0) {
                orderItemDao.insertOrderItem(
                    OrderItemEntity(
                        orderId = orderId,
                        menuItemId = menuItemId,
                        quantity = item.quantity,
                        price = item.price
                    )
                )
                menuItemDao.deductStock(menuItemId, item.quantity)
            } else if (productId != null && productId > 0) {
                orderItemDao.insertOrderItem(
                    OrderItemEntity(
                        orderId = orderId,
                        productId = productId,
                        quantity = item.quantity,
                        price = item.price
                    )
                )
                productDao.deductStock(productId, item.quantity)
                inventoryLogDao.insertLog(
                    InventoryLogEntity(
                        productId = productId,
                        actionType = "sale",
                        quantity = -item.quantity,
                        performedBy = actorUserId,
                        createdAt = System.currentTimeMillis()
                    )
                )
            }
        }

        if (!promoName.isNullOrBlank()) {
            promoHistoryDao.insertHistory(
                PromoHistoryEntity(
                    promoId = promoId,
                    promoName = promoName!!,
                    action = "Promo Used",
                    performedBy = actorUserId,
                    performedByName = actorUserName,
                    orderId = orderId,
                    createdAt = System.currentTimeMillis()
                )
            )
        }

        val year = java.util.Calendar.getInstance().get(java.util.Calendar.YEAR)
        val formattedOrderNo = "$year - " + String.format("%05d", orderId % 100000)

        val promoDesc = if (!promoName.isNull_or_blank()) " [Promo: $promoName (-₱${String.format("%.2f", promoDiscountAmount)})]" else ""
        auditLogDao.insertLog(
            AuditLogEntity(
                userId = actorUserId,
                userName = actorUserName,
                actionType = "Create Order",
                moduleName = "Orders",
                description = "Order #$formattedOrderNo — ₱${String.format("%.2f", totalAmount)} (${paymentMethod ?: "Cash"})$promoDesc — $status"
            )
        )

        return Result.success(orderId)
    }

    suspend fun updateOrderStatus(
        orderId: Long,
        newStatus: String,
        actorUserId: Long?,
        actorUserName: String?
    ): Result<Boolean> {
        val existing = orderDao.getOrderWithDetailsById(orderId)
            ?: return Result.failure(Exception("Order not found"))

        val prevStatus = existing.order.orderStatus
        orderDao.updateStatus(orderId, newStatus)

        val actionType = when (newStatus) {
            "completed" -> "Complete Order"
            "cancelled" -> "Cancel Order"
            else -> "Update Order"
        }

        val year = java.util.Calendar.getInstance().get(java.util.Calendar.YEAR)
        val formattedOrderNo = "$year - " + String.format("%05d", orderId % 100000)

        auditLogDao.insertLog(
            AuditLogEntity(
                userId = actorUserId,
                userName = actorUserName,
                actionType = actionType,
                moduleName = "Orders",
                description = "Order #$formattedOrderNo status: $prevStatus → $newStatus"
            )
        )

        return Result.success(true)
    }

    private fun String?.isNull_or_blank(): Boolean {
        return this == null || this.trim().isEmpty()
    }
}
