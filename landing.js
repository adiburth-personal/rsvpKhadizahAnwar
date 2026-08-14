// Otak laman jemputan utama (index.html).
//
// APA MAKSUDNYA (bahasa biasa):
// Fail ni menghidupkan laman jemputan: cover "tekan untuk buka", reveal seksyen
// bila skrol, countdown ke hari majlis, butang muzik <audio> HTML5 (fail sendiri
// laguMajlis.mp3, main bila cover ditekan), buku tetamu (3 ucapan terkini dari
// pangkalan data, baca sahaja), dan butang hubungi (telefon + WhatsApp).
//
// SEMUA bahagian DEFENSIF: kegagalan Firebase/CDN/audio TAK boleh kosongkan
// halaman. Teks tetamu dimasukkan lewat .textContent (selamat XSS).

import { firebaseConfig, konfigurasiBelumSiap } from "./firebaseConfig.js";

const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)");

// API modul muzik (diisi oleh muzikInit di bawah). Cover memanggilnya SEGERAK dalam
// gesture klik supaya autoplay dibenarkan. null selagi muzikInit belum jalan; klik
// cover berlaku selepas modul habis dinilai, jadi ia sentiasa sedia bila diperlukan.
let muzikApi = null;

// Mod OG (?og=1): susun cover versi landscape 1200x630 untuk jana ogImage.png.
// Tak ganggu paparan biasa (kelas hanya ditambah bila query ada).
try { if (new URLSearchParams(location.search).has("og")) document.documentElement.classList.add("lp-og"); } catch (e) {}

// ====== Konfig nombor hubungi (PADANAN BELUM SAH, senang tukar di sini) ======
// wasap.my: buang 0 depan, tambah 60. tel: guna format antarabangsa +60.
const KONTAK = [
  { label: "Bapa Pengantin",  tel: "01174583397" },
  { label: "Abang Pengantin", tel: "01170389498" },
  { label: "Adik Pengantin",  tel: "0168380403"  },
];

// ====== Sasaran countdown: 30 Ogos 2026, 12:00 tengah hari (waktu Malaysia +08) ======
const MASA_MAJLIS = new Date("2026-08-30T12:00:00+08:00").getTime();

// ====== Sumber muzik: fail audio SENDIRI (same-origin), lihat muzikInit ======
// ./laguMajlis.mp3 di root repo (dah dipotong dari titik mula betul + fade-in).
// Same-origin dipilih GANTI YouTube kerana iOS Safari sekat audio iframe cross-origin
// (lihat komen penuh di muzikInit). Elemen <audio> dicipta lewat JS di sana.
const LAGU_SRC = "./laguMajlis.mp3";

// ---------- Ikon SVG kecil (inline, tiada CDN ikon) ----------
function svgIkon(jenis) {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", "20");
  svg.setAttribute("height", "20");
  svg.setAttribute("fill", "none");
  svg.setAttribute("aria-hidden", "true");
  const p = document.createElementNS(ns, "path");
  if (jenis === "telefon") {
    p.setAttribute("d", "M7 4.5c.6 0 1.1.4 1.3 1l.9 2.7c.2.6 0 1.2-.5 1.6l-1.2 1a12 12 0 0 0 4.7 4.7l1-1.2c.4-.5 1-.7 1.6-.5l2.7.9c.6.2 1 .7 1 1.3V19c0 .8-.7 1.5-1.5 1.5A13.5 13.5 0 0 1 5.5 7 1.5 1.5 0 0 1 7 4.5Z");
  } else { // whatsapp (gagang telefon dalam gelembung)
    p.setAttribute("d", "M12 3.6a8.4 8.4 0 0 0-7.1 12.9L4 20.4l4-1a8.4 8.4 0 1 0 4-15.8Zm4.3 11.6c-.2.5-1 .9-1.4 1-.4 0-.8.2-2.6-.6-2.2-1-3.6-3.2-3.7-3.4-.1-.2-.9-1.2-.9-2.3s.6-1.6.8-1.8c.2-.2.4-.3.6-.3h.4c.2 0 .4 0 .5.4l.7 1.7c.1.2 0 .4-.1.5l-.3.4c-.1.1-.2.3-.1.5.1.2.6 1 1.3 1.6.9.8 1.6 1 1.8 1.1.2.1.4.1.5-.1l.6-.7c.2-.2.3-.1.5-.1l1.6.8c.2.1.4.2.4.3.1.1.1.6-.1 1Z");
  }
  p.setAttribute("stroke", "currentColor");
  p.setAttribute("stroke-width", "1.5");
  p.setAttribute("stroke-linejoin", "round");
  if (jenis === "whatsapp") { p.setAttribute("fill", "currentColor"); p.setAttribute("stroke", "none"); }
  svg.appendChild(p);
  return svg;
}

