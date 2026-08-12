# HANDOVER, rsvpKhadizahAnwar

Kemaskini terakhir: 2026-08-13 (sesi Jarvis di agenticOs, kerja sebenar dibuat subagent Opus)

## Apa projek ni
Website RSVP + dinding ucapan untuk majlis kahwin **Khadizah Binti Razali & Muhammad Anwar Bin Sawal**, Ahad **30 Ogos 2026**, 12pm hingga 6pm, ADH Hall KM. Kad jemputan rasmi ada 2: kad Canva kraft (khadizah-anwar-invittation.my.canva.site/ka) dan kad WhatsApp purple gelap. Butang dalam kad Canva DAH ditukar user ke halaman kita (disahkan live 12 Ogos malam).

## Status: SIAP dan LIVE, tapi ada 2 bug terbuka + 1 permintaan design (lihat bawah)

## Seni bina
- **Hosting**: GitHub Pages, repo public `adiburth-personal/rsvpKhadizahAnwar`. Push guna credential helper: repo local config ada 2 entri `credential.https://github.com.helper` (kosong dulu, kemudian `!/Users/adizaini/.local/bin/ghCredentialPersonal`). gh CLI aktif biasanya akaun Dicci, JANGAN switch tanpa pulangkan balik.
- **Data**: Firebase Firestore projek `rsvpkhadizahanwar`, akaun Google **adiburth@gmail.com** (profil "zafri"), Spark percuma, lokasi asia-southeast1. Collection `/rsvp` {nama, status hadir/tidak, pax 0-10, ucapan, masa} dan `/sayang` {ucapanId, masa} (ini rekod "like", nama collection kekal sayang, label UI sahaja "like"). Rules: create + read sahaja, update/delete DITOLAK, validasi penuh, teruji 403.
- **Halaman** (vanilla HTML/CSS/JS, tiada build):
  - `index.html` + `app.js`: borang RSVP (nama, hadir/tidak, pax 1-10, ucapan optional), nama penuh + ADH Hall KM, hero ada krest purple+emas
  - `ucapan.html` + `ucapan.js`: dinding ucapan gaya TIMBUNAN SWIPE (dipilih user dari 3 mockup), kad bertimbun, swipe/anak panah/kekunci, bar X/N, butang like (heart burst), grid "Lihat semua", pil "doa baru masuk", kaunter "N ucapan · M like", ambient motion (zarah emas + latar bernafas + sway kad belakang)
  - `pengantin.html` + `pengantin.js`: papan kiraan RAHSIA. Akses: `pengantin.html?kunci=khadizahAnwar3008x7qz`. Papar entri hadir, JUMLAH PAX, tidak hadir, senarai nama, ucapan
- `firestore.rules` dalam repo = salinan rules yang dah published di console (publish manual lewat console, cara: CodeMirror setValue lewat JS pastu butang Publish)
- Design: base kraft/krim/maroon/emas + aksen purple dari kad rasmi (token disahkan sampel pixel, lihat run timbang 13 Ogos, log `1786551868000_timbangUcapanPurpleInteraktif` dalam agenticOsData/data/runs)

## URL
- Tetamu RSVP: https://adiburth-personal.github.io/rsvpKhadizahAnwar/
- Dinding ucapan: https://adiburth-personal.github.io/rsvpKhadizahAnwar/ucapan.html
- Pengantin (RAHSIA): https://adiburth-personal.github.io/rsvpKhadizahAnwar/pengantin.html?kunci=khadizahAnwar3008x7qz

## BUG TERBUKA (keutamaan sesi seterusnya)

### 1. Swipe reset + skrin scroll ikut (phone sebenar)
User lapor (13 Ogos malam): masa swipe kad di phone, kad bergerak sikit lepas tu MELANTUN BALIK, dan skrin turut scroll atas/bawah masa swipe. NOTA: ini BUKAN bug snapshot-rebuild yang lama (itu dah difix dalam commit `6caaa4e`, teruji, punca: onSnapshot rebuild DOM masa drag). Ini mekanisme LAIN.
**Hipotesis utama belum disahkan**: di sentuhan sebenar (bukan mouse), browser rampas gesture untuk scroll menegak (`touch-action: pan-y` pada timbunan membenarkan scroll), bila browser mula scroll dia hantar `pointercancel`, drag mati separuh jalan = kad lantun balik + page scroll serentak. Arah siasatan: kunci arah awal lebih tegas pada sentuhan, `touch-action: none` pada kad + urus scroll sendiri, atau preventDefault touchmove SELEPAS arah mendatar dikesan. WAJIB uji di alat sentuh sebenar / DevTools touch emulation, bukan mouse (mouse tak hasilkan pointercancel scroll).
Sejarah threshold: HAD_SWIPE 90px→48px + flick >=22px dalam <=260ms + kunci arah dilonggarkan (dy > dx*1.3, gate 10px) dalam commit `f09f1e6`.

### 2. Ambient motion tak nampak (kecuali sway)
User: zarah emas TAK NAMPAK LANGSUNG, latar bernafas TAK NAMPAK, sway kad belakang nampak tapi TERLALU NIPIS. User nak LEBIH OBVIOUS semua.
**Hipotesis**: `.ambient` dan `body::before` berada `z-index: -1`, kemungkinan tersorok DI BELAKANG latar body yang legap. Semak susunan lapisan dulu. Lepas tu naikkan kekuatan: zarah lebih besar/terang/banyak sikit, latar bernafas lebih ketara, sway lebih jelas. Kekangan kekal: compositor-only, prefers-reduced-motion, jangan lalu atas teks, kontras teks kekal >= 4.5:1. Commit ambient: `30a777a`.

## Kerja tertunda lain
- **PADAM DATA UJIAN sebelum sebar**: collection `/rsvp` dan `/sayang` penuh entri ujian user (11 ucapan, belasan like). Bila user kata "padam semua": buka console Firebase (akaun adiburth@gmail.com), Firestore > Data, padam semua doc dalam `/rsvp` dan `/sayang`. Padam lewat console sebab rules tolak delete dari luar. (Cara UI: pilih doc, menu tiga titik, Delete document.)
- GitHub Pages cache ~10 minit; selepas push, uji dengan hard reload / incognito.
- Firebase console tips: rules editor guna CodeMirror, boleh set lewat JS `document.querySelector('.CodeMirror').CodeMirror.setValue(...)`; layout sempit sorok butang Publish, klik baris "unpublished changes" dulu.

## Sejarah commit penting
- `6f78374` bina asal (borang + dinding + rules), `90be819` pecah 3 halaman, `917181a` marquee animasi (DIGANTI), `8ce1fd9` pakej purple + 4 ciri interaktif (run timbang), `36b2835` timbunan swipe ganti marquee, `f09f1e6` like label + kontras teks + swipe thresholds, `6caaa4e` fix spring-back snapshot rebuild, `30a777a` ambient motion (terlalu subtle, bug #2)

## Corak kerja yang terbukti sesi ini (untuk sesi baru)
- Semua kerja tangan → subagent Opus 4.8; browsing/console Firebase → sesi utama guna Chrome tools
- Bug: WAJIB replikasi dulu dalam ujian sebelum fix (dah 2 kali berjaya dengan corak ni)
- Design besar: mockup dulu (3 pilihan), user pilih, baru implement
- Ujian keselamatan rules: curl REST PATCH/DELETE/POST tak sah, jangka 403

## Status
Sistem berfungsi hujung ke hujung dan link Canva dah betul. TUNGGU: fix 2 bug atas, lepas tu padam data ujian, baru sebar. Majlis 30 Ogos, baki ~17 hari.
