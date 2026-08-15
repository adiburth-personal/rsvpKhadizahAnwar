// Logik halaman dinding ucapan: timbunan kad boleh SWIPE, HIDUP.
//
// APA MAKSUDNYA (bahasa biasa):
// Fail ni "otak" halaman ucapan.html. Ia dengar pangkalan data (Firestore)
// dan tunjuk ucapan tetamu sebagai satu TIMBUNAN kad bertindih (macam tumpukan
// kad ucapan atas meja). Kad depan besar = fokus baca. Tetamu boleh:
//   - swipe kad kiri (kad terbang keluar) untuk ucapan seterusnya,
//   - swipe kanan untuk balik ke ucapan sebelum,
//   - tekan butang anak panah, atau guna kekunci kiri/kanan,
//   - tekan "Lihat semua ucapan" untuk buka grid penuh semua ucapan.
// Ia HANYA baca ucapan (onSnapshot /rsvp). Butang "sayang" hantar satu dokumen
// kecil ke /sayang (create-only). Borang RSVP tinggal di halaman berasingan.
//
// Semua GERAK guna transform/opacity sahaja (mesra GPU, jimat bateri telefon),
// dan dihormati prefers-reduced-motion (kad tukar terus tanpa terbang).

import { firebaseConfig, konfigurasiBelumSiap } from "./firebaseConfig.js";

// ====== Rujukan elemen halaman ======
const notisSetup = document.getElementById("notisSetup");
const timbunan = document.getElementById("timbunan");
const timbunanKosong = document.getElementById("timbunanKosong");
const kawalan = document.getElementById("kawalan");
const btnSebelum = document.getElementById("btnSebelum");
const btnSeterus = document.getElementById("btnSeterus");
const kemajuanKini = document.getElementById("kemajuanKini");
const kemajuanJumlah = document.getElementById("kemajuanJumlah");
const kemajuanIsi = document.getElementById("kemajuanIsi");
const dindingKaunter = document.getElementById("dindingKaunter");
const lihatSemuaBaris = document.getElementById("lihatSemuaBaris");
const btnLihatSemua = document.getElementById("btnLihatSemua");
const gridSeksyen = document.getElementById("gridSeksyen");
const gridSenarai = document.getElementById("gridSenarai");
const btnTutupGrid = document.getElementById("btnTutupGrid");
const doaBaruPil = document.getElementById("doaBaruPil");
const doaBaruTeks = document.getElementById("doaBaruTeks");

// ====== Tetapan ======
const BILANGAN_VARIASI = 5;   // v0 krim, v1 blush, v2 plum, v3 emas, v4 aubergine
const HAD_SWIPE = 48;         // jarak santai (px) untuk cetus tukar kad (dulu 90, terlalu jauh)
const FLICK_JARAK = 22;       // flick pantas: jarak mendatar minimum untuk diterima
const FLICK_MASA = 260;       // flick pantas: mesti berlaku dalam tempoh ini (ms)
const HAD_ARAH = 10;          // gerak minimum sebelum kunci arah (elak sentak)
const NISBAH_MENEGAK = 1.3;   // dy > dx*nisbah = menegak; <= = mendatar (serong 30-45deg kekal mendatar)
const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)");

// ====== Mod debug (?debug=1): panel terapung log event swipe untuk phone sebenar ======
// Tujuan: kalau bug swipe muncul lagi di phone, buka ucapan.html?debug=1, ulang
// gesture, screenshot panel. Tanpa ?debug=1, sifar kesan pada halaman biasa.
const DEBUG = (function () {
  try { return new URLSearchParams(location.search).has("debug"); } catch (e) { return false; }
})();
let dbgBody = null;
function binaDbgPanel() {
  const panel = document.createElement("div");
  panel.setAttribute("style", [
    "position:fixed", "left:6px", "right:6px", "bottom:6px", "max-height:30vh", "z-index:99999",
    "background:rgba(24,12,28,0.93)", "color:#ecdcf4", "font:11px/1.35 ui-monospace,Menlo,monospace",
    "border:1px solid #7a4a8c", "border-radius:8px", "padding:4px 6px", "pointer-events:none",
    "display:flex", "flex-direction:column", "box-shadow:0 6px 24px rgba(0,0,0,0.4)"
  ].join(";"));
  const bar = document.createElement("div");
  bar.setAttribute("style", "display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #7a4a8c;margin-bottom:3px;padding-bottom:2px;pointer-events:none");
  const tajuk = document.createElement("strong"); tajuk.textContent = "swipe debug";
  const clr = document.createElement("button");
  clr.type = "button"; clr.textContent = "clear";
  clr.setAttribute("style", "pointer-events:auto;background:#7a4a8c;color:#fff;border:0;border-radius:4px;font:11px ui-monospace,monospace;padding:1px 10px");
  clr.addEventListener("click", function () { if (dbgBody) dbgBody.textContent = ""; });
  bar.append(tajuk, clr);
  dbgBody = document.createElement("div");
  dbgBody.setAttribute("style", "overflow-y:auto;flex:1;pointer-events:none;white-space:pre-wrap;word-break:break-word");
  panel.append(bar, dbgBody);
  (document.body || document.documentElement).appendChild(panel);
}
function dbg(msg) {
  if (!DEBUG) return;
  // GUARD: panel debug ini SEMATA mata alat diagnosis (?debug=1). Ia tak boleh
  // sekali kali membunuh gesture swipe atau render kad kalau tersilap. Bungkus
  // dalam try/catch supaya sebarang ralat DOM di sini gagal senyap, bukan merebak.
  try {
    if (!dbgBody) binaDbgPanel();
    const line = document.createElement("div");
    line.textContent = "[" + Math.round(performance.now()) + "] " + msg;
    dbgBody.appendChild(line);
    while (dbgBody.childElementCount > 80) dbgBody.removeChild(dbgBody.firstChild);
    dbgBody.scrollTop = dbgBody.scrollHeight;
  } catch (e) { /* abai: hiasan debug tak boleh ganggu fungsi teras */ }
}
if (DEBUG && document.body) { try { binaDbgPanel(); } catch (e) {} }

