package com.cafecorazon.pos.data.repository

import com.cafecorazon.pos.data.local.dao.AuditLogDao
import com.cafecorazon.pos.data.local.dao.MenuItemDao
import com.cafecorazon.pos.data.local.entity.AuditLogEntity
import com.cafecorazon.pos.data.local.entity.MenuItemEntity
import kotlinx.coroutines.flow.Flow

class MenuRepository(
    private val menuItemDao: MenuItemDao,
    private val auditLogDao: AuditLogDao
) {

    val menuItemsFlow: Flow<List<MenuItemEntity>> = menuItemDao.getAllMenuItems()
    val categoriesFlow: Flow<List<String>> = menuItemDao.getCategories()

    fun searchMenuItems(category: String?, search: String?): Flow<List<MenuItemEntity>> {
        val catFilter = if (category.isNullOrBlank() || category == "all" || category == "All") null else category
        val searchFilter = search?.takeIf { it.isNotBlank() }?.trim()
        return menuItemDao.searchMenuItems(catFilter, searchFilter)
    }

    suspend fun getMenuItemById(id: Long): MenuItemEntity? = menuItemDao.getMenuItemById(id)

    suspend fun createMenuItem(
        item: MenuItemEntity,
        actorUserId: Long?,
        actorUserName: String?
    ): Result<Long> {
        if (item.name.isBlank() || item.category.isBlank() || item.price <= 0) {
            return Result.failure(Exception("Name, category, and price are required"))
        }

        val id = menuItemDao.insertMenuItem(
            item.copy(
                createdAt = System.currentTimeMillis(),
                updatedAt = System.currentTimeMillis()
            )
        )

        auditLogDao.insertLog(
            AuditLogEntity(
                userId = actorUserId,
                userName = actorUserName,
                actionType = "Add Menu",
                moduleName = "Menu",
                description = "Added menu item \"${item.name}\" (₱${String.format("%.2f", item.price)})"
            )
        )

        return Result.success(id)
    }

    suspend fun updateMenuItem(
        item: MenuItemEntity,
        actorUserId: Long?,
        actorUserName: String?
    ): Result<Boolean> {
        val existing = menuItemDao.getMenuItemById(item.id)
            ?: return Result.failure(Exception("Menu item not found"))

        menuItemDao.updateMenuItem(item.copy(updatedAt = System.currentTimeMillis()))

        auditLogDao.insertLog(
            AuditLogEntity(
                userId = actorUserId,
                userName = actorUserName,
                actionType = "Update Menu",
                moduleName = "Menu",
                description = "Updated menu item #${item.id} \"${item.name}\""
            )
        )

        return Result.success(true)
    }

    suspend fun toggleMenuItemStatus(id: Long, actorUserId: Long?, actorUserName: String?): Result<Boolean> {
        val item = menuItemDao.getMenuItemById(id)
            ?: return Result.failure(Exception("Menu item not found"))

        val newStatus = if (item.status == "available") "unavailable" else "available"
        menuItemDao.updateStatus(id, newStatus)

        auditLogDao.insertLog(
            AuditLogEntity(
                userId = actorUserId,
                userName = actorUserName,
                actionType = "Toggle Menu Item Status",
                moduleName = "Menu",
                description = "Changed status of \"${item.name}\" to $newStatus"
            )
        )

        return Result.success(true)
    }

    suspend fun deleteMenuItem(id: Long, actorUserId: Long?, actorUserName: String?): Result<Boolean> {
        val item = menuItemDao.getMenuItemById(id)
            ?: return Result.failure(Exception("Menu item not found"))

        menuItemDao.deleteMenuItem(id)

        auditLogDao.insertLog(
            AuditLogEntity(
                userId = actorUserId,
                userName = actorUserName,
                actionType = "Delete Menu",
                moduleName = "Menu",
                description = "Deleted menu item \"${item.name}\""
            )
        )

        return Result.success(true)
    }

    private fun String?.isNull_or_blank(): Boolean {
        return this == null || this.trim().isEmpty()
    }
}
