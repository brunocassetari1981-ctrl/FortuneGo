# Mantém a ponte JavaScript <-> Kotlin intacta no release.
-keepclassmembers class com.fortunego.app.NativeBridge {
    public *;
}
-keepattributes JavascriptInterface
-keepattributes *Annotation*

# WebView com interface JS
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