// KESELAMATAN XSS (WAJIB): semua teks tetamu dimasukkan lewat `.textContent`,
// BUKAN `.innerHTML`. Dengan textContent, sebarang tag HTML dalam input tetamu
// dipapar sebagai teks biasa dan mustahil dilaksana.

// ====== Keadaan timbunan ======
let entriMap = new Map();     // id -> { id, nama, ucapan }
let dataTerkini = [];         // senarai penuh terkini (newest-first) untuk grid + kaunter
let deckIds = [];             // urutan kad dalam timbunan (id)
let index = 0;                // penunjuk kad depan dalam deckIds
let frontId = null;           // id kad depan (dikekalkan supaya tak sentak bila data masuk)
let sudahMula = false;        // sudah terima snapshot pertama?
let isAnimating = false;
let abaikanKlikSayang = false; // true sebentar selepas swipe: elak "klik" hantu cetus like
let pendingBaru = null;       // { count, targetId } untuk pil "doa baru masuk"
let dragAktif = false;        // true SEMASA jari betul betul pegang/heret kad depan
let snapshotTertunggu = null; // snapshot /rsvp yang tiba masa tak sesuai (drag/animasi); diproses lepas selesai
let tandaTerakhir = null;     // "cap jari" data yang terakhir dirender (elak bina semula DOM sia sia)

// ====== Keadaan "sayang" ======
const KUNCI_SAYANG = "sayangDitekan.v1";
const sayangKira = new Map();               // ucapanId -> jumlah sayang
let dbRujuk = null;
let sayangApi = null;                        // { collection, addDoc, serverTimestamp }

// ====== Mod setup belum siap ======
if (konfigurasiBelumSiap(firebaseConfig)) {
  notisSetup.classList.add("tunjuk");
  timbunanKosong.textContent = "Dinding ucapan akan aktif sebaik sahaja tetapan Firebase diisi.";
  timbunanKosong.hidden = false;
  kawalan.hidden = true;
  lihatSemuaBaris.hidden = true;
} else {
  // GUARD: mulakanDinding() muat SDK Firebase dari CDN gstatic secara dinamik.
  // Kalau muatan itu GAGAL (rangkaian telefon perlahan/sekat, pelayar lama tak
  // sokong module import), tanpa .catch halaman tinggal header + arena KOSONG
  // tanpa sebarang penjelasan = "tak keluar apa apa". Tangkap dan papar mesej
  // jujur supaya kandungan tak pernah senyap gagal.
  mulakanDinding().catch(function (err) {
    console.error("Gagal memulakan dinding ucapan:", err);
    if (timbunan) timbunan.innerHTML = "";
    if (timbunanKosong) {
      timbunanKosong.textContent = "Maaf, dinding ucapan tidak dapat dimuatkan buat masa ini. Sila semak sambungan internet dan muat semula halaman.";
      timbunanKosong.hidden = false;
    }
    if (kawalan) kawalan.hidden = true;
    if (lihatSemuaBaris) lihatSemuaBaris.hidden = true;
  });
}

// ====== Anti-spam ringan (localStorage) ======
// NOTA JUJUR: ini cuma halang tekan berganda pada peranti + browser yang SAMA.
// Boleh dipintas (clear storage, phone lain, incognito). Tanpa auth, mustahil
// kunci "satu orang satu sayang" betul betul. Untuk majlis ni OK, butang = luahan
// kasih, bukan undian rasmi.
function bacaSayang() {
  try { return new Set(JSON.parse(localStorage.getItem(KUNCI_SAYANG) || "[]")); }
  catch (e) { return new Set(); }
}
function sudahSayang(id) { return bacaSayang().has(id); }
function tandaSayang(id) {
  const s = bacaSayang(); s.add(id);
  try { localStorage.setItem(KUNCI_SAYANG, JSON.stringify([...s])); } catch (e) { /* abai */ }
}
function buangTandaSayang(id) {
  const s = bacaSayang(); s.delete(id);
  try { localStorage.setItem(KUNCI_SAYANG, JSON.stringify([...s])); } catch (e) { /* abai */ }
}

