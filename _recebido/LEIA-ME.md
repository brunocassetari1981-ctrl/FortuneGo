# Área de staging — código original recebido

Arquivos enviados pelo Bruno, guardados **exatamente como vieram**, sem nenhuma alteração.
Servem de referência durante a integração e serão removidos quando o merge terminar.

| Arquivo | Caminho real no projeto | Recebido em |
|---|---|---|
| `MainActivity.kt` | `app/src/main/java/com/fortunego/app/MainActivity.kt` | 03/10/2026 |
| `AndroidManifest.xml` | `app/src/main/AndroidManifest.xml` | 03/10/2026 |
| `build.gradle.kts` | `app/build.gradle.kts` | 03/10/2026 |

## Ainda faltam

- [ ] `gradle/libs.versions.toml` (version catalog — **crítico**, o build usa `libs.*`)
- [ ] `build.gradle.kts` (raiz) e `settings.gradle.kts`
- [ ] `app/src/main/res/values/themes.xml`, `colors.xml`, `strings.xml`
- [ ] `app/src/main/res/xml/backup_rules.xml` e `data_extraction_rules.xml`
- [ ] `app/src/main/assets/index.html` ← **o mais importante para o problema das imagens**
- [ ] CSS/JS usados pelo `index.html`
- [ ] Lista dos arquivos de imagem que o HTML referencia
