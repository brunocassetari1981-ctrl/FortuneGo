# FortuneGo 🎰

App Android (Kotlin + Jetpack Compose) que roda um lobby de cassino em WebView **100% offline**,
com motor de resgate de imagens e uma camada pesada de interatividade.

---

## 🔍 Por que os ícones dos jogos não apareciam

A versão anterior carregava o HTML assim:

```kotlin
loadDataWithBaseURL("file:///android_asset/", htmlContent, "text/html", "UTF-8", null)
```

Isso cria uma página com **origem opaca** (`null origin`). Nesse modo o WebView bloqueia boa parte
dos sub-recursos relativos — e era por isso que as `<img>` ficavam quebradas, mesmo com o arquivo
existindo dentro de `assets/`. Os paliativos usados (`allowUniversalAccessFromFileURLs`,
`onReceivedSslError { proceed() }` e um `setInterval` de 300 ms reescrevendo `img.src`) não
resolviam a causa e ainda abriam três buracos sérios: acesso universal a arquivos locais,
aceitação cega de certificado inválido e um loop infinito consumindo bateria.

### A correção

Os assets agora são servidos pelo **`WebViewAssetLoader`** em um domínio HTTPS virtual:

```
https://appassets.androidplatform.net/assets/index.html
```

Com uma origem HTTPS real, tudo volta a funcionar naturalmente: caminhos relativos,
`background-image` do CSS, `fetch`/XHR, `localStorage`, IndexedDB, canvas e Web Audio.
Resultado: nenhum hack necessário, e o app ficou mais seguro
(`allowFileAccess = false`, sem bypass de SSL, sem `setInterval`).

---

## 🖼️ Motor de resgate de imagens (`js/fortune-enhance.js`)

Mesmo com o caminho certo, HTML de terceiros costuma apontar para arquivos inexistentes.
O enhancer resolve isso em três camadas:

| Camada | O que faz |
|---|---|
| **1. Resolução de caminho** | Para cada `<img>` quebrada, monta até 90 candidatos combinando pastas comuns (`img/`, `images/`, `imagens/`, `assets/img/`, `icons/`, `jogos/`…) × extensões (`.png`, `.webp`, `.jpg`, `.svg`…) × variações do nome (slug sem acento, minúsculas). Testa um a um e usa o primeiro que carregar. |
| **2. Ícone procedural** | Se nenhum arquivo existir, gera na hora um SVG com gradiente (cor derivada do hash do nome), emoji escolhido por palavra-chave (tigre → 🐯, roleta → 🎡, aviator → ✈️…) e as iniciais do jogo. **Nunca sobra ícone quebrado na tela.** |
| **3. Observação contínua** | `MutationObserver` + captura global de evento `error` substituem o antigo `setInterval(300ms)`. Pega imagens criadas dinamicamente, lazy-load (`data-src`, `data-original`) e `background-image` de CSS. |

Os jogos **Mina de Ouro**, **Aviador Fortune** e **Bingo Imperial** apontam de propósito para
arquivos que não existem — eles demonstram a camada 2 funcionando ao vivo.

---

## ✨ Camada de interatividade

Aplicada automaticamente a qualquer card que contenha uma imagem — funciona também no **seu**
HTML, sem precisar editar nada:

- **Tilt 3D** seguindo o dedo/mouse (perspectiva de 680 px)
- **Ripple dourado** no ponto exato do toque
- **Pressão elástica** (`scale .945` + brilho) com retorno suave
- **Explosão de moedas** 🪙💰✨💎 no ponto do toque
- **Shimmer** varrendo o card e **flutuação + glow** pulsante no ícone
- **Entrada escalonada** via `IntersectionObserver` (com rede de segurança anti-invisibilidade)
- **Vibração nativa** (ponte Kotlin) e **som sintetizado** por Web Audio — zero arquivos de áudio
- Respeita `prefers-reduced-motion` e mantém foco/teclado acessíveis

### API disponível para o seu JavaScript

```js
FortuneGo.refresh()            // reprocessa a tela inteira
FortuneGo.fixImages()          // só o resgate de imagens
FortuneGo.resolve(src, cb)     // descobre o caminho real de um arquivo
FortuneGo.placeholder('Tigre') // data-URI de ícone gerado
FortuneGo.haptic(12)           // vibração curta
FortuneGo.hapticWin()          // padrão de vitória
FortuneGo.sound(880, .1)       // bipe sintetizado
FortuneGo.coins(x, y, 8)       // explosão de moedas
FortuneGo.confetti()           // comemoração completa
FortuneGo.toast('Depósito ok') // toast nativo (ou HTML no navegador)
FortuneGo.share('texto')       // compartilhamento nativo
FortuneGo.pushModal(closeFn)   // registra modal p/ o botão físico "voltar" fechar
```

