plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
}

// Nível de SDK vem do gradle.properties (fortunego.sdk) para o CI e a sua máquina
// poderem usar valores diferentes sem editar este arquivo.
val fortuneSdk = (providers.gradleProperty("fortunego.sdk").orNull ?: "35").toInt()

android {
    namespace = "com.fortunego.app"
    compileSdk = fortuneSdk

    defaultConfig {
        applicationId = "com.fortunego.app"
        minSdk = 24
        targetSdk = fortuneSdk
        versionCode = 1
        versionName = "1.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
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
