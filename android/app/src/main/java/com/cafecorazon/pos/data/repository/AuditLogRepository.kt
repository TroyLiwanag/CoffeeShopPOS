package com.cafecorazon.pos.data.repository

import com.cafecorazon.pos.data.local.dao.AuditLogDao
import com.cafecorazon.pos.data.local.dao.AuditUserTuple
import com.cafecorazon.pos.data.local.entity.AuditLogEntity
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

data class AuditLogPageResult(
    val data: List<AuditLogEntity>,
    val page: Int,
    val limit: Int,
    val total: Int,
    val totalPages: Int
)

class AuditLogRepository(
    private val auditLogDao: AuditLogDao
) {

    suspend fun getFilteredLogs(
        pageParam: Int = 1,
        limitParam: Int = 25,
        searchParam: String? = null,
        moduleParam: String? = null,
        userIdParam: Long? = null,
        actionTypeParam: String? = null,
        periodParam: String? = "all",
        dateFromParam: Long? = null,
        dateToParam: Long? = null
    ): AuditLogPageResult {
        val page = maxOf(1, pageParam)
        val limit = limitParam.coerceIn(10, 100)
        val offset = (page - 1) * limit

        val search = searchParam?.takeIf { it.isNotBlank() }?.trim()
        val module = moduleParam?.takeIf { it.isNotBlank() }?.trim()
        val userId = if (userIdParam != null && userIdParam > 0) userIdParam else null
        val actionType = actionTypeParam?.takeIf { it.isNotBlank() }?.trim()

        val now = System.currentTimeMillis()
        val sinceTimestamp = when (periodParam) {
            "today" -> {
                val cal = java.util.Calendar.getInstance()
                cal.set(java.util.Calendar.HOUR_OF_DAY, 0)
                cal.set(java.util.Calendar.MINUTE, 0)
                cal.set(java.util.Calendar.SECOND, 0)
                cal.set(java.util.Calendar.MILLISECOND, 0)
                cal.timeInMillis
            }
            "week" -> now - (7L * 24 * 60 * 60 * 1000)
            "month" -> now - (30L * 24 * 60 * 60 * 1000)
            "custom" -> dateFromParam
            else -> null
        }

        val total = auditLogDao.getFilteredLogsCount(search, module, userId, actionType, sinceTimestamp)
        val logs = auditLogDao.getFilteredLogs(search, module, userId, actionType, sinceTimestamp, limit, offset)
        val totalPages = maxOf(1, Math.ceil(total.toDouble() / limit.toDouble()).toInt())

        return AuditLogPageResult(
            data = logs,
            page = page,
            limit = limit,
            total = total,
            totalPages = totalPages
        )
    }

    suspend fun getDistinctModules(): List<String> = auditLogDao.getDistinctModules()

    suspend fun getDistinctUsers(): List<AuditUserTuple> = auditLogDao.getDistinctUsers()

    suspend fun deleteLog(id: Long, actorUserId: Long?, actorUserName: String?): Result<Boolean> {
        auditLogDao.deleteLog(id)
        auditLogDao.insertLog(
            AuditLogEntity(
                userId = actorUserId,
                userName = actorUserName,
                actionType = "Delete Audit Log",
                moduleName = "Audit",
                description = "Deleted audit entry #$id"
            )
        )
        return Result.success(true)
    }

    suspend fun deleteLogsBulk(ids: List<Long>, actorUserId: Long?, actorUserName: String?): Result<Boolean> {
        if (ids.isEmpty()) return Result.success(true)
        auditLogDao.deleteLogsBulk(ids)
        auditLogDao.insertLog(
            AuditLogEntity(
                userId = actorUserId,
                userName = actorUserName,
                actionType = "Delete Audit Logs",
                moduleName = "Audit",
                description = "Deleted ${ids.size} audit entries"
            )
        )
        return Result.success(true)
    }

    suspend fun generateCsvExport(logs: List<AuditLogEntity>): String {
        val dateFormat = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.getDefault())
        val lines = mutableListOf<String>()
        lines.add("ID,User,Action,Module,Description,IP,Device,Date")

        logs.forEach { r ->
            val id = r.id
            val user = escapeCsv(r.userName ?: "System")
            val action = escapeCsv(r.actionType)
            val module = escapeCsv(r.moduleName)
            val desc = escapeCsv(r.description ?: "")
            val ip = escapeCsv(r.ipAddress ?: "")
            val device = escapeCsv(r.deviceInfo ?: "")
            val date = escapeCsv(dateFormat.format(Date(r.createdAt)))
            lines.add("$id,$user,$action,$module,$desc,$ip,$device,$date")
        }

        return lines.joinToString("\n")
    }

    private fun escapeCsv(value: String): String {
        return if (value.contains(",") || value.contains("\"") || value.contains("\n")) {
            "\"" + value.replace("\"", "\"\"") + "\""
        } else {
            value
        }
    }

    private fun String?.isNull_or_blank(): Boolean = this == null || this.trim().isEmpty()
}
