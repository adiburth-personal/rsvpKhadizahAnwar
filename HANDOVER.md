# HANDOVER, rsvpKhadizahAnwar

Kemaskini terakhir: 2026-08-15 pagi (sesi maraton 14-15 Ogos: rombakan besar landing, tema lilac, muzik mp3, domain baru; kerja tangan oleh subagent Opus 4.8, 2 pusingan judge)

## Apa projek ni
Website jemputan kahwin penuh (e-kad + RSVP + dinding ucapan) untuk majlis **Khadizah Binti Razali & Muhammad Anwar Bin Sawal**, Ahad **30 Ogos 2026**, 12pm-6pm, ADH Hall Kota Marudu. Website ni dijangka jadi LINK RASMI yang disebar (kad Canva pasangan di khadizah-anwar-invittation.my.canva.site/youre-invited/ka wujud tapi butang RSVP/ucapan/WhatsApp dalamnya TIADA link; user kata pasangan kemungkinan besar guna link kita terus).

## Status: SIAP FASA 2, LIVE DI DOMAIN BARU, lulus 2 pusingan judge (3 reviewer + 1 verifier live). Baki ~15 hari ke majlis.

## URL (BARU 15 Ogos: domain rasmi bersih)
- **RASMI (disebar): https://khadizahanwar.github.io/** (org GitHub `khadizahanwar`, repo `khadizahanwar.github.io`, dicipta 15 Ogos lewat Chrome user yang login adiburth-personal)
- Cermin lama (kekal hidup, JANGAN matikan): https://adiburth-personal.github.io/rsvpKhadizahAnwar/
- rsvp.html / ucapan.html / pengantin.html?kunci=khadizahAnwar3008x7qz wujud di KEDUA-DUA domain
- Git: remote `origin` = repo lama adiburth-personal, remote `rasmi` = repo org baru. **WAJIB push ke DUA-DUA** setiap perubahan: `git push origin main && git push rasmi main`. Credential helper adiburth dah tersedia dalam repo config, jalan untuk kedua-duanya. OG meta 3 halaman awam menunjuk domain BARU.

