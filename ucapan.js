// Logik halaman dinding ucapan: papar ucapan tetamu secara langsung, HIDUP.
//
// APA MAKSUDNYA (bahasa biasa):
// Fail ni "otak" halaman ucapan.html. Ia dengar pangkalan data (Firestore)
// dan tunjuk semua ucapan tetamu secara langsung (auto muncul tanpa refresh),
// yang terkini di atas. Ia HANYA baca, tak hantar apa apa. Borang RSVP
// tinggal di halaman berasingan (index.html + app.js).
//
// Papan ini "hidup": kad ucapan hanyut naik perlahan (marquee dua lajur),
// sentuh/hover henti untuk baca, dan kad baru masuk dengan kilauan emas.
// Semua GERAK diuruskan oleh CSS (transform/opacity), bukan gelung JS berat,
// supaya lancar dan jimat bateri di telefon.

import { firebaseConfig, konfigurasiBelumSiap } from "./firebaseConfig.js";

// Rujukan elemen halaman
const notisSetup = document.getElementById("notisSetup");
const ucapanSenarai = document.getElementById("ucapanSenarai");
const ucapanKosong = document.getElementById("ucapanKosong");
const dindingNota = document.getElementById("dindingNota");
const dindingKaunter = document.getElementById("dindingKaunter");

// Overlay fokus baca (tap kad -> kad besar pegun)
const fokusOverlay = document.getElementById("fokusOverlay");
const fokusKad = document.getElementById("fokusKad");
const fokusTutup = document.getElementById("fokusTutup");
const fokusInisial = document.getElementById("fokusInisial");
const fokusTeks = document.getElementById("fokusTeks");
const fokusNama = document.getElementById("fokusNama");
const fokusSayang = document.getElementById("fokusSayang");

// ====== Tetapan papan ======
const AMBANG_MARQUEE = 5;      // < ni: susun statik (elak nampak pelik bila ucapan sikit)
const MAKS_KAD = 40;           // had kad dianimasi (prestasi phone); baki lama disembunyikan
const BILANGAN_VARIASI = 5;    // v0 krim, v1 blush, v2 plum pudar, v3 emas antik, v4 aubergine gelap (1 dalam 5)
const BP_DUA_LAJUR = "(min-width: 560px)"; // WAJIB selari dengan breakpoint CSS
const SESAAT_LAJUR_A = 7.2;    // saat per kad, lajur A
const SESAAT_LAJUR_B = 8.4;    // lajur B sikit lebih perlahan = rasa organik
const DURASI_MIN = 42;         // saat: elak loop terlalu laju bila kad sikit

const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)");
const MEDIA_DUA_LAJUR = window.matchMedia(BP_DUA_LAJUR);

// KESELAMATAN XSS (WAJIB): semua teks tetamu dimasukkan lewat `.textContent`,
// BUKAN `.innerHTML`. Dengan textContent, sebarang tag HTML dalam input tetamu
// dipapar sebagai teks biasa dan mustahil dilaksana. Ini cara escape paling
// selamat, menggantikan cara lama (gabung string + escape manual).

// ====== Mod setup belum siap ======
if (konfigurasiBelumSiap(firebaseConfig)) {
  notisSetup.classList.add("tunjuk");
  ucapanKosong.textContent = "Dinding ucapan akan aktif sebaik sahaja tetapan Firebase diisi.";
} else {
  mulakanDinding();
}

// ====== Keadaan papan (diingat antara snapshot) ======
let mode = "kosong";           // "kosong" | "statik" | "marquee"
let idDipapar = [];            // urutan id kad semasa (terkini dulu)
let lajurEls = [];             // [{ copies: [copy1, copy2] }, ...] rujukan salinan tiap lajur
let dataTerkini = [];          // simpanan senarai penuh terakhir (utk bina semula bila layout tukar)

