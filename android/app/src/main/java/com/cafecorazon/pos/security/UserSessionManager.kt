package com.cafecorazon.pos.security

import android.content.Context
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.longPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.cafecorazon.pos.data.local.entity.EmployeePermissionEntity
import com.cafecorazon.pos.data.local.entity.UserEntity
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.dataStore by preferencesDataStore(name = "cafe_corazon_user_session")

data class SessionUser(
    val id: Long,
    val fullname: String,
    val email: String,
    val role: String,
    val status: String,
    val permissions: EmployeePermissionEntity
)

class UserSessionManager(private val context: Context) {

    companion object {
        private val KEY_USER_ID = longPreferencesKey("user_id")
        private val KEY_FULLNAME = stringPreferencesKey("fullname")
        private val KEY_EMAIL = stringPreferencesKey("email")
        private val KEY_ROLE = stringPreferencesKey("role")
        private val KEY_STATUS = stringPreferencesKey("status")

        // Permissions
        private val KEY_PERM_VIEW_DASHBOARD = booleanPreferencesKey("perm_view_dashboard")
        private val KEY_PERM_MANAGE_USERS = booleanPreferencesKey("perm_manage_users")
        private val KEY_PERM_MANAGE_PRODUCTS = booleanPreferencesKey("perm_manage_products")
        private val KEY_PERM_MANAGE_MENU = booleanPreferencesKey("perm_manage_menu")
        private val KEY_PERM_MANAGE_ORDERS = booleanPreferencesKey("perm_manage_orders")
        private val KEY_PERM_MANAGE_INVENTORY = booleanPreferencesKey("perm_manage_inventory")
        private val KEY_PERM_MANAGE_SALES = booleanPreferencesKey("perm_manage_sales")
        private val KEY_PERM_MANAGE_ATTENDANCE = booleanPreferencesKey("perm_manage_attendance")
        private val KEY_PERM_MANAGE_REPORTS = booleanPreferencesKey("perm_manage_reports")
        private val KEY_PERM_MANAGE_SETTINGS = booleanPreferencesKey("perm_manage_settings")
        private val KEY_PERM_EXPORT_REPORTS = booleanPreferencesKey("perm_export_reports")
        private val KEY_PERM_MANAGE_PROMOS = booleanPreferencesKey("perm_manage_promos")
        private val KEY_PERM_MANAGE_VERIFICATION_CODES = booleanPreferencesKey("perm_manage_verification_codes")
    }

    val currentSessionFlow: Flow<SessionUser?> = context.dataStore.data.map { prefs ->
        try {
            val userId = prefs[KEY_USER_ID] ?: return@map null
            val fullname = prefs[KEY_FULLNAME] ?: ""
            val email = prefs[KEY_EMAIL] ?: ""
            val role = prefs[KEY_ROLE] ?: "staff"
            val status = prefs[KEY_STATUS] ?: "active"

            val isAdmin = role == "admin"

            val perms = EmployeePermissionEntity(
                userId = userId,
                canViewDashboard = if (isAdmin) true else (prefs[KEY_PERM_VIEW_DASHBOARD] ?: true),
                canManageUsers = if (isAdmin) true else (prefs[KEY_PERM_MANAGE_USERS] ?: false),
                canManageProducts = if (isAdmin) true else (prefs[KEY_PERM_MANAGE_PRODUCTS] ?: false),
                canManageMenu = if (isAdmin) true else (prefs[KEY_PERM_MANAGE_MENU] ?: false),
                canManageOrders = if (isAdmin) true else (prefs[KEY_PERM_MANAGE_ORDERS] ?: false),
                canManageInventory = if (isAdmin) true else (prefs[KEY_PERM_MANAGE_INVENTORY] ?: false),
                canManageSales = if (isAdmin) true else (prefs[KEY_PERM_MANAGE_SALES] ?: false),
                canManageAttendance = if (isAdmin) true else (prefs[KEY_PERM_MANAGE_ATTENDANCE] ?: false),
                canManageReports = if (isAdmin) true else (prefs[KEY_PERM_MANAGE_REPORTS] ?: false),
                canManageSettings = if (isAdmin) true else (prefs[KEY_PERM_MANAGE_SETTINGS] ?: false),
                canExportReports = if (isAdmin) true else (prefs[KEY_PERM_EXPORT_REPORTS] ?: false),
                canManagePromos = if (isAdmin) true else (prefs[KEY_PERM_MANAGE_PROMOS] ?: false),
                canManageVerificationCodes = if (isAdmin) true else (prefs[KEY_PERM_MANAGE_VERIFICATION_CODES] ?: false)
            )

            SessionUser(
                id = userId,
                fullname = fullname,
                email = email,
                role = role,
                status = status,
                permissions = perms
            )
        } catch (e: Exception) {
            null
        }
    }

    suspend fun saveSession(user: UserEntity, permissions: EmployeePermissionEntity?) {
        context.dataStore.edit { prefs ->
            prefs[KEY_USER_ID] = user.id
            prefs[KEY_FULLNAME] = user.fullname
            prefs[KEY_EMAIL] = user.email
            prefs[KEY_ROLE] = user.role
            prefs[KEY_STATUS] = user.status

            val perms = permissions ?: EmployeePermissionEntity(userId = user.id)
            val isAdmin = user.role == "admin"

            prefs[KEY_PERM_VIEW_DASHBOARD] = if (isAdmin) true else perms.canViewDashboard
            prefs[KEY_PERM_MANAGE_USERS] = if (isAdmin) true else perms.canManageUsers
            prefs[KEY_PERM_MANAGE_PRODUCTS] = if (isAdmin) true else perms.canManageProducts
            prefs[KEY_PERM_MANAGE_MENU] = if (isAdmin) true else perms.canManageMenu
            prefs[KEY_PERM_MANAGE_ORDERS] = if (isAdmin) true else perms.canManageOrders
            prefs[KEY_PERM_MANAGE_INVENTORY] = if (isAdmin) true else perms.canManageInventory
            prefs[KEY_PERM_MANAGE_SALES] = if (isAdmin) true else perms.canManageSales
            prefs[KEY_PERM_MANAGE_ATTENDANCE] = if (isAdmin) true else perms.canManageAttendance
            prefs[KEY_PERM_MANAGE_REPORTS] = if (isAdmin) true else perms.canManageReports
            prefs[KEY_PERM_MANAGE_SETTINGS] = if (isAdmin) true else perms.canManageSettings
            prefs[KEY_PERM_EXPORT_REPORTS] = if (isAdmin) true else perms.canExportReports
            prefs[KEY_PERM_MANAGE_PROMOS] = if (isAdmin) true else perms.canManagePromos
            prefs[KEY_PERM_MANAGE_VERIFICATION_CODES] = if (isAdmin) true else perms.canManageVerificationCodes
        }
    }

    suspend fun clearSession() {
        context.dataStore.edit { prefs ->
            prefs.clear()
        }
    }
}
