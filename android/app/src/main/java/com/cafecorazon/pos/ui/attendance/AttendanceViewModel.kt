package com.cafecorazon.pos.ui.attendance

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.cafecorazon.pos.data.local.dao.AttendanceWithUser
import com.cafecorazon.pos.data.repository.AttendanceRepository
import com.cafecorazon.pos.data.repository.AttendanceStatusResult
import com.cafecorazon.pos.security.SessionUser
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class AttendanceUiState(
    val isLoading: Boolean = false,
    val myStatus: AttendanceStatusResult? = null,
    val records: List<AttendanceWithUser> = emptyList(),
    val errorMessage: String? = null
)

class AttendanceViewModel(
    private val attendanceRepository: AttendanceRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(AttendanceUiState())
    val uiState: StateFlow<AttendanceUiState> = _uiState.asStateFlow()

    fun loadStatus(userId: Long) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)
            val st = attendanceRepository.getMyStatus(userId)
            _uiState.value = _uiState.value.copy(isLoading = false, myStatus = st)
        }
    }

    fun loadRecords(userIdFilter: Long? = null) {
        viewModelScope.launch {
            attendanceRepository.getAttendanceRecords(userIdFilter).collect { list ->
                _uiState.value = _uiState.value.copy(records = list)
            }
        }
    }

    fun clockIn(sessionUser: SessionUser) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)
            val res = attendanceRepository.clockIn(
                targetUserId = sessionUser.id,
                force = false,
                isManager = sessionUser.role == "admin",
                actorUserId = sessionUser.id,
                actorUserName = sessionUser.fullname
            )
            if (res.isSuccess) {
                loadStatus(sessionUser.id)
            } else {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    errorMessage = res.exceptionOrNull()?.message ?: "Clock in failed"
                )
            }
        }
    }

    fun clockOut(sessionUser: SessionUser) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)
            val res = attendanceRepository.clockOut(
                targetUserId = sessionUser.id,
                actorUserId = sessionUser.id,
                actorUserName = sessionUser.fullname
            )
            if (res.isSuccess) {
                loadStatus(sessionUser.id)
            } else {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    errorMessage = res.exceptionOrNull()?.message ?: "Clock out failed"
                )
            }
        }
    }

    class Factory(
        private val attendanceRepository: AttendanceRepository
    ) : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T {
            return AttendanceViewModel(attendanceRepository) as T
        }
    }
}
