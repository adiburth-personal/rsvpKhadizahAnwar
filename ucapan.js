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
const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)");

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
  mulakanDinding();
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
  dindingKaunter.textContent = nUcap + " ucapan" + (nSayang > 0 ? " · " + nSayang + " like" : "");
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
  window.setTimeout(function () { isAnimating = false; }, 260);
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

  function turun(e) {
    if (isAnimating) return;
    pointerId = e.pointerId;
    mula = { x: e.clientX, y: e.clientY, t: e.timeStamp || Date.now() };
    dragging = true;
    arah = null;
  }

  function gerak(e) {
    if (!dragging || mula === null) return;
    const dx = e.clientX - mula.x;
    const dy = e.clientY - mula.y;

    // Kunci arah hanya lepas gerak bermakna. Menegak menang HANYA bila jelas
    // menegak (dy > dx * 1.3); selain itu anggap swipe mendatar. Ini biar jari
    // yang mula dengan sedikit gerak menegak tetap boleh swipe.
    if (arah === null) {
      if (Math.abs(dx) < HAD_ARAH && Math.abs(dy) < HAD_ARAH) return;
      if (Math.abs(dy) > Math.abs(dx) * 1.3) { arah = "menegak"; dragging = false; return; }
      arah = "mendatar";
      kad.classList.add("swipe-kad--drag");
      try { kad.setPointerCapture(pointerId); } catch (err) {}
    }
    if (arah !== "mendatar") return;

    const rot = dx / 22;
    kad.style.transform = "translate(" + dx + "px, " + (dy * 0.25) + "px) rotate(" + rot + "deg)";
    const kuat = Math.min(Math.abs(dx) / HAD_SWIPE, 1);
    if (dx < 0) { tSet.style.opacity = kuat.toFixed(2); tSeb.style.opacity = "0"; }
    else if (dx > 0) { tSeb.style.opacity = kuat.toFixed(2); tSet.style.opacity = "0"; }
    else { tSet.style.opacity = "0"; tSeb.style.opacity = "0"; }
  }

  function naik(e) {
    if (mula === null) return;
    const jadiDrag = dragging && arah === "mendatar";
    const dx = e.clientX - mula.x;
    const dt = (e.timeStamp || Date.now()) - mula.t;
    dragging = false;
    mula = null;
    try { kad.releasePointerCapture(pointerId); } catch (err) {}
    kad.classList.remove("swipe-kad--drag");
    tSet.style.opacity = "0";
    tSeb.style.opacity = "0";
    if (!jadiDrag) return;

    // Swipe jadi drag: tahan "klik" hantu supaya tidak tersilap cetus like,
    // walaupun jari lepas tepat atas butang like (kes spring-balik).
    abaikanKlikSayang = true;
    window.setTimeout(function () { abaikanKlikSayang = false; }, 0);

    const flickPantas = dt <= FLICK_MASA && Math.abs(dx) >= FLICK_JARAK;
    const cukupJauh = Math.abs(dx) >= HAD_SWIPE;
    const cetus = cukupJauh || flickPantas;

    if (cetus && dx < 0 && index < deckIds.length - 1) {
      flingDepan();
    } else if (cetus && dx > 0 && index > 0) {
      if (REDUCED.matches) { keSebelum(); return; }
      isAnimating = true;
      kad.style.transform = "translateX(135%) translateY(20px) rotate(18deg)";
      kad.style.opacity = "0";
      window.setTimeout(function () { setIndex(index - 1); render(true); isAnimating = false; }, 240);
    } else {
      terapkanDepth(kad, 0);                  // tak cukup jarak/laju: spring balik
    }
  }

  kad.addEventListener("pointerdown", turun);
  kad.addEventListener("pointermove", gerak);
  kad.addEventListener("pointerup", naik);
  kad.addEventListener("pointercancel", function () {
    if (dragging) { dragging = false; mula = null; kad.classList.remove("swipe-kad--drag"); terapkanDepth(kad, 0); tSet.style.opacity = "0"; tSeb.style.opacity = "0"; }
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
function terapkanData(senarai) {
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
