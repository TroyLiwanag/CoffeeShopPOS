package com.cafecorazon.pos.ui.payroll

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.cafecorazon.pos.data.repository.PayrollRepository
import com.cafecorazon.pos.data.repository.PayrollUserOverview
import com.cafecorazon.pos.data.repository.RateInput
import com.cafecorazon.pos.security.SessionUser
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class PayrollUiState(
    val isLoading: Boolean = false,
    val daysPeriod: Int = 7, // 7, 15, 30
    val overviewList: List<PayrollUserOverview> = emptyList(),
    val errorMessage: String? = null
)

class PayrollViewModel(
    private val payrollRepository: PayrollRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(PayrollUiState())
    val uiState: StateFlow<PayrollUiState> = _uiState.asStateFlow()

    init {
        loadPayroll(7)
    }

    fun loadPayroll(days: Int) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, daysPeriod = days, errorMessage = null)
            try {
                val list = payrollRepository.getPayrollOverview(days)
                _uiState.value = _uiState.value.copy(isLoading = false, overviewList = list)
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(isLoading = false, errorMessage = e.message ?: "Failed to load payroll")
            }
        }
    }

    fun saveRates(rates: List<RateInput>, sessionUser: SessionUser?, onSuccess: () -> Unit) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)
            val res = payrollRepository.saveRates(rates, _uiState.value.daysPeriod, sessionUser?.id, sessionUser?.fullname)
            if (res.isSuccess) {
                _uiState.value = _uiState.value.copy(isLoading = false, overviewList = res.getOrNull() ?: emptyList())
                onSuccess()
            } else {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    errorMessage = res.exceptionOrNull()?.message ?: "Failed to save payroll rates"
                )
            }
        }
    }

    class Factory(
        private val payrollRepository: PayrollRepository
    ) : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T {
            return PayrollViewModel(payrollRepository) as T
        }
    }
}
