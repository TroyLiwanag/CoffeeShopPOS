package com.cafecorazon.pos.ui.employees

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.cafecorazon.pos.data.local.dao.UserWithPermissions
import com.cafecorazon.pos.data.local.entity.EmployeePermissionEntity
import com.cafecorazon.pos.data.local.entity.UserEntity
import com.cafecorazon.pos.data.repository.UserRepository
import com.cafecorazon.pos.security.SessionUser
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class EmployeesUiState(
    val isLoading: Boolean = false,
    val users: List<UserWithPermissions> = emptyList(),
    val errorMessage: String? = null,
    val successMessage: String? = null
)

class EmployeesViewModel(
    private val userRepository: UserRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(EmployeesUiState())
    val uiState: StateFlow<EmployeesUiState> = _uiState.asStateFlow()

    init {
        viewModelScope.launch {
            userRepository.usersFlow.collect { list ->
                _uiState.value = _uiState.value.copy(users = list)
            }
        }
    }

    fun clearMessages() {
        _uiState.value = _uiState.value.copy(errorMessage = null, successMessage = null)
    }

    fun createUser(
        user: UserEntity,
        rawPass: String,
        permissions: EmployeePermissionEntity?,
        sessionUser: SessionUser?,
        onSuccess: () -> Unit
    ) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)
            val res = userRepository.createUser(user, rawPass, permissions, sessionUser?.id, sessionUser?.fullname)
            if (res.isSuccess) {
                _uiState.value = _uiState.value.copy(isLoading = false, successMessage = "Employee created successfully!")
                onSuccess()
            } else {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    errorMessage = res.exceptionOrNull()?.message ?: "Failed to create user"
                )
            }
        }
    }

    fun updateUser(
        userId: Long,
        fullname: String?,
        email: String?,
        role: String?,
        status: String?,
        newPassword: String?,
        permissions: EmployeePermissionEntity?,
        sessionUser: SessionUser?,
        onSuccess: () -> Unit
    ) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)
            val res = userRepository.updateUser(
                userId = userId,
                fullname = fullname,
                email = email,
                role = role,
                status = status,
                newPassword = newPassword,
                permissions = permissions,
                actorUserId = sessionUser?.id,
                actorUserName = sessionUser?.fullname
            )
            if (res.isSuccess) {
                _uiState.value = _uiState.value.copy(isLoading = false, successMessage = "Employee updated successfully!")
                onSuccess()
            } else {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    errorMessage = res.exceptionOrNull()?.message ?: "Failed to update user"
                )
            }
        }
    }

    fun deleteUser(userId: Long, sessionUser: SessionUser?) {
        viewModelScope.launch {
            val res = userRepository.deleteUser(userId, sessionUser?.id, sessionUser?.fullname)
            if (res.isSuccess) {
                _uiState.value = _uiState.value.copy(successMessage = "Employee deleted")
            } else {
                _uiState.value = _uiState.value.copy(errorMessage = res.exceptionOrNull()?.message ?: "Failed to delete employee")
            }
        }
    }

    class Factory(
        private val userRepository: UserRepository
    ) : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T {
            return EmployeesViewModel(userRepository) as T
        }
    }
}
