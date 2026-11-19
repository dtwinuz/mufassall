import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Loyiha: Shaffof, muhrlangan xayriya hisobotlari va manbali zakot kalkulyatori",
  summary:
    "Shaffof Wonmor'ning ochiq kodli loyihasi, ikki qismdan iborat: oylik hisobotlari Merkle ildiziga yig'ilib vaqt bilan muhrlanadigan xayriya jurnali, shunda ularni hech kim jimgina o'zgartira olmaydi, va to'rt mazhab usulini manbalari bilan yonma-yon ko'rsatadigan, fatvo bermaydigan zakot kalkulyatori. Loyiha pulga hech qachon tegmaydi. Reja bosqichida: bosh sahifa va 16 ta to'qima jamg'armali konsept demo haqiqiy SHA-256 va RFC 9162 isbotlarini ishlatadi, kalkulyator esa ulamolar yozma ko'rib chiqmaguncha chiqarilmaydi. Dars xayriyachi, jamg'arma va auditor yo'lini, Merkle dizaynini, uning birinchi xavfsizlik xatosini va pipeline'ni ko'rsatadi.",
  learn: [
    "Oylik Merkle ildizi e'lon qilingan hisobotni qanday qilib o'zgartirib bo'lmaydigan qiladi va xayriyachi faqat kvitansiya raqami bilan o'z hissasi ichida ekanini qanday isbotlaydi",
    "Barg kodlash xavfsizlik qarori sifatida: ko'rsatilgan har maydon bog'langan, injektiv format, domen bo'yicha ajratilgan hashlash",
    "Faqat qo'shiladigan jurnal: xato teskari yozuv bilan tuzatiladi; muhr nega \"o'zgarmagan\" ni isbotlaydi, \"to'g'ri\" ni hech qachon emas",
    "Manbalar atrofida qurilgan kalkulyator, ulamolar ko'rigi darvozasi va umumiy statik sayt pipeline'i",
  ],
  nodes: {
    bank: "Jamg'arma banki",
    fund: "Jamg'arma",
    ledger: "Faqat qo'shiladigan jurnal",
    seal: "Oylik muhr",
    report: "Ochiq hisobot",
    donor: "Xayriyachi",
    auditor: "Auditor",
    calc: "Zakot kalkulyatori",
    ots: "OpenTimestamps",
    site: "shaffof-site (Caddy)",
    gh: "GitHub",
    ci: "GitHub Actions",
    rel: "GitHub Releases",
  },
  metrics: {
    silent: "Iz qoldirmaydigan tahrirlar",
    proof: "Xayriyachiga kerak hashlar",
    trust: "Tekshiruv uchun ishonish kerak tomonlar",
    methods: "Yonma-yon solishtirilgan usullar",
    crash: "Sahifani yiqitadigan kirishlar",
    inline: "CSP'dagi xavfli inline manbalar",
  },
  steps: {
    what: {
      short: "Nima",
      title: "Shaffof: ishonish emas, tekshirish mumkin bo'lgan hisobot",
      body: "Bugun xayriya jamg'armasi PDF yoki jadval e'lon qiladi va unga ishonishga majbursiz; keyin bitta raqam o'zgarsa, buni hech kim bilmaydi. Shaffof jamg'arma jurnalini yuritadi va har oy yozuvlarni vaqt bilan muhrlanib e'lon qilinadigan bitta Merkle ildiziga yig'adi. Rejadagi foydalanuvchilar: xayriya jamg'armalari, masjid va mahalla qo'mitalari va ularning xayriyachilari.\n\nPul Shaffof orqali hech qachon o'tmaydi: u jamg'armaning bank hisobida qoladi. 2026-11-19 holati: **reja bosqichi**, xizmat ham, hamkor jamg'arma ham yo'q. Bosh sahifa bu ildizni 8 ta to'qima yozuvdan brauzeringizda WebCrypto bilan hisoblaydi; hech narsa yuborilmaydi.",
      fields: {
        donation: "Kirim: toifa, hech qachon xayriyachi ismi emas.",
        fee: "4 500 so'mlik bank komissiyasi ham yozuv: hisobot jami to'g'ri chiqishi kerak.",
        root: "Sakkiz yozuvning hammasini qamraydigan bitta SHA-256 hash.",
        "no donor names": "Rejadagi qoida, ixtiyoriy sozlama emas.",
      },
    },
    report: {
      short: "Hisobot",
      title: "Xayriyachi hisobotni ochadi: o'zgargan bitta summa darhol ko'rinadi",
      body: "Oylik hisobot sahifasi yozuvlarni va e'lon qilinib muhrlangan ildizni ko'rsatadi. Brauzer ildizni o'ziga ko'rsatilgan yozuvlardan qayta hisoblaydi. Jamg'arma keyin oziq-ovqat to'plamlarini 640 000 dan 940 000 so'mga o'zgartirsa, qayta hisoblangan ildiz butunlay boshqa hash bo'ladi va sahifa buni aytadi.\n\nOddiy PDF'da xuddi shu tahrir iz qoldirmaydi. Konsept demo'da bu tahrirni o'zingiz qilib, ildiz buzilganini ko'rishingiz mumkin.",
      check: {
        q: "Jamg'arma e'londan keyin bitta summani tahrirlab, sahifani qayta e'lon qiladi. Xayriyachi brauzeri nimani ko'rsatadi?",
        options: [
          "Hech narsa: sahifa jamg'armaning o'ziniki",
          "Mos emas: yozuvlardan qayta hisoblangan ildiz muhrlangan, e'lon qilingan ildizga teng emas",
          "Faqat summa oshgan bo'lsa ogohlantirish",
        ],
        answer: 1,
        why: "E'lon qilingan ildiz vaqt bilan muhrlangan, shuning uchun jamg'arma uni sanasi fosh qilmasdan yangisiga almashtira olmaydi. Istalgan maydondagi har tahrir bargni, uning ustidagi yo'lni va ildizni o'zgartiradi.",
      },
      fields: {
        "published root": "Oy yopilgan kundagi muhrlangan qiymat.",
        "current root": "Sahifa ko'rsatayotgan narsadan hozir qayta hisoblangan.",
        Mismatch: "Ular farq qilganda demo chiqaradigan aniq xabar.",
      },
    },
    receipt: {
      short: "Kvitansiya",
      title: "\"Mening hissam hisobotdami?\" Kvitansiya raqami va uchta hash",
      body: "Xayriyachi kvitansiya raqamini, K-0003 ni kiritadi. Sahifa yozuvni va kiritilganlik isbotini qaytaradi: har biri chap yoki o'ng deb belgilangan uchta qo'shni hash. Yozuvni hashlab, qo'shnilarni shu tartibda qo'shib borish e'lon qilingan ildizni berishi shart. 8 ta yozuv uchun bu log2 8 = 3 hash; million yozuv uchun 20 ta bo'lardi.\n\nXayriyachi hech kim ism e'lon qilmasdan va butun jurnalni yuklab olmasdan, hissasi muhrlangan hisobotda ekanini biladi.",
      check: {
        q: "Jamg'armada bu oy 1 000 000 ta yozuv bor. Bitta xayriyachi isbotida nechta hash bo'ladi?",
        options: ["1 000 000", "Taxminan 20", "1 000"],
        answer: 1,
        why: "Kiritilganlik isbotida daraxtning har darajasiga bitta qo'shni bor: ceil(log2 n). Million barg uchun bu 20 hash, 640 bayt, jurnal hajmi qancha bo'lishidan qat'i nazar.",
      },
      fields: {
        entry: "Aynan hashlangan maydonlar: id, sana, toifa, yo'nalish, summa.",
        proof: "Bargdan yuqoriga qarab qo'shni hashlar.",
        side: "Qo'shni chapdami (L) yoki o'ngdami (R): hashlash tartibini belgilaydi.",
        root: "E'lon qilingan ildizga teng bo'lishi shart, aks holda isbot yiqiladi.",
      },
    },
    audit: {
      short: "Audit",
      title: "Auditor: oddiy JSON, bizning serverimizsiz tekshiriladi",
      body: "Demo'ning auditor rejimi o'sha isbotni oddiy JSON qilib ko'rsatadi. Auditor uni faylga qo'yib, sayt ishlatadigan o'sha `merkle.js` bilan Node'da, Shaffof serverisiz tekshira oladi: README beshta qatorini beradi. Qadamlar: barg hashi 48aba4b6..., keyin ildizgacha uchta birlashtirish.\n\nBitta belgini, summani 75000 dan 75001 ga o'zgartirsangiz, natija \"NOT included\". Ishonish kerak bo'lgan yagona narsa ildizdagi vaqt muhri qoladi.",
      fields: {
        "merkle.js": "Bosh sahifa yuklaydigan o'sha fayl: sayt va audit uchun bitta implementatsiya.",
        "proof.json": "Auditor rejimidan nusxa: entry, proof, root.",
        included: "Qayta hisoblangan ildiz e'lon qilinganiga teng.",
        "NOT included": "Istalgan joyda o'zgargan bitta bayt uni buzadi.",
      },
    },
    console: {
      short: "Konsol",
      title: "Jamg'arma: yozuv qo'shish, xatoni teskari yozuv bilan tuzatish, oyni muhrlash",
      body: "Konsept demo'ning jamg'arma konsolida (login demo / demo) g'aznachi toifa, summa va ixtiyoriy hujjat hashi bilan yozuv qo'shadi, xayriyachi ismi bilan hech qachon; kirimga kvitansiya raqami avtomatik beriladi. Tahrirlash ham, o'chirish ham yo'q. Xato, masalan ikki marta kiritilgan to'plam, unga ishora qiluvchi teskari yozuv bilan tuzatiladi va ikkala qator hisobotda ko'rinib qoladi.\n\n\"Oyni yopish va muhrlash\" barcha ochiq yozuvlarni bitta ildizga yig'ib, OpenTimestamps'ga yuboradi; shundan keyin oy yangi yozuv qabul qilmaydi.",
      fields: {
        correction: "Teskari yo'nalishdagi T- yozuv, tuzatayotgan qatoriga bog'langan.",
        "no edit button": "UI'da faqat qo'shish, ma'lumotlar bazasida ham shunday rejalashtirilgan.",
        seal: "Oyni yopish: bitta ildiz, keyin vaqt muhri.",
      },
    },
    zakat: {
      short: "Zakot",
      title: "Kalkulyator: to'rt usul yonma-yon, har biri manbasi bilan",
      body: "Konsept kalkulyator naqd pul, bank, oltin, taqiladigan zargarlik, savdo mollari, olinadigan qarzlar va 12 oy ichida to'lanadigan qarzlarni olib, to'rt ustunni birdaniga ko'rsatadi. Faqat ikki farq kodlangan, tadqiqot qaydlari manbasi bilan hujjatlagan ikkitasi: taqiladigan zargarlik hisoblanadimi va yaqin qarzlar ayiriladimi. Nisob 85 g oltin yoki 595 g kumush (NZF 87.48 g / 612.36 g ni ham keltiradi); narxlar namuna.\n\nNamuna kirishda to'lanadigan summa 1 409 500 dan 2 592 500 so'mgacha. U brauzerda ishlaydi va hech narsa saqlamaydi. Ulamolar tomonidan **ko'rib chiqilmagan**, fatvo bermaydi va yozma ko'rik ijobiy bo'lmaguncha chiqarilmaydi.",
      check: {
        q: "Kirish bir xil, lekin Hanafiy ustunida sof 103.7 million, boshqalarida 56-64 million. Nega?",
        options: [
          "Yaxlitlash farqi",
          "Hanafiy ustuni taqiladigan 28 g zargarlikni hisoblaydi (namuna narxda 47.32 million); boshqalari uni ozod qiladi",
          "Hanafiy ustuni oltin nisobini ishlatadi",
        ],
        answer: 1,
        why: "Tadqiqot qaydlarida Hanafiy mazhabida barcha zargarlik hisoblanishi, boshqalarida esa muntazam taqiladigan zargarlik ozod qilinishi yozilgan. Ustunlarni yonma-yon, har qatorda sababi bilan ko'rsatish maqsadning o'zi: kalkulyator birini tanlash o'rniga farqlarni tushuntiradi.",
      },
      fields: {
        nisab: "Chegara. Demo standart holatda kumush bilan solishtiradi; oltin almashtirgichda.",
        Hanafi: "Hanafiy: barcha zargarlikni hisoblaydi va yaqin qarzlarni ayiradi.",
        Shafi: "Shofeiy: taqiladigan zargarlikni ozod qiladi; bu modelda qarz ayirmaydi.",
        Maliki: "Molikiy: taqiladigan zargarlikni ozod qiladi; yaqin qarzlarni ayiradi.",
        Hanbali: "Hanbaliy: bu yerda Molikiy bilan bir xil ikki qoida, shuning uchun bir xil raqam.",
      },
    },
    encoding: {
      short: "Barg",
      title: "Bargga nima kirishi xavfsizlik qarori",
      body: "Har yozuv hashlashdan oldin `[id, date, cat, dir, amount]` JSON massivi sifatida kodlanadi. Shuning uchun hisobot ko'rsatadigan har maydon, yo'nalish ham, ildizga bog'lanadi, JSON qo'shtirnoqlari esa kodlashni injektiv qiladi: ikki xil yozuv hech qachon bir xil bayt bera olmaydi.\n\n`serialize()` jurnal saqlay olmaydigan narsani ham rad etadi: satr bo'lmagan maydon yoki manfiy bo'lmagan xavfsiz butun son bo'lmagan summa. Pul butun so'mlarda hisoblanadi, hech qachon suzuvchi nuqtada emas.",
      fields: {
        dir: "Kirim yoki chiqim. Usiz xayriya sezdirmay xarajatga aylanishi mumkin edi.",
        amount: "Butun so'm soni, ko'pi bilan 2^53 - 1.",
        "0x00": "Barg prefiksi, RFC 9162 dagidek.",
      },
    },
    tree: {
      short: "Daraxt",
      title: "Daraxt: domen ajratish va takrorlanadigan barg yo'q",
      body: "Ichki tugunlar `SHA-256(0x01 || left || right)`, barglar `0x00` ishlatadi. Test to'plami klassik soxtalashtirish, ichki tugunni barg qilib ko'rsatish, oddiy SHA-256 da ishlashini va bu daraxtda yiqilishini ko'rsatadi.\n\nToq o'lchamli daraxt oxirgi bargini nusxalash o'rniga n dan kichik eng katta ikki darajasida bo'linadi, shuning uchun `[a,b,c]` va `[a,b,c,c]` ning ildizi har xil: CVE-2012-2459 kabi noaniqlik yo'q. Bo'sh daraxt hech narsaning SHA-256 hashi, 1 dan 8 gacha o'lchamlar ildizi esa e'lon qilingan RFC 6962 vektorlariga mos.",
      check: {
        q: "Nega ba'zi Merkle daraxtlaridagidek toq darajani oxirgi tugunni nusxalab to'ldirmaslik kerak?",
        options: [
          "Nusxalash sekinroq",
          "Unda [a,b,c] va [a,b,c,c] bir ildizga ega bo'ladi, ya'ni hisobotni qo'shimcha takroriy yozuv bilan ko'rsatsa ham mos chiqadi",
          "RFC 9162 toq daraxtlarni taqiqlaydi",
        ],
        answer: 1,
        why: "Oxirgi tugunni takrorlash ikki xil ro'yxatni bitta ildizga hashlaydi, Bitcoin'dagi CVE-2012-2459 ortidagi xato shu. Ikki darajasida bo'lish har ro'yxatga o'z ildizini beradi.",
      },
      fields: {
        "0x01": "Ichki tugun prefiksi: tugun hech qachon barg bo'lib o'ta olmaydi.",
        split: "O'lchami ikki darajasi bo'lmagan daraxtlar uchun RFC 9162 qoidasi.",
        "empty tree": "Aniqlangan, yiqilmaydi: dastlabki versiya cheksiz rekursiyaga tushardi (F2 topilmasi).",
        path: "Chegaradan tashqari yoki butun bo'lmagan indeks boshqa bargning yo'lini qaytarish o'rniga xato beradi (F3).",
      },
    },
    seal: {
      short: "Muhr",
      title: "Ildizni vaqtda muhrlash",
      body: "Oy yopilganda uning ildizi singil loyiha Muhr'ning umumiy yadrosi orqali ochiq OpenTimestamps kalendarlariga, bir necha soatdan keyin esa Bitcoin blokiga borishi rejalashtirilgan. Hisobot sahifasi shu vaqt chizig'ini ko'rsatadi: oy yopildi, ildiz kalendarga yuborildi (biri ishlamasa boshqasiga qayta urinadi), blok bilan tasdiqlandi. Shaffof'da BTC yo'q; to'lovni kalendarlar qiladi.\n\nHisobotni jamg'arma, oy, ildiz, hashlash qoidasi va barcha yozuvlar bilan JSON qilib yuklab olish mumkin, shunda istalgan odam daraxtni noldan qayta quradi.",
      check: {
        q: "Oy ildizi Bitcoin blokida tasdiqlandi. Bu nimani isbotlaydi?",
        options: [
          "Har yozuv to'g'ri ekanini",
          "Aynan shu yozuvlar ro'yxati o'sha vaqtda mavjud bo'lgani va o'shandan beri o'zgarmaganini",
          "Pul oilalarga yetganini",
        ],
        answer: 1,
        why: "Muhr butunlik va vaqtni isbotlaydi, haqiqatni emas. Jamg'arma yolg'on yozuvni ham muhrlashi mumkin. Shuning uchun reja hisobotni bank ko'chirmasi bilan solishtirishni aytadi, sayt ham uch tilda shuni aytadi.",
      },
      fields: {
        fund: "Hisobotni qaysi jamg'arma e'lon qilgan.",
        month: "Bu ildiz muhrlaydigan davr.",
        rfc: "Hashlash qoidasi faylga yozilgan, tekshiruvchi taxmin qilmaydi.",
        entries: "Barcha yozuvlar, tartibda: daraxtni qayta qurishga yetarli.",
        Muhr: "Shaffof jurnal va muhrlash yadrosini qayta ishlatadigan singil loyiha.",
      },
    },
    limits: {
      short: "Chegaralar",
      title: "Shaffof hech qachon qilmaydigan narsalar",
      body: "Reja hech qanday koddan oldin nima qilinmasligini sanab o'tadi. Pul yo'q: Shaffof hech qachon mablag' yig'maydi, saqlamaydi va o'tkazmaydi. Kripto to'lov ham, token ham yo'q: muhrlash faqat hashni vaqtga bog'laydi. Xayriyachi ismlari, reyting, \"eng saxiy\" jadvali yo'q: hatto anonim ochiq hisobotlar riyo (xayriyada ko'z-ko'z qilish) xavfini tug'diradimi, bu savol ulamolarga berilgan. Fatvo yo'q.\n\nMuhr o'z chegarasini ham halol aytadi: u hisobot e'lon qilingandan beri o'zgarmaganini ko'rsatadi, to'g'ri ekanini emas. Bank ko'chirmasi bilan solishtirish auditor ishi bo'lib qoladi.",
      fields: {
        money: "Loyihani to'lov va mablag' yig'ish tartibga solinishidan tashqarida saqlaydi.",
        names: "Maxfiylik va riyo: ismlar hech qachon chiqmaydi; demo'da yangi kvitansiya raqamlari tasodifiy.",
        fatwa: "Kalkulyator usullar va manbalarni ko'rsatadi; tanlov foydalanuvchi va uning olimida qoladi.",
        truth: "Butunlik to'g'rilik emas.",
      },
    },
    stack: {
      short: "Stek",
      title: "Rejadagi stek va sabablari",
      body: "Jurnal .NET va PostgreSQL'da rejalashtirilgan, UPDATE va DELETE huquqlari olib tashlangan, shunda faqat qo'shish qoidasini ma'lumotlar bazasining o'zi majburlaydi. Merkle hashlash RFC 9162 ga amal qiladi; keyinroq Merkle sum tree istalgan odamga yozuvlarnigina emas, jami summalarni ham tekshirish imkonini beradi. Muhrlash Muhr yadrosini qayta ishlatadi, shuning uchun Shaffof'ga o'z blokcheyn kodi kerak emas.\n\nKalkulyator hech narsa saqlamaydigan statik oflayn veb ilova; Telegram bot `/zakot` va kvitansiya tekshiruvini beradi. Tartib: avval Muhr, keyin Sanad, keyin ulamolar ko'rigi qaytgach Shaffof. Kalkulyator va kichik jamg'armalar uchun bepul; xayriyadan ulush olish abadiy istisno qilingan.",
      fields: {
        ledger: "Faqat qo'shish kod bilan emas, ma'lumotlar bazasi huquqlari bilan.",
        "sum tree": "Har tugun o'z ostidagi yig'indini ham saqlaydi, shunda jami summalar isbotlanadi.",
        calculator: "Oflayn va saqlashsiz: sizib chiqadigan narsa yo'q.",
        order: "Avval umumiy yadro; Shaffof uni qayta ishlatadi.",
      },
    },
    pipeline: {
      short: "Pipeline",
      title: "Pipeline: singillaridagi darvozalar va qattiqroq tekshiruvchi",
      body: "Shaffof Wonmor pipeline'idan foydalanadi: har pull request'da `build` job'i (sayt tekshiruvchisi, REUSE, nol ogohlantirishli ESLint, unit va fast-check property testlari, production CSP ostida Chromium end-to-end testlari, birlashtirilgan coverage darvozasi) va `main` da forced-command deploy, atomar symlink almashtirish, jonli SHA tekshiruvi, smoke test va rollback bilan.\n\nCSP'dan `unsafe-inline` olib tashlanganda uning `check-site` i bir qadam oldinga ketdi: u skriptlar yasaydigan markup'dagi style atributlarida va SHA-256 i CSP'da yo'q SVG `<style>` ida ham yiqiladi, shunda favicon'ning ruxsat etilgan yagona uslubi siljib keta olmaydi.",
      fields: {
        "check-site": "Biror narsa e'lon qilinishidan oldingi statik tekshiruvlar.",
        sha256: "Favicon'ning qorong'i mavzu uslubiga aniq hashi bilan ruxsat berilgan, tekshiruvchi ularni moslab turadi.",
        "fast-check": "Tasodifiy kirishli property testlar; ular haqiqiy xato topdi (tarmoqqa qarang).",
        rollback: "Deploy'dan keyingi tekshiruvlar yiqilsa avtomatik.",
      },
    },
    release: {
      short: "Reliz",
      title: "Relizlar va dalillar",
      body: "`v0.1.0` dan boshlab relizlar faqat bosh sahifa arxivlari: ikki marta yig'ilib baytma-bayt solishtiriladi, SHA256SUMS va istalgan odam `gh attestation verify` bilan tekshiradigan Sigstore provenance bilan. Ular mahsulot relizi emas, README buni aytadi.\n\nShaffof OpenSSF Best Practices silver nishoniga ega (16670-loyiha) va har hafta Scorecard yurgizadi; sayti Mozilla Observatory va SSL Labs'da A+.",
      fields: {
        cmp: "Takrorlanuvchanlik tekshiruvi: ikki build bir xil bo'lishi shart.",
        Sigstore: "Workflow identifikatori bilan imzolangan provenance.",
        "16670": "Loyihaning OpenSSF Best Practices yozuvi.",
      },
    },
    recap: {
      short: "Xulosa",
      title: "Xulosa",
      body: "1) Shaffof pulga hech qachon tegmaydi; u faqat qo'shiladigan jurnal yuritadi va har oy Merkle ildizini muhrlaydi. 2) Xayriyachi brauzeri ildizni qayta hisoblaydi, shuning uchun keyingi har tahrir nomuvofiqlik bo'lib ko'rinadi. 3) Kvitansiya raqami log2 n hashli kiritilganlik isbotini beradi, uni o'sha merkle.js bilan Node'da, bizning serverimizsiz tekshirish mumkin. 4) Xatolar teskari yozuv bilan tuzatiladi; hech narsa tahrirlanmaydi va o'chirilmaydi. 5) Barglar ko'rsatilgan har maydonni JSON massiv qilib kodlaydi; 0x00 va 0x01 prefikslari hamda ikki darajasida bo'lish klassik Merkle tuzoqlarini yopadi. 6) Muhr \"shundan beri o'zgarmagan\" ni isbotlaydi, \"to'g'ri\" ni hech qachon. 7) Zakot kalkulyatori to'rt usulni manbalari bilan solishtiradi, fatvo bermaydi va ulamolarning yozma ko'rigini kutadi. 8) Pipeline Muhr va Sanad bilan umumiy: testlangan, rollback'li, takrorlanuvchan, OpenSSF silver.",
    },
  },
  scenarios: {
    direction: {
      label: "Yo'nalish yo'q",
      steps: {
        "dir-gap": {
          short: "Teshik",
          title: "Xayriya bir xil ildiz bilan xarajatga aylana olardi",
          body: "2026-11-14 dagi xavfsizlik ko'rigi birinchi demo'da F1 topilmasini topdi. Barglar `id|date|cat|amount` qilib qurilardi. Yo'nalish, kirim yoki chiqim, unda yo'q edi: 1 200 000 so'mlik xayriyani 1 200 000 so'mlik xarajatga aylantirish o'sha bargni va o'sha ildizni saqlardi, bu sahifaning o'zi aytgan \"har o'zgarish ko'rinadi\" degan da'voga zid.\n\nBundan ham yomoni, `|` bilan ulash injektiv emas: `\"A|2026\", \"x\"` va `\"A\", \"2026|x\"` ikkalasi ham `A|2026|x` bo'ladi.",
          check: {
            q: "Bu xato qaysi umumiy qoidani buzdi?",
            options: [
              "Uzunroq hash ishlatish",
              "O'quvchi tayanadigan har maydonni, har xil kirishlar hech qachon bir xil bayt bermaydigan kodlashda hashlash",
              "Hashlashdan oldin yozuvlarni saralash",
            ],
            answer: 1,
            why: "Merkle daraxti aynan siz qo'ygan baytlarni himoya qiladi. Ko'rsatilgan, lekin hashlanmagan maydon himoyasiz, noaniq kodlash esa ikki xil yozuvga bitta hashni bo'lishishga imkon beradi.",
          },
          fields: {
            direction: "Sahifada ko'rsatilgan, hashda yo'q.",
            "same root": "Tahrir isbotga ko'rinmasdi.",
            "one encoding": "Ikki xil yozuv, bir xil baytlar.",
          },
        },
        "dir-fix": {
          short: "Tuzatish",
          title: "Ko'rsatilgan har maydonning JSON massivi",
          body: "Yozuvlar endi JSON qo'shtirnoqlari bilan `[id, date, cat, dir, amount]` qilib kodlanadi, shuning uchun yo'nalish bog'langan va hech ikki yozuv bir kodlashni bo'lishmaydi. Satr bo'lmagan maydonlar va manfiy bo'lmagan xavfsiz butun son bo'lmagan summalar rad etiladi.\n\nTestlar qo'riqlaydi: \"entry encoding\" aniq baytlarni va in/out almashtirish ularni o'zgartirishini tekshiradi, \"tampering is detected\" esa summa, yo'nalish, id, qo'shni hash va tomonni o'zgartirib, har safar isbot yiqilishini kutadi.",
          fields: {
            dir: "Endi barg ichida.",
            injective: "Har xil kirish, har xil bayt, doim.",
            "tampering is detected": "Yozuv va isbotni tahrirlab, har tekshiruv yiqilishini kutadigan test.",
          },
        },
      },
    },
    "no-text": {
      label: "Fuzzing yiqilishni topadi",
      steps: {
        "fuzz-hit": {
          short: "Yiqilish",
          title: "Tasodifiy kirish summa maydonini buzadi",
          body: "OpenSSF Scorecard'ning \"Fuzzing\" balini ko'tarish uchun loyiha sof funksiyalarga yuzlab tasodifiy qiymat otadigan fast-check property testlarini qo'shdi. Biri `parseAmount` uchun qarshi misol topdi: `toString` i funksiya bo'lmagan obyekt saqlovchi massiv. Unga `String()` TypeError tashlaydi, shuning uchun bosh sahifa demosining summa tahlilchisi kirishni bo'sh deb qabul qilish o'rniga yiqilardi.\n\nHech bir foydalanuvchi buni formaga yozmaydi, lekin funksiya shartnomasi \"istalgan narsa kiradi, raqamlar chiqadi\" edi va u shu shartnomani buzdi.",
          fields: {
            counterexample: "fast-check qisqartirib bergan eng kichik yiqituvchi kirish.",
            TypeError: "String() bu qiymatni matnga aylantira olmaydi.",
          },
        },
        "fuzz-fix": {
          short: "Tuzatish",
          title: "Matn shakli yo'q qiymatni bo'sh deb ol va testni saqla",
          body: "6ee4e30 commit'i (PR #11 bilan 2026-11-14 da birlashtirilgan) bosh sahifa demosining `demo-core.js` idagi aylantirishni try/catch ichiga oladi va qarshi misolni doimiy regression test qilib qo'shadi. Muhr'ning hash solishtiruvida ham o'sha `String(raw)` shakli bor edi va u ham xuddi shunday tuzatildi, bu uning changelog'ida yozilgan.\n\nPipeline uchun saboq: property testlar qo'lda yozilgan misollar o'tkazib yuborgan haqiqiy chekka holatni topdi, allaqachon qator coverage darvozasi ostidagi kodda. Yuqori coverage qaysi qatorlar ishlaganini ko'rsatadi, qaysi kirishlar sinalganini emas.",
          fields: {
            try: "Aylantirish endi xato tashlay olmaydi.",
            "regression test": "Aynan o'sha qarshi misol, endi doimiy test.",
          },
        },
      },
    },
    favicon: {
      label: "Favicon va CSP",
      steps: {
        "csp-gap": {
          short: "Teshik",
          title: "Footer'dagi ikki uslub butun CSP'ni bo'sh tutardi",
          body: "Birinchi CSP `style-src 'unsafe-inline'` ga faqat footer'dagi ikkita `style` atributi uchun ruxsat berardi; assurance case buni qoldiq xavf deb yozgan (#7 issue). Bu ikkitasini klasslarga ko'chirish butun ish bo'lib ko'rindi.\n\nUnday emas edi: faqat `style-src 'self'` bilan favicon chizig'ini yo'qotdi, chunki SVG ichida qorong'i mavzu uchun ranglarni almashtiradigan kichik `<style>` bloki bor. Qattiq CSP hech kim kod deb o'ylamaydigan faylni jimgina buzdi.",
          fields: {
            "unsafe-inline": "Kiritilgan har qanday uslubni ishga tushiradigan bitta ruxsat.",
            favicon: "O'z <style> i bor SVG: qattiq CSP uni har qanday inline uslub kabi bloklaydi.",
          },
        },
        "csp-fix": {
          short: "Tuzatish",
          title: "Favicon'ga hash bilan ruxsat ber, siljishni build xatosiga aylantir",
          body: "PR #23 footer uslublarini `site.css` ga ko'chirdi va aynan favicon uslub blokiga uning SHA-256 hashi bilan ruxsat berdi. Blok o'zgargan zahoti hash buziladi, shuning uchun `check-site` endi har SVG `<style>` ini hashlaydi va CSP uni sanamasa, qo'shilishi kerak hashni chiqarib yiqiladi.\n\nPR'ning salbiy testi favicon'ni tahrirlab, tekshiruvchi shu xabar bilan yiqilishini ko'radi; yangi CSP ostida favicon rangini saqlaydi va konsolda nol xato.",
          fields: {
            sha256: "Umuman inline uslublarga emas, bitta aniq blokka ruxsat beradi.",
            "check-site": "Har yurganda hashni qayta hisoblaydi, shunda CSP va favicon bir-biridan ajrab keta olmaydi.",
            "0 console errors": "Production CSP ostida lokal Chromium'da tekshirilgan.",
          },
        },
      },
    },
  },
};

export default text;