// Hash kecil (djb2) untuk warna deterministik ikut id (bukan urutan): warna
// seseorang kekal sama walau kedudukan dalam timbunan berubah.
function hash(teks) {
  let h = 5381;
  for (let i = 0; i < teks.length; i++) h = ((h << 5) + h + teks.charCodeAt(i)) >>> 0;
  return h;
}

// Inisial nama: ambil huruf pertama nama bermakna (lompat "bin"/"binti"/gelaran).
function inisialDari(nama) {
  const lompat = { bin: 1, binti: 1, bt: 1 };
  const kata = (nama || "").trim().split(/\s+/);
  for (let i = 0; i < kata.length; i++) {
    const w = kata[i].replace(/[^A-Za-z]/g, "");
    if (w && !lompat[w.toLowerCase()]) return w.charAt(0).toUpperCase();
  }
  return (nama || "T").charAt(0).toUpperCase() || "T";
}

// ====== Butang sayang (XSS selamat, count diisi kemudian oleh lukisSayang) ======
function buatSayangBtn() {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "sayang-btn";
  const hati = document.createElement("span");
  hati.className = "sayang-hati";
  hati.setAttribute("aria-hidden", "true");
  hati.textContent = "♥";              // hati (textContent)
  const kira = document.createElement("span");
  kira.className = "sayang-kira";
  btn.append(hati, kira);
  return btn;
}

// Lukis satu butang sayang (count + keadaan + aria) dari Map pusat.
function hiasSayangBtn(btn, id) {
  if (!btn || !id) return;
  const n = sayangKira.get(id) || 0;
  const span = btn.querySelector(".sayang-kira");
  if (span) span.textContent = n > 0 ? String(n) : "";
  const ditekan = sudahSayang(id);
  btn.classList.toggle("is-sayang", ditekan);
  btn.setAttribute("aria-pressed", ditekan ? "true" : "false");
  btn.setAttribute("aria-label",
    "Like ucapan ini" + (n > 0 ? ", " + n + " orang sudah like" : ""));
}

// Lukis count ke SEMUA butang sayang yang ada di skrin (kad depan + grid).
function lukisSayang() {
  document.querySelectorAll(".swipe-kad .sayang-btn, .grid-kad .sayang-btn").forEach(function (btn) {
    const kad = btn.closest("[data-id]");
    if (kad) hiasSayangBtn(btn, kad.dataset.id);
  });
}

// Kaunter jujur: "X ucapan · Y like" (100% data sebenar).
function lukisKaunter() {
  if (!dindingKaunter) return;
  const nUcap = dataTerkini.length;
  if (nUcap === 0) { dindingKaunter.hidden = true; return; }
  let nSayang = 0; sayangKira.forEach(function (v) { nSayang += v; });
  dindingKaunter.hidden = false;
  // "♥" bukan "like": seluruh sistem panggil benda ni ♥/sayang, jangan campur bahasa.
  dindingKaunter.textContent = nUcap + " ucapan" + (nSayang > 0 ? " · " + nSayang + " ♥" : "");
}

// Heart-burst: 4-6 hati kecil naik + pudar. CSS transform, node auto-buang,
// terus di-skip bila reduced-motion.
function hatiBurst(btn) {
  if (REDUCED.matches || !btn) return;
  for (let i = 0; i < 5; i++) {
    const h = document.createElement("span");
    h.className = "hati-timbul";
    h.textContent = "♥";
    h.setAttribute("aria-hidden", "true");
    h.style.setProperty("--dx", (Math.random() * 40 - 20).toFixed(0) + "px");
    btn.appendChild(h);
    window.setTimeout(function () { h.remove(); }, 850);
  }
}

// Tekan sayang: optimistik (terus nampak) + rollback jujur bila addDoc gagal.
async function tekanSayang(id, sumberBtn) {
  if (!id || sudahSayang(id)) return;
  if (!dbRujuk || !sayangApi) return;
  tandaSayang(id);
  sayangKira.set(id, (sayangKira.get(id) || 0) + 1);
  lukisSayang();
  lukisKaunter();
  hatiBurst(sumberBtn);
  try {
    await sayangApi.addDoc(
      sayangApi.collection(dbRujuk, "sayang"),
      { ucapanId: id, masa: sayangApi.serverTimestamp() }
    );
  } catch (err) {
    console.error("Gagal hantar sayang:", err);
    buangTandaSayang(id);
    sayangKira.set(id, Math.max(0, (sayangKira.get(id) || 1) - 1));
    lukisSayang();
    lukisKaunter();
  }
}

