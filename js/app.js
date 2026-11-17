/* Robot Analista — interfaz (PWA). */
(function () {
  'use strict';
  var VERSION = '1.0.0';
  var A = window.RA_Analisis, YT = window.RA_YouTube, LIC = window.RA_Licencia, DEMO = window.RA_Demo;
  var LS = { clave: 'ra_api_key', licencia: 'ra_licencia', historial: 'ra_historial', cache: 'ra_cache_' };
  var CACHE_MS = 6 * 3600 * 1000;
  var estado = { reportes: [], activo: 0, demo: false };

  // ---------------------------------------------------------------- utilidades
  function $(s, el) { return (el || document).querySelector(s); }
  function $$(s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function n(x) { return A.fmtInt(x); }
  function x(v) { return A.fmtX(v); }
  function ls(k, v) {
    try {
      if (v === undefined) return localStorage.getItem(k);
      if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v);
    } catch (e) { return null; }
  }
  function toast(t, ms) {
    var el = $('#toast'); el.textContent = t; el.hidden = false;
    clearTimeout(toast._t); toast._t = setTimeout(function () { el.hidden = true; }, ms || 2600);
  }
  function msg(id, texto, tipo) { var el = $(id); el.textContent = texto || ''; el.className = 'msg ' + (tipo || ''); }
  function dur(s) {
    if (s == null) return '—';
    s = Math.round(s);
    var h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), ss = s % 60;
    return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(ss).padStart(2, '0');
  }
  function fecha(iso, conHora) {
    if (!iso) return '—';
    var d = new Date(iso);
    var o = { day: 'numeric', month: 'short', year: 'numeric' };
    if (conHora) { o.hour = '2-digit'; o.minute = '2-digit'; }
    return d.toLocaleString('es-AR', o);
  }

  // ---------------------------------------------------------------- navegación
  function mostrar(p) {
    $$('.pantalla').forEach(function (s) { s.hidden = s.id !== 'pantalla-' + p; });
    var lic = licenciaOk();
    $$('.nav-btn[data-ir]').forEach(function (b) { b.hidden = !lic; b.classList.toggle('activo', b.dataset.ir === p); });
    if (p === 'ajustes') pintarAjustes();
    if (p === 'inicio') pintarHistorial();
    window.scrollTo(0, 0);
  }
  function arrancar() {
    if (!licenciaOk()) return mostrar('licencia');
    if (!ls(LS.clave)) return mostrar('clave');
    mostrar('inicio');
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-ir]');
    if (b) { e.preventDefault(); if (b.dataset.ir === 'inicio' && !ls(LS.clave)) mostrar('clave'); else mostrar(b.dataset.ir); }
  });

  // ---------------------------------------------------------------- licencia
  function licenciaOk() { var c = ls(LS.licencia); return !!(c && LIC.validar(c)); }
  $('#form-licencia').addEventListener('submit', function (e) {
    e.preventDefault();
    var c = $('#in-licencia').value;
    if (LIC.validar(c)) {
      var s = LIC.normalizar(c);
      ls(LS.licencia, LIC.formatear(s));
      msg('#msg-licencia', '¡Licencia activada!', 'ok');
      setTimeout(arrancar, 500);
    } else {
      msg('#msg-licencia', 'Ese código no es válido. Copialo completo desde el mail de compra (RA-XXXXX-XXXXX-XXXXX-XXXXX).', 'error');
    }
  });
  $('#btn-demo').addEventListener('click', function () {
    var r = A.analizar(DEMO.canal, DEMO.videos(), {});
    estado = { reportes: [r], activo: 0, demo: true };
    pintarReportes();
    mostrar('reporte');
  });

  // ---------------------------------------------------------------- clave de API
  $('#form-clave').addEventListener('submit', function (e) {
    e.preventDefault();
    var k = $('#in-clave').value.trim();
    if (!/^AIza[\w-]{30,}$/.test(k)) { msg('#msg-clave', 'La clave tiene que empezar con "AIza" y tener unos 39 caracteres. Copiala de nuevo.', 'error'); return; }
    msg('#msg-clave', 'Probando la clave…');
    new YT.Cliente(k).probar().then(function () {
      ls(LS.clave, k);
      msg('#msg-clave', '¡Funciona! Clave guardada en este dispositivo.', 'ok');
      setTimeout(function () { mostrar('inicio'); }, 700);
    }, function (err) { msg('#msg-clave', err.message, 'error'); });
  });

  // ---------------------------------------------------------------- inicio
  $('#btn-agregar').addEventListener('click', function () {
    var lista = $('#lista-canales');
    if ($$('.in-canal', lista).length >= 3) return toast('Máximo 3 canales para comparar.');
    var fila = document.createElement('div'); fila.className = 'fila-canal';
    fila.innerHTML = '<input class="campo in-canal" placeholder="@otro_canal" spellcheck="false" autocapitalize="off">' +
      '<button type="button" class="btn secundario btn-quitar" aria-label="Quitar">✕</button>';
    lista.appendChild(fila);
    $('.btn-quitar', fila).addEventListener('click', function () { fila.remove(); actualizarAgregar(); });
    $('input', fila).focus();
    actualizarAgregar();
  });
  function actualizarAgregar() { $('#btn-agregar').hidden = $$('.in-canal').length >= 3; }

  function historial() { try { return JSON.parse(ls(LS.historial) || '[]'); } catch (e) { return []; } }
  function guardarHistorial(c) {
    var h = historial().filter(function (x) { return x.id !== c.id; });
    h.unshift({ id: c.id, nombre: c.nombre, handle: c.handle });
    ls(LS.historial, JSON.stringify(h.slice(0, 8)));
  }
  function pintarHistorial() {
    var h = historial(), el = $('#historial');
    el.innerHTML = h.length ? '<span class="sub" style="width:100%">Recientes:</span>' + h.map(function (c) {
      return '<button type="button" class="chip" data-canal="' + esc(c.handle || c.id) + '">' + esc(c.nombre) + '</button>';
    }).join('') : '';
    $$('.chip', el).forEach(function (b) {
      b.addEventListener('click', function () {
        var vacios = $$('.in-canal').filter(function (i) { return !i.value.trim(); });
        (vacios[0] || $$('.in-canal')[0]).value = b.dataset.canal;
      });
    });
  }

  function leerCache(clave) {
    try {
      var c = JSON.parse(ls(LS.cache + clave) || 'null');
      return c && Date.now() - c.t < CACHE_MS ? c : null;
    } catch (e) { return null; }
  }
  function escribirCache(clave, canal, videos) {
    var datos = JSON.stringify({ t: Date.now(), canal: canal, videos: videos });
    try { localStorage.setItem(LS.cache + clave, datos); } catch (e) { limpiarCache(); try { localStorage.setItem(LS.cache + clave, datos); } catch (e2) { /* sin espacio */ } }
  }
  function limpiarCache() {
    Object.keys(localStorage).forEach(function (k) { if (k.indexOf(LS.cache) === 0) localStorage.removeItem(k); });
  }

  function traerCanal(cli, entrada, refrescar) {
    var clave = entrada.trim().toLowerCase();
    var c = !refrescar && leerCache(clave);
    if (c) return Promise.resolve({ canal: c.canal, videos: c.videos, deCache: true });
    return cli.canal(entrada).then(function (canal) {
      return cli.videos(canal, 50).then(function (items) {
        var videos = items.map(A.videoDesdeApi);
        escribirCache(clave, canal, videos);
        return { canal: canal, videos: videos, deCache: false };
      });
    });
  }

  $('#form-canales').addEventListener('submit', function (e) {
    e.preventDefault();
    var entradas = $$('.in-canal').map(function (i) { return i.value.trim(); }).filter(Boolean);
    if (!entradas.length) return msg('#msg-inicio', 'Escribí al menos un canal.', 'error');
    var clave = ls(LS.clave);
    if (!clave) return mostrar('clave');
    var cli = new YT.Cliente(clave), tema = $('#in-tema').value.trim(), refrescar = $('#in-refrescar').checked;
    var btn = $('#btn-analizar'); btn.disabled = true;
    $('#progreso').hidden = false; msg('#msg-inicio', '');
    var reportes = [], i = 0;
    function siguiente() {
      if (i >= entradas.length) return Promise.resolve();
      var ent = entradas[i];
      $('#progreso-txt').textContent = 'Consultando ' + ent + (entradas.length > 1 ? ' (' + (i + 1) + ' de ' + entradas.length + ')' : '') + '…';
      return traerCanal(cli, ent, refrescar).then(function (d) {
        if (!d.videos.length) throw Object.assign(new Error('El canal «' + d.canal.nombre + '» no tiene videos públicos.'), { codigo: 'vacio' });
        $('#progreso-txt').textContent = 'Analizando ' + d.canal.nombre + '…';
        var r = A.analizar(d.canal, d.videos, { tema: tema });
        r.deCache = d.deCache;
        reportes.push(r);
        guardarHistorial(d.canal);
        i++;
        return siguiente();
      });
    }
    siguiente().then(function () {
      estado = { reportes: reportes, activo: 0, demo: false };
      pintarReportes();
      mostrar('reporte');
    }, function (err) {
      msg('#msg-inicio', err.message || 'Algo salió mal. Probá de nuevo.', 'error');
      if (err.codigo === 'clave' || err.codigo === 'api_off' || err.codigo === 'referer') {
        setTimeout(function () { $('#in-clave').value = clave; mostrar('clave'); msg('#msg-clave', err.message, 'error'); }, 1800);
      }
    }).then(function () { btn.disabled = false; $('#progreso').hidden = true; });
  });

  // ---------------------------------------------------------------- reporte
  function pintarReportes() {
    var rs = estado.reportes, tabs = $('#tabs'), cont = $('#reporte');
    var html = '';
    if (estado.demo) html += '<div class="demo-banner">Reporte de <b>ejemplo</b> con un canal ficticio. Activá tu licencia para analizar canales reales.' +
      (licenciaOk() ? '' : ' <button class="btn link" id="btn-volver-lic">Activar licencia</button>') + '</div>';
    var t = [];
    if (rs.length > 1) t.push('<button class="tab" data-tab="comp">Comparación</button>');
    rs.forEach(function (r, i) { t.push('<button class="tab" data-tab="' + i + '">' + esc(r.canal.nombre) + '</button>'); });
    tabs.innerHTML = rs.length > 1 ? t.join('') : '';
    if (rs.length > 1) html += '<div class="bloque-canal" data-bloque="comp">' + htmlComparacion(rs) + '</div>';
    rs.forEach(function (r, i) { html += '<div class="bloque-canal" data-bloque="' + i + '">' + htmlReporte(r) + '</div>'; });
    cont.innerHTML = html;
    var vl = $('#btn-volver-lic'); if (vl) vl.addEventListener('click', function () { mostrar('licencia'); });
    $$('.tab', tabs).forEach(function (b) { b.addEventListener('click', function () { activarTab(b.dataset.tab); }); });
    $$('[data-copiar]', cont).forEach(function (b) {
      b.addEventListener('click', function () {
        var txt = b.dataset.copiar;
        (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(function () { toast('Título copiado'); }, function () { toast(txt, 4000); });
      });
    });
    activarTab(rs.length > 1 ? 'comp' : '0');
  }
  function activarTab(k) {
    $$('.bloque-canal').forEach(function (b) { b.hidden = b.dataset.bloque !== String(k); });
    $$('.tab').forEach(function (b) { b.classList.toggle('activo', b.dataset.tab === String(k)); });
  }

  function htmlComparacion(rs) {
    var c = A.comparar(rs);
    var filas = [
      ['Suscriptores', function (r) { return r.suscriptores == null ? 'oculto' : n(r.suscriptores); }],
      ['Videos analizados', function (r) { return r.videos + ' (' + r.shorts + ' Shorts · ' + r.largos + ' largos)'; }],
      ['Mediana de vistas', function (r) { return n(r.mediana_vistas); }],
      ['Mediana Shorts', function (r) { return n(r.mediana_shorts); }],
      ['Mediana largos', function (r) { return n(r.mediana_largos); }],
      ['Likes / vistas', function (r) { return x(r.like_rate) + ' %'; }],
      ['Comentarios / 1000 vistas', function (r) { return x(r.coment_rate); }],
      ['Videos por semana', function (r) { return x(r.videos_por_semana); }],
      ['Patrón más fuerte', function (r) { return esc(r.mejor_patron); }],
      ['Mejor día', function (r) { return esc(r.mejor_dia); }],
      ['Mejor hora', function (r) { return esc(r.mejor_hora); }],
      ['Video top', function (r) { return esc(r.top_video); }]
    ];
    var h = '<div class="tarjeta"><h2>Comparación de canales</h2><div class="tabla-wrap"><table><thead><tr><th></th>' +
      c.map(function (r) { return '<th>' + esc(r.canal) + '</th>'; }).join('') + '</tr></thead><tbody>';
    filas.forEach(function (f) { h += '<tr><th>' + f[0] + '</th>' + c.map(function (r) { return '<td>' + f[1](r) + '</td>'; }).join('') + '</tr>'; });
    h += '</tbody></table></div><p class="nota">El rendimiento (×) siempre se mide dentro de cada canal: compara cada video con la mediana de su propio formato.</p></div>';
    // patrones en común
    var comunes = {};
    rs.forEach(function (r) { r.patrones_top.forEach(function (p) { (comunes[p.nombre] = comunes[p.nombre] || []).push(r.canal.nombre + ' ' + x(p.ratio) + '×'); }); });
    var lista = Object.keys(comunes).filter(function (k) { return comunes[k].length > 1; });
    h += '<div class="tarjeta"><h2>Patrones que funcionan en más de un canal</h2>' + (lista.length ? '<ul class="consejos">' + lista.map(function (k) {
      return '<li><b>' + esc(k) + '</b><br><span class="sub">' + esc(comunes[k].join(' · ')) + '</span></li>';
    }).join('') + '</ul>' : '<p class="sub">Ningún patrón ganador se repite entre estos canales: cada audiencia responde distinto.</p>') + '</div>';
    return h;
  }

  function filaVideo(v) {
    var bad = v.rendimiento >= 1 ? 'x' : 'xmal';
    return '<div class="video">' + (v.miniatura ? '<img loading="lazy" src="' + esc(v.miniatura) + '" alt="">' : '') +
      '<div><div class="t"><a href="' + esc(v.url) + '" target="_blank" rel="noopener">' + esc(v.titulo) + '</a></div>' +
      '<div class="m"><span class="badge ' + (v.es_short ? 'short' : 'largo') + '">' + (v.es_short ? 'Short' : 'Largo') + '</span>' +
      '<span class="badge ' + bad + '">' + x(v.rendimiento) + '×</span> ' + n(v.vistas) + ' vistas · ' +
      (v.likes != null ? n(v.likes) + ' likes · ' : '') + dur(v.duracion_s) + ' · ' + fecha(v.fecha) + '</div></div></div>';
  }

  function barraPatron(p, usados) {
    var lg = Math.log(p.ratio), ancho = Math.min(50, Math.abs(lg) / Math.log(4) * 50);
    usados = usados || {};
    var e0 = p.ejemplos.filter(function (e) { return !usados[e.titulo]; })[0] || p.ejemplos[0];
    if (e0) usados[e0.titulo] = 1;
    var ej = e0 ? 'Ej.: «' + esc(e0.titulo) + '» (' + n(e0.vistas) + ' vistas)' : '';
    return '<div class="barra-pat"><div class="nom"><span>' + esc(p.nombre) + ' <span class="sub">(' + p.n_con + ' videos)</span></span><b>' + x(p.ratio) + '×</b></div>' +
      '<div class="pista"><div class="rel ' + (lg >= 0 ? 'pos' : 'neg') + '" style="width:' + ancho.toFixed(1) + '%"></div><div class="centro"></div></div>' +
      (ej ? '<div class="ej">' + ej + '</div>' : '') + '</div>';
  }

  function htmlReporte(r) {
    var c = r.canal, s = r.resumen, h = '';
    h += '<div class="tarjeta"><div class="cabecera-canal">' + (c.miniatura ? '<img src="' + esc(c.miniatura) + '" alt="">' : '') +
      '<div><h2>' + esc(c.nombre) + '</h2><div class="sub">' + esc(c.handle || '') + (c.suscriptores != null ? ' · ' + n(c.suscriptores) + ' suscriptores' : '') +
      ' · últimos ' + s.n_videos + ' videos (' + fecha(s.desde) + ' – ' + fecha(s.hasta) + ')' + (r.deCache ? ' · datos guardados' : '') + '</div></div></div>';
    h += '<div class="kpis" style="margin-top:1rem">' +
      kpi(n(s.mediana_vistas), 'mediana de vistas') + kpi(n(s.vistas_total), 'vistas sumadas') +
      kpi(x(s.like_rate) + ' %', 'likes / vistas') + kpi(x(s.videos_por_semana), 'videos por semana') +
      kpi(s.n_shorts, 'Shorts') + kpi(s.n_largos, 'largos') + kpi(x(s.coment_rate), 'coment. / 1000 vistas') + kpi(s.mediana_tags == null ? '—' : s.mediana_tags, 'etiquetas (mediana)') +
      '</div></div>';
    if (r.avisos.length) h += '<div class="aviso">' + r.avisos.map(esc).join('<br>') + '</div>';

    // Consejos
    h += '<div class="tarjeta"><h2>Qué hacer ahora</h2><ul class="consejos">' + r.consejos.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul></div>';

    // Top / bottom
    h += '<div class="dos-col"><div class="tarjeta"><h2>🏆 Mejores videos</h2>' + (r.top.map(filaVideo).join('') || '<p class="sub">Sin datos suficientes.</p>') +
      '</div><div class="tarjeta"><h2>📉 Más flojos</h2>' + (r.bottom.map(filaVideo).join('') || '<p class="sub">Sin datos suficientes.</p>') + '</div></div>';
    h += '<p class="nota" style="margin:-.4rem 0 1rem">× = vistas del video ÷ mediana de su formato (Shorts con Shorts, largos con largos). 2× = el doble de lo normal del canal.</p>';

    // Patrones
    h += '<div class="tarjeta"><h2>Patrones de título: multiplicadores</h2><p class="sub">Cuánto rinden los videos que tienen cada rasgo comparados con los que no lo tienen.</p>';
    var usados = {};
    if (r.patrones_top.length) h += '<h3>Lo que suma</h3>' + r.patrones_top.map(function (p) { return barraPatron(p, usados); }).join('');
    if (r.patrones_negativos.length) h += '<h3>Lo que resta</h3>' + r.patrones_negativos.map(function (p) { return barraPatron(p, usados); }).join('');
    if (!r.patrones.length) h += '<p class="sub">Hacen falta más videos para comparar patrones.</p>';
    if (r.patrones.length) {
      h += '<details><summary>Ver tabla completa (' + r.patrones.length + ' rasgos)</summary><div class="tabla-wrap"><table><thead><tr><th>Rasgo</th><th class="num">Con</th><th class="num">Sin</th><th class="num">×</th><th class="num">% ganadores</th><th class="num">% flojos</th></tr></thead><tbody>' +
        r.patrones.map(function (p) {
          return '<tr><td>' + esc(p.nombre) + '</td><td class="num">' + p.n_con + '</td><td class="num">' + p.n_sin + '</td><td class="num"><b>' + x(p.ratio) +
            '</b></td><td class="num">' + p.pct_ganadores + '%</td><td class="num">' + p.pct_perdedores + '%</td></tr>';
        }).join('') + '</tbody></table></div></details>';
    }
    if (r.palabras.arriba.length || r.palabras.abajo.length) {
      h += '<h3>Palabras de título</h3><div class="historial">' +
        r.palabras.arriba.map(function (p) { return '<span class="chip verde" title="' + esc(p.ejemplo) + '">' + esc(p.palabra) + ' ' + x(p.ratio) + '×</span>'; }).join('') +
        r.palabras.abajo.map(function (p) { return '<span class="chip rojo" title="' + esc(p.ejemplo) + '">' + esc(p.palabra) + ' ' + x(p.ratio) + '×</span>'; }).join('') + '</div>';
    }
    h += '</div>';

    // Shorts vs largos
    h += '<div class="tarjeta"><h2>Shorts vs. videos largos</h2><div class="tabla-wrap"><table><thead><tr><th></th><th class="num">Shorts</th><th class="num">Largos</th></tr></thead><tbody>' +
      filaSL('Cantidad', r.shorts.n, r.largos.n) +
      filaSL('Mediana de vistas', n(r.shorts.mediana_vistas), n(r.largos.mediana_vistas)) +
      filaSL('Vistas sumadas', n(r.shorts.vistas_total), n(r.largos.vistas_total)) +
      filaSL('Likes / vistas', r.shorts.n ? x(r.shorts.mediana_like_rate) + ' %' : '—', r.largos.n ? x(r.largos.mediana_like_rate) + ' %' : '—') +
      filaSL('Coment. / 1000 vistas', r.shorts.n ? x(r.shorts.mediana_coment_rate) : '—', r.largos.n ? x(r.largos.mediana_coment_rate) : '—') +
      filaSL('Duración mediana', dur(r.shorts.mediana_duracion_s), dur(r.largos.mediana_duracion_s)) +
      '</tbody></table></div>';
    if (r.duracion_shorts.length > 1 || r.duracion_largos.length > 1) {
      h += '<h3>Rendimiento por duración</h3><div class="tabla-wrap"><table><thead><tr><th>Tramo</th><th class="num">Videos</th><th class="num">Mediana vistas</th><th class="num">×</th></tr></thead><tbody>' +
        r.duracion_shorts.map(function (t) { return '<tr><td>Short ' + esc(t.tramo) + '</td><td class="num">' + t.n + '</td><td class="num">' + n(t.mediana_vistas) + '</td><td class="num">' + x(t.mediana_rend) + '</td></tr>'; }).join('') +
        r.duracion_largos.map(function (t) { return '<tr><td>Largo ' + esc(t.tramo) + '</td><td class="num">' + t.n + '</td><td class="num">' + n(t.mediana_vistas) + '</td><td class="num">' + x(t.mediana_rend) + '</td></tr>'; }).join('') +
        '</tbody></table></div>';
    }
    h += '</div>';

    // Horarios
    var hor = r.horarios, maxD = Math.max.apply(null, hor.por_dia.map(function (d) { return d.mediana_rend || 0; }).concat([0.01]));
    h += '<div class="tarjeta"><h2>Cuándo publicar</h2><p>' +
      (hor.mejor_dia ? 'Mejor día: <b>' + hor.mejor_dia.dia + '</b> (' + x(hor.mejor_dia.mediana_rend) + '×, ' + hor.mejor_dia.n + ' videos). ' : '') +
      (hor.mejor_hora ? 'Mejor hora: <b>' + hor.mejor_hora.hora + ':00</b> (' + x(hor.mejor_hora.mediana_rend) + '×, ' + hor.mejor_hora.n + ' videos).' : '') + '</p>' +
      '<div class="dias">' + hor.por_dia.map(function (d) {
        var alto = d.mediana_rend ? Math.max(4, d.mediana_rend / maxD * 100) : 0;
        var mejor = hor.mejor_dia && hor.mejor_dia.dia === d.dia;
        return '<div class="dia' + (mejor ? ' mejor' : '') + '"><span class="val">' + (d.mediana_rend ? x(d.mediana_rend) : '') + '</span><div class="b" style="height:' + alto.toFixed(0) +
          '%"></div><span>' + d.dia.slice(0, 3) + ' (' + d.n + ')</span></div>';
      }).join('') + '</div>';
    var maxH = Math.max.apply(null, hor.por_hora.map(function (d) { return d.mediana_rend || 0; }).concat([0.01]));
    h += '<h3>Por hora (tu hora local)</h3><div class="horas">' + hor.por_hora.map(function (d) {
      var a = d.mediana_rend ? 0.15 + 0.85 * Math.min(1, d.mediana_rend / maxH) : 0;
      var st = d.n ? 'background:rgba(225,29,72,' + a.toFixed(2) + ');color:' + (a > .55 ? '#fff' : '#0f172a') : '';
      return '<div class="hora" style="' + st + '" title="' + d.hora + ' h: ' + d.n + ' videos' + (d.mediana_rend ? ', ' + x(d.mediana_rend) + '×' : '') + '">' + d.hora + '</div>';
    }).join('') + '</div><p class="leyenda">Más oscuro = mejor rendimiento mediano a esa hora. Las horas vacías no tienen videos. Con pocos videos por hora es una pista, no una regla.</p></div>';

    // Ideas
    h += '<div class="tarjeta"><h2>💡 10 ideas de títulos</h2><p class="sub">Armadas con plantillas a partir de los patrones que más rinden en este canal. Cambiá el tema en <i>Opciones</i> para que encajen mejor con tu nicho.</p>' +
      r.ideas.map(function (i, k) {
        return '<div class="idea"><div class="t">' + (k + 1) + '. ' + esc(i.titulo) + '</div><div class="g">🎬 Gancho (3 s): ' + esc(i.gancho_3s) + '</div>' +
          '<div class="b"><span>' + esc(i.basada_en) + ' · ' + i.chars + ' caracteres</span><button class="btn secundario chico no-print" data-copiar="' + esc(i.titulo) + '">Copiar</button></div></div>';
      }).join('') + '</div>';

    // Todos los videos
    h += '<div class="tarjeta"><details><summary>Todos los videos analizados (' + r.videos.length + ')</summary><div class="tabla-wrap"><table><thead><tr><th>Título</th><th>Tipo</th><th class="num">Vistas</th><th class="num">×</th><th>Fecha</th></tr></thead><tbody>' +
      r.videos.map(function (v) {
        return '<tr><td><a href="' + esc(v.url) + '" target="_blank" rel="noopener">' + esc(v.titulo) + '</a></td><td>' + (v.es_short ? 'Short' : 'Largo') + '</td><td class="num">' + n(v.vistas) +
          '</td><td class="num">' + (v.maduro ? x(v.rendimiento) : 'nuevo') + '</td><td>' + fecha(v.fecha, true) + '</td></tr>';
      }).join('') + '</tbody></table></div></details>' +
      '<p class="nota">Límites: la API pública no da retención, CTR ni impresiones (eso está solo en YouTube Studio). Los Shorts se detectan por duración (≤ 3 min) y formato vertical. Los patrones son correlaciones, no causas. Reporte generado el ' + fecha(r.generado, true) + ' con Robot Analista.</p></div>';
    return h;
  }
  function kpi(v, l) { return '<div class="kpi"><div class="v">' + v + '</div><div class="l">' + l + '</div></div>'; }
  function filaSL(l, a, b) { return '<tr><td>' + l + '</td><td class="num">' + a + '</td><td class="num">' + b + '</td></tr>'; }

  // ---------------------------------------------------------------- exportar
  var abiertos = [];
  window.addEventListener('beforeprint', function () {
    abiertos = $$('#reporte details:not([open])'); abiertos.forEach(function (d) { d.open = true; });
  });
  window.addEventListener('afterprint', function () { abiertos.forEach(function (d) { d.open = false; }); abiertos = []; });
  $('#btn-pdf').addEventListener('click', function () { toast('Elegí "Guardar como PDF" en la ventana de impresión.'); setTimeout(function () { window.print(); }, 300); });
  $('#btn-csv').addEventListener('click', function () {
    if (!estado.reportes.length) return;
    var csv = A.aCSV(estado.reportes);
    var nombre = 'robot-analista_' + estado.reportes.map(function (r) { return (r.canal.handle || r.canal.nombre).replace(/[^\w-]+/g, ''); }).join('_') + '_' +
      new Date().toISOString().slice(0, 10) + '.csv';
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nombre;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    toast('CSV descargado');
  });

  // ---------------------------------------------------------------- ajustes
  function pintarAjustes() {
    var k = ls(LS.clave);
    $('#aj-clave').textContent = k ? k.slice(0, 6) + '…' + k.slice(-4) : 'sin clave';
    var l = ls(LS.licencia) || '';
    $('#aj-licencia').textContent = l ? l.slice(0, 9) + '…' + l.slice(-5) + ' ✔' : 'sin licencia';
    $('#version').textContent = VERSION;
  }
  $('#btn-cambiar-clave').addEventListener('click', function () { $('#in-clave').value = ''; msg('#msg-clave', ''); mostrar('clave'); });
  $('#btn-borrar-cache').addEventListener('click', function () { limpiarCache(); ls(LS.historial, null); toast('Análisis guardados borrados'); });
  $('#btn-borrar-todo').addEventListener('click', function () {
    if (!confirm('¿Borrar la clave de API, la licencia y todos los datos de este dispositivo?')) return;
    limpiarCache(); [LS.clave, LS.licencia, LS.historial].forEach(function (k) { ls(k, null); });
    arrancar();
  });

  // ---------------------------------------------------------------- PWA
  var promptInstalar = null;
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); promptInstalar = e; $('#btn-instalar').hidden = false; });
  $('#btn-instalar').addEventListener('click', function () {
    if (!promptInstalar) return;
    promptInstalar.prompt();
    promptInstalar.userChoice.then(function () { promptInstalar = null; $('#btn-instalar').hidden = true; });
  });
  window.addEventListener('appinstalled', function () { $('#btn-instalar').hidden = true; toast('¡App instalada!'); });
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () { /* sin SW */ }); });
  }

  arrancar();
})();
