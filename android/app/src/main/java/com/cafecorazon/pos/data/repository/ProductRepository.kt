package com.cafecorazon.pos.data.repository

import com.cafecorazon.pos.data.local.dao.AuditLogDao
import com.cafecorazon.pos.data.local.dao.ProductDao
import com.cafecorazon.pos.data.local.entity.AuditLogEntity
import com.cafecorazon.pos.data.local.entity.ProductEntity
import kotlinx.coroutines.flow.Flow

class ProductRepository(
    private val productDao: ProductDao,
    private val auditLogDao: AuditLogDao
) {

    val productsFlow: Flow<List<ProductEntity>> = productDao.getAllProducts()

    suspend fun getProductById(id: Long): ProductEntity? = productDao.getProductById(id)

    suspend fun createProduct(
        product: ProductEntity,
        actorUserId: Long?,
        actorUserName: String?
    ): Result<Long> {
        val id = productDao.insertProduct(
            product.copy(
                createdAt = System.currentTimeMillis(),
                updatedAt = System.currentTimeMillis()
            )
        )

        auditLogDao.insertLog(
            AuditLogEntity(
                userId = actorUserId,
                userName = actorUserName,
                actionType = "Add Product",
                moduleName = "Products",
                description = "Added product \"${product.name}\" (₱${String.format("%.2f", product.price)})"
            )
        )

        return Result.success(id)
    }

    suspend fun updateProduct(
        product: ProductEntity,
        actorUserId: Long?,
        actorUserName: String?
    ): Result<Boolean> {
        productDao.updateProduct(product.copy(updatedAt = System.currentTimeMillis()))

        auditLogDao.insertLog(
            AuditLogEntity(
                userId = actorUserId,
                userName = actorUserName,
                actionType = "Update Product",
                moduleName = "Products",
                description = "Updated product #${product.id} \"${product.name}\""
            )
        )

        return Result.success(true)
    }

    suspend fun toggleProductStatus(id: Long, actorUserId: Long?, actorUserName: String?): Result<Boolean> {
        val existing = productDao.getProductById(id)
            ?: return Result.failure(Exception("Product not found"))

        val newStatus = if (existing.status == "available") "unavailable" else "available"
        productDao.updateStatus(id, newStatus)

        auditLogDao.insertLog(
            AuditLogEntity(
                userId = actorUserId,
                userName = actorUserName,
                actionType = "Toggle Product Status",
                moduleName = "Products",
                description = "Changed status of \"${existing.name}\" to $newStatus"
            )
        )

        return Result.success(true)
    }

    suspend fun deleteProduct(id: Long, actorUserId: Long?, actorUserName: String?): Result<Boolean> {
        val existing = productDao.getProductById(id)
        productDao.deleteProduct(id)

        auditLogDao.insertLog(
            AuditLogEntity(
                userId = actorUserId,
                userName = actorUserName,
                actionType = "Delete Product",
                moduleName = "Products",
                description = "Deleted product \"${existing?.name ?: id}\""
            )
        )

        return Result.success(true)
    }
}
