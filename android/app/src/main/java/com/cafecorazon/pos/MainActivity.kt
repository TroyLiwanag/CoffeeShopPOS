package com.cafecorazon.pos

import android.os.Bundle
import android.view.WindowManager
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import com.cafecorazon.pos.ui.navigation.AppNavigation
import com.cafecorazon.pos.ui.theme.CafeCorazonTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // Ensure FLAG_SECURE is explicitly cleared so screenshots and screen captures are never blocked by security policy
        window.clearFlags(WindowManager.LayoutParams.FLAG_SECURE)
        setContent {
            CafeCorazonTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    AppNavigation()
                }
            }
        }
    }
}
