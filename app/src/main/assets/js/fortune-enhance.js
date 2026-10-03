/*!
 * FortuneGo Enhance v2.0 — motor de resgate de imagens + camada de interatividade
 * ---------------------------------------------------------------------------
 * Este arquivo é injetado pelo MainActivity (onPageFinished) E também pode ser
 * incluído direto no HTML com <script src="js/fortune-enhance.js" defer></script>.
 * A dupla inclusão é segura: a flag __FORTUNE_ENHANCE__ impede execução repetida.
 *
 * O que ele faz:
 *  1. RESGATE DE IMAGENS — toda <img> quebrada é reprocessada: o caminho é testado
 *     contra uma lista de pastas/extensões comuns até achar o arquivo real. Se nada
 *     existir, um ícone SVG procedural (gradiente + emoji + iniciais) é gerado na hora,
 *     então NUNCA sobra aquele ícone quebrado na tela.
 *  2. INTERATIVIDADE — cards ganham tilt 3D, ripple, pressão elástica, brilho pulsante,
 *     shimmer, entrada escalonada, explosão de moedas, vibração nativa e som sintetizado.
 *  3. API pública em window.FortuneGo para o app web usar.
 */
(function () {
  'use strict';

  if (window.__FORTUNE_ENHANCE__) return;
  window.__FORTUNE_ENHANCE__ = '2.0.0';

  var doc = document;
  var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var HAS_NATIVE = typeof window.FortuneNative !== 'undefined';

  /* ===================================================================== *
   * 1. RESOLUÇÃO DE CAMINHOS DE IMAGEM
   * ===================================================================== */

  // Diretório do documento atual: funciona em https://appassets.../assets/,
  // em file:///android_asset/ e no navegador durante o desenvolvimento.
  var BASE = (function () {
    var href = location.href.replace(/[?#].*$/, '');
    return /\/$/.test(href) ? href : href.replace(/[^/]*$/, '');
  })();

  var ANDROID_ASSET = 'file:///android_asset/';
  var EXTRA_ROOTS = [BASE];
  if (location.protocol === 'file:') EXTRA_ROOTS.push(ANDROID_ASSET);
  if (location.hostname === 'appassets.androidplatform.net') {
    EXTRA_ROOTS.push(location.origin + '/assets/');
  }

  var FOLDERS = [
    '', 'img/', 'imgs/', 'image/', 'images/', 'imagens/',
    'icon/', 'icons/', 'icone/', 'icones/',
    'assets/', 'assets/img/', 'assets/images/', 'assets/icons/',
    'static/img/', 'static/images/', 'public/img/', 'public/images/',
    'games/', 'jogos/', 'media/', 'thumbs/', 'thumbnails/'
  ];

  var EXTS = ['', '.png', '.webp', '.jpg', '.jpeg', '.gif', '.svg'];

  var MAX_CANDIDATES = 90;

  function cleanPath(src) {
    return String(src || '')
      .replace(/[?#].*$/, '')
      .replace(/^\.\//, '')
      .replace(/^\/+/, '')
      .replace(/^(?:file:\/\/)?\/?android_asset\//, '');
  }

  function buildCandidates(rawSrc) {
    var path = cleanPath(rawSrc);
    if (!path) return [];

    var parts = path.split('/');
    var file = parts[parts.length - 1];
    var dot = file.lastIndexOf('.');
    var stem = dot > 0 ? file.slice(0, dot) : file;
    var ext = dot > 0 ? file.slice(dot) : '';

    var names = [];
    function pushName(n) { if (n && names.indexOf(n) === -1) names.push(n); }

    pushName(path);                      // caminho original relativo
    pushName(file);                      // só o nome do arquivo
    pushName(file.toLowerCase());
    pushName(stem.toLowerCase() + ext.toLowerCase());
    // nome normalizado: sem acento, espaços/underscores viram hífen
    var slug = stem.normalize ? stem.normalize('NFD').replace(/[\u0300-\u036f]/g, '') : stem;
    slug = slug.toLowerCase().replace(/[\s_]+/g, '-').replace(/[^a-z0-9.-]/g, '');
    pushName(slug + ext.toLowerCase());
    pushName(slug);

    var out = [];
    function push(url) {
      if (url && out.indexOf(url) === -1 && out.length < MAX_CANDIDATES) out.push(url);
    }

    for (var r = 0; r < EXTRA_ROOTS.length; r++) {
      var root = EXTRA_ROOTS[r];
      for (var f = 0; f < FOLDERS.length; f++) {
        for (var n = 0; n < names.length; n++) {
          var name = names[n];
          var hasExt = /\.[a-z0-9]{2,5}$/i.test(name);
          if (hasExt) {
            push(root + FOLDERS[f] + name);
            // mesma base, outras extensões (png -> webp -> jpg ...)
            var bare = name.replace(/\.[a-z0-9]{2,5}$/i, '');
            for (var e = 1; e < EXTS.length; e++) push(root + FOLDERS[f] + bare + EXTS[e]);
          } else {
            for (var e2 = 1; e2 < EXTS.length; e2++) push(root + FOLDERS[f] + name + EXTS[e2]);
          }
        }
      }
    }
    return out;
  }

  var urlCache = Object.create(null); // url -> true/false

  function probe(url, cb) {
    if (url in urlCache) { cb(urlCache[url]); return; }
    var img = new Image();
    var settled = false;
    function finish(ok) {
      if (settled) return;
      settled = true;
      urlCache[url] = ok;
      cb(ok);
    }
    img.onload = function () { finish(img.naturalWidth > 0); };
    img.onerror = function () { finish(false); };
    img.src = url;
    setTimeout(function () { finish(false); }, 5000);
  }

  function probeSequential(list, index, onFound, onExhausted) {
    if (index >= list.length) { onExhausted(); return; }
    probe(list[index], function (ok) {
      if (ok) onFound(list[index]);
      else probeSequential(list, index + 1, onFound, onExhausted);
    });
  }

  /* ---------- Ícone procedural: a imagem SEMPRE aparece ---------- */

  var EMOJI_MAP = [
    [/tig|tiger/i, '🐯'], [/drag|dragon|dragao|dragão/i, '🐉'],
    [/coelh|rabbit|bunny/i, '🐰'], [/boi|touro|ox|bull/i, '🐂'],
    [/panda|urso|bear/i, '🐼'], [/rato|mouse|mice/i, '🐭'],
    [/macac|monkey/i, '🐵'], [/galo|rooster|chicken/i, '🐔'],
    [/porco|pig|hog/i, '🐷'], [/cobra|snake/i, '🐍'],
    [/roleta|roulette/i, '🎡'], [/slot|caca|caça|niquel|níquel|frut/i, '🎰'],
    [/poker|carta|card|baralho/i, '🃏'], [/bingo|keno|loto/i, '🎱'],
    [/crash|aviator|aviao|avião|plane|fly/i, '✈️'], [/mina|mine|bomb/i, '💣'],
    [/dado|dice|craps/i, '🎲'], [/black ?jack|21/i, '♠️'],
    [/esporte|sport|bet|futebol|soccer/i, '⚽'], [/live|ao ?vivo|dealer/i, '🎥'],
    [/premio|prêmio|jackpot|prize|win/i, '🏆'], [/moeda|coin|gold|ouro/i, '🪙'],
    [/diamante|diamond|gem|joia|jewel/i, '💎'], [/fogo|fire|hot|quente/i, '🔥'],
    [/estrela|star|lucky|sorte|fortune/i, '⭐'], [/presente|gift|bonus|bônus/i, '🎁'],
    [/user|perfil|avatar|conta|profile/i, '👤'], [/pix|deposito|depósito|wallet|carteira/i, '💳']
  ];

  function pickEmoji(label) {
    for (var i = 0; i < EMOJI_MAP.length; i++) {
      if (EMOJI_MAP[i][0].test(label)) return EMOJI_MAP[i][1];
    }
    return '🎰';
  }

  function hashCode(str) {
    var h = 0;
    for (var i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
    return Math.abs(h);
  }

  function labelOf(img) {
    var raw = img.getAttribute('alt') || img.getAttribute('title') ||
      img.getAttribute('data-name') || cleanPath(img.getAttribute('src') || img.getAttribute('data-src') || '');
    raw = raw.replace(/\.[a-z0-9]{2,5}$/i, '').replace(/[-_]+/g, ' ').trim();
    return raw || 'FortuneGo';
  }

  function placeholderFor(img) {
    var label = labelOf(img);
    var hue = hashCode(label) % 360;
    var emoji = pickEmoji(label);
    var initials = label.split(/\s+/).slice(0, 2).map(function (w) {
      return w.charAt(0).toUpperCase();
    }).join('');

    var svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300">' +
        '<defs>' +
          '<linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
            '<stop offset="0%" stop-color="hsl(' + hue + ',72%,42%)"/>' +
            '<stop offset="55%" stop-color="hsl(' + ((hue + 28) % 360) + ',68%,26%)"/>' +
            '<stop offset="100%" stop-color="hsl(' + ((hue + 55) % 360) + ',74%,16%)"/>' +
          '</linearGradient>' +
          '<radialGradient id="s" cx="50%" cy="28%" r="70%">' +
            '<stop offset="0%" stop-color="#ffffff" stop-opacity=".30"/>' +
            '<stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>' +
          '</radialGradient>' +
        '</defs>' +
        '<rect width="300" height="300" rx="46" fill="url(#g)"/>' +
        '<rect width="300" height="300" rx="46" fill="url(#s)"/>' +
        '<rect x="7" y="7" width="286" height="286" rx="40" fill="none" stroke="#FACC15" stroke-opacity=".85" stroke-width="4"/>' +
        '<text x="150" y="152" font-size="110" text-anchor="middle" dominant-baseline="middle">' + emoji + '</text>' +
        '<text x="150" y="240" font-size="40" font-weight="700" fill="#FACC15" font-family="system-ui,sans-serif" ' +
          'text-anchor="middle" dominant-baseline="middle" opacity=".92">' + initials + '</text>' +
      '</svg>';

    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  /* ---------- Pipeline de correção ---------- */

  function markLoaded(img) {
    img.setAttribute('data-fg', 'ok');
    img.classList.add('fg-img-ready');
  }

  function rescue(img) {
    if (img.getAttribute('data-fg') === 'fixing') return;
    img.setAttribute('data-fg', 'fixing');

    // Suporte a lazy-load de terceiros (data-src, data-original, data-lazy...)
    var raw = img.getAttribute('src') ||
      img.getAttribute('data-src') || img.getAttribute('data-original') ||
      img.getAttribute('data-lazy') || img.getAttribute('data-lazy-src') || '';

    var candidates = buildCandidates(raw);
    if (!candidates.length) {
      img.src = placeholderFor(img);
      img.setAttribute('data-fg', 'placeholder');
      img.classList.add('fg-img-ready', 'fg-img-generated');
      return;
    }

    probeSequential(candidates, 0,
      function found(url) {
        img.src = url;
        markLoaded(img);
      },
      function exhausted() {
        img.src = placeholderFor(img);
        img.setAttribute('data-fg', 'placeholder');
        img.classList.add('fg-img-ready', 'fg-img-generated');
      }
    );
  }

  function inspect(img) {
    var state = img.getAttribute('data-fg');
    if (state === 'ok' || state === 'placeholder' || state === 'fixing') return;

    var src = img.getAttribute('src');
    var lazy = img.getAttribute('data-src') || img.getAttribute('data-original') || img.getAttribute('data-lazy');

    if (!src && lazy) { img.src = lazy; }

    if (img.complete) {
      if (img.naturalWidth > 0) markLoaded(img);
      else rescue(img);
      return;
    }

    img.addEventListener('load', function onLoad() {
      img.removeEventListener('load', onLoad);
      if (img.naturalWidth > 0) markLoaded(img);
    });
    img.addEventListener('error', function onErr() {
      img.removeEventListener('error', onErr);
      rescue(img);
    });
  }

  /** Corrige também background-image de CSS inline/computado quando o arquivo some. */
  function fixBackgrounds(root) {
    var nodes = (root || doc).querySelectorAll('[style*="background"], [class*="bg-"], [class*="thumb"], [class*="banner"]');
    Array.prototype.forEach.call(nodes, function (el) {
      if (el.getAttribute('data-fg-bg')) return;
      var bg = window.getComputedStyle(el).backgroundImage;
      var m = bg && bg.match(/url\((['"]?)([^'")]+)\1\)/);
      if (!m) return;
      var url = m[2];
      if (/^(data:|blob:|https?:)/i.test(url) && url.indexOf(location.origin) !== 0) return;
      el.setAttribute('data-fg-bg', '1');
      probe(url, function (ok) {
        if (ok) return;
        probeSequential(buildCandidates(url), 0, function (good) {
          el.style.backgroundImage = 'url("' + good + '")';
        }, function () { /* mantém como está */ });
      });
    });
  }

  function scanImages(root) {
    var imgs = (root || doc).querySelectorAll('img');
    Array.prototype.forEach.call(imgs, inspect);
  }

  // Captura global de erro de imagem (pega inclusive nós criados depois).
  doc.addEventListener('error', function (event) {
    var target = event.target;
    if (target && target.tagName === 'IMG') rescue(target);
  }, true);

  /* ===================================================================== *
   * 2. CAMADA DE INTERATIVIDADE
   * ===================================================================== */

  var CSS = [
    '@keyframes fgFloat{0%,100%{transform:translateY(0) rotate(0)}25%{transform:translateY(-4px) rotate(-1.6deg)}50%{transform:translateY(0) rotate(0)}75%{transform:translateY(-4px) rotate(1.6deg)}}',
    '@keyframes fgGlow{0%,100%{filter:drop-shadow(0 4px 10px rgba(250,204,21,.28))}50%{filter:drop-shadow(0 6px 22px rgba(250,204,21,.72))}}',
    '@keyframes fgShimmer{0%{transform:translateX(-120%) skewX(-18deg)}100%{transform:translateX(260%) skewX(-18deg)}}',
    '@keyframes fgRipple{to{transform:scale(2.6);opacity:0}}',
    '@keyframes fgCoin{0%{transform:translate(0,0) scale(.6);opacity:1}100%{transform:translate(var(--dx),var(--dy)) scale(1.15) rotate(var(--rot));opacity:0}}',
    '@keyframes fgPop{0%{transform:scale(.4);opacity:0}60%{transform:scale(1.12);opacity:1}100%{transform:scale(1);opacity:1}}',
    '.fg-card{position:relative;cursor:pointer;-webkit-tap-highlight-color:transparent;transform-style:preserve-3d;',
      'transition:transform .28s cubic-bezier(.22,1,.36,1),box-shadow .28s ease,filter .28s ease;will-change:transform}',
    '.fg-card.fg-press{transform:scale(.945) !important;filter:brightness(1.12)}',
    '.fg-card:focus-visible{outline:2px solid #FACC15;outline-offset:3px;border-radius:14px}',
    '.fg-card .fg-shine{position:absolute;inset:0;overflow:hidden;pointer-events:none;border-radius:inherit;z-index:3}',
    '.fg-card .fg-shine::before{content:"";position:absolute;top:-30%;left:0;width:38%;height:160%;',
      'background:linear-gradient(90deg,transparent,rgba(255,255,255,.42),transparent);animation:fgShimmer 3.6s ease-in-out infinite;animation-delay:var(--fg-delay,0s)}',
    '.fg-icon{animation:fgFloat 3.4s ease-in-out infinite,fgGlow 2.6s ease-in-out infinite;transform-origin:center bottom;backface-visibility:hidden}',
    '.fg-card.fg-press .fg-icon{animation-play-state:paused}',
    '.fg-ripple{position:absolute;border-radius:50%;background:radial-gradient(circle,rgba(250,204,21,.55),rgba(250,204,21,0) 70%);',
      'transform:scale(0);animation:fgRipple .62s ease-out forwards;pointer-events:none;z-index:4}',
    '.fg-coin{position:fixed;font-size:20px;pointer-events:none;z-index:99999;animation:fgCoin .85s cubic-bezier(.22,.7,.3,1) forwards;will-change:transform,opacity}',
    '.fg-reveal{opacity:0;transform:translateY(16px) scale(.96)}',
    '.fg-reveal.fg-in{opacity:1;transform:none;transition:opacity .55s ease var(--fg-delay,0s),transform .55s cubic-bezier(.22,1,.36,1) var(--fg-delay,0s)}',
    '.fg-img-generated{object-fit:cover}',
    '.fg-toast{position:fixed;left:50%;bottom:calc(26px + env(safe-area-inset-bottom,0px));transform:translateX(-50%) translateY(12px);',
      'background:rgba(20,10,28,.96);color:#FDE68A;border:1px solid rgba(250,204,21,.35);padding:12px 20px;border-radius:999px;',
      'font:600 14px/1.2 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;z-index:99999;opacity:0;pointer-events:none;',
      'box-shadow:0 14px 34px rgba(0,0,0,.5);transition:opacity .25s,transform .25s;max-width:86vw;text-align:center}',
    '.fg-toast.fg-show{opacity:1;transform:translateX(-50%) translateY(0)}',
    '@media (prefers-reduced-motion: reduce){.fg-icon,.fg-card .fg-shine::before{animation:none !important}.fg-reveal{opacity:1;transform:none}}'
  ].join('');

  function injectCSS() {
    if (doc.getElementById('fg-enhance-style')) return;
    var style = doc.createElement('style');
    style.id = 'fg-enhance-style';
    style.textContent = CSS;
    (doc.head || doc.documentElement).appendChild(style);
  }

  /* ---------- Som sintetizado (sem arquivos de áudio) ---------- */

  var audioCtx = null;
  function soundOn() { return localStorage.getItem('fg_sound') !== 'off'; }

  function blip(freq, duration, type) {
    if (!soundOn()) return;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      audioCtx = audioCtx || new AC();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      var osc = audioCtx.createOscillator();
      var gain = audioCtx.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.55, audioCtx.currentTime + duration);
      gain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.16, audioCtx.currentTime + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) { /* silencioso */ }
  }

  /* ---------- Feedbacks ---------- */

  function haptic(ms) {
    if (HAS_NATIVE && window.FortuneNative.haptic) { try { window.FortuneNative.haptic(ms || 10); return; } catch (e) {} }
    if (navigator.vibrate) navigator.vibrate(ms || 10);
  }

  function hapticWin() {
    if (HAS_NATIVE && window.FortuneNative.win) { try { window.FortuneNative.win(); return; } catch (e) {} }
    if (navigator.vibrate) navigator.vibrate([0, 28, 60, 28, 60, 90]);
  }

  function ripple(el, clientX, clientY) {
    if (REDUCED) return;
    var rect = el.getBoundingClientRect();
    var size = Math.max(rect.width, rect.height) * 0.9;
    var span = doc.createElement('span');
    span.className = 'fg-ripple';
    span.style.width = span.style.height = size + 'px';
    span.style.left = (clientX - rect.left - size / 2) + 'px';
    span.style.top = (clientY - rect.top - size / 2) + 'px';
    if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
    el.appendChild(span);
    setTimeout(function () { span.remove(); }, 640);
  }

  function coinBurst(x, y, amount) {
    if (REDUCED) return;
    var coins = ['🪙', '💰', '✨', '💎'];
    var total = amount || 8;
    for (var i = 0; i < total; i++) {
      var coin = doc.createElement('div');
      coin.className = 'fg-coin';
      coin.textContent = coins[i % coins.length];
      var angle = (Math.PI * 2 * i) / total + Math.random() * 0.5;
      var dist = 60 + Math.random() * 80;
      coin.style.left = x + 'px';
      coin.style.top = y + 'px';
      coin.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
      coin.style.setProperty('--dy', (Math.sin(angle) * dist - 40) + 'px');
      coin.style.setProperty('--rot', (Math.random() * 540 - 270) + 'deg');
      doc.body.appendChild(coin);
      (function (node) { setTimeout(function () { node.remove(); }, 900); })(coin);
    }
  }

  var toastTimer = null;
  function toast(message) {
    var el = doc.querySelector('.fg-toast');
    if (!el) {
      el = doc.createElement('div');
      el.className = 'fg-toast';
      doc.body.appendChild(el);
    }
    el.textContent = message;
    requestAnimationFrame(function () { el.classList.add('fg-show'); });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('fg-show'); }, 2200);
  }

  /* ---------- Detecção de cards ---------- */

  function isIconLike(img) {
    var r = img.getBoundingClientRect();
    if (!r.width || !r.height) return true; // ainda sem layout: trata como ícone
    var ratio = r.width / r.height;
    return r.width >= 40 && ratio > 0.45 && ratio < 2.4 && r.width <= window.innerWidth * 0.75;
  }

  function tooBig(el) {
    var r = el.getBoundingClientRect();
    return r.width > window.innerWidth * 0.94 && r.height > window.innerHeight * 0.55;
  }

  function cardFor(img) {
    // 1) alvo semântico mais próximo (o container do jogo, não o wrapper interno da imagem)
    var direct = img.closest && img.closest(
      '[data-game],[data-jogo],.game-card,.gamecard,.game,.jogo,.slot-card,.card,article,a,button,[onclick]'
    );
    if (direct && direct !== doc.body && !tooBig(direct)) return direct;

    // 2) subida controlada procurando um bloco com cara de card
    var node = img;
    for (var depth = 0; depth < 3 && node && node !== doc.body; depth++) {
      var parent = node.parentElement;
      if (!parent || parent === doc.body) break;
      var cls = (parent.className && parent.className.baseVal !== undefined
        ? parent.className.baseVal : parent.className || '') + '';
      if (/card|game|jogo|slot|tile|item/i.test(cls) && !tooBig(parent)) return parent;
      node = parent;
    }
    return img.parentElement || img;
  }

  function enhanceCard(el, index) {
    if (!el || el.getAttribute('data-fg-card')) return;
    el.setAttribute('data-fg-card', '1');
    el.classList.add('fg-card');
    if (!el.hasAttribute('tabindex') && el.tagName !== 'A' && el.tagName !== 'BUTTON') {
      el.setAttribute('tabindex', '0');
    }
    el.style.setProperty('--fg-delay', ((index % 12) * 0.12).toFixed(2) + 's');

    if (!REDUCED && !el.querySelector('.fg-shine')) {
      var shine = doc.createElement('span');
      shine.className = 'fg-shine';
      el.appendChild(shine);
    }

    var tiltFrame = null;
    function tilt(event) {
      if (REDUCED) return;
      var rect = el.getBoundingClientRect();
      var px = (event.clientX - rect.left) / rect.width - 0.5;
      var py = (event.clientY - rect.top) / rect.height - 0.5;
      if (tiltFrame) cancelAnimationFrame(tiltFrame);
      tiltFrame = requestAnimationFrame(function () {
        el.style.transform = 'perspective(680px) rotateX(' + (-py * 11).toFixed(2) +
          'deg) rotateY(' + (px * 13).toFixed(2) + 'deg) scale(1.035)';
      });
    }
    function resetTilt() {
      if (tiltFrame) cancelAnimationFrame(tiltFrame);
      el.style.transform = '';
    }

    el.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') tilt(e); });
    el.addEventListener('pointermove', function (e) { if (e.pointerType === 'mouse' || e.buttons) tilt(e); });
    el.addEventListener('pointerleave', resetTilt);

    el.addEventListener('pointerdown', function (e) {
      el.classList.add('fg-press');
      ripple(el, e.clientX, e.clientY);
      haptic(9);
      blip(760, 0.07, 'triangle');
    });

    ['pointerup', 'pointercancel'].forEach(function (evt) {
      el.addEventListener(evt, function (e) {
        el.classList.remove('fg-press');
        resetTilt();
        if (evt === 'pointerup') {
          coinBurst(e.clientX, e.clientY, 6);
          blip(1180, 0.1, 'sine');
        }
      });
    });

    el.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        var rect = el.getBoundingClientRect();
        ripple(el, rect.left + rect.width / 2, rect.top + rect.height / 2);
        haptic(9);
      }
    });
  }

  /* ---------- Entrada escalonada ---------- */

  var revealObserver = ('IntersectionObserver' in window) ? new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('fg-in');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }) : null;

  function reveal(el) {
    if (REDUCED || !revealObserver || el.getAttribute('data-fg-reveal')) return;
    el.setAttribute('data-fg-reveal', '1');
    el.classList.add('fg-reveal');
    revealObserver.observe(el);
    // Rede de segurança: nada pode ficar invisível se o observer não disparar.
    setTimeout(function () { el.classList.add('fg-in'); }, 2600);
  }

  /* ---------- Varredura principal ---------- */

  var cardIndex = 0;

  function enhanceAll(root) {
    injectCSS();
    scanImages(root);
    fixBackgrounds(root);

    var imgs = (root || doc).querySelectorAll('img:not([data-fg-done])');
    Array.prototype.forEach.call(imgs, function (img) {
      img.setAttribute('data-fg-done', '1');
      if (!isIconLike(img)) return;
      if (img.closest('.fg-no-enhance, header.fg-plain, .fg-avatar')) return;

      var card = cardFor(img);
      if (card && card !== doc.body) {
        img.classList.add('fg-icon');
        enhanceCard(card, cardIndex++);
        reveal(card);
      }
    });
  }

  /* ---------- Observador do DOM (substitui o setInterval de 300ms) ---------- */

  var pending = false;
  function scheduleScan() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(function () {
      pending = false;
      enhanceAll(doc);
    });
  }

  if ('MutationObserver' in window) {
    new MutationObserver(function (mutations) {
      for (var i = 0; i < mutations.length; i++) {
        if (mutations[i].addedNodes && mutations[i].addedNodes.length) { scheduleScan(); return; }
        if (mutations[i].type === 'attributes') { scheduleScan(); return; }
      }
    }).observe(doc.documentElement, {
      childList: true, subtree: true, attributes: true, attributeFilter: ['src', 'data-src', 'style', 'class']
    });
  }

  /* ---------- Ajustes globais de layout (safe area + sem zoom acidental) ---------- */

  function layoutFixes() {
    var meta = doc.querySelector('meta[name="viewport"]');
    if (!meta) {
      meta = doc.createElement('meta');
      meta.name = 'viewport';
      (doc.head || doc.documentElement).appendChild(meta);
    }
    meta.content = 'width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover';

    var style = doc.getElementById('fg-layout-style');
    if (!style) {
      style = doc.createElement('style');
      style.id = 'fg-layout-style';
      style.textContent =
        'html,body{margin:0;padding:0;overflow-x:hidden;-webkit-text-size-adjust:100%;' +
        'overscroll-behavior-y:contain;background:#07040C}' +
        'body{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}' +
        'img{max-width:100%}' +
        '*{-webkit-touch-callout:none}';
      (doc.head || doc.documentElement).appendChild(style);
    }
  }

  /* ===================================================================== *
   * 3. API PÚBLICA
   * ===================================================================== */

  var modalStack = [];

  window.FortuneGo = {
    version: window.__FORTUNE_ENHANCE__,
    isNative: HAS_NATIVE,
    refresh: function () { enhanceAll(doc); },
    fixImages: function () { scanImages(doc); fixBackgrounds(doc); },
    resolve: function (src, cb) {
      probeSequential(buildCandidates(src), 0, function (u) { cb(u); }, function () { cb(null); });
    },
    placeholder: function (label) {
      var fake = doc.createElement('img');
      fake.setAttribute('alt', label || 'FortuneGo');
      return placeholderFor(fake);
    },
    haptic: haptic,
    hapticWin: hapticWin,
    sound: function (freq, dur, type) { blip(freq || 880, dur || 0.08, type); },
    toggleSound: function () {
      var next = soundOn() ? 'off' : 'on';
      localStorage.setItem('fg_sound', next);
      if (next === 'on') blip(980, 0.1, 'sine');
      return next === 'on';
    },
    soundEnabled: soundOn,
    coins: coinBurst,
    toast: function (msg) {
      if (HAS_NATIVE && window.FortuneNative.toast) { try { window.FortuneNative.toast(msg); return; } catch (e) {} }
      toast(msg);
    },
    confetti: function () {
      var w = window.innerWidth;
      for (var i = 0; i < 5; i++) {
        (function (k) {
          setTimeout(function () {
            coinBurst(w * (0.15 + Math.random() * 0.7), window.innerHeight * (0.2 + Math.random() * 0.3), 10);
          }, k * 120);
        })(i);
      }
      hapticWin();
    },
    /** O app web registra modais aqui para o botão físico "voltar" fechá-los. */
    pushModal: function (closeFn) { modalStack.push(closeFn); },
    popModal: function () { modalStack.pop(); },
    handleBack: function () {
      if (modalStack.length) {
        var close = modalStack.pop();
        try { close(); } catch (e) {}
        return true;
      }
      return false;
    },
    share: function (text) {
      if (HAS_NATIVE && window.FortuneNative.share) { try { window.FortuneNative.share(text); return; } catch (e) {} }
      if (navigator.share) navigator.share({ text: text }).catch(function () {});
      else toast('Copie e compartilhe: ' + text);
    }
  };

  /* ---------- Boot ---------- */

  function boot() {
    layoutFixes();
    injectCSS();
    enhanceAll(doc);
    // Reexamina após fontes/imagens remotas assentarem.
    setTimeout(function () { enhanceAll(doc); }, 400);
    setTimeout(function () { enhanceAll(doc); }, 1600);
    window.dispatchEvent(new CustomEvent('fortune:enhanced'));
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.addEventListener('load', function () { enhanceAll(doc); });
  window.addEventListener('orientationchange', function () { setTimeout(function () { enhanceAll(doc); }, 320); });
})();
