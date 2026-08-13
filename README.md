# RSVP Khadizah & Anwar

Mini website jemputan kahwin untuk majlis Khadizah & Anwar, Ahad 30 Ogos 2026 (17 Rabiulawal 1448H), 12:00 tengah hari hingga 6:00 petang. Empat halaman berasingan: laman jemputan utama gaya e-kad (`index.html`, pintu masuk yang disebar), borang pengesahan kehadiran (`rsvp.html`), dinding ucapan langsung (`ucapan.html`), dan papan ringkasan rahsia pengantin (`pengantin.html`). Dilink dari kad jemputan rasmi di Canva lewat butang yang menuju ke root URL (laman jemputan). Halaman tetamu berpaut halus antara satu sama lain (laman jemputan ke borang/ucapan, borang ke ucapan selepas hantar).

Stack: static HTML + CSS + JS tulen (tiada build step, tiada npm), Firebase Firestore lewat CDN modular SDK v10. Direka mobile first sebab 90% tetamu buka dari WhatsApp guna telefon. Dihost di GitHub Pages path bukan root, jadi semua asset guna path relatif.

## Fail

| Fail | Fungsi |
|------|--------|
| `index.html` | Laman jemputan utama (e-kad): kad bentuk telefon, cover, dock navigasi, countdown, buku tetamu, hubungi, lokasi |
| `landing.css` | Stail khas laman jemputan (`index.html`) |
| `landing.js` | Otak laman jemputan (cover, dock, countdown, muzik, buku tetamu) |
| `rsvp.html` | Halaman borang RSVP: header pengantin + borang kehadiran sahaja |
| `app.js` | Otak halaman borang (hantar RSVP) |
| `ucapan.html` | Halaman dinding ucapan langsung sahaja |
| `ucapan.js` | Otak halaman ucapan (papar ucapan langsung, baca sahaja) |
| `pengantin.html` | Halaman rahsia pengantin: ringkasan + senarai penuh |
| `pengantin.js` | Otak halaman pengantin |
| `styles.css` | Stail kongsi semua halaman (tema kraft + maroon) |
| `firebaseConfig.js` | Tetapan sambungan Firebase (isi nilai sebenar di sini) |
| `firestore.rules` | Peraturan keselamatan pangkalan data |

## Langkah setup

### 1. Isi `firebaseConfig.js`

Buka Firebase Console, cipta projek (atau guna sedia ada), tambah satu web app. Salin nilai config, tampal ganti setiap `"GANTI_NANTI"` dalam `firebaseConfig.js`:

```js
export const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "namaProjek.firebaseapp.com",
  projectId: "namaProjek",
  storageBucket: "namaProjek.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abc123",
};
```

Selagi nilai masih `"GANTI_NANTI"`, laman papar notis mesra "Setup belum lengkap" dan borang dimatikan, tak crash.

### 2. Deploy Firestore rules

Buka Firestore Database dalam Firebase Console, pergi tab **Rules**, salin isi `firestore.rules`, tampal, tekan **Publish**.

Atau lewat Firebase CLI:

```bash
firebase deploy --only firestore:rules
```

Rules ni benarkan sesiapa create + read RSVP, tolak update + delete, dan tolak semua collection lain. Ada validasi: nama 1 hingga 80 aksara, status hanya hadir/tidak, pax 0 hingga 10, ucapan maks 1000 aksara.

### 3. Deploy laman ke GitHub Pages

Push repo ke GitHub, aktifkan Pages (Settings, Pages, sumber branch `main`). Laman akan hidup di path bukan root, contoh:

- Laman jemputan utama: `https://adiburth-personal.github.io/rsvpKhadizahAnwar/` (atau `.../index.html`)
- Halaman borang RSVP: `https://adiburth-personal.github.io/rsvpKhadizahAnwar/rsvp.html`
- Halaman dinding ucapan: `https://adiburth-personal.github.io/rsvpKhadizahAnwar/ucapan.html`
- Halaman pengantin: `https://adiburth-personal.github.io/rsvpKhadizahAnwar/pengantin.html?kunci=khadizahAnwar3008x7qz`

## Kunci pengantin

Halaman `pengantin.html` dikunci. Tanpa kunci betul ia papar "Halaman peribadi" dan tak sentuh data.

**Kunci: `khadizahAnwar3008x7qz`**

Pautan penuh pengantin:

```
pengantin.html?kunci=khadizahAnwar3008x7qz
```

Untuk tukar kunci, edit pemalar `KUNCI_PENGANTIN` dalam `pengantin.js`.

> Nota jujur: kunci ni halangan ringan (menyorok pautan), bukan keselamatan sebenar. Firestore rules benarkan sesiapa BACA data RSVP secara teknikal. Untuk majlis peribadi kecil ni memadai. Kalau nak lebih ketat, tambah Firebase Auth pada halaman pengantin di masa depan.

## Skema data

Collection `rsvp`, setiap dokumen:

```
{
  nama:    string (1..80),
  status:  "hadir" | "tidak",
  pax:     number (0..10, 0 kalau tidak hadir),
  ucapan:  string (0..1000),
  masa:    serverTimestamp
}
```

Dinding ucapan papar HANYA entri yang ada `ucapan` tak kosong, tersusun terkini dahulu.
