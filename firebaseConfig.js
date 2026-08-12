// Tetapan sambungan Firebase untuk laman RSVP Khadizah & Anwar.
//
// APA MAKSUDNYA (bahasa biasa):
// Fail ni macam "alamat rumah" pangkalan data. Kod perlu tahu nak hantar
// dan baca data RSVP di mana. Selagi nilai di bawah masih "GANTI_NANTI",
// laman akan papar notis mesra "Setup belum lengkap" dan borang tak aktif,
// bukan crash.
//
// LANGKAH ISI (rujuk README.md):
// 1. Buka Firebase Console, pilih projek, Project settings, bahagian "Your apps".
// 2. Salin nilai config web app, tampal ganti setiap "GANTI_NANTI" di bawah.
// 3. Simpan fail ni, muat semula laman.

export const firebaseConfig = {
  apiKey: "GANTI_NANTI",
  authDomain: "GANTI_NANTI",
  projectId: "GANTI_NANTI",
  storageBucket: "GANTI_NANTI",
  messagingSenderId: "GANTI_NANTI",
  appId: "GANTI_NANTI",
};

// Pengesan placeholder: kalau mana mana nilai penting masih "GANTI_NANTI",
// kita anggap setup belum siap. Kod lain guna fungsi ni untuk papar notis
// mesra dan elak cuba sambung ke Firebase yang tak wujud.
export function konfigurasiBelumSiap(config) {
  const nilaiWajib = [config.apiKey, config.projectId, config.appId];
  return nilaiWajib.some(function (nilai) {
    return !nilai || String(nilai).trim() === "" || String(nilai).includes("GANTI_NANTI");
  });
}
