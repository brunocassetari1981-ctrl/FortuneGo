package com.fortunego.app

import android.annotation.SuppressLint
import android.net.http.SslError
import android.os.Bundle
import android.view.ViewGroup
import android.webkit.SslErrorHandler
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.ui.Modifier
import androidx.compose.ui.viewinterop.AndroidView

class MainActivity : ComponentActivity() {

    private var myWebView: WebView? = null

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        setContent {
            AndroidView(
                modifier = Modifier.fillMaxSize(),
                factory = { context ->
                    WebView(context).apply {
                        layoutParams = ViewGroup.LayoutParams(
                            ViewGroup.LayoutParams.MATCH_PARENT,
                            ViewGroup.LayoutParams.MATCH_PARENT
                        )

                        // Ativa aceleração e permissões para arquivos locais
                        settings.javaScriptEnabled = true
                        settings.domStorageEnabled = true
                        settings.databaseEnabled = true
                        settings.allowFileAccess = true
                        settings.allowContentAccess = true
                        settings.allowFileAccessFromFileURLs = true
                        settings.allowUniversalAccessFromFileURLs = true
                        settings.cacheMode = WebSettings.LOAD_DEFAULT
                        settings.mediaPlaybackRequiresUserGesture = false
                        settings.useWideViewPort = true
                        settings.loadWithOverviewMode = true

                        webViewClient = object : WebViewClient() {
                            override fun onReceivedSslError(view: WebView?, handler: SslErrorHandler?, error: SslError?) {
                                handler?.proceed()
                            }

                            override fun onPageFinished(view: WebView?, url: String?) {
                                super.onPageFinished(view, url)
                                view?.evaluateJavascript(
                                    """
                                    (function() {
                                        var style = document.createElement('style');
                                        style.innerHTML = `
                                            html, body { width: 100% !important; height: 100% !important; margin: 0 !important; padding: 0 !important; overflow-x: hidden !important; }
                                            @keyframes mascotWave {
                                                0% { transform: translateY(0) rotate(0deg) scale(1); }
                                                25% { transform: translateY(-5px) rotate(-3deg) scale(1.04); }
                                                50% { transform: translateY(0) rotate(0deg) scale(1); }
                                                75% { transform: translateY(-5px) rotate(3deg) scale(1.04); }
                                                100% { transform: translateY(0) rotate(0deg) scale(1); }
                                            }
                                            @keyframes pulseGlow {
                                                0% { filter: drop-shadow(0 0 6px rgba(250, 204, 21, 0.7)); }
                                                50% { filter: drop-shadow(0 0 20px rgba(250, 204, 21, 1)); }
                                                100% { filter: drop-shadow(0 0 6px rgba(250, 204, 21, 0.7)); }
                                            }
                                            img, .game-card img, [class*="game"] img, [class*="card"] img, [class*="icon"] img {
                                                animation: mascotWave 2.2s ease-in-out infinite, pulseGlow 1.8s ease-in-out infinite !important;
                                                transform-origin: bottom center !important;
                                            }
                                        `;
                                        document.head.appendChild(style);

                                        // Corretor automático de caminhos de imagens para file:///android_asset/
                                        function fixImagePaths() {
                                            var imgs = document.querySelectorAll('img');
                                            imgs.forEach(function(img) {
                                                var src = img.getAttribute('src');
                                                if (src && !src.startsWith('file://') && !src.startsWith('data:') && !src.startsWith('http')) {
                                                    if (src.startsWith('/')) {
                                                        img.src = 'file:///android_asset' + src;
                                                    } else {
                                                        img.src = 'file:///android_asset/' + src.replace(/^\.\//, '');
                                                    }
                                                }
                                            });
                                        }
                                        setInterval(fixImagePaths, 300);
                                        fixImagePaths();

                                        window.scrollTo(0, 1);
                                    })();
                                    """.trimIndent(),
                                    null
                                )
                            }
                        }
                        webChromeClient = WebChromeClient()

                        // Carrega o index.html localmente (sem telas do Google / Google Login)
                        try {
                            val inputStream = context.assets.open("index.html")
                            val htmlContent = inputStream.bufferedReader().use { it.readText() }
                            loadDataWithBaseURL("file:///android_asset/", htmlContent, "text/html", "UTF-8", null)
                        } catch (e: Exception) {
                            loadUrl("file:///android_asset/index.html")
                        }
                        myWebView = this
                    }
                }
            )
        }

        // Botão voltar do celular
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (myWebView?.canGoBack() == true) {
                    myWebView?.goBack()
                } else {
                    finish()
                }
            }
        })
    }
}