// ====== Bina satu kad timbunan ======
function terapkanDepth(kad, depth) {
  // depth 0 = depan; 1 dan 2 = belakang (mengecil, turun sikit, sendeng halus).
  const peta = [
    { y: 0,  s: 1,     r: 0 },
    { y: 16, s: 0.955, r: -2 },
    { y: 32, s: 0.91,  r: 2.2 }
  ];
  const p = peta[depth] || peta[2];
  kad.style.transform = "translateY(" + p.y + "px) scale(" + p.s + ") rotate(" + p.r + "deg)";
  kad.style.opacity = depth === 2 ? "0.75" : "1";
  kad.style.zIndex = String(3 - depth);
}

function buatKad(deckIdx, depth) {
  const id = deckIds[deckIdx];
  const entri = entriMap.get(id);
  const v = hash(id) % BILANGAN_VARIASI;

  const kad = document.createElement("article");
  kad.className = "swipe-kad swipe-kad--v" + v;
  kad.dataset.depth = String(depth);
  kad.dataset.id = id;

  // Tanda arah semasa drag
  const tSeb = document.createElement("div");
  tSeb.className = "arah-tanda arah-tanda--sebelum";
  tSeb.textContent = "Sebelum";
  const tSet = document.createElement("div");
  tSet.className = "arah-tanda arah-tanda--seterus";
  tSet.textContent = "Seterusnya";

  // Baris atas: inisial + nombor kedudukan
  const atas = document.createElement("div");
  atas.className = "kad-atas";
  const inisial = document.createElement("span");
  inisial.className = "kad-inisial";
  inisial.setAttribute("aria-hidden", "true");
  inisial.textContent = inisialDari(entri.nama);
  const nombor = document.createElement("span");
  nombor.className = "kad-nombor";
  nombor.textContent = (deckIdx + 1) + " / " + deckIds.length;
  atas.append(inisial, nombor);

  // Teks ucapan (XSS selamat)
  const teks = document.createElement("p");
  teks.className = "kad-teks";
  const span = document.createElement("span");
  span.textContent = entri.ucapan;
  teks.appendChild(span);

  // Baris bawah: nama + butang sayang
  const bawah = document.createElement("div");
  bawah.className = "kad-bawah";
  const nama = document.createElement("p");
  nama.className = "kad-nama";
  nama.textContent = entri.nama || "Tetamu";
  bawah.append(nama, buatSayangBtn());

  kad.append(tSeb, tSet, atas, teks, bawah);
  terapkanDepth(kad, depth);
  return kad;
}

// ====== Render tetingkap 3 kad ======
function setIndex(i) {
  const maks = deckIds.length - 1;
  index = Math.max(0, Math.min(i, maks < 0 ? 0 : maks));
  frontId = deckIds[index] || null;
}

function render(masukDariKiri) {
  timbunan.innerHTML = "";
  // Bina belakang dahulu (z-index urus lapisan)
  for (let depth = 2; depth >= 0; depth--) {
    const deckIdx = index + depth;
    if (deckIdx >= deckIds.length) continue;
    timbunan.appendChild(buatKad(deckIdx, depth));
  }
  const depan = timbunan.querySelector('.swipe-kad[data-depth="0"]');
  if (depan) {
    pasangDrag(depan);
    if (masukDariKiri && !REDUCED.matches) {
      depan.classList.add("swipe-kad--drag");
      depan.style.transform = "translateX(-120%) rotate(-14deg)";
      depan.style.opacity = "0";
      void depan.offsetWidth;                 // paksa reflow
      depan.classList.remove("swipe-kad--drag");
      terapkanDepth(depan, 0);
      depan.style.opacity = "1";
    }
  }
  kemasKemajuan();
  bersihPilKalauSampai();
  lukisSayang();
}

function kemasKemajuan() {
  const jumlah = deckIds.length;
  kemajuanKini.textContent = String(index + 1);
  kemajuanJumlah.textContent = "/ " + jumlah;
  const peratus = jumlah > 1 ? (index / (jumlah - 1)) * 100 : 100;
  kemajuanIsi.style.width = peratus + "%";
  btnSebelum.disabled = index <= 0;
  btnSeterus.disabled = index >= jumlah - 1;
}

// ====== Navigasi ======
function keSeterus() {
  if (isAnimating || index >= deckIds.length - 1) return;
  flingDepan();
}
function keSebelum() {
  if (isAnimating || index <= 0) return;
  if (REDUCED.matches) { setIndex(index - 1); render(false); return; }
  isAnimating = true;
  setIndex(index - 1);
  render(true);
  window.setTimeout(function () { isAnimating = false; cubaTerapTertunggu(); }, 260);
}

// Terbangkan kad depan ke kiri, naikkan kad bawah, lalu render kad berikut.
function flingDepan() {
  const depan = timbunan.querySelector('.swipe-kad[data-depth="0"]');
  if (!depan) return;
  if (REDUCED.matches) { setIndex(index + 1); render(false); return; }
  isAnimating = true;
  depan.classList.remove("swipe-kad--drag");
  depan.style.transform = "translateX(-135%) translateY(20px) rotate(-18deg)";
  depan.style.opacity = "0";
  naikkanBawah();
  window.setTimeout(function () {
    setIndex(index + 1);
    render(false);
    isAnimating = false;
    cubaTerapTertunggu();
  }, 260);
}