// ====== Keadaan "sayang" (butang kasih pada setiap kad) ======
// Count disimpan di Map PUSAT (bukan pada node DOM) sebab tiap kad wujud 2 salinan
// dalam marquee (copy1 + copy2); dua duanya dilukis dari Map yang sama supaya
// count sentiasa selari. Ditulis semula setiap render + setiap snapshot /sayang.
const KUNCI_SAYANG = "sayangDitekan.v1";   // camelCase, tiada dash
const sayangKira = new Map();               // ucapanId -> jumlah sayang (nombor sebenar)
let dbRujuk = null;                         // rujukan Firestore, diisi dalam mulakanDinding
let sayangApi = null;                       // { collection, addDoc, serverTimestamp }
let fokusId = null;                         // id kad yang sedang dibuka dalam overlay
let fokusPemulang = null;                   // elemen untuk pulang fokus bila overlay tutup

// Anti-spam ringan (localStorage). NOTA JUJUR: ini cuma halang tekan berganda
// pada peranti + browser yang SAMA. Ia BOLEH dipintas (clear storage, phone lain,
// mod incognito). Tanpa auth, mustahil kunci "satu orang satu sayang" betul betul.
// Untuk majlis kahwin ini OK , butang = luahan kasih, bukan undian rasmi.
function bacaSayang() {
  try { return new Set(JSON.parse(localStorage.getItem(KUNCI_SAYANG) || "[]")); }
  catch (e) { return new Set(); }
}
function sudahSayang(id) { return bacaSayang().has(id); }
function tandaSayang(id) {
  const s = bacaSayang(); s.add(id);
  try { localStorage.setItem(KUNCI_SAYANG, JSON.stringify([...s])); } catch (e) { /* penuh/disekat: abai */ }
}
function buangTandaSayang(id) {
  const s = bacaSayang(); s.delete(id);
  try { localStorage.setItem(KUNCI_SAYANG, JSON.stringify([...s])); } catch (e) { /* abai */ }
}

// Lukis satu butang sayang (count + keadaan + aria) daripada Map pusat.
function hiasSayangBtn(btn, id) {
  if (!btn || !id) return;
  const n = sayangKira.get(id) || 0;
  const span = btn.querySelector(".sayang-kira");
  if (span) span.textContent = n > 0 ? String(n) : "";   // 0 = kosong, degrade elok
  const ditekan = sudahSayang(id);
  btn.classList.toggle("is-sayang", ditekan);
  btn.setAttribute("aria-pressed", ditekan ? "true" : "false");
  btn.setAttribute("aria-label",
    "Sayang ucapan ini" + (n > 0 ? ", " + n + " orang sudah sayang" : ""));
}

// Lukis count ke SEMUA kad (kedua dua salinan marquee) + overlay bila terbuka.
function lukisSayang() {
  document.querySelectorAll(".ucapan-kad").forEach(function (kad) {
    hiasSayangBtn(kad.querySelector(".sayang-btn"), kad.dataset.id);
  });
  if (fokusId) hiasSayangBtn(fokusSayang, fokusId);
}

// Kaunter jujur di kepala dinding: "X ucapan · Y sayang" , 100% data sebenar.
function lukisKaunter() {
  if (!dindingKaunter) return;
  const nUcap = dataTerkini.length;
  if (nUcap === 0) { dindingKaunter.hidden = true; return; }
  let nSayang = 0; sayangKira.forEach(function (v) { nSayang += v; });
  dindingKaunter.hidden = false;
  dindingKaunter.textContent = nUcap + " ucapan" + (nSayang > 0 ? " · " + nSayang + " sayang" : "");
}

// Heart-burst: 4-6 hati kecil naik + pudar dari butang. CSS transform sahaja,
// node auto-buang. Gated pada reduced-motion (terus di-skip bila diminta).
function hatiBurst(btn) {
  if (REDUCED.matches || !btn) return;
  for (let i = 0; i < 5; i++) {
    const h = document.createElement("span");
    h.className = "hati-timbul";
    h.textContent = "♥";                 // hati (textContent, bukan innerHTML)
    h.setAttribute("aria-hidden", "true");
    h.style.setProperty("--dx", (Math.random() * 40 - 20) + "px");
    btn.appendChild(h);
    window.setTimeout(function () { h.remove(); }, 850);
  }
}

