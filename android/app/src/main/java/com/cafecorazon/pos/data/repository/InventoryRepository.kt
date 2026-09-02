package com.cafecorazon.pos.data.repository

import com.cafecorazon.pos.data.local.dao.AuditLogDao
import com.cafecorazon.pos.data.local.dao.InventoryLogDao
import com.cafecorazon.pos.data.local.dao.InventoryLogWithDetails
import com.cafecorazon.pos.data.local.dao.ProductDao
import com.cafecorazon.pos.data.local.entity.AuditLogEntity
import com.cafecorazon.pos.data.local.entity.InventoryLogEntity
import kotlinx.coroutines.flow.Flow

class InventoryRepository(
    private val productDao: ProductDao,
    private val inventoryLogDao: InventoryLogDao,
    private val auditLogDao: AuditLogDao
) {

    val logsFlow: Flow<List<InventoryLogWithDetails>> = inventoryLogDao.getAllLogsWithDetails()

    suspend fun adjustStock(
        productId: Long,
        quantity: Int,
        actionType: String?,
        reason: String? = null,
        supplierRef: String? = null,
        actorUserId: Long?,
        actorUserName: String?
    ): Result<Boolean> {
        if (quantity == 0) {
            return Result.failure(Exception("Quantity cannot be zero"))
        }

        val product = productDao.getProductById(productId)
            ?: return Result.failure(Exception("Product not found"))

        val type = actionType ?: "adjustment"

        // Validation for stock reduction
        if (quantity < 0 && (product.stock + quantity) < 0) {
            return Result.failure(Exception("Insufficient stock. Current stock is ${product.stock}"))
        }

        productDao.adjustStock(productId, quantity)

        inventoryLogDao.insertLog(
            InventoryLogEntity(
                productId = productId,
                actionType = type,
                quantity = quantity,
                performedBy = actorUserId,
                createdAt = System.currentTimeMillis()
            )
        )

        val auditAction = when (type) {
            "stock_in" -> "Stock In"
            "stock_out" -> "Stock Out"
            "spoilage" -> "Spoilage / Waste"
            else -> "Inventory Adjustment"
        }

        val sign = if (quantity > 0) "+" else ""
        var desc = "${product.name}: $sign$quantity ($type)"
        if (!reason.isNull_or_blank()) desc += " — Reason: $reason"
        if (!supplierRef.isNull_or_blank()) desc += " (Ref: $supplierRef)"

        auditLogDao.insertLog(
            AuditLogEntity(
                userId = actorUserId,
                userName = actorUserName,
                actionType = auditAction,
                moduleName = "Inventory",
                description = desc
            )
        )

        return Result.success(true)
    }

    private fun String?.isNull_or_blank(): Boolean = this == null || this.trim().isEmpty()
}