// ====== 1. COVER (tekan untuk buka) ======
(function coverInit() {
  const cover = document.getElementById("lpCover");
  if (!cover) return;
  const mono = cover.querySelector(".lp-mono");
  // Kunci skrol semasa cover naik supaya sampul terasa "penuh".
  try { document.documentElement.style.overflow = "hidden"; document.body.style.overflow = "hidden"; } catch (e) {}
  let dibuka = false;

  // Cipta bunga bertaburan: 8 biji kelopak watercolor (aset .bunga--* sedia ada) yang
  // MELETUP dari tengah cover ke tepi (arah/putaran berbeza setiap satu). Elemen HANYA
  // wujud sewaktu transisi buka; dibuang automatik bila cover.remove(). transform/opacity
  // sahaja (CSS keyframe lpTabur). Defensif: sebarang ralat diabai (cover tetap buka).
  function taburBunga() {
    try {
      const bekas = document.createElement("div");
      bekas.className = "lp-taburan";
      bekas.setAttribute("aria-hidden", "true");
      const aset = ["bunga--aBright", "bunga--bBright", "lp-bouquet-a", "bunga--aRose",
                    "bunga--bRose", "lp-bouquet-b", "bunga--aMid", "bunga--bBright"];
      const n = aset.length;                       // 8 biji (dalam julat 6-9)
      for (let i = 0; i < n; i++) {
        // Sebar sekata sekeliling bulatan + kacau sikit supaya organik.
        const sudut = (i / n) * Math.PI * 2 + (Math.random() * 0.6 - 0.3);
        const jarak = 130 + Math.random() * 130;   // px keluar dari tengah
        const tx = Math.cos(sudut) * jarak;
        const ty = Math.sin(sudut) * jarak - 30;   // condong sikit ke atas
        const rot = Math.random() * 170 - 85;      // putaran -85..85deg
        const sz = 18 + Math.random() * 16;        // 18-34px
        const el = document.createElement("span");
        el.className = "lp-taburan-i " + aset[i];
        el.style.setProperty("--tx", tx.toFixed(0) + "px");
        el.style.setProperty("--ty", ty.toFixed(0) + "px");
        el.style.setProperty("--rot", rot.toFixed(0) + "deg");
        el.style.setProperty("--tsz", sz.toFixed(0) + "px");
        el.style.setProperty("--tdelay", (i * 22) + "ms");
        bekas.appendChild(el);
      }
      cover.appendChild(bekas);
    } catch (e) {}
  }

  // Angkat cover + skrol + buang dari DOM. Diasingkan supaya boleh ditangguh selepas
  // zoom monogram + taburan bermula (bukan reduced-motion).
  function angkat() {
    cover.classList.add("is-buka");
    // Buka gate urutan hero dramatik: CSS hero (.lp-buka .lp-hero...) hanya animate
    // SELEPAS ini, jadi nama zoom + tarikh main TEPAT bila cover naik, bukan di
    // sebalik cover masa muat. Hero dah is-lihat (IO), jadi transisi mula serta-merta.
    try { document.documentElement.classList.add("lp-buka"); } catch (e) {}
    try { document.documentElement.style.overflow = ""; document.body.style.overflow = ""; } catch (e) {}
    // Auto-skrol sedikit supaya jelas kandungan bermula (hormat reduced-motion).
    try {
      window.scrollTo({ top: 8, left: 0, behavior: REDUCED.matches ? "auto" : "smooth" });
    } catch (e) { try { window.scrollTo(0, 8); } catch (e2) {} }
    // Buang cover dari DOM selepas peralihan tamat (jimat, elak halang fokus).
    window.setTimeout(function () { try { cover.remove(); } catch (e) {} }, REDUCED.matches ? 0 : 800);
  }
  function buka() {
    if (dibuka) return;
    dibuka = true;
    // Muzik: panggil audio.play() SEGERAK dalam gesture klik cover (klik/Enter/Space
    // semua gesture). play() same-origin dibenarkan browser HANYA semasa gesture, jadi
    // mesti di awal buka() sebelum apa-apa setTimeout, kalau tidak rantai user-activation
    // putus. Guard: kalau modul muzik gagal / play() ditolak, senyap sahaja, cover tetap
    // terbuka. Ini juga jalan pada laluan reduced-motion (mulaAuto sebelum cabang REDUCED).
    try { if (muzikApi) muzikApi.mulaAuto(); } catch (e) {}
    // Reduced-motion: buka terus tanpa zoom/taburan/tangguh, muzik tetap main.
    if (REDUCED.matches || !mono) { angkat(); return; }
    // PEMBUKAAN dramatik: monogram ZOOM masuk (scale 1.6 + fade, 620ms) SERENTAK bunga
    // bertaburan (920ms) letup dari tengah. Cover mula terangkat selepas 420ms supaya
    // zoom + taburan sempat dilihat, lepas tu fade (700ms). Jumlah cover hilang ~1120ms
    // (di bawah siling 1.4s), taburan habis ~1140ms lalu dibuang bersama cover.
    try { cover.classList.add("is-pecah"); } catch (e) {}
    taburBunga();
    window.setTimeout(angkat, 420);
  }
  cover.addEventListener("click", buka);
  cover.addEventListener("keydown", function (e) {
    if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") { e.preventDefault(); buka(); }
  });
})();

