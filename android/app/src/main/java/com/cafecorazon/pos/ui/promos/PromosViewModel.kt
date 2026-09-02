package com.cafecorazon.pos.ui.promos

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.cafecorazon.pos.data.local.dao.PromoWithUsageCount
import com.cafecorazon.pos.data.local.entity.PromoEntity
import com.cafecorazon.pos.data.repository.PromoRepository
import com.cafecorazon.pos.data.repository.PromoStats
import com.cafecorazon.pos.security.SessionUser
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class PromosUiState(
    val isLoading: Boolean = false,
    val promos: List<PromoWithUsageCount> = emptyList(),
    val stats: PromoStats? = null,
    val errorMessage: String? = null
)

class PromosViewModel(
    private val promoRepository: PromoRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(PromosUiState())
    val uiState: StateFlow<PromosUiState> = _uiState.asStateFlow()

    init {
        viewModelScope.launch {
            promoRepository.promosFlow.collect { list ->
                _uiState.value = _uiState.value.copy(promos = list)
            }
        }
        refreshStats()
    }

    fun refreshStats() {
        viewModelScope.launch {
            val s = promoRepository.getPromoStats()
            _uiState.value = _uiState.value.copy(stats = s)
        }
    }

    fun createPromo(promo: PromoEntity, sessionUser: SessionUser?, onSuccess: () -> Unit) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)
            val res = promoRepository.createPromo(promo, sessionUser?.id, sessionUser?.fullname)
            if (res.isSuccess) {
                _uiState.value = _uiState.value.copy(isLoading = false)
                refreshStats()
                onSuccess()
            } else {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    errorMessage = res.exceptionOrNull()?.message ?: "Failed to create promo"
                )
            }
        }
    }

    fun updatePromo(promo: PromoEntity, sessionUser: SessionUser?, onSuccess: () -> Unit) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)
            val res = promoRepository.updatePromo(promo, sessionUser?.id, sessionUser?.fullname)
            if (res.isSuccess) {
                _uiState.value = _uiState.value.copy(isLoading = false)
                refreshStats()
                onSuccess()
            } else {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    errorMessage = res.exceptionOrNull()?.message ?: "Failed to update promo"
                )
            }
        }
    }

    fun togglePromoStatus(item: PromoWithUsageCount, sessionUser: SessionUser?) {
        viewModelScope.launch {
            val newStatus = if (item.promo.status == "Active") "Inactive" else "Active"
            promoRepository.updatePromo(item.promo.copy(status = newStatus), sessionUser?.id, sessionUser?.fullname)
            refreshStats()
        }
    }

    fun deletePromo(id: Long, sessionUser: SessionUser?) {
        viewModelScope.launch {
            promoRepository.deletePromo(id, sessionUser?.id, sessionUser?.fullname)
            refreshStats()
        }
    }

    class Factory(
        private val promoRepository: PromoRepository
    ) : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T {
            return PromosViewModel(promoRepository) as T
        }
    }
}
