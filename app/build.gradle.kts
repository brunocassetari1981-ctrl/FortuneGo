plugins {
    alias(libs.plugins.android.application)
    // Se o Gradle reclamar "Kotlin not configured" / não compilar os .kt,
    // descomente a linha abaixo — o template do Android Studio traz os 3 plugins.
    // alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
}

android {
    namespace = "com.fortunego.app"
    compileSdk = 37

    defaultConfig {
        applicationId = "com.fortunego.app"
        minSdk = 24
        targetSdk = 37
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
    // Alinha o Kotlin ao Java 11 — sem isso o AGP recente estoura
    // "Inconsistent JVM-target compatibility between Java and Kotlin".
    kotlin {
        compilerOptions {
            jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_11)
        }
    }
    buildFeatures {
        compose = true
        buildConfig = true
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

    // --- Adicionados para o FortuneGo (coordenadas diretas: não exigem mexer
    // no libs.versions.toml; as versões do Compose vêm do BOM acima) ---
    implementation("androidx.webkit:webkit:1.12.1")            // WebViewAssetLoader
    implementation("androidx.compose.animation:animation")      // AnimatedVisibility do splash
    implementation("androidx.compose.foundation:foundation")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.8.7")
}

/* ---------------------------------------------------------------------------
 * Gera assets/img/manifest.json com o inventário real de imagens do app.
 * O fortune-enhance.js usa esse índice para casar caminhos errados do HTML
 * com os arquivos que de fato existem (inclusive por semelhança de nome).
 * É defensivo: se não houver pasta de assets, simplesmente não faz nada.
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
