package com.fortunego.app

import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.view.View
import android.view.ViewGroup
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import androidx.webkit.WebResourceErrorCompat
import androidx.webkit.WebViewAssetLoader
import androidx.webkit.WebViewClientCompat

/** Domínio virtual usado pelo WebViewAssetLoader para servir /app/src/main/assets. */
const val ASSET_DOMAIN = "appassets.androidplatform.net"
const val START_URL = "https://$ASSET_DOMAIN/assets/index.html"

/** Esquemas que devem sair do app (loja, pix, whatsapp, telefone, e-mail...). */
private val EXTERNAL_SCHEMES = setOf(
    "tel", "mailto", "sms", "smsto", "whatsapp", "market", "intent",
    "geo", "tg", "pix", "bitcoin"
)

/**
 * Cria e configura o WebView do FortuneGo.
 *
 * @param onProgress       progresso de carregamento (0..100)
 * @param onPageFinished   chamado quando a página terminou e o enhancer já foi injetado
 * @param onExternalUrl    devolve true se a Activity conseguiu abrir o link fora do app
 * @param onFileChooser    integra <input type="file"> com o seletor do Android
 */
@SuppressLint("SetJavaScriptEnabled")
fun buildFortuneWebView(
    context: Context,
    bridge: NativeBridge,
    onProgress: (Int) -> Unit,
    onPageFinished: (WebView) -> Unit,
    onExternalUrl: (Uri) -> Boolean,
    onFileChooser: (ValueCallback<Array<Uri>>, Intent) -> Boolean
): WebView {

    val assetLoader = WebViewAssetLoader.Builder()
        .setDomain(ASSET_DOMAIN)
        .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(context))
        .addPathHandler("/res/", WebViewAssetLoader.ResourcesPathHandler(context))
        .build()

    // Script de interatividade e correção de imagens (editável sem recompilar).
    val enhanceScript = runCatching {
        context.assets.open("js/fortune-enhance.js").bufferedReader().use { it.readText() }
    }.getOrDefault("")

    if (BuildConfig.DEBUG) WebView.setWebContentsDebuggingEnabled(true)

    return WebView(context).apply {
        layoutParams = ViewGroup.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT
        )
        setBackgroundColor(Color.parseColor("#07040C"))
        overScrollMode = View.OVER_SCROLL_NEVER
        isVerticalScrollBarEnabled = false
        isHorizontalScrollBarEnabled = false
        setLayerType(View.LAYER_TYPE_HARDWARE, null)

        with(settings) {
            javaScriptEnabled = true
            javaScriptCanOpenWindowsAutomatically = true
            domStorageEnabled = true
            // databaseEnabled está depreciado e é no-op nas WebViews modernas:
            // localStorage/IndexedDB já funcionam via domStorageEnabled.

            loadsImagesAutomatically = true
            blockNetworkImage = false
            mediaPlaybackRequiresUserGesture = false

            useWideViewPort = true
            loadWithOverviewMode = true
            setSupportZoom(false)
            builtInZoomControls = false
            displayZoomControls = false
            textZoom = 100 // fonte do sistema não quebra o layout do lobby

            cacheMode = WebSettings.LOAD_DEFAULT
            mixedContentMode = WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE

            // Com o asset loader não precisamos (nem devemos) liberar acesso a file://
            allowFileAccess = false
            allowContentAccess = false

            userAgentString = "$userAgentString FortuneGoApp/${BuildConfig.VERSION_NAME}"
        }

        addJavascriptInterface(bridge, "FortuneNative")

        webChromeClient = object : WebChromeClient() {
            override fun onProgressChanged(view: WebView?, newProgress: Int) {
                onProgress(newProgress)
            }

            override fun onShowFileChooser(
                webView: WebView?,
                filePathCallback: ValueCallback<Array<Uri>>?,
                fileChooserParams: FileChooserParams?
            ): Boolean {
                val callback = filePathCallback ?: return false
                val intent = fileChooserParams?.createIntent() ?: return false
                return onFileChooser(callback, intent)
            }

            override fun onPermissionRequest(request: android.webkit.PermissionRequest?) {
                // Só concedemos recursos pedidos pelo nosso próprio conteúdo local.
                if (request?.origin?.host == ASSET_DOMAIN) request.grant(request.resources)
                else request?.deny()
            }
        }

        webViewClient = object : WebViewClientCompat() {

            override fun shouldInterceptRequest(
                view: WebView,
                request: WebResourceRequest
            ): WebResourceResponse? = assetLoader.shouldInterceptRequest(request.url)

            override fun shouldOverrideUrlLoading(
                view: WebView,
                request: WebResourceRequest
            ): Boolean {
                val url = request.url
                val scheme = url.scheme?.lowercase() ?: return false

                // Conteúdo do próprio app continua dentro do WebView.
                if (url.host == ASSET_DOMAIN) return false
                if (scheme in EXTERNAL_SCHEMES) return onExternalUrl(url)

                // Links http(s) de terceiros abrem no navegador do sistema.
                if (scheme == "http" || scheme == "https") return onExternalUrl(url)
                return false
            }

            override fun onPageFinished(view: WebView, url: String) {
                super.onPageFinished(view, url)
                if (enhanceScript.isNotEmpty()) {
                    view.evaluateJavascript(enhanceScript, null)
                }
                view.evaluateJavascript(
                    "window.dispatchEvent(new CustomEvent('fortune:native-ready'));",
                    null
                )
                onPageFinished(view)
            }

            override fun onReceivedError(
                view: WebView,
                request: WebResourceRequest,
                error: WebResourceErrorCompat
            ) {
                if (!request.isForMainFrame) return
                val detail = runCatching { error.description?.toString() }.getOrNull().orEmpty()
                view.loadDataWithBaseURL(
                    START_URL,
                    errorPage(detail),
                    "text/html",
                    "UTF-8",
                    null
                )
            }
        }

        loadUrl(START_URL)
    }
}

private fun errorPage(detail: String): String = """
<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<style>
 :root{color-scheme:dark}
 body{margin:0;height:100vh;display:grid;place-items:center;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
      background:radial-gradient(120% 100% at 50% 0%,#1B0B22 0%,#07040C 70%);color:#F8FAFC;text-align:center;padding:24px}
 .c{max-width:340px}
 .e{font-size:56px;margin-bottom:8px;filter:drop-shadow(0 0 18px rgba(250,204,21,.6))}
 h1{font-size:20px;margin:0 0 8px;color:#FACC15}
 p{font-size:14px;line-height:1.5;color:#94A3B8;margin:0 0 22px}
 button{border:0;border-radius:999px;padding:14px 30px;font-size:15px;font-weight:700;color:#1B0B22;
        background:linear-gradient(135deg,#FDE68A,#FACC15 45%,#D97706);box-shadow:0 10px 24px rgba(250,204,21,.32)}
 small{display:block;margin-top:18px;color:#475569;font-size:11px;word-break:break-word}
</style></head><body>
<div class="c">
 <div class="e">🎰</div>
 <h1>Não foi possível carregar</h1>
 <p>Verifique sua conexão e tente novamente. O conteúdo offline do app continua disponível.</p>
 <button onclick="location.href='$START_URL'">Tentar de novo</button>
 <small>${detail.take(140)}</small>
</div></body></html>
""".trimIndent()
