import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Loyiha: operobot2",
  summary:
    "operobot2 - O'zbekistondagi kichik va o'rta biznes uchun ko'p tenantli AI savdo va call-markaz xizmati. Telegram, WhatsApp, Instagram, SMS va sayt vidjetidan kelgan xabarlar bitta inbox'ga tushadi; AI agent kecha-kunduz javob beradi, telefon raqami yoki uchrashuv vaqtini ajratib oladi va so'ralsa suhbatni odamga beradi; har suhbat 6 bosqichli doskada lidga aylanadi; chiquvchi qo'ng'iroq kampaniyalari faqat qonuniy 09:00-18:00 oynasida ishlaydi. Dars avval foydalanuvchi yo'llarini, keyin texnik tomonni ko'rsatadi: har tashkilot uchun row level security bilan bitta PostgreSQL bazasi, muhrlangan kanal tokenlari, SSE orqali jonli yangilanish, telefoniya dialeriga ko'prik, to'lovlar va MCP endpoint, oxirida CI, deploy va ikki demo.",
  learn: [
    "Foydalanuvchi tomoni: demo sandbox, umumiy inbox, odamga uzatadigan AI agent, CRM doska va rozilik hamda qora ro'yxatli chiquvchi kampaniyalar",
    "Bitta baza ko'p kompaniyaga qanday xavfsiz xizmat qiladi: har tenant jadvalida org_id, FORCE ROW LEVEL SECURITY va superuser bo'lmagan ilova roli",
    "Nega kanal tokenlari pgcrypto bilan emas, API ichida AES-256-GCM bilan, org id autentifikatsiyalangan ma'lumot sifatida muhrlanadi",
    "Kampaniya runner dialer bilan qanday gaplashadi: kampaniyaga bitta liniya, status kodiga qarab qayta urinish, takror natija e'tiborsiz",
    "Konveyer qanday bo'lsa shunday: CI = aniq qoida bo'yicha typecheck va build, umumiy edge proxy ortida Docker Compose bilan deploy.sh, jonli va statik demo",
  ],
  nodes: {
    customer: "Mijoz",
    channels: "5 kanal",
    api: "API (Fastify)",
    web: "Panel (React)",
    operator: "Operator",
    ai: "AI agent",
    db: "PostgreSQL",
    dialer: "operobot dialer",
    pay: "Payme / Click",
    claude: "Claude (MCP)",
    code: "main branch",
    ci: "GitHub Actions",
    proxy: "Edge + Caddy",
    demo: "Statik demo",
  },
  metrics: {
    foreign: "So'rov ko'ra oladigan boshqa tashkilot qatorlari",
    plain: "Ochiq matnda saqlangan kanal tokenlari",
    shared: "Barcha mehmonlarga umumiy demo limiti",
    lines: "Kampaniyadagi parallel qo'ng'iroqlar",
    smoke: "Demo smoke testlari",
    expired: "Tugash sanasidan o'tib ishlayotgan pullik tariflar",
  },
  steps: {
    intro: {
      short: "Bu nima",
      title: "O'zbekistondagi biznes uchun AI savdo bo'limi",
      body: "Kichik biznes mijozlarga bir vaqtda besh joyda javob beradi: Telegram bot, WhatsApp, Instagram, SMS va saytidagi chat. operobot2 ularning hammasini AI agent, CRM doska, chiquvchi qo'ng'iroqlar, tariflar va to'lovlar bilan bitta panelga yig'adi. U jamoaning bitta kompaniyaga mo'ljallangan eski mahsuloti `operobot`ning ko'p tenantli vorisi; uning telefoniya dialeridan HTTP orqali foydalanadi, kod nusxalanmagan (ADR-0001).\n\nEng tez kirish yo'li - operobot2.dtwin.uz dagi demo tugmasi. U `POST /api/auth/demo` ni chaqiradi: shu mehmon uchun alohida sandbox tashkilot yaratiladi, Pro tarifidagi \"Namuna Servis\", namuna kanallar, operatorlar, agentlar, suhbatlar, lidlar va kampaniya bilan. Boshqa mehmonlar uni hech qachon ko'rmaydi, 24 soatdan keyin o'chiriladi.",
      fields: {
        "Set-Cookie": "Sessiya cookie'si `ob2_sid`: httpOnly, SameSite=Lax, HTTPS'da Secure, 30 kun. Bu yerda yashirilgan.",
        org: "Har so'rov joriy tashkilot ichida ishlaydi; buni baza ham majburlaydi.",
        plan: "Demo'da Pro, shuning uchun har imkoniyat ko'rinadi.",
        demo: "Demo tashkilotlarda qo'ng'iroq va to'lovlar simulyatsiya: telefon tarmog'iga ham, to'lov provayderiga ham hech narsa yetmaydi.",
        role: "owner, admin yoki operator. Owner va admin jamoa, tarif va kalitlarni boshqaradi.",
      },
    },
    inbox: {
      short: "Inbox",
      title: "Mijoz yozadi: xabar inbox'ga tushadi",
      body: "Mijoz kompaniyaning Telegram botiga yozsa, Telegram webhook'ni chaqiradi. URL'da har kanal uchun tasodifiy 24 belgili sir bor, shuning uchun uni biladigan odamgina xabar yubora oladi. API kontaktni topadi yoki yaratadi, suhbat ochadi, \"Yangi\" bosqichida lid yaratadi, xabarni saqlaydi va uni darhol har ochiq panelga yuboradi.\n\nOperatorlar ro'yxatni filtrlaydi (hammasi, o'qilmagan, meniki, AI), qidiradi, suhbatni kimgadir biriktiradi va chat yonida kontakt hamda lid kartalarini ko'radi. Xuddi shu message id bilan takror kelgan webhook e'tiborsiz qoldiriladi, shuning uchun Telegram'ning qayta urinishlari dublikat yaratmaydi.",
      fields: {
        message_id: "Takror webhook'larni tashlash uchun: bir xil id bir marta saqlanadi.",
        from: "Kontaktga aylanadi: ism va username, kanalning o'z id'si bo'yicha qayta topiladi.",
        chat: "Javob qayerga ketadi; adapter uni sendMessage bilan yuboradi.",
        text: "Kiruvchi xabar sifatida saqlanadi va AI agentga beriladi.",
        ok: "Telegram'ga faqat 2xx kerak; keyingi ish uni kuttirmaydi.",
      },
    },
    ai: {
      short: "AI agent",
      title: "AI agent javob beradi, ma'lumot ajratadi va qachon uzatishni biladi",
      body: "Agent oxirgi 20 xabarni, kompaniya ko'rsatmalarini, salomlashuvni va uzatish so'zlari ro'yxatini oladi. U bitta shakl qaytaradi: `{reply, action, extracted}`. Action - reply, handoff (suhbat odam rejimiga o'tadi va operator oladi) yoki close. Ajratilgan ma'lumot lidni yangilaydi: ism, telefon, qiziqish, uchrashuv vaqti, bosqich va bir qatorli xulosa.\n\n`LLM_URL` berilgan bo'lsa, API istalgan OpenAI-mos chat endpoint'ni chaqiradi va JSON so'raydi. Berilmagan bo'lsa yoki model ishlamasa, xuddi shu shakldagi qoidaga asoslangan o'zbekcha javobchi ishga tushadi, shuning uchun mahsulot oflaynda va demo'da ham ishlaydi. Bu yerda u \"ertaga soat 11\" ni Toshkent vaqti deb o'qib, yozib qo'yadi. Har AI javobi tarif limitidan sanaladi; limit tugasa, suhbat tizim izohi bilan operatorga o'tadi.",
      check: {
        q: "LLM provayderi bir soat ishlamay qoldi. Mijozlar nima oladi?",
        options: [
          "U qaytmaguncha hech qanday javob yo'q",
          "Qoidaga asoslangan javobchidan javob; u ham xuddi shu shaklni qaytaradi: reply, action, extracted",
          "Har suhbat darhol operatorga o'tadi",
        ],
        answer: 1,
        why: "LLM_URL bo'lmasa yoki chaqiruv yiqilsa, `decide` `ruleDecide` ga o'tadi. Shakl bir xil bo'lgani uchun keyingi lid va uzatish mantiqi o'zgarmaydi.",
      },
      fields: {
        text: "Agentlar sahifasidagi test chat bitta mijoz qatorini xuddi shu miyaga yuboradi.",
        reply: "Mijozning kanali orqali qaytariladigan matn.",
        action: "reply, handoff yoki close; handoff suhbatni odam rejimiga o'tkazadi.",
        meeting: "Toshkent 11:00 UTC 06:00 sifatida saqlanadi.",
        stage: "Lidni doskada siljitadi, bu yerda Uchrashuv'ga.",
      },
    },
    board: {
      short: "CRM doska",
      title: "Har suhbat 6 bosqichli doskada lidga aylanadi",
      body: "Doskada olti bosqich bor: Yangi, Qiziqdi, Uchrashuv, Qayta bog'lanish, Yutildi va Yutqazildi. Lidlar suhbat va qo'ng'iroqlardan o'zi keladi; AI bosqich, qiziqish va keyingi qadamni qo'yadi, operatorlar kartani suradi yoki tahrirlaydi. Lid manba kanalini va suhbatiga havolani saqlaydi, shuning uchun bitta bosish butun tarixni ko'rsatadi.\n\nKontakt kartasi bitta odamning barcha lid, suhbat va qo'ng'iroqlarini yig'adi. Loyiha qoidasiga ko'ra hamma demo raqamlar `+998 00` bilan boshlanadi, bu diapazonda haqiqiy abonent yo'q: demo haqiqiydek ko'rinishi kerak, lekin o'zini haqiqiy deb ko'rsatmasligi kerak.",
      fields: {
        stageId: "Shu tashkilotning olti bosqichidan biri.",
        interest: "yuqori, o'rta yoki past; AI yoki qo'lda qo'yiladi.",
        nextAction: "Operator keyin nima qilishni va'da qilgani, kartada ko'rinadi.",
        source: "telegram, whatsapp, instagram, sms, widget, manual yoki call.",
        conversationId: "Lid kelgan chatni ochadi.",
      },
    },
    calls: {
      short: "Kampaniyalar",
      title: "Chiquvchi kampaniyalar: qonun kod ichida",
      body: "Kampaniya - telefon raqamlar ro'yxati va ixtiyoriy ovozli agent. Raqamlar `+998 XX XXX XX XX` ko'rinishiga keltiriladi va takrorlari olib tashlanadi. Haqiqiy (demo bo'lmagan) kampaniyani ro'yxatdagi odamlar rozilik berganini tasdiqlamasdan yaratib bo'lmaydi; kim va qachon tasdiqlagani saqlanadi. Qo'ng'iroq paytida mijoz operatorga ulanish uchun \"1\" ni yoki rad etish uchun \"2\" ni bosadi; \"2\" raqamni tashkilotning qora ro'yxatiga qo'shadi.\n\nO'zbekistonda reklama qo'ng'iroqlariga faqat 09:00 dan 18:00 gacha ruxsat bor (2026-11-01 dan). `callWindowOpen` buni majburlaydi: soat shu oyna ichida ham, tashkilotning ish vaqti ichida ham bo'lishi kerak, Toshkent vaqti bilan, yakshanba, belgilangan bayramlar va `HOLIDAYS` dagi sanalarda hech qachon emas. Haqiqiy tashkilot buni o'chira olmaydi; faqat demo tashkilotlar o'tkazib yuboradi, chunki ularning qo'ng'iroqlari simulyatsiya.",
      check: {
        q: "Tashkilot ish vaqtini 07:00-21:00 qilib qo'ydi. Haqiqiy kampaniya qachon qo'ng'iroq qila oladi?",
        options: [
          "07:00-21:00, tashkilot hal qiladi",
          "Ish kunlari Toshkent vaqti bilan 09:00-18:00: kod ikki oynaning torrog'ini oladi",
          "Rozilik tasdiqlangan bo'lsa, istalgan vaqtda",
        ],
        answer: 1,
        why: "Oyna max(9, work_from) dan min(18, work_to) gacha. Tashkilot sozlamalari qonuniy oynani toraytira oladi, lekin hech qachon kengaytira olmaydi.",
      },
      fields: {
        agentId: "Dialer o'qiydigan ssenariyli ovozli agent.",
        phones: "Bir ko'rinishga keltirilgan, takrorsiz; qora ro'yxatdagi raqamlar qo'shilmaydi.",
        consent: "Haqiqiy tashkilotlar uchun majburiy; consent_by va consent_at sifatida saqlanadi.",
        status: "Boshlanguncha draft; keyin running, paused yoki done.",
      },
    },
    arch: {
      short: "Arxitektura",
      title: "Arxitektura: bitta API, bitta baza, SSE orqali jonli yangilanish",
      body: "Uch qism. `web` - o'z hash router'li React 19 + Vite bir sahifali ilova, UI kutubxonasiz, o'zbek, rus va ingliz tillarida. `api` - Fastify 5, `pg` orqali toza SQL va kiruvchi ma'lumot uchun zod: ORM yo'q, shuning uchun RLS va hisobotlar tayanadigan so'rovlar ko'rinib turadi (ADR-0003). Hammasini PostgreSQL 17 saqlaydi.\n\nJonli yangilanish Server-Sent Events orqali: `GET /api/events` har ochiq panel uchun bitta oqimni ushlab turadi, API esa message, conversation, lead, call, campaign va usage voqealarini yuboradi. SSE WebSocket'dan soddaroq va Caddy orqali qo'shimcha sozlamasiz o'tadi. Obunachilar ro'yxati xotirada, shuning uchun v0.1 bitta API nusxasida ishlaydi; ko'proq nusxa uchun hujjatlangan keyingi qadam - Postgres `LISTEN/NOTIFY`, kampaniyalar uchun esa `select ... for update skip locked` navbati.",
      fields: {
        "text/event-stream": "Hech qachon tugamaydigan oddiy HTTP javob; Caddy uni buferlamasligi va siqmasligi kerak.",
        message: "Suhbat uchun yangi kiruvchi yoki chiquvchi xabar.",
        lead: "Lid yaratildi yoki siljidi, doska qayta yuklanmasdan yangilanadi.",
        usage: "Tarif hisoblagichlari, billing sahifasida jonli ko'rinadi.",
        "LISTEN/NOTIFY": "Voqealar bir nechta API nusxasi o'rtasida qanday o'tadi.",
      },
    },
    rls: {
      short: "Tenantlik",
      title: "Tenantlik: bitta baza, org_id va row level security",
      body: "ADR-0002 dagi tanlov: har mijozga alohida baza yoki sxema emas, bitta baza va bitta sxema, har tenant jadvalida `org_id`. Kichik mijozlar ko'p, har biriga baza esa qimmat. Lekin faqat `WHERE org_id = ...` ga tayanish xavfli: bitta unutilgan filtr bir kompaniyaning mijozlarini boshqasiga ko'rsatadi.\n\nShuning uchun buni PostgreSQL majburlaydi. Har tenant jadvalida RLS yoqilgan va majburlangan, siyosat `org_id` ni tranzaksiya sozlamasi `app.org_id` bilan solishtiradi. Ilova ulanadi va `ob2_app` roliga o'tadi: u superuser emas va RLS'ni chetlab o'ta olmaydi. Har so'rov `tx(orgId, fn)` ichida yuradi, u qiymatni faqat shu tranzaksiya uchun qo'yadi. Tizim ishlari (auth, webhook, tozalash) `SYSTEM` ni aniq berishi kerak, bu code review'da ko'rinadi. Lokal isbot: `ob2_app` sifatida, org qo'yilmagan holda `select count(*) from leads` 0 qaytaradi.",
      check: {
        q: "Dasturchi yangi hisobot so'rovida org filtrini unutdi. Mijoz nimani ko'radi?",
        options: [
          "Barcha tashkilotlarning qatorlari",
          "Faqat o'z qatorlarini: so'rov nima desa ham siyosat app.org_id bo'yicha filtrlaydi",
          "SQL xatosini",
        ],
        answer: 1,
        why: "FORCE ROW LEVEL SECURITY siyosatni jadval egasiga ham qo'llaydi, ilova roli esa uni chetlab o'ta olmaydi. Xato faqat sekinroq so'rov rejasiga tushadi.",
      },
      fields: {
        ob2_app: "Har pool ulanishi o'tadigan rol; RLS unga qo'llanadi.",
        "app.org_id": "set_config(..., true) bilan qo'yiladi: tranzaksiyaga lokal, COMMIT'da yo'qoladi.",
        "no WHERE": "So'rov filtrni unutishi mumkin; siyosat unutmaydi.",
        FORCE: "FORCE'siz jadval egasi siyosatni chetlab o'tardi.",
        tenant: "Har jadvalga bitta siyosat, o'qish (USING) va yozish (WITH CHECK) uchun.",
      },
    },
    secrets: {
      short: "Tokenlar",
      title: "Kanal tokenlari bazaga yetmasdan muhrlanadi",
      body: "Telegram, WhatsApp, Instagram va SMS shlyuzining bot va API tokenlari ilgari bazada ochiq matnda turardi: sizib chiqqan backup har mijozning kanallarini sizdirardi. PR #20 `channels.config` ni API jarayoni ichida AES-256-GCM bilan muhrlaydi. Kalit - serverdagi `.env` dagi `CHANNEL_KEY`, baza backup'laridan alohida saqlanadi.\n\nNega `pgcrypto` emas: unda kalit SQL parametri sifatida bazaga boradi, u yerda loglar yoki `pg_stat_activity` uni ushlab qolishi mumkin. Org id autentifikatsiyalangan ma'lumot, shuning uchun boshqa tashkilot qatoriga ko'chirilgan muhrlangan blob ochilmaydi. Ishga tushishda API eski ochiq qatorlarni muhrlaydi va har muhrlangan qator ochilishini isbotlaydi; noto'g'ri kalit bilan ishga tushmaydi. PR cheklovlarni ham yozadi: kalit rotatsiyasi hali yo'q, server to'liq buzilsa kalit ham ochiladi.",
      check: {
        q: "Kimdir A tashkilot kanal qatoridagi muhrlangan config blob'ni B tashkilot qatoriga ko'chirdi. Nima bo'ladi?",
        options: [
          "Endi B A ning botidan foydalana oladi",
          "Shifr ochilmaydi: org id GCM autentifikatsiyalangan ma'lumoti, API ishga tushmaydi",
          "Hech narsa, API qatorni e'tiborsiz qoldiradi",
        ],
        answer: 1,
        why: "GCM shifr matni va AAD ustidan autentifikatsiya teg'ini tekshiradi. Boshqa org id - yiqilgan teg; ishga tushish tekshiruvi buni bitta aniq xatoga aylantiradi.",
      },
      fields: {
        enc: "Format versiyasi: 1 = muhrlangan. Unsiz qatorlar - eski ochiq qatorlar, ishga tushishda muhrlanadi.",
        iv: "Har muhrlashda tasodifiy 12 baytli nonce. Bu yerda yashirilgan.",
        tag: "GCM autentifikatsiya teg'i. Bu yerda yashirilgan.",
        data: "JSON config'ning shifr matni. Bu yerda yashirilgan.",
        AAD: "Shifrlanmaydi, lekin autentifikatsiyalanadi: blob'ni o'z tashkilotiga bog'laydi.",
        "409": "Kalitsiz API tokenni umuman saqlamaydi.",
      },
    },
    bridge: {
      short: "Dialer",
      title: "Telefoniya dialeriga HTTP ko'prik",
      body: "operobot2 o'zi qo'ng'iroq qilmaydi. Haqiqiy tashkilotlar uchun u eski `operobot` dialerini (Asterisk ARI) `POST /originate` bilan chaqiradi: `callId`, telefon va tashkilotga xos tasodifiy sirli callback URL beriladi. Dialer keyin natijani yuboradi: connected, operator_busy (1 bosildi, lekin bo'sh operator yo'q edi - eng issiq lid, shuning uchun u yuqori qiziqish bilan \"Qayta bog'lanish\" da ochiladi), answered, declined, no_answer, busy yoki failed.\n\nRaqam taqdirini status kodi hal qiladi: 2xx - kutish; faqat 400 va 422 raqamni rad etadi; qolgan hamma narsa (javob yo'q, 5xx, 401, 404, 409, 429) uni navbatga qaytaradi va 15 soniyadan keyin xuddi shu `callId` bilan qayta urinadi, shuning uchun dialer takrorlarni tanishi kerak. Ko'prik haqiqiy dialer kodi va soxta Asterisk bilan sinalgan: 12 raqamli kampaniya done gacha yurdi.",
      check: {
        q: "Token almashtirilgani uchun dialer 401 qaytaryapti. Navbatdagi raqamlar nima bo'ladi?",
        options: [
          "Hammasi failed deb belgilanadi",
          "Navbatda qoladi va har 15 s qayta uriniladi: 401 raqamlar haqida hech narsa demaydi",
          "Kampaniya o'chiriladi",
        ],
        answer: 1,
        why: "PR #21 gacha bitta noto'g'ri sozlama butun ro'yxatni kuydirardi. Endi faqat raqamning o'zi haqidagi 400 va 422 uni failed qiladi.",
      },
      fields: {
        callId: "Qayta urinish va natijalar bo'ylab idempotentlik kaliti.",
        callback: "`<org>.<hook secret>` ni o'z ichiga oladi: taxmin qilib bo'lmaydi va bitta tashkilotga bog'langan.",
        operator_busy: "PR #22 da qo'shilgan: mijoz odamni xohladi; lid qayta bog'lanishga o'tadi.",
        "422": "400 bilan birga raqamni rad etadigan yagona javoblar.",
        "15 s": "Har qanday vaqtinchalik xatodan keyingi kutish.",
        "30 min": "Shundan keyin natijasiz qo'ng'iroq failed deb yopiladi.",
      },
    },
    billing: {
      short: "Billing",
      title: "Tariflar, limitlar va to'lovlar",
      body: "To'rt tarif `billing/plans.ts` da: Start (bepul), Biznes, Pro va Korporativ, operatorlar, kanallar, xabarlar, AI javoblari va qo'ng'iroq daqiqalari bo'yicha oylik limitlar bilan. Narxlar egalar hal qilgunicha \"namuna\" deb belgilangan. Tugagan limit HTTP 402 qaytaradi; AI suhbatlarni operatorlarga beradi, kampaniyalar pauzaga tushadi.\n\nCheckout kutilayotgan hisob va to'lov havolasini yaratadi. Keyin Payme Merchant API'ni JSON-RPC orqali chaqiradi (CheckPerformTransaction, CreateTransaction, PerformTransaction, Cancel...), Basic auth doimiy vaqtda solishtiriladi. Click o'z SHOP API'sidan md5 imzo bilan foydalanadi. Har soatlik tekshiruv muddati o'tgan tashkilotlarni Start'ga qaytaradi, Payme pulni qaytarsa avvalgi tarif va sana tiklanadi. Ikkala provayder lokal sinalgan, hali rasmiy test muhitlarida emas; STATUS.md shuni yozadi.",
      fields: {
        Authorization: "Merchant kaliti bilan Basic auth, timingSafeEqual bilan solishtiriladi. Bu yerda yashirilgan.",
        method: "Payme Merchant API metodlaridan biri; PerformTransaction hisobni to'langan deb belgilaydi.",
        state: "2 = bajarildi: tarif va uning tugash sanasi yoqiladi.",
      },
    },
    mcp: {
      short: "MCP",
      title: "AI assistentlar doskani o'qiy va ish qila oladi",
      body: "`POST /api/mcp` - Model Context Protocol endpoint (JSON-RPC). Owner Sozlamalarda API kalit yaratadi; u bir marta ko'rsatiladi va faqat sha256'i saqlanadi. Claude Desktop yoki Claude Code uni custom connector sifatida qo'shadi.\n\nOlti tool, nomlari o'zbekcha: lidlar ro'yxati, lidni yangilash, suhbatlar ro'yxati, suhbatni o'qish, mijoz kanali orqali xabar yuborish va bugungi statistika. Kalit bitta tashkilotga tegishli, shuning uchun assistent qiladigan hamma narsaga xuddi shu RLS qoidalari qo'llanadi.",
      fields: {
        Authorization: "Tashkilot API kaliti bilan Bearer. Bu yerda yashirilgan.",
        method: "tools/call: bitta tool'ni ishga tushiradigan MCP metodi.",
        name: "Tool; argumentlar uning input sxemasiga mos (bu yerda bosqich filtri).",
        sha256: "Faqat xesh saqlanadi, shuning uchun baza sizsa ham kalitlar sizmaydi.",
      },
    },
    ci: {
      short: "CI",
      title: "CI: typecheck va build, aniq qoida bo'yicha",
      body: "Workflow'da ikki job bor, `api` va `web`, har biri `npm ci` va `npm run build` (TypeScript tekshiruvi va build). Repoda test yo'q, va bu yozilgan qoida (docs/00, 4-qoida), eski operobot bilan bir xil: testlar loyiha o'sganda keladi. Buning o'rniga har PR nima va qanday tekshirilganini yozadi - haqiqiy API va vaqtinchalik PostgreSQL 17 ga qarshi bir martalik skriptlar bilan - va nima tekshirilMAGANini ham.\n\nOdatiy org himoyasi qo'llanadi: action'lar commit SHA'ga qadalgan, `persist-credentials: false`, faqat o'qish huquqi, ikkala npm papka va action'lar uchun oylik guruhli Dependabot. Statik demo Playwright smoke to'plamini qo'shadi, demo qadamiga qarang.",
      check: {
        q: "Test bo'lmasa, API'ni RLS sozlamasidagi regressiyadan nima himoya qiladi?",
        options: [
          "Umuman hech narsa",
          "Bazaning o'zi: RLS'ni PostgreSQL majburlaydi, PR'lar esa ob2_app sifatida count isboti kabi qo'lda tekshiruvlarni yozadi",
          "TypeScript kompilyatori",
        ],
        answer: 1,
        why: "Qoidani bazaga ko'chirish testsiz ham unutilgan filtr ma'lumot sizdira olmasligini bildiradi. PR tavsiflari izolyatsiya qanday tekshirilganini hujjatlaydi.",
      },
      fields: {
        "job api": "Fastify API: tsc va build.",
        "job web": "React panel: tsc va Vite build; mock kodi kirmaydi.",
        SHA: "Ko'chirilgan teg workflow nimani yurgizishini o'zgartira olmaydi.",
        Dependabot: "Oylik, guruhli: har papkaga bitta PR.",
        "rule 4": "\"Hozircha test yo'q\": hujjatda yozilgan, tasodif emas.",
      },
    },
    deploy: {
      short: "Deploy",
      title: "Deploy: bitta skript, uchta konteyner, edge proxy ortida",
      body: "`deploy/deploy.sh` panelni lokal build qiladi, commit xeshini `dist/REVISION` ga yozadi, API manbalari, SQL migratsiyalar, compose fayl va Caddyfile'ni SSH orqali jo'natadi, yangi `dist` ni `rsync --delete` bilan almashtiradi va `docker compose up -d --build` ni yurgizadi. Migratsiyalar - oddiy `NNN_*.sql` fayllar, API ishga tushganda har biri bir marta qo'llanadi. Stek xotira limitli uchta konteyner: PostgreSQL 17, Node 24 dagi API va panelni beradigan hamda `/api/*` ni SSE uchun buferlashsiz proxy qiladigan Caddy.\n\nTLS dtwin.uz ning umumiy edge proxy'sida tugaydi, u operobot2.dtwin.uz ni Docker tarmog'i orqali web konteynerga yo'naltiradi; konteynerning ochiq porti yo'q. Rollback - oldingi commit'dan deploy; stek baza volume'ini saqlaydi. Jonli demo u yerda 2026-11-05 dan beri ishlaydi; production O'zbekistondagi serverni kutmoqda, chunki O'zbekiston fuqarolarining shaxsiy ma'lumotlari mamlakatda qolishi kerak (ZRU-547 qonuni).",
      fields: {
        REVISION: "Deploy qilingan commit, serverda o'qiladi: qaysi kod jonli.",
        rsync: "Yangi fayllar eskisi yoniga tushadi, keyin bir o'tishda almashtiradi.",
        "--remove-orphans": "Compose fayldan olib tashlangan konteynerlar qolib ketmaydi.",
        "operobot2-web": "Caddy: statik panel va flush_interval -1 bilan /api proxy.",
        "no public port": "Unga faqat edge yetadi, shuning uchun mijoz IP'si edge sarlavhasidan keladi.",
      },
    },
    demo: {
      short: "Demolar",
      title: "Ikki demo: jonli sandbox va statik build",
      body: "Jonli demo - haqiqiy mahsulot: har mehmon sandbox tashkilot oladi (soatiga IP'ga 10 ta, 24 soatdan keyin o'chadi), panel ochiq turganda simulyator taxminan har 25 soniyada yangi mijoz bo'lib yozadi, AI javob beradi va lidlar siljiydi, hammasi SSE orqali jonli. Sayt vidjeti u yerda ham haqiqiy ishlaydi.\n\nStatik demo jamoaning demo standartiga amal qiladi: xuddi shu panel `--mode demo` bilan build qilinadi, unda `/api` va SSE ga brauzerning o'zida `web/src/mock` dan javob beriladi (48 kontakt, 30+ suhbat, 34 lid, 120+ qo'ng'iroq), vaqtlar hozirga nisbatan, o'zgarishlar qayta yuklashda tiklanadi, burchakda demo belgisi. Mock faqat demo rejimida ishlatiladigan dinamik import, shuning uchun production bundle'da undan hech narsa yo'q. 17 smoke testli Playwright to'plami uni ochadi, skript esa README uchun 17 skrinshot oladi.",
      fields: {
        live: "Har mehmonga bir martalik tashkilotli haqiqiy API.",
        "24 h": "Sandbox va undagi hamma narsa kaskad bilan o'chiriladi.",
        static: "Backend umuman yo'q: istalgan statik hostda tura oladi.",
        "web/src/mock": "Brauzer ichidagi API, bir necha kilobayt real ko'rinishdagi ma'lumot.",
        "--mode demo": "Mock'ni o'z ichiga oladigan yagona build.",
        "17 smoke tests": "npm run test:demo; skrinshotlar qayta generatsiya qilinadi, qo'lda olinmaydi.",
      },
    },
    recap: {
      short: "Xulosa",
      title: "Xulosa",
      body: "operobot2 nimani ko'rsatadi.\n\n1) Sirli webhook URL'lari bilan besh kanal uchun bitta inbox, dublikatlar message id bo'yicha tashlanadi. 2) Bitta chiqish shakli va qoidaga asoslangan zaxirali AI agent, shuning uchun mahsulot modelsiz ham ishlaydi. 3) Bazadagi ko'p tenantlik: org_id, FORCE ROW LEVEL SECURITY va superuser bo'lmagan rol, shuning uchun unutilgan WHERE sizdira olmaydi. 4) Ilovada tenant id autentifikatsiyalangan ma'lumot sifatida muhrlangan sirlar. 5) Qonun kod sifatida: tashkilot faqat toraytira oladigan qo'ng'iroq oynasi, kim va qachon bilan saqlangan rozilik, qora ro'yxat. 6) Status kodi bo'yicha aniq qayta urinish qoidalari va idempotent callId bilan tashqi chaqiruvlar. 7) Ataylab kichik konveyer: typecheck va build, nima sinalgan va nima sinalmaganini halol yozgan PR'lar, umumiy edge proxy ortida bitta deploy skripti. 8) Ikki demo, jonli sandbox va statik build, ikkalasi ham bitta koddan.",
    },
  },
  scenarios: {
    "shared-ip": {
      label: "Umumiy IP",
      steps: {
        "ip-lost": {
          short: "Bitta IP",
          title: "Ikki proxy ortida har mehmon bir xil ko'rinadi",
          body: "Serverda API har mehmonni bitta IP bilan ko'rdi: edge konteynerining IP'si. Edge `X-Forwarded-For` ni to'g'ri qo'yadi, lekin ichki Caddy unga ishonmadi va sarlavhani o'zi ko'rgan manzil bilan almashtirdi. API rate limitlari IP bo'yicha, demo esa soatiga IP'ga 10 ta sandbox beradi; amalda bu butun dunyo uchun soatiga 10 taga aylandi, 11-mehmon esa 429 oldi.",
          check: {
            q: "Haqiqiy tuzatish qayerda?",
            options: [
              "Demo limitini 1000 ga ko'tarish",
              "Ichki Caddy edge turgan xususiy tarmoqqa ishonsin, shunda X-Forwarded-For saqlanadi",
              "API portini to'g'ridan-to'g'ri internetga ochish",
            ],
            answer: 1,
            why: "Sarlavha edge'da to'g'ri edi va bir qadam keyin yo'qoldi. Xususiy diapazonlarga ishonish internetdan kelgan hech narsaga ishonmasdan uni tiklaydi.",
          },
          fields: {
            "X-Forwarded-For": "Edge mehmonning haqiqiy manzili bilan qo'yadi.",
            "not a trusted proxy": "Caddy ishonmagan proxy'larning forwarding sarlavhalarini e'tiborsiz qoldiradi.",
            "req.ip": "Har limit kaliti bo'lgan manzil.",
            "10 per hour": "IP bo'yicha limit bitta umumiy IP'ga qo'llandi.",
            "429": "Too Many Requests, soatning 11-mehmoniga.",
          },
        },
        "ip-fix": {
          short: "LAN'ga ishon",
          title: "Xususiy tarmoqqa ishon, LF qator oxirlarini saqla",
          body: "PR #18 ichki Caddyfile'ning global sozlamalariga to'rt qator qo'shdi: `trusted_proxies static private_ranges`. Edge web konteynerga xususiy Docker tarmog'i orqali yetadi, shuning uchun endi uning sarlavhasi saqlanadi va har mehmonning yana o'z limiti bor. Xuddi shu PR LF qator oxirlari bilan `.gitattributes` qo'shdi: Windows'dagi checkout `deploy.sh` ni CRLF ga aylantirib, uni serverda buzgan edi.",
          fields: {
            trusted_proxies: "Qaysi yuqori proxy'lar mijoz manzilini qo'ya oladi.",
            private_ranges: "Caddy'ning xususiy IPv4 va IPv6 diapazonlari uchun qisqartmasi.",
            LF: "Shell skriptlar Linux'da ishlashi uchun Unix qator oxirlarini saqlashi kerak.",
          },
        },
      },
    },
    "campaign-safety": {
      label: "Kampaniya xatolari",
      steps: {
        "camp-bugs": {
          short: "Ortiqcha qo'ng'iroq",
          title: "Haqiqiy qo'ng'iroqdan oldin kodni o'qish jiddiy xatolarni topadi",
          body: "Haqiqiy dialerni ulashdan oldin kampaniya runner'ini ko'rib chiqish v0.1 noto'g'ri ishlashini ko'rsatdi. Dialer qo'ng'iroqni qabul qilishi bilan liniya bo'shatilardi, runner esa har 3 soniyada ishlaydi, shuning uchun bitta liniyali kampaniya har 3 soniyada yangi qo'ng'iroq boshlardi. Takror natija daqiqalarni yana qo'shardi. Natijasi yo'qolgan kampaniya abadiy running holida qolardi. Dialer xatosi yoki noto'g'ri token har raqamni failed qilardi. Qora ro'yxat va rozilik tekshiruvi esa umuman yo'q edi, garchi hujjat panelda ogohlantirish borligini da'vo qilgan bo'lsa ham.",
          check: {
            q: "Bu xatolardan qaysi biri birinchi bo'lib haqiqiy pulga tushishi mumkin?",
            options: [
              "Ortiqcha qo'ng'iroqlar va ikki marta sanalgan daqiqalar",
              "Yo'q qorong'i mavzu",
              "Kampaniyalar ro'yxatining saralash tartibi",
            ],
            answer: 0,
            why: "Parallel qo'ng'iroqlar SIP trunk'ga va mijozning sabriga uriladi; ikki marta sanalgan daqiqalar tarif limitini kuydiradi. Ikkalasi birinchi haqiqiy kampaniyadayoq ko'rinardi.",
          },
          fields: {
            "every 3 s": "Runner tiki: liniya erta bo'shagani uchun har tik qo'ng'iroq boshlardi.",
            "3 calls in 7 s": "0, 3 va 6-soniyalarda, bitta mo'ljallangan joyda.",
            "repeated result": "Qayta urinilgan webhook ikki marta sanaldi.",
            "list burns": "Bitta sozlama xatosi butun ro'yxatni failed qilardi.",
            consent: "Qonun va hujjat talab qiladi, lekin kodda yo'q edi.",
          },
        },
        "camp-fix": {
          short: "Bitta liniya",
          title: "Bitta liniya, idempotent natija, rozilik va qora ro'yxat",
          body: "PR #21: `claimNext` qo'ng'iroqni faqat shu kampaniyaning hech bir qo'ng'irog'i dialing holida bo'lmasa boshlaydi; natija faqat ochiq qo'ng'iroqni o'zgartiradi; 30 daqiqada natijasiz qo'ng'iroq failed. Faqat 400 va 422 raqamni rad etadi; qolgani uni navbatga qaytaradi va 15 soniyadan keyin xuddi shu `callId` bilan qayta urinadi. \"2\" bosilsa raqam tashkilotning qora ro'yxatiga qo'shiladi, unga navbatdagi qo'ng'iroqlar blocked bo'ladi. Haqiqiy kampaniyaga kim va qachon bilan saqlanadigan rozilik tasdig'i kerak. Yakshanba, belgilangan bayramlar va `HOLIDAYS` o'tkazib yuboriladi. PR o'z tekshiruvlarini yozadi: 7 soniya davomida bitta qo'ng'iroq, takrorlar sanalmaydi, 503/401/404/409 navbatga qaytadi, 422 failed, va hali nima sinalmagani.",
          fields: {
            dialing: "Bu holatda kampaniyaga ko'pi bilan bitta qo'ng'iroq.",
            "30 min": "Osilib qolgan qo'ng'iroq yopiladi, kampaniya davom eta oladi.",
            "15 s": "Dialerning vaqtinchalik xatosidan keyingi kutish.",
            "block list": "Tashkilot bo'yicha, raqam bo'yicha; kontakt kartasidan ham tahrirlanadi.",
            consent_at: "consent_by bilan birga: ro'yxat uchun rozilikni kim tasdiqlaganining yozuvi.",
          },
        },
      },
    },
    "plan-forever": {
      label: "Tugamaydigan tariflar",
      steps: {
        "plan-stuck": {
          short: "Tugamaydi",
          title: "Pullik tarif tugamasdi, qaytarish esa uni o'chirmasdi",
          body: "PR #23 gacha billingda uchta teshik bor edi. Tugash sanasi `plan_until` to'lovda yozilardi, lekin hech qayerda o'qilmasdi, shuning uchun pullik tarif abadiy qolardi. Tashkilot tarif almashtirsa, eski tarifning qolgan vaqti yangisiga ko'chardi, arzon yil qimmat yilga aylanishi mumkin edi. Payme pulni qaytarsa, tranzaksiya bekor bo'lardi, lekin tarif faol qolardi. Click'da to'lov havolasi bor edi, lekin to'lovni tasdiqlaydigan yo'l yo'q edi.",
          check: {
            q: "Qaytarish to'lovni to'g'ri bekor qilishi uchun hisob qaysi ma'lumotni saqlashi kerak?",
            options: [
              "Mijozning telefon raqamini",
              "Tashkilotda shu to'lovdan oldin bo'lgan tarif va tugash sanasini",
              "Faqat Payme tranzaksiya summasini",
            ],
            answer: 1,
            why: "To'lovni bekor qilish - undan oldingi holatga qaytish. Oldingi tarif va sanasiz qaytarish faqat taxmin qila oladi yoki pullik tarifni qoldiradi.",
          },
          fields: {
            Authorization: "Payme Basic auth. Bu yerda yashirilgan.",
            method: "Bajarilgan to'lovga CancelTransaction - qaytarish degani.",
            refund: "Pul qaytdi, lekin v0.1 da tarif qoldi.",
            plan_until: "Tugash sanasi: saqlangan, tekshirilmagan.",
            "plan change": "Qolgan vaqt boshqa tarifga ko'chirilardi.",
          },
        },
        "plan-fix": {
          short: "Soatlik tekshiruv",
          title: "Soatlik muddat tekshiruvi va avvalgi tarifni tiklaydigan qaytarish",
          body: "PR #23: soatlik ish muddati o'tgan har demo bo'lmagan tashkilotni Start'ga qaytaradi. Xuddi shu tarifga to'lov uni tugash sanasidan uzaytiradi; boshqa tarif bugundan boshlanadi, eski tarifning qolgan vaqti kuyadi (PR'da egalar qarori sifatida yozilgan). Har hisob avvalgi tarif va tugash sanasini eslab qoladi, shuning uchun Payme qaytarishi ularni tiklaydi; keyinroq to'lov bo'lgan bo'lsa, faqat shu to'lovning oylari ayriladi. Click md5 imzo bilan Prepare va Complete oladi. Skriptlar bilan lokal sinalgan; Payme va Click sandbox'lari hali oldinda.",
          fields: {
            "every hour": "Muddat tugash ishi; demo tashkilotlarga tegmaydi.",
            "NOT demo": "Demo sandbox'lar o'chirilguncha Pro'da qoladi.",
            prev_plan: "To'lov paytida hisobda prev_plan_until bilan birga saqlanadi.",
            refund: "Saqlangan holatga qaytadi yoki faqat shu to'lovning oylarini ayiradi.",
            md5: "Click SHOP API imzosi, Click'ning rasmiy integratsiya kodidan.",
          },
        },
      },
    },
  },
};

export default text;
