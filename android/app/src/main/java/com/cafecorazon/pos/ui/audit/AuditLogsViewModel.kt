package com.cafecorazon.pos.ui.audit

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.cafecorazon.pos.data.local.entity.AuditLogEntity
import com.cafecorazon.pos.data.repository.AuditLogPageResult
import com.cafecorazon.pos.data.repository.AuditLogRepository
import com.cafecorazon.pos.security.SessionUser
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class AuditLogsUiState(
    val isLoading: Boolean = false,
    val pageResult: AuditLogPageResult? = null,
    val currentPage: Int = 1,
    val search: String = "",
    val selectedModule: String? = null,
    val period: String = "all",
    val modules: List<String> = emptyList(),
    val errorMessage: String? = null,
    val csvExportContent: String? = null
)

class AuditLogsViewModel(
    private val auditLogRepository: AuditLogRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(AuditLogsUiState())
    val uiState: StateFlow<AuditLogsUiState> = _uiState.asStateFlow()

    init {
        loadModules()
        loadLogs()
    }

    fun loadModules() {
        viewModelScope.launch {
            val mods = auditLogRepository.getDistinctModules()
            _uiState.value = _uiState.value.copy(modules = mods)
        }
    }

    fun loadLogs(
        page: Int = _uiState.value.currentPage,
        search: String = _uiState.value.search,
        module: String? = _uiState.value.selectedModule,
        period: String = _uiState.value.period
    ) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(
                isLoading = true,
                currentPage = page,
                search = search,
                selectedModule = module,
                period = period,
                errorMessage = null
            )
            try {
                val res = auditLogRepository.getFilteredLogs(
                    pageParam = page,
                    searchParam = search,
                    moduleParam = module,
                    periodParam = period
                )
                _uiState.value = _uiState.value.copy(isLoading = false, pageResult = res)
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(isLoading = false, errorMessage = e.message)
            }
        }
    }

    fun exportCsv() {
        viewModelScope.launch {
            val logs = _uiState.value.pageResult?.data ?: emptyList()
            val csv = auditLogRepository.generateCsvExport(logs)
            _uiState.value = _uiState.value.copy(csvExportContent = csv)
        }
    }

    fun clearCsvExport() {
        _uiState.value = _uiState.value.copy(csvExportContent = null)
    }

    fun deleteLog(id: Long, sessionUser: SessionUser?) {
        viewModelScope.launch {
            auditLogRepository.deleteLog(id, sessionUser?.id, sessionUser?.fullname)
            loadLogs()
        }
    }

    class Factory(
        private val auditLogRepository: AuditLogRepository
    ) : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T {
            return AuditLogsViewModel(auditLogRepository) as T
        }
    }
}
