# ADR ro'yxati

Har bir ADR formati: kontekst → qaror → oqibat. Repo yaratilgach har biri alohida `docs/decisions/NNNN-*.md` faylga ko'chiriladi.

| # | Qaror | Holat |
|---|---|---|
| 0001 | ADR yuritiladi | ✅ qabul |
| 0002 | Namunadan faqat format olinadi; kod, aktiv va matn nusxalanmaydi | ✅ qabul (litsenziya yo'q) |
| 0003 | Ikki repo: public `dtwinuz/<nom>` + private `dtwinuz/<nom>-internal` | 🟡 taklif |
| 0004 | Astro + React islands + Motion SVG + Canvas paket qatlami | 🟡 taklif |
| 0005 | Maxfiy qiymat kontentda faqat havola (`{{secret:…}}`); server rolga qarab niqoblaydi | 🟡 taklif |
| 0006 | Rollar matritsasi (PM, developer, support, admin, tashqi) | ⏳ keyingi bosqich (user qarori) |
| 0007 | Auth: Better Auth (SSO kerak bo'lganda Zitadel/Keycloak'ga o'tish yo'li bilan) | 🟡 taklif |
| 0008 | Nom | ⏳ user tanlaydi (`08-naming.md`) |

## 0003 · Ikki repo
**Kontekst:** platforma public. Lekin Faktura ichki jarayonlari maxfiy: navbat va jadval nomlari, kod yo'llari, kamchiliklar. Git tarixiga bir marta tushgan narsani qaytarib bo'lmaydi.

**Qaror:** engine, sim, web va public darslar public repo'da turadi. Ichki darslar private repo'da saqlanadi va API orqali beriladi.

**Oqibat:** ichki darslar uchun alohida CI kerak, schema paketi versiyalanadi.

## 0004 · Render stek
**Kontekst:** SVG aniq va a11y'ga qulay, lekin minglab nuqtada sekinlashadi.

**Qaror:** tugun va edge'lar SVG + Motion bilan chiziladi. Paketlar Canvas2D overlay'da (kerak bo'lsa PixiJS). Darslarda three.js ishlatilmaydi.

**Oqibat:** ikkala qatlam koordinatani bitta izometrik proyeksiya funksiyasidan oladi.

## 0005 · Maxfiy qiymatlar
**Kontekst:** PM IP manzilni to'liq ko'rishi kerak, developer esa niqoblangan holda (user misoli).

**Qaror:** kontentda faqat `{{secret:<kalit>}}` havolasi turadi. API sessiya va rolni tekshiradi, qiymatni OpenBao'dan oladi va niqob profilini qo'llaydi. Niqoblash brauzerda emas, serverda bajariladi.

**Oqibat:**
- Maxfiy qiymat public bundle'ga tushmaydi (CI'dagi leak-guard tekshiradi).
- Har bir ochilish audit jurnaliga yoziladi.
