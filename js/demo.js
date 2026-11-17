/* Robot Analista — datos de ejemplo (canal ficticio) para el modo demo y los tests. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.RA_Demo = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  // [título, es_short, duración_s, vistas, likes, comentarios, n_tags, largo_desc]
  var V = [
    ['Rechazó $250.000 por este reloj y hoy lo vende por $12.500', 1, 52, 41200, 1650, 120, 6, 220],
    ['El invento que nadie quiso y hoy vale una fortuna', 1, 48, 28800, 1100, 64, 4, 180],
    ['Un granjero construyó un avión en su garaje y terminó arrestado', 1, 58, 35500, 1420, 140, 8, 260],
    ['5 trucos para que tu celular dure más 😱 #shorts', 1, 41, 6100, 150, 9, 15, 80],
    ['La ciudad más rica del mundo ya no existe (pero nadie sabe por qué)', 1, 55, 30100, 1300, 98, 5, 300],
    ['Esto te lo dicen en la tienda para cobrarte de más #shorts', 1, 38, 7300, 190, 22, 12, 60],
    ['¿Sabías que este edificio se mueve con el viento?', 1, 44, 9800, 300, 17, 3, 140],
    ['Pagaron 3 millones por una botella y resultó falsa', 1, 50, 26700, 980, 85, 6, 210],
    ['Errores que arruinan tu ropa al lavarla 🚗 #shorts', 1, 36, 5200, 120, 8, 14, 70],
    ['Lo compró por 2.000 dólares y lo vendió por 64.000 sin tocarlo', 1, 57, 31900, 1250, 101, 7, 240],
    ['Cómo ordenar tu escritorio en 5 minutos #shorts', 1, 33, 4800, 110, 6, 16, 50],
    ['Este pueblo prohibió los autos y pasó esto', 1, 49, 18600, 640, 44, 5, 190],
    ['El hotel que se construyó al revés', 1, 46, 12300, 410, 25, 4, 150],
    ['Una empresa regaló 1.000 casas y nadie las quiso', 1, 54, 22100, 860, 77, 6, 230],
    ['Lo que nadie te dice de comprar usado 😱 #shorts', 1, 40, 6900, 170, 15, 13, 90],
    ['Encontraron 300 cajas fuertes bajo tierra (y la más cara estaba vacía)', 1, 59, 27300, 1010, 92, 5, 280],
    ['Este puente costó 2 millones y nunca se usó', 1, 47, 19900, 700, 51, 4, 170],
    ['3 consejos para ahorrar luz en invierno #shorts', 1, 35, 4300, 95, 5, 15, 40],
    ['El restaurante que solo abre un día al año', 1, 45, 11800, 380, 30, 3, 120],
    ['Un niño vendió una piedra por 40.000 € y era un meteorito', 1, 53, 24400, 920, 70, 6, 210],
    ['Por qué los aviones son blancos', 1, 39, 8700, 260, 19, 9, 110],
    ['La isla que cambió de país 3 veces', 1, 51, 15300, 520, 37, 5, 160],
    ['Ganó la lotería dos veces y terminó en la ruina', 1, 56, 29400, 1180, 105, 7, 250],
    ['Tips para dormir mejor esta noche #shorts', 1, 30, 3900, 80, 4, 17, 30],
    ['La casa más pequeña del mundo cuesta más que la tuya', 1, 52, 21000, 790, 58, 5, 200],
    ['El tren que nunca llegó a destino', 1, 50, 300, 20, 1, 4, 150],
    ['Pagó 100 € por un cuadro viejo y era un Picasso', 1, 55, 900, 60, 3, 5, 210],
    ['10 lugares abandonados que casi nadie conoce (el #1 da miedo)', 0, 642, 18400, 820, 96, 10, 900],
    ['La historia del hombre que vendió la Torre Eiffel… dos veces', 0, 731, 22600, 1040, 133, 12, 1100],
    ['Cómo funciona un aeropuerto por dentro (guía completa)', 0, 905, 5200, 190, 21, 18, 1400],
    ['7 inventos que fracasaron y hoy valen millones', 0, 688, 16900, 700, 81, 11, 950],
    ['Tutorial: cómo editar tus fotos con el celular', 0, 1120, 3100, 95, 12, 20, 1600],
    ['El fraude más grande de la historia del arte (y nadie se dio cuenta)', 0, 812, 20300, 910, 118, 9, 1000],
    ['Consejos para viajar barato por Europa', 0, 960, 4600, 160, 26, 19, 1300],
    ['Lo apostaron todo por una mina de oro y pasó lo peor', 0, 774, 17800, 760, 90, 10, 880],
    ['Recorrí el mercado más grande de México', 0, 1325, 6900, 280, 41, 14, 700],
    ['La ciudad que construyeron en 6 meses y ya no vive nadie', 0, 702, 15100, 620, 72, 8, 820],
    ['5 errores al comprar una casa', 0, 845, 3800, 120, 18, 16, 1200],
    ['El barco que desapareció y volvió 30 años después', 0, 668, 1200, 90, 9, 9, 800]
  ];
  // Horarios: los de la tarde rinden algo más en este canal ficticio
  var HORAS = [18, 12, 19, 9, 18, 13, 11, 19, 10, 18, 9, 17, 12, 18, 10, 19, 17, 8, 12, 18, 13, 17, 19, 9, 18, 19, 20,
    18, 19, 11, 18, 10, 19, 12, 17, 13, 18, 10, 18];

  function videos(ahora) {
    ahora = ahora ? new Date(ahora) : new Date();
    var out = [];
    for (var i = 0; i < V.length; i++) {
      var v = V[i];
      var diasAtras = Math.floor(i * 1.3) + (i >= V.length - 2 ? 0 : 3);
      var f = new Date(ahora.getTime() - diasAtras * 864e5);
      if (i >= 25 && i <= 26) f = new Date(ahora.getTime() - (i - 24) * 12 * 36e5); // 2 videos recientes (no maduros)
      f.setHours(HORAS[i % HORAS.length], (i * 7) % 60, 0, 0);
      if (f > ahora) f = new Date(ahora.getTime() - 3 * 36e5);
      out.push({
        id: 'demo' + ('000000' + i).slice(-7), titulo: v[0], fecha: f.toISOString(), vistas: v[3], likes: v[4], comentarios: v[5],
        duracion_s: v[2], vertical: !!v[1], es_short: !!v[1], tags: Array.from({ length: v[6] }, function (_, k) { return 'tag' + k; }),
        desc_len: v[7], en_vivo: false, url: 'https://www.youtube.com/', miniatura: ''
      });
    }
    return out;
  }

  var canal = { id: 'UCdemo', nombre: 'Curiosidades del Mundo (ejemplo)', handle: '@ejemplo', suscriptores: 48200,
    vistas_total: 2350000, videos_total: 39, miniatura: '', url: 'https://www.youtube.com/', demo: true };

  return { canal: canal, videos: videos };
});
