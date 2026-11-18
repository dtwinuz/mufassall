import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Keshni yangilash (invalidation)",
  summary:
    "Akkaunt API har bir akkauntning tarifini bazadan oldin turgan keshda saqlaydi. Faqat TTL bilan to'lov qilgan mijoz o'n daqiqagacha eski tarifda qoladi. Yozuvdan keyin kalitni o'chirish odatiy holatni hal qiladi, lekin poyga qoladi: o'chirishdan keyin keshga eski qiymat qayta yoziladi. Ikki marta o'chirish, lease va baza o'zgarishlar jurnalidan invalidatsiya bu bo'shliqlarni birma-bir yopadi. O'qish tomonida esa issiq kalit bitta so'rov uni yangilayotgan paytda eski qiymat bilan beriladi, mavjud bo'lmagan qatorlar ham keshlanadi.",
  learn: [
    "Nega TTL ma'lumot qancha vaqt noto'g'ri bo'lishini cheklaydi-yu, uni to'g'ri qilmaydi, va yozuvdan keyin o'chirish yangi qiymatni keshga yozishdan nimasi bilan farq qiladi",
    "Sekin o'quvchi bilan yozuvchi o'rtasidagi poyga, o'chirishdan keyin keshda eski qiymat qolishi va uni yopishning uch yo'li: ikki marta o'chirish, versiya, lease",
    "Baza o'zgarishlar jurnalidan (CDC) invalidatsiya: API'ni chaqirmaydigan yozuvchilar ham keshni eskirtirib qo'ya olmaydi",
    "Issiq kalit uchun jitter bilan stale-while-revalidate va hech narsa topmaydigan so'rovlar uchun negativ keshlash",
  ],
  nodes: {
    app: "Veb-ilova",
    api: "Akkaunt API",
    cache: "Kesh",
    db: "Akkauntlar bazasi",
    batch: "Billing job",
    cdc: "CDC worker",
  },
  metrics: {
    stale: "Keshga eski qiymat yozilishi",
    age: "Eng uzun eskirish oynasi",
    dbreads: "Bazadan o'qish",
    hit: "Keshga tushish ulushi",
    p99: "p99 kechikish",
  },
  steps: {
    setup: {
      short: "Boshlanish",
      title: "Har bir akkaunt tarifi o'n daqiqaga keshlangan",
      body: "Veb-ilovaning har bir sahifasi akkaunt API'dan akkaunt qaysi tarifda ekanini so'raydi: soniyasiga 15 000 o'qish. API **cache-aside** ishlatadi: avval keshga qaraydi, topilmasa bazadan o'qiydi va javobni 600 s TTL bilan saqlaydi.\n\nO'qishlarning 94% i keshga tushadi, baza soniyasiga atigi 900 ta o'qishni ko'radi. Bu darsning savoli: tarif o'zgarganda nima bo'ladi?",
      fields: {
        "X-Cache": "Bu javob bazadan emas, keshdan keldi.",
        Age: "Keshdagi nusxa 212 s oldin olingan. U 600 s gacha eski bo'lishi mumkin.",
        plan: "Mijoz qaysi imkoniyatlarni olishini hal qiladigan qiymat.",
        seats: "Tarif bilan birga keshlangan, demak u bilan birga eskiradi.",
      },
    },
    "ttl-only": {
      short: "Faqat TTL",
      title: "Mijoz to'ladi, kesh esa hali ham Free deydi",
      body: "Soat 10:00 da 4821-akkaunt Pro'ga o'tadi va baza commit qiladi. Keshga hech kim aytmaydi, shuning uchun keyingi 9 daqiqa 48 soniya davomida har bir sahifa hali ham `free` deydi, mijoz pulini to'lagan imkoniyatlar esa yopiqligicha qoladi.\n\nKuniga 2 400 ta tarif o'zgarishi bo'lsa, bu kuniga 2 400 mijoz o'n daqiqagacha noto'g'ri tarifni ko'radi degani.",
      watch: "TTL kesh qanchalik noto'g'ri bo'lishi mumkinligining chegarasi, uni to'g'ri saqlash usuli emas.",
      check: {
        q: "TTL'ni shunchaki 5 soniya qilib qo'ysa-chi?",
        options: [
          "Muammo hal bo'ladi: 5 soniyani hech kim sezmaydi, boshqa hech narsa o'zgarmaydi",
          "Har bir kalit har 5 s da qayta yuklanadi: keshga tushish 94% dan taxminan 40% ga tushadi, baza yuki taxminan o'n barobar oshadi, ma'lumot esa baribir 5 s gacha eski",
          "Kesh kalitlarni bir daqiqadan kam saqlay olmaydi",
        ],
        answer: 1,
        why: "TTL yangilikni yuk evaziga almashtiradi. Har soniyada o'qiladigan, lekin oyiga ikki marta o'zgaradigan kalit 5 s lik TTL'dan ortiqcha baza o'qishidan boshqa deyarli hech narsa olmaydi. Yechim: ma'lumot o'zgarganda keshga aytish, TTL esa sug'urta sifatida qoladi.",
      },
      fields: {
        COMMIT: "Shu daqiqadan bazada yangi tarif bor.",
        TTL: "Eski nusxa yana qancha yashaydi. U kamayib boradi, uni hech narsa qayta boshlamaydi.",
        expired: "Faqat endi o'quvchi bazaga boradi va `pro` ni oladi.",
        "Pro features": "Allaqachon pul to'lagan mijoz uchun o'n daqiqa kechikish.",
      },
    },
    delete: {
      short: "O'chirish",
      title: "Commit'dan keyin kalitni o'chir",
      body: "Endi API tranzaksiya commit bo'lishi bilan kalitni o'chiradi. Keyingi o'quvchi keshda topolmaydi, yangi qatorni o'qiydi va keshni qayta to'ldiradi. Eskirish oynasi 600 s dan bir necha millisoniyagacha qisqaradi.\n\nNega yangi qiymatni yozmasdan (**write-through**), o'chirish kerak? A va keyin B ni commit qilgan ikki yozuvchi o'z `SET` larini B, keyin A tartibida yuborishi mumkin, kesh esa A ni abadiy saqlab qoladi. O'chirish hech qanday qiymat olib yurmaydi, shuning uchun ikki o'chirish istalgan tartibda bir xil natija beradi.",
      watch: "Commit'dan keyin o'chir, hech qachon oldin emas: erta o'chirish bilan commit orasida o'quvchi eski qatorni yuklab, keshga qaytarib qo'yishi mumkin.",
      fields: {
        version: "Har bir o'zgarish uni oshiradi. Birozdan keyin kerak bo'ladi.",
        COMMIT: "Yangi tarif saqlandi. Faqat endi keshga tegish xavfsiz.",
        DEL: "Kalitni olib tashla. Keyingi o'quvchi uni bazadan quradi.",
        misses: "Har bir o'zgarishga bitta ortiqcha baza o'qishi: arzon.",
      },
    },
    race: {
      short: "Poyga",
      title: "Sekin o'quvchi eski qiymatni qayta yozadi",
      body: "R o'quvchi keshda topolmaydi va qatorni u hali `free` bo'lgan paytda o'qiydi. Keyin R garbage collection pauzasida 180 ms to'xtab qoladi. Shu orada W yozuvchi `pro` ni commit qiladi va kalitni o'chiradi, kalit esa hali yo'q. R uyg'onadi va o'qiganini saqlaydi: `free`, 600 s ga.\n\nHar bir qadam qoidaga muvofiq edi. Bu kam bo'ladi, bu yerda kuniga 40 marta atrofida, lekin har safar kesh to'liq TTL davomida noto'g'ri. TTL bo'lmaganda esa abadiy noto'g'ri bo'lardi.",
      check: {
        q: "W kalitni commit'dan keyin, aynan qoidadagidek o'chirdi. Nega kesh baribir noto'g'ri?",
        options: [
          "W kalitni commit'dan oldin o'chirishi kerak edi",
          "R qatorni commit'dan oldin o'qidi va o'chirishdan keyin yozdi: o'chirish R'ning yozuvidan oldin keldi",
          "Kesh o'chirish buyrug'ini yo'qotdi",
        ],
        answer: 1,
        why: "O'chirish faqat shu daqiqada keshda bor narsani olib tashlaydi. R'ning qiymati hali yo'lda edi: commit'dan oldin o'qilgan, o'chirishdan keyin yozilgan. Commit'dan oldin o'chirish oynani kichraytirmaydi, kattalashtiradi.",
      },
      fields: {
        miss: "R bazaga borishga majbur.",
        "old row": "Commit hali bo'lmagan, shuning uchun R `free` ni oladi.",
        "GC pause": "Har qanday kechikish xuddi shunday ishlaydi: GC pauzasi, sekin tarmoq, qayta urinish.",
        COMMIT: "W `pro` ni yozadi.",
        "(integer) 0": "O'chiradigan narsa yo'q: R hali yozmagan.",
        SET: "Eski qiymat o'chirishdan keyin, yangi 600 s lik TTL bilan tushadi.",
      },
    },
    "double-delete": {
      short: "Ikki o'chirish",
      title: "Birozdan keyin yana o'chir",
      body: "Arzon yechim: birinchi o'chirishdan keyin yozuvchi 500 ms dan so'ng ikkinchisini rejalashtiradi. Agar sekin o'quvchi oraliqda eski qiymatni qaytarib qo'ygan bo'lsa, ikkinchi o'chirish uni olib tashlaydi.\n\nKeshga eski qiymat yozilishi kuniga 40 dan 3 ga tushadi. Oyna torroq bo'ldi, lekin yopilmadi: 500 ms dan sekinroq o'quvchi baribir yutadi. API replikadan o'qisa, kechikish replikatsiya lagidan ham uzunroq bo'lishi kerak.",
      fields: {
        "schedule DEL": "Kechiktirilgan job yoki taymer. Jarayon u ishga tushishidan oldin o'lsa, ikkinchi o'chirish yo'qoladi.",
        "(integer) 1": "Bu safar o'chiradigan narsa bor edi: R'ning eski qiymati.",
        "slower than 500 ms": "Ikki marta o'chirish o'quvchi qanchalik sekin bo'lishini taxmin qiladi. Ba'zan taxmin xato chiqadi.",
        "3/day": "Yaxshiroq, lekin har safar baribir to'liq TTL davomida noto'g'ri ma'lumot.",
      },
    },
    lease: {
      short: "Lease",
      title: "Lease: kesh kutmagan to'ldirishni rad etadi",
      body: "**Lease** bilan keshda topilmaslik token qaytaradi. To'ldirish faqat hali amal qilayotgan token bilan qabul qilinadi, kalitni o'chirish esa barcha ochiq tokenlarni bekor qiladi. R'ning kech yozuvi 7731-tokenni olib keladi, uni W'ning o'chirishi bekor qilgan, shuning uchun yozuv rad etiladi. Keyingi o'quvchi yangi token oladi va `pro` ni yuklaydi.\n\nLease yana bir muammoni hal qiladi: bitta o'quvchi tokenni ushlab turganda boshqa o'quvchilar hammasi birdan bazaga bormaydi, bir necha millisoniya kutadi yoki eski qiymatni oladi.\n\nLease'siz keshda xuddi shu natijani versiyalar beradi: yozuvchi o'chirish o'rniga yangi versiyani qoldiradi, eskiroq versiyali to'ldirish esa rad etiladi.",
      watch: "Versiya tekshiruvi faqat yozuvchi o'z versiyasini keshda qoldirsagina ishlaydi. Oddiy o'chirishdan keyin solishtiradigan narsa qolmaydi va eski to'ldirish qabul qilinadi.",
      fields: {
        "lease 7731": "Bu kalitni to'ldirish huquqi, topilmaslik bilan birga beriladi.",
        invalidated: "O'chirish tokenni bekor qiladi: R o'qigan narsa endi shubhali.",
        NOT_STORED: "R'ning eski qiymati 600 s yashash o'rniga rad etiladi.",
        STORED: "O'zgarishdan keyin boshlangan o'quvchi kalitni `pro` bilan to'ldiradi.",
        "wait 10 ms": "Qolganlar bazaga bir vaqtda urilmaydi.",
      },
    },
    bypass: {
      short: "Aylanib o'tish",
      title: "API'ni hech qachon chaqirmaydigan yozuvchi",
      body: "Har kecha soat 02:00 da billing job to'lov muddati tugagan akkauntlarni pastroq tarifga tushiradi: bitta `UPDATE` da 1 900 qator. U to'g'ridan-to'g'ri bazaga yozadi va kesh haqida umuman bilmaydi.\n\nTTL tugaguncha to'lamagan 1 900 mijoz Pro imkoniyatlaridan foydalanishda davom etadi. SQL konsolda qo'lda kiritilgan tuzatish, migratsiya yoki jadvalni bo'lishadigan boshqa servis ham xuddi shunday qiladi.",
      fields: {
        UPDATE: "Bitta buyruq, 1 900 akkaunt.",
        paid_until: "Biznes qoidasi: to'lanmagan tarif Free'ga qaytadi.",
        "UPDATE 1900": "Keshdagi 1 900 ta tarif endi noto'g'ri.",
        "no DEL": "Faqat API kodida yashaydigan invalidatsiya faqat API orqali o'tgan yozuvlarni qamraydi.",
      },
    },
    cdc: {
      short: "CDC",
      title: "Baza o'zgarishlar jurnalidan invalidatsiya",
      body: "**CDC** worker bazaning o'zgarishlar jurnalini o'qiydi. `accounts` dagi har bir commit qilingan o'zgarish, uni kim qilganidan qat'i nazar (API, billing job yoki konsol), commit'dan taxminan 40 ms keyin chiqib keladi. Worker jadvalni uning kalitlariga moslaydi va ularni o'chiradi.\n\nAPI o'z o'chirishini saqlab qoladi, shunda mijoz o'z o'zgarishini darhol ko'radi. Qolgan hammasini CDC ushlaydi. U xuddi o'sha o'chirishlarni ishlatadi, demak sekin o'quvchilarga qarshi unga ham o'sha lease yoki versiya tekshiruvi kerak.",
      watch: "Worker jurnaldagi offset'ini faqat o'chirish muvaffaqiyatli bo'lgandan keyin commit qiladi. Aks holda muvaffaqiyatsiz o'chirish butunlay o'tkazib yuboriladi.",
      fields: {
        op: "`u` bu update. Insert va delete ham xuddi shunday keladi.",
        key: "Qaysi qator o'zgardi: qaysi kesh kalitlarini o'chirishni bilish uchun yetarli.",
        version: "Worker keshda allaqachon bor narsadan eskiroq hodisani o'tkazib yuborishi uchun.",
        committed_at: "Jurnalda faqat commit qilingan o'zgarishlar bor: bekor qilinganlari hech qachon chiqmaydi.",
        "(integer) 2": "Akkauntning tarif kaliti va limitlar kaliti, ikkalasi ham o'chirildi.",
        "41 ms": "Commit'dan o'chirishgacha, billing job'da hech narsani o'zgartirmasdan.",
      },
    },
    "hot-expire": {
      short: "Issiq kalit",
      title: "Hamma bitta qayta qurishni kutadi",
      body: "Har bir so'rov `config:tariffs` ni ham o'qiydi, soniyasiga 18 000 marta. Uning muddati tugaganda coalescing lock o'z ishini qiladi: bitta so'rov kalitni qayta quradi, qolganlari kutadi.\n\nLekin qayta qurish 120 ms oladi. Shu 120 ms davomida 2 160 so'rov navbatda turadi va har o'n daqiqada p99 6 ms dan 140 ms ga sakraydi. Qayta qurayotgan so'rov o'lsa, hamma lock muddati tugashini kutadi.",
      check: {
        q: "Coalescing 18 000 ta baza so'rovini allaqachon bittaga aylantiradi. Yana nima noto'g'ri?",
        options: [
          "Hech narsa: har o'n daqiqada bitta so'rov ideal",
          "Har bir o'quvchi o'sha bitta so'rovni kutadi, shuning uchun har bir muddat tugashi hamma uchun 120 ms to'xtash",
          "Baza bitta so'rovni ko'tarolmaydi",
        ],
        answer: 1,
        why: "Coalescing o'quvchilarni emas, bazani himoya qiladi. Eski qiymat yo'qolgan ekan, har bir o'quvchi yangisini kutishga majbur. Ularga bir soniya oldingi qiymat ham bemalol yarardi.",
      },
      fields: {
        expired: "Kalit yo'q, u esa har bir o'quvchiga kerak.",
        NX: "Lock'ni faqat bitta so'rov oladi va qayta quradi.",
        wait: "Qolganlar yangi qiymatni kutadi.",
        "120 ms": "Qayta qurish sekin, demak kutish uzun.",
        "2 160 requests": "Soniyasiga 18 000 karra 0.12 s, hammasi to'xtab qolgan.",
      },
    },
    swr: {
      short: "Fonda yangilash",
      title: "Bitta so'rov yangilayotganda eski qiymatni ber",
      body: "Endi qiymatning ikki umri bor. `fresh_until` dan (yumshoq TTL, 600 s) keyin ham u darhol beriladi, bitta so'rov esa lock'ni olib, uni fonda qayta quradi. Faqat bir soatlik qattiq TTL'dan keyin u haqiqatan yo'qoladi. Bu **stale-while-revalidate**.\n\nEndi hech kim kutmaydi, p99 6 ms da qoladi. Yumshoq TTL'ga 0 dan 60 s gacha tasodifiy jitter qo'shiladi, shunda birga to'ldirilgan kalitlar bir soniyada yangilanishga muhtoj bo'lmaydi.",
      watch: "Stale-while-revalidate bir necha soniya eskirish mayli bo'lgan ma'lumot uchun. Tarif o'zgarishi esa baribir aniq o'chirish bilan ishlaydi.",
      fields: {
        fresh_until: "Yumshoq TTL. Undan keyin qiymat beriladi, lekin yangilanadi.",
        built_at: "Bu qiymat qachon qurilgan: javob qanchalik eski bo'lganini ko'rsatadi.",
        "answer with this value now": "O'quvchi eski qiymatni kutmasdan oladi.",
        background: "Lock'ni olgan yagona so'rov javob bergandan keyin qayta quradi.",
        jitter: "Har bir kalit o'zining tasodifiy yangilanish vaqtini oladi.",
      },
    },
    negative: {
      short: "Negativ",
      title: "\"Topilmadi\" ni ham keshla",
      body: "Har bir sahifa akkauntning maxsus limitlarini ham so'raydi, akkauntlarning 96% ida esa ular yo'q. Kesh faqat topilgan qatorlarni saqlardi, shuning uchun bu so'rovlar doim keshdan o'tib ketardi: soniyasiga 900 ta baza o'qishining 600 tasi hech narsa topmasdi.\n\nEndi \"none\" ham qisqa, 60 s lik TTL bilan keshlanadi. Keshga tushish 98% ga ko'tariladi, baza o'qishlari soniyasiga 300 taga tushadi.",
      watch: "Xuddi shu usul botlarning tasodifiy id bo'yicha so'rovlaridan ham himoya qiladi. TTL'ni qisqa tut va yangi qator qo'shilganda \"none\" yozuvi o'chirilsin.",
      check: {
        q: "Support 4821-akkauntga soat 09:00 da maxsus limitlar qo'shadi. \"none\" yozuvi 08:59:30 da keshlangan edi. 09:00:10 da akkaunt nimani ko'radi?",
        options: [
          "Yangi limitlarni, darhol",
          "Insert kalitni o'chirmasa, 09:00:30 gacha \"maxsus limit yo'q\"",
          "Xato, chunki keshdagi qiymat bilan baza bir-biriga mos emas",
        ],
        answer: 1,
        why: "Negativ yozuv ham boshqalari kabi keshlangan qiymat. Insert uni update kabi invalidatsiya qilishi shart; CDC worker bilan bu allaqachon bo'ladi, chunki insert ham o'zgarish.",
      },
      fields: {
        "(nil)": "Topilmadi: yo keshlanmagan, yo mavjud emas. Kesh qaysi biri ekanini ajrata olmaydi.",
        "0 rows": "Bazaning javobi \"hech narsa\", va bu javobni ham keshlash foydali.",
        none: "\"Qaradim, hech narsa topilmadi\" degan belgi.",
        "EX 60": "Qisqa: qator invalidatsiyasiz paydo bo'lsa, xato ko'pi bilan bir daqiqa yashaydi.",
        "found nothing": "Baza o'qishlarining uchdan ikkisi mavjud bo'lmagan qatorlarni qidirish edi.",
      },
    },
    recap: {
      short: "Xulosa",
      title: "Xulosa",
      body: "Kesh invalidatsiyasining olti qoidasi.\n\n1) TTL faqat ma'lumot qancha vaqt noto'g'ri bo'lishini cheklaydi; uni sug'urta sifatida qoldir. 2) Yozuvdan keyin kalitni commit'dan so'ng o'chir, yangi qiymatni yozma. 3) Sekin o'quvchi o'chirishdan keyin eski qiymatni qaytarib qo'yishi mumkin: ikki marta o'chirish oynani toraytiradi, lease yoki versiya tekshiruvi uni yopadi. 4) O'zgarishlar jurnalidan invalidatsiya qil, shunda har bir yozuvchi qamraladi, jurnal offset'ini esa faqat o'chirishdan keyin commit qil. 5) Issiq kalitlar uchun bitta so'rov yangilayotganda eski qiymatni ber va TTL'ga jitter qo'sh. 6) \"Topilmadi\" ni qisqa TTL bilan keshla va insert'da uni invalidatsiya qil.",
    },
  },
  scenarios: {
    "event-lost": {
      label: "Yo'qolgan invalidatsiya",
      steps: {
        "lost-drop": {
          short: "Tashlab ketildi",
          title: "Kesh failover qiladi, o'chirishlar o'tkazib yuboriladi",
          body: "14:20 da kesh primary'si failover qiladi, bu 4 s oladi. CDC worker'ning o'chirishlari timeout bilan tugaydi. Uning kodi ogohlantirishni log'ga yozadi, offset'ni commit qiladi va keyingi hodisaga o'tadi.\n\nShu 4 soniyada 260 ta o'zgarish bo'ladi. Ularning invalidatsiyasi butunlay yo'qoladi, eski qiymatlar esa keshda 600 s gacha qoladi.",
          check: {
            q: "O'chirish muvaffaqiyatsiz bo'lsa, worker nima qilishi kerak?",
            options: [
              "Log'ga yozib, davom etish: TTL tozalab qo'yadi",
              "Qayta urinish va o'chirish muvaffaqiyatli bo'lmaguncha offset'ni commit qilmaslik",
              "Har bir xatodan keyin butun keshni tozalash",
            ],
            answer: 1,
            why: "Offset worker'ning undan oldingi hamma narsa bajarildi degan va'dasi. Uni muvaffaqiyatsiz o'chirishdan keyin commit qilish invalidatsiyani butunlay yo'qotadi. Qayta urinish xavfsiz: bitta kalitni ikki marta o'chirish zarar qilmaydi.",
          },
          fields: {
            timeout: "O'chirish bo'lgan-bo'lmagani noma'lum. Worker buni bila olmaydi.",
            "commit offset": "Xato shu yerda: o'chirish o'tmagan bo'lsa ham o'zgarish bajarilgan deb belgilanadi.",
            "260 changes": "Har biri keshda endi to'liq TTL davomida noto'g'ri turadigan qiymat.",
          },
        },
        "lost-retry": {
          short: "Qayta urinish",
          title: "Qayta urin, offset'ni faqat o'chirishdan keyin commit qil",
          body: "Endi worker muvaffaqiyatsiz o'chirishni o'sib boruvchi pauzalar bilan qayta urinadi va offset'ini siljitmaydi. Failover tugagach, navbatdagi 260 ta o'zgarish 0.3 s da qayta o'ynaladi va shundan keyingina offset commit qilinadi.\n\nIntsident davomidagi eng uzun eskirgan o'qish 600 s emas, 6 s. TTL esa hech kim rejalashtirmagan holat uchun joyida turibdi.",
          fields: {
            retry: "O'sib boruvchi pauzalar, shunda worker qaytib kelayotgan keshni bosib tashlamaydi.",
            "NOT committed": "O'chirish o'tmaguncha o'zgarish bajarilmagan hisoblanadi.",
            replay: "Worker o'zgarishlar jurnalini o'z offset'idan yana o'qiydi.",
            "commit offset": "Endi bu rost: undan oldingi hamma narsa invalidatsiya qilingan.",
            harmless: "O'chirish idempotent: takrorlash hech narsani o'zgartirmaydi.",
          },
        },
      },
    },
  },
};

export default text;
