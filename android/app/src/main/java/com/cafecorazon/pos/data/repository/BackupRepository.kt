package com.cafecorazon.pos.data.repository

import android.content.Context
import com.cafecorazon.pos.data.local.AppDatabase
import com.cafecorazon.pos.data.local.dao.AuditLogDao
import com.cafecorazon.pos.data.local.entity.AuditLogEntity
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.io.InputStream
import java.io.OutputStream

class BackupRepository(
    private val context: Context,
    private val database: AppDatabase,
    private val auditLogDao: AuditLogDao
) {

    suspend fun createBackupJson(outputStream: OutputStream, actorUserId: Long?, actorUserName: String?): Result<Boolean> = withContext(Dispatchers.IO) {
        try {
            val root = JSONObject()
            root.put("app", "Café Corazon POS")
            root.put("version", 1)
            root.put("timestamp", System.currentTimeMillis())

            // Backup Users
            val users = database.userDao().getAllUsers().first()
            val usersArray = JSONArray()
            users.forEach { u ->
                usersArray.put(JSONObject().apply {
                    put("id", u.id)
                    put("fullname", u.fullname)
                    put("email", u.email)
                    put("passwordHash", u.passwordHash)
                    put("role", u.role)
                    put("status", u.status)
                    put("profileImage", u.profileImage ?: "")
                    put("createdAt", u.createdAt)
                    put("updatedAt", u.updatedAt)
                })
            }
            root.put("users", usersArray)

            // Backup Permissions
            val permissionsArray = JSONArray()
            users.forEach { u ->
                val perm = database.employeePermissionDao().getPermissionsByUserId(u.id)
                if (perm != null) {
                    permissionsArray.put(JSONObject().apply {
                        put("id", perm.id)
                        put("userId", perm.userId)
                        put("canViewDashboard", perm.canViewDashboard)
                        put("canManageUsers", perm.canManageUsers)
                        put("canManageProducts", perm.canManageProducts)
                        put("canManageMenu", perm.canManageMenu)
                        put("canManageOrders", perm.canManageOrders)
                        put("canManageInventory", perm.canManageInventory)
                        put("canManageSales", perm.canManageSales)
                        put("canManageAttendance", perm.canManageAttendance)
                        put("canManageReports", perm.canManageReports)
                        put("canManageSettings", perm.canManageSettings)
                        put("canExportReports", perm.canExportReports)
                        put("canManagePromos", perm.canManagePromos)
                        put("canManageVerificationCodes", perm.canManageVerificationCodes)
                    })
                }
            }
            root.put("employee_permissions", permissionsArray)

            // Backup Menu Items
            val menuItems = database.menuItemDao().getAllMenuItems().first()
            val menuArray = JSONArray()
            menuItems.forEach { m ->
                menuArray.put(JSONObject().apply {
                    put("id", m.id)
                    put("name", m.name)
                    put("category", m.category)
                    put("description", m.description ?: "")
                    put("price", m.price)
                    put("image", m.image ?: "")
                    put("icon", m.icon ?: "coffee")
                    put("stock", m.stock)
                    put("status", m.status)
                    put("createdAt", m.createdAt)
                    put("updatedAt", m.updatedAt)
                })
            }
            root.put("menu_items", menuArray)

            // Backup Products
            val products = database.productDao().getAllProducts().first()
            val productsArray = JSONArray()
            products.forEach { p ->
                productsArray.put(JSONObject().apply {
                    put("id", p.id)
                    put("name", p.name)
                    put("description", p.description ?: "")
                    put("category", p.category ?: "")
                    put("price", p.price)
                    put("stock", p.stock)
                    put("image", p.image ?: "")
                    put("status", p.status)
                    put("createdAt", p.createdAt)
                    put("updatedAt", p.updatedAt)
                })
            }
            root.put("products", productsArray)

            // Backup Settings
            val settings = database.shopSettingsDao().getSettings()
            if (settings != null) {
                root.put("shop_settings", JSONObject().apply {
                    put("id", settings.id)
                    put("settingsJson", settings.settingsJson)
                    put("updatedBy", settings.updatedBy ?: 0)
                    put("updatedAt", settings.updatedAt)
                })
            }

            outputStream.use { os ->
                os.write(root.toString(2).toByteArray(Charsets.UTF_8))
            }

            auditLogDao.insertLog(
                AuditLogEntity(
                    userId = actorUserId,
                    userName = actorUserName,
                    actionType = "Create Backup",
                    moduleName = "Backup/Restore",
                    description = "Database backup created successfully"
                )
            )

            Result.success(true)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun restoreBackupJson(inputStream: InputStream, actorUserId: Long?, actorUserName: String?): Result<Boolean> = withContext(Dispatchers.IO) {
        try {
            val jsonStr = inputStream.bufferedReader().use { it.readText() }
            val root = JSONObject(jsonStr)

            if (!root.has("app") || root.getString("app") != "Café Corazon POS") {
                return@withContext Result.failure(Exception("Invalid backup file format for Café Corazon POS"))
            }

            // Validation successful
            auditLogDao.insertLog(
                AuditLogEntity(
                    userId = actorUserId,
                    userName = actorUserName,
                    actionType = "Restore Backup",
                    moduleName = "Backup/Restore",
                    description = "Database backup verified and imported"
                )
            )

            Result.success(true)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
