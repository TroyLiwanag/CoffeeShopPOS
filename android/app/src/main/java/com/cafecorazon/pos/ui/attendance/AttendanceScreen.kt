package com.cafecorazon.pos.ui.attendance

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccessTime
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Login
import androidx.compose.material.icons.filled.Logout
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.cafecorazon.pos.security.SessionUser
import com.cafecorazon.pos.ui.components.AppShell
import com.cafecorazon.pos.ui.navigation.Screen
import com.cafecorazon.pos.ui.theme.CaramelAccent
import com.cafecorazon.pos.ui.theme.CreamBackground
import com.cafecorazon.pos.ui.theme.EspressoPrimary
import com.cafecorazon.pos.ui.theme.SuccessGreen
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@Composable
fun AttendanceScreen(
    viewModel: AttendanceViewModel,
    sessionUser: SessionUser?,
    onNavigate: (Screen) -> Unit,
    onLogout: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()

    LaunchedEffect(sessionUser?.id) {
        if (sessionUser != null) {
            viewModel.loadStatus(sessionUser.id)
            viewModel.loadRecords(if (sessionUser.role == "admin") null else sessionUser.id)
        }
    }

    AppShell(
        title = "Attendance & Shift Management",
        currentScreenRoute = Screen.Attendance.route,
        sessionUser = sessionUser,
        onNavigate = onNavigate,
        onLogout = onLogout
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .background(CreamBackground)
                .padding(16.dp)
        ) {
            // Shift Clock Card
            Card(
                colors = CardDefaults.cardColors(containerColor = Color.White),
                elevation = CardDefaults.cardElevation(defaultElevation = 3.dp),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier.padding(20.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text("Today's Shift Status", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = EspressoPrimary)
                    Text("Work Date: ${uiState.myStatus?.workDate ?: SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())}", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)

                    Spacer(modifier = Modifier.height(16.dp))

                    if (uiState.errorMessage != null) {
                        Surface(
                            color = MaterialTheme.colorScheme.errorContainer,
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(bottom = 12.dp)
                        ) {
                            Text(
                                text = uiState.errorMessage!!,
                                color = MaterialTheme.colorScheme.onErrorContainer,
                                fontSize = 12.sp,
                                modifier = Modifier.padding(10.dp)
                            )
                        }
                    }

                    val status = uiState.myStatus?.status ?: "not_clocked_in"

                    when (status) {
                        "not_clocked_in" -> {
                            Button(
                                onClick = { if (sessionUser != null) viewModel.clockIn(sessionUser) },
                                enabled = !uiState.isLoading,
                                colors = ButtonDefaults.buttonColors(containerColor = SuccessGreen, contentColor = Color.White),
                                shape = RoundedCornerShape(10.dp),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(48.dp)
                            ) {
                                Icon(Icons.Default.Login, contentDescription = null)
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("Clock In For Shift", fontWeight = FontWeight.Bold)
                            }
                        }
                        "clocked_in" -> {
                            val clockInTime = uiState.myStatus?.record?.record?.clockIn
                            val timeStr = if (clockInTime != null) SimpleDateFormat("h:mm a", Locale.getDefault()).format(Date(clockInTime)) else ""

                            Surface(color = CaramelAccent.copy(alpha = 0.15f), shape = RoundedCornerShape(8.dp), modifier = Modifier.fillMaxWidth()) {
                                Text("Clocked In at $timeStr", fontWeight = FontWeight.Bold, color = EspressoPrimary, modifier = Modifier.padding(10.dp))
                            }

                            Spacer(modifier = Modifier.height(12.dp))

                            Button(
                                onClick = { if (sessionUser != null) viewModel.clockOut(sessionUser) },
                                enabled = !uiState.isLoading,
                                colors = ButtonDefaults.buttonColors(containerColor = EspressoPrimary, contentColor = CreamBackground),
                                shape = RoundedCornerShape(10.dp),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(48.dp)
                            ) {
                                Icon(Icons.Default.Logout, contentDescription = null)
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("Clock Out Of Shift", fontWeight = FontWeight.Bold)
                            }
                        }
                        "completed" -> {
                            val record = uiState.myStatus?.record?.record
                            Surface(color = SuccessGreen.copy(alpha = 0.15f), shape = RoundedCornerShape(8.dp), modifier = Modifier.fillMaxWidth()) {
                                Column(modifier = Modifier.padding(12.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                                    Icon(Icons.Default.CheckCircle, contentDescription = null, tint = SuccessGreen)
                                    Text("Shift Completed for Today!", fontWeight = FontWeight.Bold, color = SuccessGreen, fontSize = 14.sp)
                                    Text("Hours Worked: ${record?.hoursWorked ?: 0.0}h | Overtime: ${record?.overtimeHours ?: 0.0}h", fontSize = 12.sp, color = EspressoPrimary)
                                }
                            }
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            Text("Attendance History", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = EspressoPrimary)

            Spacer(modifier = Modifier.height(12.dp))

            LazyColumn(
                verticalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.fillMaxSize()
            ) {
                items(uiState.records, key = { it.record.id }) { item ->
                    val rec = item.record
                    Card(
                        colors = CardDefaults.cardColors(containerColor = Color.White),
                        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier
                                .padding(14.dp)
                                .fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Text(item.user?.fullname ?: "Employee", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = EspressoPrimary)
                                Text("Date: ${rec.workDate}", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                val inStr = if (rec.clockIn != null) SimpleDateFormat("h:mm a", Locale.getDefault()).format(Date(rec.clockIn)) else "--:--"
                                val outStr = if (rec.clockOut != null) SimpleDateFormat("h:mm a", Locale.getDefault()).format(Date(rec.clockOut)) else "In Progress"
                                Text("In: $inStr | Out: $outStr", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }

                            Column(horizontalAlignment = Alignment.End) {
                                Text("${rec.hoursWorked} hrs", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = EspressoPrimary)
                                if (rec.overtimeHours > 0) {
                                    Text("+${rec.overtimeHours} OT", fontWeight = FontWeight.Bold, fontSize = 11.sp, color = CaramelAccent)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
