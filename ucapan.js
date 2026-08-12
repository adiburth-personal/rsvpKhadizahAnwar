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

// ====== Tetapan papan ======
const AMBANG_MARQUEE = 5;      // < ni: susun statik (elak nampak pelik bila ucapan sikit)
const MAKS_KAD = 40;           // had kad dianimasi (prestasi phone); baki lama disembunyikan
const BILANGAN_VARIASI = 4;    // v0 krim, v1 blush, v2 plum pudar, v3 emas antik
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

  el.append(inisial, teks, nama);

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
    getFirestore, collection, onSnapshot, query, orderBy,
  } = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js");

  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const rujukanRsvp = collection(db, "rsvp");

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
