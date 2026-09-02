package com.cafecorazon.pos.ui.settings

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.cafecorazon.pos.data.repository.BackupRepository
import com.cafecorazon.pos.data.repository.SettingsRepository
import com.cafecorazon.pos.data.repository.ShopSettingsModel
import com.cafecorazon.pos.security.SessionUser
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.io.InputStream
import java.io.OutputStream

data class SettingsUiState(
    val isLoading: Boolean = false,
    val settingsModel: ShopSettingsModel = ShopSettingsModel(),
    val errorMessage: String? = null,
    val successMessage: String? = null
)

class SettingsViewModel(
    private val settingsRepository: SettingsRepository,
    private val backupRepository: BackupRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(SettingsUiState())
    val uiState: StateFlow<SettingsUiState> = _uiState.asStateFlow()

    init {
        loadSettings()
    }

    fun loadSettings() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)
            val model = settingsRepository.getSettingsModel()
            _uiState.value = _uiState.value.copy(isLoading = false, settingsModel = model)
        }
    }

    fun saveSettings(model: ShopSettingsModel, sessionUser: SessionUser?) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null, successMessage = null)
            val res = settingsRepository.updateSettings(model, sessionUser?.id, sessionUser?.fullname)
            if (res.isSuccess) {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    settingsModel = res.getOrNull() ?: model,
                    successMessage = "Shop settings saved successfully!"
                )
            } else {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    errorMessage = res.exceptionOrNull()?.message ?: "Failed to save settings"
                )
            }
        }
    }

    fun exportDatabaseBackup(outputStream: OutputStream, sessionUser: SessionUser?) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null, successMessage = null)
            val res = backupRepository.createBackupJson(outputStream, sessionUser?.id, sessionUser?.fullname)
            if (res.isSuccess) {
                _uiState.value = _uiState.value.copy(isLoading = false, successMessage = "Database backup exported successfully!")
            } else {
                _uiState.value = _uiState.value.copy(isLoading = false, errorMessage = res.exceptionOrNull()?.message ?: "Backup failed")
            }
        }
    }

    fun restoreDatabaseBackup(inputStream: InputStream, sessionUser: SessionUser?) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null, successMessage = null)
            val res = backupRepository.restoreBackupJson(inputStream, sessionUser?.id, sessionUser?.fullname)
            if (res.isSuccess) {
                _uiState.value = _uiState.value.copy(isLoading = false, successMessage = "Database backup restored successfully!")
            } else {
                _uiState.value = _uiState.value.copy(isLoading = false, errorMessage = res.exceptionOrNull()?.message ?: "Restore failed")
            }
        }
    }

    fun clearMessages() {
        _uiState.value = _uiState.value.copy(errorMessage = null, successMessage = null)
    }

    class Factory(
        private val settingsRepository: SettingsRepository,
        private val backupRepository: BackupRepository
    ) : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T {
            return SettingsViewModel(settingsRepository, backupRepository) as T
        }
    }
}