// Tekan sayang: optimistik (terus nampak) + rollback jujur bila addDoc gagal.
async function tekanSayang(id, sumberBtn) {
  if (!id || sudahSayang(id)) return;
  if (!dbRujuk || !sayangApi) return;         // config belum siap: abai senyap
  tandaSayang(id);                            // simpan localStorage dulu
  sayangKira.set(id, (sayangKira.get(id) || 0) + 1);
  lukisSayang();                              // optimistik
  lukisKaunter();
  hatiBurst(sumberBtn);
  try {
    await sayangApi.addDoc(
      sayangApi.collection(dbRujuk, "sayang"),
      { ucapanId: id, masa: sayangApi.serverTimestamp() }
    );
  } catch (err) {
    console.error("Gagal hantar sayang:", err);
    buangTandaSayang(id);                      // undur bila gagal (jujur)
    sayangKira.set(id, Math.max(0, (sayangKira.get(id) || 1) - 1));
    lukisSayang();
    lukisKaunter();
  }
}

// ====== Overlay fokus baca ======
function bukaFokus(id) {
  if (!fokusOverlay) return;
  const entri = dataTerkini.find(function (e) { return e.id === id; });
  if (!entri) return;
  fokusId = id;
  const huruf = (entri.nama || "T").trim().charAt(0).toUpperCase();
  fokusInisial.textContent = huruf || "T";
  fokusTeks.textContent = entri.ucapan;       // escape XSS
  fokusNama.textContent = entri.nama || "Tetamu";
  hiasSayangBtn(fokusSayang, id);
  fokusPemulang = document.activeElement;
  fokusOverlay.hidden = false;
  // paksa reflow supaya transisi opacity berjalan
  void fokusOverlay.offsetWidth;
  fokusOverlay.classList.add("buka");
  document.body.style.overflow = "hidden";    // kunci scroll belakang
  document.querySelectorAll(".marquee-tingkap").forEach(function (t) { t.classList.add("is-pause"); });
  // Pindah fokus ke butang tutup SELEPAS kitaran klik selesai (setTimeout 0):
  // gaya .buka (visibility:visible) sudah diterap dan tiada "focus fixup" klik
  // yang menarik balik fokus ke body. Butang tutup = sasaran fokus jelas untuk
  // pembaca skrin + navigasi papan kekunci (Escape/Tab).
  if (fokusTutup && typeof fokusTutup.focus === "function") {
    window.setTimeout(function () { fokusTutup.focus(); }, 0);
  }
}
function tutupFokus() {
  if (!fokusOverlay || fokusOverlay.hidden) return;
  fokusOverlay.classList.remove("buka");
  document.body.style.overflow = "";
  document.querySelectorAll(".marquee-tingkap").forEach(function (t) { t.classList.remove("is-pause"); });
  fokusId = null;
  const selesai = function () {
    fokusOverlay.hidden = true;
    fokusOverlay.removeEventListener("transitionend", selesai);
  };
  fokusOverlay.addEventListener("transitionend", selesai);
  // Sandaran bila transisi dimatikan (reduced-motion): sembunyi terus.
  window.setTimeout(function () { if (!fokusOverlay.classList.contains("buka")) fokusOverlay.hidden = true; }, 400);
  if (fokusPemulang && typeof fokusPemulang.focus === "function") fokusPemulang.focus();
  fokusPemulang = null;
}

