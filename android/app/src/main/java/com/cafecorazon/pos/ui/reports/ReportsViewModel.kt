package com.cafecorazon.pos.ui.reports

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.cafecorazon.pos.data.repository.ReportRepository
import com.cafecorazon.pos.data.repository.ReportSummaryData
import com.cafecorazon.pos.security.SessionUser
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class ReportsUiState(
    val isLoading: Boolean = false,
    val selectedDaysFilter: Int? = 7, // 7, 30, null (all)
    val summaryData: ReportSummaryData? = null,
    val errorMessage: String? = null,
    val isReportGenerated: Boolean = false
)

class ReportsViewModel(
    private val reportRepository: ReportRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(ReportsUiState())
    val uiState: StateFlow<ReportsUiState> = _uiState.asStateFlow()

    init {
        loadSummary(7)
    }

    fun loadSummary(days: Int?) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, selectedDaysFilter = days, errorMessage = null)
            try {
                val data = reportRepository.getSummary(days)
                _uiState.value = _uiState.value.copy(isLoading = false, summaryData = data)
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(isLoading = false, errorMessage = e.message ?: "Failed to load report summary")
            }
        }
    }

    fun generateSalesSnapshot(sessionUser: SessionUser?) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)
            val res = reportRepository.generateReport(sessionUser?.id, sessionUser?.fullname)
            if (res.isSuccess) {
                _uiState.value = _uiState.value.copy(isLoading = false, isReportGenerated = true)
                loadSummary(_uiState.value.selectedDaysFilter)
            } else {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    errorMessage = res.exceptionOrNull()?.message ?: "Failed to generate report snapshot"
                )
            }
        }
    }

    class Factory(
        private val reportRepository: ReportRepository
    ) : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T {
            return ReportsViewModel(reportRepository) as T
        }
    }
}
