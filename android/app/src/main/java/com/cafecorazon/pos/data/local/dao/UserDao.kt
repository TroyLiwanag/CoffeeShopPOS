package com.cafecorazon.pos.data.local.dao

import androidx.room.*
import com.cafecorazon.pos.data.local.entity.EmployeePermissionEntity
import com.cafecorazon.pos.data.local.entity.UserEntity
import kotlinx.coroutines.flow.Flow

data class UserWithPermissions(
    @Embedded val user: UserEntity,
    @Relation(
        parentColumn = "id",
        entityColumn = "user_id"
    )
    val permissions: EmployeePermissionEntity?
)

@Dao
interface UserDao {
    @Query("SELECT * FROM users ORDER BY created_at DESC")
    fun getAllUsers(): Flow<List<UserEntity>>

    @Transaction
    @Query("SELECT * FROM users ORDER BY created_at DESC")
    fun getAllUsersWithPermissions(): Flow<List<UserWithPermissions>>

    @Query("SELECT * FROM users WHERE LOWER(email) = LOWER(:email) LIMIT 1")
    suspend fun getUserByEmail(email: String): UserEntity?

    @Transaction
    @Query("SELECT * FROM users WHERE LOWER(email) = LOWER(:email) LIMIT 1")
    suspend fun getUserWithPermissionsByEmail(email: String): UserWithPermissions?

    @Transaction
    @Query("SELECT * FROM users WHERE id = :userId LIMIT 1")
    suspend fun getUserWithPermissionsById(userId: Long): UserWithPermissions?

    @Query("SELECT * FROM users WHERE id = :id LIMIT 1")
    suspend fun getUserById(id: Long): UserEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertUser(user: UserEntity): Long

    @Update
    suspend fun updateUser(user: UserEntity)

    @Query("DELETE FROM users WHERE id = :id")
    suspend fun deleteUser(id: Long)
}
