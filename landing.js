// Otak laman jemputan utama (index.html).
//
// APA MAKSUDNYA (bahasa biasa):
// Fail ni menghidupkan laman jemputan: cover "tekan untuk buka", reveal seksyen
// bila skrol, countdown ke hari majlis, butang muzik YouTube (dicipta selepas
// tekan sahaja), buku tetamu (3 ucapan terkini dari pangkalan data, baca sahaja),
// dan butang hubungi (telefon + WhatsApp).
//
// SEMUA bahagian DEFENSIF: kegagalan Firebase/CDN/YouTube TAK boleh kosongkan
// halaman. Teks tetamu dimasukkan lewat .textContent (selamat XSS).

import { firebaseConfig, konfigurasiBelumSiap } from "./firebaseConfig.js";

const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)");

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

// ====== Sumber muzik: YouTube nocookie, iframe dicipta HANYA selepas tekan ======
const YT_ID = "idfnoMuigSA";
const YT_SRC = "https://www.youtube-nocookie.com/embed/" + YT_ID +
  "?enablejsapi=1&autoplay=1&playsinline=1&loop=1&playlist=" + YT_ID;

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
  const seal = cover.querySelector(".lp-seal");
  // Kunci skrol semasa cover naik supaya sampul terasa "penuh".
  try { document.documentElement.style.overflow = "hidden"; document.body.style.overflow = "hidden"; } catch (e) {}
  let dibuka = false;
  // Angkat cover + skrol + buang dari DOM. Diasingkan supaya boleh ditangguh selepas
  // hentakan seal (bukan reduced-motion).
  function angkat() {
    cover.classList.add("is-buka");
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
    // Reduced-motion: buka terus tanpa hentakan/tangguh (macam sebelum ini).
    if (REDUCED.matches || !seal) { angkat(); return; }
    // Dramatik: seal membesar (~250ms) DULU, cover terangkat selepas ~200ms. Jumlah
    // keseluruhan (200 + 800 buang) ~1000ms, di bawah siling ~1200ms.
    try { seal.classList.add("is-tekan"); } catch (e) {}
    window.setTimeout(angkat, 200);
  }
  cover.addEventListener("click", buka);
  cover.addEventListener("keydown", function (e) {
    if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") { e.preventDefault(); buka(); }
  });
})();

// ====== 2. REVEAL seksyen (IntersectionObserver, fallback tunjuk semua) ======
(function revealInit() {
  const seksyen = Array.prototype.slice.call(document.querySelectorAll(".reveal"));
  if (!seksyen.length) return;
  function tunjukSemua() { seksyen.forEach(function (s) { s.classList.add("is-lihat"); }); }
  if (REDUCED.matches || typeof IntersectionObserver === "undefined") { tunjukSemua(); return; }
  try {
    const io = new IntersectionObserver(function (entri) {
      entri.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("is-lihat"); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    seksyen.forEach(function (s) { io.observe(s); });
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

// ====== 6. MUZIK (iframe dicipta selepas tekan, guard penuh) ======
(function muzikInit() {
  const btn = document.getElementById("lpMuzik");
  const host = document.getElementById("lpMuzikHost");
  if (!btn || !host) return;
  let iframe = null;
  let main = false;

  function cmd(func) {
    try {
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage(JSON.stringify({ event: "command", func: func, args: [] }), "*");
      }
    } catch (e) { /* abai: kegagalan kawalan tak boleh rosakkan page */ }
  }
  function tandaMain(on) {
    main = on;
    btn.classList.toggle("is-main", on);
    btn.setAttribute("aria-pressed", on ? "true" : "false");
    btn.setAttribute("aria-label", on ? "Jeda muzik latar" : "Main muzik latar");
  }
  function cipta() {
    try {
      iframe = document.createElement("iframe");
      iframe.setAttribute("title", "Muzik latar majlis");
      iframe.setAttribute("allow", "autoplay; encrypted-media");
      iframe.setAttribute("frameborder", "0");
      iframe.width = "1"; iframe.height = "1";
      iframe.style.border = "0";
      iframe.addEventListener("error", function () {
        // Iframe gagal muat (offline/sekat): senyapkan butang, jangan rosakkan page.
        try { iframe.remove(); } catch (e) {}
        iframe = null; tandaMain(false);
      });
      host.appendChild(iframe);
      iframe.src = YT_SRC;   // autoplay=1 dalam gesture pengguna: dibenarkan
      host.hidden = false;
      tandaMain(true);
    } catch (e) {
      iframe = null; tandaMain(false);
    }
  }
  btn.addEventListener("click", function () {
    if (!iframe) { cipta(); return; }
    if (main) { cmd("pauseVideo"); tandaMain(false); }
    else { cmd("playVideo"); tandaMain(true); }
  });
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
