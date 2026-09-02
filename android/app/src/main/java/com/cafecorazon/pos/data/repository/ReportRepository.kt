package com.cafecorazon.pos.data.repository

import com.cafecorazon.pos.data.local.dao.*
import com.cafecorazon.pos.data.local.entity.AuditLogEntity
import com.cafecorazon.pos.data.local.entity.SalesReportEntity
import kotlinx.coroutines.flow.Flow

data class ReportSummaryData(
    val totalSales: Double,
    val totalOrders: Int,
    val byDay: List<DailySalesResult>,
    val topProducts: List<TopProductResult>
)

class ReportRepository(
    private val orderDao: OrderDao,
    private val salesReportDao: SalesReportDao,
    private val auditLogDao: AuditLogDao
) {

    val reportsFlow: Flow<List<SalesReportWithUser>> = salesReportDao.getAllReports()

    suspend fun getSummary(days: Int?): ReportSummaryData {
        val sinceTimestamp = if (days != null && days > 0) {
            System.currentTimeMillis() - (days.toLong() * 24 * 60 * 60 * 1000)
        } else null

        val salesSummary = orderDao.getSalesSummary(sinceTimestamp)
        val byDay = orderDao.getDailySalesTrend(sinceTimestamp)
        val topProducts = orderDao.getTopSellingProducts(sinceTimestamp)

        return ReportSummaryData(
            totalSales = salesSummary?.totalSales ?: 0.0,
            totalOrders = salesSummary?.totalOrders ?: 0,
            byDay = byDay ?: emptyList(),
            topProducts = topProducts ?: emptyList()
        )
    }

    suspend fun generateReport(actorUserId: Long?, actorUserName: String?): Result<Long> {
        val summary = getSummary(null)

        val id = salesReportDao.insertReport(
            SalesReportEntity(
                totalSales = summary.totalSales,
                totalOrders = summary.totalOrders,
                generatedBy = actorUserId,
                createdAt = System.currentTimeMillis()
            )
        )

        auditLogDao.insertLog(
            AuditLogEntity(
                userId = actorUserId,
                userName = actorUserName,
                actionType = "Generate Report",
                moduleName = "Reports",
                description = "Sales report #$id — ₱${String.format("%.2f", summary.totalSales)} / ${summary.totalOrders} orders"
            )
        )

        return Result.success(id)
    }

    suspend fun logExport(reportType: String, details: String?, actorUserId: Long?, actorUserName: String?) {
        auditLogDao.insertLog(
            AuditLogEntity(
                userId = actorUserId,
                userName = actorUserName,
                actionType = "Export Report",
                moduleName = "Reports",
                description = details ?: "Exported ${reportType.ifEmpty { "report" }}"
            )
        )
    }
}
