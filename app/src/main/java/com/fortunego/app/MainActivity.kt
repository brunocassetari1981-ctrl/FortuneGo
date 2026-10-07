package com.fortunego.app

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.WindowManager
import android.webkit.ValueCallback
import android.webkit.WebView
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.activity.compose.setContent
import androidx.activity.SystemBarStyle
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver

/**
 * FortuneGo — host nativo do app web.
 *
 * Diferenças centrais em relação à versão antiga:
 *  - Os assets são servidos por https://appassets.androidplatform.net/assets/... (WebViewAssetLoader)
 *    em vez de file:///android_asset/. Isso resolve de vez as imagens que não apareciam,
 *    porque passa a existir uma origem HTTPS real: caminhos relativos, CSS background-image,
 *    fetch/XHR, localStorage, IndexedDB e canvas funcionam sem gambiarra.
 *  - Nada de allowUniversalAccessFromFileURLs nem de aceitar erro de SSL cegamente.
 *  - A camada de interatividade vive em assets/js/fortune-enhance.js e é injetada no onPageFinished,
 *    então dá para editar o visual sem recompilar o Kotlin.
 */
class MainActivity : ComponentActivity() {

    private var webView: WebView? = null
    private var pendingFileCallback: ValueCallback<Array<Uri>>? = null
    private var lastBackPressAt = 0L

    private val fileChooserLauncher =
        registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
            val callback = pendingFileCallback ?: return@registerForActivityResult
            pendingFileCallback = null
            callback.onReceiveValue(
                android.webkit.WebChromeClient.FileChooserParams.parseResult(
                    result.resultCode,
                    result.data
                )
            )
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // Barras do sistema transparentes com ÍCONES CLAROS: o app é escuro,
        // e o padrão (auto) deixaria ícones pretos invisíveis no modo claro.
        enableEdgeToEdge(
            statusBarStyle = SystemBarStyle.dark(android.graphics.Color.TRANSPARENT),
            navigationBarStyle = SystemBarStyle.dark(android.graphics.Color.TRANSPARENT)
        )
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        setContent {
            var loading by remember { mutableStateOf(true) }
            var progress by remember { mutableIntStateOf(0) }

            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color(0xFF07040C))
            ) {
                AndroidView(
                    /*
                     * ENQUADRAMENTO — a correção que faltava.
                     *
                     * Com enableEdgeToEdge() a janela passa a ocupar o ecrã
                     * TODO, barra de estado e barra de gestos incluídas. O
                     * WebView estava em fillMaxSize() sem compensar isso, por
                     * isso o 100dvh do CSS valia a altura da JANELA e não a
                     * altura VISÍVEL: a barra superior do jogo ficava por
                     * baixo do relógio e da bateria, e a barra de GIRAR por
                     * baixo da barra de gestos. O jogo parecia cortado em
                     * cima e em baixo, e nenhum ajuste de CSS resolvia,
                     * porque do lado web aquela altura "existia".
                     *
                     * safeDrawing = barras do sistema + recorte do ecrã
                     * (notch) + teclado. O WebView passa a receber exatamente
                     * a área visível, e aí 100dvh volta a dizer a verdade.
                     */
                    modifier = Modifier
                        .fillMaxSize()
                        .windowInsetsPadding(WindowInsets.safeDrawing),
                    factory = { context ->
                        buildFortuneWebView(
                            context = context,
                            bridge = NativeBridge(this@MainActivity),
                            onProgress = { value ->
                                progress = value
                                if (value >= 92) loading = false
                            },
                            onPageFinished = { loading = false },
                            onExternalUrl = ::openExternally,
                            onFileChooser = ::openFileChooser
                        ).also { webView = it }
                    }
                )

                LoadingVeil(visible = loading, progress = progress)
            }

            // Pausa/retoma timers e mídia junto com o ciclo de vida da Activity.
            val lifecycleOwner = LocalLifecycleOwner.current
            DisposableEffect(lifecycleOwner) {
                val observer = LifecycleEventObserver { _, event ->
                    when (event) {
                        Lifecycle.Event.ON_RESUME -> webView?.onResume()
                        Lifecycle.Event.ON_PAUSE -> webView?.onPause()
                        else -> Unit
                    }
                }
                lifecycleOwner.lifecycle.addObserver(observer)
                onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
            }
        }

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() = handleBack()
        })
    }

    /**
     * Voltar inteligente: primeiro pergunta ao app web (fecha modal/overlay aberto),
     * depois tenta o histórico do WebView e só então sai com confirmação de toque duplo.
     */
    private fun handleBack() {
        val view = webView
        if (view == null) {
            finish()
            return
        }
        view.evaluateJavascript(
            "(function(){try{return (window.FortuneGo && FortuneGo.handleBack && FortuneGo.handleBack())?'1':'0'}catch(e){return '0'}})()"
        ) { handledByWeb ->
            if (handledByWeb?.contains("1") == true) return@evaluateJavascript

            if (view.canGoBack()) {
                view.goBack()
                return@evaluateJavascript
            }

            val now = System.currentTimeMillis()
            if (now - lastBackPressAt < 2000) {
                finish()
            } else {
                lastBackPressAt = now
                Toast.makeText(this, R.string.press_back_again, Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun openExternally(uri: Uri): Boolean = try {
        startActivity(Intent(Intent.ACTION_VIEW, uri).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        true
    } catch (_: Exception) {
        Toast.makeText(this, R.string.no_app_to_open, Toast.LENGTH_SHORT).show()
        false
    }

    private fun openFileChooser(callback: ValueCallback<Array<Uri>>, intent: Intent): Boolean = try {
        pendingFileCallback?.onReceiveValue(null)
        pendingFileCallback = callback
        fileChooserLauncher.launch(intent)
        true
    } catch (_: Exception) {
        pendingFileCallback = null
        false
    }

    override fun onDestroy() {
        webView?.apply {
            stopLoading()
            loadUrl("about:blank")
            removeAllViews()
            destroy()
        }
        webView = null
        super.onDestroy()
    }
}

@Composable
private fun LoadingVeil(visible: Boolean, progress: Int) {
    AnimatedVisibility(visible = visible, exit = fadeOut(animationSpec = tween(420))) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        listOf(Color(0xFF1B0B22), Color(0xFF0B0712), Color(0xFF07040C))
                    )
                ),
            contentAlignment = Alignment.Center
        ) {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                Text(
                    text = "FORTUNE",
                    color = Color(0xFFFACC15),
                    fontSize = 34.sp,
                    fontWeight = FontWeight.Black
                )
                Text(
                    text = "GO",
                    color = Color(0xFFE11D48),
                    fontSize = 22.sp,
                    fontWeight = FontWeight.Black
                )
                Box(Modifier.height(28.dp))
                CircularProgressIndicator(
                    modifier = Modifier.size(34.dp),
                    color = Color(0xFFFACC15),
                    strokeWidth = 3.dp
                )
                Box(Modifier.height(20.dp))
                LinearProgressIndicator(
                    progress = { progress.coerceIn(0, 100) / 100f },
                    modifier = Modifier
                        .fillMaxWidth(0.5f)
                        .height(4.dp),
                    color = Color(0xFFFACC15),
                    trackColor = Color(0x33FACC15)
                )
            }
        }
    }
}
