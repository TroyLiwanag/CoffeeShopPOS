package com.cafecorazon.pos.data.repository

import com.cafecorazon.pos.data.local.dao.AuditLogDao
import com.cafecorazon.pos.data.local.dao.PasswordResetCodeDao
import com.cafecorazon.pos.data.local.dao.UserDao
import com.cafecorazon.pos.data.local.entity.AuditLogEntity
import com.cafecorazon.pos.data.local.entity.PasswordResetCodeEntity
import com.cafecorazon.pos.security.PasswordHasher
import com.cafecorazon.pos.security.SessionUser
import com.cafecorazon.pos.security.UserSessionManager
import kotlinx.coroutines.flow.Flow

class AuthRepository(
    private val userDao: UserDao,
    private val passwordResetCodeDao: PasswordResetCodeDao,
    private val auditLogDao: AuditLogDao,
    private val sessionManager: UserSessionManager
) {

    val currentSession: Flow<SessionUser?> = sessionManager.currentSessionFlow

    suspend fun login(email: String, password: String): Result<SessionUser> {
        val cleanEmail = email.trim().lowercase()
        if (cleanEmail.isBlank() || password.isBlank()) {
            return Result.failure(Exception("Email and password are required."))
        }

        val userWithPerms = userDao.getUserWithPermissionsByEmail(cleanEmail)
            ?: run {
                auditLogDao.insertLog(
                    AuditLogEntity(
                        userId = null,
                        userName = cleanEmail,
                        actionType = "Failed Login",
                        moduleName = "Auth",
                        description = "Failed login attempt for $cleanEmail — user account not found"
                    )
                )
                return Result.failure(Exception("Account with email '$cleanEmail' not found."))
            }

        val user = userWithPerms.user
        if (user.status != "active") {
            auditLogDao.insertLog(
                AuditLogEntity(
                    userId = user.id,
                    userName = user.fullname,
                    actionType = "Failed Login",
                    moduleName = "Auth",
                    description = "Failed login attempt for ${user.email} — account is inactive"
                )
            )
            return Result.failure(Exception("Account '${user.email}' is inactive. Please contact Admin."))
        }

        val isValid = PasswordHasher.verifyPassword(password, user.passwordHash)
        if (!isValid) {
            auditLogDao.insertLog(
                AuditLogEntity(
                    userId = user.id,
                    userName = user.fullname,
                    actionType = "Failed Login",
                    moduleName = "Auth",
                    description = "Invalid password entered for $cleanEmail"
                )
            )
            return Result.failure(Exception("Incorrect password for '$cleanEmail'. Please check your password or request a reset code from Admin."))
        }

        sessionManager.saveSession(user, userWithPerms.permissions)

        auditLogDao.insertLog(
            AuditLogEntity(
                userId = user.id,
                userName = user.fullname,
                actionType = "Login",
                moduleName = "Auth",
                description = "User logged in (${user.role})"
            )
        )

        val sessionUser = SessionUser(
            id = user.id,
            fullname = user.fullname,
            email = user.email,
            role = user.role,
            status = user.status,
            permissions = userWithPerms.permissions ?: com.cafecorazon.pos.data.local.entity.EmployeePermissionEntity(userId = user.id)
        )
        return Result.success(sessionUser)
    }

    suspend fun logout(currentUserId: Long?, currentUserName: String?) {
        auditLogDao.insertLog(
            AuditLogEntity(
                userId = currentUserId,
                userName = currentUserName ?: "Unknown",
                actionType = "Logout",
                moduleName = "Auth",
                description = "User logged out"
            )
        )
        sessionManager.clearSession()
    }

    /**
     * Offline Password Reset Verification & Execution:
     * Staff enters: email, 6-digit code (from Admin), new password, and confirm new password.
     */
    suspend fun resetPasswordWithCode(
        email: String,
        code: String,
        newPassword: String,
        confirmPassword: String
    ): Result<Boolean> {
        val cleanEmail = email.trim().lowercase()
        val cleanCode = code.trim()

        if (cleanEmail.isBlank()) return Result.failure(Exception("Staff email address is required."))
        if (cleanCode.isBlank()) return Result.failure(Exception("6-digit verification code is required."))
        if (newPassword.isBlank()) return Result.failure(Exception("New password is required."))
        if (newPassword.length < 6) return Result.failure(Exception("Password must be at least 6 characters long."))
        if (newPassword != confirmPassword) return Result.failure(Exception("New password and Confirm password do not match."))

        val user = userDao.getUserByEmail(cleanEmail)
            ?: return Result.failure(Exception("No staff account found with email '$cleanEmail'."))

        val now = System.currentTimeMillis()
        val activeCode = passwordResetCodeDao.getActiveCodeForUser(user.id, now)
            ?: return Result.failure(Exception("No active reset code found for this account or code has expired. Please request a new code from the Admin."))

        if (activeCode.attemptsCount >= 5) {
            passwordResetCodeDao.markCodeAsUsed(activeCode.id, now)
            return Result.failure(Exception("Maximum verification attempts (5/5) exceeded. Please ask Admin to generate a new reset code."))
        }

        val matches = (activeCode.codePlain == cleanCode) || PasswordHasher.verifyPassword(cleanCode, activeCode.codeHash)
        if (!matches) {
            passwordResetCodeDao.incrementAttempts(activeCode.id)
            val remaining = 4 - activeCode.attemptsCount
            return Result.failure(Exception("Incorrect verification code. $remaining attempt(s) remaining."))
        }

        // Apply new password hash
        val newPasswordHash = PasswordHasher.hashPassword(newPassword)
        userDao.updateUser(user.copy(passwordHash = newPasswordHash, updatedAt = now))

        // Immediately mark code as used so it cannot be reused
        passwordResetCodeDao.markCodeAsUsed(activeCode.id, now)

        auditLogDao.insertLog(
            AuditLogEntity(
                userId = user.id,
                userName = user.fullname,
                actionType = "Password Reset",
                moduleName = "Auth",
                description = "Staff password successfully reset for ${user.fullname} (${user.email})"
            )
        )

        return Result.success(true)
    }
}
