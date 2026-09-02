package com.cafecorazon.pos.data.local.dao

import androidx.room.*
import com.cafecorazon.pos.data.local.entity.EmployeePermissionEntity

@Dao
interface EmployeePermissionDao {
    @Query("SELECT * FROM employee_permissions WHERE user_id = :userId LIMIT 1")
    suspend fun getPermissionsByUserId(userId: Long): EmployeePermissionEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertPermission(permission: EmployeePermissionEntity): Long

    @Update
    suspend fun updatePermission(permission: EmployeePermissionEntity)

    @Query("DELETE FROM employee_permissions WHERE user_id = :userId")
    suspend fun deleteByUserId(userId: Long)
}
