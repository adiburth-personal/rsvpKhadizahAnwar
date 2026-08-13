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

### 1. Swipe reset + skrin scroll ikut (phone sebenar), FIX SEBENAR commit `6caff3b`
Sejarah: fix pertama `799673c` (touch-action none + scrollBy manual) GAGAL di phone user. Siasatan kedua 13 Ogos guna Puppeteer + CDP dispatchTouchEvent (sentuhan tulen, bukan event sintetik) BUKTIKAN punca: `pointercancel` datang 1 frame selepas heret mula WALAUPUN touch-action none dan setPointerCapture aktif. CSS touch-action SAHAJA tak halang browser batalkan pointer; HANYA `preventDefault()` pada `touchmove` non-passive yang benar benar rampas gesture (jadual eksperimen: baseline cancel=1 stuck 23px; +preventDefault cancel=0 gerak penuh 140px).
Fix `6caff3b` (pertahanan berlapis, penting untuk Safari iOS yang tak boleh diuji automatik): (1) listener `touchmove` non-passive pada kad, preventDefault bila arah mendatar dikunci, kira arah sendiri dari `mula`; (2) kad depan kembali `touch-action: pan-y`, scroll menegak NATIVE (scrollBy manual dibuang); (3) `setPointerCapture` dipindah ke saat kunci mendatar (capture pada pointerdown mematikan scroll native); (4) pointercancel graceful; (5) `NISBAH_MENEGAK = 1.3` (serong sampai ~52 darjah kekal mendatar). 11 senario touch tulen lulus selepas fix (mendatar/flick/serong 30 dan 45/menegak/swipe berturut/masa snapshot/like/mouse/kekunci/swipe kanan), pointercancel 0 untuk semua mendatar.
MOD DEBUG PHONE: buka `ucapan.html?debug=1` = panel log terapung (pointerdown, arah dikunci, POINTERCANCEL, keputusan swipe). Kalau bug masih muncul di phone, user replikasi dengan flag ni dan screenshot panel. Tanpa flag, tiada kesan.

### 2. Ambient motion tak nampak, FIX `9030d96` kemudian DIROMBAK `44949d5` (bunga purple)
Punca asal disahkan: BUKAN tersorok z-index, tapi kontras + kekuatan terlalu rendah (emas vs kraft beza terang cuma 8%). Fix pertama `9030d96` naikkan bokeh emas cerah, tapi user tolak premis tu: background kraft dah cerah, elemen cerah atas cerah tak menonjol.
Rombakan `44949d5`: bokeh emas DIGANTI 15 bunga kecil purple (mask leper). Latar bernafas glow cerah DIBUANG, ganti tint purple sangat lembut. Sway kad belakang kekal (±1.5deg dari 9030d96).
Naik taraf `8486513` (permintaan user "lebih realistic/3D"): mask+background-color diganti SVG PENUH baked sebagai data URI (gradient per kelopak pangkal gelap hujung cerah, kelopak bertindih belakang gelap depan cerah, sheen spekular, pusat emas berkilat, drop shadow baked, blur depth-of-field pada bunga jauh). 2 bentuk (wildflower 5 kelopak + bloom berlapis 10 kelopak) x 4 ton purple band kad rasmi = 8 kelas `bunga--aDeep`..`bunga--bRose`. Warna dibaked hex sebab gradient SVG tak boleh guna CSS var.
SILING OPACITY (dikira semula atas piksel paling gelap gradient, JANGAN lebih tanpa kira semula kontras): deep <=0.15, mid <=0.20, bright <=0.26, rose <=0.31; kes terburuk teks maroon 4.55:1. NOTA JUJUR: pada opacity ni bunga memang halus/delikat, detail 3D jelas bila dekat sahaja, tradeoff sengaja lindung teks. Kalau user nak lebih menonjol: pilihan selamat = hadkan laluan bunga ke tepi/margin (jauh dari kolum teks) supaya opacity boleh naik tanpa sentuh kontras.
INSIDEN "BUNGA JADI BINTANG" di phone user (13 Ogos): SVG 8486513 guna `<use href>` (SVG2), WebKit/Safari TAK paint `<use>` dalam background-image, keluar siluet runcing = bintang. Fix `acce2f9`: semua kelopak path eksplisit (tiada use/symbol/href), gradient objectBoundingBox, bayang ellipse tanpa filter, encoding %25 penuh, kelopak dibulatkan + bertindih (celah runcing antara kelopak yang buat rupa bintang). Disahkan pixel-identikal WebKit vs Chromium. PENGAJARAN: aset SVG untuk background-image WAJIB elak use/symbol/filter dan WAJIB uji WebKit (Playwright webkit), bukan Chromium sahaja.
Berkaitan: `9391d48` fallback hex untuk oklch/color-mix (Safari lama runtuhkan latar kad jadi lutsinar, kad bertindih tak terbaca) + guard supaya kegagalan hiasan/CDN tak buat page kosong. Gotcha: `background:#hex; background:color-mix(...var())` TAK selamat, var() tangguh validasi, baris tak sah tetap timpa hex, kena guna @supports.

## Kerja tertunda lain
- **DATA UJIAN DAH DIPADAM 13 Ogos** (lepas user sahkan swipe lancar): semua doc ujian dibuang lewat console UI (rules tak diubah). ATAS ARAHAN USER, dikekalkan: ucapan **PytaaMJ** (doc `3FVKhnKilDrlYseUXUyD`) + 2 like miliknya. Keadaan akhir disahkan REST: `/rsvp` = 1 doc (PytaaMJ), `/sayang` = 2 doc. Sistem SEDIA DISEBAR.
- Nota cara (kalau perlu padam lagi nanti): console Firebase akaun adiburth@gmail.com, Firestore > Data, hover row > menu tiga titik > Delete document > Start delete. Klasifier sekat ubah rules lewat JS, jadi jalan UI sahaja. AWAS: window/layout console boleh reflow tengah automasi, sahkan path dalam dialog "Document Location" sebelum confirm, dan audit lewat REST (`curl .../documents/rsvp`) selepas setiap beberapa padam.
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
SEDIA DISEBAR (13 Ogos malam): swipe disahkan user lancar di phone, bunga ambient 3D disahkan user okay, data ujian dah dipadam (kecuali ucapan + 2 like PytaaMJ, arahan user). Tinggal user sebar link pada tetamu. Majlis 30 Ogos, baki ~17 hari.
