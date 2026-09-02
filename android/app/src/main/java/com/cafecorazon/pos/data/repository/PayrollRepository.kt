package com.cafecorazon.pos.data.repository

import com.cafecorazon.pos.data.local.dao.*
import com.cafecorazon.pos.data.local.entity.AuditLogEntity
import com.cafecorazon.pos.data.local.entity.PayrollRateEntity
import kotlinx.coroutines.flow.first
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

data class PayrollUserOverview(
    val id: Long,
    val fullname: String,
    val email: String,
    val role: String,
    val status: String,
    val hourlyRate: Double,
    val rateUpdatedAt: Long?,
    val regularHours: Double,
    val overtimeHours: Double,
    val hoursSource: String, // "attendance" or "estimated"
    val daysRecorded: Int,
    val totalPay: Double
)

data class RateInput(
    val userId: Long,
    val hourlyRate: Double
)

class PayrollRepository(
    private val userDao: UserDao,
    private val payrollRateDao: PayrollRateDao,
    private val attendanceDao: AttendanceRecordDao,
    private val auditLogDao: AuditLogDao
) {

    private val DEFAULT_RATE = 80.0

    suspend fun getPayrollOverview(daysParam: Int): List<PayrollUserOverview> {
        val days = daysParam.coerceIn(1, 365)
        val standardHours = days * 8.0

        val sinceDate = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(
            Date(System.currentTimeMillis() - ((days - 1).toLong() * 24 * 60 * 60 * 1000))
        )

        val hoursSummaryList = attendanceDao.getHoursSummarySinceDate(sinceDate)
        val attendanceByUser = hoursSummaryList.associateBy { it.userId }

        val activeUsersWithPerms = userDao.getAllUsersWithPermissions().first()
            .filter { it.user.status == "active" }
            .sortedBy { it.user.fullname }

        val ratesList = payrollRateDao.getAllRates().associateBy { it.userId }

        return activeUsersWithPerms.map { uwp ->
            val u = uwp.user
            val rateEntity = ratesList[u.id]
            val hourlyRate = rateEntity?.hourlyRate ?: DEFAULT_RATE
            val rateUpdatedAt = rateEntity?.updatedAt

            val att = attendanceByUser[u.id]
            val hasAttendance = att != null && att.daysRecorded > 0

            val regHours = if (hasAttendance) att!!.regularHours else standardHours
            val otHours = if (hasAttendance) att!!.overtimeHours else 0.0

            // Overtime paid at 1.25x hourly rate
            val totalPay = (regHours * hourlyRate) + (otHours * hourlyRate * 1.25)

            PayrollUserOverview(
                id = u.id,
                fullname = u.fullname,
                email = u.email,
                role = u.role,
                status = u.status,
                hourlyRate = hourlyRate,
                rateUpdatedAt = rateUpdatedAt,
                regularHours = regHours,
                overtimeHours = otHours,
                hoursSource = if (hasAttendance) "attendance" else "estimated",
                daysRecorded = att?.daysRecorded ?: 0,
                totalPay = totalPay
            )
        }
    }

    suspend fun saveRates(
        rates: List<RateInput>,
        daysParam: Int,
        actorUserId: Long?,
        actorUserName: String?
    ): Result<List<PayrollUserOverview>> {
        if (rates.isEmpty()) {
            return Result.failure(Exception("No payroll rates provided"))
        }

        rates.forEach { r ->
            if (r.userId > 0 && r.hourlyRate >= 0) {
                payrollRateDao.insertOrUpdateRate(
                    PayrollRateEntity(
                        userId = r.userId,
                        hourlyRate = r.hourlyRate,
                        updatedBy = actorUserId,
                        createdAt = System.currentTimeMillis(),
                        updatedAt = System.currentTimeMillis()
                    )
                )
            }
        }

        auditLogDao.insertLog(
            AuditLogEntity(
                userId = actorUserId,
                userName = actorUserName,
                actionType = "Update Payroll Rates",
                moduleName = "Payroll",
                description = "Updated ${rates.size} payroll rate${if (rates.size > 1) "s" else ""}"
            )
        )

        return Result.success(getPayrollOverview(daysParam))
    }
}
