# FortuneGo 🎰

App Android (Kotlin + Compose) que roda um lobby de cassino em WebView **100% offline**,
com motor de resgate de imagens em 4 camadas e uma camada pesada de interatividade.

---

## 🔍 Por que os ícones dos jogos não apareciam

O código original carregava o HTML assim:

```kotlin
try {
    val htmlContent = context.assets.open("index.html").bufferedReader().use { it.readText() }
    loadDataWithBaseURL("file:///android_asset/", htmlContent, "text/html", "UTF-8", null)  // ❌
} catch (e: Exception) {
    loadUrl("file:///android_asset/index.html")   // ✅ a solução estava aqui — e nunca rodava
}
```

`loadDataWithBaseURL` cria uma página com **origem opaca** (`null origin`). Nesse modo o WebView
bloqueia boa parte dos sub-recursos relativos — por isso as `<img>` quebravam mesmo com o arquivo
presente em `assets/`. E como `assets.open("index.html")` nunca falha, o `catch` — que tinha o
caminho correto — **jamais era executado**.

Os paliativos (`allowUniversalAccessFromFileURLs`, `onReceivedSslError { proceed() }` e um
`setInterval` de 300 ms reescrevendo `img.src`) não atacavam a causa e ainda abriam três brechas:
acesso universal a arquivos locais, aceite cego de certificado inválido e um loop infinito
consumindo bateria.

### A correção

Os assets passam a ser servidos pelo **`WebViewAssetLoader`** num domínio HTTPS virtual:

```
https://appassets.androidplatform.net/assets/index.html
```

Com uma origem HTTPS real tudo volta a funcionar naturalmente: caminhos relativos,
`background-image`, `fetch`/XHR, `localStorage`, IndexedDB, canvas e Web Audio.

> **Sem querer a dependência `androidx.webkit`?** Trocar o `loadDataWithBaseURL` por
> `loadUrl("file:///android_asset/index.html")` já resolve a maior parte do problema.
> O asset loader é melhor porque habilita `fetch`, storage e origem segura.

---

## 🖼️ Motor de resgate de imagens — 4 camadas

Mesmo com a origem certa, HTML real aponta para arquivos que não existem, com nome em inglês,
na pasta errada ou com sufixo de tamanho. O `js/fortune-enhance.js` resolve assim:

| # | Camada | Como funciona |
|---|---|---|
| 1 | **Inventário real** | Lê `assets/img/manifest.json` (gerado no build) e localiza o arquivo exato. |
| 2 | **Casamento fuzzy** | Compara nome do arquivo, `alt` e texto do card contra o inventário usando dicionário PT/EN (tiger↔tigre, mines↔mina, plane↔aviator, ox↔touro, mouse↔rato…) + distância de edição. |
| 3 | **Força bruta** | Testa até 90 combinações de pasta × extensão (`img/`, `images/`, `assets/img/`, `icons/`… × `.png/.webp/.jpg/.svg`). |
| 4 | **Ícone procedural** | Gera um SVG na hora: gradiente derivado do hash do nome, emoji por palavra-chave e iniciais. **Nunca sobra ícone quebrado.** |

### Prova de funcionamento

```bash
node tools/test-matcher.js
```

```
✅ images/fortune_tiger_icon.png   alt="Fortune Tiger"   → img/tigre.png
✅ icons/tiger.webp                alt=""                → img/tigre.png
✅ assets/game/DRAGON.PNG          alt="Dragon Gold"     → img/dragao.png
✅ foo/bar/rabbit-icon.jpg         alt="Fortune Rabbit"  → img/coelho.png
✅ img/fortune-ox.png              alt="Fortune Ox"      → img/touro.png
✅ icone_mouse.png                 alt="Fortune Mouse"   → img/rato.png
✅ games/roulette.png              alt="Roleta ao vivo"  → img/roleta.png
✅ img/mines.png                   alt="Mines"           → img/mina-de-ouro.png
✅ thumbs/plane.png                alt="Aviator"         → img/aviator.png
✅ x/spaceman.png                  alt="Spaceman"        → img/espaco.png
✅ y/penalty.png                   alt="Penalty Shoot"   → img/futebol.png
✅ z/bingo77.png                   alt="Bingo"           → img/bingo-imperial.png
✅ tigrinho.png                    alt=""                → img/tigre.png
✅ img/panda_icon_120x120.png      alt=""                → img/panda.png

14/14 casos corretos
```

Ou seja: **não importa como o seu `index.html` escreve o caminho** — o ícone aparece.

### Diagnóstico dentro do app

Segure **1,2 s no mascote do topo** (ou chame `FortuneGo.diagnose()`) para abrir o laudo:
cada imagem da tela, o caminho original, o arquivo em que ela foi resolvida e se virou
ícone gerado.

---

## ✨ Camada de interatividade

Aplicada automaticamente a qualquer card que contenha imagem — **inclusive no seu HTML**,
sem editar nada:

