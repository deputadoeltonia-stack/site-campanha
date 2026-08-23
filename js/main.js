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

  // Bot do WhatsApp que continua a conversa e cadastra o lead (várias origens
  // caem no mesmo número). O site só precisa confirmar que registrou na
  // planilha ANTES de mandar pro WhatsApp — é o jeito de saber quem veio daqui.
  var WHATSAPP_BOT = "5512988604385";
  var WHATSAPP_MSG = "Quero começar nessa jornada!";

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
    titulo.classList.add("float-pronto");   // só agora as letras podem começar escondidas
    titulosFloat.push({ el: titulo });
  });

  // Dispara sozinho quando o título entra na tela e roda em tempo próprio (o
  // scrub antigo dependia de quanto você rolava: passando rápido, ninguém via).
  // A cascata em si é CSS; aqui só decide a HORA. Uma vez revelado, fica.
  if (titulosFloat.length) {
    // Posição lida no scroll, não IntersectionObserver: é o mesmo mecanismo do
    // indicador de seção logo abaixo, e roda em qualquer navegador. São 6
    // títulos e cada um sai da lista assim que revela — custo desprezível.
    var faltam = titulosFloat.map(function (t) { return t.el; });

    var verTitulos = function () {
      var gatilho = window.innerHeight * 0.88;   // revela pouco depois de entrar pela base
      for (var i = faltam.length - 1; i >= 0; i--) {
        var caixa = faltam[i].getBoundingClientRect();
        if (caixa.top < gatilho && caixa.bottom > 0) {
          faltam[i].classList.add("revela");
          faltam.splice(i, 1);
        }
      }
      return faltam.length;
    };

    var agendadoF = false;
    window.addEventListener("scroll", function () {
      if (agendadoF || !faltam.length) return;
      agendadoF = true;
      requestAnimationFrame(function () { agendadoF = false; verTitulos(); });
    }, { passive: true });
    window.addEventListener("resize", verTitulos);
    verTitulos();

    // Rede de segurança: NUNCA revelar em massa — marcar quem está longe queima
    // a animação fora da tela, que foi o que fazia só os dois primeiros títulos
    // aparecerem animados. Quem sobra fica legível e parado, e ainda anima se
    // chegar na tela: a animação sobrescreve esta opacidade enquanto roda.
    setTimeout(function () {
      faltam.forEach(function (el) { el.classList.add("float-destravado"); });
    }, 3000);
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

  /* ---------- CTA fixo (mobile): aparece 3s depois de abrir, some no form ----------
     Era "depois que passa do hero" — trocado por um tempo fixo (a CSS já
     esconde isto inteiro em desktop, min-width:940px, então só existe aqui
     no mobile mesmo). */
  var sticky = document.querySelector(".sticky-cta");
  var form = document.getElementById("participar");
  if (sticky) {
    var passou3s = false, atForm = false;
    var update = function () { sticky.classList.toggle("show", passou3s && !atForm); };
    setTimeout(function () { passou3s = true; update(); }, 3000);
    if (form && "IntersectionObserver" in window) {
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
    var hp = leadForm.site.value.trim();

    var errs = validate(data, hp !== "");

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
      // honeypot vai junto: a checagem do navegador é só UX, quem posta direto
      // no endpoint pula ela. Quem decide de verdade é o doPost.
      site: hp,
      data: new Date().toISOString()
    };

    submitLead(payload);
  });

  function lock(state) {
    var btn = leadForm.querySelector('button[type="submit"]');
    if (btn) { btn.disabled = state; btn.textContent = state ? "Enviando…" : "Confirmar participação"; }
  }

  function paraWhatsApp() {
    location.href = "https://wa.me/" + WHATSAPP_BOT + "?text=" + encodeURIComponent(WHATSAPP_MSG);
  }

  function ok(nome) {
    lock(false);
    leadForm.reset();
    if (statusEl) {
      statusEl.className = "form-status ok";
      statusEl.textContent = "Recebido, " + nome.split(" ")[0] + "! Te levando pro WhatsApp…";
    }
    paraWhatsApp();
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

    var corpo = JSON.stringify(payload);

    // sendBeacon primeiro: o clique já vai mandar pro WhatsApp em seguida, e
    // um fetch normal corre risco de ser abortado pelo navegador no meio da
    // troca de página. sendBeacon é feito pra isso — sobrevive à navegação.
    // Corpo string = Content-Type text/plain por padrão, igual ao fetch abaixo.
    if (navigator.sendBeacon && navigator.sendBeacon(LEAD_ENDPOINT, corpo)) {
      ok(payload.nome);
      return;
    }

    // sem sendBeacon (ou recusou o payload): só redireciona depois da
    // resposta, senão arrisca perder o registro na troca de página.
    fetch(LEAD_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" }, // evita preflight no Apps Script
      body: corpo
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
    var fotos = Array.prototype.slice.call(gimgs);
    var atual = 0;
    // construído via DOM (sem innerHTML): nada de string de markup, zero risco de XSS
    var dlg = document.createElement("dialog");
    dlg.className = "lightbox";
    var botao = function (cls, txt, rotulo) {
      var b = document.createElement("button");
      b.type = "button"; b.className = cls; b.textContent = txt;
      b.setAttribute("aria-label", rotulo);
      return b;
    };
    var lbClose = botao("lightbox-close", "\u00d7", "Fechar");
    var lbPrev = botao("lightbox-nav lightbox-prev", "\u2039", "Foto anterior");
    var lbNext = botao("lightbox-nav lightbox-next", "\u203a", "Pr\u00f3xima foto");
    var lbImg = document.createElement("img");
    lbImg.alt = "";
    var lbCap = document.createElement("p");
    lbCap.className = "lightbox-cap";
    dlg.append(lbClose, lbPrev, lbNext, lbImg, lbCap);
    document.body.appendChild(dlg);

    // Índice circular: da última a seta "próxima" volta pra primeira, em vez de
    // desabilitar o botão — quem está navegando não quer descobrir onde acaba.
    var mostrar = function (i) {
      atual = (i + fotos.length) % fotos.length;
      var img = fotos[atual];
      var fig = img.closest("figure");
      var cap = fig && fig.querySelector("figcaption");
      lbImg.src = img.currentSrc || img.src;
      lbImg.alt = img.alt || "";
      lbCap.textContent = cap ? cap.textContent : "";
    };
    var abrir = function (img) {
      mostrar(fotos.indexOf(img));
      dlg.showModal();
    };

    fotos.forEach(function (img) {
      img.setAttribute("tabindex", "0");
      img.setAttribute("role", "button");
      img.setAttribute("aria-label", "Ampliar foto: " + (img.alt || ""));
      img.addEventListener("click", function () { abrir(img); });
      img.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); abrir(img); }
      });
    });

    lbPrev.addEventListener("click", function () { mostrar(atual - 1); });
    lbNext.addEventListener("click", function () { mostrar(atual + 1); });
    // Esc já vem do <dialog>; as setas do teclado são o par natural dos botões
    dlg.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") { e.preventDefault(); mostrar(atual - 1); }
      else if (e.key === "ArrowRight") { e.preventDefault(); mostrar(atual + 1); }
    });
    // arrasto no celular: 40px é o mínimo que não confunde com toque torto
    var x0 = null;
    dlg.addEventListener("touchstart", function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    dlg.addEventListener("touchend", function (e) {
      if (x0 === null) return;
      var d = e.changedTouches[0].clientX - x0;
      x0 = null;
      if (Math.abs(d) > 40) mostrar(atual + (d < 0 ? 1 : -1));
    }, { passive: true });

    // fecha ao clicar no backdrop ou no X (pseudo não conta como alvo do dialog)
    dlg.addEventListener("click", function (e) {
      if (e.target === dlg || e.target.classList.contains("lightbox-close")) dlg.close();
    });
    dlg.addEventListener("close", function () { lbImg.removeAttribute("src"); });
  }

  /* ---------- vídeos: a capa inteira é o play, e o pôster chega tarde ----------
     Dois problemas no mesmo lugar. (1) Com <video controls>, o único alvo que
     toca é o botão nativo no meio do card — pequeno no desktop, ignorado no
     celular, onde o dedo cai na foto. Aqui o controls sai do HTML e entra no
     primeiro clique: até lá o card inteiro é o botão. O listener é one-shot de
     propósito — mantê-lo faria o clique no "pausar" (que o navegador reentrega
     ao <video>) voltar a tocar o vídeo.
     (2) preload="none" segura os MB do vídeo, mas NÃO o pôster: os 13 .webp
     (~740KB) saíam junto com o HTML, antes de alguém rolar até a seção. Agora
     cada um entra quando o card se aproxima, e o que sobrar entra sozinho 3s
     depois — nunca na abertura, que é onde o atraso aparece. */
  var videos = Array.prototype.slice.call(document.querySelectorAll(".video-card video"));
  if (videos.length) {
    videos.forEach(function (v) {
      var card = v.closest(".video-card");
      // controls saem AQUI, nao no HTML: sem JS o video tem que continuar tocavel
      v.controls = false;
      v.setAttribute("tabindex", "0");
      v.setAttribute("role", "button");
      var legenda = card && card.querySelector("figcaption strong");
      v.setAttribute("aria-label", "Reproduzir vídeo" + (legenda ? ": " + legenda.textContent : ""));
      var tocar = function () {
        v.removeEventListener("click", tocar);
        v.removeAttribute("role");
        v.removeAttribute("aria-label");
        v.controls = true;
        if (card) card.classList.add("tocando");
        var p = v.play();
        if (p && p.catch) p.catch(function () {});   // autoplay barrado: controls já estão lá
      };
      v.addEventListener("click", tocar);
      v.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); tocar(); }
      });
      // dois áudios ao mesmo tempo não é opção de ninguém
      v.addEventListener("play", function () {
        videos.forEach(function (o) { if (o !== v && !o.paused) o.pause(); });
      });
    });

    var porPoster = function (v) {
      if (!v.dataset.poster) return;
      v.poster = v.dataset.poster;
      delete v.dataset.poster;
    };
    if ("IntersectionObserver" in window) {
      var ioP = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (e.isIntersecting) { porPoster(e.target); ioP.unobserve(e.target); }
        });
      }, { rootMargin: "600px 0px" });   // uma tela e meia de antecedência
      videos.forEach(function (v) { ioP.observe(v); });
    } else {
      videos.forEach(porPoster);
    }
    // rede ociosa, depois da página pronta: o resto entra para o clique
    // encontrar a capa já ali. requestIdleCallback só existe no Chrome/Firefox.
    setTimeout(function () {
      var resto = function () { videos.forEach(porPoster); };
      if (window.requestIdleCallback) window.requestIdleCallback(resto, { timeout: 2000 });
      else resto();
    }, 3000);
  }

  /* ---------- legendas do mesmo tamanho, com "Ler mais" ----------
     As legendas vao de uma linha a tres paragrafos, e o grid estica a fileira
     inteira ate o card mais alto: uma legenda longa abria um vao embaixo dos
     quatro cards vizinhos. A caixa e travada em 6 linhas pelo CSS; aqui so
     nascem o embrulho e o botao.

     Construido no JS, nao no HTML, por um motivo: quem esta sem JS nao teria
     botao, e uma legenda cortada sem como abrir e conteudo escondido. Sem JS
     nao ha .video-legenda, e o CSS do corte (todo sob .js) nunca se aplica. */
  var legendas = [];
  document.querySelectorAll(".video-card figcaption").forEach(function (cap) {
    var textos = Array.prototype.slice.call(cap.querySelectorAll("p.prose"));
    var card = cap.closest(".video-card");

    // Legenda sem paragrafo (hoje so o card do Destaque, que e titulo puro) nao
    // ganha caixa. Reservar as 6 linhas nele abria um vao branco de ~200px
    // debaixo do titulo, com cara de defeito. A altura travada existe para
    // alinhar cards que dividem a MESMA fileira do grid; o Destaque esta sozinho
    // no bloco dele, entao nao ha com o que alinhar. Sem caixa tambem nao ha
    // corte nem botao, o que mantem o estado coerente.
    if (!textos.length) return;

    // appendChild em vez de insertBefore: os unicos filhos sao <strong> e os
    // <p>, entao mover os paragrafos para dentro preserva a ordem.
    var caixa = document.createElement("div");
    caixa.className = "video-legenda";
    cap.appendChild(caixa);
    textos.forEach(function (t) { caixa.appendChild(t); });

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "legenda-mais";
    btn.textContent = "Ler mais";
    btn.setAttribute("aria-expanded", "false");
    // fechado por padrao; o CSS esconde o botao ate a medida provar que ha corte
    cap.appendChild(btn);

    btn.addEventListener("click", function () {
      var aberta = card.classList.toggle("legenda-aberta");
      btn.textContent = aberta ? "Ler menos" : "Ler mais";
      btn.setAttribute("aria-expanded", aberta ? "true" : "false");
    });

    legendas.push({ caixa: caixa, btn: btn, card: card });
  });

  if (legendas.length) {
    // A medida marca o CARD, nao o botao: a faixa de degrade e o "Ler mais" leem
    // a mesma classe, entao nao existe estado em que um aparece sem o outro.
    // O +1 absorve o arredondamento subpixel que faz scrollHeight passar do
    // clientHeight por uma fracao de pixel sem haver corte de verdade.
    var medirLegendas = function () {
      legendas.forEach(function (l) {
        if (l.card.classList.contains("legenda-aberta")) return;   // aberta mede altura cheia
        l.card.classList.toggle("legenda-cortada", l.caixa.scrollHeight > l.caixa.clientHeight + 1);
      });
    };
    medirLegendas();
    // a fonte real remexe a quebra: o que cabia em 6 linhas com a fallback pode nao caber
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(medirLegendas);
    // so a LARGURA muda a quebra, e no mobile o resize dispara a cada mexida da barra de URL
    var larguraL = window.innerWidth, remedirL;
    window.addEventListener("resize", function () {
      if (window.innerWidth === larguraL) return;
      larguraL = window.innerWidth;
      clearTimeout(remedirL);
      remedirL = setTimeout(medirLegendas, 150);
    });
  }

  /* ---------- vídeos: "ver mais" com espiada em gradiente ----------
     O grid usa auto-fill (minmax 220px), então o número de colunas muda com a
     largura — não dá pra travar o corte num breakpoint fixo no CSS. Mede a
     coluna e a altura real da fileira depois do layout, e clipa o grid em
     max-height (não hidden/display:none): o conteúdo continua no fluxo e
     acessível a leitor de tela, só fica clipado visualmente com uma espiada
     da 2ª fileira esmaecendo em gradiente até a cor de fundo da seção.
     Botão e corte só nascem aqui: sem JS não há classe nem max-height, então
     nada fica escondido — o bloco aparece inteiro.
     .video-grid-sempre-aberto (o Destaque) fica de fora: são só 1-2 vídeos
     curados, esconder atrás de botão no mobile não faz sentido pra "destaque". */
  var gradesVideo = Array.prototype.slice.call(document.querySelectorAll(".video-grid:not(.video-grid-sempre-aberto)"));
  if (gradesVideo.length) {
    var FILEIRAS_VISIVEIS = 1;
    var ESPIA_PX = 40;   // só uma tira da fileira seguinte, não ela quase inteira
    var BOTAO_FOLGA = 24;   // espaço reservado abaixo do gradiente, só pro botão descer mais
    var semMovimentoVideo = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // mantém "el" no MESMO pixel da tela enquanto algo ao redor dele muda de
    // tamanho — usado só ao FECHAR. Sem isto: ou o scroll não se mexe e o
    // fim da transição solta a pessoa em outro lugar da página (às vezes
    // literalmente o fim do site, se o scroll antigo não cabe mais no
    // documento encolhido), ou só corrige no FIM da transição, o que dá um
    // vai-e-volta visível (desce, espera, volta). Compensando quadro a
    // quadro, o botão nunca sai do lugar — nem durante, nem depois.
    var ancorarDurante = function (el, duracaoMs) {
      var y0 = el.getBoundingClientRect().top;
      var inicio = null;
      var passo = function (agora) {
        if (inicio === null) inicio = agora;
        var y1 = el.getBoundingClientRect().top;
        if (y1 !== y0) {
          window.scrollBy(0, y1 - y0);
          y0 = el.getBoundingClientRect().top;
        }
        if (agora - inicio < duracaoMs) requestAnimationFrame(passo);
      };
      requestAnimationFrame(passo);
    };
    var ajustarGrade = function (grade) {
      // filtra o botão de fora: ele mora DENTRO do grid (pra empilhar sobre o
      // gradiente), mas não é card e não pode entrar na contagem de fileiras
      var cards = Array.prototype.slice.call(grade.children).filter(function (el) {
        return !el.classList.contains("video-ver-mais");
      });
      if (cards.length < 2) return;
      var estilo = window.getComputedStyle(grade);
      var colunas = estilo.gridTemplateColumns.split(" ").length;
      var limite = colunas * FILEIRAS_VISIVEIS;
      var precisaBotao = cards.length > limite;
      var btn = grade.querySelector(".video-ver-mais");
      var botaoJaExistia = !!btn;   // distingue "1ª carga" de "fechando de verdade" mais abaixo

      if (!precisaBotao) {
        grade.classList.remove("video-grid-recolhido", "video-grid-expandido");
        grade.style.maxHeight = "";
        if (btn) btn.hidden = true;
        return;
      }
      // o(s) card(s) que ficam por baixo do gradiente só mostram uma tira —
      // curta demais pra sustentar o fade/slide do reveal sem parecer quebrado.
      // Sem a classe "reveal" eles nascem visíveis, junto com os de cima.
      cards.forEach(function (card, i) { if (i >= limite) card.classList.remove("reveal"); });

      var expandido = grade.classList.contains("video-grid-expandido");
      if (!btn) {
        if (!grade.id) grade.id = "video-grid-" + Math.random().toString(36).slice(2);
        btn = document.createElement("button");
        btn.type = "button";
        btn.className = "btn video-ver-mais";
        btn.setAttribute("aria-expanded", "false");
        btn.setAttribute("aria-controls", grade.id);
        btn.addEventListener("click", function () {
          var vaiFechar = grade.classList.contains("video-grid-expandido");
          grade.classList.toggle("video-grid-expandido");
          ajustarGrade(grade);
          // só ao fechar: abrir já se resolve sozinho no transitionend, lá
          // embaixo (o scrollIntoView de sempre, que a pessoa gostou).
          if (vaiFechar) ancorarDurante(btn, semMovimentoVideo ? 0 : 340);
        });
        grade.appendChild(btn);   // dentro do grid: em .video-grid-recolhido vira
                                  // position:absolute (CSS) e some do fluxo/colunas
        // ao abrir, o max-height fica travado no valor calculado até a transição
        // acabar — só então solta pro fluxo livre, senão uma legenda que cresce
        // depois (o "Ler mais" dela) ficaria cortada por um max-height velho
        grade.addEventListener("transitionend", function (e) {
          if (e.target === grade && e.propertyName === "max-height" &&
              grade.classList.contains("video-grid-expandido")) {
            grade.classList.remove("video-grid-recolhido");
            grade.style.maxHeight = "";
            // o grid cresce pra BAIXO da tela — sem rolar atrás, o clique em
            // "Veja mais" parece não ter feito nada (nada do que apareceu
            // ficou visível). Só depois que a transição termina, porque
            // antes disso o botão ainda está na posição velha (a altura só
            // "pega" de verdade quadro a quadro, não no instante do clique).
            btn.scrollIntoView({ block: "end", behavior: semMovimentoVideo ? "auto" : "smooth" });
          }
        });
      }

      if (expandido) {
        // já tá aberto e solto (sem clip): não há o que animar de novo aqui,
        // isso só dispara na abertura em si (ver o click acima)
        if (grade.classList.contains("video-grid-recolhido")) {
          // força o navegador a "fixar" o estado atual (classe .video-grid-expandido
          // já aplicada, max-height ainda no valor recolhido) antes de mudar o
          // valor — sem isso as duas mudanças caem no mesmo frame e não anima,
          // pula direto pro final
          grade.offsetHeight;
          grade.style.maxHeight = grade.scrollHeight + "px";
        }
      } else {
        // altura real da fileira, não valor chutado: cards de blocos diferentes
        // têm alturas diferentes (com/sem legenda), e o grid não é sempre o mesmo
        var alturaFileira = cards[0].getBoundingClientRect().height;
        var espacoLinhas = parseFloat(estilo.rowGap) || 0;
        var alturaRecolhida = alturaFileira * FILEIRAS_VISIVEIS + espacoLinhas * FILEIRAS_VISIVEIS + ESPIA_PX + BOTAO_FOLGA;
        // fechando de um "Veja mais" de verdade (não a 1ª carga da página):
        // trava a altura ATUAL antes de religar o clip, senão a transição
        // não tem de onde partir e pula direto pro final — mesmo truque do
        // abrir, só que o reflow vem DEPOIS de ligar a classe (lá vem antes)
        // porque aqui é a CLASSE que muda no meio do caminho, não só o valor.
        if (botaoJaExistia && !grade.classList.contains("video-grid-recolhido")) {
          grade.style.maxHeight = grade.scrollHeight + "px";
          grade.classList.add("video-grid-recolhido");
          grade.offsetHeight;
        } else {
          grade.classList.add("video-grid-recolhido");
        }
        grade.style.maxHeight = alturaRecolhida + "px";
        // o gradiente cobre a espiada INTEIRA até o corte de verdade (senão
        // sobra fatia crua, sem esmaecer, entre o fim dele e o botão) — mas
        // fica sólido (--espia-solido) já na METADE do botão pra cima, não
        // só no pixel final: assim a "borda branca" cruza o meio do botão
        // em vez de nascer coladinha nele.
        var totalEspia = ESPIA_PX + BOTAO_FOLGA;
        var alturaBotao = btn.getBoundingClientRect().height;
        grade.style.setProperty("--espia-altura", totalEspia + "px");
        grade.style.setProperty("--espia-solido", (totalEspia - alturaBotao / 2) + "px");
      }

      btn.hidden = false;
      btn.setAttribute("aria-expanded", expandido ? "true" : "false");
      btn.textContent = expandido ? "Ver menos" : "Veja mais";
    };
    gradesVideo.forEach(ajustarGrade);
    // só a LARGURA muda a coluna do grid, e no mobile o resize dispara a cada
    // mexida da barra de URL (mesmo tratamento das legendas, acima)
    var larguraV = window.innerWidth, remedirV;
    window.addEventListener("resize", function () {
      if (window.innerWidth === larguraV) return;
      larguraV = window.innerWidth;
      clearTimeout(remedirV);
      remedirV = setTimeout(function () { gradesVideo.forEach(ajustarGrade); }, 150);
    });
  }

  /* ---------- texto que acende linha a linha, atado ao scroll ----------
     Porte do ScrollReveal (React Bits) sem React/GSAP, com os parâmetros que
     você passou: baseOpacity .1, enableBlur, baseRotation 1, blurStrength 4.

     Uma mudança de propósito no ScrollTrigger do original: lá o curso é o
     parágrafo inteiro ('top bottom-=20%' → 'bottom bottom'), então parágrafo
     grande fica borrado INTEIRO enquanto sobe — texto ilegível no meio da tela.
     Aqui o borrão é uma faixa presa à base da JANELA, com a altura de ~1,5
     linha: só a linha que está entrando embaixo fica embaçada, e tudo que já
     subiu está limpo. Cada palavra é medida uma vez (--o, distância do topo do
     parágrafo); no scroll o JS escreve UM número por parágrafo (--y) e o CSS
     resolve palavra por palavra. Palavras da mesma linha têm o mesmo --o, então
     acendem juntas — é linha a linha, não palavra a palavra.

     Scrub calculado no scroll, não view-timeline nem ScrollTrigger — mesma
     escolha já feita nos títulos (.titulo-float).
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
      s.textContent = parte;
      frag.appendChild(s);
      n++;
    });
    if (!n) return;
    el.textContent = "";
    el.appendChild(frag);
    el.classList.add("wordreveal");
    if (semMovimento) el.classList.add("suave");   // sem blur nem rotação, só o acender
    paragrafos.push({ el: el, palavras: el.querySelectorAll(".w"), ultimo: null, ultimoR: -1 });
  });

  if (paragrafos.length) {
    var travaP = function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; };
    var faixa = 1;      // altura do borrão, em px — ~1,5 linha, medida no texto real

    /* Mede cada palavra uma vez: --o = distância do topo do parágrafo.
       Lê tudo antes de escrever qualquer coisa; ler rect depois de escrever
       estilo no mesmo laço força recálculo de layout por palavra. */
    var medir = function () {
      var entrelinha = Infinity;
      paragrafos.forEach(function (t) {
        var topo = t.el.getBoundingClientRect().top;
        var linhas = [];
        var offs = Array.prototype.map.call(t.palavras, function (w) {
          var o = Math.round(w.getBoundingClientRect().top - topo);
          if (linhas.indexOf(o) === -1) linhas.push(o);
          return o;
        });
        offs.forEach(function (o, k) { t.palavras[k].style.setProperty("--o", o); });
        t.ultimo = null;
        // entrelinha real = menor distância entre duas linhas vizinhas
        linhas.sort(function (a, b) { return a - b; });
        for (var k = 1; k < linhas.length; k++) {
          entrelinha = Math.min(entrelinha, linhas[k] - linhas[k - 1]);
        }
      });
      faixa = Math.round(Math.max(entrelinha === Infinity ? 0 : entrelinha, 24) * 1.2);
      document.documentElement.style.setProperty("--faixa", faixa);
    };

    var pintarTexto = function () {
      var alturaVis = window.innerHeight;
      // Linha da tela onde a palavra ainda está borrada. Colada na base: com a
      // faixa de 1,2 linha acima dela, só a última linha visível pega borrão.
      var limiar = alturaVis * 0.99;
      // fim da página: o que sobrou embaixo nunca vai cruzar a faixa — acende tudo
      var noFim = window.scrollY + alturaVis >= document.documentElement.scrollHeight - 2;
      paragrafos.forEach(function (t) {
        var caixa = t.el.getBoundingClientRect();
        if (caixa.bottom < -200 || caixa.top > alturaVis + 200) return;   // fora da tela: nem calcula

        /* --y é herdado, então cada escrita obriga o navegador a recalcular o
           estilo de TODAS as palavras do parágrafo. Fora da faixa o resultado
           já está saturado — apagado embaixo, aceso em cima — e continuar
           escrevendo custaria esse recálculo por frame sem mudar um pixel.
           Grampeando o valor nos extremos, escreve uma vez e para. */
        var teto = Math.round(caixa.height + faixa);
        var y = noFim ? teto : Math.round(limiar - caixa.top);
        y = y < 0 ? 0 : (y > teto ? teto : y);
        if (y !== t.ultimo) {
          var acesoAntes = t.ultimo === teto;
          t.ultimo = y;
          t.el.style.setProperty("--y", y);
          // tudo aceso: tira o filter do caminho do compositor
          if ((y === teto) !== acesoAntes) t.el.classList.toggle("pronto", y === teto);
        }
        if (semMovimento) return;

        // Rotação: o parágrafo entra 1deg torto e desentorta enquanto sobe.
        // transform inline, não custom property: --pr também é herdado e
        // pagaria o mesmo recálculo de todas as palavras, por um giro que só
        // afeta o parágrafo.
        var pr = Math.round(travaP((alturaVis - caixa.top) / Math.max(caixa.height, alturaVis * 0.3)) * 100) / 100;
        if (pr === t.ultimoR) return;
        t.ultimoR = pr;
        t.el.style.transform = pr === 1 ? "" : "rotate(" + ((1 - pr).toFixed(2)) + "deg)";
      });
    };

    var agendadoP = false;
    window.addEventListener("scroll", function () {
      if (agendadoP) return;
      agendadoP = true;
      requestAnimationFrame(function () { agendadoP = false; pintarTexto(); });
    }, { passive: true });
    // remedir é caro (lê o rect de cada palavra) e no mobile o resize dispara a
    // cada mexida da barra de URL — só remede quando a LARGURA muda de verdade.
    var larguraP = window.innerWidth, remedir;
    window.addEventListener("resize", function () {
      if (window.innerWidth === larguraP) { pintarTexto(); return; }
      larguraP = window.innerWidth;
      clearTimeout(remedir);
      remedir = setTimeout(function () { medir(); pintarTexto(); }, 150);
    });
    medir();
    pintarTexto();
    // a fonte carregada remexe a quebra de linha: mede de novo quando ela chega
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { medir(); pintarTexto(); });
    }
  }
})();
