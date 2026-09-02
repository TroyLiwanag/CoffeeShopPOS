package com.cafecorazon.pos.data.repository

import com.cafecorazon.pos.data.local.dao.AuditLogDao
import com.cafecorazon.pos.data.local.dao.PromoDao
import com.cafecorazon.pos.data.local.dao.PromoHistoryDao
import com.cafecorazon.pos.data.local.dao.PromoWithUsageCount
import com.cafecorazon.pos.data.local.entity.AuditLogEntity
import com.cafecorazon.pos.data.local.entity.PromoEntity
import com.cafecorazon.pos.data.local.entity.PromoHistoryEntity
import kotlinx.coroutines.flow.Flow
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

data class PromoStats(
    val totalPromos: Int,
    val activePromos: Int,
    val expiredPromos: Int,
    val usageToday: Int
)

class PromoRepository(
    private val promoDao: PromoDao,
    private val promoHistoryDao: PromoHistoryDao,
    private val auditLogDao: AuditLogDao
) {

    val promosFlow: Flow<List<PromoWithUsageCount>> = promoDao.getAllPromosWithUsage()
    val historyFlow: Flow<List<PromoHistoryEntity>> = promoHistoryDao.getAllHistory()

    private fun getTodayString(): String {
        return SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
    }

    suspend fun syncPromoStatuses() {
        val today = getTodayString()
        promoDao.expireOutdatedPromos(today)
        promoDao.activateScheduledPromos(today)
    }

    suspend fun getPromoStats(): PromoStats {
        syncPromoStatuses()
        val today = getTodayString()
        val total = promoDao.getTotalPromosCount()
        val active = promoDao.getActivePromosCount()
        val expired = promoDao.getExpiredPromosCount()
        val usageToday = promoHistoryDao.getUsageTodayCount(today)
        return PromoStats(total, active, expired, usageToday)
    }

    suspend fun createPromo(
        promo: PromoEntity,
        actorUserId: Long?,
        actorUserName: String?
    ): Result<Long> {
        val name = promo.promoName.trim()
        if (name.isEmpty()) return Result.failure(Exception("Promo name is required."))
        if (promo.discountValue <= 0) return Result.failure(Exception("Discount value must be greater than zero."))
        if (promo.discountType == "percentage" && promo.discountValue > 100) return Result.failure(Exception("Percentage discount cannot exceed 100%."))
        if (promo.startDate.isBlank() || promo.endDate.isBlank()) return Result.failure(Exception("Start date and End date are required."))

        val existing = promoDao.getPromoByName(name)
        if (existing != null) return Result.failure(Exception("A promo with this name already exists."))

        val today = getTodayString()
        var initialStatus = promo.status
        if (promo.startDate > today) initialStatus = "Scheduled"
        else if (promo.endDate < today) initialStatus = "Expired"

        val promoId = promoDao.insertPromo(
            promo.copy(
                promoName = name,
                status = initialStatus,
                createdBy = actorUserId,
                createdByName = actorUserName ?: "Administrator",
                createdAt = System.currentTimeMillis(),
                updatedAt = System.currentTimeMillis()
            )
        )

        promoHistoryDao.insertHistory(
            PromoHistoryEntity(
                promoId = promoId,
                promoName = name,
                action = "Promo Created",
                performedBy = actorUserId,
                performedByName = actorUserName ?: "Administrator",
                createdAt = System.currentTimeMillis()
            )
        )

        auditLogDao.insertLog(
            AuditLogEntity(
                userId = actorUserId,
                userName = actorUserName,
                actionType = "Create Promo",
                moduleName = "Promos",
                description = "Created promo: $name"
            )
        )

        return Result.success(promoId)
    }

    suspend fun updatePromo(
        promo: PromoEntity,
        actorUserId: Long?,
        actorUserName: String?
    ): Result<Boolean> {
        val current = promoDao.getPromoById(promo.id)
            ?: return Result.failure(Exception("Promo not found."))

        val updatedName = promo.promoName.trim()
        if (updatedName != current.promoName) {
            val dup = promoDao.getPromoByName(updatedName)
            if (dup != null && dup.id != promo.id) {
                return Result.failure(Exception("Another promo with this name already exists."))
            }
        }

        promoDao.updatePromo(
            promo.copy(
                promoName = updatedName,
                updatedAt = System.currentTimeMillis()
            )
        )

        var historyAction = "Promo Updated"
        if (current.status != "Active" && promo.status == "Active") historyAction = "Promo Activated"
        else if (current.status == "Active" && (promo.status == "Disabled" || promo.status == "Inactive")) historyAction = "Promo Deactivated"

        promoHistoryDao.insertHistory(
            PromoHistoryEntity(
                promoId = promo.id,
                promoName = updatedName,
                action = historyAction,
                performedBy = actorUserId,
                performedByName = actorUserName ?: "Administrator",
                createdAt = System.currentTimeMillis()
            )
        )

        auditLogDao.insertLog(
            AuditLogEntity(
                userId = actorUserId,
                userName = actorUserName,
                actionType = "Update Promo",
                moduleName = "Promos",
                description = "Updated promo: $updatedName"
            )
        )

        return Result.success(true)
    }

    suspend fun deletePromo(id: Long, actorUserId: Long?, actorUserName: String?): Result<Boolean> {
        val current = promoDao.getPromoById(id)
            ?: return Result.failure(Exception("Promo not found."))

        promoHistoryDao.insertHistory(
            PromoHistoryEntity(
                promoId = id,
                promoName = current.promoName,
                action = "Promo Deleted",
                performedBy = actorUserId,
                performedByName = actorUserName ?: "Administrator",
                createdAt = System.currentTimeMillis()
            )
        )

        promoDao.deletePromo(id)

        auditLogDao.insertLog(
            AuditLogEntity(
                userId = actorUserId,
                userName = actorUserName,
                actionType = "Delete Promo",
                moduleName = "Promos",
                description = "Deleted promo: ${current.promoName}"
            )
        )

        return Result.success(true)
    }
}
