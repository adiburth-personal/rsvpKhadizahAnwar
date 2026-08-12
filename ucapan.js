// Logik halaman dinding ucapan: papar ucapan tetamu secara langsung.
//
// APA MAKSUDNYA (bahasa biasa):
// Fail ni "otak" halaman ucapan.html. Ia dengar pangkalan data (Firestore)
// dan tunjuk semua ucapan tetamu secara langsung (auto muncul tanpa refresh),
// yang terkini di atas. Ia HANYA baca, tak hantar apa apa. Borang RSVP
// tinggal di halaman berasingan (index.html + app.js).

import { firebaseConfig, konfigurasiBelumSiap } from "./firebaseConfig.js";

// Rujukan elemen halaman
const notisSetup = document.getElementById("notisSetup");
const ucapanSenarai = document.getElementById("ucapanSenarai");
const ucapanKosong = document.getElementById("ucapanKosong");

// Selamatkan input tetamu supaya tag HTML tak boleh disuntik (elak XSS).
// Kita tukar aksara berbahaya jadi versi teks biasa.
function selamatkanTeks(teks) {
  const div = document.createElement("div");
  div.textContent = teks == null ? "" : String(teks);
  return div.innerHTML;
}

// ====== Mod setup belum siap ======
// Kalau tetapan Firebase masih placeholder, papar notis mesra dan jangan
// cuba sambung (elak error mentah / crash).
if (konfigurasiBelumSiap(firebaseConfig)) {
  notisSetup.classList.add("tunjuk");
  ucapanKosong.textContent = "Dinding ucapan akan aktif sebaik sahaja tetapan Firebase diisi.";
} else {
  mulakanDinding();
}

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
    const kad = [];
    petikan.forEach(function (dok) {
      const data = dok.data();
      const ucapan = (data.ucapan || "").trim();
      if (!ucapan) return; // langkau entri tanpa ucapan
      kad.push(
        '<article class="ucapan-kad">' +
          '<p class="ucapan-teks">' + selamatkanTeks(ucapan) + "</p>" +
          '<p class="ucapan-nama">' + selamatkanTeks(data.nama || "Tetamu") + "</p>" +
        "</article>"
      );
    });

    if (kad.length === 0) {
      ucapanSenarai.innerHTML = "";
      ucapanKosong.style.display = "block";
    } else {
      ucapanKosong.style.display = "none";
      ucapanSenarai.innerHTML = kad.join("");
    }
  }, function (ralat) {
    console.error("Gagal baca ucapan:", ralat);
    ucapanKosong.textContent = "Maaf, ucapan tidak dapat dimuatkan buat masa ini.";
    ucapanKosong.style.display = "block";
  });
}
