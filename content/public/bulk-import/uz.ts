import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Ommaviy import",
  summary:
    "Ulgurji savdo kompaniyasi tovarlar katalogini CSV fayl qilib yuklaydi: 200 000 qator. Uni so'rov ichida o'qish timeout'ga tushadi, xotirani yeydi va bitta yomon qator uchun hammasini tashlab yuboradi. Buning o'rniga fayl object storage'ga boradi, import job uni oqim bilan o'qiydi, har qatorni tekshirib xatolar hisobotini beradi, qayta ishga tushish va qayta yuklashga chidaydi, qisqa batch'larda yozadi, jarayonni ko'rsatadi va tenant limitlari ichida qoladi.",
  learn: [
    "Nega katta fayl pre-signed URL bilan to'g'ridan object storage'ga boradi va uni web server emas, worker o'qiydi",
    "Qator raqamli har qator tekshiruvi va yuklab olinadigan xatolar hisoboti: qisman muvaffaqiyat oddiy natija",
    "Fayl xeshi bo'yicha takrorni ushlash, har N qatorda checkpoint va asosiy jadvaldagi lock'larni qisqa ushlaydigan batch upsert",
    "UI so'rab turadigan jarayon holati va har tenant uchun fayl hajmi, qatorlar va ishlayotgan job'lar limiti",
  ],
  nodes: {
    client: "Brauzer",
    api: "Ilova API",
    db: "Katalog bazasi",
    storage: "Object storage",
    queue: "Job navbati",
    worker: "Import worker",
  },
  metrics: {
    duration: "Import vaqti",
    imported: "Import qilingan qatorlar",
    memory: "API xotirasi",
    lockwait: "Checkout lock kutishi",
  },
  steps: {
    inline: {
      short: "So'rov ichida",
      title: "Web server yuklangan faylni so'rov ichida o'qiydi",
      body: "Buxgalter eski tizimdan tovarlar katalogini CSV qilib yuklaydi. Ilova API butun faylni so'rovda qabul qiladi, uni o'qiydi va javob berishdan oldin har qatorni katalogga yozadi.\n\n2 000 qator bilan bu 3 soniya oladi va yaxshi ishlaydi. Shu kod endi yuz barobar katta faylga duch keladi.",
      fields: {
        Cookie: "Foydalanuvchi sessiyasi. Shu yerda yashirilgan.",
        "Content-Type": "`multipart/form-data`, brauzerning forma orqali yuklashi: fayl web server orqali o'tadi.",
        "Content-Length": "412 KB. So'rov davomida web server hammasini ushlab turadi.",
        imported: "Hamma qator bir zarbada: hammasi yoki hech narsa.",
      },
    },
    bigfile: {
      short: "Katta fayl",
      title: "200 000 qator: timeout, xotira, bitta yomon qator",
      body: "Endi fayl 41.9 MB, 200 000 qator. API uni to'liq xotiraga o'qiydi, bitta so'rovga 1.9 GB. 60 s dan keyin oldidagi proxy `504` bilan voz kechadi, server esa ishlashda davom etadi. 117 403-qatorda narx `12,5O`: nol o'rniga O harfi, va butun tranzaksiya orqaga qaytariladi.\n\nFoydalanuvchi xatoni ko'radi, 117 402 qator to'g'ri bo'lganini bilmaydi va o'sha faylni yana yuklaydi. Bir vaqtda shunday ikkitasi bo'lsa, serverning xotirasi tugaydi.",
      watch: "Katta faylda yomon qator xavf emas, aniq haqiqat.",
      check: {
        q: "42 MB lik fayl qayerga borishi va uni kim o'qishi kerak?",
        options: [
          "Proxy timeout'ini 10 daqiqaga oshirish",
          "Brauzerdan to'g'ridan object storage'ga; u yerdan fondagi worker o'qiydi",
          "Brauzerda bo'lib, API'ga 200 ta so'rov yuborish",
        ],
        answer: 1,
        why: "Web server baytlarni umuman tashimasligi kerak. API qisqa muddatli yuklash URL'ini beradi, brauzer faylni to'g'ridan object storage'ga qo'yadi, import job esa uni keyin o'z tezligida o'qiydi, hech qaysi so'rov uni kutmaydi.",
      },
      fields: {
        "in memory": "Butun fayl va o'qilgan hamma qatorlar bir vaqtda API jarayonida.",
        "504": "Proxy kutishni to'xtatdi. Uning ortida import hali ishlayotgan bo'lishi mumkin.",
        "not a number": "Bitta katakdagi bitta xato.",
        ROLLBACK: "Hammasi yoki hech narsa bitta yomon katakni nol import qilingan qatorga aylantiradi.",
        again: "O'sha og'ir so'rovning ikkinchi nusxasi.",
      },
    },
    presign: {
      short: "Pre-signed",
      title: "To'g'ridan object storage'ga yuklash",
      body: "Brauzer avval API'dan yuklash URL'ini so'raydi. API bitta obyekt uchun 15 daqiqa amal qiladigan URL imzolaydi, brauzer faylni to'g'ridan object storage'ga yuboradi. API baytlarni umuman ko'rmaydi, uning xotirasi yana 180 MB.\n\nBrauzer faylni o'qiyotganda uning SHA-256 xeshini ham hisoblaydi, storage esa kelganda uni tekshiradi. Buzilgan yuklash 150 000-qatorda emas, shu yerda ushlanadi.",
      watch: "Pre-signed URL bir necha daqiqaga faqat bitta obyektning kaliti. Hech qachon butun bucket'ni yoki uzoq muddatni imzolamang.",
      fields: {
        expires: "900 s. Undan keyin URL sizib chiqsa ham keraksiz.",
        sig: "Yo'l, metod va muddat ustidan imzo. Shu yerda yashirilgan.",
        "Content-Length": "41.9 MB API'ga emas, storage'ga boradi.",
        "x-content-sha256": "Fayl xeshi. Baytlar mos kelmasa, storage yuklashni rad etadi.",
        ETag: "Storage nimani saqlaganini tasdiqlaydi.",
      },
    },
    job: {
      short: "Job",
      title: "Import job va faylni oqim bilan o'qiydigan worker",
      body: "Brauzer API'ga aytadi: shu faylni import qil. API job yozuvini yaratadi, uni navbatga qo'yadi va job manzili bilan `202` qaytaradi. Import worker job'ni oladi va faylni storage'dan oqim bilan, bir necha qatordan o'qiydi, shuning uchun faylda 2 000 qator bo'ladimi, 2 million bo'ladimi, uning xotirasi 60 MB da qoladi.\n\nEndi hech qaysi so'rov kutmaydi. Oldingidan bitta muammo qoldi: 117 403-qator hali ham butun faylni yiqitadi.",
      fields: {
        file_key: "Fayl storage'da qayerda. API orqali fayl emas, faqat kalit o'tadi.",
        sha256: "Fayl xeshi, job bilan birga saqlanadi.",
        "202 Accepted": "Ishlov berishga qabul qilindi, bajarildi emas. Ish keyin bo'ladi.",
        Location: "Bundan keyin shu job haqida qayerdan so'rash kerak.",
        status: "`queued`, keyin `running`, keyin `completed` yoki `completed_with_errors`.",
      },
    },
    validate: {
      short: "Tekshiruv",
      title: "Har qatorni tekshirish, xatolarni yig'ish, yaxshi qatorlarni saqlash",
      body: "Worker har qatorni alohida tekshiradi: majburiy maydonlar, sonlar, o'lchov birliklari, fayl ichidagi takrorlar. Yaxshi qator yoziladi, yomoni esa qator raqami, ustun va sababi bilan xatolar hisobotiga tushadi, import esa davom etadi.\n\n199 600 qator import qilinadi, 400 tasi rad etiladi. Hisobot storage'ga, fayl yoniga tushadi, buxgalter aynan shu 400 qatorni tuzatib, ularni qayta yuklay oladi.",
      watch: "Qisman muvaffaqiyat haqiqiy importning oddiy natijasi. UI va job holatini shunga mo'ljallab loyihalang.",
      fields: {
        row: "Foydalanuvchi faylidagi qator raqami, uni o'z jadvalidan topa olsin.",
        column: "Qaysi katak xato.",
        required: "Bo'sh SKU: qatorni hech qaysi tovarga bog'lab bo'lmaydi.",
        duplicate_in_file: "Bitta faylda bir SKU ikki marta. Birinchisi qoladi, ikkinchisi hisobotga tushadi.",
        completed_with_errors: "Tugadi, o'qish kerak bo'lgan hisobot bilan. Muvaffaqiyat ham, xato ham emas.",
      },
    },
    restart: {
      short: "Qayta ishga tushish",
      title: "Qayta ishga tushish boshidan boshlaydi, ikkinchi yuklash yangi job ochadi",
      body: "Deploy worker'ni 122 000-qatorda qayta ishga tushiradi. Navbat job'ni qaytarib beradi va worker yana 1-qatordan boshlaydi. U allaqachon yozgan har qator endi unique kalitga uriladi va foydalanuvchi minglab yolg'on xatolarni ko'radi.\n\nShu orada jarayonni ko'rmagan foydalanuvchi o'sha faylni yana yuklaydi. Ikkinchi job o'sha faylni parallel import qiladi, katalog bazasi 85 % da ishlaydi.",
      check: {
        q: "Qayta ishga tushish va o'sha faylning ikkinchi yuklanishini qanday zararsiz qilasiz?",
        options: [
          "Foydalanuvchilardan ikki marta bosmaslikni so'rash va import paytida deploy qilmaslik",
          "Birinchi urinish yozganini o'chirib, boshidan boshlash",
          "Job'ni fayl xeshi bo'yicha topish va har 1 000 qatorda oxirgi tugagan qatorni saqlash, qayta ishga tushganda shu yerdan davom etsin",
        ],
        answer: 2,
        why: "Qayta ishga tushish va ikki marta bosish baribir bo'ladi. Fayl xeshi ikkinchi yuklashni o'sha job'ga aylantiradi. Har batch bilan saqlangan checkpoint qayta ishga tushgan worker'ga qayerdan davom etishni aytadi, lease esa job'ga faqat bitta worker egalik qilishini kafolatlaydi.",
      },
      fields: {
        restarted: "Oddiy deploy, import uchun yomon paytda.",
        "row 1": "Job hech narsani eslab qolmagan: 122 000 qatorlik ish yana boshidan.",
        "already exists": "Birinchi yurishdagi qatorlar unique kalitga uriladi.",
        imp_78: "O'sha fayl, ikkinchi job.",
        parallel: "Yangi ma'lumotsiz katalogga ikki barobar yuk.",
      },
    },
    checkpoint: {
      short: "Checkpoint",
      title: "Takror uchun fayl xeshi, har 1 000 qatorda checkpoint",
      body: "Har 1 000 qatorda worker job yozuviga o'z o'rnini saqlaydi: oxirgi tugagan qator va hisoblagichlar. Qayta ishga tushgandan keyin u 123 001-qatordan davom etadi. Lease job'ga qaysi worker egalik qilishini yozadi, shuning uchun ikkinchi worker uni bir vaqtda ola olmaydi.\n\nJob yaratishdan oldin API o'sha tenant va o'sha fayl xeshli job'ni qidiradi. Ikkinchi yuklash yangi job emas, mavjudini qaytarib oladi.",
      fields: {
        last_row: "Batch'i commit bo'lgan oxirgi qator. Qayta ishga tushish undan keyin davom etadi.",
        lease_owner: "Job'ni faqat lease ushlagan worker yangilay oladi. Eskirgan worker'ning yangilashi hech narsani o'zgartirmaydi.",
        resumes: "Qayta ishga tushishdan keyin yo'qoladigan ish ko'pi bilan 1 000 qator.",
        sha256: "Bir tenantdan bir xil fayl bir xil job degani.",
      },
    },
    lock: {
      short: "Lock'lar",
      title: "Bitta ulkan yozuv katalogni qulflaydi",
      body: "Qatorma-qator yozish 200 000 marta borib-kelish, taxminan 7 daqiqa. Tezlashtirish uchun keyingi versiya faylni staging jadvalga yuklaydi va katalogni bitta tranzaksiyada bitta so'rov bilan yangilaydi.\n\nU so'rov 150 000 tovar qatorini commit'gacha, 3 daqiqa qulflab turadi. Xuddi shu qatorlarda qoldiqni kamaytiradigan checkout lock'ni kutadi: 177 s, buyurtma timeout bo'ladi. Import tez, do'kon esa ishlamayapti.",
      watch: "Tranzaksiya qator lock'larini eng oxirigacha ushlaydi. Uning hajmini qanchalik tezligi bilan emas, boshqalar qancha kuta olishi bilan o'lchang.",
      check: {
        q: "Worker katalogni daqiqalab qulflamasdan 200 000 qatorni qanday yozishi kerak?",
        options: [
          "Taxminan 1 000 qatorlik batch'lar, har biri tenant va SKU bo'yicha bitta upsert, o'z qisqa tranzaksiyasida",
          "O'sha bitta tranzaksiya, lekin kechasi",
          "Autocommit bilan qatorma-qator",
        ],
        answer: 0,
        why: "1 000 qatorlik batch bitta so'rov va bitta borib-kelish, uning lock'lari millisekundlar ushlanadi. 200 ta batch bitta uzun tranzaksiyasiz ommaviy yozish tezligini beradi, checkout esa ular orasidan o'tib ketadi.",
      },
      fields: {
        staging: "Butun faylni ushlab turadigan vaqtinchalik jadval.",
        "one transaction": "O'zgargan har qator oxirigacha qulflangan qoladi.",
        "waiting for lock": "Xaridorning buyurtmasi import ortida turib qoladi.",
        "lock wait": "177 s. Buyurtma so'rovi ancha oldin voz kechgan.",
        COMMIT: "Lock'lar faqat endi bo'shaydi.",
      },
    },
    batch: {
      short: "Batch'lar",
      title: "Tabiiy kalitli batch upsert",
      body: "Worker har so'rovda 1 000 qator yozadi: yangi tovarlarni qo'shadi, mavjudlarini yangilaydi, tenant va SKU bo'yicha moslab. Nomi va narxi o'zgarmagan qator o'tkazib yuboriladi, u hatto qulflanmaydi ham. Har batch o'z checkpoint'i bilan birga commit bo'ladi.\n\nImport 7 daqiqa o'rniga 95 s oladi, har batch lock'larini 38 ms ushlaydi, checkout endi kutmaydi.",
      fields: {
        tenant_id: "Har qator bitta kompaniyaga tegishli. Har kalit va har so'rovning bir qismi.",
        "ON CONFLICT": "Upsert: mavjud SKU yangilanadi, yangisi qo'shiladi. Batch'ni qayta yurgizish zararsiz.",
        EXCLUDED: "Kelayotgan qatordagi qiymatlar.",
        "IS DISTINCT FROM": "O'zgarmagan qatorlar qayta yozilmaydi: kamroq lock va kamroq o'zgarish hodisasi.",
        "38 ms": "Bu batch lock'larini qancha ushlaydi.",
      },
    },
    progress: {
      short: "Jarayon",
      title: "UI so'rab turadigan jarayon holati",
      body: "Sahifa har 2 soniyada job'ni so'raydi va chiziq ko'rsatadi: tugagan qatorlar, shu paytgacha xatolar, qolgan vaqt. API worker har checkpoint'da yangilab turadigan job yozuvini o'qiydi. Server-Sent Events o'sha sonlarni o'zi yubora oladi, lekin arzon endpoint'ni so'rab turish ko'pincha yetarli.\n\nFoydalanuvchi oynani yopib, qaytib kelishi mumkin: job ishlashda davom etadi, sahifa esa u qayerda ekanini oladi.",
      fields: {
        status: "Hozir `running`. Sahifa `completed` yoki `completed_with_errors` da so'rashni to'xtatadi.",
        total_rows: "Tez birinchi o'tishda sanaladi, chiziqning oxiri bo'lsin.",
        processed: "Oxirgi checkpoint'gacha. 1 000 qadamdan siljiydi.",
        failed: "Shu paytgacha xatolar. Foydalanuvchi ularni faqat oxirida emas, o'sib borayotganida ko'radi.",
        eta_seconds: "Qolgan qatorlar yaqindagi tezlikka bo'linadi.",
        errors_url: "Xatolar hisobotini qisqa muddatli imzolangan havola orqali yuklab oladi.",
      },
    },
    limits: {
      short: "Limitlar",
      title: "Har tenant uchun limitlar",
      body: "Bitta tenant bir vaqtda 2 GB lik fayllar bilan oltita import boshlaydi, qolgan hammaning job'lari ularning ortida kutadi. Shuning uchun har tenantga limit beriladi: fayl 100 MB gacha, 500 000 qatorgacha, 2 ta ishlayotgan import. Yuklash URL'i e'lon qilingan hajm uchun imzolanadi, navbat esa job'larni tenantma-tenant adolatli oladi.\n\nUchinchi import aniq sabab va qayta urinish vaqti bilan `429` oladi. Worker'lar 60 % band, hech bir tenant boshqalarni to'xtata olmaydi.",
      fields: {
        "Retry-After": "2 daqiqadan keyin qayta urining, ishlayotgan importlardan biri tugagan bo'ladi.",
        error: "UI tushunarli xabarga aylantira oladigan mashina o'qiydigan sabab.",
        limit_running: "Har tenantga ruxsat etilgan ishlayotgan importlar.",
        max_file_mb: "Yuklash URL'i imzolanayotganda, biror bayt ko'chishidan oldin tekshiriladi.",
        max_rows: "Oqim bilan o'qiyotganda tekshiriladi: job limitda aniq holat bilan to'xtaydi.",
      },
    },
    recap: {
      short: "Xulosa",
      title: "Xulosa",
      body: "Ommaviy importning olti qoidasi.\n\n1) Katta faylni hech qachon web so'rov ichida o'qimang: uni qisqa muddatli pre-signed URL bilan object storage'ga yuklang, worker uni oqim bilan o'qisin. 2) Har qatorni tekshiring, yaxshilarini saqlang va foydalanuvchiga qator raqamli xatolar hisobotini bering. 3) Yuklashlarni fayl xeshi bo'yicha takrordan tozalang va har batch bilan checkpoint saqlang, qayta ishga tushish davom etsin. 4) Taxminan 1 000 qatorlik batch'larda, tabiiy kalit bo'yicha upsert bilan, qisqa tranzaksiyalarda yozing. 5) Jarayonni job yozuvidan ko'rsating. 6) Har tenant uchun fayl hajmi, qatorlar va ishlayotgan job'larni cheklang.",
    },
  },
};

export default text;
