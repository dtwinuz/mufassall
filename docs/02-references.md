# 02 · Namunalar: kimdan nimani olamiz

Tadqiqot: 2026-11-17, GitHub ma'lumotlari `gh api` orqali. ⚠️ belgisi = tekshirilmagan.

## Asosiy namunalar
| # | Platforma | Eng kuchli tomoni | Biz oladigan BITTA g'oya | Ochiq? |
|---|---|---|---|---|
| 1 | [Breakscale](https://github.com/workersio/breakscale) | Haqiqiy discrete-event simulyatsiya: p99, navbat, retry storm **o'lchanadi** | Metrika plitkalari va Lab bitta **simulyatsiya dvigatelidan** keladi | MIT, ~2.4k⭐ |
| 2 | [SystemForge](https://github.com/vijaygupta18/system-design-simulator) | Dizaynni chizib traffic yuborish, 5 o'lchovli baholash | Practice'da **avtomatik baholash rubrikasi** | MIT |
| 3 | [LikeC4](https://github.com/likec4/likec4) | Arxitektura modeli kod sifatida; dynamic view'da qadamlar va har qadamga `notes` | **Sahna = DSL**, dars qo'shish = PR | MIT, ~6.1k⭐ |
| 4 | [Structurizr](https://docs.structurizr.com/ui/diagrams/dynamic-view) | Bitta model → ko'p view, presentation mode | **Bitta Faktura modeli**, darslar undan "kesiladi" | Apache-2.0 / MIT |
| 5 | [IcePanel](https://icepanel.io/) | Flows, model prod bilan sinxron | Diagramma real holatdan yangilanadi | Yopiq |
| 6 | [D2](https://d2lang.com/tour/composition/) | `steps` — har qadam oldingisidan meros oladi | **Meros semantikasi → WHAT CHANGED avtomatik** | MPL-2.0 |
| 7 | [Mermaid](https://github.com/mermaid-js/mermaid) | Hamma joyda render bo'ladi (GitLab, GitHub) | Har darsdan **statik cheatsheet eksporti** | MIT |
| 8 | [samwho.dev](https://samwho.dev/load-balancing/) | Dars ichida slayder, p50/p99 grafik, oxirida playground | **"Nima bo'ladi, agar…" slayderlari** | Manba topilmadi. Muallif PixiJS'dan Lit+SVG'ga o'tgan |
| 9 | [ciechanow.ski](https://ciechanow.ski) | Eng sifatli interaktiv esselar | Har tushunchaga kichik, qo'lda boshqariladigan widget | Yopiq |
| 10 | [Explorable Explanations](https://explorabl.es/) | O'yin orqali o'rganish | O'quvchi xatoni **o'zi qo'zg'atadi** | — |
| 11 | [Secret Lives of Data](https://github.com/benbjohnson/thesecretlivesofdata) | Raft'ni qadamma-qadam; janrning ajdodi | Har qadamda bitta gap + bitta harakat | MIT |
| 12 | [Josh Comeau kurslari](https://www.joshwcomeau.com/blog/how-i-built-my-blog-v2/) | MDX ichida jonli komponentlar | Matn va sahna **bitta faylda** | Yopiq |
| 13 | [Scrimba](https://medium.com/scrimba/why-were-creating-a-new-video-format-for-code-9f674f8dcc46) | Video emas, hodisa yozuvi + ovoz; pauzada tahrirlash | Qadamlar ustiga **ovozli yo'l** | Yopiq |
| 14 | [Brilliant](https://brilliant.org/) | Har qadamdan keyin savol, moslashuvchi reja | **Savol + spaced repetition** | Yopiq |
| 15 | [ByteByteGo](https://bytebytego.com/) | Bitta rasmli vizual kartalar | **Ulashiladigan cheatsheet karta** | Yopiq |
| 16 | [roadmap.sh](https://github.com/kamranahmedse/developer-roadmap) | Graf xarita + progress | **Jarayonlar xaritasi**, o'tilgan tugunlar bo'yaladi | Maxsus litsenziya |
| 17 | [Killercoda](https://killercoda.com/) | Brauzerda real Linux/K8s | DevOps darslarida **jonli terminal qadami** | Platforma yopiq |

## Dvigatel va asboblar
| Asbob | Qayerda ishlatamiz |
|---|---|
| Motion (motion.dev, MIT) | SVG tugun/edge animatsiyasi (asosiy) |
| PixiJS (MIT) yoki Canvas2D | Ko'p paket-nuqtalar qatlami (500+ dan keyin) |
| Rive (runtime MIT, editor yopiq) | Faqat "hero" ikonkalar: imzo kaliti, Soliq binosi — ixtiyoriy |
| Motion Canvas (MIT) | Darsdan MP4 eksport (onboarding video). Remotion — katta kompaniyaga pullik litsenziya, olinmaydi |
| xyflow / ReactFlow (MIT) | Design Lab: tugun va edge sandbox |
| Excalidraw (MIT) | Lab'da qo'lda eskiz qatlami (ixtiyoriy) |
| Pagefind (MIT) | Statik qidiruv (`Ctrl+K`), uch tilda |

## Kichik ochiq klonlar (o'qib chiqish uchun, nusxalash uchun emas)
loadsketch (MIT, 41⭐), system-design-playground (litsenziyasiz), flowframe (5⭐), mallahyari/system-design-visualizer (606⭐, litsenziyasiz).

## Hammasidan eng yaxshisi: biz birlashtiradigan 10 ta funksiya
1. **Scene-as-code DSL** (LikeC4 + D2 steps): qadam oldingisidan meros oladi → diff avtomatik.
2. **Kod bilan sinxron**: har qadamda `fayl:qator`, CI drift'ni ushlaydi (faqat ichki darslarda).
3. **O'lchanadigan simulyatsiya** (Breakscale): metrikalar va Lab bitta dvigateldan.
4. **"Nima bo'ladi, agar" slayderlari** (samwho): Soliq javobi 30 s kechiksa nima bo'ladi?
5. **Deep link + embed**: `/l/roaming-callback/5` havolasi Jira yoki MR ichida ochiladi.
6. **Bitta model, ko'p view** (Structurizr).
7. **Practice**: savol, spaced repetition, Lab'da rubrika bilan baholash.
8. **Jarayonlar xaritasi + progress** (roadmap.sh), akkaunt bilan sinxron.
9. **Ovozli yo'l + video eksport** (Scrimba, Motion Canvas).
10. **Uch til, PWA/offline, `Ctrl+K`, klaviatura**, dark/light.

**Hech kimda yo'q, bizda bo'ladigan narsa:** rolga qarab maxfiy qiymatni ochish yoki niqoblash ([04-architecture.md](04-architecture.md) §5) va kerak bo'lsa real tizimning jonli metrikasi.
