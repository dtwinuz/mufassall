# 07 · Yo'l xaritasi

Muddatlar taxminiy (bitta asosiy dasturchi + Claude). Har bosqich **ko'rinadigan natija** va qabul mezoni bilan tugaydi.

| Bosqich | Maqsad | Natija | Qabul mezoni |
|---|---|---|---|
| **F0 · Poydevor** (≈1 hafta) | Qarorlar, repo, dizayn tizimi, engine spike | Nom, 2 repo, ADR 0001–0005, `DESIGN.md` + tokenlar (light/dark), bitta 3 qadamli dars lokal ishlaydi | Spike'da 60 fps (1440×900), `reduced-motion` rejimi, uch tilli matn |
| **F1 · Learn MVP** (≈3 hafta) | Engine + player + 6 public dars | `<nom>.dtwin.uz` jonli: sidebar, timeline, metrika, WHAT CHANGED diff, klaviatura, `Ctrl+K`, progress (localStorage), deep link | Lighthouse perf ≥ 0.9, a11y 100; har qadam vizual testda; CSP A+ |
| **F2 · Akkaunt va ichki qatlam** (≈3 hafta) | API, auth, rol + niqoblash mexanizmi, birinchi 3 Faktura darsi (F1, F3, F2) | Login, org a'zoligi, internal darslar faqat a'zoga, secret havolalar niqob profili bilan, audit jurnali | Leak-guard testi: public build'da maxfiy narsa 0; rolsiz so'rov 403; niqob unit testlari |
| **F3 · Simulyatsiya** (≈2 hafta) | DES dvigatel, metrikalar o'lchanadi, "nima bo'ladi, agar" slayderlari | 3 darsda slayder (masalan, Soliq kechikishi, retry soni) | Sim deterministik (seed), metrikalar testlangan |
| **F4 · Practice + Cheatsheets** (≈2 hafta) | Savollar, SRS, karta eksporti | Har darsda 3–5 savol, takrorlash navbati, SVG/PNG + Mermaid eksport | Eksport Jira/GitLab'da to'g'ri ko'rinadi |
| **F5 · Kod sinxroni** (≈1 hafta) | codeRef + drift tekshiruvi | Ichki darslarda "Kodda" havolasi, haftalik drift issue | Simvol o'chirilsa drift issue ochiladi |
| **F6 · Lab** (≈3 hafta) | Sandbox: tugun, traffic, nosozlik, baholash | xyflow + sim bilan erkin dizayn, 5 ta topshiriq | Rubrika natijasi takrorlanadi |
| **F7 · Rollar matritsasi** | PM / developer / support / admin / tashqi | ADR-0006 + admin UI | User bilan kelishilgan matritsa |
| **F8 · Jonli egizak** (ixtiyoriy) | Real metrika (read-only) | Sahnadagi plitkalarda jonli navbat va holat sonlari, rolga qarab | Gateway read-only, PII niqoblangan |
| **F9 · Kontent oqimi** | Yangi Jira/MR → dars qadamiga | Muallif rejimi, sharh, preview | Bitta dars 1 kunda qo'shiladi |

## Doimiy ishlar ("doim izlanishda")
- Har oy: namunalar ro'yxatini yangilash (`02-references.md`), `last30days` bilan trend skani.
- Har reliz: oldin/keyin jadvali (Lighthouse, bundle, a11y).
- OpenSSF Scorecard: Silver → Gold.

## Public darslar F1 uchun (6 ta)
1. So'rov yo'li (request lifecycle) · 2. Navbatlar va ack · 3. Retry va idempotentlik · 4. Webhook/callback ishonchliligi · 5. Holat mashinasi · 6. Elektron imzo asoslari.
Matn va sahna o'zimizniki; namunadagi darslar tuzilmasi nusxalanmaydi.
