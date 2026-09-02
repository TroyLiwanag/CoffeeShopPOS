package com.cafecorazon.pos.data.repository

import com.cafecorazon.pos.data.local.dao.AuditLogDao
import com.cafecorazon.pos.data.local.dao.PasswordResetCodeDao
import com.cafecorazon.pos.data.local.dao.ResetCodeWithUser
import com.cafecorazon.pos.data.local.dao.UserDao
import com.cafecorazon.pos.data.local.entity.AuditLogEntity
import com.cafecorazon.pos.data.local.entity.PasswordResetCodeEntity
import com.cafecorazon.pos.security.PasswordHasher
import kotlinx.coroutines.flow.Flow
import java.util.Random

class VerificationCodeRepository(
    private val passwordResetCodeDao: PasswordResetCodeDao,
    private val userDao: UserDao,
    private val auditLogDao: AuditLogDao
) {

    val codesFlow: Flow<List<ResetCodeWithUser>> = passwordResetCodeDao.getAllCodesWithUser()

    suspend fun generateCode(
        staffEmail: String,
        actorUserId: Long?,
        actorUserName: String?
    ): Result<String> {
        val cleanEmail = staffEmail.trim()
        val user = userDao.getUserByEmail(cleanEmail)
            ?: return Result.failure(Exception("Staff member with email '$cleanEmail' not found."))

        val now = System.currentTimeMillis()

        // 1. Invalidate any existing active reset codes for this staff user
        passwordResetCodeDao.invalidatePreviousCodesForUser(user.id, now)

        // 2. Generate secure 6-digit verification code with 10-minute validity
        val code = String.format("%06d", Random().nextInt(1000000))
        val codeHash = PasswordHasher.hashPassword(code)
        val expiresAt = now + (10 * 60 * 1000) // 10 minutes validity

        passwordResetCodeDao.insertCode(
            PasswordResetCodeEntity(
                userId = user.id,
                codeHash = codeHash,
                codePlain = code,
                expiresAt = expiresAt,
                attemptsCount = 0,
                generatedBy = actorUserId,
                generatedByName = actorUserName,
                createdAt = now
            )
        )

        auditLogDao.insertLog(
            AuditLogEntity(
                userId = actorUserId,
                userName = actorUserName,
                actionType = "Generate Verification Code",
                moduleName = "Verification Codes",
                description = "Generated 10-minute reset code for ${user.fullname} (${user.email})"
            )
        )

        return Result.success(code)
    }

    suspend fun markUsed(id: Long, actorUserId: Long?, actorUserName: String?): Result<Boolean> {
        val codeEntity = passwordResetCodeDao.getCodeById(id)
            ?: return Result.failure(Exception("Verification code not found"))

        passwordResetCodeDao.markCodeAsUsed(id, System.currentTimeMillis())

        auditLogDao.insertLog(
            AuditLogEntity(
                userId = actorUserId,
                userName = actorUserName,
                actionType = "Mark Code Used",
                moduleName = "Verification Codes",
                description = "Marked verification code #$id as used"
            )
        )

        return Result.success(true)
    }

    suspend fun deleteCode(id: Long, actorUserId: Long?, actorUserName: String?): Result<Boolean> {
        passwordResetCodeDao.deleteCode(id)

        auditLogDao.insertLog(
            AuditLogEntity(
                userId = actorUserId,
                userName = actorUserName,
                actionType = "Delete Verification Code",
                moduleName = "Verification Codes",
                description = "Deleted verification code #$id"
            )
        )

        return Result.success(true)
    }

    suspend fun deleteCodesBulk(ids: List<Long>, actorUserId: Long?, actorUserName: String?): Result<Boolean> {
        if (ids.isEmpty()) return Result.success(true)
        passwordResetCodeDao.deleteCodesBulk(ids)

        auditLogDao.insertLog(
            AuditLogEntity(
                userId = actorUserId,
                userName = actorUserName,
                actionType = "Delete Selected Codes",
                moduleName = "Verification Codes",
                description = "Deleted ${ids.size} selected verification code(s)"
            )
        )

        return Result.success(true)
    }

    suspend fun deleteAllCodes(actorUserId: Long?, actorUserName: String?): Result<Boolean> {
        passwordResetCodeDao.deleteAllCodes()

        auditLogDao.insertLog(
            AuditLogEntity(
                userId = actorUserId,
                userName = actorUserName,
                actionType = "Delete All Codes",
                moduleName = "Verification Codes",
                description = "Deleted all verification codes from the database"
            )
        )

        return Result.success(true)
    }
}