// ====== 2. REVEAL per-ELEMEN (resipi e-kad rujukan, BERULANG) ======
// APA MAKSUDNYA: setiap blok teks/elemen muncul SENDIRI bila IA masuk viewport (bukan
// seluruh seksyen sekali). Setiap elemen mula tersembunyi (op 0 + turun 100px, dari
// BAWAH sahaja pada semua arah skrol) dan main tween ~1s quad-out bila is-lihat ditanda.
//
// BEZA dari versi lama: (1) diperhati PER-ELEMEN, bukan per-seksyen; (2) mekanisme
// arah-atas (.lp-arah-atas) DIBUANG , elemen sentiasa masuk dari bawah; (3) stagger
// datang semulajadi dari susunan layout, bukan transition-delay panjang.
//
// RESET: bila elemen keluar viewport SEPENUHNYA (atas ATAU bawah, ratio ~0), buang
// is-lihat serta-merta (tiada animasi keluar) -> main semula setiap kali masuk balik.
// HISTERESIS: elemen yang masih separa kelihatan TAK direset (elak flicker di tengah).
//
// HERO: seksyen .lp-hero kekal diperhati sebagai SATU unit supaya urutan dramatiknya
// (nama zoom dll, gated .lp-buka) main sebagai identiti istimewa; ia pun main semula
// bila hero masuk balik viewport. Fallback/reduced: tunjuk semua statik.
(function revealInit() {
  // Elemen per-elemen: anak langsung seksyen (kecuali hiasan/kelopak/bingkai hero/ol
  // timeline) + setiap item timeline. Padan selector CSS enjin reveal (landing.css 2/2b).
  const elemen = Array.prototype.slice.call(document.querySelectorAll(
    ".lp-sec.reveal > :not(.lp-deko):not(.lp-kelopak):not(.lp-hero-frame):not(.lp-tl), " +
    ".lp-aturcara.reveal .lp-tl-item"
  ));
  // Hero diperhati sebagai seksyen (is-lihat pada .lp-hero mencetus urutan dramatik).
  const hero = document.querySelector(".lp-hero.reveal");
  const sasaran = elemen.slice();
  if (hero) sasaran.push(hero);
  if (!sasaran.length) return;

  function tunjukSemua() { sasaran.forEach(function (s) { s.classList.add("is-lihat"); }); }
  if (REDUCED.matches || typeof IntersectionObserver === "undefined") { tunjukSemua(); return; }

  try {
    // Threshold [0, 0.05] beri HISTERESIS: elemen reveal bila >=5% kelihatan (trigger
    // kecil, mula awal), tapi is-lihat HANYA dibuang bila betul-betul keluar viewport
    // (ratio ~0). Zon antara (0.001 < ratio < 0.05) kekalkan keadaan semasa -> elemen
    // di tengah yang sedang dibaca TAK pernah hilang is-lihat (tiada flicker).
    const io = new IntersectionObserver(function (entri) {
      entri.forEach(function (en) {
        if (en.isIntersecting && en.intersectionRatio >= 0.05) {
          en.target.classList.add("is-lihat");
        } else if (en.intersectionRatio <= 0.001) {
          en.target.classList.remove("is-lihat");   // keluar penuh: reset, main semula nanti
        }
      });
    }, { threshold: [0, 0.05] });
    sasaran.forEach(function (s) { io.observe(s); });
  } catch (e) { tunjukSemua(); }
})();

