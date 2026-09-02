package com.cafecorazon.pos.ui.theme

import android.app.Activity
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

private val LightColorScheme = lightColorScheme(
    primary = EspressoPrimary,
    onPrimary = CreamBackground,
    primaryContainer = EspressoSecondary,
    onPrimaryContainer = CreamBackground,
    secondary = CaramelAccent,
    onSecondary = TextDark,
    background = CreamBackground,
    onBackground = TextDark,
    surface = SurfaceCard,
    onSurface = TextDark,
    surfaceVariant = CreamBackground,
    onSurfaceVariant = MutedText,
    outline = BorderColor,
    error = DestructiveRed,
    onError = SurfaceCard
)

private val DarkColorScheme = darkColorScheme(
    primary = CaramelAccent,
    onPrimary = DarkBackground,
    primaryContainer = EspressoPrimary,
    onPrimaryContainer = CreamBackground,
    secondary = CaramelLight,
    onSecondary = DarkBackground,
    background = DarkBackground,
    onBackground = DarkText,
    surface = DarkSurface,
    onSurface = DarkText,
    surfaceVariant = DarkSurface,
    onSurfaceVariant = DarkMuted,
    outline = EspressoSecondary,
    error = DestructiveRed,
    onError = SurfaceCard
)

@Composable
fun CafeCorazonTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme
    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = colorScheme.primary.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = false
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}
