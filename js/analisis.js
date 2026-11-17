/* Robot Analista — lógica de análisis (sin DOM).
 * Portado de robot.py (versión servidor): rasgos de título, rendimiento relativo por formato,
 * multiplicadores de patrones, horarios, Shorts vs largos, palabras ganadoras e ideas por plantilla.
 * Funciona en el navegador (window.RA_Analisis) y en Node (require) para los tests.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.RA_Analisis = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Utilidades de regex con límites de palabra Unicode (\b de JS no entiende tildes)
  // ---------------------------------------------------------------------------
  var L = '[\\p{L}\\p{N}_]';
  function W(src, flags) {
    // src usa \w para "letra"; lo cambiamos por letras Unicode y agregamos límites de palabra
    var s = src.replace(/\\w/g, L);
    return new RegExp('(?<!' + L + ')(?:' + s + ')(?!' + L + ')', flags || 'iu');
  }

  var EMOJI_RE = /[\u{1F000}-\u{1FAFF}\u{2300}-\u{23FF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/u;
  var DINERO_RE = new RegExp('[\\$€£]|' + W(
    'd[oó]lares?|euros?|pesos|millones?|mill[oó]n|precio|vale|valen|cuesta|cuestan|pag[oóa]|pagaron|vend[ií]|vende|venden|' +
    'vendi[oó]|compr[oóa]|rechaz\\w*|cobr\\w*|arruin\\w*|dinero|caro|caros|barato|baratos|gratis|ganar|gan[oó]|ganancias?|' +
    'perdi\\w*|pierde|sueldo|fortuna|plata|lucas|usd|eur').source, 'iu');
  var NUM_PAL = W('cero|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|cien|mil|millones?');
  var GIRO_RE = W('pero|ya no|y ahora|sin embargo|en realidad|nadie|nunca|ni siquiera|resulta que|y termin\\w+|y luego|' +
    'y hoy|casi|no es|no son|no tiene|trampa|mentira|secreto|nunca existi\\w*|(?:menos|m[aá]s) que (?:t[uú]|vos|una casa)|' +
    'como una casa|cabe en|aunque|en cambio|lo que nadie');
  var PROMESA_RE = W('te (?:voy a|muestro|cuento|explico|digo|enseño)|vas a|descubr\\w+|aqu[ií] (?:est[aá]n|tienes|ten[eé]s)|' +
    'cosas que|lo que (?:nadie|no)|esto (?:te|nadie)|revisar|errores|trucos?|consejos?|c[oó]mo|tutorial|gu[ií]a|paso a paso|tips?');
  var PREG_RE = /[¿?]/u;

  var MAYUS_EXCL = W('GTA|BYD|FBI|SUV|GT|USA|EEUU|KM|PC|TV|YT|IA|AI|ONU|NBA|NFL|FIFA|BMW|VW', 'u');

  function sinTags(t) { return (t || '').replace(/#[\p{L}\p{N}_]+/gu, '').trim(); }

  function rasgosTitulo(t) {
    t = t || '';
    var s = sinTags(t);
    return {
      numero: /\d/.test(t),
      dinero: DINERO_RE.test(t),
      pero_giro: GIRO_RE.test(t),
      pregunta: PREG_RE.test(t),
      emoji: EMOJI_RE.test(t),
      hashtag_shorts: /#shorts/i.test(t),
      parentesis: /\(.+\)/u.test(t) || t.indexOf('...') >= 0 || t.indexOf('…') >= 0,
      mayusculas: W('[A-ZÁÉÍÓÚÑ]{3,}', 'u').test(t.replace(new RegExp(MAYUS_EXCL.source, 'gu'), '')),
      lista_numerada: /^\s*\d+\s+[\p{L}]/u.test(t),
      historia_pasado: W('\\w+(?:ó|aron|ieron)').test(s),
      largo_chars: Array.from(s).length,
      titulo_largo: Array.from(s).length > 55,
      titulo_consejo: PROMESA_RE.test(s),
      por_que: W('por ?qu[eé]').test(s),
      primera_persona: W('yo|mi|mis|me|prob[eé]|compr[eé]|hice|constru[ií]|vend[ií]|gan[eé]|perd[ií]|intent[eé]|viv[ií]').test(s),
      desaparicion: W('desapareci\\w*|desaparec\\w*|muri[oó]|murieron|prohib\\w*|descontinu\\w*|mat[oó]|mataron|dej[oó] de|' +
        'olvidad\\w*|fracas\\w*|quebr\\w*|ruina|hundi\\w*|cerr[oó]|cancel\\w*').test(s),
      evitar_nunca: W('nunca (?:compres|hagas|uses|comas|digas)|no compres|no hagas|no debes|jam[aá]s|evit\\w*|lista negra|' +
        'no lo vendas|no vendas|pierdes|error fatal|cuidado').test(s),
      segunda_persona: W('tu|tus|t[uú]|te|vos|compra|compres|debes|deb[eé]s|vendes|tienes|ten[eé]s|puedes|pod[eé]s|sab[ií]as').test(s),
      record_extremo: W('el m[aá]s|la m[aá]s|los m[aá]s|las m[aá]s|r[eé]cord\\w*|del mundo|extrem\\w*|imposible|incre[ií]ble|' +
        'locura|rar[ií]sim\\w*|gigante|enorme').test(s),
      durabilidad: W('etern\\w*|indestructible\\w*|duran?|durar|sobreviv\\w*|irrompible\\w*|confiables?|para siempre|a[nñ]os despu[eé]s').test(s),
      decada_epoca: W('de los \\d0s?|de los (?:19|20)\\d\\d|\\d0s|años \\d0|antiguos?|cl[aá]sicos?|de antes|viejos?|historia de|' +
        'en (?:19|20)\\d\\d').test(s),
      pais_latam: W('m[eé]xico|mexican\\w*|argentin\\w*|chile\\w*|colombi\\w*|latinoam[eé]rica|latam|españa|espa[nñ]ol\\w*|' +
        'per[uú]|venezol\\w*|urugua\\w*|cuba\\w*|ecuador\\w*|bolivi\\w*|paragua\\w*').test(s),
      robo_crimen: W('rob\\w*|fraude|estafa\\w*|polic[ií]a|ladr\\w*|FBI|c[aá]rcel|arrest\\w*|demand\\w*|juicio|crimen|delito|preso').test(s),
      reto_experimento: W('reto|desaf[ií]o|experimento|24 horas|7 d[ií]as|30 d[ií]as|prob[eé]|intent[eé]|challenge').test(s)
    };
  }

  var NOMBRES_RASGO = {
    numero: 'Título con número/cifra',
    dinero: 'Título con dinero (precio, vender, rechazar, $)',
    pero_giro: 'Título con giro (pero, ya no, nunca, y ahora…)',
    pregunta: 'Título en forma de pregunta',
    emoji: 'Título con emoji',
    hashtag_shorts: 'Título con #shorts',
    parentesis: 'Título con paréntesis o "…" (remate)',
    mayusculas: 'Título con palabra en MAYÚSCULAS',
    lista_numerada: 'Título tipo lista ("5 cosas…")',
    historia_pasado: 'Título que cuenta una historia en pasado (rechazó, construyó…)',
    titulo_largo: 'Título largo (más de 55 caracteres)',
    titulo_consejo: 'Título de consejo/tutorial (cómo, errores, trucos)',
    por_que: 'Título "¿Por qué…?"',
    primera_persona: 'Título en primera persona (probé, mi, yo)',
    desaparicion: 'Tema caída/desaparición (desapareció, prohibieron, fracasó)',
    evitar_nunca: 'Tema advertencia (nunca hagas, evitá, cuidado)',
    segunda_persona: 'Título que le habla al espectador (vos, tu, tenés)',
    record_extremo: 'Tema récord/extremo (el más…, del mundo, increíble)',
    durabilidad: 'Tema durabilidad (eterno, sobrevive, para siempre)',
    decada_epoca: 'Tema época/nostalgia (de los 90, clásicos, de antes)',
    pais_latam: 'Título con país (México, Argentina, España…)',
    robo_crimen: 'Tema robo/fraude/policía/juicio',
    reto_experimento: 'Tema reto/experimento (24 horas, probé, desafío)',
    publicado_tarde: 'Publicado a la tarde/noche (desde las 15 h)',
    fin_de_semana: 'Publicado sábado o domingo',
    muchas_etiquetas: 'Con 10 o más etiquetas (tags)',
    descripcion_larga: 'Descripción larga (300+ caracteres)'
  };

  var DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  var ORDEN_DIAS = [1, 2, 3, 4, 5, 6, 0];

  // ---------------------------------------------------------------------------
  // Estadística básica
  // ---------------------------------------------------------------------------
  function mediana(xs) {
    var a = xs.filter(function (x) { return x !== null && x !== undefined && !isNaN(x); }).sort(function (p, q) { return p - q; });
    if (!a.length) return null;
    var m = Math.floor(a.length / 2);
    return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
  }
  function suma(xs) { return xs.reduce(function (s, x) { return s + (x || 0); }, 0); }
  function r2(x) { return x === null || x === undefined ? null : Math.round(x * 100) / 100; }

  function spearman(xs, ys) {
    var pares = [];
    for (var i = 0; i < xs.length; i++) if (xs[i] != null && ys[i] != null && !isNaN(xs[i]) && !isNaN(ys[i])) pares.push([xs[i], ys[i]]);
    if (pares.length < 5) return null;
    function rank(v) {
      var o = v.map(function (_, i) { return i; }).sort(function (a, b) { return v[a] - v[b]; });
      var r = new Array(v.length), i = 0;
      while (i < o.length) {
        var j = i;
        while (j + 1 < o.length && v[o[j + 1]] === v[o[i]]) j++;
        for (var k = i; k <= j; k++) r[o[k]] = (i + j) / 2;
        i = j + 1;
      }
      return r;
    }
    var a = rank(pares.map(function (p) { return p[0]; })), b = rank(pares.map(function (p) { return p[1]; }));
    var ma = suma(a) / a.length, mb = suma(b) / b.length, num = 0, da = 0, db = 0;
    for (var t = 0; t < a.length; t++) { num += (a[t] - ma) * (b[t] - mb); da += Math.pow(a[t] - ma, 2); db += Math.pow(b[t] - mb, 2); }
    var den = Math.sqrt(da * db);
    return den ? r2(num / den) : null;
  }

  // ---------------------------------------------------------------------------
  // Normalización de datos de la API
  // ---------------------------------------------------------------------------
  function parseDuracion(iso) {
    var m = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/.exec(iso || '');
    if (!m) return null;
    return (+(m[1] || 0)) * 86400 + (+(m[2] || 0)) * 3600 + (+(m[3] || 0)) * 60 + (+(m[4] || 0));
  }

  /** Decide si es Short. YouTube no lo marca en la API: ≤ 60 s = Short; de 61 s a 3 min, Short solo si es
   *  vertical (medidas del reproductor embebido) o lleva #shorts en el título; más de 3 min = largo. */
  function esShort(dur, vertical, titulo) {
    if (dur == null || dur === 0) return false;
    if (dur > 180) return false;
    if (dur <= 60) return true;
    return vertical === true || /#shorts?\b/i.test(titulo || '');
  }

  function videoDesdeApi(it) {
    var sn = it.snippet || {}, st = it.statistics || {}, cd = it.contentDetails || {}, pl = it.player || {};
    var dur = parseDuracion(cd.duration);
    var w = +pl.embedWidth || 0, h = +pl.embedHeight || 0;
    var vertical = w && h ? h > w : null;
    var th = sn.thumbnails || {};
    return {
      id: it.id,
      titulo: sn.title || '',
      fecha: sn.publishedAt || null,
      vistas: st.viewCount != null ? +st.viewCount : 0,
      likes: st.likeCount != null ? +st.likeCount : null,
      comentarios: st.commentCount != null ? +st.commentCount : null,
      duracion_s: dur,
      vertical: vertical,
      es_short: esShort(dur, vertical, sn.title),
      tags: sn.tags || [],
      desc_len: Array.from(sn.description || '').length,
      en_vivo: sn.liveBroadcastContent && sn.liveBroadcastContent !== 'none',
      url: 'https://www.youtube.com/watch?v=' + it.id,
      miniatura: (th.medium || th.default || {}).url || ''
    };
  }

  // ---------------------------------------------------------------------------
  // Preparación: rendimiento = vistas ÷ mediana de su formato (Shorts con Shorts, largos con largos)
  // ---------------------------------------------------------------------------
  function preparar(videos, ahora, horasMadurez) {
    ahora = ahora ? new Date(ahora) : new Date();
    horasMadurez = horasMadurez == null ? 48 : horasMadurez;
    var vs = videos.filter(function (v) { return !v.en_vivo; }).map(function (v) {
      var o = Object.assign({}, v);
      o.rasgos_titulo = rasgosTitulo(o.titulo);
      var f = o.fecha ? new Date(o.fecha) : null;
      o.edad_h = f ? Math.round((ahora - f) / 36e5 * 10) / 10 : null;
      o.maduro = o.edad_h == null || o.edad_h >= horasMadurez;
      o.like_rate = o.likes != null && o.vistas ? o.likes / o.vistas : null;
      o.coment_rate = o.comentarios != null && o.vistas ? o.comentarios / o.vistas : null;
      return o;
    });
    [true, false].forEach(function (fmt) {
      var g = vs.filter(function (v) { return v.es_short === fmt; });
      var med = mediana(g.filter(function (v) { return v.maduro; }).map(function (v) { return v.vistas; })) || 1;
      g.forEach(function (v) { v.rendimiento = r2(v.vistas / med); });
      var mad = g.filter(function (v) { return v.maduro; }).sort(function (a, b) { return b.rendimiento - a.rendimiento; });
      var k = mad.length >= 3 ? Math.max(1, Math.round(mad.length / 3)) : 0;
      mad.forEach(function (v, i) { v.grupo = i < k ? 'ganador' : i >= mad.length - k ? 'perdedor' : 'medio'; });
      g.forEach(function (v) { if (!v.grupo) v.grupo = 'nuevo'; });
    });
    return vs;
  }

  function rasgosBinarios(v) {
    var r = {};
    Object.keys(v.rasgos_titulo).forEach(function (k) { if (typeof v.rasgos_titulo[k] === 'boolean') r[k] = v.rasgos_titulo[k]; });
    if (v.fecha) {
      var f = new Date(v.fecha);
      r.publicado_tarde = f.getHours() >= 15;
      r.fin_de_semana = f.getDay() === 0 || f.getDay() === 6;
    }
    r.muchas_etiquetas = (v.tags || []).length >= 10;
    r.descripcion_larga = (v.desc_len || 0) >= 300;
    return r;
  }

  /** Multiplicador de cada rasgo: mediana del rendimiento CON el rasgo ÷ mediana SIN el rasgo. */
  function patrones(videos) {
    var mad = videos.filter(function (v) { return v.maduro; });
    var rb = mad.map(rasgosBinarios);
    var claves = {};
    rb.forEach(function (r) { Object.keys(r).forEach(function (k) { claves[k] = 1; }); });
    var gan = [], per = [];
    mad.forEach(function (v, i) { if (v.grupo === 'ganador') gan.push(i); if (v.grupo === 'perdedor') per.push(i); });
    var res = [];
    Object.keys(claves).sort().forEach(function (k) {
      var con = [], sin = [];
      mad.forEach(function (v, i) { if (rb[i][k] === true) con.push(v); else if (rb[i][k] === false) sin.push(v); });
      if (con.length < 2 || sin.length < 2) return;
      var mc = mediana(con.map(function (v) { return v.rendimiento; })), ms = mediana(sin.map(function (v) { return v.rendimiento; }));
      if (!ms) return;
      var pg = gan.filter(function (i) { return rb[i][k]; }).length / Math.max(1, gan.length);
      var pp = per.filter(function (i) { return rb[i][k]; }).length / Math.max(1, per.length);
      var ratio = Math.max(mc / ms, 0.01);
      res.push({
        rasgo: k, nombre: NOMBRES_RASGO[k] || k, n_con: con.length, n_sin: sin.length,
        mediana_con: r2(mc), mediana_sin: r2(ms), ratio: r2(ratio),
        pct_ganadores: Math.round(pg * 100), pct_perdedores: Math.round(pp * 100),
        fuerza: Math.round(Math.log(ratio) * Math.sqrt(Math.min(con.length, sin.length)) * 1000) / 1000,
        ejemplos: con.slice().sort(function (a, b) { return b.rendimiento - a.rendimiento; }).slice(0, 3)
          .map(function (v) { return { titulo: v.titulo, vistas: v.vistas, url: v.url }; }),
        contraejemplos: sin.slice().sort(function (a, b) { return a.rendimiento - b.rendimiento; }).slice(0, 2)
          .map(function (v) { return { titulo: v.titulo, vistas: v.vistas, url: v.url }; })
      });
    });
    res.sort(function (a, b) { return b.fuerza - a.fuerza; });
    return res;
  }

  function franjaDe(h) {
    return h >= 6 && h < 12 ? 'mañana (6–12 h)' : h >= 12 && h < 15 ? 'mediodía (12–15 h)' : h >= 15 && h < 20 ? 'tarde (15–20 h)' : 'noche (20–6 h)';
  }

  function horarios(videos) {
    var porDia = {}, porHora = {}, porFranja = {};
    videos.forEach(function (v) {
      if (!v.maduro || !v.fecha) return;
      var f = new Date(v.fecha);
      (porDia[f.getDay()] = porDia[f.getDay()] || []).push(v.rendimiento);
      (porHora[f.getHours()] = porHora[f.getHours()] || []).push(v.rendimiento);
      var fr = franjaDe(f.getHours());
      (porFranja[fr] = porFranja[fr] || []).push(v.rendimiento);
    });
    function resumir(o) {
      var out = {};
      Object.keys(o).forEach(function (k) { out[k] = { n: o[k].length, mediana_rend: r2(mediana(o[k])) }; });
      return out;
    }
    function mejor(o, minN) {
      var best = null;
      Object.keys(o).forEach(function (k) {
        if (o[k].n < minN) return;
        if (!best || o[k].mediana_rend > o[best].mediana_rend || (o[k].mediana_rend === o[best].mediana_rend && o[k].n > o[best].n)) best = k;
      });
      return best;
    }
    var d = resumir(porDia), h = resumir(porHora), fr = resumir(porFranja);
    var bd = mejor(d, 2) || mejor(d, 1), bh = mejor(h, 2) || mejor(h, 1), bf = mejor(fr, 2) || mejor(fr, 1);
    return {
      por_dia: ORDEN_DIAS.map(function (i) { return { dia: DIAS[i], n: d[i] ? d[i].n : 0, mediana_rend: d[i] ? d[i].mediana_rend : null }; }),
      por_hora: Array.from({ length: 24 }, function (_, i) { return { hora: i, n: h[i] ? h[i].n : 0, mediana_rend: h[i] ? h[i].mediana_rend : null }; }),
      por_franja: fr,
      mejor_dia: bd != null ? { dia: DIAS[+bd], n: d[bd].n, mediana_rend: d[bd].mediana_rend } : null,
      mejor_hora: bh != null ? { hora: +bh, n: h[bh].n, mediana_rend: h[bh].mediana_rend } : null,
      mejor_franja: bf != null ? { franja: bf, n: fr[bf].n, mediana_rend: fr[bf].mediana_rend } : null
    };
  }

  var PAL_STOP = new Set(('el la los las un una unos unas de del y o a en por para con sin que se su sus es este esta estos estas ' +
    'lo le les al me mi mis más mas no ni ya fue era son hay así asi como esto eso cuando qué que cómo the and for you with ' +
    'shorts short video vídeo parte').split(' '));

  function palabrasTitulo(videos, minN) {
    minN = minN || 3;
    var mad = videos.filter(function (v) { return v.maduro; });
    if (mad.length < 12) return { arriba: [], abajo: [] };
    var base = mediana(mad.map(function (v) { return v.rendimiento; })) || 1;
    var idx = {};
    mad.forEach(function (v) {
      var t = (v.titulo || '').replace(/#[\p{L}\p{N}_]+/gu, ' ').replace(new RegExp(EMOJI_RE.source, 'gu'), ' ').toLowerCase().normalize('NFC');
      var ws = new Set(t.split(/\s+/).map(function (w) { return w.replace(/^[¿?¡!.,:;"'“”()|\-–—…]+|[¿?¡!.,:;"'“”()|\-–—…]+$/g, ''); }));
      ws.forEach(function (w) {
        if (Array.from(w).length < 3 || PAL_STOP.has(w) || /^\d+$/.test(w)) return;
        (idx[w] = idx[w] || []).push(v);
      });
    });
    var res = [];
    Object.keys(idx).forEach(function (w) {
      var vs = idx[w];
      if (vs.length < minN || vs.length > 0.6 * mad.length) return;
      var m = mediana(vs.map(function (v) { return v.rendimiento; }));
      res.push({ palabra: w, n: vs.length, mediana_rend: r2(m), ratio: r2(m / base),
        ejemplo: vs.reduce(function (a, b) { return b.rendimiento > a.rendimiento ? b : a; }).titulo });
    });
    res.sort(function (a, b) { return b.ratio * Math.sqrt(b.n) - a.ratio * Math.sqrt(a.n); });
    var arriba = res.filter(function (r) { return r.ratio >= 1.3; }).slice(0, 12);
    var abajo = res.filter(function (r) { return r.ratio <= 0.75; })
      .sort(function (a, b) { return a.ratio / Math.sqrt(a.n) - b.ratio / Math.sqrt(b.n); }).slice(0, 8);
    return { arriba: arriba, abajo: abajo };
  }

  function tramosDuracion(videos, shorts) {
    var tramos = shorts
      ? [[0, 30, '<30 s'], [30, 60, '30–60 s'], [60, 90, '60–90 s'], [90, 181, '90 s–3 min']]
      : [[0, 480, '<8 min'], [480, 720, '8–12 min'], [720, 960, '12–16 min'], [960, 1320, '16–22 min'], [1320, 1800, '22–30 min'], [1800, 1e9, '30+ min']];
    var g = videos.filter(function (v) { return v.es_short === shorts && v.maduro && v.duracion_s; });
    var out = [];
    tramos.forEach(function (t) {
      var x = g.filter(function (v) { return v.duracion_s >= t[0] && v.duracion_s < t[1]; });
      if (x.length) out.push({ tramo: t[2], n: x.length, mediana_rend: r2(mediana(x.map(function (v) { return v.rendimiento; }))),
        mediana_vistas: Math.round(mediana(x.map(function (v) { return v.vistas; }))) });
    });
    return out;
  }

  function resumenFormato(vs) {
    var mad = vs.filter(function (v) { return v.maduro; });
    return {
      n: vs.length,
      vistas_total: suma(vs.map(function (v) { return v.vistas; })),
      mediana_vistas: mad.length ? Math.round(mediana(mad.map(function (v) { return v.vistas; }))) : null,
      mediana_like_rate: r2((mediana(mad.map(function (v) { return v.like_rate; })) || 0) * 100),
      mediana_coment_rate: r2((mediana(mad.map(function (v) { return v.coment_rate; })) || 0) * 1000),
      mediana_duracion_s: vs.length ? Math.round(mediana(vs.map(function (v) { return v.duracion_s; }))) : null
    };
  }

  // ---------------------------------------------------------------------------
  // Ideas de títulos (plantillas, sin IA paga)
  // ---------------------------------------------------------------------------
  var STOP_ENT = new Set(('el la los las un una unos unas de del y o a en por para con sin que se su sus es este esta estos estas ' +
    'lo le les al más menos no ni ya hoy ahora casi mundo pero como nadie nunca cosas tu tú te vos yo mi así esto eso ' +
    'cuando donde porque por qué cómo sí si lo nuevo nueva top parte final the').split(' '));

  function entidades(titulo) {
    var t = (titulo || '').replace(/#[\p{L}\p{N}_]+/gu, ' ').replace(/[^\p{L}\p{N}\s$€.,]/gu, ' ');
    var pal = t.split(/\s+/).filter(Boolean);
    var out = [], cur = [];
    for (var i = 0; i < pal.length; i++) {
      var w = pal[i].replace(/[.,]+$/, '');
      var esMay = i > 0 && /^\p{Lu}/u.test(w) && !STOP_ENT.has(w.toLowerCase()) && Array.from(w).length > 2 && !/^\p{Lu}{4,}$/u.test(w);
      var esNumPeg = cur.length && /^\d{1,4}$/.test(w);
      if (esMay || esNumPeg) cur.push(w);
      else { if (cur.length) out.push(cur.join(' ')); cur = []; }
      if (/[.,]$/.test(pal[i]) && cur.length) { out.push(cur.join(' ')); cur = []; }
    }
    if (cur.length) out.push(cur.join(' '));
    return out;
  }

  function numerosDinero(videos) {
    var out = [];
    videos.forEach(function (v) {
      var m = (v.titulo || '').match(/(?:[$€£]\s?\d[\d.,]*|\d[\d.,]*\s?(?:[$€£]|d[oó]lares|euros|pesos|millones|mil))/iu);
      if (m && out.indexOf(m[0].trim()) < 0) out.push(m[0].trim());
    });
    return out;
  }

  // Cada plantilla: rasgo que la activa, título y gancho de 3 s. {E}=tema, {N}=cifra, {K}=cantidad para listas.
  var PLANTILLAS = [
    { r: 'pero_giro', t: '{E} parecía perfecto… pero tenía una trampa', g: 'Todos creen que {E} fue un éxito. Están equivocados.' },
    { r: 'pero_giro', t: '{E} ya no es lo que era (pero nadie te dice por qué)', g: 'Hace unos años {E} era otra cosa. Hoy, ni lo reconocerías.' },
    { r: 'historia_pasado', t: 'Lo arriesgó todo por {E} y terminó así', g: 'Un día alguien apostó todo a {E}. Nadie imaginó cómo iba a terminar.' },
    { r: 'historia_pasado', t: 'Nadie creyó en {E}… hasta que pasó esto', g: 'Se rieron de {E}. Un año después, nadie se reía.' },
    { r: 'dinero', t: 'Pagaron {N} por {E} y nadie esperaba lo que pasó después', g: '{N}. Eso pagaron por {E}. Y no fue lo más loco.' },
    { r: 'dinero', t: '{E}: de valer {N} a no valer casi nada', g: 'Valía {N}. Hoy casi nadie da nada por {E}.' },
    { r: 'numero', t: '{K} cosas de {E} que casi nadie sabe (la #1 es increíble)', g: 'La número uno sobre {E} me costó creerla.' },
    { r: 'lista_numerada', t: '{K} secretos de {E} que nadie te contó', g: 'Hay {K} cosas de {E} que no salen en ningún lado.' },
    { r: 'pregunta', t: '¿Por qué {E} desapareció de un día para otro?', g: 'Un día estaba en todos lados. Al siguiente, nunca más.' },
    { r: 'por_que', t: '¿Por qué nadie habla de {E}?', g: 'Hay una razón por la que no escuchás hablar de {E}.' },
    { r: 'desaparicion', t: 'Así desapareció {E} (y nadie lo vio venir)', g: 'Era imparable. Y en meses, {E} se esfumó.' },
    { r: 'evitar_nunca', t: 'Nunca hagas esto con {E} (lo aprendí tarde)', g: 'Si hacés esto con {E}, lo vas a lamentar.' },
    { r: 'segunda_persona', t: 'Si te gusta {E}, tenés que ver esto', g: 'Si te gusta {E}, esto te va a volar la cabeza.' },
    { r: 'robo_crimen', t: 'El fraude detrás de {E} que casi nadie conoce', g: 'Detrás de {E} había una estafa. Y casi nadie se enteró.' },
    { r: 'decada_epoca', t: '{E} antes vs. hoy: la diferencia es increíble', g: 'Así era {E} hace 30 años. Ahora mirá esto.' },
    { r: 'durabilidad', t: '{E} duraba para siempre… y por eso dejaron de hacerlo', g: 'Era indestructible. Justamente ese fue el problema.' },
    { r: 'record_extremo', t: 'Lo más extremo de {E} que vas a ver hoy', g: 'Esto de {E} parece imposible. Pero es real.' },
    { r: 'primera_persona', t: 'Probé {E} durante 7 días y esto pasó', g: 'Siete días con {E}. El día tres casi abandono.' },
    { r: 'reto_experimento', t: '24 horas con {E}: el resultado me sorprendió', g: 'Me propuse 24 horas con {E}. No salió como pensaba.' },
    { r: 'pais_latam', t: 'Lo que pasó con {E} en Latinoamérica nadie lo esperaba', g: 'En Latinoamérica, {E} tuvo un giro que nadie vio venir.' },
    { r: 'titulo_consejo', t: 'Cómo sacarle el máximo a {E} (sin gastar de más)', g: 'Con este truco, {E} rinde el doble.' },
    { r: 'parentesis', t: 'La verdad sobre {E} (no es lo que pensás)', g: 'Lo que te contaron de {E} está a medias.' }
  ];
  var REMATES = ['(nadie lo vio venir)', '(y no es lo que pensás)', '(el final sorprende)', '(la verdad es peor)'];
  var RASGOS_IDEABLES = new Set(PLANTILLAS.map(function (p) { return p.r; }));

  function ideas(videos, pats, opciones) {
    opciones = opciones || {};
    var mad = videos.filter(function (v) { return v.maduro; });
    var ganadores = mad.filter(function (v) { return v.grupo === 'ganador'; }).sort(function (a, b) { return b.rendimiento - a.rendimiento; });
    var positivos = pats.filter(function (p) { return p.ratio > 1.05 && RASGOS_IDEABLES.has(p.rasgo); });
    var negativos = new Set(pats.filter(function (p) { return p.ratio < 0.85; }).map(function (p) { return p.rasgo; }));
    var largoGana = pats.some(function (p) { return p.rasgo === 'titulo_largo' && p.ratio > 1.05; });
    var largoPierde = negativos.has('titulo_largo');

    var temas = [];
    if (opciones.tema) opciones.tema.split(',').forEach(function (t) { t = t.trim(); if (t) temas.push(t); });
    if (!temas.length) {
      ganadores.concat(mad).forEach(function (v) { entidades(v.titulo).forEach(function (e) { if (temas.indexOf(e) < 0) temas.push(e); }); });
      if (temas.length < 3) {
        palabrasTitulo(videos).arriba.forEach(function (p) { if (temas.indexOf(p.palabra) < 0) temas.push(p.palabra); });
      }
    }
    if (!temas.length) temas = ['tu tema'];
    var nums = numerosDinero(ganadores.length ? ganadores : mad);
    if (!nums.length) nums = ['$100.000'];

    var orden = [];
    positivos.forEach(function (p) {
      PLANTILLAS.forEach(function (pl, i) { if (pl.r === p.rasgo) orden.push({ i: i, base: p }); });
    });
    // Si hay pocos patrones ganadores, completar con plantillas neutras (las que no son patrón perdedor)
    PLANTILLAS.forEach(function (pl, i) {
      if (!negativos.has(pl.r) && !orden.some(function (o) { return o.i === i; })) orden.push({ i: i, base: null });
    });

    var out = [];
    for (var k = 0; k < orden.length && out.length < 10; k++) {
      var pl = PLANTILLAS[orden[k].i];
      var E = temas[out.length % temas.length];
      var N = nums[out.length % nums.length];
      var K = [5, 7, 10][out.length % 3];
      var t = pl.t.replace(/\{E\}/g, E).replace(/\{N\}/g, N).replace(/\{K\}/g, K);
      var g = pl.g.replace(/\{E\}/g, E).replace(/\{N\}/g, N).replace(/\{K\}/g, K);
      t = t.charAt(0).toUpperCase() + t.slice(1);
      g = g.charAt(0).toUpperCase() + g.slice(1);
      if (largoPierde && Array.from(t).length > 55) t = t.replace(/\s*\([^)]*\)\s*$/, '');
      if (largoGana && Array.from(t).length < 48 && !/\)$/.test(t)) t += ' ' + REMATES[out.length % REMATES.length];
      out.push({
        titulo: t, gancho_3s: g, chars: Array.from(t).length,
        basada_en: orden[k].base ? orden[k].base.nombre + ' · ' + fmtX(orden[k].base.ratio) + '×' : 'plantilla general'
      });
    }
    return out;
  }

  function fmtX(x) { return x == null ? '—' : String(Math.round(x * 100) / 100).replace('.', ','); }

  // ---------------------------------------------------------------------------
  // Consejos
  // ---------------------------------------------------------------------------
  function consejos(videos, pats, hor, sh, lg) {
    var c = [];
    var NO_TITULO = { publicado_tarde: 1, fin_de_semana: 1, muchas_etiquetas: 1, descripcion_larga: 1 };
    var fuertes = pats.filter(function (p) { return p.ratio > 1.05 && !NO_TITULO[p.rasgo]; });
    if (fuertes.length) {
      var p = fuertes[0];
      c.push('En los títulos, repetí lo que mejor funciona: «' + p.nombre + '» rinde ' + fmtX(p.ratio) + '× la mediana del resto (' +
        p.n_con + ' videos con el rasgo vs ' + p.n_sin + ' sin él).');
    }
    var neg = pats.filter(function (p) { return p.ratio < 0.85; }).sort(function (a, b) { return a.fuerza - b.fuerza; });
    if (neg.length) c.push('Lo que peor rinde en este canal: «' + neg[0].nombre + '» ('  + fmtX(neg[0].ratio) + '× frente a los videos sin ese rasgo). Probá dejarlo de lado.');
    if (hor.mejor_dia && hor.mejor_dia.n >= 2) c.push('El mejor día hasta ahora es el ' + hor.mejor_dia.dia + ' (mediana ' + fmtX(hor.mejor_dia.mediana_rend) +
      '×, ' + hor.mejor_dia.n + ' videos). Con pocos videos es una pista, no una regla.');
    if (hor.mejor_franja) c.push('Franja horaria con mejor rendimiento: ' + hor.mejor_franja.franja + ' (mediana ' + fmtX(hor.mejor_franja.mediana_rend) + '×, n=' + hor.mejor_franja.n + '), en tu hora local.');
    if (sh.n && lg.n && sh.mediana_vistas != null && lg.mediana_vistas != null) {
      if (sh.mediana_vistas > lg.mediana_vistas * 1.5) c.push('Los Shorts traen más vistas (mediana ' + fmtInt(sh.mediana_vistas) + ' vs ' + fmtInt(lg.mediana_vistas) +
        ' de los largos). Usá cada Short ganador como puerta: vinculá el video largo del mismo tema como "video relacionado".');
      else if (lg.mediana_vistas > sh.mediana_vistas * 1.5) c.push('Los videos largos rinden mejor que los Shorts (mediana ' + fmtInt(lg.mediana_vistas) + ' vs ' + fmtInt(sh.mediana_vistas) +
        '). Hacé Shorts que sean recortes de los largos ganadores.');
    } else if (sh.n && !lg.n) c.push('El canal solo tiene Shorts: probá un video largo (8–12 min) sobre el tema del Short ganador para sumar horas de visualización.');
    else if (lg.n && !sh.n) c.push('El canal no tiene Shorts: recortá los mejores 30–60 s de tus largos ganadores y publicalos como Shorts.');
    var mad = videos.filter(function (v) { return v.maduro; });
    var conEmoji = pats.filter(function (p) { return p.rasgo === 'emoji' && p.ratio < 0.9; });
    if (conEmoji.length) c.push('Los títulos con emoji rinden menos acá (' + fmtX(conEmoji[0].ratio) + '×): probá sacarlos.');
    var tagsBajo = mad.filter(function (v) { return (v.tags || []).length === 0; }).length;
    if (mad.length && tagsBajo / mad.length > 0.5) c.push(tagsBajo + ' de ' + mad.length + ' videos no tienen etiquetas. No es lo más importante, pero 3–8 etiquetas con el tema exacto ayudan a la búsqueda.');
    var descCorta = mad.filter(function (v) { return (v.desc_len || 0) < 100; }).length;
    if (mad.length && descCorta / mad.length > 0.5) c.push(descCorta + ' de ' + mad.length + ' videos tienen descripción muy corta (<100 caracteres). Sumá 2–3 líneas con el tema y palabras clave.');
    if (mad.length < 15) c.push('Hay solo ' + mad.length + ' videos con más de 48 h: los patrones todavía son ruido. Volvé a analizar cuando tengas más.');
    return c;
  }

  function fmtInt(n) { return n == null ? '—' : Math.round(n).toLocaleString('es-AR'); }

  // ---------------------------------------------------------------------------
  // Reporte completo de un canal
  // ---------------------------------------------------------------------------
  function analizar(canal, videosApi, opciones) {
    opciones = opciones || {};
    var videos = preparar(videosApi.map(function (it) { return it.snippet ? videoDesdeApi(it) : it; }), opciones.ahora, opciones.horasMadurez);
    var mad = videos.filter(function (v) { return v.maduro; });
    var shorts = videos.filter(function (v) { return v.es_short; }), largos = videos.filter(function (v) { return !v.es_short; });
    var pats = patrones(videos);
    var hor = horarios(videos);
    var sh = resumenFormato(shorts), lg = resumenFormato(largos);
    var fechas = videos.filter(function (v) { return v.fecha; }).map(function (v) { return new Date(v.fecha).getTime(); }).sort();
    var semanas = fechas.length > 1 ? (fechas[fechas.length - 1] - fechas[0]) / (7 * 864e5) : null;
    var ordenados = mad.slice().sort(function (a, b) { return b.rendimiento - a.rendimiento; });
    var nTop = Math.min(5, Math.floor(ordenados.length / 2) || ordenados.length);
    var top = ordenados.slice(0, nTop);
    var bottom = ordenados.slice().reverse().slice(0, Math.min(5, Math.max(0, ordenados.length - nTop)));
    var vistasTot = suma(videos.map(function (v) { return v.vistas; }));
    var avisos = [];
    if (mad.length < 15) avisos.push('Con menos de 15 videos maduros (48 h o más) los patrones son orientativos.');
    if (videos.length - mad.length) avisos.push((videos.length - mad.length) + ' video(s) con menos de 48 h no entran en la comparación (todavía juntan vistas).');
    return {
      generado: new Date().toISOString(),
      canal: canal,
      videos: videos,
      resumen: {
        n_videos: videos.length, n_maduros: mad.length, n_shorts: shorts.length, n_largos: largos.length,
        vistas_total: vistasTot,
        mediana_vistas: mad.length ? Math.round(mediana(mad.map(function (v) { return v.vistas; }))) : null,
        promedio_vistas: videos.length ? Math.round(vistasTot / videos.length) : null,
        like_rate: r2((mediana(mad.map(function (v) { return v.like_rate; })) || 0) * 100),
        coment_rate: r2((mediana(mad.map(function (v) { return v.coment_rate; })) || 0) * 1000),
        videos_por_semana: semanas ? r2(videos.length / Math.max(semanas, 1 / 7)) : null,
        desde: fechas.length ? new Date(fechas[0]).toISOString() : null,
        hasta: fechas.length ? new Date(fechas[fechas.length - 1]).toISOString() : null,
        mediana_tags: mediana(videos.map(function (v) { return (v.tags || []).length; })),
        mediana_desc: mediana(videos.map(function (v) { return v.desc_len || 0; }))
      },
      shorts: sh, largos: lg,
      top: top, bottom: bottom,
      patrones: pats,
      patrones_top: pats.filter(function (p) { return p.ratio > 1.05; }).slice(0, 6),
      patrones_negativos: pats.filter(function (p) { return p.ratio < 0.85; }).sort(function (a, b) { return a.fuerza - b.fuerza; }).slice(0, 4),
      horarios: hor,
      palabras: palabrasTitulo(videos),
      duracion_largos: tramosDuracion(videos, false),
      duracion_shorts: tramosDuracion(videos, true),
      correlaciones: {
        largo_titulo: spearman(mad.map(function (v) { return v.rasgos_titulo.largo_chars; }), mad.map(function (v) { return v.rendimiento; })),
        n_etiquetas: spearman(mad.map(function (v) { return (v.tags || []).length; }), mad.map(function (v) { return v.rendimiento; })),
        largo_descripcion: spearman(mad.map(function (v) { return v.desc_len; }), mad.map(function (v) { return v.rendimiento; })),
        tendencia: spearman(mad.map(function (v) { return v.fecha ? new Date(v.fecha).getTime() : null; }), mad.map(function (v) { return v.rendimiento; }))
      },
      ideas: ideas(videos, pats, { tema: opciones.tema }),
      consejos: consejos(videos, pats, hor, sh, lg),
      avisos: avisos
    };
  }

  function comparar(reportes) {
    return reportes.map(function (r) {
      var p = r.patrones_top[0];
      return {
        canal: r.canal.nombre, handle: r.canal.handle || '', suscriptores: r.canal.suscriptores,
        videos: r.resumen.n_videos, shorts: r.resumen.n_shorts, largos: r.resumen.n_largos,
        mediana_vistas: r.resumen.mediana_vistas, mediana_shorts: r.shorts.mediana_vistas, mediana_largos: r.largos.mediana_vistas,
        like_rate: r.resumen.like_rate, coment_rate: r.resumen.coment_rate, videos_por_semana: r.resumen.videos_por_semana,
        mejor_patron: p ? p.nombre + ' (' + fmtX(p.ratio) + '×)' : '—',
        mejor_dia: r.horarios.mejor_dia ? r.horarios.mejor_dia.dia : '—',
        mejor_hora: r.horarios.mejor_hora ? r.horarios.mejor_hora.hora + ' h' : '—',
        top_video: r.top[0] ? r.top[0].titulo : '—'
      };
    });
  }

  // ---------------------------------------------------------------------------
  // CSV
  // ---------------------------------------------------------------------------
  function csvCampo(x) {
    if (x === null || x === undefined) return '';
    var s = String(x);
    return /[";\n\r,]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  function aCSV(reportes) {
    var cols = ['canal', 'video_id', 'titulo', 'formato', 'fecha', 'dia', 'hora', 'duracion_s', 'vistas', 'likes', 'comentarios',
      'like_rate_pct', 'rendimiento_x', 'grupo', 'maduro', 'largo_titulo', 'n_etiquetas', 'largo_descripcion', 'rasgos', 'url'];
    var filas = [cols.join(',')];
    reportes.forEach(function (r) {
      r.videos.forEach(function (v) {
        var f = v.fecha ? new Date(v.fecha) : null;
        var rb = rasgosBinarios(v);
        filas.push([r.canal.nombre, v.id, v.titulo, v.es_short ? 'Short' : 'Largo',
          f ? f.toISOString() : '', f ? DIAS[f.getDay()] : '', f ? f.getHours() : '', v.duracion_s, v.vistas, v.likes, v.comentarios,
          v.like_rate != null ? r2(v.like_rate * 100) : '', v.rendimiento, v.grupo, v.maduro ? 'sí' : 'no',
          v.rasgos_titulo.largo_chars, (v.tags || []).length, v.desc_len,
          Object.keys(rb).filter(function (k) { return rb[k]; }).join(' '), v.url].map(csvCampo).join(','));
      });
    });
    return '\uFEFF' + filas.join('\r\n');
  }

  return {
    rasgosTitulo: rasgosTitulo, NOMBRES_RASGO: NOMBRES_RASGO, DIAS: DIAS, parseDuracion: parseDuracion, esShort: esShort,
    videoDesdeApi: videoDesdeApi, preparar: preparar, patrones: patrones, horarios: horarios, palabrasTitulo: palabrasTitulo,
    entidades: entidades, ideas: ideas, analizar: analizar, comparar: comparar, aCSV: aCSV, mediana: mediana, spearman: spearman,
    fmtX: fmtX, fmtInt: fmtInt
  };
});