function naikkanBawah() {
  const d1 = timbunan.querySelector('.swipe-kad[data-depth="1"]');
  const d2 = timbunan.querySelector('.swipe-kad[data-depth="2"]');
  if (d1) terapkanDepth(d1, 0);
  if (d2) terapkanDepth(d2, 1);
}

// ====== Drag / swipe (Pointer Events, kunci arah supaya tak langgar scroll) ======
// Swipe berjaya dengan DUA cara (mana mana cukup):
//   1) tarik santai melepasi HAD_SWIPE (~48px), atau
//   2) flick pantas pendek (>= FLICK_JARAK dalam <= FLICK_MASA).
// Kunci arah longgar: hanya "menegak" (lepaskan untuk scroll) bila jari JELAS
// menegak; wobble menegak kecil di mula gerakan tidak lagi membunuh swipe.
// Drag boleh bermula DI MANA MANA kad, termasuk atas butang like: kalau ia jadi
// swipe, "like" ditahan (abaikanKlikSayang), kalau ia cuma ketik, like jalan.
function pasangDrag(kad) {
  let mula = null;
  let dragging = false;
  let arah = null;            // null | "mendatar" | "menegak"
  let pointerId = null;
  const tSet = kad.querySelector(".arah-tanda--seterus");
  const tSeb = kad.querySelector(".arah-tanda--sebelum");

  // Adakah (dx,dy) ini mendatar? Serong sehingga ~52deg dikira mendatar supaya
  // jari sebenar (yang jarang lurus) tetap swipe. Hanya jelas menegak = menegak.
  function ufukKah(dx, dy) { return Math.abs(dy) <= Math.abs(dx) * NISBAH_MENEGAK; }

  function turun(e) {
    if (isAnimating) return;
    pointerId = e.pointerId;
    mula = { x: e.clientX, y: e.clientY, t: e.timeStamp || Date.now() };
    dragging = true;
    arah = null;
    dragAktif = true;                        // jari mula pegang kad: kunci rebuild
    // NOTA: tangkapan pointer TIDAK dibuat di sini. Kalau ditangkap seawal
    // pointerdown, browser henti mengecam scroll native untuk SELURUH gesture,
    // jadi scroll menegak pan-y mati (disahkan oleh harness). Kita tangkap HANYA
    // selepas arah dikunci mendatar (jari masih atas kad dalam ~10px pertama).
    dbg("pointerdown x=" + Math.round(e.clientX) + " y=" + Math.round(e.clientY) +
        " ta=" + getComputedStyle(kad).touchAction + " type=" + e.pointerType);
  }

  function gerak(e) {
    if (!dragging || mula === null) return;
    const dx = e.clientX - mula.x;
    const dy = e.clientY - mula.y;

    // Kunci arah hanya lepas gerak bermakna. Menegak menang HANYA bila jelas
    // menegak; selain itu anggap swipe mendatar. Ini biar jari yang mula dengan
    // sedikit gerak menegak (serong) tetap boleh swipe.
    if (arah === null) {
      if (Math.abs(dx) < HAD_ARAH && Math.abs(dy) < HAD_ARAH) return;
      if (!ufukKah(dx, dy)) {
        // Gesture MENEGAK atas kad depan: serah kepada scroll NATIVE (kad
        // touch-action: pan-y). Lepaskan tangkapan pointer supaya browser bebas
        // scroll (tangkapan boleh menghalang pan native), dan kita berhenti heret.
        arah = "menegak";
        dbg("kunci MENEGAK dx=" + Math.round(dx) + " dy=" + Math.round(dy) + " -> scroll native");
        dragging = false;
        dragAktif = false;
        try { kad.releasePointerCapture(pointerId); } catch (err) {}
        return;
      }
      arah = "mendatar";
      kad.classList.add("swipe-kad--drag");
      // PERTAHANAN (pointer hilang): tangkap pointer sekarang, supaya pointermove
      // terus sampai walau jari keluar sempadan kad (elak kad ikut jari separuh
      // jalan pastu berhenti = rasa "lantun"). Fallback senyap kalau tak disokong.
      try { kad.setPointerCapture(pointerId); } catch (err) {}
      dbg("kunci MENDATAR dx=" + Math.round(dx) + " dy=" + Math.round(dy));
    }

    if (arah !== "mendatar") return;

    const rot = dx / 22;
    kad.style.transform = "translate(" + dx + "px, " + (dy * 0.25) + "px) rotate(" + rot + "deg)";
    const kuat = Math.min(Math.abs(dx) / HAD_SWIPE, 1);
    if (dx < 0) { tSet.style.opacity = kuat.toFixed(2); tSeb.style.opacity = "0"; }
    else if (dx > 0) { tSeb.style.opacity = kuat.toFixed(2); tSet.style.opacity = "0"; }
    else { tSet.style.opacity = "0"; tSeb.style.opacity = "0"; }
  }

  // PERTAHANAN UTAMA (Safari iOS + Chromium): `touch-action: none` SAHAJA TIDAK
  // cukup, browser masih hantar `pointercancel` seawal heret mendatar (dibuktikan
  // oleh harness touch sebenar: kad gerak ~23px pastu di-reset = "melantun balik").
  // Sekali gesture ini mendatar, HALANG native pada `touchmove` non-passive; ini
  // yang benar benar hentikan pointercancel + lantunan. Fungsi ini kira arah
  // SENDIRI (tak bergantung pada `arah` yang mungkin belum diset oleh pointermove
  // dalam susunan event Safari), jadi ia selamat merentas pelayar. Menegak dibiar
  // (tiada preventDefault) supaya scroll native pan-y jalan lancar.
  function seedMula(e) {
    if (mula === null && e.touches && e.touches[0]) {
      mula = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: e.timeStamp || Date.now() };
    }
  }
  function touchGerak(e) {
    if (mula === null || arah === "menegak") return;   // menegak: biar scroll
    if (arah === "mendatar") { if (e.cancelable) e.preventDefault(); return; }
    const tt = e.touches && e.touches[0];
    if (!tt) return;
    const dx = tt.clientX - mula.x, dy = tt.clientY - mula.y;
    if (Math.abs(dx) < HAD_ARAH && Math.abs(dy) < HAD_ARAH) return;
    if (ufukKah(dx, dy) && e.cancelable) e.preventDefault();   // mendatar: rampas dari native
  }

  function naik(e) {
    if (mula === null) return;
    const jadiDrag = dragging && arah === "mendatar";
    const dx = e.clientX - mula.x;
    const dt = (e.timeStamp || Date.now()) - mula.t;
    dragging = false;
    mula = null;
    dragAktif = false;                        // jari lepas: buka kunci rebuild
    try { kad.releasePointerCapture(pointerId); } catch (err) {}
    kad.classList.remove("swipe-kad--drag");
    tSet.style.opacity = "0";
    tSeb.style.opacity = "0";
    if (!jadiDrag) { dbg("pointerup TAP/menegak (bukan swipe)"); cubaTerapTertunggu(); return; }

    // Swipe jadi drag: tahan "klik" hantu supaya tidak tersilap cetus like,
    // walaupun jari lepas tepat atas butang like (kes spring-balik).
    abaikanKlikSayang = true;
    window.setTimeout(function () { abaikanKlikSayang = false; }, 0);

    const flickPantas = dt <= FLICK_MASA && Math.abs(dx) >= FLICK_JARAK;
    const cukupJauh = Math.abs(dx) >= HAD_SWIPE;
    const cetus = cukupJauh || flickPantas;
    dbg("pointerup dx=" + Math.round(dx) + " dt=" + Math.round(dt) +
        " -> " + (cetus ? (dx < 0 ? "SETERUS" : "SEBELUM") : "SPRING"));

    if (cetus && dx < 0 && index < deckIds.length - 1) {
      flingDepan();
    } else if (cetus && dx > 0 && index > 0) {
      if (REDUCED.matches) { keSebelum(); cubaTerapTertunggu(); return; }
      isAnimating = true;
      kad.style.transform = "translateX(135%) translateY(20px) rotate(18deg)";
      kad.style.opacity = "0";
      window.setTimeout(function () { setIndex(index - 1); render(true); isAnimating = false; cubaTerapTertunggu(); }, 240);
    } else {
      terapkanDepth(kad, 0);                  // tak cukup jarak/laju: spring balik
    }
    cubaTerapTertunggu();                      // proses snapshot tertunda kalau keadaan dah selamat
  }

  kad.addEventListener("pointerdown", turun);
  kad.addEventListener("pointermove", gerak);
  kad.addEventListener("touchstart", seedMula, { passive: true });
  kad.addEventListener("touchmove", touchGerak, { passive: false });
  kad.addEventListener("pointerup", naik);
  kad.addEventListener("pointercancel", function () {
    // Matlamat: ini TAK sepatutnya berlaku untuk swipe mendatar (touchGerak dah
    // preventDefault). Kalau ia tetap datang (mis. gesture sistem), pulih anggun.
    dbg("POINTERCANCEL arah=" + arah + " (sepatutnya tak jadi utk swipe mendatar)");
    if (dragging) { dragging = false; mula = null; kad.classList.remove("swipe-kad--drag"); terapkanDepth(kad, 0); tSet.style.opacity = "0"; tSeb.style.opacity = "0"; }
    dragAktif = false;                         // gesture dibatalkan: buka kunci rebuild
    cubaTerapTertunggu();
  });
}