// Pasang interaksi kad (delegasi klik) + kawalan overlay. Dipanggil sekali.
function pasangInteraksi() {
  if (ucapanSenarai) {
    ucapanSenarai.addEventListener("click", function (e) {
      const btn = e.target.closest(".sayang-btn");
      if (btn) {
        e.stopPropagation();
        const kad = btn.closest(".ucapan-kad");
        if (kad) tekanSayang(kad.dataset.id, btn);
        return;
      }
      const kad = e.target.closest(".ucapan-kad");
      if (kad) bukaFokus(kad.dataset.id);
    });
  }
  if (fokusSayang) {
    fokusSayang.addEventListener("click", function () {
      if (fokusId) tekanSayang(fokusId, fokusSayang);
    });
  }
  if (fokusTutup) fokusTutup.addEventListener("click", tutupFokus);
  if (fokusOverlay) {
    fokusOverlay.addEventListener("click", function (e) {
      if (e.target === fokusOverlay) tutupFokus();   // tap latar = tutup
    });
  }
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") tutupFokus();
  });
}
pasangInteraksi();

// Hash kecil (djb2) untuk keputusan deterministik (warna + agihan lajur).
function hash(teks) {
  let h = 5381;
  for (let i = 0; i < teks.length; i++) h = ((h << 5) + h + teks.charCodeAt(i)) >>> 0;
  return h;
}

// Bina satu elemen kad ucapan (selamat XSS: guna textContent).
function binaKad(entri, baru) {
  const el = document.createElement("article");
  const v = hash(entri.id) % BILANGAN_VARIASI;
  el.className = "ucapan-kad ucapan-kad--v" + v + (baru ? " ucapan-kad--baru" : "");
  el.dataset.id = entri.id;

  const inisial = document.createElement("span");
  inisial.className = "ucapan-inisial";
  inisial.setAttribute("aria-hidden", "true");
  const huruf = (entri.nama || "T").trim().charAt(0).toUpperCase();
  inisial.textContent = huruf || "T";

  const teks = document.createElement("p");
  teks.className = "ucapan-teks";
  teks.textContent = entri.ucapan;            // escape XSS

  const nama = document.createElement("p");
  nama.className = "ucapan-nama";
  nama.textContent = entri.nama || "Tetamu";  // escape XSS

  // Butang sayang (menumpang kad supaya ikut diff-engine). Count diisi kemudian
  // oleh lukisSayang() daripada Map pusat, bukan sekali masa bina.
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "sayang-btn";
  const hati = document.createElement("span");
  hati.className = "sayang-hati";
  hati.setAttribute("aria-hidden", "true");
  hati.textContent = "♥";                      // hati, bukan innerHTML
  const kira = document.createElement("span");
  kira.className = "sayang-kira";              // diisi oleh lukisSayang (textContent)
  btn.append(hati, kira);

  el.append(inisial, teks, nama, btn);

  // Buang kelas kilauan lepas ia habis supaya tak main semula bila reflow.
  if (baru) window.setTimeout(function () { el.classList.remove("ucapan-kad--baru"); }, 2000);
  return el;
}

// Susun statik (grid kemas): dipakai bila ucapan sikit / reduced-motion.
function binaStatik(dipapar) {
  const lama = new Set(idDipapar);
  const adaSebelum = idDipapar.length > 0;
  ucapanSenarai.className = "ucapan-senarai ucapan-senarai--statik";
  ucapanSenarai.innerHTML = "";
  const frag = document.createDocumentFragment();
  dipapar.forEach(function (e) {
    frag.appendChild(binaKad(e, adaSebelum && !lama.has(e.id)));
  });
  ucapanSenarai.appendChild(frag);
}

// Pasang henti-bila-sentuh (hover di desktop diuruskan CSS).
function pasangPause(tingkap) {
  const henti = function () { tingkap.classList.add("is-pause"); };
  const sambung = function () { tingkap.classList.remove("is-pause"); };
  tingkap.addEventListener("touchstart", henti, { passive: true });
  tingkap.addEventListener("touchend", sambung, { passive: true });
  tingkap.addEventListener("touchcancel", sambung, { passive: true });
}

