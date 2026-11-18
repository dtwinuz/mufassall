import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Xabarnomalarni yetkazish",
  summary:
    "Biznes ilova kirish kodlari, \"hisob-faktura keldi\" xabarlari va to'lov kvitansiyalarini yuboradi. Ularni so'rov ichida yuborish ilovani sekin provayderga bog'lab qo'yadi. Outbox, navbat va yuboruvchi worker provayderni so'rovdan chiqaradi; keyin rate limit, yetkazish kvitansiyalari, muddatli zaxira kanallar zanjiri, takrorlarni olib tashlash, foydalanuvchi sozlamalari, narx va ikkinchi provayder keladi.",
  learn: [
    "Nega xabar biznes hodisa bilan birga outbox'ga yoziladi va uni so'rov emas, worker yuboradi",
    "Har provayder uchun token bucket bilan rate limit, `429` va `Retry-After`, kirish kodlari uchun alohida yo'lak",
    "Qabul qilindi degani yetkazildi degani emas: yetkazish kvitansiyalari, push, SMS, email zanjiri va muddati o'tgan kodni to'xtatadigan muddat",
    "Bitta hodisa, har kanalga bitta xabar: idempotency kalitlari, sokin soatlar, sozlamalar, har xabar narxi va provayderni almashtirish",
  ],
  nodes: {
    client: "Telefon ilovasi",
    api: "Biznes API",
    sms: "SMS provayder A",
    db: "Outbox bazasi",
    queue: "Navbat",
    worker: "Yuboruvchi worker",
    limiter: "Rate limiter",
    push: "Push servis",
    email: "Email provayder",
    sms2: "SMS provayder B",
  },
  metrics: {
    p95: "API p95 kechikishi",
    delivered: "Yetkazilgan",
    dupes: "Takror xabarlar",
    spend: "Kunlik xabar xarajati",
  },
  steps: {
    inline: {
      short: "So'rov ichida",
      title: "API SMS'ni so'rov ichida yuboradi",
      body: "Foydalanuvchi tizimga kiradi. Biznes API bir martalik kod yaratadi va telefon ilovasiga javob berishdan oldin, shu so'rovning o'zida SMS provayderni chaqiradi. Hisob-faktura xabarlari va to'lov kvitansiyalari ham shu yo'l bilan ketadi: biznes amal va xabar bitta so'rovda.\n\nYaxshi kunda bu 320 ms oladi va hech kim sezmaydi. Endi ilova birovning serveri qanchalik tez va ishlayotgan bo'lsa, shunchalik tez va ishlaydi.",
      fields: {
        Authorization: "Ilovaning provayderdagi API kaliti. Shu yerda yashirilgan.",
        to: "Telefon raqami. Shaxsiy ma'lumot: bu yerda yashirilgan, loglaringizda ham niqoblanadi (`+99890***4512`).",
        sender: "Telefonda ko'rinadigan jo'natuvchi nomi. Ko'p operatorlar faqat oldindan ro'yxatdan o'tgan nomni qabul qiladi.",
        client_ref: "Bu xabar uchun o'zimizning ID. U yetkazish kvitansiyasida qaytib keladi, shunda ikkalasini moslay olamiz.",
        status: "`accepted` provayder xabarni o'z navbatiga oldi degani. Telefon uni oldi degani emas.",
        parts: "Nechta SMS bo'lagi uchun pul olindi. Uzun yoki lotin bo'lmagan matn 2-3 bo'lak turadi.",
      },
    },
    slow: {
      short: "Sekin",
      title: "Sekin provayder kirishni ham, qolgan hammasini ham to'xtatadi",
      body: "09:00 da provayder 0.3 s o'rniga 10 s da javob beradi. Har kirish so'rovi uni kutadi va timeout bo'ladi. Kutayotgan so'rovlar server oqimlarini band qiladi, 200 tasining hammasi band, hatto umuman SMS yubormaydigan `GET /invoices` ham `503` oladi.\n\n09:14 da provayder texnik ishlar uchun o'chadi. Endi kirish ham ishlamaydi, chunki kod uni yaratgan so'rovning o'zida yuboriladi.",
      watch: "So'rov ichidagi har tashqi chaqiruv o'z kechikishi va o'z uzilishlarini sizga qo'shadi.",
      check: {
        q: "Provayder yana sekinlashadi yoki o'chadi. Kirish va API'ning qolgan qismini qanday tez saqlaysiz?",
        options: [
          "Timeout'ni 30 s ga oshirish, sekin yuborishlar ham tugasin",
          "So'rov ichida yuborishni uch marta qayta urinish",
          "Xabarni hodisa bilan birga bazaga yozib, darhol javob berish, yuborishni esa fondagi worker'ga qoldirish",
        ],
        answer: 2,
        why: "So'rov faqat xabar yuborilishi kerakligini kod yoki hisob-faktura bilan bitta tranzaksiyada yozib qo'yishi kerak. Bu tez lokal yozuv. Yuborish, kutish va qayta urinish worker'ga o'tadi: u yerda sekin provayder xabarni kechiktiradi, lekin hech kimni to'sib qo'ymaydi.",
      },
      fields: {
        timeout: "10 s da javob yo'q. Xabar keyinroq yuborilishi ham mumkin, biz bilmaymiz.",
        "504": "Telefon ilovasi 10 soniya kutib, xato oladi.",
        busy: "Har oqim provayderni kutyapti. Yangi so'rovlarga ishlash uchun joy yo'q.",
        "503": "SMS'ga aloqasi yo'q endpoint ham yiqiladi.",
        refused: "Provayder o'chgan. So'rov ichida yuborishda kirishimiz ham o'chgan.",
      },
    },
    outbox: {
      short: "Outbox",
      title: "Xabarni o'sha tranzaksiyada outbox'ga yozish",
      body: "Kirish so'rovi endi kodni va bitta `outbox` qatorini bitta tranzaksiyada saqlaydi: qaysi hodisa, qaysi kanal, qaysi shablon va qachongacha yetishi kerak. Keyin `202 Accepted` qaytaradi. Provayder umuman chaqirilmaydi.\n\nTranzaksiya yiqilsa, kod ham, xabar ham yo'q. Commit bo'lsa, xabar albatta yuboriladi. SMS'siz kod ham, mavjud bo'lmagan kod uchun SMS ham bo'lmaydi. p95 140 ms ga tushadi.",
      fields: {
        code_hash: "Parol kabi faqat kodning xeshi saqlanadi. Kodning o'zi SMS ichida ketadi.",
        outbox: "Yuborilishi kerak bo'lgan xabarlar jadvali. U biznes ma'lumot bilan bitta bazada, shuning uchun bitta tranzaksiya ikkalasini qamraydi.",
        event_id: "Bu xabar tegishli biznes hodisa. Keyin u takrorni ushlaydigan kalitga aylanadi.",
        deadline_at: "Kirish kodi 2 daqiqadan keyin keraksiz. Xabar o'z muddatini o'zi olib yuradi.",
        COMMIT: "Kod va xabar birga saqlanadi yoki ikkalasi ham saqlanmaydi.",
      },
    },
    worker: {
      short: "Worker",
      title: "Navbat va yuboruvchi worker yuboradi",
      body: "Relay yangi outbox qatorlarini o'qiydi va ularni navbatga chiqaradi, har kanalga alohida topic. Yuboruvchi worker xabarni oladi, provayderni chaqiradi, xatoda backoff bilan qayta urinadi. Telefon ilovasi endi jarayonda yo'q: u `202` ni allaqachon olgan.\n\nProvayder hali ham ba'zan sekin. Endi bu faqat bir nechta xabarni kechiktiradi: kirish 140 ms da qoladi, qayta urinishlar yetkazilganni 95 % ga chiqaradi.",
      fields: {
        notification_id: "Bu navbat xabari kelib chiqqan outbox qatori.",
        channel: "`sms`, `push` yoki `email`. Har kanalning o'z topic'i va o'z worker'lari bor.",
        deadline_at: "Bu vaqtdan keyin worker o'lik kodni yubormaydi, xabarni tashlab yuboradi.",
        attempt: "Urinish raqami. Oxirgi urinishdan keyin xabar dead letter queue'ga ketadi.",
      },
    },
    throttle: {
      short: "429",
      title: "Oy oxiri: provayder 429 qaytaradi",
      body: "Oyning oxirgi kuni soat 18:00 da navbatga 40 000 ta hisob-faktura xabari tushadi. Worker iloji boricha tez, soniyasiga 400 ta yuboradi. Provayder 50 taga ruxsat beradi, qolganiga `429` qaytaradi. Darhol qayta urinish uyumni faqat kattalashtiradi.\n\nBundan ham yomoni, kirmoqchi bo'lgan foydalanuvchi 40 000 ta xabar ortida kutadi. Ba'zi so'rovlar provayder qabul qilganidan keyin bizning tomonda timeout bo'ladi, worker qayta yuboradi va kuniga 120 ga yaqin odam bir xil SMS'ni ikki marta oladi.",
      check: {
        q: "429 to'xtashi va kirish kodlari tiqilib qolmasligi uchun worker nimani o'zgartirishi kerak?",
        options: [
          "Har 429 ni o'tguncha darhol qayta yuborish",
          "Har provayder uchun o'z tezligini provayder limitidan biroz pastda cheklash, Retry-After'ga amal qilish va kirish kodlariga alohida ulush berish",
          "O'n barobar ko'p worker ishga tushirish",
        ],
        answer: 1,
        why: "Limit provayderniki, shuning uchun ko'proq worker yoki tezroq qayta urinish faqat ko'proq 429 beradi. Har provayder uchun token bucket yuborishni soniyasiga 50 tadan past ushlaydi, 429 bucket'ni Retry-After muddatiga to'xtatadi, ajratilgan ulush esa katta kampaniya paytida kirish yo'lagini harakatda saqlaydi.",
      },
      fields: {
        "429": "Juda ko'p so'rov: provayder bu xabarni yubormasdan rad etdi.",
        "Retry-After": "Keyingi urinishdan oldin 2 s kuting. Unga amal qilmaslik akkauntni bloklatishi mumkin.",
        "X-RateLimit-Limit": "Bu akkaunt uchun soniyasiga 50 ta xabar.",
        "X-RateLimit-Remaining": "Bu soniyada hech narsa qolmadi.",
      },
    },
    bucket: {
      short: "Bucket",
      title: "Har provayderga token bucket, kodlarga alohida yo'lak",
      body: "Har yuborishdan oldin worker umumiy rate limiter'dan token oladi: har provayderga bitta bucket, soniyasiga 50 token, hamma worker'lar uchun umumiy. Token yo'q bo'lsa, 20 ms kutadi. `429` bucket'ni `Retry-After` muddatiga to'xtatadi. Kirish kodlarining 50 tadan 10 talik o'z bucket'i bor, kampaniya ularni och qoldira olmaydi.\n\nHisob-faktura xabarlari endi yiqilish o'rniga 15 daqiqa atrofida ketadi, kodlar esa soniyalarda yetadi. Yetkazilgan yana 96 %.",
      watch: "Operatorlarning o'z injiqliklari bor: ba'zilari ro'yxatdan o'tmagan jo'natuvchi nomini rad etadi, lotin bo'lmagan matn bir bo'lakda 160 emas, 70 belgi oladi, shuning uchun o'sha xabar ikki barobar qimmat.",
      fields: {
        "bucket:sms_a": "Har provayder akkauntiga bitta bucket, hamma worker'lar uchun umumiy. Har worker'ning o'z limiti yig'ilib provayder limitidan oshib ketadi.",
        rate: "Soniyasiga qo'shiladigan tokenlar: provayder limiti.",
        burst: "Jim davrdan keyin bir vaqtda chiqishi mumkin bo'lgan eng ko'p xabar.",
        otp: "Kirish kodlarining o'z yo'lagi bor, kampaniya ularni hech qachon kechiktirmaydi.",
        "Retry-After": "429 dan keyin bitta worker emas, butun bucket kutadi.",
      },
    },
    dlr: {
      short: "Kvitansiya",
      title: "Qabul qilindi degani yetkazildi emas: yetkazish kvitansiyalari",
      body: "Provayderning `200` javobi faqat u xabarni olganini bildiradi. Telefon uni olganmi yoki yo'qmi, bu keyinroq yetkazish kvitansiyasi (DLR) bo'lib keladi: webhook'imizga callback, soniyalar yoki soatlar o'tib, ba'zan esa umuman kelmaydi. Worker xabarni `sent` deb belgilaydi, DLR uni `delivered`, `failed` yoki `expired` ga o'tkazadi.\n\nHalol hisoblansa, yetkazilgan 96 % emas, 88 %. Telefon o'chiq, raqam endi ishlatilmaydi, operator xabarni tashlab yubordi.",
      watch: "Muddatgacha kvitansiya kelmasa, bu alohida holat: `unknown`. Uni hech qachon yetkazildi deb ko'rsatmang.",
      check: {
        q: "Hisob-faktura xabari uchun kvitansiya `UNDELIVERED` deydi: telefon o'chiq. Keyin nima bo'lishi kerak?",
        options: [
          "Shu turdagi xabar uchun belgilangan muddat ichida foydalanuvchining keyingi kanalini sinash",
          "O'sha SMS'ni yetkazilguncha har daqiqada qayta yuborish",
          "Tayyor deb belgilash: provayder qabul qildi-ku",
        ],
        answer: 0,
        why: "Hisob-faktura xabari bir soatdan keyin email'da ham foydali, shuning uchun worker zaxira zanjirdagi keyingi kanalga o'tadi. Har turdagi xabarning o'z zanjiri va muddati bor: muddati o'tgan kirish kodini hech qayerga yuborishga arzimaydi.",
      },
      fields: {
        Signature: "Kvitansiya provayderdan kelganini isbotlaydi. Imzosiz webhook har kim taqillatishi mumkin bo'lgan eshik.",
        message_id: "Yuborish javobidagi provayder ID'si.",
        status: "Operatorning oxirgi so'zi: `DELIVERED`, `UNDELIVERED` yoki `EXPIRED`.",
        error: "Sabab: telefon o'chiq yoki aloqa doirasidan tashqarida.",
        done_at: "Operator qachon taslim bo'ldi. Bu yerda yuborishdan 1 daq 40 s keyin, boshqa holatlarda soatlar o'tib.",
      },
    },
    fallback: {
      short: "Zaxira",
      title: "Har turdagi xabar uchun muddatli zaxira zanjiri",
      body: "Har turdagi xabarning zanjiri bor. Hisob-faktura keldi: avval push, chunki u tekin; ilova 10 daqiqada tasdiqlamasa, SMS; SMS yiqilsa, email. To'lov kvitansiyasi: email. Kirish kodi: faqat push yoki SMS.\n\nZanjir birinchi tasdiqlangan yetkazishda va muddat tugaganda to'xtaydi. Kirish kodi 2 daqiqada eskiradi, shuning uchun u hech qachon 5 daqiqada kelishi mumkin bo'lgan email'ga o'tmaydi. Yetkazilgan 99 % ga yetadi.",
      fields: {
        chain: "Shu turdagi xabar uchun ketma-ket sinaladigan kanallar.",
        ack: "Ilova push'ni ko'rsatganini tasdiqlaydi. Push provayderlari yetkazishni o'zlari kamdan-kam bildiradi.",
        DELIVERED: "Tasdiqlangan yetkazish zanjirni tugatadi. Ustidan email yo'q.",
        deadline: "Kod uchun bu kodning amal qilish muddatiga teng: undan keyin har qanday xabar keraksiz.",
        expired: "Zanjir jimgina to'xtaydi. Foydalanuvchi yangi kod so'rashi mumkin.",
      },
    },
    dedup: {
      short: "Dedup",
      title: "Bitta hodisa, har kanalga bitta xabar",
      body: "Navbat xabarni kamida bir marta yetkazadi. Provayder qabul qilganidan keyin yiqilgan worker yoki bizning tomonda timeout bo'lgan yuborish qayta urinish bo'lib qaytadi va foydalanuvchi bir xil matnni ikki marta oladi. Takrorlar pul turadi va buzilgandek ko'rinadi.\n\nProvayderni chaqirishdan oldin worker hodisa va kanal bo'yicha kalitli qator qo'shadi. Qator allaqachon bor bo'lsa, bu xabar boshqa urinishniki va worker uni o'tkazib yuboradi. O'sha kalit provayderga ham havola sifatida ketadi, shunda uning o'z dedup'i timeout'dan keyingi qayta urinishni ushlay oladi. Takrorlar 0 ga tushadi.",
      watch: "Kalit xabar matni emas, hodisa va kanal. O'sha xabar SMS va email'da kelsa, normal; ikkita SMS esa yo'q.",
      fields: {
        deliveries: "Qachondir yuborilgan har hodisa va kanal uchun bitta qator.",
        event_id: "Biznes hodisa: shu foydalanuvchi olgan shu hisob-faktura.",
        "ON CONFLICT": "Kim yuborishini baza hal qiladi. Ikki worker ikkalasi ham yuta olmaydi.",
        provider_ref: "Provayderga idempotency kaliti sifatida yuboriladi. Ko'p provayderlar shu havolali ikkinchi xabarni tashlab yuboradi.",
        "INSERT 0 0": "Allaqachon yuborilgan yoki yuborilmoqda: o'tkazib yuborish.",
      },
    },
    prefs: {
      short: "Sozlamalar",
      title: "Foydalanuvchi sozlamalari va sokin soatlar",
      body: "Yuborishdan oldin worker foydalanuvchi sozlamalarini o'qiydi: har turdagi xabar uchun kanallar, sokin soatlar va vaqt mintaqasi. Bu foydalanuvchi hisob-faktura xabarlarini push va email'da, kvitansiyalarni faqat email'da xohlaydi, 22:00 dan 08:00 gacha esa hech narsa kerak emas.\n\n23:40 dagi kvitansiya 08:00 gacha kutadi. Kirish kodi sokin soatlarga qaramaydi, chunki foydalanuvchi uni aynan hozir so'rayapti. Keraksiz SMS'lar kamaygani xarajatni kuniga $410 dan $330 ga tushiradi.",
      watch: "Ba'zi xabarlar ixtiyoriy emas: xavfsizlik ogohlantirishlari va kodlar. Ularni o'chirish ro'yxatidan ham, reklamadan ham tashqarida saqlang.",
      fields: {
        channels: "Har turdagi xabar uchun foydalanuvchi tanlagan kanallar.",
        quiet_hours: "Shoshilinch bo'lmagan xabarlar yuborilmaydigan mahalliy vaqt oralig'i.",
        tz: "Sokin soatlar serverning emas, foydalanuvchining vaqtida.",
        hold: "Xabar tashlab yuborilmaydi, keyinroqqa rejalashtiriladi.",
      },
    },
    failover: {
      short: "Almashtirish",
      title: "Har xabar narxi va ikkinchi provayder",
      body: "Har yuborish narx qatorini yozadi: provayder, bo'laklar, kodlash, narx. Moliya bo'limi endi har turdagi xabar bo'yicha xarajatni va bitta uzun shablon har safar 3 bo'lak turishini ko'radi.\n\nProvayder A yiqila boshlaganda, 2 daqiqada 41 % xatodan keyin circuit breaker ochiladi va worker provayder B orqali yuboradi. B bir bo'lak uchun qimmatroq, xarajat biroz oshadi, lekin kodlar kelishda davom etadi. Bir nechta sog'lom tekshiruvdan keyin trafik A ga qaytadi.",
      watch: "Ikkinchi provayderni haqiqiy trafikning kichik ulushi bilan doim ishlatib turing. Hech qachon ishlatilmagan zaxira aynan kerak bo'lgan kuni yiqiladi.",
      fields: {
        provider: "Qaysi akkaunt yubordi: har narx va sifat hisobotining asosi.",
        parts: "Pul olingan bo'laklar. Qisqaroq shablon eng arzon optimallashtirish.",
        encoding: "`gsm7`: bir bo'lakda 160 belgi. Boshqa alifbolar uchun `ucs2`: 70.",
        price_usd: "Shu bitta xabar narxi. Kun, provayder va shablon bo'yicha yig'iladi.",
        breaker: "Circuit breaker: tekshiruvlar o'tmaguncha provayder A chetlab o'tiladi.",
      },
    },
    recap: {
      short: "Xulosa",
      title: "Xulosa",
      body: "Xabar yetkazishning olti qoidasi.\n\n1) Provayderni hech qachon foydalanuvchi so'rovi ichida chaqirmang: xabarni hodisa bilan bitta tranzaksiyada outbox'ga yozing, worker uni navbatdan yuborsin. 2) Yuborishni har provayder uchun token bucket bilan cheklang, `429` va `Retry-After`'ga amal qiling, kirish kodlariga alohida yo'lak bering. 3) Qabul qilindi yetkazildi emas: kvitansiyalarni kuzating, kvitansiya yo'qligini noma'lum deb hisoblang. 4) Har turdagi xabar uchun muddatli zaxira zanjiri ishlating, shunda muddati o'tgan kod yuborilmaydi. 5) Hodisa va kanal bo'yicha takrorni olib tashlang, sozlamalar va sokin soatlarni hurmat qiling. 6) Har xabar narxini yozing va ikkinchi provayderni circuit breaker ortida tayyor saqlang.",
    },
  },
};

export default text;
