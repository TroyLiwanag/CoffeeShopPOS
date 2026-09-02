package com.cafecorazon.pos.ui.verification

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.cafecorazon.pos.data.local.dao.ResetCodeWithUser
import com.cafecorazon.pos.data.local.dao.UserWithPermissions
import com.cafecorazon.pos.data.repository.UserRepository
import com.cafecorazon.pos.data.repository.VerificationCodeRepository
import com.cafecorazon.pos.security.SessionUser
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

data class VerificationCodesUiState(
    val isLoading: Boolean = false,
    val codes: List<ResetCodeWithUser> = emptyList(),
    val errorMessage: String? = null,
    val generatedCode: String? = null
)

class VerificationCodesViewModel(
    private val verificationCodeRepository: VerificationCodeRepository,
    private val userRepository: UserRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(VerificationCodesUiState())
    val uiState: StateFlow<VerificationCodesUiState> = _uiState.asStateFlow()

    val usersFlow: StateFlow<List<UserWithPermissions>> = userRepository.usersFlow.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = emptyList()
    )

    init {
        viewModelScope.launch {
            verificationCodeRepository.codesFlow.collect { list ->
                _uiState.value = _uiState.value.copy(codes = list)
            }
        }
    }

    fun generateCode(staffEmail: String, sessionUser: SessionUser?) {
        if (staffEmail.isBlank()) {
            _uiState.value = _uiState.value.copy(errorMessage = "Please select or enter a staff email address.")
            return
        }

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null, generatedCode = null)
            val res = verificationCodeRepository.generateCode(staffEmail, sessionUser?.id, sessionUser?.fullname)
            if (res.isSuccess) {
                _uiState.value = _uiState.value.copy(isLoading = false, generatedCode = res.getOrNull())
            } else {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    errorMessage = res.exceptionOrNull()?.message ?: "Failed to generate code"
                )
            }
        }
    }

    fun markUsed(id: Long, sessionUser: SessionUser?) {
        viewModelScope.launch {
            verificationCodeRepository.markUsed(id, sessionUser?.id, sessionUser?.fullname)
        }
    }

    fun deleteCode(id: Long, sessionUser: SessionUser?) {
        viewModelScope.launch {
            verificationCodeRepository.deleteCode(id, sessionUser?.id, sessionUser?.fullname)
        }
    }

    fun deleteAllCodes(sessionUser: SessionUser?) {
        viewModelScope.launch {
            verificationCodeRepository.deleteAllCodes(sessionUser?.id, sessionUser?.fullname)
        }
    }

    class Factory(
        private val verificationCodeRepository: VerificationCodeRepository,
        private val userRepository: UserRepository
    ) : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T {
            return VerificationCodesViewModel(verificationCodeRepository, userRepository) as T
        }
    }
}