- **Tilt 3D** seguindo o dedo/mouse · **ripple dourado** no ponto do toque
- **Pressão elástica** + brilho · **explosão de moedas** 🪙💰✨💎
- **Shimmer** varrendo o card · **flutuação + glow** pulsante no ícone
- **Entrada escalonada** com `IntersectionObserver` (e rede de segurança anti-invisibilidade)
- **Vibração nativa** (ponte Kotlin) e **som sintetizado** via Web Audio — zero arquivos de áudio
- Respeita `prefers-reduced-motion`, mantém foco/teclado acessíveis

### API para o seu JavaScript

```js
FortuneGo.refresh()             // reprocessa a tela
FortuneGo.fixImages()           // só o resgate de imagens
FortuneGo.diagnose()            // laudo visual das imagens
FortuneGo.manifest()            // lista de arquivos indexados
FortuneGo.resolve(src, cb)      // descobre o caminho real de um arquivo
FortuneGo.placeholder('Tigre')  // data-URI de ícone gerado
FortuneGo.haptic(12) / hapticWin()
FortuneGo.sound(880, .1) / toggleSound()
FortuneGo.coins(x, y, 8) / confetti()
FortuneGo.toast('Depósito ok') / share('texto')
FortuneGo.pushModal(closeFn)    // o botão físico "voltar" fecha o modal
```

### Ponte nativa (`window.FortuneNative`)

`haptic(ms)` · `tick()` · `win()` · `toast(msg)` · `share(txt)` · `openExternal(url)` ·
`isOnline()` · `keepAwake(bool)` · `appVersion()` · `platform()` · `exit()`

Chame sempre protegido (`window.FortuneNative?.tick()`) para o mesmo HTML rodar no navegador.

---

## 🎮 Lobby de demonstração

Carrossel com swipe · jackpot ao vivo · busca com debounce · filtros · 14 jogos com favoritar ·
**caça-níquel funcional de 3 rolos** (aposta ajustável, parada escalonada, tabela de prêmios,
confete e vibração na vitória) · carteira com estatísticas e histórico · 4 abas ·
saldo e favoritos em `localStorage`.

Os dois últimos cards do catálogo têm caminho errado **de propósito**:
`images/fortune_tiger_icon.png` (resolve para `img/tigre.png` pelo dicionário) e
`img/jogo-inexistente.png` (cai no ícone procedural).

---

## 📁 Estrutura

```
FortuneGo/
├── app/
│   ├── build.gradle.kts              # seu catalog + webkit + task generateAssetManifest
│   └── src/main/
│       ├── AndroidManifest.xml
│       ├── java/com/fortunego/app/
│       │   ├── MainActivity.kt       # Activity Compose, splash, voltar inteligente
│       │   ├── FortuneWebView.kt     # WebView, asset loader, clients, página de erro
│       │   └── NativeBridge.kt       # @JavascriptInterface
│       ├── assets/                   # ⬅️ seu app web mora aqui
│       │   ├── index.html
│       │   ├── css/fortune.css
│       │   ├── js/fortune-enhance.js # motor de imagens + interatividade
│       │   ├── js/fortune-lobby.js
│       │   └── img/                  # 13 ícones 512px + manifest.json
│       └── res/                      # ícone adaptativo, tema, splash, backup rules
├── tools/
│   ├── gen-asset-manifest.py         # regenera o inventário à mão
│   └── test-matcher.js               # teste do motor de resgate
└── _recebido/                        # cópia intacta do código original enviado
```

---

## 🔌 Integrando no SEU projeto

1. Copie os **3 arquivos Kotlin** para `app/src/main/java/com/fortunego/app/`
   (substituindo o seu `MainActivity.kt`).
2. Copie **`assets/js/fortune-enhance.js`** e a pasta **`assets/img/`** para os seus assets.
   ⚠️ O `index.html` deste repositório é o lobby de demonstração — **não sobrescreva o seu**.
3. No `app/build.gradle.kts`, adicione:
   ```kotlin
   implementation("androidx.webkit:webkit:1.12.1")
   implementation("androidx.compose.animation:animation")
   implementation("androidx.compose.foundation:foundation")
   implementation("androidx.lifecycle:lifecycle-runtime-compose:2.8.7")
   ```
4. No `AndroidManifest.xml`, acrescente `<uses-permission android:name="android.permission.VIBRATE" />`
   e o `android:configChanges=...` na Activity (senão girar a tela recarrega o WebView).
5. Rode `python3 tools/gen-asset-manifest.py` (ou deixe o Gradle gerar no build).

Não precisa incluir o script no HTML: o `MainActivity` injeta no `onPageFinished`.
Para desligar os efeitos num elemento, use a classe `fg-no-enhance`.

### Ajustes já feitos no seu `build.gradle.kts`

- `kotlin { compilerOptions { jvmTarget = JVM_11 } }` — evita o erro *"Inconsistent JVM-target
  compatibility between Java and Kotlin"*, já que o `compileOptions` está em Java 11.