### Ponte nativa (`window.FortuneNative`)

`haptic(ms)` · `tick()` · `win()` · `toast(msg)` · `share(txt)` · `openExternal(url)` ·
`isOnline()` · `keepAwake(bool)` · `appVersion()` · `platform()` · `exit()`

Sempre chame com proteção (`window.FortuneNative?.tick()`) para o mesmo HTML continuar
funcionando no navegador.

---

## 🎮 O que o lobby de demonstração traz

Carrossel de banners com swipe · jackpot com contador ao vivo · busca com debounce ·
filtros (Em alta / Novos / Ao vivo / Favoritos) · grade de 9 jogos com favoritar ·
**caça-níquel funcional de 3 rolos** (aposta ajustável, animação de parada escalonada,
tabela de prêmios, confete e vibração na vitória) · carteira com estatísticas e histórico ·
4 abas de navegação · saldo e favoritos persistidos em `localStorage`.

---

## 📁 Estrutura

```
FortuneGo/
├── app/
│   ├── build.gradle.kts
│   └── src/main/
│       ├── AndroidManifest.xml
│       ├── java/com/fortunego/app/
│       │   ├── MainActivity.kt      # Activity Compose + splash + voltar inteligente
│       │   ├── FortuneWebView.kt    # WebView, asset loader, clients, página de erro
│       │   └── NativeBridge.kt      # @JavascriptInterface (vibração, toast, share…)
│       ├── assets/                  # ⬅️ seu app web mora aqui
│       │   ├── index.html
│       │   ├── css/fortune.css
│       │   ├── js/fortune-enhance.js   # motor de imagens + interatividade
│       │   ├── js/fortune-lobby.js     # lobby + caça-níquel
│       │   └── img/*.png|webp          # ícones dos jogos (512×512)
│       └── res/                     # ícone adaptativo, tema, splash, strings
├── build.gradle.kts
└── settings.gradle.kts
```

---

## 🔌 Como usar o SEU `index.html`

1. Copie seus arquivos para `app/src/main/assets/` mantendo as pastas (`img/`, `css/`, `js/`…).
2. Garanta que o `index.html` esteja na **raiz** de `assets/`.
3. Opcional: adicione `<script src="js/fortune-enhance.js" defer></script>` no seu HTML.
   Não é obrigatório — o `MainActivity` injeta o script de qualquer forma no `onPageFinished`,
   e a flag `__FORTUNE_ENHANCE__` impede execução duplicada.
4. Rode. Os ícones aparecem mesmo com caminhos errados, e os cards ganham a camada interativa
   automaticamente.

Para desligar os efeitos em um elemento específico, adicione a classe `fg-no-enhance`.

---

## 🛠️ Build

Pré-requisitos: Android Studio Ladybug+ · JDK 17 · Android SDK 35.

```bash
# Android Studio: File ▸ Open ▸ pasta FortuneGo  (ele gera o gradle wrapper sozinho)
./gradlew assembleDebug      # APK de debug
./gradlew installDebug       # instala no aparelho conectado
./gradlew assembleRelease    # release com R8 + shrink de recursos
```

O APK sai em `app/build/outputs/apk/`.

> O wrapper (`gradlew`, `gradle-wrapper.jar`) não está versionado aqui — o Android Studio o cria
> na primeira abertura, ou rode `gradle wrapper --gradle-version 8.9` se tiver o Gradle instalado.

### Preview no navegador (sem compilar)

```bash
python3 -m http.server 8080 --bind 0.0.0.0 --directory app/src/main/assets
```

A mesma interface roda no navegador; só a vibração nativa fica indisponível
(cai automaticamente para `navigator.vibrate`).

---

## 🔐 Notas de segurança

- `allowFileAccess`, `allowContentAccess` e o acesso universal a `file://` estão **desligados**.
- Nenhum bypass de erro de SSL — certificado inválido falha como deve falhar.
- `@JavascriptInterface` exposto apenas ao conteúdo próprio servido em `appassets.androidplatform.net`;
  links externos saem para o navegador do sistema.
- Regras de ProGuard preservam a ponte JS no release.
- Permissões de câmera/microfone só são concedidas ao conteúdo local.

---

## ⚠️ Aviso

Projeto de demonstração técnica. O caça-níquel usa `Math.random()` local e **nenhum valor real é
movimentado**. Publicar um app de apostas reais exige licença, verificação de idade, ferramentas
de jogo responsável e conformidade com as políticas do Google Play.
