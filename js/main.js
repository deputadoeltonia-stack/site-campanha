/* =========================================================
   Dr. Elton — Campanha • main.js
   Sem dependências. Vanilla.
   ========================================================= */
(function () {
  "use strict";

  /* -------------------------------------------------------
     CONFIG — onde o lead é enviado.
     Vazio = modo demo (salva no navegador + mostra sucesso).
     Pra ligar de verdade, cole a URL:
       - Google Apps Script Web App (/exec), ou
       - endpoint Supabase / qualquer POST que aceite JSON.
     ------------------------------------------------------- */
  // Apps Script -> planilha "Leads Dr. Elton". Vazio volta pro modo demo (localStorage).
  // Se editar o .gs, tem que REIMPLANTAR (Gerenciar implantações > Versão: Nova),
  // senão esta URL continua servindo o código velho.
  var LEAD_ENDPOINT = "https://script.google.com/macros/s/AKfycbyBdY45weHbgTSWLBt0ymfRSHPmz4vHVGdEiu13T3o3yGejT36JiGPauMrxmv-vRz-j/exec";

  /* ---------- page-load orquestrado (dispara animações .load/.hero-photo) ---------- */
  var root = document.documentElement;
  requestAnimationFrame(function () {
    requestAnimationFrame(function () { root.classList.add("ready"); });
  });

  /* ---------- menu mobile ---------- */
  var toggle = document.querySelector(".menu-toggle");
  var menu = document.getElementById("mobile-menu");
  if (toggle && menu) {
    toggle.addEventListener("click", function () {
      var open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!open));
      menu.hidden = open;
    });
    menu.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        toggle.setAttribute("aria-expanded", "false");
        menu.hidden = true;
      });
    });
  }

  /* ---------- scroll suave controlado p/ âncoras (título + nav) ---------- */
  var header = document.querySelector(".site-header");
  function scrollToY(y) {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { window.scrollTo(0, y); return; }
    var startY = window.scrollY, dist = y - startY, dur = 520, t0 = null;
    function step(ts) {
      if (t0 === null) t0 = ts;
      var p = Math.min((ts - t0) / dur, 1);
      var e = 1 - Math.pow(1 - p, 3); // ease-out cúbico
      window.scrollTo({ top: startY + dist * e, behavior: "auto" });
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute("href").slice(1);
    if (!id) return;
    var el = document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    var offset = id === "topo" ? 0 : (header ? header.offsetHeight : 0) + 8;
    var y = id === "topo" ? 0 : Math.max(0, el.getBoundingClientRect().top + window.scrollY - offset);
    scrollToY(y);
    if (history.replaceState) {
      history.replaceState(null, "", id === "topo" ? location.pathname + location.search : "#" + id);
    }
  });

  /* ---------- títulos que sobem letra a letra, atados ao scroll ----------
     Porte do ScrollFloat (React Bits) sem React/GSAP. Foi de view-timeline
     (CSS) pra cá porque a timeline nomeada não ativa em parte dos navegadores;
     o progresso calculado no scroll roda em todos e é o MESMO scrub.
     O h2 ganha aria-label com o texto inteiro e as letras somem do leitor
     de tela — senão o VoiceOver soletraria o título. */
  var titulosFloat = [];
  var semMovimento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  document.querySelectorAll(".titulo-float").forEach(function (titulo) {
    if (titulo.dataset.fatiado) return;
    var indice = 0;

    var fatiar = function (no) {
      var saida = document.createDocumentFragment();
      Array.prototype.slice.call(no.childNodes).forEach(function (filho) {
        if (filho.nodeType === 3) {
          filho.nodeValue.split(/(\s+)/).forEach(function (pedaco) {
            if (!pedaco) return;
            var palavra = document.createElement("span");
            palavra.className = "word";
            pedaco.split("").forEach(function (letra) {
              var span = document.createElement("span");
              span.className = "char";
              span.style.setProperty("--i", indice++);
              span.textContent = letra;
              palavra.appendChild(span);
            });
            saida.appendChild(palavra);
          });
        } else if (filho.nodeType === 1) {
          var clone = filho.cloneNode(false);        // <br>, <em>… preservados
          clone.appendChild(fatiar(filho));
          saida.appendChild(clone);
        }
      });
      return saida;
    };

    titulo.setAttribute("aria-label", titulo.textContent.replace(/\s+/g, " ").trim());
    var fatiado = fatiar(titulo);
    titulo.textContent = "";
    titulo.appendChild(fatiado);
    Array.prototype.forEach.call(titulo.children, function (n) { n.setAttribute("aria-hidden", "true"); });
    titulo.dataset.fatiado = "1";
    titulosFloat.push({ el: titulo, letras: titulo.querySelectorAll(".char"), pronto: false });
  });

  if (titulosFloat.length) {
    // back.inOut(2) do GSAP: passa do ponto e volta. É o "peso" do efeito.
    var backInOut = function (x) {
      var c = 2 * 1.525;
      return x < 0.5
        ? (Math.pow(2 * x, 2) * ((c + 1) * 2 * x - c)) / 2
        : (Math.pow(2 * x - 2, 2) * ((c + 1) * (x * 2 - 2) + c) + 2) / 2;
    };
    var trava = function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; };
    var ATRASO = 0.04;   // stagger: fração do curso que cada letra espera
    // Quem pediu menos movimento no sistema não fica sem efeito nenhum: recebe
    // a mesma cascata, só que curta e sem o esticão — some o que embrulha o
    // estômago (percurso longo, salto elástico), fica o que comunica.
    var SUBIDA = semMovimento ? 14 : 120;   // % de deslocamento
    var ESTICA = semMovimento ? 0 : 1;      // quanto da distorção entra
    var curva = semMovimento ? function (x) { return x; } : backInOut;

    var desenhar = function (t) {
      var caixa = t.el.getBoundingClientRect();
      var alturaVis = window.innerHeight;
      // curso do efeito: começa quando o título encosta na base da janela e só
      // fecha perto do topo. Faixa longa de propósito — terminando no meio da
      // tela, a animação acabava antes de você chegar a olhar o título.
      var inicio = alturaVis * 1.05;
      var fim = alturaVis * 0.25;
      var p = trava((inicio - caixa.top) / Math.max(1, inicio - fim + caixa.height));
      if (p === 1 && t.pronto) return;             // já terminou: para de escrever
      t.pronto = p === 1;

      var n = t.letras.length;
      var curso = 1 + ATRASO * (n - 1);
      for (var i = 0; i < n; i++) {
        var local = trava((p * curso - i * ATRASO));
        var e = curva(local);
        var letra = t.letras[i];
        letra.style.opacity = trava(e);             // acende junto com a subida, não antes
        letra.style.transform = local === 1 ? "" :
          "translateY(" + (SUBIDA - SUBIDA * e) + "%) scale(" +
            (1 - 0.3 * ESTICA * (1 - e)) + "," + (1 + 1.3 * ESTICA * (1 - e)) + ")";
      }
    };

    var pintarTitulos = function () { titulosFloat.forEach(desenhar); };
    var agendadoT = false;
    window.addEventListener("scroll", function () {
      if (agendadoT) return;
      agendadoT = true;
      requestAnimationFrame(function () { agendadoT = false; pintarTitulos(); });
    }, { passive: true });
    window.addEventListener("resize", pintarTitulos);
    pintarTitulos();
  }

  /* ---------- seção atual marcada no cabeçalho ----------
     Sem observer por seção: uma passada no scroll decide qual âncora está
     acima da linha do header. Barato e não erra em seção mais alta que a tela. */
  var navLinks = Array.prototype.slice.call(
    document.querySelectorAll('.nav a[href^="#"], .mobile-menu a[href^="#"]')
  ).filter(function (a) { return document.getElementById(a.getAttribute("href").slice(1)); });

  if (navLinks.length) {
    var marcarAtiva = function () {
      var linha = (header ? header.offsetHeight : 0) + 24;
      var atual = "";
      navLinks.forEach(function (a) {
        var alvo = document.getElementById(a.getAttribute("href").slice(1));
        if (alvo.getBoundingClientRect().top <= linha) atual = a.getAttribute("href");
      });
      // fim da página: a última seção nunca chega ao topo, então assume ela
      if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 2) {
        atual = navLinks[navLinks.length - 1].getAttribute("href");
      }
      navLinks.forEach(function (a) {
        a.classList.toggle("is-active", a.getAttribute("href") === atual);
      });
    };
    var agendada = false;
    window.addEventListener("scroll", function () {
      if (agendada) return;
      agendada = true;
      requestAnimationFrame(function () { agendada = false; marcarAtiva(); });
    }, { passive: true });
    window.addEventListener("resize", marcarAtiva);
    marcarAtiva();
  }

  /* ---------- reveal on scroll ---------- */
  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && reveals.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    reveals.forEach(function (el) { io.observe(el); });
    // failsafe: reveal NUNCA pode ser o que torna o conteúdo visível.
    // Se o observer não disparar (aba oculta, headless, bug), destrava tudo.
    setTimeout(function () {
      reveals.forEach(function (el) { el.classList.add("in"); });
    }, 2500);
  } else {
    reveals.forEach(function (el) { el.classList.add("in"); });
  }

  /* Trajetória: 100% CSS scroll-driven (view-timeline por li) — sem JS.  */

  /* ---------- CTA fixo (mobile): aparece após o hero, some no form ---------- */
  var sticky = document.querySelector(".sticky-cta");
  var hero = document.getElementById("hero");
  var form = document.getElementById("participar");
  if (sticky && hero && "IntersectionObserver" in window) {
    var pastHero = false, atForm = false;
    var update = function () { sticky.classList.toggle("show", pastHero && !atForm); };
    new IntersectionObserver(function (es) {
      pastHero = !es[0].isIntersecting; update();
    }, { threshold: 0 }).observe(hero);
    if (form) {
      new IntersectionObserver(function (es) {
        atForm = es[0].isIntersecting; update();
      }, { threshold: 0.1 }).observe(form);
    }
  }

  /* ---------- indicador de rolagem (troca a barra nativa) ----------
     Só com ponteiro fino: no toque não há barra pra substituir.
     A classe que esconde a nativa só entra depois que o custom existe —
     se algo aqui falhar, o usuário nunca fica sem barra nenhuma. */
  if (window.matchMedia("(pointer: fine)").matches) {
    var trilho = document.createElement("div");
    trilho.className = "scroll-rail";
    trilho.setAttribute("aria-hidden", "true"); // roda/teclado já rolam a página
    var polegar = document.createElement("div");
    polegar.className = "scroll-thumb";
    trilho.appendChild(polegar);
    document.body.appendChild(trilho);
    root.classList.add("tem-indicador");

    var MARGEM = 12;      // respiro nas pontas: o polegar não encosta na quina
    var MIN_ALTURA = 48;  // página longa não vira um risco de 4px
    var sumir = null, arrastando = false, pegouEm = 0, alturaAtual = 0;

    function medir() {
      var doc = document.documentElement;
      var vis = window.innerHeight;
      var pista = vis - MARGEM * 2;
      var total = Math.max(doc.scrollHeight, document.body.scrollHeight);
      return {
        pista: pista,
        rolavel: total - vis,
        altura: Math.max(MIN_ALTURA, Math.round(pista * (vis / total)))
      };
    }

    function pintar() {
      var m = medir();
      if (m.rolavel <= 4) { trilho.classList.remove("visivel"); return; }
      var p = Math.min(1, Math.max(0, window.scrollY / m.rolavel));
      var y = MARGEM + p * (m.pista - m.altura);
      // encaixe na ponta: chegando ao fim do curso o polegar comprime contra a
      // borda, como se ela fosse arredondada e ele estivesse se acomodando nela.
      var encaixe = p < 0.02 ? 1 - (0.02 - p) * 6
                  : p > 0.98 ? 1 - (p - 0.98) * 6
                  : 1;
      if (m.altura !== alturaAtual) { polegar.style.height = m.altura + "px"; alturaAtual = m.altura; }
      polegar.style.transformOrigin = p > 0.5 ? "center bottom" : "center top";
      polegar.style.transform = "translate3d(0," + y + "px,0) scaleY(" + encaixe + ")";
    }

    function acender() {
      trilho.classList.add("visivel");
      clearTimeout(sumir);
      if (!arrastando) sumir = setTimeout(function () { trilho.classList.remove("visivel"); }, 1100);
    }

    var pendente = false;
    function aoRolar() {
      if (!pendente) {
        pendente = true;
        requestAnimationFrame(function () { pendente = false; pintar(); });
      }
      acender();
    }
    window.addEventListener("scroll", aoRolar, { passive: true });
    window.addEventListener("resize", function () { alturaAtual = 0; pintar(); });
    trilho.addEventListener("mouseenter", acender);

    // arrastar o polegar: sem isso, esconder a barra nativa tiraria um jeito
    // legítimo de navegar que parte das pessoas usa.
    polegar.addEventListener("pointerdown", function (e) {
      arrastando = true;
      pegouEm = e.clientY - polegar.getBoundingClientRect().top;
      polegar.classList.add("arrastando");
      polegar.setPointerCapture(e.pointerId);
      acender();
      e.preventDefault();
    });
    polegar.addEventListener("pointermove", function (e) {
      if (!arrastando) return;
      var m = medir();
      var curso = m.pista - m.altura;
      if (curso <= 0) return;
      var p = (e.clientY - pegouEm - MARGEM) / curso;
      window.scrollTo(0, Math.min(1, Math.max(0, p)) * m.rolavel);
    });
    function soltar(e) {
      if (!arrastando) return;
      arrastando = false;
      polegar.classList.remove("arrastando");
      if (e && e.pointerId != null && polegar.hasPointerCapture(e.pointerId)) {
        polegar.releasePointerCapture(e.pointerId);
      }
      acender();
    }
    polegar.addEventListener("pointerup", soltar);
    polegar.addEventListener("pointercancel", soltar);

    pintar();
    acender();
  }

  /* ---------- máscara de telefone BR ---------- */
  var tel = document.getElementById("telefone");
  if (tel) {
    tel.addEventListener("input", function () {
      var d = tel.value.replace(/\D/g, "").slice(0, 11);
      var out = d;
      if (d.length > 6) {
        out = "(" + d.slice(0, 2) + ") " + d.slice(2, d.length > 10 ? 7 : 6) +
              "-" + d.slice(d.length > 10 ? 7 : 6);
      } else if (d.length > 2) {
        out = "(" + d.slice(0, 2) + ") " + d.slice(2);
      } else if (d.length > 0) {
        out = "(" + d;
      }
      tel.value = out;
    });
  }

  /* ---------- validação + envio ---------- */
  var leadForm = document.getElementById("lead-form");
  if (!leadForm) return;
  var statusEl = document.getElementById("form-status");

  function setError(name, msg) {
    var span = leadForm.querySelector('.field-error[data-for="' + name + '"]');
    var input = leadForm.querySelector("#" + name);
    if (span) span.textContent = msg || "";
    if (input) {
      if (msg) input.setAttribute("aria-invalid", "true");
      else input.removeAttribute("aria-invalid");
    }
  }

  function digits(s) { return (s || "").replace(/\D/g, ""); }

  // Regras de validação no boundary de entrada.
  function validate(data, hp) {
    var errs = {};
    if (hp) errs._bot = true; // honeypot preenchido = bot, rejeita silenciosamente

    var nome = data.nome.trim();
    if (nome.length < 3) errs.nome = "Digite seu nome completo.";
    else if (nome.length > 80) errs.nome = "Nome muito longo.";
    else if (!/^[\p{L}\s.'-]+$/u.test(nome)) errs.nome = "Use apenas letras no nome.";

    var d = digits(data.telefone);
    if (d.length < 10 || d.length > 11) errs.telefone = "Telefone inválido. Inclua o DDD.";

    if (!data.lgpd) errs.lgpd = "É preciso autorizar o contato para participar.";

    return errs;
  }

  leadForm.addEventListener("submit", function (ev) {
    ev.preventDefault();
    ["nome", "telefone", "lgpd"].forEach(function (n) { setError(n, ""); });
    if (statusEl) { statusEl.textContent = ""; statusEl.className = "form-status"; }

    var data = {
      nome: leadForm.nome.value,
      telefone: leadForm.telefone.value,
      lgpd: leadForm.lgpd.checked
    };
    var hp = leadForm.site.value.trim() !== "";

    var errs = validate(data, hp);

    if (errs._bot) { fakeSuccess(); return; } // não dá pista pro bot

    if (Object.keys(errs).length) {
      Object.keys(errs).forEach(function (k) { setError(k, errs[k]); });
      var first = leadForm.querySelector('[aria-invalid="true"]');
      if (first) first.focus();
      return;
    }

    // payload limpo
    var payload = {
      nome: data.nome.trim().replace(/\s+/g, " "),
      telefone: digits(data.telefone),
      consentimento_lgpd: true,
      origem: "site-campanha",
      data: new Date().toISOString()
    };

    submitLead(payload);
  });

  function lock(state) {
    var btn = leadForm.querySelector('button[type="submit"]');
    if (btn) { btn.disabled = state; btn.textContent = state ? "Enviando…" : "Confirmar participação"; }
  }

  function ok(nome) {
    lock(false);
    leadForm.reset();
    if (statusEl) {
      statusEl.className = "form-status ok";
      statusEl.textContent = "Recebido, " + nome.split(" ")[0] + "! Sua participação foi registrada. 💛";
    }
  }
  function fail() {
    lock(false);
    if (statusEl) {
      statusEl.className = "form-status err";
      statusEl.textContent = "Não deu para enviar agora. Tente de novo em instantes.";
    }
  }
  function fakeSuccess() {
    if (statusEl) { statusEl.className = "form-status ok"; statusEl.textContent = "Recebido! Obrigado por participar."; }
    leadForm.reset();
  }

  function submitLead(payload) {
    lock(true);

    // Modo demo: sem endpoint → guarda local e confirma.
    if (!LEAD_ENDPOINT) {
      try {
        var key = "leads_demo";
        var arr = JSON.parse(localStorage.getItem(key) || "[]");
        arr.push(payload);
        localStorage.setItem(key, JSON.stringify(arr));
      } catch (e) { /* localStorage cheio/bloqueado: segue mostrando sucesso */ }
      setTimeout(function () { ok(payload.nome); }, 400);
      return;
    }

    // Modo real: POST pro endpoint configurado.
    fetch(LEAD_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" }, // evita preflight no Apps Script
      body: JSON.stringify(payload)
    })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        // O Apps Script responde 200 mesmo recusando o lead ({ok:false}).
        // Sem ler o corpo, um lead rejeitado virava "sucesso" na tela.
        return r.text().then(function (t) {
          try {
            var j = JSON.parse(t);
            if (j && j.ok === false) throw new Error(j.msg || "recusado");
          } catch (e) {
            if (e instanceof SyntaxError) return; // corpo opaco/CORS: 200 já basta
            throw e;
          }
        });
      })
      .then(function () { ok(payload.nome); })
      .catch(function () { fail(); });
  }

  /* ---------- lightbox: clique na foto da galeria abre ampliada ----------
     <dialog> nativo: Esc e foco já vêm de graça, zero biblioteca.          */
  var gimgs = document.querySelectorAll(".gphoto img");
  if (gimgs.length && window.HTMLDialogElement) {
    // construído via DOM (sem innerHTML): nada de string de markup, zero risco de XSS
    var dlg = document.createElement("dialog");
    dlg.className = "lightbox";
    var lbClose = document.createElement("button");
    lbClose.type = "button";
    lbClose.className = "lightbox-close";
    lbClose.setAttribute("aria-label", "Fechar");
    lbClose.textContent = "×";
    var lbImg = document.createElement("img");
    lbImg.alt = "";
    var lbCap = document.createElement("p");
    lbCap.className = "lightbox-cap";
    dlg.append(lbClose, lbImg, lbCap);
    document.body.appendChild(dlg);

    var abrir = function (img) {
      var fig = img.closest("figure");
      var cap = fig && fig.querySelector("figcaption");
      lbImg.src = img.currentSrc || img.src;
      lbImg.alt = img.alt || "";
      lbCap.textContent = cap ? cap.textContent : "";
      dlg.showModal();
    };

    gimgs.forEach(function (img) {
      img.setAttribute("tabindex", "0");
      img.setAttribute("role", "button");
      img.setAttribute("aria-label", "Ampliar foto: " + (img.alt || ""));
      img.addEventListener("click", function () { abrir(img); });
      img.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); abrir(img); }
      });
    });

    // fecha ao clicar no backdrop ou no X (pseudo não conta como alvo do dialog)
    dlg.addEventListener("click", function (e) {
      if (e.target === dlg || e.target.classList.contains("lightbox-close")) dlg.close();
    });
    dlg.addEventListener("close", function () { lbImg.removeAttribute("src"); });
  }

  /* ---------- texto que acende palavra a palavra, atado ao scroll ----------
     Mesmo scrub dos títulos (.titulo-float): progresso calculado no scroll, não
     view-timeline — pelo mesmo motivo, a timeline CSS não ativa em todo navegador.
     Aqui o JS só escreve --p no parágrafo; quem acende cada palavra é o clamp()
     do CSS, então é UMA escrita de estilo por parágrafo por frame.
     Sem JS = texto normal, opaco e legível. */
  var paragrafos = [];
  document.querySelectorAll(
    "#quem-sou .lead-para, .timeline .tl-body > .prose, " +
    ".pledge-body > .pledge-quote, .pledge-body > .prose, .quotes blockquote"
  ).forEach(function (el) {
    if (el.children.length) return;              // só texto puro; com markup dentro, não mexe
    var partes = el.textContent.split(/(\s+)/);
    var frag = document.createDocumentFragment();
    var n = 0;
    partes.forEach(function (parte) {
      if (!parte) return;
      if (/^\s+$/.test(parte)) { frag.appendChild(document.createTextNode(parte)); return; }
      var s = document.createElement("span");
      s.className = "w";
      s.style.setProperty("--i", n++);
      s.textContent = parte;
      frag.appendChild(s);
    });
    if (!n) return;
    el.textContent = "";
    el.appendChild(frag);
    el.style.setProperty("--n", n);
    el.classList.add("wordreveal");
    paragrafos.push({ el: el, ultimo: -1 });
  });

  if (paragrafos.length && !semMovimento) {
    var pintarTexto = function () {
      var alturaVis = window.innerHeight;
      // curso: começa quando o parágrafo entra pela base e fecha com ele
      // acima do meio da tela — a frase termina de acender antes de você
      // terminar de ler, nunca depois.
      var inicio = alturaVis * 0.92;
      var fim = alturaVis * 0.42;
      paragrafos.forEach(function (t) {
        var caixa = t.el.getBoundingClientRect();
        if (caixa.bottom < -200 || caixa.top > alturaVis + 200) return;   // fora da tela: nem calcula
        var p = (inicio - caixa.top) / Math.max(1, inicio - fim + caixa.height);
        p = p < 0 ? 0 : p > 1 ? 1 : p;
        var q = Math.round(p * 100) / 100;
        if (q === t.ultimo) return;                                       // nada mudou: não escreve
        t.ultimo = q;
        t.el.style.setProperty("--p", q);
      });
    };
    var agendadoP = false;
    window.addEventListener("scroll", function () {
      if (agendadoP) return;
      agendadoP = true;
      requestAnimationFrame(function () { agendadoP = false; pintarTexto(); });
    }, { passive: true });
    window.addEventListener("resize", pintarTexto);
    pintarTexto();
  }
})();
