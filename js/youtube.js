/* Robot Analista — cliente mínimo de la YouTube Data API v3 (oficial).
 * Solo lectura de metadatos públicos con la clave (API key) del comprador. Sin descargas ni scraping.
 * Costo de cuota por canal: ~3 unidades (channels.list 1 + playlistItems.list 1 + videos.list 1).
 * Si el canal se da como /c/nombre o un nombre suelto se usa search.list (100 unidades) como último recurso.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.RA_YouTube = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var BASE = 'https://www.googleapis.com/youtube/v3/';

  function ErrorYT(codigo, mensaje) { var e = new Error(mensaje); e.codigo = codigo; return e; }

  function mensajeError(status, body) {
    var err = (body && body.error) || {};
    var razon = ((err.errors || [])[0] || {}).reason || (err.details || []).map(function (d) { return d.reason; }).filter(Boolean)[0] || '';
    var msg = err.message || '';
    if (razon === 'quotaExceeded' || razon === 'dailyLimitExceeded' || razon === 'rateLimitExceeded')
      return ErrorYT('cuota', 'Se terminó la cuota diaria gratis de tu clave (10.000 unidades). Se renueva a la medianoche de California (≈ 9 h de España/Suiza). Cada análisis usa ~3 unidades, así que esto pasa casi nunca.');
    if (razon === 'keyInvalid' || razon === 'API_KEY_INVALID' || /API key not valid/i.test(msg))
      return ErrorYT('clave', 'La clave de API no es válida. Revisala en Ajustes (copiala de nuevo desde Google Cloud).');
    if (razon === 'accessNotConfigured' || razon === 'SERVICE_DISABLED' || /has not been used|is disabled/i.test(msg))
      return ErrorYT('api_off', 'Tu proyecto de Google Cloud no tiene activada la "YouTube Data API v3". Activala en Google Cloud > APIs y servicios > Biblioteca.');
    if (razon === 'ipRefererBlocked' || razon === 'API_KEY_HTTP_REFERRER_BLOCKED' || /referer/i.test(msg))
      return ErrorYT('referer', 'Tu clave tiene una restricción de sitio web que no incluye esta app. En Google Cloud, agregá la dirección de la app a "Sitios web" o dejá solo la restricción por API.');
    if (status === 403) return ErrorYT('prohibido', 'YouTube rechazó la consulta (403): ' + (msg || razon));
    if (status === 404) return ErrorYT('no_encontrado', 'No se encontró el recurso pedido.');
    return ErrorYT('http', 'Error de la API de YouTube (' + status + '): ' + (msg || 'sin detalle'));
  }

  function Cliente(apiKey, fetchImpl) {
    if (!apiKey) throw ErrorYT('clave', 'Falta la clave de API.');
    this.key = apiKey.trim();
    this.fetch = fetchImpl || (typeof fetch !== 'undefined' ? fetch.bind(typeof window !== 'undefined' ? window : globalThis) : null);
    this.unidades = 0;
  }

  Cliente.prototype.get = function (recurso, params, costo) {
    var self = this;
    var q = Object.keys(params).filter(function (k) { return params[k] !== undefined && params[k] !== null; })
      .map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]); }).join('&');
    var url = BASE + recurso + '?' + q + '&key=' + encodeURIComponent(this.key);
    return this.fetch(url, { headers: { Accept: 'application/json' } }).then(function (r) {
      self.unidades += costo || 1;
      return r.json().catch(function () { return {}; }).then(function (body) {
        if (!r.ok) throw mensajeError(r.status, body);
        return body;
      });
    }, function () {
      throw ErrorYT('red', 'Sin conexión con YouTube. Revisá internet e intentá de nuevo.');
    });
  };

  /** Interpreta lo que escribió el usuario: @handle, URL de canal, ID UC…, URL de video. */
  function interpretar(entrada) {
    var s = (entrada || '').trim();
    if (!s) return null;
    var m;
    s = s.replace(/^https?:\/\//i, '').replace(/^(www\.|m\.)/i, '');
    if ((m = /^youtube\.com\/channel\/(UC[\w-]{22})/i.exec(s)) || (m = /^(UC[\w-]{22})$/.exec(s))) return { tipo: 'id', valor: m[1] };
    if ((m = /^youtube\.com\/(@[^/?#\s]+)/i.exec(s)) || (m = /^(@[^/?#\s]+)$/.exec(s))) return { tipo: 'handle', valor: decodeURIComponent(m[1]) };
    if ((m = /^youtube\.com\/user\/([^/?#\s]+)/i.exec(s))) return { tipo: 'usuario', valor: m[1] };
    if ((m = /^youtube\.com\/c\/([^/?#\s]+)/i.exec(s))) return { tipo: 'busqueda', valor: decodeURIComponent(m[1]) };
    if ((m = /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/i.exec(s))) return { tipo: 'video', valor: m[1] };
    if ((m = /^youtube\.com\/([^/?#\s]+)$/i.exec(s))) return { tipo: 'handle', valor: '@' + m[1] };
    if (/^[\w.\-]{3,30}$/.test(s)) return { tipo: 'handle', valor: '@' + s };
    return { tipo: 'busqueda', valor: s };
  }

  var PARTES_CANAL = 'snippet,contentDetails,statistics';

  Cliente.prototype.canal = function (entrada) {
    var self = this, x = interpretar(entrada);
    if (!x) return Promise.reject(ErrorYT('entrada', 'Escribí un @usuario o el link del canal.'));
    function deLista(body) {
      var it = (body.items || [])[0];
      if (!it) throw ErrorYT('no_encontrado', 'No encontré el canal «' + entrada + '». Probá con el @usuario exacto (aparece debajo del nombre del canal).');
      var sn = it.snippet || {}, st = it.statistics || {};
      return {
        id: it.id, nombre: sn.title, handle: sn.customUrl ? (sn.customUrl.charAt(0) === '@' ? sn.customUrl : '@' + sn.customUrl) : '',
        suscriptores: st.hiddenSubscriberCount ? null : (st.subscriberCount != null ? +st.subscriberCount : null),
        vistas_total: st.viewCount != null ? +st.viewCount : null, videos_total: st.videoCount != null ? +st.videoCount : null,
        miniatura: ((sn.thumbnails || {}).default || {}).url || '', pais: sn.country || '',
        uploads: ((it.contentDetails || {}).relatedPlaylists || {}).uploads,
        url: 'https://www.youtube.com/' + (sn.customUrl ? (sn.customUrl.charAt(0) === '@' ? sn.customUrl : '@' + sn.customUrl) : 'channel/' + it.id)
      };
    }
    if (x.tipo === 'id') return this.get('channels', { part: PARTES_CANAL, id: x.valor }).then(deLista);
    if (x.tipo === 'handle') return this.get('channels', { part: PARTES_CANAL, forHandle: x.valor }).then(deLista);
    if (x.tipo === 'usuario') return this.get('channels', { part: PARTES_CANAL, forUsername: x.valor }).then(deLista);
    if (x.tipo === 'video') return this.get('videos', { part: 'snippet', id: x.valor }).then(function (b) {
      var it = (b.items || [])[0];
      if (!it) throw ErrorYT('no_encontrado', 'No encontré ese video.');
      return self.get('channels', { part: PARTES_CANAL, id: it.snippet.channelId }).then(deLista);
    });
    return this.get('search', { part: 'snippet', type: 'channel', q: x.valor, maxResults: 1 }, 100).then(function (b) {
      var it = (b.items || [])[0];
      if (!it) throw ErrorYT('no_encontrado', 'No encontré el canal «' + entrada + '».');
      return self.get('channels', { part: PARTES_CANAL, id: it.snippet.channelId || it.id.channelId }).then(deLista);
    });
  };

  /** Últimos N videos subidos (máx. 50), con estadísticas y duración. */
  Cliente.prototype.videos = function (canal, max) {
    var self = this;
    max = Math.min(max || 50, 50);
    if (!canal.uploads) return Promise.resolve([]);
    return this.get('playlistItems', { part: 'contentDetails', playlistId: canal.uploads, maxResults: max }).then(function (b) {
      var ids = (b.items || []).map(function (i) { return (i.contentDetails || {}).videoId; }).filter(Boolean).slice(0, max);
      if (!ids.length) return [];
      // part=player con maxHeight devuelve embedWidth/embedHeight: sirve para saber si el video es vertical (Short)
      return self.get('videos', { part: 'snippet,statistics,contentDetails,player', id: ids.join(','), maxHeight: 640 })
        .then(function (v) {
          var porId = {};
          (v.items || []).forEach(function (it) { porId[it.id] = it; });
          return ids.map(function (id) { return porId[id]; }).filter(Boolean);
        });
    }).catch(function (e) {
      if (e.codigo === 'no_encontrado') return []; // canal sin videos públicos
      throw e;
    });
  };

  /** Prueba barata de la clave (1 unidad). */
  Cliente.prototype.probar = function () {
    return this.get('videos', { part: 'id', id: 'dQw4w9WgXcQ' }).then(function () { return true; });
  };

  return { Cliente: Cliente, interpretar: interpretar };
});