// ====== 3. COUNTDOWN ======
(function countdownInit() {
  const elHari = document.getElementById("cdHari");
  const elJam = document.getElementById("cdJam");
  const elMinit = document.getElementById("cdMinit");
  const elSaat = document.getElementById("cdSaat");
  const grid = document.getElementById("lpCountdown");
  const selesai = document.getElementById("lpCountdownSelesai");
  if (!elHari || !elJam || !elMinit || !elSaat) return;
  let timer = null;
  function pad(n) { return n < 10 ? "0" + n : String(n); }
  // Pop kecil bila nilai berubah. Restart animation guna toggle kelas: animationend
  // buang kelas (pop 250ms < selang 1s, jadi kelas mesti dah tanggal sebelum tick
  // berikut) -> tiada force-reflow tiap saat. Reduced-motion: langkau terus.
  function pop(el) {
    if (REDUCED.matches) return;
    el.classList.add("is-pop");
  }
  [elHari, elJam, elMinit, elSaat].forEach(function (el) {
    el.addEventListener("animationend", function () { el.classList.remove("is-pop"); });
  });
  // Set nilai HANYA bila berubah + pop pada yang berubah sahaja (Hari/Jam/Minit tak
  // pop tiap saat, cuma bila angka masing-masing bertukar).
  function setNilai(el, teks) {
    if (el.textContent === teks) return;
    el.textContent = teks;
    pop(el);
  }
  function kemas() {
    const baki = MASA_MAJLIS - Date.now();
    if (baki <= 0) {
      if (grid) grid.hidden = true;
      if (selesai) selesai.hidden = false;
      if (timer) window.clearInterval(timer);
      return;
    }
    const saat = Math.floor(baki / 1000);
    const hari = Math.floor(saat / 86400);
    const jam = Math.floor((saat % 86400) / 3600);
    const minit = Math.floor((saat % 3600) / 60);
    const s = saat % 60;
    setNilai(elHari, String(hari));
    setNilai(elJam, pad(jam));
    setNilai(elMinit, pad(minit));
    setNilai(elSaat, pad(s));
  }
  kemas();
  timer = window.setInterval(kemas, 1000);
})();

// ====== 4. HUBUNGI (bina baris dari KONTAK) ======
(function hubungiInit() {
  const bekas = document.getElementById("lpKontak");
  if (!bekas) return;
  KONTAK.forEach(function (k) {
    const antarabangsa = "60" + String(k.tel).replace(/^0/, "");   // buang 0, tambah 60
    const baris = document.createElement("div");
    baris.className = "lp-kontak-baris";

    const nama = document.createElement("span");
    nama.className = "lp-kontak-nama";
    nama.textContent = k.label;

    const btns = document.createElement("div");
    btns.className = "lp-kontak-btns";

    const telA = document.createElement("a");
    telA.className = "lp-kontak-btn";
    telA.href = "tel:+" + antarabangsa;
    telA.setAttribute("aria-label", "Telefon " + k.label);
    telA.appendChild(svgIkon("telefon"));

    const waA = document.createElement("a");
    waA.className = "lp-kontak-btn";
    waA.href = "https://wasap.my/" + antarabangsa;
    waA.target = "_blank";
    waA.rel = "noopener";
    waA.setAttribute("aria-label", "WhatsApp " + k.label);
    waA.appendChild(svgIkon("whatsapp"));

    btns.append(telA, waA);
    baris.append(nama, btns);
    bekas.appendChild(baris);
  });
})();

