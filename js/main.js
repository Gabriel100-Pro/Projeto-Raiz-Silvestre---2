(() => {
  "use strict";

  document.documentElement.classList.add("js");

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const hasIO = "IntersectionObserver" in window;

  /* ---------- Ano atual no rodapé ---------- */
  document.querySelectorAll("[data-year]").forEach((el) => { el.textContent = new Date().getFullYear(); });

  /* ---------- Rodapé: "RAIZ SILVESTRE" surge letra por letra, de baixo para cima (uma vez) ---------- */
  const wordmark = document.querySelector("[data-wordmark]");
  if (wordmark) {
    const text = wordmark.textContent.trim();
    wordmark.textContent = "";
    [...text].forEach((ch, i) => {
      const span = document.createElement("span");
      span.className = ch === " " ? "letter letter--space" : "letter";
      span.textContent = ch === " " ? "" : ch;
      span.style.setProperty("--i", i);
      wordmark.appendChild(span);
    });

    // A animação só começa quando o nome entra na tela e não se repete
    if (reduceMotion.matches || !hasIO) {
      wordmark.classList.add("is-revealed");
    } else {
      wordmark.classList.add("is-waiting");
      const io = new IntersectionObserver((entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        wordmark.classList.add("is-revealed");
        io.disconnect();
      }, { threshold: 0.5 });
      io.observe(wordmark);
    }
  }

  /* ---------- Menu mobile ---------- */
  const toggle = document.querySelector(".menu-toggle");
  const nav = document.getElementById("menu");

  if (toggle && nav) {
    const setOpen = (open) => {
      nav.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
    };
    toggle.addEventListener("click", () => setOpen(!nav.classList.contains("is-open")));
    nav.addEventListener("click", (e) => { if (e.target.closest("a")) setOpen(false); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") setOpen(false); });
  }

  /* ---------- Link ativo do menu conforme a seção visível ---------- */
  const links = [...document.querySelectorAll(".nav__link")];
  const sections = links
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);

  if (hasIO && sections.length) {
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((link) => {
          const active = link.getAttribute("href") === `#${entry.target.id}`;
          link.classList.toggle("is-active", active);
          if (active) link.setAttribute("aria-current", "page");
          else link.removeAttribute("aria-current");
        });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    sections.forEach((section) => spy.observe(section));
  }

  /* ---------- Revelação suave ao rolar ---------- */
  const reveals = document.querySelectorAll(".reveal");
  if (hasIO && !reduceMotion.matches) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        io.unobserve(entry.target);
      });
    }, { threshold: 0.15 });
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add("is-visible"));
  }

  /* ---------- Números subindo a partir do zero ---------- */
  const counters = [...document.querySelectorAll("[data-count]")];
  const formatter = new Intl.NumberFormat("pt-BR");
  const formatCount = (el, value) =>
    `${el.dataset.prefix || ""}${formatter.format(value)}${el.dataset.suffix || ""}`;

  const runCounter = (el, delay) => {
    const target = Number(el.dataset.count);
    if (reduceMotion.matches) { el.textContent = formatCount(el, target); return; }
    const duration = 2200;
    let start;
    const tick = (now) => {
      if (start === undefined) start = now;
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 4);
      el.textContent = formatCount(el, Math.round(target * eased));
      if (t < 1) requestAnimationFrame(tick);
    };
    setTimeout(() => requestAnimationFrame(tick), delay);
  };

  counters.forEach((el) => { el.textContent = formatCount(el, 0); });
  if (hasIO) {
    const countIO = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        // data-delay define o atraso de cada valor; sem ele, os números entram em sequência
        runCounter(el, el.dataset.delay ? Number(el.dataset.delay) : counters.indexOf(el) * 180);
        countIO.unobserve(entry.target);
      });
    }, { threshold: 0.6 });
    counters.forEach((el) => countIO.observe(el));
  } else {
    counters.forEach((el) => runCounter(el, 0));
  }

  /* ---------- Vídeo de fundo: só toca quando visível e sem movimento reduzido ---------- */
  document.querySelectorAll("[data-bg-video]").forEach((bgVideo) => {
    const play = () => { bgVideo.play().catch(() => {}); };
    if (reduceMotion.matches) {
      bgVideo.removeAttribute("autoplay");
      bgVideo.pause();
    } else if (hasIO) {
      new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) play();
        else bgVideo.pause();
      }).observe(bgVideo.parentElement);
    }
  });

  /* ---------- Planos: luz que segue o cursor e revela a floresta ao fundo ---------- */
  const plans = document.querySelector("[data-plans]");
  if (plans) {
    const shade = plans.querySelector(".plans__shade");
    let pointer = null; // posição do cursor dentro da seção (px), quando houver
    let lx = 0;
    let ly = 0;
    let plansVisible = false;

    plans.addEventListener("pointermove", (e) => {
      if (e.pointerType !== "mouse") return;
      const r = plans.getBoundingClientRect();
      pointer = { x: e.clientX - r.left, y: e.clientY - r.top };
    });
    plans.addEventListener("pointerleave", () => { pointer = null; });

    const glow = (now) => {
      if (plansVisible) {
        const w = plans.offsetWidth;
        const h = plans.offsetHeight;
        // Sem cursor, a luz passeia sozinha devagar, como um raio de sol entre as folhas
        const target = pointer || {
          x: w * (0.5 + 0.32 * Math.sin(now / 4200)),
          y: h * (0.42 + 0.18 * Math.sin(now / 3100)),
        };
        lx += (target.x - lx) * 0.08;
        ly += (target.y - ly) * 0.08;
        shade.style.setProperty("--mx", `${lx.toFixed(1)}px`);
        shade.style.setProperty("--my", `${ly.toFixed(1)}px`);
      }
      requestAnimationFrame(glow);
    };

    if (!reduceMotion.matches) {
      lx = plans.offsetWidth / 2;
      ly = plans.offsetHeight * 0.4;
      if (hasIO) {
        new IntersectionObserver(([entry]) => { plansVisible = entry.isIntersecting; }).observe(plans);
      } else {
        plansVisible = true;
      }
      requestAnimationFrame(glow);
    }
  }

  /* ---------- Chamada: as palavras vão se fixando conforme a rolagem ---------- */
  const manifesto = document.querySelector("[data-manifesto]");
  if (manifesto) {
    // Divide cada trecho em palavras; a chamada para ação (já marcada como .word) entra por último
    manifesto.querySelectorAll("[data-words]").forEach((el) => {
      const words = el.textContent.trim().split(/\s+/);
      el.textContent = "";
      words.forEach((w, i) => {
        const span = document.createElement("span");
        span.className = "word";
        span.textContent = w;
        el.appendChild(span);
        if (i < words.length - 1) el.appendChild(document.createTextNode(" "));
      });
    });
    const words = [...manifesto.querySelectorAll(".word")];

    // Ajusta a fonte para o texto ocupar a tela inteira (largura e altura) sem cortar
    const text = manifesto.querySelector(".manifesto__text");
    const lines = [...manifesto.querySelectorAll(".manifesto__line")];
    const fit = () => {
      text.style.fontSize = "";
      if (window.innerWidth <= 600) return;
      const base = parseFloat(getComputedStyle(text).fontSize);
      const widest = Math.max(...lines.map((line) => line.getBoundingClientRect().width));
      const lineHeight = parseFloat(getComputedStyle(text).lineHeight) / base;
      const byWidth = base * (window.innerWidth * 0.94) / widest;
      const byHeight = (window.innerHeight * 0.8) / (lines.length * lineHeight);
      text.style.fontSize = `${Math.min(byWidth, byHeight)}px`;
    };
    fit();
    if (document.fonts) document.fonts.ready.then(fit);
    window.addEventListener("resize", fit);

    const paint = () => {
      const rect = manifesto.getBoundingClientRect();
      const total = manifesto.offsetHeight - window.innerHeight;
      const progress = Math.min(1, Math.max(0, -rect.top / Math.max(1, total)));
      // Termina um pouco antes do fim para a frase ficar completa ainda fixada na tela
      const lit = progress * words.length * 1.3;
      words.forEach((word, i) => {
        word.style.setProperty("--lit", Math.min(1, Math.max(0, lit - i)).toFixed(3));
      });
    };

    if (reduceMotion.matches) {
      words.forEach((word) => word.style.setProperty("--lit", 1));
    } else {
      let ticking = false;
      const onScroll = () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => { paint(); ticking = false; });
      };
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onScroll);
      paint();
    }
  }

  /* ---------- Cinema no jardim: a câmera se aproxima da tela conforme a rolagem ---------- */
  const cinema = document.querySelector("[data-cinema]");
  if (cinema) {
    const stage = cinema.querySelector(".cinema__stage");
    const scene = cinema.querySelector("[data-cinema-scene]");
    const screen = cinema.querySelector("[data-cinema-screen]");

    // Cantos da tela na foto (frações da imagem 2600 × 1734): sup. esq., sup. dir., inf. dir., inf. esq.
    const QUAD = [[0.181, 0.121], [0.4915, 0.2255], [0.4862, 0.4875], [0.1775, 0.4945]];
    const RATIO = 2600 / 1734;

    const clamp01 = (v) => Math.min(1, Math.max(0, v));
    const lerp = (a, b, t) => a + (b - a) * t;
    const smooth = (a, b, v) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };
    const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

    // Matriz de perspectiva que leva o retângulo (0,0)-(w,h) aos 4 pontos do quadrilátero
    const solve = (A, b) => {
      const n = b.length;
      for (let i = 0; i < n; i++) {
        let max = i;
        for (let r = i + 1; r < n; r++) if (Math.abs(A[r][i]) > Math.abs(A[max][i])) max = r;
        [A[i], A[max]] = [A[max], A[i]];
        [b[i], b[max]] = [b[max], b[i]];
        for (let r = i + 1; r < n; r++) {
          const f = A[r][i] / A[i][i];
          for (let c = i; c < n; c++) A[r][c] -= f * A[i][c];
          b[r] -= f * b[i];
        }
      }
      const x = new Array(n).fill(0);
      for (let i = n - 1; i >= 0; i--) {
        let sum = b[i];
        for (let c = i + 1; c < n; c++) sum -= A[i][c] * x[c];
        x[i] = sum / A[i][i];
      }
      return x;
    };
    const homography = (w, h, q) => {
      const src = [[0, 0], [w, 0], [w, h], [0, h]];
      const A = [];
      const b = [];
      src.forEach(([x, y], i) => {
        const [u, v] = q[i];
        A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u);
        A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v);
      });
      const [a, bb, c, d, e, f, g, hh] = solve(A, b);
      return `matrix3d(${a},${d},0,${g},${bb},${e},0,${hh},0,0,1,0,${c},${f},0,1)`;
    };

    const render = (p) => {
      const vw = stage.clientWidth;
      const vh = stage.clientHeight;
      // A foto cobre a tela inteira (como object-fit: cover)
      const sw = Math.max(vw, vh * RATIO);
      const sh = sw / RATIO;
      const corners = QUAD.map(([x, y]) => [x * sw, y * sh]);
      const fx = corners.reduce((s, c) => s + c[0], 0) / 4;
      const fy = corners.reduce((s, c) => s + c[1], 0) / 4;
      // Enquadramento inicial: tela da foto centralizada na horizontal e com respiro no topo
      const top = Math.min(...corners.map((c) => c[1]));
      const ox = Math.min(0, Math.max(vw - sw, vw / 2 - fx));
      const oy = Math.min(0, Math.max(vh - sh, vh * 0.12 - top));
      const screenW = ((corners[1][0] - corners[0][0]) + (corners[2][0] - corners[3][0])) / 2;

      // Aproximação da câmera: zoom contínuo até a tela da foto ocupar a tela do site
      const e = easeInOut(clamp01(p / 0.85));
      // Aproxima até a tela da foto ocupar a largura do site (no celular não passa da largura)
      const kEnd = (vw / screenW) * 1.04;
      const k = Math.pow(kEnd, e);
      const cx = lerp(ox + fx, vw / 2, e);
      const cy = lerp(oy + fy, vh / 2, e);
      const tx = cx - k * fx;
      const ty = cy - k * fy;
      scene.style.width = `${sw}px`;
      scene.style.height = `${sh}px`;
      scene.style.transform = `translate(${tx}px, ${ty}px) scale(${k})`;

      // No fim, a tela se endireita e vira a própria tela do site
      const m = smooth(0.5, 0.9, p);
      const target = [[0, 0], [vw, 0], [vw, vh], [0, vh]];
      const quad = corners.map(([x, y], i) => [
        lerp(tx + k * x, target[i][0], m),
        lerp(ty + k * y, target[i][1], m),
      ]);
      screen.style.width = `${vw}px`;
      screen.style.height = `${vh}px`;
      screen.style.transform = homography(vw, vh, quad);
      screen.style.setProperty("--text", "1");
      // O texto acende conforme a câmera se aproxima
      screen.style.setProperty("--title", (0.3 + 0.7 * smooth(0.35, 0.85, p)).toFixed(3));
      stage.style.setProperty("--vignette", (1 - m).toFixed(3));
    };

    const progress = () => {
      const rect = cinema.getBoundingClientRect();
      const total = cinema.offsetHeight - window.innerHeight;
      return clamp01(-rect.top / Math.max(1, total));
    };

    if (reduceMotion.matches) {
      render(1);
      window.addEventListener("resize", () => render(1));
    } else {
      let ticking = false;
      const update = () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => { render(progress()); ticking = false; });
      };
      window.addEventListener("scroll", update, { passive: true });
      window.addEventListener("resize", update);
      if (scene.complete) update(); else scene.addEventListener("load", update);
      update();
    }
  }

  /* ---------- Slider de serviços: um card por vez para a esquerda ---------- */
  const slider = document.querySelector("[data-slider]");
  if (slider) {
    const track = slider.querySelector("[data-slider-track]");
    const originals = [...track.children];
    const total = originals.length;
    const currentEl = slider.querySelector("[data-slider-current]");
    const totalEl = slider.querySelector("[data-slider-total]");
    const bar = slider.querySelector("[data-slider-bar]");
    const INTERVAL = 3200;
    const pad = (n) => String(n).padStart(2, "0");

    // Cópias dos primeiros cards no fim permitem voltar ao 1 sem salto visível
    originals.slice(0, 6).forEach((item) => {
      const clone = item.cloneNode(true);
      clone.setAttribute("aria-hidden", "true");
      clone.querySelectorAll("img").forEach((img) => { img.alt = ""; });
      track.appendChild(clone);
    });

    let index = 0;
    let timer = null;
    let inView = false;

    totalEl.textContent = pad(total);

    const stepSize = () => {
      const first = track.children[0];
      const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      return first.getBoundingClientRect().width + gap;
    };

    const render = (animate = true) => {
      track.classList.toggle("no-anim", !animate);
      track.style.transform = `translateX(${-index * stepSize()}px)`;
      const shown = (index % total) + 1;
      currentEl.textContent = pad(shown);
      bar.style.transform = `scaleX(${shown / total})`;
      if (!animate) {
        void track.offsetWidth; // aplica a posição antes de reativar a transição
        track.classList.remove("no-anim");
      }
    };

    const next = () => { index += 1; render(); };
    const prev = () => {
      if (index === 0) { index = total; render(false); }
      index -= 1;
      render();
    };

    // Ao chegar na cópia do card 1, volta silenciosamente para o original
    track.addEventListener("transitionend", (e) => {
      if (e.target !== track) return;
      if (index >= total) { index -= total; render(false); }
    });

    // Avança sozinho enquanto a seção estiver visível (desktop e mobile)
    const stop = () => { clearInterval(timer); timer = null; };
    const start = () => {
      stop();
      if (!inView || document.hidden) return;
      timer = setInterval(next, INTERVAL);
    };

    // Setas (visíveis no mobile/tablet) reiniciam a contagem do autoplay
    slider.querySelector("[data-slider-next]").addEventListener("click", () => { next(); start(); });
    slider.querySelector("[data-slider-prev]").addEventListener("click", () => { prev(); start(); });
    document.addEventListener("visibilitychange", start);
    window.addEventListener("resize", () => render(false));

    if (hasIO) {
      new IntersectionObserver(([entry]) => {
        inView = entry.isIntersecting;
        start();
      }, { threshold: 0.15 }).observe(slider);
    } else {
      inView = true;
      start();
    }

    render(false);
  }

  /* ---------- Arco de cards da Hero ---------- */
  const arc = document.querySelector("[data-arc]");
  if (!arc) return;

  const cards = [...arc.querySelectorAll("[data-arc-card]")];
  const count = cards.length;
  const half = count / 2;

  /*
   * Posição de cada card conforme a distância até o centro.
   * Valores medidos na referência (card central = 245 × 282 px):
   *   x     → deslocamento horizontal do centro do card (px)
   *   rot   → rotação no eixo Y (graus), cria o efeito de superfície curva
   *   scale → redução progressiva em direção às extremidades
   *   lift  → leve subida da base dos cards mais distantes
   * Distâncias fracionadas (durante o arraste) são interpoladas.
   */
  const SLOTS = [
    { x: 0,   rot: 0,  scale: 1,     lift: 0,  shade: 0 },
    { x: 232, rot: 40, scale: 0.955, lift: 0,  shade: 0.28 },
    { x: 410, rot: 47, scale: 0.87,  lift: 2,  shade: 0.42 },
    { x: 548, rot: 56, scale: 0.76,  lift: 8,  shade: 0.55 },
    { x: 650, rot: 62, scale: 0.66,  lift: 14, shade: 0.65 },
  ];
  const BASE_W = 245;
  const BASE_H = 282;

  const slotAt = (depth) => {
    const i = Math.min(Math.floor(depth), SLOTS.length - 2);
    const t = Math.min(1, depth - i);
    const a = SLOTS[i];
    const b = SLOTS[i + 1];
    const mix = (key) => a[key] + (b[key] - a[key]) * t;
    return { x: mix("x"), rot: mix("rot"), scale: mix("scale"), lift: mix("lift"), shade: mix("shade") };
  };

  // Posição contínua: o número inteiro mais próximo é o card central
  let pos = Math.max(0, cards.findIndex((card) => card.hasAttribute("data-arc-start")));

  const wrapOffset = (index, at) => {
    let k = (index - at) % count;
    if (k >= half) k -= count;
    if (k < -half) k += count;
    return k;
  };

  const metrics = () => {
    const vw = window.innerWidth;
    if (vw >= 1300) return { size: 1, spread: 1, visible: 3 };
    if (vw >= 900) return { size: (vw - 60) / 1240, spread: 1, visible: 3 };
    if (vw >= 640) return { size: 0.76, spread: 1, visible: 2 };
    return { size: Math.min(0.86, (vw - 40) / 300), spread: Math.min(1, (vw - 40) / 420), visible: 2 };
  };

  let m = metrics();

  const layout = () => {
    arc.style.setProperty("--card-w", `${BASE_W * m.size}px`);
    arc.style.setProperty("--card-h", `${BASE_H * m.size}px`);
    const centerIndex = ((Math.round(pos) % count) + count) % count;

    cards.forEach((card, index) => {
      const k = wrapOffset(index, pos);
      const depth = Math.abs(k);
      const dir = Math.sign(k);
      const slot = slotAt(depth);

      // Card que dá a volta de um lado para o outro não deve atravessar a tela
      if (card._k !== undefined && Math.abs(k - card._k) > half) {
        card.classList.add("no-anim");
        requestAnimationFrame(() => requestAnimationFrame(() => card.classList.remove("no-anim")));
      }
      card._k = k;

      card.style.transform =
        `translateX(${dir * slot.x * m.size * m.spread}px) ` +
        `translateY(${-slot.lift * m.size}px) ` +
        `perspective(${2400 * m.size}px) rotateY(${dir * slot.rot}deg) ` +
        `scale(${slot.scale})`;
      card.style.opacity = String(Math.max(0, Math.min(1, (m.visible + 0.5 - depth) / 0.5)));
      card.style.zIndex = String(Math.round(100 - depth * 10));
      card.style.pointerEvents = depth > m.visible + 0.25 ? "none" : "";
      card.style.setProperty("--depth", Math.round(depth));
      card.style.setProperty("--shade", slot.shade);
      card.style.setProperty("--shade-dir", dir < 0 ? "90deg" : "270deg");
      card.classList.toggle("is-center", index === centerIndex);
      card.setAttribute("aria-hidden", String(depth > m.visible));
    });
  };

  // Pausa o giro automático por um instante para a transição até o card escolhido
  let settleUntil = 0;
  const goTo = (target) => {
    settleUntil = performance.now() + 900;
    arc.classList.remove("is-spinning");
    pos = target;
    layout();
  };

  cards.forEach((card, index) => {
    // Cada card flutua em uma fase diferente (a sombra usa o mesmo atraso)
    card.style.setProperty("--float-delay", `${index * -0.75}s`);
    card.addEventListener("mouseenter", () => { hovering = true; });
    card.addEventListener("mouseleave", () => { hovering = false; });
    card.addEventListener("click", () => {
      if (dragMoved) return;
      const k = wrapOffset(index, Math.round(pos));
      if (k !== 0) goTo(Math.round(pos) + k);
    });
  });

  arc.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") { e.preventDefault(); goTo(Math.round(pos) + 1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); goTo(Math.round(pos) - 1); }
  });

  // Arrastar com o cursor (ou o dedo): os cards acompanham o movimento
  let dragStartX = null;
  let dragStartPos = 0;
  let dragMoved = false;
  let lastX = 0;
  let lastT = 0;
  let velocity = 0;

  const stepPx = () => SLOTS[1].x * m.size * m.spread;

  arc.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    dragStartX = lastX = e.clientX;
    lastT = performance.now();
    dragStartPos = pos;
    dragMoved = false;
    velocity = 0;
  });

  arc.addEventListener("pointermove", (e) => {
    if (dragStartX === null) return;
    const dx = e.clientX - dragStartX;
    if (!dragMoved && Math.abs(dx) < 6) return;
    if (!dragMoved) {
      dragMoved = true;
      arc.classList.add("is-dragging");
      arc.setPointerCapture(e.pointerId);
    }
    const now = performance.now();
    velocity = (e.clientX - lastX) / Math.max(1, now - lastT);
    lastX = e.clientX;
    lastT = now;
    pos = dragStartPos - dx / stepPx();
    layout();
  });

  const endDrag = () => {
    if (dragStartX === null) return;
    dragStartX = null;
    if (!dragMoved) return;
    arc.classList.remove("is-dragging");
    // Um gesto rápido avança mais um card na direção do movimento
    const fling = Math.abs(velocity) > 0.5 ? -Math.sign(velocity) * 0.5 : 0;
    goTo(Math.round(pos + fling));
    setTimeout(() => { dragMoved = false; }, 0);
  };

  arc.addEventListener("pointerup", endDrag);
  arc.addEventListener("pointercancel", endDrag);

  /* Giro contínuo: os cards só param quando o cursor está sobre um deles */
  const SPIN_SPEED = 0.28; // cards por segundo
  let hovering = false;
  let arcInView = true;
  let lastFrame = performance.now();

  if (hasIO) {
    new IntersectionObserver(([entry]) => { arcInView = entry.isIntersecting; }).observe(arc);
  }

  const spin = (now) => {
    const dt = Math.min(0.1, (now - lastFrame) / 1000);
    lastFrame = now;
    const canSpin = !reduceMotion.matches && !hovering && !dragMoved &&
      dragStartX === null && arcInView && !document.hidden && now > settleUntil;
    arc.classList.toggle("is-spinning", canSpin);
    if (canSpin) {
      pos += SPIN_SPEED * dt;
      layout();
    }
    requestAnimationFrame(spin);
  };
  requestAnimationFrame(spin);

  let resizeFrame;
  window.addEventListener("resize", () => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => { m = metrics(); layout(); });
  });

  layout();
})();