- `buildConfig = true` — necessário para `BuildConfig.DEBUG` / `VERSION_NAME`.
- Task `generateAssetManifest` ligada ao `preBuild`.
- ⚠️ O bloco `plugins` do seu arquivo tem só 2 aliases. O template do Android Studio traz
  `alias(libs.plugins.kotlin.android)` também — deixei a linha comentada; se o Gradle reclamar
  que não compila Kotlin, é só descomentar.

---

## 📲 Baixar o APK pronto

O GitHub Actions compila o app a cada push e publica o APK numa release:

### 👉 [**Baixar FortuneGo.apk**](https://github.com/brunocassetari1981-ctrl/FortuneGo/releases/tag/apk)

Abra esse link **no navegador do celular**, baixe o arquivo e toque nele.

> ⚠️ **Já tinha a versão antiga instalada?** Desinstale primeiro. A assinatura mudou de
> debug para release, e o Android nunca deixa atualizar por cima quando a chave é outra.

| | |
|---|---|
| Tamanho | ~19 MB |
| Tipo | **release assinado** (chave estável, esquemas v1 + v2 + v3) |
| Depurável | não (`debuggable=false`) |
| Permissões | só 3: internet, estado da rede e vibração |
| Conteúdo verificado | `index.html`, `game.html`, `css/`, `js/`, `img/manifest.json` e **45 imagens** |
| Workflow | [`.github/workflows/build-apk.yml`](.github/workflows/build-apk.yml) |

### Sobre o aviso de vírus na instalação

Dá para separar dois avisos bem diferentes que o Android mostra:

| Aviso | Sai? | Por quê |
|---|---|---|
| *"Este tipo de arquivo pode prejudicar seu dispositivo"* / *"Instalar apps de fontes desconhecidas"* | **não** | O Android mostra isso para **qualquer** APK instalado fora da Play Store, inclusive de apps famosos. É o aviso de sideload, não uma acusação ao app. |
| *"App nocivo bloqueado"* / *"App não verificado"* do **Play Protect** | **sim** | Vinha de o APK ser **debug**: chave de debug, `debuggable=true`. Agora é release assinado, e esses gatilhos sumiram. |

O que foi feito concretamente para isso:

* **Assinatura de release com chave estável** (`keystore/fortunego.p12`, RSA 2048, válida até 2056),
  nos esquemas v1, v2 e v3 — o CI quebra o build se o APK sair sem assinatura v2.
* **`debuggable=false`** — o CI confere com `aapt2 dump badging` e falha se voltar.
* **Permissões mínimas** — `INTERNET`, `ACCESS_NETWORK_STATE`, `VIBRATE`. Nada de SMS,
  contatos, localização ou instalação de pacotes, que são os pedidos que mais disparam heurística.
* **Sem tráfego em texto puro** (`usesCleartextTraffic=false`) e sem bypass de SSL.
* **Sem código ofuscado nem carregamento dinâmico** — R8 continua desligado de propósito,
  então não há `DexClassLoader`, que é um clássico sinalizador de malware.

A chave versionada é de **demonstração**, para qualquer um conseguir compilar. Para publicar
de verdade, gere a sua e passe por variáveis de ambiente — o Gradle já lê:
`FORTUNEGO_KEYSTORE`, `FORTUNEGO_KEYSTORE_PASSWORD`, `FORTUNEGO_KEY_ALIAS`, `FORTUNEGO_KEY_PASSWORD`.

O workflow roda: JDK 17 → Android SDK → confere a chave → gera o inventário de imagens →
**três suítes de teste** (`test-matcher.js`, `test-slot.js`, `test-ui-smoke.js`; o build falha se
qualquer uma regredir) → `assembleRelease` → verifica a assinatura e o `debuggable` →
publica o APK como artefato e como release.
O resultado de cada build também vira comentário na issue *Relatório de build (CI)*.

---

## 🛠️ Build e preview

```bash
# Android Studio: File ▸ Open ▸ pasta FortuneGo
./gradlew assembleDebug        # APK de debug
./gradlew installDebug         # instala no aparelho

# Preview da interface no navegador, sem compilar nada:
python3 -m http.server 8080 --bind 0.0.0.0 --directory app/src/main/assets

# Testes
node tools/test-matcher.js
python3 tools/gen-asset-manifest.py
```

---

## 🔐 Segurança

- `allowFileAccess`, `allowContentAccess` e acesso universal a `file://` **desligados**.
- Sem bypass de erro de SSL — certificado inválido falha como deve.
- `@JavascriptInterface` exposto só ao conteúdo local; links externos vão para o navegador.
- Permissões de câmera/microfone concedidas apenas à origem `appassets.androidplatform.net`.

---

## ⚠️ Aviso

Demonstração técnica. O caça-níquel usa `Math.random()` local e **nenhum valor real é
movimentado**. Publicar apostas reais exige licença, verificação de idade, ferramentas de jogo
responsável e conformidade com as políticas do Google Play.