// Bina papan marquee. Setiap lajur = satu track dengan DUA salinan kad,
// dianimasikan translateY(0 -> -50%): sebab dua salinan sama, -50% = tepat
// satu salinan, jadi loop mulus tanpa sentakan. Pulang true bila berjaya,
// false bila kandungan terlalu pendek (undur ke statik supaya tiada ruang kosong).
function binaMarquee(dipapar) {
  const lama = new Set(idDipapar);
  const adaSebelum = idDipapar.length > 0;
  const bilLajur = MEDIA_DUA_LAJUR.matches ? 2 : 1;

  ucapanSenarai.className = "ucapan-senarai ucapan-senarai--marquee";
  ucapanSenarai.innerHTML = "";

  const tingkap = document.createElement("div");
  tingkap.className = "marquee-tingkap";

  // Agih kad ke lajur ikut hash id (stabil): kad tak pernah lompat lajur.
  const kumpulan = [];
  for (let i = 0; i < bilLajur; i++) kumpulan.push([]);
  dipapar.forEach(function (e) { kumpulan[hash(e.id) % bilLajur].push(e); });

  lajurEls = [];
  kumpulan.forEach(function (kads, i) {
    const kolum = document.createElement("div");
    kolum.className = "marquee-kolum";

    const track = document.createElement("div");
    track.className = "marquee-track";
    const sesaat = i === 0 ? SESAAT_LAJUR_A : SESAAT_LAJUR_B;
    track.style.setProperty("--marquee-dur", Math.max(DURASI_MIN, kads.length * sesaat) + "s");

    const copy1 = document.createElement("div");
    copy1.className = "marquee-copy";
    const copy2 = document.createElement("div");
    copy2.className = "marquee-copy";
    copy2.setAttribute("aria-hidden", "true"); // elak pembaca skrin baca dua kali

    kads.forEach(function (e) {
      const baru = adaSebelum && !lama.has(e.id);
      copy1.appendChild(binaKad(e, baru));
      copy2.appendChild(binaKad(e, baru));
    });

    track.append(copy1, copy2);
    kolum.appendChild(track);
    tingkap.appendChild(kolum);
    lajurEls.push({ copies: [copy1, copy2] });
  });

  pasangPause(tingkap);
  ucapanSenarai.appendChild(tingkap);

  // Sahkan setiap lajur cukup tinggi untuk loop penuh tanpa ruang kosong.
  // Kalau tidak, undur ke susun statik (kekal kemas untuk ucapan sikit).
  const tinggiTingkap = tingkap.clientHeight;
  const cukup = lajurEls.every(function (l) {
    const h = l.copies[0].offsetHeight;
    return h === 0 ? true : h >= tinggiTingkap * 0.95;
  });
  if (!cukup) {
    binaStatik(dipapar);
    return false;
  }
  return true;
}

// Kemas marquee TANPA bina semula (elak sentakan / ganggu bacaan kad lain):
// buang id yang hilang, prepend id baharu di atas dengan kilauan emas.
function kemasMarquee(dipapar) {
  const baharuSet = new Set(dipapar.map(function (e) { return e.id; }));
  const lamaSet = new Set(idDipapar);
  const bilLajur = lajurEls.length;

  // Buang id yang tiada lagi (jarang: cth ucapan dipadam / tolak keluar had 40).
  idDipapar.forEach(function (id) {
    if (!baharuSet.has(id)) {
      lajurEls.forEach(function (l) {
        l.copies.forEach(function (c) {
          Array.prototype.slice.call(c.children).forEach(function (n) {
            if (n.dataset.id === id) n.remove();
          });
        });
      });
    }
  });

  // Tambah id baharu (terkini dulu). Prepend dari yang paling lama antara yang
  // baharu supaya kad paling terkini berakhir di paling atas.
  const tambah = dipapar.filter(function (e) { return !lamaSet.has(e.id); });
  tambah.reverse().forEach(function (e) {
    const l = lajurEls[hash(e.id) % bilLajur];
    if (!l) return;
    l.copies.forEach(function (c) {
      c.insertBefore(binaKad(e, true), c.firstChild);
    });
  });

  idDipapar = dipapar.map(function (e) { return e.id; });
}

