# 01 · designed-to-scale tahlili

Manba: Chrome DevTools orqali jonli sahifa (2026-11-17), alohida isolated context'da. Bundle: `assets/index-BeXJu_A0.js` (~785 KB, React), `index-CxX-BAVx.css`.

## Nima bor (o'lchangan)
| Narsa | Holat | Dalil |
|---|---|---|
| Stek | React SPA, Vite (hash'li asset nomlari), hash-router `#/<slug>/<step>` | `document.scripts`, havolalar `#/load-balancing/5` |
| Kurs | 9 bo'lim, **40 dars** | sidebar: Foundations 3, Scaling 5, Data & Storage 11, Communication 4, Reliability 4, Architecture 4, Security 3, Shipping 2, Whole Systems 4 |
| Dars | 10–12 qadam, davomiylik (10–13 min), daraja (Beginner/Intermediate) | "12 min · Beginner · 12 steps" |
| Sahna | Izometrik **SVG** (112 ta `svg`, `canvas` 0): foydalanuvchilar, LB, serverlar, harakatlanuvchi paket nuqtalari, server ustida yuk foizi | skrinshot `dts-lesson.png` |
| Metrika plitkalari | Har darsga o'z metrikalari: Users, Req/s, p95, Errors, Healthy servers; CI/CD darsida Deploys/day, Lead time, Failed deploys, MTTR | snapshot |
| O'ng panel | `STEP n / N` → **PROBLEM** sarlavha + matn → **WATCH OUT** → **WHAT CHANGED** (`−` / `~` / `+` diff) → Back / Next | snapshot (cicd/8) |
| Pastki timeline | Qadam nomlari bilan raqamli chiziq, bosib o'tish mumkin | — |
| Boshqaruv | `←/→` qadam, `R` replay, `Space` pause; Replay/Pause tugmalari | — |
| "You'll learn" | Dars maqsadlari ro'yxati | — |
| Recap qadami | Tasdiqlangan xulosa + "Coming up: keyingi dars" | — |
| Progress | `localStorage`: `sdt:last`, `sdt:recent`; sidebar'da `1/3`, umumiy `2/40` | `Object.keys(localStorage)` |
| Qidiruv | `Ctrl+K` | — |
| Tillar | **21 til** (EN, ES, PT, FR, IT, DE, NL, PL, TR, ID, VI, EL, UA, RU, ZH-Hans, ZH-Hant, JA, KO, HI, AR, HE). **O'zbekcha yo'q** | til menyusi |
| Dark mode | Bor | — |
| Practice / Design Lab / Cheatsheets | **Hali yo'q**: bosilganda "coming soon" toast chiqadi | `role=status` → "Cheatsheets are coming soon" |
| Backend | Yo'q (statik, Vercel) | — |

## Nimasi kuchli (biz ham olamiz, lekin o'z kodimiz bilan)
1. **Muammo → yechim ritmi**: har qadam bitta muammoni ko'rsatadi, keyingisi uni hal qiladi ("LB fails" → "Standby" → "Failover").
2. **WHAT CHANGED diff**: o'quvchi har qadamda nima o'zgarganini ko'radi.
3. **Raqamlar sahnaga bog'langan**: server yiqilsa Errors 100% bo'ladi.
4. Qisqa: 10–13 daqiqa, bitta tushuncha.
5. Klaviatura bilan tez yurish.

## Nimasi yo'q yoki zaif (bizning imkoniyat)
1. Practice, Lab, Cheatsheets — **e'lon qilingan, lekin yo'q**.
2. Raqamlar **chizilgan** (skript), o'lchanmagan: "agar parametr o'zgarsa nima bo'ladi?" degan savolga javob bermaydi.
3. Akkaunt yo'q: progress faqat bitta brauzerda.
4. O'zbek tili yo'q.
5. Real tizim bilan bog'lanish yo'q: kod, metrika, incident tarixi.
6. Deep link faqat qadamgacha; embed (Jira/MR ichiga qo'yish) yo'q.
7. Manba yopiq — hamjamiyat dars qo'sha olmaydi.

## Huquqiy chegara
Repo yoki litsenziya topilmadi (`gh search repos`, web qidiruv). Shuning uchun: **kod, SVG aktivlar, matnlar, dars tuzilmasi so'zma-so'z nusxalanmaydi**. G'oya va format (qadamli animatsion dars) erkin, ularni noldan yozamiz va o'z dizayn tizimimizni quramiz.
