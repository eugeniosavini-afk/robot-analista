/* Robot Analista — validación offline de licencias.
 * Formato: RA-XXXXX-XXXXX-XXXXX-XXXXX (Crockford base32). Los primeros 12 caracteres son aleatorios,
 * los últimos 8 son una firma HMAC-SHA256 recortada. Es un disuasivo simple, no una protección fuerte.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.RA_Licencia = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var ALF = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

  // --- SHA-256 en JS puro (funciona también fuera de https / sin crypto.subtle) ---
  var K = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01,
    0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f,
    0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70,
    0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
    0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];

  function sha256(bytes) {
    var H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    var l = bytes.length, withPad = ((l + 9 + 63) >> 6) << 6, m = new Uint8Array(withPad);
    m.set(bytes); m[l] = 0x80;
    var bits = l * 8;
    m[withPad - 4] = (bits >>> 24) & 255; m[withPad - 3] = (bits >>> 16) & 255; m[withPad - 2] = (bits >>> 8) & 255; m[withPad - 1] = bits & 255;
    m[withPad - 5] = Math.floor(bits / 4294967296) & 255;
    var w = new Array(64);
    for (var o = 0; o < withPad; o += 64) {
      for (var i = 0; i < 16; i++) w[i] = (m[o + i * 4] << 24) | (m[o + i * 4 + 1] << 16) | (m[o + i * 4 + 2] << 8) | m[o + i * 4 + 3];
      for (i = 16; i < 64; i++) {
        var a = w[i - 15], b = w[i - 2];
        var s0 = ((a >>> 7) | (a << 25)) ^ ((a >>> 18) | (a << 14)) ^ (a >>> 3);
        var s1 = ((b >>> 17) | (b << 15)) ^ ((b >>> 19) | (b << 13)) ^ (b >>> 10);
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
      }
      var A = H[0], B = H[1], C = H[2], D = H[3], E = H[4], F = H[5], G = H[6], HH = H[7];
      for (i = 0; i < 64; i++) {
        var S1 = ((E >>> 6) | (E << 26)) ^ ((E >>> 11) | (E << 21)) ^ ((E >>> 25) | (E << 7));
        var ch = (E & F) ^ (~E & G);
        var t1 = (HH + S1 + ch + K[i] + w[i]) | 0;
        var S0 = ((A >>> 2) | (A << 30)) ^ ((A >>> 13) | (A << 19)) ^ ((A >>> 22) | (A << 10));
        var maj = (A & B) ^ (A & C) ^ (B & C);
        var t2 = (S0 + maj) | 0;
        HH = G; G = F; F = E; E = (D + t1) | 0; D = C; C = B; B = A; A = (t1 + t2) | 0;
      }
      H[0] = (H[0] + A) | 0; H[1] = (H[1] + B) | 0; H[2] = (H[2] + C) | 0; H[3] = (H[3] + D) | 0;
      H[4] = (H[4] + E) | 0; H[5] = (H[5] + F) | 0; H[6] = (H[6] + G) | 0; H[7] = (H[7] + HH) | 0;
    }
    var out = new Uint8Array(32);
    for (i = 0; i < 8; i++) { out[i * 4] = H[i] >>> 24; out[i * 4 + 1] = (H[i] >>> 16) & 255; out[i * 4 + 2] = (H[i] >>> 8) & 255; out[i * 4 + 3] = H[i] & 255; }
    return out;
  }

  function utf8(s) {
    if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(s);
    return new Uint8Array(unescape(encodeURIComponent(s)).split('').map(function (c) { return c.charCodeAt(0); }));
  }

  function hmac(key, msg) {
    if (key.length > 64) key = sha256(key);
    var k = new Uint8Array(64); k.set(key);
    var ip = new Uint8Array(64 + msg.length), op = new Uint8Array(64 + 32);
    for (var i = 0; i < 64; i++) { ip[i] = k[i] ^ 0x36; op[i] = k[i] ^ 0x5c; }
    ip.set(msg, 64);
    op.set(sha256(ip), 64);
    return sha256(op);
  }

  // Secreto ofuscado (XOR + orden invertido). Disuasivo simple: quien lea el código con paciencia puede sacarlo.
  var _q = [84, 104, 108, 107, 171, 205, 178, 163, 176, 237, 169, 135, 156, 239, 244, 192, 193, 198, 170, 171, 239, 239, 50, 59, 66, 89, 32, 8];
  function _s() {
    var b = _q.slice().reverse(), out = new Uint8Array(b.length);
    for (var i = 0; i < b.length; i++) out[i] = b[i] ^ ((0x5A + i * 7) & 0xFF);
    return out;
  }

  function base32(bytes, n) {
    var bits = 0, val = 0, out = '';
    for (var i = 0; i < bytes.length && out.length < n; i++) {
      val = (val << 8) | bytes[i]; bits += 8;
      while (bits >= 5 && out.length < n) { out += ALF[(val >>> (bits - 5)) & 31]; bits -= 5; }
      val &= (1 << bits) - 1;
    }
    return out;
  }

  function firma(payload) { return base32(hmac(_s(), utf8('RA1|' + payload)), 8); }

  /** Limpia lo que pegó el usuario: mayúsculas, sin espacios ni guiones, O→0, I/L→1. */
  function normalizar(codigo) {
    var s = (codigo || '').toUpperCase().replace(/[\s\-_.]/g, '');
    if (s.length === 22 && s.indexOf('RA') === 0) s = s.slice(2);
    return s.replace(/O/g, '0').replace(/[IL]/g, '1').replace(/U/g, 'V');
  }

  function formatear(s20) { return 'RA-' + s20.slice(0, 5) + '-' + s20.slice(5, 10) + '-' + s20.slice(10, 15) + '-' + s20.slice(15, 20); }

  function validar(codigo) {
    var s = normalizar(codigo);
    if (s.length !== 20) return false;
    for (var i = 0; i < s.length; i++) if (ALF.indexOf(s[i]) < 0) return false;
    var payload = s.slice(0, 12), chk = s.slice(12);
    var esperado = firma(payload), dif = 0;
    for (i = 0; i < 8; i++) dif |= esperado.charCodeAt(i) ^ chk.charCodeAt(i);
    return dif === 0;
  }

  return { validar: validar, normalizar: normalizar, formatear: formatear, _firma: firma, _sha256: sha256 };
});