// Papar semula ikut keadaan data terkini.
function render(senarai) {
  dataTerkini = senarai;

  if (senarai.length === 0) {
    ucapanSenarai.innerHTML = "";
    ucapanSenarai.className = "ucapan-senarai";
    ucapanKosong.style.display = "block";
    if (dindingNota) dindingNota.hidden = true;
    mode = "kosong";
    idDipapar = [];
    lukisKaunter();
    return;
  }
  ucapanKosong.style.display = "none";

  const dipapar = senarai.slice(0, MAKS_KAD);
  const gerakBoleh = !REDUCED.matches && dipapar.length >= AMBANG_MARQUEE;
  const modeMahu = gerakBoleh ? "marquee" : "statik";

  if (modeMahu !== mode) {
    let jadi = modeMahu;
    if (modeMahu === "marquee") {
      if (!binaMarquee(dipapar)) jadi = "statik"; // undur bila kandungan pendek
    } else {
      binaStatik(dipapar);
    }
    mode = jadi;
    idDipapar = dipapar.map(function (e) { return e.id; });
  } else if (mode === "statik") {
    binaStatik(dipapar);            // kad sikit: bina semula murah
    idDipapar = dipapar.map(function (e) { return e.id; });
  } else {
    kemasMarquee(dipapar);          // marquee: diff sahaja, tiada sentakan
  }

  if (dindingNota) dindingNota.hidden = mode !== "marquee";

  // WAJIB di HUJUNG render: lukis count ke node yang baru di-prepend/bina supaya
  // kad baharu terus dapat count betul (bukan tunggu snapshot /sayang seterusnya).
  lukisSayang();
  lukisKaunter();
}

// Bila layout berubah (putar phone lebar<->sempit, atau tukar tetapan gerak),
// paksa bina semula supaya bilangan lajur / mod betul. Kad sedia ada tak
// ditanda "baru" (tiada kilauan palsu) sebab id kekal dalam idDipapar.
function paksaBinaSemula() {
  mode = "reset";
  render(dataTerkini);
}
MEDIA_DUA_LAJUR.addEventListener("change", paksaBinaSemula);
REDUCED.addEventListener("change", paksaBinaSemula);

async function mulakanDinding() {
  // Import SDK Firebase modular v10 terus dari CDN (tiada build step).
  const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js");
  const {
    getFirestore, collection, onSnapshot, query, orderBy, addDoc, serverTimestamp,
  } = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js");

  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const rujukanRsvp = collection(db, "rsvp");

  // Sediakan rujukan Firestore untuk butang sayang (create-only /sayang).
  dbRujuk = db;
  sayangApi = { collection: collection, addDoc: addDoc, serverTimestamp: serverTimestamp };

  // Listener kedua: baca SELURUH /sayang (tanpa where -> tiada composite index),
  // tally ke Map ikut ucapanId, lukis ke semua kad + kaunter. Saiz terhad utk
  // satu majlis (ratusan hati) jadi memadai.
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

  // onSnapshot: setiap kali data berubah, papar semula. orderBy masa desc =
  // ucapan terbaru di atas. Kita papar HANYA entri yang ada ucapan.
  const soalan = query(rujukanRsvp, orderBy("masa", "desc"));
  onSnapshot(soalan, function (petikan) {
    const senarai = [];
    petikan.forEach(function (dok) {
      const data = dok.data();
      const ucapan = (data.ucapan || "").trim();
      if (!ucapan) return; // langkau entri tanpa ucapan
      senarai.push({ id: dok.id, nama: data.nama || "Tetamu", ucapan: ucapan });
    });
    render(senarai);
  }, function (ralat) {
    console.error("Gagal baca ucapan:", ralat);
    ucapanKosong.textContent = "Maaf, ucapan tidak dapat dimuatkan buat masa ini.";
    ucapanKosong.style.display = "block";
    if (dindingNota) dindingNota.hidden = true;
  });
}
