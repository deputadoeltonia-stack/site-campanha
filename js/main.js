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
  var LEAD_ENDPOINT = ""; // ex.: "https://script.google.com/macros/s/XXXX/exec"

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

  /* ---------- abas de vídeo (WAI-ARIA tabs pattern, ativação manual) ---------- */
  var tabList = document.querySelector(".tab-list");
  if (tabList) {
    var tabs = Array.prototype.slice.call(tabList.querySelectorAll('[role="tab"]'));
    var panels = tabs.map(function (t) { return document.getElementById(t.getAttribute("aria-controls")); });
    var indicator = tabList.querySelector(".tab-indicator");

    // indicator: largura/altura variam por aba (label diferente), então não dá pra
    // animar só com transform — é um span decorativo absoluto, sem irmãos afetados
    // pelo reflow, então o custo do layout-thrash aqui é irrelevante na prática.
    var moveIndicator = function (tab) {
      if (!indicator) return;
      indicator.style.width = tab.offsetWidth + "px";
      indicator.style.height = tab.offsetHeight + "px";
      indicator.style.transform = "translate(" + tab.offsetLeft + "px," + tab.offsetTop + "px)";
    };

    var selectTab = function (tab) {
      tabs.forEach(function (t, i) {
        var selected = t === tab;
        t.setAttribute("aria-selected", String(selected));
        t.tabIndex = selected ? 0 : -1;
        if (panels[i]) panels[i].hidden = !selected;
      });
      moveIndicator(tab);
    };

    // posiciona sem animar no load (evita o indicator "deslizar" do canto na 1ª pintura)
    var activeTab = tabs.filter(function (t) { return t.getAttribute("aria-selected") === "true"; })[0] || tabs[0];
    tabList.classList.add("no-motion");
    moveIndicator(activeTab);
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { tabList.classList.remove("no-motion"); });
    });

    // reflow (resize/orientação) pode mudar largura/wrap das abas — reposiciona
    var resizeTimer;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        var current = tabs.filter(function (t) { return t.getAttribute("aria-selected") === "true"; })[0];
        if (current) moveIndicator(current);
      }, 120);
    });

    tabList.addEventListener("click", function (e) {
      var tab = e.target.closest && e.target.closest('[role="tab"]');
      if (tab) selectTab(tab);
    });

    tabList.addEventListener("keydown", function (e) {
      var i = tabs.indexOf(document.activeElement);
      if (i === -1) return;
      var next = null;
      if (e.key === "ArrowRight") next = tabs[(i + 1) % tabs.length];
      else if (e.key === "ArrowLeft") next = tabs[(i - 1 + tabs.length) % tabs.length];
      else if (e.key === "Home") next = tabs[0];
      else if (e.key === "End") next = tabs[tabs.length - 1];
      if (next) { e.preventDefault(); selectTab(next); next.focus(); }
    });

    // pausa vídeos das outras abas ao trocar (evita áudio tocando escondido)
    tabList.addEventListener("click", function () {
      panels.forEach(function (p) {
        if (!p) return;
        p.querySelectorAll("video").forEach(function (v) { if (p.hidden) v.pause(); });
      });
    });
  }

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
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r; })
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
})();
