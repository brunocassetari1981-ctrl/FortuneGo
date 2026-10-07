plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
}

// Nível de SDK vem do gradle.properties (fortunego.sdk) para o CI e a sua máquina
// poderem usar valores diferentes sem editar este arquivo.
val fortuneSdk = (providers.gradleProperty("fortunego.sdk").orNull ?: "35").toInt()

// Versão do app. O CI pode sobrescrever com -Pfortunego.versionCode=N para
// publicar atualizações que instalam por cima da anterior.
val fortuneVersionCode = (providers.gradleProperty("fortunego.versionCode").orNull ?: "2").toInt()
val fortuneVersionName = providers.gradleProperty("fortunego.versionName").orNull ?: "1.1"

/* ---------------------------------------------------------------------------
 * ASSINATURA DE RELEASE
 *
 * Um APK assinado com a chave de DEBUG é tratado pelo Android/Play Protect
 * como aplicativo não verificado — é daí que vem o aviso de "app nocivo" ao
 * instalar fora da loja. Com uma chave de release estável o aviso some e,
 * de quebra, as próximas versões instalam por cima desta.
 *
 * A chave de demonstração em keystore/fortunego.p12 está versionada de
 * propósito, para qualquer pessoa conseguir compilar. Para publicar de
 * verdade, defina as variáveis de ambiente abaixo com a SUA chave (e nunca
 * a coloque no Git).
 * ------------------------------------------------------------------------- */
val ksPath = providers.environmentVariable("FORTUNEGO_KEYSTORE").orNull ?: "keystore/fortunego.p12"
val ksFile = rootProject.file(ksPath)
val ksPass = providers.environmentVariable("FORTUNEGO_KEYSTORE_PASSWORD").orNull ?: "fortunego"
val ksAlias = providers.environmentVariable("FORTUNEGO_KEY_ALIAS").orNull ?: "fortunego"
val ksKeyPass = providers.environmentVariable("FORTUNEGO_KEY_PASSWORD").orNull ?: ksPass

android {
    namespace = "com.fortunego.app"
    compileSdk = fortuneSdk

    defaultConfig {
        applicationId = "com.fortunego.app"
        minSdk = 24
        targetSdk = fortuneSdk
        versionCode = fortuneVersionCode
        versionName = fortuneVersionName

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    signingConfigs {
        create("release") {
            if (ksFile.exists()) {
                storeFile = ksFile
                storePassword = ksPass
                keyAlias = ksAlias
                keyPassword = ksKeyPass
                storeType = "PKCS12"
                // v1 cobre Android 6; v2/v3 são as assinaturas que o sistema
                // valida no Android 7+ e que o Play Protect espera encontrar.
                enableV1Signing = true
                enableV2Signing = true
                enableV3Signing = true
            } else {
                logger.warn("FortuneGo: $ksPath não encontrado — release sairá sem assinatura.")
            }
        }
    }

    buildTypes {
        release {
            // R8 desligado de propósito: sem regras de keep ele removeria os
            // métodos @JavascriptInterface da ponte com o WebView.
            isMinifyEnabled = false
            isShrinkResources = false
            isDebuggable = false
            if (ksFile.exists()) signingConfig = signingConfigs.getByName("release")
        }
        debug {
            isDebuggable = true
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }
    buildFeatures {
        compose = true
        buildConfig = true
    }
}

// Alinha o Kotlin ao Java 11 — sem isso o AGP recente estoura
// "Inconsistent JVM-target compatibility between Java and Kotlin".
kotlin {
    compilerOptions {
        jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_11)
    }
}

dependencies {
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.activity.compose)
    implementation(libs.androidx.compose.material3)
    implementation(libs.androidx.compose.ui)
    implementation(libs.androidx.compose.ui.graphics)
    implementation(libs.androidx.compose.ui.tooling.preview)
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.lifecycle.runtime.ktx)

    // --- Adicionados para o FortuneGo (coordenadas diretas: funcionam com
    // qualquer version catalog; versões do Compose vêm do BOM acima) ---
    implementation("androidx.webkit:webkit:1.12.1")             // WebViewAssetLoader
    implementation("androidx.compose.animation:animation")       // AnimatedVisibility do splash
    implementation("androidx.compose.foundation:foundation")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.8.7")

    debugImplementation(libs.androidx.compose.ui.tooling)
}

/* ---------------------------------------------------------------------------
 * Gera assets/img/manifest.json com o inventário real de imagens do app.
 * O fortune-enhance.js usa esse índice para casar caminhos errados do HTML
 * com os arquivos que de fato existem. Defensivo: sem assets, não faz nada.
 * ------------------------------------------------------------------------- */
val assetsDir = file("src/main/assets")

val generateAssetManifest = tasks.register("generateAssetManifest") {
    val dir = assetsDir
    outputs.upToDateWhen { false }
    doLast {
        if (!dir.exists()) return@doLast
        val exts = setOf("png", "jpg", "jpeg", "webp", "gif", "svg", "avif", "bmp")
        val files = dir.walkTopDown()
            .filter { it.isFile && it.extension.lowercase() in exts }
            .map { it.relativeTo(dir).invariantSeparatorsPath }
            .sorted()
            .toList()
        val target = File(dir, "img/manifest.json")
        target.parentFile.mkdirs()
        target.writeText(
            if (files.isEmpty()) "[]\n"
            else files.joinToString(",\n  ", "[\n  ", "\n]\n") { "\"$it\"" }
        )
        logger.lifecycle("FortuneGo: manifest de assets gerado com ${files.size} imagens")
    }
}

tasks.named("preBuild") { dependsOn(generateAssetManifest) }
