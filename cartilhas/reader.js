/* =========================================================
   Cartilhas — leitor (Dr. Elton)
   Sem dependências. Guiado pelo DOM: lê as .pagina que já estão no HTML
   (a versão sem-JS), não recebe nada hardcoded — as duas cartilhas usam
   este mesmo arquivo sem diferença nenhuma.
   ========================================================= */
(function () {
  "use strict";

  var palco = document.getElementById("palco");
  var paginasEl = document.getElementById("paginas");
  if (!palco || !paginasEl) return;   // não é uma página de leitor (ex.: índice)

  var figuras = Array.prototype.slice.call(paginasEl.querySelectorAll(".pagina"));
  var total = figuras.length;
  if (!total) return;

  var btnPrev = document.getElementById("btn-prev");
  var btnNext = document.getElementById("btn-next");
  var indicador = document.getElementById("indicador");
  var btnCompartilhar = document.getElementById("btn-compartilhar");
  var status = document.getElementById("status");

  var reduzMovimento = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- agrupamento em "spread" (1 ou 2 páginas lado a lado) ----------
     Não é um par fixo (par/ímpar): cada página carrega a proporção real no
     width/height do HTML. Uma página já larga (a cartilha de Saúde Mental
     exporta o spread inteiro numa imagem só) nunca entra em par — pareá-la
     com a vizinha ficaria comprida demais. Só páginas de retrato, com
     retrato do lado, casam — e só se a tela permitir (ver telaLarga()). */
  function ehRetrato(fig) {
    var img = fig.querySelector("img");
    var w = img.getAttribute("width"), h = img.getAttribute("height");
    return !w || !h || (parseInt(h, 10) > parseInt(w, 10));
  }
  function telaLarga() {
    return window.matchMedia("(min-width: 860px)").matches;
  }
  // devolve os índices (0-based) do grupo que contém i
  function grupoDe(i) {
    if (!telaLarga() || i === 0 || !ehRetrato(figuras[i])) return [i];
    // agrupa em pares [1,2] [3,4]... (0-based), sempre a partir da 2ª pagina
    var inicioGrupo = 1 + (Math.floor((i - 1) / 2)) * 2;
    var fim = inicioGrupo + 1;
    if (fim >= total || !ehRetrato(figuras[fim]) || !ehRetrato(figuras[inicioGrupo])) return [i];
    return [inicioGrupo, fim];
  }

  var paginaAtual = 1;   // 1-based, primeira página do grupo visível

  function paginaValidaDaURL() {
    var m = /[?&]p=(\d+)/.exec(location.search);
    var n = m ? parseInt(m[1], 10) : 1;
    if (!n || n < 1) n = 1;
    if (n > total) n = total;
    return n;
  }

  function prefetch(indice) {
    if (indice < 0 || indice >= total) return;
    var img = figuras[indice].querySelector("img");
    if (img.dataset.prefetched) return;
    img.dataset.prefetched = "1";
    var aquecedor = new Image();
    aquecedor.src = img.currentSrc || img.src;
  }

  function anunciar(texto) {
    if (status) status.textContent = texto;
  }

  function mostrar(n, direcao) {
    n = Math.max(1, Math.min(total, n));
    var grupo = grupoDe(n - 1);
    // se n caiu no meio de um grupo (ex.: voltou pra pagina 3 de um [2,3]),
    // usa o INICIO do grupo como referencia de "pagina atual" pra nao
    // duplicar estado — a URL sempre aponta pra 1ª pagina do spread
    paginaAtual = grupo[0] + 1;

    figuras.forEach(function (fig, i) {
      var ativa = grupo.indexOf(i) !== -1;
      fig.classList.toggle("ativa", ativa);
      fig.classList.remove("entrando-dir", "entrando-esq");
      if (ativa && direcao && !reduzMovimento) {
        // força reflow antes de aplicar a classe da animação, senão o
        // browser as vezes funde as duas mudancas num frame so e nao anima
        void fig.offsetWidth;
        fig.classList.add(direcao === "prox" ? "entrando-dir" : "entrando-esq");
      }
    });

    paginasEl.classList.toggle("duas", grupo.length > 1);

    var fimGrupo = grupo[grupo.length - 1] + 1;
    var texto = grupo.length > 1
      ? "Páginas " + paginaAtual + "–" + fimGrupo + " de " + total
      : "Página " + paginaAtual + " de " + total;
    if (indicador) indicador.textContent = texto;
    anunciar(texto);

    if (btnPrev) btnPrev.disabled = paginaAtual <= 1;
    if (btnNext) btnNext.disabled = fimGrupo >= total;

    // so a proxima pagina (ou par) entra no cache com antecedencia —
    // nunca as 12 de uma vez
    prefetch(fimGrupo);
    if (fimGrupo + 1 < total) prefetch(fimGrupo + 1);

    var url = location.pathname + "?p=" + paginaAtual;
    history.replaceState(null, "", url);
  }

  function proxima() {
    var grupo = grupoDe(paginaAtual - 1);
    var alvo = grupo[grupo.length - 1] + 2;   // 1a pagina depois do grupo atual
    if (alvo > total) return;
    mostrar(alvo, "prox");
  }
  function anterior() {
    if (paginaAtual <= 1) return;
    // acha o grupo que TERMINA logo antes do grupo atual
    var alvo = paginaAtual - 1;
    var grupoAnterior = grupoDe(alvo - 1);
    mostrar(grupoAnterior[0] + 1, "volta");
  }

  if (btnPrev) btnPrev.addEventListener("click", anterior);
  if (btnNext) btnNext.addEventListener("click", proxima);

  document.addEventListener("keydown", function (e) {
    if (e.key === "ArrowRight") { proxima(); }
    else if (e.key === "ArrowLeft") { anterior(); }
  });

  // swipe: só decide depois de ver que o gesto é mais horizontal que
  // vertical, senão sequestra o scroll normal da página no celular
  var tocoX = null, tocoY = null;
  palco.addEventListener("touchstart", function (e) {
    var t = e.changedTouches[0];
    tocoX = t.clientX; tocoY = t.clientY;
  }, { passive: true });
  palco.addEventListener("touchend", function (e) {
    if (tocoX === null) return;
    var t = e.changedTouches[0];
    var dx = t.clientX - tocoX, dy = t.clientY - tocoY;
    tocoX = null;
    if (Math.abs(dx) < 44 || Math.abs(dx) < Math.abs(dy)) return;
    if (dx < 0) proxima(); else anterior();
  }, { passive: true });

  if (btnCompartilhar) {
    btnCompartilhar.hidden = false;
    var textoOriginal = btnCompartilhar.textContent;
    btnCompartilhar.addEventListener("click", function () {
      var url = location.href;
      var titulo = document.title;
      if (navigator.share) {
        navigator.share({ title: titulo, url: url }).catch(function () {});
        return;
      }
      var confirmar = function () {
        btnCompartilhar.textContent = "Link copiado!";
        anunciar("Link copiado.");
        setTimeout(function () { btnCompartilhar.textContent = textoOriginal; }, 2200);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(confirmar).catch(function () {
          window.prompt("Copie o link:", url);
        });
      } else {
        window.prompt("Copie o link:", url);
      }
    });
  }

  if (btnPrev) btnPrev.hidden = false;
  if (btnNext) btnNext.hidden = false;

  var larguraAtual = window.innerWidth, remedir;
  window.addEventListener("resize", function () {
    if (window.innerWidth === larguraAtual) return;
    larguraAtual = window.innerWidth;
    clearTimeout(remedir);
    remedir = setTimeout(function () { mostrar(paginaAtual, null); }, 150);
  });

  mostrar(paginaValidaDaURL(), null);
})();
