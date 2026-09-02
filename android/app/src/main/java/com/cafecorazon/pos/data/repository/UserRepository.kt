package com.cafecorazon.pos.data.repository

import com.cafecorazon.pos.data.local.dao.AuditLogDao
import com.cafecorazon.pos.data.local.dao.EmployeePermissionDao
import com.cafecorazon.pos.data.local.dao.UserDao
import com.cafecorazon.pos.data.local.dao.UserWithPermissions
import com.cafecorazon.pos.data.local.entity.AuditLogEntity
import com.cafecorazon.pos.data.local.entity.EmployeePermissionEntity
import com.cafecorazon.pos.data.local.entity.UserEntity
import com.cafecorazon.pos.security.PasswordHasher
import kotlinx.coroutines.flow.Flow

class UserRepository(
    private val userDao: UserDao,
    private val permissionDao: EmployeePermissionDao,
    private val auditLogDao: AuditLogDao
) {

    val usersFlow: Flow<List<UserWithPermissions>> = userDao.getAllUsersWithPermissions()

    suspend fun createUser(
        user: UserEntity,
        rawPassword: String,
        permissions: EmployeePermissionEntity?,
        actorUserId: Long?,
        actorUserName: String?
    ): Result<Long> {
        val cleanEmail = user.email.trim().lowercase()
        if (cleanEmail.isBlank()) {
            return Result.failure(Exception("Email address is required"))
        }
        if (rawPassword.isBlank()) {
            return Result.failure(Exception("Password is required for new staff account"))
        }

        val existing = userDao.getUserByEmail(cleanEmail)
        if (existing != null) {
            return Result.failure(Exception("A user with email '$cleanEmail' already exists"))
        }

        val hashedPassword = PasswordHasher.hashPassword(rawPassword)
        val userId = userDao.insertUser(
            user.copy(
                fullname = user.fullname.trim(),
                email = cleanEmail,
                passwordHash = hashedPassword,
                status = if (user.status.isBlank()) "active" else user.status,
                createdAt = System.currentTimeMillis(),
                updatedAt = System.currentTimeMillis()
            )
        )

        val perms = (permissions ?: EmployeePermissionEntity(
            userId = userId,
            canViewDashboard = true,
            canManageOrders = true
        )).copy(userId = userId)

        permissionDao.insertPermission(perms)

        auditLogDao.insertLog(
            AuditLogEntity(
                userId = actorUserId,
                userName = actorUserName,
                actionType = "Add Employee",
                moduleName = "Employees",
                description = "Created employee ${user.fullname} ($cleanEmail) as ${user.role}"
            )
        )

        return Result.success(userId)
    }

    suspend fun updateUser(
        userId: Long,
        fullname: String?,
        email: String?,
        role: String?,
        status: String?,
        newPassword: String?,
        permissions: EmployeePermissionEntity?,
        actorUserId: Long?,
        actorUserName: String?
    ): Result<Boolean> {
        val current = userDao.getUserById(userId)
            ?: return Result.failure(Exception("User not found"))

        val cleanEmail = email?.trim()?.lowercase() ?: current.email

        var updatedUser = current.copy(
            fullname = fullname?.trim() ?: current.fullname,
            email = cleanEmail,
            role = role ?: current.role,
            status = status ?: current.status,
            updatedAt = System.currentTimeMillis()
        )

        if (!newPassword.isNullOrBlank()) {
            updatedUser = updatedUser.copy(passwordHash = PasswordHasher.hashPassword(newPassword))
        }

        userDao.updateUser(updatedUser)

        if (permissions != null) {
            val existingPerms = permissionDao.getPermissionsByUserId(userId)
            if (existingPerms == null) {
                permissionDao.insertPermission(permissions.copy(userId = userId))
            } else {
                permissionDao.updatePermission(permissions.copy(id = existingPerms.id, userId = userId))
            }
        }

        var desc = "Updated employee ${updatedUser.fullname}"
        if (permissions != null) desc += " — permissions changed"
        if (role != null && role != current.role) desc += " — role: ${current.role} → $role"

        auditLogDao.insertLog(
            AuditLogEntity(
                userId = actorUserId,
                userName = actorUserName,
                actionType = "Edit Employee",
                moduleName = "Employees",
                description = desc
            )
        )

        return Result.success(true)
    }

    suspend fun deleteUser(userId: Long, actorUserId: Long?, actorUserName: String?): Result<Boolean> {
        val user = userDao.getUserById(userId)
            ?: return Result.failure(Exception("User not found"))

        userDao.deleteUser(userId)

        auditLogDao.insertLog(
            AuditLogEntity(
                userId = actorUserId,
                userName = actorUserName,
                actionType = "Delete Employee",
                moduleName = "Employees",
                description = "Deleted employee ${user.fullname} (${user.email})"
            )
        )

        return Result.success(true)
    }
}
