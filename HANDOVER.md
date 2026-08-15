# HANDOVER, rsvpKhadizahAnwar

Kemaskini terakhir: 2026-08-15 malam (sesi maraton redesign anti-slop penuh: Wave 0-5 + pusingan feedback user, semua implementasi subagent Fable 5 atas arahan eksplisit user)

## Apa projek ni
Website jemputan kahwin penuh (e-kad + RSVP + dinding ucapan) untuk majlis **Khadizah Binti Razali & Muhammad Anwar Bin Sawal**, Ahad **30 Ogos 2026** (17 Rabiulawal 1448H), 12pm-6pm, ADH Hall Kota Marudu. Website ni LINK RASMI yang disebar. Baki ~15 hari ke majlis.

## Status: SIAP GELOMBANG REDESIGN ANTI-SLOP PENUH (15 Ogos), LULUS PANEL JUDGE
Wave 0 (audit hallmark, 12 directive semua diluluskan user) → Wave 0.5 (layout/typography) → Wave 1 (bunga Redouté realistic + fix seam warna) → Wave 2 (transisi cover crossfade) → Wave 3 (butang hidup) → Wave 4 (feed ucapan landing) → pusingan feedback user (cover Bismillah Jawi, sprig gelap, apungan semua butang, cache-bust) → Wave 5 verifikasi (3 reviewer bebas + fixer 15 dapatan + verifier live: **verdict goal user tercapai, sifar tell AI-slop**). User dah sahkan gelombang pertengahan di phone ("better la dari sebelum ni", "dah tengok dan okay"); hasil AKHIR selepas fixer/polish belum disahkan mata user.

## URL & git
- **RASMI (disebar): https://khadizahanwar.github.io/** (org `khadizahanwar`, repo `khadizahanwar.github.io`)
- Cermin lama (kekal hidup, JANGAN matikan): https://adiburth-personal.github.io/rsvpKhadizahAnwar/
- Remote `origin` = adiburth-personal, remote `rasmi` = org baru. **WAJIB push DUA-DUA**: `git push origin main && git push rasmi main`. Build Pages repo org pernah gagal rawak sekali, fix = push commit kosong trigger semula (semak lewat API `actions/runs`).
- **Data**: Firebase Firestore projek `rsvpkhadizahanwar` (akaun adiburth@gmail.com), collection `/rsvp` (RSVP + ucapan) + `/sayang` (satu doc per like, medan ucapanId), rules create+read sahaja. `firebaseConfig.js` modul kongsi, SDK modular 10.12.5 dynamic import.

## Seni bina visual (hasil redesign 15 Ogos)
- **Lapisan kanvas-panel** (resipi kad Canva): satu zon kanvas mauve #6b5164 berterusan dari Aturcara sampai Salam Kaut, panel lilac radius 26px terapung atasnya (pseudo `::after`, BUKAN div pembalut, sebab enjin reveal per-anak), HANYA 2 peralihan warna seluruh halaman, dua-dua gradient 200px color-mix. `.lp-kad` guna `overflow: hidden; overflow: clip;` (clip WAJIB, hidden sahaja = scroll container tersembunyi yang buat deep-link tersasar 1100px).
- **Bunga**: aset watercolor Redouté/botani public domain Wikimedia Commons dalam `aset/bunga/*.webp` (URL sumber + lesen direkod dalam komen landing.css, jumlah ~600KB). Prinsip D2: SATU anchor besar per panel di bucu, selang kiri/kanan, bertindih tepi panel, BUKAN taburan mini sekata. Sprig gantian pilihan user: babysBreath (salam) + sprigClematis (lokasi), duotone plum gelap SIFAR hijau (user tak nak tambah warna). Line-art etching emas opacity 0.15 atas kanvas. Vektor SVG mini lama semua dibuang; `.bunga--*` styles.css kekal untuk ambient gutter + kelopak.
- **Cover**: kaligrafi Bismillah ligatur U+FDFD font **Aref Ruqaa subset arab hos sendiri** (`aset/font/arefRuqaaArab.woff2`, SIL OFL, dipreload), monogram K&A ampersand script emas + berlian, "Tekan untuk buka" small-caps + hairline menirus + berlian denyut. Bouquet webp dipreload (burst cetus serta-merta pada gesture, tanpa preload = kotak kosong).
- **Choreography tap**: 2 gelombang (10 + 24 bunga, radius sampai 460px), momen penuh 34 bunga ditahan op 0.9, `angkat()` @1800ms, tap kedua = skip serta-merta (kelas `is-laju` fade 650ms). Burst 100% watercolor (floret vektor dibuang, dapatan judge "sticker kartun").
- **Transisi angkat**: crossfade sebenar, cover fade `--lp-dur-angkat` 1100ms SAMBIL `.lp-kad` mengalir naik (opacity/translateY/scale 1200ms digate `.lp-buka`), keadaan awal digate `.lp-js:not(.lp-buka)` + `prefers-reduced-motion: no-preference` (JS mati / reduced-motion terus nampak penuh). scrollTo instant SEBELUM fade. Muzik unmute 2000ms jatuh tengah crossfade (sengaja, kemuncak selari).
- **Butang**: sheen emas 6s pada 4 CTA (3 `.lp-btn-besar` + dock RSVP) + **apungan SEMUA butang** (token `--btnApung*`; dock 2px per-butang fasa staggered, bar pegun; CTA 3px + sheen; sayang-btn 1.5px), `:active` scale 0.97 universal. Teknik: `translate`/`scale` property BERASINGAN dari transform (elak konflik reveal/parallax). Payung reduced-motion dalam landing.css + styles.css.
- **Feed Buku Tetamu landing** (`bukuInit` landing.js): getDocs `/rsvp` limit 40 papar 12, kad = `<a>` ke ucapan.html, tally `/sayang` TIDAK di-await sebelum render (WebKit webchannel kerap hang, feed mesti keluar dulu), ♥ ditampal async timeout 3s + SATU retry lewat 5s timeout 6s (idempotent). Auto-scroll rAF scrollTop 15px/s, gate IO, jeda pada interaksi + resume 4s, penanda skrol-sendiri ikut NILAI scrollTop bukan boolean, viewport `max-height: 360px` adaptif (mengecut bila ucapan sikit, elak lubang kosong).
- **Modal**: focus trap = `latarInert()` (inert pada lpKad/lpDock/lpMuzik) + `pasangKitarTab()` (keydown wrap + SENTINEL fokus halimunan awal/akhir modal, WAJIB sebab keydown dalam iframe RSVP tak sampai dokumen induk). Back/Esc/overlay corak modalHistory kekal.
- **Halaman lain**: rsvp.html ada 2 anchor botani standalone (disorok dalam embed); ucapan.html kaunter "X ucapan · Y ♥"; pengantin.html chip nowrap + lining-nums. Semua keluarga lilac.