// ====== Pil "doa baru masuk" ======
function tunjukPil() {
  if (!pendingBaru || !doaBaruPil) return;
  doaBaruTeks.textContent = (pendingBaru.count === 1 ? "1 doa baru masuk" : pendingBaru.count + " doa baru masuk");
  doaBaruPil.hidden = false;
}
function bersihPil() {
  pendingBaru = null;
  if (doaBaruPil) doaBaruPil.hidden = true;
}
// Bila tetamu sudah sampai / lepasi kad baru itu, pil tak perlu lagi.
function bersihPilKalauSampai() {
  if (!pendingBaru) return;
  const t = deckIds.indexOf(pendingBaru.targetId);
  if (t < 0 || index >= t) bersihPil();
}
if (doaBaruPil) {
  doaBaruPil.addEventListener("click", function () {
    if (!pendingBaru) return;
    const t = deckIds.indexOf(pendingBaru.targetId);
    if (t >= 0) { setIndex(t); render(true); }
    bersihPil();
  });
}

// ====== Grid "Lihat semua" ======
function binaGrid() {
  gridSenarai.innerHTML = "";
  const frag = document.createDocumentFragment();
  dataTerkini.forEach(function (entri) {
    const v = hash(entri.id) % BILANGAN_VARIASI;
    const kad = document.createElement("article");
    kad.className = "grid-kad grid-kad--v" + v;
    kad.dataset.id = entri.id;

    const inisial = document.createElement("span");
    inisial.className = "kad-inisial";
    inisial.setAttribute("aria-hidden", "true");
    inisial.textContent = inisialDari(entri.nama);

    const teks = document.createElement("p");
    teks.className = "grid-teks";
    teks.textContent = entri.ucapan;          // XSS selamat

    const nama = document.createElement("p");
    nama.className = "grid-nama";
    nama.textContent = entri.nama || "Tetamu";

    kad.append(inisial, teks, nama, buatSayangBtn());
    frag.appendChild(kad);
  });
  gridSenarai.appendChild(frag);
  lukisSayang();
}
function gridBuka() { return gridSeksyen.classList.contains("buka"); }
function refreshGridKalauBuka() { if (gridBuka()) binaGrid(); }

