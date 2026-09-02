package com.cafecorazon.pos.data.local.dao

import androidx.room.*
import com.cafecorazon.pos.data.local.entity.MenuItemEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface MenuItemDao {
    @Query("SELECT * FROM menu_items ORDER BY category ASC, name ASC")
    fun getAllMenuItems(): Flow<List<MenuItemEntity>>

    @Query("SELECT * FROM menu_items")
    suspend fun getMenuItemsList(): List<MenuItemEntity>

    @Query("SELECT DISTINCT category FROM menu_items ORDER BY category ASC")
    fun getCategories(): Flow<List<String>>

    @Query("SELECT * FROM menu_items WHERE id = :id LIMIT 1")
    suspend fun getMenuItemById(id: Long): MenuItemEntity?

    @Query("""
        SELECT * FROM menu_items
        WHERE (:category IS NULL OR category = :category)
        AND (:search IS NULL OR name LIKE '%' || :search || '%' OR description LIKE '%' || :search || '%')
        ORDER BY category ASC, name ASC
    """)
    fun searchMenuItems(category: String?, search: String?): Flow<List<MenuItemEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertMenuItem(item: MenuItemEntity): Long

    @Update
    suspend fun updateMenuItem(item: MenuItemEntity)

    @Query("UPDATE menu_items SET stock = MAX(0, stock - :qty) WHERE id = :id")
    suspend fun deductStock(id: Long, qty: Int)

    @Query("UPDATE menu_items SET status = :status WHERE id = :id")
    suspend fun updateStatus(id: Long, status: String)

    @Query("DELETE FROM menu_items WHERE id = :id")
    suspend fun deleteMenuItem(id: Long)
}
