/* =========================================================
   Feliz Día de las Flores Amarillas
   Flor → semilla → suelo → árbol → corazón (centro a fuera) + texto
   ========================================================= */

(() => {
  'use strict';

  /* ---------------- Texto ---------------- */

  const CARTA = {
    titulo: '🌻 Feliz Día de las Flores Amarillas 🌻',
    lineas: [
      'Cada girasol que ves aquí es un latido de mi corazón.',
      'Así como el sol ilumina los campos, tú iluminas mi vida.',
      'Que estas flores te recuerden lo especial que eres para mí.',
      '— ¡Te amo!'
    ]
  };

  /* ---------------- Paleta ---------------- */

  const COLOR = {
    tallo:       '#1f7a5c',
    talloOscuro: '#17654d',
    petalo:      '#f7c521',
    petaloBorde: '#e9a413',
    corazon:     '#5c2f0b',
    semilla:     '#8a4a12',
    tinta:       '#16130f'
  };

  /* ---------------- Tiempos exactos en milisegundos ---------------- */

  const T = {
    encoger:  [0,    600],    // 1. La flor se hace pequeñita
    caer:     [600,  1300],   // 2. Cae hacia la línea negra
    bote:     [1300, 1500],   // Rebote suave en el suelo
    suelo:    1400,           // Aparece la línea negra

    crecer:   [1600, 3200],   // 3. Sale el árbol hacia arriba
    florecer: [3300, 6800],   // 4. Salen las flores del corazón desde dentro hacia afuera
    camara:   3300,           // Desplazamiento para dejar sitio a la carta
    texto:    3400,           // 5. A la vez, empieza a escribirse el texto
    petalos:  7200            // Pétalos flotando al terminar
  };

  const VELOCIDAD_TITULO = 58;
  const VELOCIDAD_TEXTO  = 42;

  /* ---------------- Utilidades ---------------- */

  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp  = (a, b, t) => a + (b - a) * t;
  const norm  = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
  const outCubic = t => 1 - Math.pow(1 - t, 3);
  const inQuad   = t => t * t;
  const outBack  = t => { const c = 1.75; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };

  function rngDesde(semilla) {
    let a = semilla >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ---------------- Elementos ---------------- */

  const stage  = document.getElementById('stage');
  const canvas = document.getElementById('scene');
  const ctx    = canvas.getContext('2d');
  const suelo  = document.getElementById('ground');
  const carta  = document.getElementById('letter');
  const firma  = document.getElementById('signature');
  const btnIni = document.getElementById('start');
  const btnRep = document.getElementById('replay');

  const destinos = [
    document.getElementById('ln-title'),
    document.getElementById('ln-1'),
    document.getElementById('ln-2'),
    document.getElementById('ln-3'),
    document.getElementById('ln-4')
  ];

  let W = 0, H = 0, DPR = 1, movil = false;
  let G = {};
  let ramas = [], flores = [], cayendo = [];
  let sprite = null;

  let iniciado = false, t0 = 0, reloj = 0, anterior = 0;
  let desplazamiento = 0, ultimoPetalo = 0;
  let textoLanzado = false;
  let temporizadores = [];

  /* ---------------- Sprite del girasol ---------------- */

  function crearSprite(lado) {
    const c = document.createElement('canvas');
    c.width = c.height = lado;
    const g = c.getContext('2d');
    const R = lado / 2;

    const petalos = 18;
    for (let i = 0; i < petalos; i++) {
      const a = (i / petalos) * Math.PI * 2;
      g.save();
      g.translate(R, R);
      g.rotate(a);
      const grad = g.createLinearGradient(R * 0.18, 0, R, 0);
      grad.addColorStop(0, '#fbd449');
      grad.addColorStop(0.55, COLOR.petalo);
      grad.addColorStop(1, COLOR.petaloBorde);
      g.fillStyle = grad;
      g.beginPath();
      g.ellipse(R * 0.57, 0, R * 0.43, R * 0.15, 0, 0, Math.PI * 2);
      g.fill();
      g.restore();
    }

    const disco = g.createRadialGradient(R * 0.92, R * 0.92, R * 0.03, R, R, R * 0.36);
    disco.addColorStop(0, '#80491a');
    disco.addColorStop(1, COLOR.corazon);
    g.fillStyle = disco;
    g.beginPath();
    g.arc(R, R, R * 0.33, 0, Math.PI * 2);
    g.fill();

    g.fillStyle = 'rgba(28, 13, 2, .5)';
    for (let i = 0; i < 26; i++) {
      const ang = i * 2.39996;
      const rad = R * 0.29 * Math.sqrt(i / 26);
      g.beginPath();
      g.arc(R + Math.cos(ang) * rad, R + Math.sin(ang) * rad, R * 0.026, 0, Math.PI * 2);
      g.fill();
    }

    return c;
  }

  function pintarGirasol(x, y, d, giro, alfa) {
    if (d <= 0.8) return;
    ctx.save();
    if (alfa !== undefined && alfa < 1) ctx.globalAlpha = alfa;
    ctx.translate(x, y);
    if (giro) ctx.rotate(giro);
    ctx.drawImage(sprite, -d / 2, -d / 2, d, d);
    ctx.restore();
  }

  /* ---------------- Geometría ---------------- */

  function medir() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = stage.clientWidth;
    H = stage.clientHeight;
    canvas.width  = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    movil = W < 900 || H > W;

    let sueloY, s, cxFinal, textoW = 0, hueco = 0;

    if (movil) {
      sueloY  = H * 0.65;
      s       = Math.min(sueloY * 0.355, W * 0.305);
      cxFinal = W * 0.5;
    } else {
      sueloY  = H * 0.88;
      textoW  = clamp(W * 0.30, 300, 540);
      hueco   = W * 0.05;
      s = Math.min(H * 0.325, (W * 0.89 - textoW - hueco) / 2.32);
      cxFinal = W * 0.5 + hueco / 2 + textoW / 2;
    }

    G = {
      sueloY,
      s,
      cx: cxFinal,
      cy: sueloY - s * 1.55,
      floresD: s * 0.175,
      desplazaFinal: cxFinal - W * 0.5,
      florX: W * 0.5,
      florY: H * 0.45,
      florD: Math.min(W, H) * (movil ? 0.34 : 0.24)
    };

    suelo.style.top = (sueloY - 1) + 'px';

    if (movil) {
      carta.style.left = '';
      carta.style.width = '';
      carta.style.top = (sueloY + H * 0.045) + 'px';
    } else {
      carta.style.left  = (cxFinal - s * 1.16 - hueco - textoW) + 'px';
      carta.style.width = textoW + 'px';
      carta.style.top   = ((G.cy - s * 0.87 + sueloY) / 2) + 'px';
    }

    const lado = G.florD * 1.1;
    btnIni.style.left   = (G.florX - lado / 2) + 'px';
    btnIni.style.top    = (G.florY - lado / 2) + 'px';
    btnIni.style.width  = lado + 'px';
    btnIni.style.height = lado + 'px';
  }

  /* ---------------- El corazón ---------------- */

  const CORAZON = (() => {
    const pts = [];
    for (let i = 0; i < 240; i++) {
      const t = (i / 240) * Math.PI * 2;
      pts.push([
        16 * Math.pow(Math.sin(t), 3),
        13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)
      ]);
    }
    return pts;
  })();

  function dentroDelCorazon(px, py, factor) {
    const k = G.s * 0.0725 * (factor || 1);
    const x = (px - G.cx) / k;
    const y = -(py - G.cy) / k;
    let dentro = false;
    for (let i = 0, n = CORAZON.length, j = n - 1; i < n; j = i++) {
      const [xi, yi] = CORAZON[i];
      const [xj, yj] = CORAZON[j];
      if ((yi > y) !== (yj > y)) {
        const corte = xi + ((y - yi) / (yj - yi)) * (xj - xi);
        if (x < corte) dentro = !dentro;
      }
    }
    return dentro;
  }

  /* ---------------- El árbol ---------------- */

  function construirArbol() {
    ramas = [];
    const rnd = rngDesde(20260921);
    const alturaTotal = G.sueloY - G.cy + G.s * 0.55;

    function rama(x, y, ang, largo, ancho, prof, inicio) {
      if (prof > 0) {
        let intentos = 0;
        while (intentos < 7 && !dentroDelCorazon(
          x + Math.cos(ang) * largo, y + Math.sin(ang) * largo, 0.9)) {
          largo *= 0.7;
          intentos++;
        }
        if (intentos >= 7) return;
      }

      const x1 = x + Math.cos(ang) * largo;
      const y1 = y + Math.sin(ang) * largo;
      const dur = largo * 9;

      ramas.push({ x0: x, y0: y, x1, y1, w0: ancho, w1: ancho * 0.58, prof, inicio, dur });

      if (prof >= 5 || largo < alturaTotal * 0.055) return;

      const hijos = prof === 0 ? 3 : (rnd() < 0.3 ? 3 : 2);
      for (let i = 0; i < hijos; i++) {
        const desvio = hijos === 3
          ? (i - 1) * (0.42 + rnd() * 0.2)
          : (i === 0 ? -1 : 1) * (0.30 + rnd() * 0.3);
        rama(
          x1, y1,
          ang + desvio * (prof === 0 ? 1.05 : 0.85),
          largo * (0.63 + rnd() * 0.14),
          ancho * 0.6,
          prof + 1,
          inicio + dur * 0.8
        );
      }
    }

    rama(G.cx, G.sueloY, -Math.PI / 2, alturaTotal * 0.36, Math.max(8, G.s * 0.155), 0, 0);

    let fin = 0;
    ramas.forEach(r => { fin = Math.max(fin, r.inicio + r.dur); });
    const [ca, cb] = T.crecer;
    ramas.forEach(r => {
      r.tA = lerp(ca, cb, r.inicio / fin);
      r.tB = lerp(ca, cb, (r.inicio + r.dur) / fin);
    });
  }

  function pintarRama(r, p) {
    if (p <= 0) return;
    const x1 = lerp(r.x0, r.x1, p);
    const y1 = lerp(r.y0, r.y1, p);
    const w1 = lerp(r.w0, r.w1, p);
    const dx = x1 - r.x0, dy = y1 - r.y0;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len;

    ctx.beginPath();
    ctx.moveTo(r.x0 + nx * r.w0 / 2, r.y0 + ny * r.w0 / 2);
    ctx.lineTo(x1 + nx * w1 / 2, y1 + ny * w1 / 2);
    ctx.lineTo(x1 - nx * w1 / 2, y1 - ny * w1 / 2);
    ctx.lineTo(r.x0 - nx * r.w0 / 2, r.y0 - ny * r.w0 / 2);
    ctx.closePath();
    ctx.fillStyle = r.prof === 0 ? COLOR.tallo : COLOR.talloOscuro;
    ctx.fill();
  }

  /* ---------------- Los girasoles (Centro a afuera) ---------------- */

  function construirFlores() {
    flores = [];
    cayendo = [];
    const rnd = rngDesde(970321);
    const d = G.floresD;
    const minDist = d * 0.52;
    const celda = minDist;
    const rejilla = new Map();
    const clave = (i, j) => i + ',' + j;

    function libre(x, y) {
      const i = Math.floor(x / celda), j = Math.floor(y / celda);
      for (let a = -1; a <= 1; a++) {
        for (let b = -1; b <= 1; b++) {
          const lista = rejilla.get(clave(i + a, j + b));
          if (!lista) continue;
          for (const p of lista) if (Math.hypot(p[0] - x, p[1] - y) < minDist) return false;
        }
      }
      return true;
    }

    function registrar(x, y) {
      const k = clave(Math.floor(x / celda), Math.floor(y / celda));
      if (!rejilla.has(k)) rejilla.set(k, []);
      rejilla.get(k).push([x, y]);
    }

    const x0 = G.cx - G.s * 1.18, x1 = G.cx + G.s * 1.18;
    const y0 = G.cy - G.s * 0.92, y1 = G.cy + G.s * 1.28;

    for (let i = 0; i < 12000 && flores.length < 340; i++) {
      const x = lerp(x0, x1, rnd());
      const y = lerp(y0, y1, rnd());
      if (!dentroDelCorazon(x, y) || !libre(x, y)) continue;
      registrar(x, y);
      flores.push({
        x, y,
        d: d * (0.82 + rnd() * 0.36),
        giro: rnd() * Math.PI * 2,
        r: Math.hypot((x - G.cx) / G.s, (y - G.cy + G.s * 0.12) / G.s), // Distancia desde el centro del corazón
        j: rnd()
      });
    }

    for (let i = 0; i < 4; i++) {
      const ang = -Math.PI / 2 + (rnd() - 0.5) * 2.2;
      flores.push({
        x: G.cx + Math.cos(ang) * G.s * 0.8,
        y: G.cy + G.s * 1.3 + rnd() * G.s * 0.25,
        d: d * (0.6 + rnd() * 0.25),
        giro: rnd() * Math.PI * 2,
        r: 1.3,
        j: rnd()
      });
    }

    // Ordenar estrictamente desde el centro (r menor) hacia afuera (r mayor)
    let rMax = 0;
    flores.forEach(f => { if (f.r > rMax) rMax = f.r; });
    const [fa, fb] = T.florecer;
    const duracionApertura = 1000;
    flores.forEach(f => {
      const orden = clamp((f.r / (rMax || 1)) * 0.8 + f.j * 0.2, 0, 1);
      f.tA = lerp(fa, fb - duracionApertura, orden);
      f.tB = f.tA + duracionApertura;
    });
  }

  /* ---------------- Girasoles que caen ---------------- */

  function soltarPetalo() {
    if (!flores.length) return;
    const f = flores[Math.floor(Math.random() * flores.length)];
    cayendo.push({
      x: f.x, y: f.y,
      d: f.d * (0.55 + Math.random() * 0.35),
      giro: Math.random() * Math.PI * 2,
      vGiro: (Math.random() - 0.5) * 0.04,
      vy: 0.4 + Math.random() * 0.35,
      fase: Math.random() * Math.PI * 2,
      vaiven: 0.5 + Math.random() * 0.9
    });
  }

  function moverPetalos(dt) {
    const paso = dt / 16.67;
    for (let i = cayendo.length - 1; i >= 0; i--) {
      const p = cayendo[i];
      p.y += p.vy * paso;
      p.fase += 0.035 * paso;
      p.x += Math.sin(p.fase) * p.vaiven * paso * 0.45;
      p.giro += p.vGiro * paso;
      if (p.y > G.sueloY - 2) cayendo.splice(i, 1);
    }
  }

  /* ---------------- Animación inicial (Flor → Semilla → Suelo) ---------------- */

  function pintarComienzo(t) {
    const { florX: fx, florY: fy, florD: fd } = G;

    if (!iniciado) {
      const pulso = 1 + Math.sin(t / 650) * 0.03;
      pintarGirasol(fx, fy, fd * pulso, Math.sin(t / 2600) * 0.1);

      const x1 = fx + fd * 0.2;
      const lx = fx + fd * 0.62 + Math.min(W * 0.05, 60);
      const ly = fy - fd * 0.16;
      ctx.save();
      ctx.strokeStyle = COLOR.tinta;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(x1, fy + fd * 0.02);
      ctx.lineTo(lx, ly);
      ctx.lineTo(lx + Math.min(W * 0.1, 130), ly);
      ctx.stroke();

      ctx.fillStyle = COLOR.tinta;
      ctx.font = `${Math.max(15, Math.min(W * 0.017, 24))}px "Cormorant Garamond", serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText('Click Aquí', lx + 4, ly - 8);
      ctx.restore();
      return;
    }

    // 1. Se encoge el centro de la flor haciéndose más pequeño
    if (t < T.encoger[1]) {
      const p = outCubic(norm(t, T.encoger[0], T.encoger[1]));
      pintarGirasol(fx, fy, lerp(fd, fd * 0.06, p), p * 2.5, 1 - p * 0.1);
      return;
    }

    // 2. Cae hacia abajo directo a la línea negra del suelo
    if (t < T.bote[1]) {
      const rSem = Math.max(3, fd * 0.03);
      const sueloY = G.sueloY - rSem;
      let y;

      if (t < T.caer[1]) {
        y = lerp(fy, sueloY, inQuad(norm(t, T.caer[0], T.caer[1])));
      } else {
        const p = norm(t, T.caer[1], T.bote[1]);
        y = sueloY - Math.sin(p * Math.PI) * (fd * 0.08);
      }

      ctx.save();
      ctx.fillStyle = COLOR.semilla;
      ctx.beginPath();
      ctx.arc(fx, y, rSem, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  /* ---------------- Bucle principal ---------------- */

  function pintar(t) {
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.translate(-desplazamiento, 0);

    // Árbol
    if (iniciado && t >= T.crecer[0]) {
      for (const r of ramas) pintarRama(r, outCubic(norm(t, r.tA, r.tB)));
    }

    // Flores (Corazón desde dentro hacia afuera)
    if (iniciado && t >= T.florecer[0]) {
      for (const f of flores) {
        const p = norm(t, f.tA, f.tB);
        if (p <= 0) continue;
        pintarGirasol(f.x, f.y, f.d * (p < 1 ? outBack(p) : 1), f.giro, Math.min(1, p * 3));
      }
    }

    for (const p of cayendo) {
      pintarGirasol(p.x, p.y, p.d, p.giro, clamp((G.sueloY - p.y) / (G.s * 0.5), 0, 1));
    }

    ctx.restore();
    pintarComienzo(t);
  }

  function bucle(ahora) {
    if (!anterior) anterior = ahora;
    const dt = Math.min(ahora - anterior, 50);
    anterior = ahora;
    reloj = iniciado ? ahora - t0 : ahora;

    if (iniciado) {
      desplazamiento = G.desplazaFinal * (1 - outCubic(norm(reloj, T.camara, T.camara + 1000)));
      if (reloj > T.petalos && ahora - ultimoPetalo > 700) {
        ultimoPetalo = ahora;
        soltarPetalo();
      }
      moverPetalos(dt);
    } else {
      desplazamiento = G.desplazaFinal;
    }

    pintar(reloj);
    requestAnimationFrame(bucle);
  }

  /* ---------------- Máquina de escribir ---------------- */

  function escribir(el, texto, velocidad) {
    return new Promise(resolve => {
      const letras = Array.from(texto);
      const cursor = document.createElement('span');
      cursor.className = 'caret';
      el.textContent = '';
      el.appendChild(cursor);

      let i = 0;
      (function paso() {
        if (i >= letras.length) return resolve(cursor);
        cursor.insertAdjacentText('beforebegin', letras[i]);
        i++;
        const pausa = /[.,;:!?]/.test(letras[i - 1]) ? 220 : 0;
        temporizadores.push(setTimeout(paso, velocidad + pausa + Math.random() * 20));
      })();
    });
  }

  async function escribirCarta() {
    const textos = [CARTA.titulo, ...CARTA.lineas];
    for (let i = 0; i < textos.length; i++) {
      const cursor = await escribir(destinos[i], textos[i], i === 0 ? VELOCIDAD_TITULO : VELOCIDAD_TEXTO);
      cursor.remove();
      await new Promise(r => temporizadores.push(setTimeout(r, i === 0 ? 400 : 250)));
    }
    firma.classList.add('is-visible');
    temporizadores.push(setTimeout(() => { btnRep.hidden = false; }, 2000));
  }

  /* ---------------- Control y eventos ---------------- */

  function preparar() {
    medir();
    construirArbol();
    construirFlores();
    sprite = crearSprite(clamp(Math.round(G.florD * DPR), 320, 560));
  }

  function arrancar() {
    if (iniciado) return;
    iniciado = true;
    t0 = performance.now();
    ultimoPetalo = t0;
    btnIni.classList.add('is-gone');

    // Sincronizar aparición de la línea negra del suelo justo cuando cae la semilla
    temporizadores.push(setTimeout(() => suelo.classList.add('is-drawn'), T.suelo));
    
    // Iniciar simultáneamente el texto de la carta y el florecimiento del árbol
    temporizadores.push(setTimeout(() => {
      if (!textoLanzado) { textoLanzado = true; escribirCarta(); }
    }, T.texto));
  }

  function reiniciar() {
    temporizadores.forEach(clearTimeout);
    temporizadores = [];
    iniciado = false;
    textoLanzado = false;
    cayendo = [];
    destinos.forEach(el => { el.textContent = ''; });
    firma.classList.remove('is-visible');
    suelo.classList.remove('is-drawn');
    btnRep.hidden = true;
    btnIni.classList.remove('is-gone');
    preparar();
  }

  let reajuste;
  window.addEventListener('resize', () => {
    clearTimeout(reajuste);
    reajuste = setTimeout(() => {
      const tiempo = reloj, estaba = iniciado;
      preparar();
      if (estaba) t0 = performance.now() - tiempo;
    }, 180);
  });

  btnIni.addEventListener('click', arrancar);
  btnRep.addEventListener('click', reiniciar);
  document.addEventListener('keydown', e => {
    if ((e.key === 'Enter' || e.key === ' ') && !iniciado) { e.preventDefault(); arrancar(); }
  });

  function iniciar() {
    preparar();
    requestAnimationFrame(bucle);
  }

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(iniciar).catch(iniciar);
  } else {
    iniciar();
  }
})();