// ====== 5. DOCK: pautan dalam-page skrol lembut (rAF, elak flash gelap) ======
(function dockInit() {
  const dock = document.getElementById("lpDock");
  if (!dock) return;
  const OFFSET = 18;   // jarak dari atas viewport supaya tajuk seksyen tak terlalu rapat

  function easeInOutCubic(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function skrolY() { return window.scrollY || window.pageYOffset || 0; }

  // Animasi scroll SENDIRI guna requestAnimationFrame. KENAPA: scrollIntoView
  // behavior:"smooth" Chrome untuk jarak JAUH ambil 3+ saat dan compositor tak
  // sempat paint -> viewport "flash gelap" sekejap. rAF paint tiap frame, durasi
  // berskala dgn jarak tapi DIHAD 800ms, jadi tiada kad gelap kosong.
  function scrollKe(targetY) {
    const startY = skrolY();
    const dist = targetY - startY;
    if (Math.abs(dist) < 2) return;
    const dur = Math.min(800, Math.max(280, Math.abs(dist) * 0.5));
    const mula = performance.now();
    function langkah(now) {
      const p = Math.min((now - mula) / dur, 1);
      window.scrollTo(0, Math.round(startY + dist * easeInOutCubic(p)));
      if (p < 1) requestAnimationFrame(langkah);
    }
    requestAnimationFrame(langkah);
  }

  dock.addEventListener("click", function (e) {
    const a = e.target.closest("a");
    if (!a) return;
    const href = a.getAttribute("href") || "";
    if (href.charAt(0) !== "#") return;          // rsvp.html / ucapan.html: navigasi biasa
    const sasaran = document.querySelector(href);
    if (!sasaran) return;
    e.preventDefault();
    const targetY = Math.max(0, sasaran.getBoundingClientRect().top + skrolY() - OFFSET);
    if (REDUCED.matches) { window.scrollTo(0, targetY); return; }   // reduced: lompat terus
    scrollKe(targetY);
  });
})();

// ====== 6. MUZIK (<audio> HTML5 same-origin, guard penuh, status JUJUR ikut EVENT) ======
// Pulangkan { mulaAuto } supaya coverInit boleh mula muzik dari gesture klik cover.
//
// SEJARAH & KENAPA <audio> SAME-ORIGIN, BUKAN YOUTUBE:
// Versi lama guna iframe YouTube nocookie + handshake postMessage. Di iOS Safari /
// Chrome mobile, "user activation" (kebenaran gesture) TAK menjalar merentas sempadan
// origin ke iframe cross-origin untuk audio bukan-mute, jadi autoplay YouTube kerap
// disekat WALAUPUN iframe dicipta dalam gesture cover. Ia betul-betul GAGAL berbunyi di
// telefon pengantin. Penyelesaian: fail audio SENDIRI (./laguMajlis.mp3) yang same-origin.
// play() dipanggil SEGERAK dalam handler gesture pada elemen <audio> same-origin
// dibenarkan hampir semua browser TERMASUK iOS Safari, kerana tiada sempadan origin yang
// memutus rantai user-activation. Jauh lebih mudah dan boleh dipercayai daripada YouTube.
//
// KEJUJURAN: status butang (is-main + aria-pressed) dipacu EVENT SEBENAR elemen audio
// ('play'/'playing'/'pause'/'error'), BUKAN andaian optimistik. Kalau play() ditolak
// (promise reject) atau fail gagal muat (404/offline), butang kekal/kembali OFF dan
// senyap, page tak rosak. Loop cukup dengan audio.loop=true (fail dah dipotong betul).
muzikApi = (function muzikInit() {
  const btn = document.getElementById("lpMuzik");
  if (!btn) return null;

  // Cipta elemen <audio> lewat JS (tiada dalam markup statik supaya index.html bersih).
  // preload="none" MULA: JANGAN bazir ~3.5MB data untuk tetamu yang mungkin tak buka
  // atau tak mahu bunyi. Selepas page settle, kita naik ke "auto" untuk buffer latar
  // (lihat panaskan di bawah) supaya main serta-merta bila cover ditekan.
  let audio = null;
  let pernahCuba = false;   // pernah cuba main? (elak panaskan reset audio yang dah jalan)
  try {
    audio = document.createElement("audio");
    audio.src = LAGU_SRC;
    audio.loop = true;              // ulang tanpa henti; fail dah dipotong dari titik betul
    audio.preload = "none";         // elak muat turun sebelum tetamu betul-betul buka
    audio.setAttribute("aria-hidden", "true");
    audio.style.display = "none";   // tiada kesan visual; dalam DOM = lebih stabil sebahagian browser
    document.body.appendChild(audio);
  } catch (e) {
    // Elemen audio langsung tak boleh dicipta: butang senyap, page elok.
    return null;
  }

  function tandaMain(on) {
    btn.classList.toggle("is-main", on);
    btn.setAttribute("aria-pressed", on ? "true" : "false");
    btn.setAttribute("aria-label", on ? "Jeda muzik latar" : "Main muzik latar");
  }

  // Status butang dipacu EVENT SEBENAR elemen audio, bukan andaian:
  //  'play'    = cubaan main diterima (mula), 'playing' = betul-betul berbunyi,
  //  'pause'   = terhenti (butang off), 'error' = fail gagal muat (butang senyap off).
  // Semua defensif: sebarang ralat handler tak boleh rosakkan page.
  try {
    audio.addEventListener("play",    function () { tandaMain(true); });
    audio.addEventListener("playing", function () { tandaMain(true); });
    audio.addEventListener("pause",   function () { tandaMain(false); });
    audio.addEventListener("error",   function () { tandaMain(false); });
  } catch (e) {}

  // Timer unmute (teknik muted-unlock, lihat mulaMuted). Disimpan supaya boleh dibatal
  // kalau user jeda dalam tempoh 2 saat atau play() ditolak.
  let unmuteTimer = null;
  function batalUnmute() {
    if (unmuteTimer) { try { window.clearTimeout(unmuteTimer); } catch (e) {} unmuteTimer = null; }
  }

  // Cuba main SEGERAK, TIDAK muted (dipanggil dari tekan butang muzik = user minta bunyi
  // terus). play() pulangkan Promise yang mungkin REJECT (dasar autoplay / fail belum
  // sedia). .catch() defensif: kalau ditolak, event 'pause' belum tentu tercetus, jadi
  // kita betulkan butang OFF sendiri = jujur, dan tekanan butang berikut jadi gesture baru.
  function cubaMain() {
    pernahCuba = true;
    try {
      audio.muted = false;
      const p = audio.play();
      if (p && typeof p.catch === "function") {
        p.catch(function () { tandaMain(false); });   // ditolak: butang kekal off (jujur)
      }
    } catch (e) {
      tandaMain(false);
    }
  }

  // MULA muzik guna teknik MUTED-UNLOCK, 2 saat selepas cover ditekan (dipanggil dari
  // gesture cover). KENAPA muted-unlock: iOS/Safari hanya benarkan audio.play() semasa
  // "transient user activation" (kebenaran gesture yang LUPUT sekejap selepas handler).
  // Kalau kita setTimeout(play, 2000) terus, aktivasi dah luput -> play() disekat = punca
  // kegagalan klasik. Jadi kita play() SEGERAK dalam gesture TETAPI audio.muted=true
  // (dibenarkan tanpa bunyi) yang MEMBUKA KUNCI elemen audio. Lepas 2 saat baru
  // currentTime=0 + muted=false supaya lagu berbunyi DARI MULA, 2 saat selepas cover.
  // Butang muzik boleh ON dari mula (audio memang 'playing' walau muted , status jujur).
  function mulaMuted() {
    pernahCuba = true;
    try {
      audio.muted = true;                 // muted: dibenarkan main dalam gesture, buka kunci
      const p = audio.play();
      if (p && typeof p.catch === "function") {
        // Ditolak: batal jadual unmute, nyahmute (elak senyap tersekat), butang OFF (jujur).
        p.catch(function () { batalUnmute(); try { audio.muted = false; } catch (e) {} tandaMain(false); });
      }
      // Jadual unmute 2s: reset ke mula + bunyikan. Kalau user jeda dalam tempoh ini,
      // btn handler batalkan timer ini supaya lagu tak tiba-tiba bunyi selepas jeda.
      batalUnmute();
      unmuteTimer = window.setTimeout(function () {
        unmuteTimer = null;
        try { audio.currentTime = 0; audio.muted = false; } catch (e) {}
      }, 2000);
    } catch (e) {
      batalUnmute();
      try { audio.muted = false; } catch (e2) {}
      tandaMain(false);
    }
  }

  // Butang: toggle jeda/main, dipacu keadaan SEBENAR audio.paused. Tengah main -> jeda
  // (event 'pause' tanda butang off). Jeda/belum -> cuba main (unmuted) dalam gesture ini.
  btn.addEventListener("click", function () {
    try {
      if (!audio.paused) {                              // main (termasuk tempoh muted 2s) -> jeda
        batalUnmute();                                 // batal unmute supaya tak bunyi selepas jeda
        try { audio.muted = false; } catch (e) {}      // main berikut jadi bunyi biasa
        audio.pause();
        return;
      }
    } catch (e) {}
    cubaMain();                                        // jeda/belum -> cuba main (gesture baru)
  });

  // Dipanggil dari cover (gesture pengguna) SEGERAK, sebelum sebarang setTimeout dalam
  // buka(). Guna muted-unlock: lagu mula 2 saat selepas cover ditekan.
  function mulaAuto() { mulaMuted(); }

  // Naikkan preload ke "auto" SELEPAS page settle supaya audio siap buffer & main
  // serta-merta bila cover ditekan, TANPA merebut jalur kritikal (font/Firebase) masa
  // muat awal. Di iOS preload diabai sehingga gesture, jadi tiada data terbazir di
  // mobile; di desktop ia beri main segera. Guard pernahCuba: kalau tetamu dah tekan
  // cover dulu, JANGAN load() (elak reset/putus audio yang tengah jalan). Ralat diabai.
  function panaskan() {
    try {
      if (!audio || pernahCuba) return;
      if (audio.preload !== "auto") { audio.preload = "auto"; audio.load(); }
    } catch (e) {}
  }
  try {
    if (document.readyState === "complete") window.setTimeout(panaskan, 1200);
    else window.addEventListener("load", function () { window.setTimeout(panaskan, 1200); }, { once: true });
  } catch (e) {}

  return { mulaAuto: mulaAuto };
})();

// ====== 7. BUKU TETAMU (3 ucapan terkini, baca sahaja, defensif) ======
(function bukuInit() {
  const senarai = document.getElementById("lpBukuSenarai");
  if (!senarai) return;
  if (konfigurasiBelumSiap(firebaseConfig)) { senarai.hidden = true; return; }

  muatBuku().catch(function (err) {
    console.error("Gagal muat buku tetamu:", err);
    senarai.hidden = true;   // sorok preview dengan elok; butang kekal
  });

  async function muatBuku() {
    const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js");
    const { getFirestore, collection, query, orderBy, limit, getDocs } =
      await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js");

    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    // Ambil lebih (15) sebab perlu tapis yang ADA ucapan, pastu ambil 3 teratas.
    const soalan = query(collection(db, "rsvp"), orderBy("masa", "desc"), limit(15));
    const petikan = await getDocs(soalan);

    const ucapanBaik = [];
    petikan.forEach(function (dok) {
      const data = dok.data() || {};
      const ucapan = (data.ucapan || "").trim();
      if (ucapan) ucapanBaik.push({ nama: (data.nama || "Tetamu").trim() || "Tetamu", ucapan: ucapan });
    });

    const tiga = ucapanBaik.slice(0, 3);
    if (!tiga.length) { senarai.hidden = true; return; }

    senarai.innerHTML = "";
    tiga.forEach(function (u, i) {
      const kad = document.createElement("article");
      kad.className = "lp-buku-kad";
      // Luncur masuk bergilir sekali (delay ikut index). Reduced-motion: terus nampak.
      if (!REDUCED.matches) {
        kad.classList.add("is-masuk");
        kad.style.animationDelay = (i * 90) + "ms";
      }
      const teks = document.createElement("p");
      teks.className = "lp-buku-ucap";
      teks.textContent = u.ucapan;           // XSS selamat
      const nama = document.createElement("p");
      nama.className = "lp-buku-nama";
      nama.textContent = u.nama;             // XSS selamat
      kad.append(teks, nama);
      senarai.appendChild(kad);
    });
    senarai.hidden = false;
  }
})();

// ====== 8. PARALLAX LEMBUT (hiasan .lp-deko dalam kad bergerak sikit ikut skrol) ======
// Satu listener scroll passive + throttle rAF: baca scrollY SEKALI per frame, tulis
// var --lp-par (translateY, digabung dgn rotate CSS elemen). TIADA baca layout dalam
// loop (tiada getBoundingClientRect). Mati penuh bila reduced-motion.
(function parallaxInit() {
  if (REDUCED.matches) return;
  const dekos = Array.prototype.slice.call(document.querySelectorAll(".lp-kad .lp-deko"));
  if (!dekos.length) return;
  const MAKS = 14;   // anjakan maksimum (px), sejajar arahan
  // Faktor kecil BERBEZA ikut elemen (0.03..0.065) supaya ada kedalaman halus.
  dekos.forEach(function (el, i) { el._par = 0.03 + (i % 5) * 0.009; });
  let menunggu = false;
  function frame() {
    menunggu = false;
    const y = window.scrollY || window.pageYOffset || 0;
    for (let i = 0; i < dekos.length; i++) {
      const el = dekos[i];
      let off = y * el._par;
      if (off > MAKS) off = MAKS;
      else if (off < -MAKS) off = -MAKS;
      el.style.setProperty("--lp-par", off.toFixed(1) + "px");
    }
  }
  window.addEventListener("scroll", function () {
    if (!menunggu) { menunggu = true; requestAnimationFrame(frame); }
  }, { passive: true });
  frame();
})();

// ====== 9. MODAL RSVP (borang rsvp.html dalam pop up, tak keluar page) ======
// Butang menuju rsvp.html (CTA RSVP, dock RSVP, "Berikan Ucapan") dipintas: buka
// borang dalam modal iframe (rsvp.html?embed=1) ATAS landing. PROGRESSIVE ENHANCEMENT:
// href asal kekal dalam HTML, jadi kalau modul ni gagal, klik = navigasi biasa.
(function modalInit() {
  const modal = document.getElementById("lpModal");
  const badan = document.getElementById("lpModalBadan");
  const btnTutup = document.getElementById("lpModalTutup");
  if (!modal || !badan) return;
  let iframe = null;
  let pencetus = null;     // butang yang buka modal (fokus balik bila tutup)
  let sedangBuka = false;

  function kunciSkrol(on) {
    // Kunci skrol badan masa modal buka (pulih bila tutup), sama gaya cover.
    try {
      document.documentElement.style.overflow = on ? "hidden" : "";
      document.body.style.overflow = on ? "hidden" : "";
    } catch (e) {}
  }
  function buka(dari) {
    if (sedangBuka) return;
    sedangBuka = true;
    pencetus = dari || null;
    // iframe LAZY: cipta sekali pada buka pertama, kekal untuk buka semula pantas.
    if (!iframe) {
      try {
        iframe = document.createElement("iframe");
        iframe.setAttribute("title", "Borang RSVP kehadiran");
        iframe.setAttribute("src", "./rsvp.html?embed=1");   // guna semula borang + Firebase sedia ada
        badan.appendChild(iframe);
      } catch (e) { iframe = null; }
    }
    modal.hidden = false;
    kunciSkrol(true);
    // Tambah is-buka pada frame seterusnya supaya transition (fade + naik) main,
    // bukan lompat. Reduced-motion: CSS matikan transition -> muncul terus.
    requestAnimationFrame(function () { modal.classList.add("is-buka"); });
    // Fokus dipindah ke modal (butang tutup).
    try { btnTutup.focus(); } catch (e) {}
  }
  function tutup() {
    if (!sedangBuka) return;
    sedangBuka = false;
    modal.classList.remove("is-buka");
    kunciSkrol(false);
    // Sorok sepenuhnya selepas transition (elak modal invisible masih tangkap klik).
    if (REDUCED.matches) { modal.hidden = true; }
    else { window.setTimeout(function () { if (!sedangBuka) modal.hidden = true; }, 260); }
    // Fokus balik ke butang pencetus.
    try { if (pencetus) pencetus.focus(); } catch (e) {}
    pencetus = null;
  }

  // Pintas klik pautan rsvp.html sahaja (bukan ucapan.html/index.html). Hormat klik
  // ubahsuai (ctrl/cmd/shift/alt/butang tengah) supaya "buka tab baru" tetap jalan.
  document.addEventListener("click", function (e) {
    if (e.defaultPrevented) return;
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target && e.target.closest ? e.target.closest("a[href]") : null;
    if (!a) return;
    const href = a.getAttribute("href") || "";
    if (!/(^|\/)rsvp\.html(\?|#|$)/.test(href)) return;
    e.preventDefault();
    buka(a);
  });

  if (btnTutup) btnTutup.addEventListener("click", tutup);
  // Klik overlay (luar kad) = tutup.
  modal.addEventListener("click", function (e) {
    if (e.target && e.target.hasAttribute && e.target.hasAttribute("data-lp-tutup")) tutup();
  });
  // Esc = tutup.
  document.addEventListener("keydown", function (e) {
    if (sedangBuka && (e.key === "Escape" || e.key === "Esc")) { e.preventDefault(); tutup(); }
  });
})();

// ====== 10. MODAL SALAM KAUT (butang dock "Hadiah" -> QR DuitNow) ======
// Guna semula shell .lp-modal* (tiada duplikasi CSS). Logik buka/tutup BERASINGAN
// daripada modal RSVP supaya modal sedia ada tak tersentuh (kandungan Hadiah statik,
// bukan iframe). Sama corak: scroll lock, fokus ke butang tutup, Esc/overlay/X tutup,
// fokus balik ke pencetus. Defensif: elemen tiada -> senyap.
(function modalHadiahInit() {
  const modal = document.getElementById("lpModalHadiah");
  const btnBuka = document.getElementById("lpDockHadiah");
  const btnTutup = document.getElementById("lpModalHadiahTutup");
  if (!modal || !btnBuka) return;
  let sedangBuka = false;
  let pencetus = null;

  function kunciSkrol(on) {
    try {
      document.documentElement.style.overflow = on ? "hidden" : "";
      document.body.style.overflow = on ? "hidden" : "";
    } catch (e) {}
  }
  function buka() {
    if (sedangBuka) return;
    sedangBuka = true;
    pencetus = btnBuka;
    modal.hidden = false;
    kunciSkrol(true);
    // Tambah is-buka frame seterusnya supaya fade + naik main (reduced-motion: CSS
    // matikan transition -> muncul terus).
    requestAnimationFrame(function () { modal.classList.add("is-buka"); });
    try { if (btnTutup) btnTutup.focus(); } catch (e) {}
  }
  function tutup() {
    if (!sedangBuka) return;
    sedangBuka = false;
    modal.classList.remove("is-buka");
    kunciSkrol(false);
    if (REDUCED.matches) { modal.hidden = true; }
    else { window.setTimeout(function () { if (!sedangBuka) modal.hidden = true; }, 260); }
    try { if (pencetus) pencetus.focus(); } catch (e) {}
    pencetus = null;
  }

  btnBuka.addEventListener("click", buka);
  if (btnTutup) btnTutup.addEventListener("click", tutup);
  // Klik overlay (luar kad) = tutup.
  modal.addEventListener("click", function (e) {
    if (e.target && e.target.hasAttribute && e.target.hasAttribute("data-lp-tutup")) tutup();
  });
  // Esc = tutup (guard sedangBuka: hanya modal yang terbuka bertindak balas).
  document.addEventListener("keydown", function (e) {
    if (sedangBuka && (e.key === "Escape" || e.key === "Esc")) { e.preventDefault(); tutup(); }
  });
})();
