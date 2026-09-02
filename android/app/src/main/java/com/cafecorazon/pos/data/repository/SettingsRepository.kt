package com.cafecorazon.pos.data.repository

import com.cafecorazon.pos.data.local.dao.AuditLogDao
import com.cafecorazon.pos.data.local.dao.ShopSettingsDao
import com.cafecorazon.pos.data.local.entity.AuditLogEntity
import com.cafecorazon.pos.data.local.entity.ShopSettingsEntity
import kotlinx.coroutines.flow.Flow
import org.json.JSONObject

data class ShopSettingsModel(
    val shopName: String = "Café Corazon",
    val businessStyle: String = "Kapeng may Puso 🖤",
    val receiptFooter: String = "Thank you for supporting Local!!!",
    val vatRate: Double = 12.0,
    val seniorDiscountRate: Double = 20.0,
    val pwdDiscountRate: Double = 20.0,
    val defaultHourlyRate: Double = 80.0,
    val printerTransport: String = "Bluetooth", // "Bluetooth" or "USB" or "None"
    val printerAddress: String = "" // MAC address or USB Device ID
)

class SettingsRepository(
    private val shopSettingsDao: ShopSettingsDao,
    private val auditLogDao: AuditLogDao
) {

    val settingsFlow: Flow<ShopSettingsEntity?> = shopSettingsDao.getSettingsFlow()

    suspend fun getSettingsModel(): ShopSettingsModel {
        val entity = shopSettingsDao.getSettings() ?: return ShopSettingsModel()
        return parseSettingsJson(entity.settingsJson)
    }

    suspend fun updateSettings(
        model: ShopSettingsModel,
        actorUserId: Long?,
        actorUserName: String?
    ): Result<ShopSettingsModel> {
        val json = JSONObject().apply {
            put("shopName", model.shopName)
            put("businessStyle", model.businessStyle)
            put("receiptFooter", model.receiptFooter)
            put("vatRate", model.vatRate)
            put("seniorDiscountRate", model.seniorDiscountRate)
            put("pwdDiscountRate", model.pwdDiscountRate)
            put("defaultHourlyRate", model.defaultHourlyRate)
            put("printerTransport", model.printerTransport)
            put("printerAddress", model.printerAddress)
        }.toString()

        shopSettingsDao.insertOrUpdateSettings(
            ShopSettingsEntity(
                id = 1,
                settingsJson = json,
                updatedBy = actorUserId,
                updatedAt = System.currentTimeMillis()
            )
        )

        auditLogDao.insertLog(
            AuditLogEntity(
                userId = actorUserId,
                userName = actorUserName,
                actionType = "Update Settings",
                moduleName = "Settings",
                description = "Updated shop settings: ${model.shopName}"
            )
        )

        return Result.success(model)
    }

    fun parseSettingsJson(jsonStr: String?): ShopSettingsModel {
        if (jsonStr.isNull_or_blank()) return ShopSettingsModel()
        return try {
            val json = JSONObject(jsonStr)
            ShopSettingsModel(
                shopName = json.optString("shopName", "Café Corazon"),
                businessStyle = json.optString("businessStyle", "Kapeng may Puso 🖤"),
                receiptFooter = json.optString("receiptFooter", "Thank you for supporting Local!!!"),
                vatRate = json.optDouble("vatRate", 12.0),
                seniorDiscountRate = json.optDouble("seniorDiscountRate", 20.0),
                pwdDiscountRate = json.optDouble("pwdDiscountRate", 20.0),
                defaultHourlyRate = json.optDouble("defaultHourlyRate", 80.0),
                printerTransport = json.optString("printerTransport", "Bluetooth"),
                printerAddress = json.optString("printerAddress", "")
            )
        } catch (e: Exception) {
            ShopSettingsModel()
        }
    }

    private fun String?.isNull_or_blank(): Boolean = this == null || this.trim().isEmpty()
}