## Konvensyen WAJIB baru (15 Ogos)
- **Cache-bust `?v=`**: CDN Pages tamatkan cache HTML dan JS/CSS pada masa BERBEZA (pernah: HTML baru + JS lama = feed kosong, user marah). SEMUA pasangan HTML+JS/CSS di 4 halaman awam guna `?v=`, nilai WAJIB naik SETIAP commit yang ubah pasangan (nota dalam head index.html). Terkini: `?v=20260815f` (index), `?v=20260815e` (lain).
- **Harness Playwright**: butang terapung buat `page.click()` gagal "element is not stable", guna `evaluate(el.click())`; full-page screenshot TAK boleh dipercayai (reveal reset luar viewport + QR lazy-load); countdown berdetik cemari pixel-diff; ujian piksel glyph mesti cover BUTANG dan border butang, bukan teks perenggan sahaja; reduced-motion semak `getAnimations()` running (ada teknik duration-mikro 1e-05s); noise "webchannel" console WebKit headless = diketahui, bukan pageerror sebenar.

## Peraturan/gotcha lama (KEKAL WAJIB)
- HARAM SVG filter/feTurbulence/`<use>`/`<symbol>` (sejarah bug WebKit); WAJIB uji WebKit setiap perubahan visual.
- Siling opacity hiasan atas laluan teks: deep<=0.15 mid<=0.20 bright<=0.26 rose<=0.31; TEKS SENTIASA MENANG atas bunga (user dah marah 2 kali pasal ni).
- prefers-reduced-motion mesti matikan SEMUA gerak; fallback JS mati mesti boleh baca penuh (cover disorok CSS bila lp-js tiada).
- Muzik muted-unlock: `play()` MESTI segerak dalam gesture, JANGAN tangguh dengan setTimeout; unmute 2000ms.
- Scroll dock guna rAF `scrollKe` custom, HARAM scrollIntoView smooth di landing.
- Grain PNG base64. Komen Melayu KENAPA, IIFE, defensif try/catch. Pages cache ~10 min, uji incognito.
- gh CLI biasanya akaun Dicci, JANGAN switch tanpa pulang balik. `?tema=kraft` = fallback tersembunyi.

## Kerja tertunda
- **User sahkan sendiri di phone hasil AKHIR** (selepas fixer judge + polish terakhir: gutter desktop baru, chip pengantin, focus trap, retry ♥). Sesi ni user cuma sahkan sampai gelombang pertengahan.
- **PADAM entri ujian Firestore**: doc `/rsvp/USQpnF0RlRVKy2I3lJZd` "UJIAN SISTEM (akan dipadam)", manual di console Firebase akaun adiburth (rules sekat padam dari luar). Kekalkan ucapan PytaaMJ + 2 like.
- Nombor telefon kontak dalam landing.js masih bertanda "PADANAN BELUM SAH", tunggu user sahkan dengan keluarga.
- Kad Canva pasangan: butang dalamnya masih tiada link (user kena tambah manual di Canva editor kalau nak guna).

## Corak kerja terbukti
- Semua implementasi → subagent (sesi 15 Ogos: Fable 5 atas arahan user); arahan tambahan user disampaikan lewat SendMessage ke agent yang tengah jalan; sourcing aset bebas lesen → Wikimedia Commons API (Pixabay/Rawpixel sekat skrip).
- Judge pattern: 3 reviewer bebas (kehendak/visual/teknikal) → fixer → verifier live. Sesi ni ia jumpa 16 dapatan (2 kritikal: deep-link tersasar, lubang feed) yang terlepas ujian wave.
- Feedback screenshot phone user = sumber kebenaran visual paling tinggi; reviewer/harness pernah false positive (rect vs glyph, reveal belum settle).

## Sejarah commit penting 15 Ogos
`932ab30` audit 5 fix → `84c66ac` glitch scroll (IO pecah 2 observer) → `5da69de` trigger Pages → `e16ef2a` seksyen Salam Kaut → `3eb5736` wording → `955ec3c` choreography 2 gelombang → `f57adc7` Wave 0.5 layout/panel → `f07585b` bouquet Redouté + preload → `1787a61` botani + fix seam warna (1 zon kanvas) → `0794afe` transisi crossfade → `eac59bf` butang sheen/apung → `79129c2` feed Buku Tetamu → `e40bded` feedback user (Bismillah Jawi, sprig plum, apung semua, ?v=) → `16f3a2d` fixer 15 dapatan judge → (commit ini) polish retry ♥ + kitar Tab sentinel + HANDOVER.