if (btnLihatSemua) {
  btnLihatSemua.addEventListener("click", function () {
    binaGrid();
    gridSeksyen.classList.add("buka");
    gridSeksyen.scrollIntoView({ behavior: REDUCED.matches ? "auto" : "smooth", block: "start" });
  });
}
if (btnTutupGrid) {
  btnTutupGrid.addEventListener("click", function () {
    gridSeksyen.classList.remove("buka");
    const arena = document.querySelector(".arena");
    if (arena) arena.scrollIntoView({ behavior: REDUCED.matches ? "auto" : "smooth", block: "center" });
  });
}

// Butang sayang dalam grid (delegasi klik).
if (gridSenarai) {
  gridSenarai.addEventListener("click", function (e) {
    const btn = e.target.closest(".sayang-btn");
    if (!btn) return;
    const kad = btn.closest(".grid-kad");
    if (kad) tekanSayang(kad.dataset.id, btn);
  });
}

// Butang sayang pada kad depan timbunan (delegasi klik).
if (timbunan) {
  timbunan.addEventListener("click", function (e) {
    const btn = e.target.closest(".sayang-btn");
    if (!btn) return;
    e.stopPropagation();
    if (abaikanKlikSayang) { abaikanKlikSayang = false; return; }  // ini ekor swipe, bukan ketik
    const kad = btn.closest(".swipe-kad");
    if (kad) tekanSayang(kad.dataset.id, btn);
  });
}

// ====== Kawalan butang + kekunci ======
btnSeterus.addEventListener("click", keSeterus);
btnSebelum.addEventListener("click", keSebelum);
document.addEventListener("keydown", function (e) {
  if (gridBuka()) return;                     // grid terbuka: jangan cetus timbunan
  if (e.key === "ArrowLeft") keSebelum();
  else if (e.key === "ArrowRight") keSeterus();
});

// Bila tetapan gerak berubah (reduced-motion on/off), render semula supaya
// tingkah laku betul (tiada kilauan/terbang palsu).
REDUCED.addEventListener("change", function () { if (deckIds.length) render(false); });

// ====== Terap data snapshot ke timbunan (tanpa sentak kad semasa) ======
// "Cap jari" data yang DIPAPAR: id + nama + ucapan tiap entri. Kalau cap sama,
// tiada perubahan bermakna pada kad (like dikira oleh listener /sayang secara
// in-place), jadi tak perlu bina semula DOM timbunan langsung.
function tandaData(senarai) {
  let s = "";
  for (let i = 0; i < senarai.length; i++) {
    const e = senarai[i];
    s += e.id + "" + (e.nama || "") + "" + (e.ucapan || "") + "";
  }
  return s;
}

// Kalau ada snapshot yang ditangguh DAN keadaan dah selamat (tiada jari heret,
// tiada animasi terbang), proses ia sekarang. Dipanggil di hujung setiap gesture
// dan setiap animasi.
function cubaTerapTertunggu() {
  if (snapshotTertunggu && !dragAktif && !isAnimating) {
    const s = snapshotTertunggu;
    snapshotTertunggu = null;
    terapkanData(s);
  }
}

