# HANDOVER, rsvpKhadizahAnwar

Kemaskini terakhir: 2026-08-13 (sesi Jarvis di agenticOs, kerja sebenar dibuat subagent Opus)

## Apa projek ni
Website RSVP + dinding ucapan untuk majlis kahwin **Khadizah Binti Razali & Muhammad Anwar Bin Sawal**, Ahad **30 Ogos 2026**, 12pm hingga 6pm, ADH Hall KM. Kad jemputan rasmi ada 2: kad Canva kraft (khadizah-anwar-invittation.my.canva.site/ka) dan kad WhatsApp purple gelap. Butang dalam kad Canva DAH ditukar user ke halaman kita (disahkan live 12 Ogos malam).

## Status: SIAP dan LIVE. 2 bug lama DAH DIFIX (13 Ogos), tunggu pengesahan user di phone sebenar, lepas tu padam data ujian dan sebar

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

## BUG LAMA, DAH DIFIX 13 Ogos (tunggu pengesahan user di phone)

### 1. Swipe reset + skrin scroll ikut (phone sebenar), FIX commit `799673c`
Punca disahkan (replikasi harness Node dengan urutan pointer event sebenar): kad depan guna `touch-action: pan-y`, jadi bila swipe ada hanyutan menegak sedikit (biasa di phone), browser rampas gesture untuk scroll dan hantar `pointercancel`, drag mati separuh jalan = kad lantun balik + page scroll serentak. Ini mekanisme LAIN dari bug snapshot-rebuild `6caaa4e` (fix itu kekal).
Fix: kad depan `.swipe-kad[data-depth="0"]` diberi `touch-action: none`; dalam `pasangDrag`, bila kunci arah jadi "menegak" pada sentuhan/pen, scroll diurus manual `window.scrollBy` ikut jari. Mouse desktop kekal tingkah laku lama (gated `pointerType === "mouse"`). Threshold kekal (HAD_SWIPE 48px, flick >=22px/<=260ms, gate arah 10px).
Yang user perlu uji di phone: swipe kiri/kanan termasuk serong (tiada lantun, page tak scroll), scroll menegak mula atas kad (page scroll biasa), like tap masih jalan, desktop tiada regresi.

### 2. Ambient motion tak nampak, FIX `9030d96` kemudian DIROMBAK `44949d5` (bunga purple)
Punca asal disahkan: BUKAN tersorok z-index, tapi kontras + kekuatan terlalu rendah (emas vs kraft beza terang cuma 8%). Fix pertama `9030d96` naikkan bokeh emas cerah, tapi user tolak premis tu: background kraft dah cerah, elemen cerah atas cerah tak menonjol.
Rombakan `44949d5` ikut arahan user: bokeh emas DIGANTI 15 bunga kecil 5 kelopak purple (SVG mask + background-color), 4 ton variant dari band hue kad rasmi (`--bunga-deep/mid/bright/rose`, oklch 40%/52%/63%/67%), saiz kecil kekal, hanyut naik + putaran halus. Latar bernafas glow cerah DIBUANG, ganti tint purple sangat lembut. Sway kad belakang kekal (±1.5deg dari 9030d96). Token glow lama dibuang.
Kontras dijaga: had opacity per ton dikira supaya teks atas bunga kekal >= 4.5:1 (nilai `--op` sengaja bawah siling; deep <=0.18, mid <=0.25, bright <=0.39, rose <=0.51). JANGAN naikkan `--op` melebihi siling ni tanpa kira semula kontras. Nak lebih kuat: naikkan chroma atau tukar campuran ke lebih banyak bunga bright/rose.

## Kerja tertunda lain
- **PADAM DATA UJIAN sebelum sebar** (SENGAJA ditahan 13 Ogos: data ujian diperlukan untuk user sahkan fix swipe di phone dulu): collection `/rsvp` dan `/sayang` penuh entri ujian user (11 ucapan, belasan like). Bila user dah sahkan fix / kata "padam semua": buka console Firebase (akaun adiburth@gmail.com, profil Chrome "zafri"), Firestore > Data, padam semua doc dalam `/rsvp` dan `/sayang`. Padam lewat console sebab rules tolak delete dari luar. (Cara UI: pilih doc, menu tiga titik, Delete document.)
- GitHub Pages cache ~10 minit; selepas push, uji dengan hard reload / incognito.
- Firebase console tips: rules editor guna CodeMirror, boleh set lewat JS `document.querySelector('.CodeMirror').CodeMirror.setValue(...)`; layout sempit sorok butang Publish, klik baris "unpublished changes" dulu.

## Rujukan design
Folder `notaTimbang/` dalam repo: verdict.md (pakej design muktamad + senarai STOP), research.md (token warna disahkan sampel pixel kad rasmi + kiraan kontras WCAG), P2.md (spec penuh ciri interaktif), faktaPack.md (fakta sistem masa run). Ini artifak run /timbang 13 Ogos, rujuk sebelum ubah design besar.

## Sejarah commit penting
- `6f78374` bina asal (borang + dinding + rules), `90be819` pecah 3 halaman, `917181a` marquee animasi (DIGANTI), `8ce1fd9` pakej purple + 4 ciri interaktif (run timbang), `36b2835` timbunan swipe ganti marquee, `f09f1e6` like label + kontras teks + swipe thresholds, `6caaa4e` fix spring-back snapshot rebuild, `30a777a` ambient motion versi subtle, `799673c` fix swipe touch-action + scroll manual, `9030d96` ambient dinaikkan supaya obvious

## Corak kerja yang terbukti sesi ini (untuk sesi baru)
- Semua kerja tangan → subagent Opus 4.8; browsing/console Firebase → sesi utama guna Chrome tools
- Bug: WAJIB replikasi dulu dalam ujian sebelum fix (dah 2 kali berjaya dengan corak ni)
- Design besar: mockup dulu (3 pilihan), user pilih, baru implement
- Ujian keselamatan rules: curl REST PATCH/DELETE/POST tak sah, jangka 403

## Status
Sistem berfungsi hujung ke hujung, link Canva betul, 2 bug lama dah difix dan dipush 13 Ogos. TUNGGU: (1) user sahkan fix swipe + ambient di phone sebenar, (2) padam data ujian, (3) sebar. Majlis 30 Ogos, baki ~17 hari.