## Seni bina (kemaskini besar 14-15 Ogos)
- **Hosting**: GitHub Pages x2 (lihat URL). **Data**: Firebase Firestore projek `rsvpkhadizahanwar` (akaun adiburth@gmail.com), collection `/rsvp` + `/sayang`, rules create+read sahaja (teruji 403, tak disentuh sesi ni). Firebase disahkan jalan dari domain baru.
- **TEMA: LILAC DEFAULT** (sebiji kad Canva rasmi: kad #d4c6e8, gutter mauve #6b5164, surface #f3eefa, panel #e7ddf3, teks maroon). Diaktif skrip head (kelas `lp-lilac` KECUALI `?tema=kraft` = fallback kraft lama tersembunyi). rsvp.html standalone + embed pun lilac (override token `:root` dalam fail). Audit kontras penuh lulus (terendah 4.58:1).
- **Halaman**: index.html (landing e-kad) + landing.css (~180KB, banyak SVG data URI) + landing.js; rsvp.html + app.js (borang, `?embed=1` = versi kompak modal); ucapan.html/js (dinding swipe, TAK diubah sesi ni); pengantin.html (papan rahsia).

## Ciri landing sekarang (semua diuji Playwright chromium + webkit)
- **Cover**: monogram K&A serif Cormorant SC + ampersand script emas (wax seal lama DIBUANG, user tolak "rasa mandala"). Tekan = CHOREOGRAPHY "Dua Gelombang + Tahan Penuh": monogram zoom 1.6x (620ms) + GELOMBANG 1 (10 bunga radius 130-260px, terbang ~1.3s) serta-merta, GELOMBANG 2 pada 180ms (24 bunga radius 260-460px sampai bucu skrin, saiz 20-56px, terbang ~1.5s), opacity DITAHAN ~0.9 lepas sampai (tak pudar sendiri) + hanyut/putar perlahan; ~34 bunga penuhi skrin 900-1800ms; pada 1800ms kad masuk + cover+SEMUA bunga fade bersama 700ms (bunga anak cover, satu transition), kad settle ~2500ms. TAP KEDUA semasa taburan = terus masuk (angkat serta-merta, guard diangkat elak double-fire). Muzik play() KEKAL segerak dalam gesture, unmute 2000ms tak diubah. reduced-motion terus buka. Aset bunga guna semula .bunga--*/.lp-bouquet-* (clone, keyframe lpTerbang transform+opacity, 59fps @ 6x CPU throttle). Diuji chromium+webkit desktop+iPhone.
- **MUZIK: mp3 sendiri `laguMajlis.mp3`** (Beautiful in White instrumental Neena Goh, dipotong saat 12 hingga 1:48 = 96s, fade in/out, 128kbps 1.5MB, loop). YouTube DIBUANG terus (gagal berbunyi di phone, aktivasi tak menjalar ke iframe cross-origin iOS). Main lewat **muted-unlock**: gesture cover -> play() muted SEGERAK (kunci kebenaran iOS) -> 2 saat kemudian unmute + currentTime=0 (permintaan user delay 2s). Butang toggle dipacu event sebenar. Preload none -> auto selepas page settle. GOTCHA: JANGAN tangguh panggilan play() dengan setTimeout, transient activation luput.
- **ENJIN REVEAL: resipi ekaddigital** (diukur live dari kad RUJUKAN user: https://ekaddigital.com/thequietframestudio/DeaNikahiAca , kalau nak banding gerakan lagi, buka kad tu; GSAP feel dibuat vanilla): keadaan sembunyi opacity 0 + translateY(+100px), masuk dari BAWAH SAHAJA semua arah skrol, 1000ms cubic-bezier(0.25,0.46,0.45,0.94) quad-out, IO PER-ELEMEN threshold [0,0.05] histeresis, reset SNAP bila keluar viewport (transition hanya pada .is-lihat), replay setiap masuk. Ukuran padan sasaran: op ~0.48 @250ms (ref 0.4375). Hero = pengecualian urutan dramatik (nama zoom 1.9s digate kelas .lp-buka).
- **Aturcara Majlis** (timeline emas, antara butiran dan countdown), tentatif muktamad user 15 Ogos: 11:00 pagi Ketibaan Tetamu, 12:00 Bersanding, 12:30 Sesi Bergambar 1, 1:00 Jamuan Makan, 2:55 Sesi Bergambar 2, 3:30 Potong Kek, 6:00 Bersurai.
- **Modal RSVP** (butang RSVP/Berikan Ucapan -> iframe rsvp.html?embed=1) + **Modal Hadiah/Salam Kaut** (dock butang ke-6): QR DuitNow + panduan 3 langkah (simpan gambar -> app bank -> scan galeri). Esc dalam iframe tutup lewat postMessage; Back browser tutup modal (pushState/popstate, tak menimbun); klik overlay/X pun tutup; scroll lock + fokus diurus.
- **QR**: `qrSalamKaut.jpeg` = QR DuitNow MAROON DIJANA SEMULA dari payload EMV asal screenshot BSN user (154 aksara, roundtrip disahkan BarcodeDetector Chrome SAMA 100%, akaun KHADIZAH RAZALI). `qrLokasiAdhHall.jpeg` = QR maroon dijana sendiri -> https://maps.app.goo.gl/DgUFoiJTH2QpMemy5 (QR pink hati asal user diganti atas syor judge visual, kandungan destinasi sama). Fail asal user kekal di ~/Downloads.
- **Hiasan**: bouquet watercolor SVG lukis sendiri (blush + lavender) bucu hero/cover/footer; 8 aset botani (anemone, ranunculus, lisianthus, clematis, filler, baby's breath, sage, batang beige, senarai spesifik user) isi gutter desktop + sela seksyen, opacity 0.42-0.5; 11 kelopak jatuh (8 tepi jelas 0.52-0.72, 3 dalam bawah siling); cahaya emas sapu 26s opacity 0.08; parallax deko var --lp-par. Ampersand seragam emas (#6b521a atas lilac 4.58:1). CTA RSVP + butang tel/WA = maroon pejal.
- **Deep link hash** mendarat betul selepas cover; **fallback JS gagal** = timer 3s head buang lp-js (window.__lpSedia penanda hidup).
- **ogImage.png** = versi lilac monogram baru, dijana Playwright mod ?og=1 (skrip janaOg.cjs corak: serve repo python3 -m http.server + waitUntil load BUKAN networkidle, sebab Firebase/audio kekalkan network aktif).

## Peraturan/gotcha kekal (WAJIB patuh sesi depan)
- HARAM SVG filter/feTurbulence/<use>/<symbol> (sejarah bug WebKit "bunga jadi bintang"); WAJIB uji WebKit setiap aset SVG baru.
- Siling opacity hiasan atas laluan teks: deep<=0.15 mid<=0.20 bright<=0.26 rose<=0.31; hiasan terang hanya di margin/tepi.
- prefers-reduced-motion mesti matikan semua gerak, kandungan penuh statik.
- Scroll dock guna rAF custom scrollKe/scrollKeSasaran (JANGAN scrollIntoView smooth, bug flash gelap Chrome).
- Grain PNG base64, bukan SVG turbulence. Gaya kod: komen Melayu KENAPA, IIFE, defensif try/catch, guard .lp-js.
- GitHub Pages cache ~10 minit; uji incognito/hard reload. gh CLI biasanya akaun Dicci, JANGAN switch tanpa pulang balik.

## Kerja tertunda
- **PADAM entri ujian Firestore**: doc `/rsvp/USQpnF0RlRVKy2I3lJZd` nama "UJIAN SISTEM (akan dipadam)" (ujian borang 14 Ogos). Cara: console Firebase akaun adiburth, Firestore > Data, menu tiga titik > Delete document (rules sekat padam dari luar, memang UI sahaja). Kekalkan ucapan PytaaMJ + 2 like.
- User belum sahkan sendiri di phone gelombang terakhir (lilac default, animation baru, muzik lagu baru delay 2s, cover monogram, QR baru, domain baru). Semua disahkan judge live automatik sahaja.
- Kad Canva pasangan: butang dalamnya masih tiada link; kalau pasangan nak guna kad tu jugak, link perlu ditambah manual dalam Canva editor oleh user.

## Corak kerja terbukti sesi ni
- Semua implementasi -> subagent Opus 4.8 (satu zon fail satu masa, arahan tambahan user disampaikan lewat SendMessage ke agent yang tengah jalan); browsing/console/GitHub UI -> sesi utama Chrome tools; aset (mp3 ffmpeg, QR jana/decode, OG image) -> sesi utama.
- Judge pattern (goal user): 3 reviewer bebas (kehendak/visual/fungsi) -> 1 gelombang fix -> 1 verifier live -> fix sisa. Berkesan: jumpa QR pink tak padan tema, CTA lemah, Esc iframe, Back button, deep link, fallback JS.
- Reverse-engineer rujukan (ekaddigital): ukur nilai sebenar lewat rAF sampling di site live, bukan agak dari mata; sahkan implementasi dengan ukuran sama.

## Sejarah commit penting sesi 14-15 Ogos
`e387871` animation 9 kesan -> `5f474de` muzik cover + reveal arah + modal RSVP -> `cdd2d4b` muzik jujur -> `83dae22` animation gaya e-kad -> `394fabf` dock Hadiah + QR -> `e890ff5` aturcara + bouquet -> `9e4fdd4` tema lilac preview -> `511f46a` muzik mp3 -> `4c5cf63` cover monogram + latar hidup -> `161b3ff` lagu Beautiful in White -> `daedc31` lilac default + animation resipi rujukan -> `4eda202` rsvp standalone lilac -> `9b2f186` botani -> `45f0ffc` gelombang fix judge -> `17b05ad` domain baru meta -> `886e5fd` QR salam kaut maroon