function terapkanData(senarai) {
  // FIX "melantun balik": JANGAN bina semula DOM timbunan bila jari tengah heret
  // kad atau semasa animasi terbang. Simpan snapshot terkini, proses lepas siap.
  if (dragAktif || isAnimating) { snapshotTertunggu = senarai; return; }

  // FIX rebuild sia sia: kalau data yang dipapar serupa dengan render terakhir
  // (kes lazim: snapshot cache diikuti snapshot server dengan data sama saat
  // pertama muat), langkau terus. Like count tetap dikemas in-place oleh /sayang.
  const tanda = tandaData(senarai);
  if (sudahMula && tanda === tandaTerakhir) return;
  tandaTerakhir = tanda;

  const baharuIds = senarai.map(function (e) { return e.id; });
  const baharuSet = new Set(baharuIds);
  const pertamaKali = !sudahMula;

  // Kesan ucapan BENAR benar baru (belum pernah dilihat) SEBELUM map dikemas.
  const brandNew = [];
  if (!pertamaKali) {
    senarai.forEach(function (e) { if (!entriMap.has(e.id)) brandNew.push(e.id); });
  }

  // Kemas simpanan pusat
  entriMap = new Map();
  senarai.forEach(function (e) { entriMap.set(e.id, e); });
  dataTerkini = senarai;

  // Keadaan kosong
  if (senarai.length === 0) {
    deckIds = []; index = 0; frontId = null; sudahMula = true;
    timbunan.innerHTML = "";
    timbunanKosong.hidden = false;
    kawalan.hidden = true;
    lihatSemuaBaris.hidden = true;
    gridSeksyen.classList.remove("buka");
    bersihPil();
    lukisKaunter();
    return;
  }
  timbunanKosong.hidden = true;
  kawalan.hidden = false;
  lihatSemuaBaris.hidden = false;

  if (pertamaKali || deckIds.length === 0) {
    // Muat pertama: timbunan = urutan terkini dulu.
    deckIds = baharuIds.slice();
    setIndex(0);
  } else {
    // Buang id yang dah tiada, kekalkan kad depan supaya tak sentak.
    deckIds = deckIds.filter(function (id) { return baharuSet.has(id); });
    let fidx = deckIds.indexOf(frontId);
    if (fidx === -1) fidx = Math.min(index, deckIds.length - 1);
    if (fidx < 0) fidx = 0;
    index = fidx; frontId = deckIds[index] || null;

    // Sisip ucapan baru TEPAT selepas kad semasa (jadi "seterusnya"), newest dulu.
    if (brandNew.length) {
      const sisip = brandNew.filter(function (id) { return deckIds.indexOf(id) === -1; });
      if (sisip.length) {
        Array.prototype.splice.apply(deckIds, [index + 1, 0].concat(sisip));
        pendingBaru = {
          count: (pendingBaru ? pendingBaru.count : 0) + sisip.length,
          targetId: sisip[0]                  // yang paling baru
        };
        tunjukPil();
      }
    }
    // Jaga jaga: mana mana id sedia ada yang tercicir, letak di hujung.
    baharuIds.forEach(function (id) { if (deckIds.indexOf(id) === -1) deckIds.push(id); });
    setIndex(index);
  }

  sudahMula = true;
  render(false);
  lukisKaunter();
  refreshGridKalauBuka();
}

// ====== Sambung Firestore ======
async function mulakanDinding() {
  const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js");
  const {
    getFirestore, collection, onSnapshot, query, orderBy, addDoc, serverTimestamp,
  } = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js");

  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const rujukanRsvp = collection(db, "rsvp");

  dbRujuk = db;
  sayangApi = { collection: collection, addDoc: addDoc, serverTimestamp: serverTimestamp };

  // Listener /sayang: tally ke Map ikut ucapanId, lukis ke semua kad + kaunter.
  onSnapshot(collection(db, "sayang"), function (petikan) {
    sayangKira.clear();
    petikan.forEach(function (d) {
      const id = d.data().ucapanId;
      if (!id) return;
      sayangKira.set(id, (sayangKira.get(id) || 0) + 1);
    });
    lukisSayang();
    lukisKaunter();
  }, function (ralat) {
    console.error("Gagal baca sayang:", ralat);
  });

  // Listener /rsvp: terkini dulu, papar hanya entri yang ada ucapan.
  const soalan = query(rujukanRsvp, orderBy("masa", "desc"));
  onSnapshot(soalan, function (petikan) {
    const senarai = [];
    petikan.forEach(function (dok) {
      const data = dok.data();
      const ucapan = (data.ucapan || "").trim();
      if (!ucapan) return;
      senarai.push({ id: dok.id, nama: data.nama || "Tetamu", ucapan: ucapan });
    });
    terapkanData(senarai);
  }, function (ralat) {
    console.error("Gagal baca ucapan:", ralat);
    timbunan.innerHTML = "";
    timbunanKosong.textContent = "Maaf, ucapan tidak dapat dimuatkan buat masa ini.";
    timbunanKosong.hidden = false;
    kawalan.hidden = true;
    lihatSemuaBaris.hidden = true;
  });
}
