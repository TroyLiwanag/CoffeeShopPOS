package com.cafecorazon.pos.data.repository

import com.cafecorazon.pos.data.local.dao.AttendanceRecordDao
import com.cafecorazon.pos.data.local.dao.AttendanceWithUser
import com.cafecorazon.pos.data.local.dao.AuditLogDao
import com.cafecorazon.pos.data.local.entity.AttendanceRecordEntity
import com.cafecorazon.pos.data.local.entity.AuditLogEntity
import kotlinx.coroutines.flow.Flow
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt

data class AttendanceStatusResult(
    val workDate: String,
    val status: String, // "not_clocked_in", "clocked_in", "completed"
    val record: AttendanceWithUser?
)

class AttendanceRepository(
    private val attendanceDao: AttendanceRecordDao,
    private val auditLogDao: AuditLogDao
) {

    private val STANDARD_DAY_HOURS = 8.0

    private fun getTodayDateString(): String {
        return SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
    }

    fun getAttendanceRecords(userId: Long?): Flow<List<AttendanceWithUser>> {
        return attendanceDao.getAttendanceRecords(userId)
    }

    suspend fun getMyStatus(userId: Long): AttendanceStatusResult {
        val today = getTodayDateString()
        val recordWithUser = attendanceDao.getRecordForUserAndDate(userId, today)
            ?: return AttendanceStatusResult(today, "not_clocked_in", null)

        val record = recordWithUser.record
        val statusStr = if (record.clockOut != null) "completed" else "clocked_in"
        return AttendanceStatusResult(today, statusStr, recordWithUser)
    }

    suspend fun clockIn(
        targetUserId: Long,
        force: Boolean = false,
        isManager: Boolean = false,
        actorUserId: Long,
        actorUserName: String
    ): Result<AttendanceWithUser> {
        val today = getTodayDateString()
        val existing = attendanceDao.getRecordForUserAndDate(targetUserId, today)

        if (existing?.record?.clockIn != null && existing.record.clockOut == null) {
            return Result.failure(Exception("Already clocked in for today"))
        }

        if (existing?.record?.clockOut != null) {
            if (!force || !isManager) {
                return Result.failure(Exception("Attendance for today is already complete"))
            }
        }

        val now = System.currentTimeMillis()
        if (existing != null) {
            val updated = existing.record.copy(
                clockIn = now,
                clockOut = null,
                hoursWorked = 0.0,
                overtimeHours = 0.0,
                recordedBy = actorUserId,
                updatedAt = now
            )
            attendanceDao.updateRecord(updated)
            val record = attendanceDao.getRecordById(existing.record.id)!!

            auditLogDao.insertLog(
                AuditLogEntity(
                    userId = actorUserId,
                    userName = actorUserName,
                    actionType = if (existing.record.clockOut != null) "Reset Clock In" else "Clock In",
                    moduleName = "Attendance",
                    description = "${record.user?.fullname ?: "Employee"} — $today"
                )
            )

            return Result.success(record)
        }

        val id = attendanceDao.insertRecord(
            AttendanceRecordEntity(
                userId = targetUserId,
                workDate = today,
                clockIn = now,
                recordedBy = actorUserId,
                createdAt = now,
                updatedAt = now
            )
        )
        val record = attendanceDao.getRecordById(id)!!

        auditLogDao.insertLog(
            AuditLogEntity(
                userId = actorUserId,
                userName = actorUserName,
                actionType = "Clock In",
                moduleName = "Attendance",
                description = "${record.user?.fullname ?: "Employee"} — $today"
            )
        )

        return Result.success(record)
    }

    suspend fun clockOut(
        targetUserId: Long,
        actorUserId: Long,
        actorUserName: String
    ): Result<AttendanceWithUser> {
        val today = getTodayDateString()
        val existing = attendanceDao.getRecordForUserAndDate(targetUserId, today)
            ?: return Result.failure(Exception("Not clocked in yet for today"))

        val record = existing.record
        if (record.clockIn == null) {
            return Result.failure(Exception("Not clocked in yet for today"))
        }
        if (record.clockOut != null) {
            return Result.failure(Exception("Already clocked out for today"))
        }

        val now = System.currentTimeMillis()
        val diffMs = now - record.clockIn
        val totalHoursRaw = max(0.0, (diffMs.toDouble() / 3600000.0 * 100.0).roundToInt() / 100.0)
        val hoursWorked = min(STANDARD_DAY_HOURS, totalHoursRaw)
        val overtimeHours = max(0.0, ((totalHoursRaw - STANDARD_DAY_HOURS) * 100.0).roundToInt() / 100.0)

        val updated = record.copy(
            clockOut = now,
            hoursWorked = hoursWorked,
            overtimeHours = overtimeHours,
            recordedBy = actorUserId,
            updatedAt = now
        )
        attendanceDao.updateRecord(updated)

        val updatedRecord = attendanceDao.getRecordById(record.id)!!

        auditLogDao.insertLog(
            AuditLogEntity(
                userId = actorUserId,
                userName = actorUserName,
                actionType = "Clock Out",
                moduleName = "Attendance",
                description = "${updatedRecord.user?.fullname ?: "Employee"} — $today (${hoursWorked}h)"
            )
        )

        return Result.success(updatedRecord)
    }

    suspend fun deleteAttendance(id: Long, actorUserId: Long?, actorUserName: String?): Result<Boolean> {
        val record = attendanceDao.getRecordById(id)
            ?: return Result.failure(Exception("Record not found"))

        attendanceDao.deleteRecord(id)

        auditLogDao.insertLog(
            AuditLogEntity(
                userId = actorUserId,
                userName = actorUserName,
                actionType = "Delete Attendance",
                moduleName = "Attendance",
                description = "${record.user?.fullname ?: "Employee"} — ${record.record.workDate}"
            )
        )

        return Result.success(true)
    }
}
