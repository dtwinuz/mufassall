import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Audit jurnali",
  summary:
    "Back-office'da kimdir mijozning bank hisobini o'zgartirdi, keyingi to'lov begona odamga ketdi va kim qilganini hech kim isbotlay olmaydi. Bu darsda kim, nima, qachon, qayerdan qilgani va oldin-keyin qanday bo'lganiga javob beradigan audit jurnali quriladi. U yiqilishga, o'sib borayotgan jadvalga va bazaga kira oladigan ichki odamga ham bardosh beradi.",
  learn: [
    "Audit hodisasida nima bo'ladi va nega u o'zgartirish bilan bitta tranzaksiyada yoziladi",
    "Auditni outbox orqali alohida, faqat qo'shiladigan, oylik bo'laklarga bo'lingan omborga ko'chirish",
    "Xesh zanjiri va imzolangan nazorat nuqtalari bilan soxtalashtirishni ko'rinadigan qilish",
    "Auditdagi shaxsiy ma'lumot, alohida o'qish roli, bir marta yoziladigan omborda saqlash muddati va request id bo'yicha tergov",
  ],
  nodes: {
    admin: "Back-office xodimi",
    api: "Back-office API",
    db: "Mijozlar bazasi",
    relay: "Audit relay",
    auditdb: "Audit ombori",
    insider: "Ichki odam",
    signer: "Imzo xizmati",
    archive: "WORM arxiv",
    investigator: "Tergovchi",
  },
  metrics: {
    untraced: "Egasiz o'zgartirishlar",
    p95: "API p95",
    hot: "Tez diskdagi audit",
    undetected: "Sezilmagan soxtalik",
  },
  steps: {
    who: {
      short: "Kim?",
      title: "Bank rekvizitlari o'zgardi, kim ekanini hech kim aytolmaydi",
      body: "Mijoz shu oygi to'lov kelmaganidan shikoyat qiladi. Pul unga tegishli bo'lmagan hisobga ketgan. Baza hisob seshanba kuni 09:41 da o'zgarganini ko'rsatadi.\n\nKo'rsatadigani shu xolos. Eski hisob raqami ustidan yozilgan, `updated_by` esa 40 xodim birga ishlatadigan bitta login. Kuniga taxminan 14 o'zgartirish shunday: haqiqiy, lekin egasiz.",
      watch: "`updated_at` ustuni audit jurnali emas. U bitta lahzani saqlaydi va undan oldingi hammani unutadi.",
      fields: {
        bank_account: "Yangi qiymat. Bank rekvizitlari maxfiy, shuning uchun darsda yashirilgan.",
        updated_at: "Faqat oxirgi o'zgartirish. Undan oldingisi yo'qolgan.",
        updated_by: "Umumiy servis akkaunti. Kimdir back-office'dan foydalanganini isbotlaydi, kim ekanini emas.",
        gone: "Oldingi qiymat yo'qolgan, shuning uchun zararni ham o'lchab bo'lmaydi.",
      },
    },
    event: {
      short: "Hodisa",
      title: "Har biznes harakatiga bitta audit hodisasi",
      body: "Endi har biznes harakati hodisa yozadi: kim qildi, qanday harakat, nimaga, qachon, oldingi va keyingi qiymat, qaysi so'rovdan kelgan va qaysi tarmoqdan. Xodimlar o'z logini bilan kiradi, shuning uchun `actor_id` aniq odam.\n\nHodisa o'zgartirish bilan bitta tranzaksiyada yoziladi: yo ikkalasi bor, yo hech biri. Hodisasiz bank rekviziti o'zgarishi mumkin emas.",
      watch: "Jadvalga yozuvlarni emas, biznes harakatlarini yozing. `customer.bank_account.update` tergovchiga nimanidir aytadi, `UPDATE customers` esa yo'q.",
      fields: {
        actor_id: "Odamning o'zi, shaxsiy logindan. Hech qachon umumiy akkaunt emas.",
        action: "Biznes harakatining nuqtali, o'zgarmas nomi.",
        target: "Nima o'zgartirildi: turi va ID'si.",
        before: "O'zgartirishdan oldingi qiymat. Bu yerda yashirilgan: maxfiy qiymatlar shifrlangan yoki iz (fingerprint) sifatida saqlanadi.",
        after: "Keyingi qiymat. Ikki o'zgartirish bir xil hisobni qo'yganini bilish uchun iz yetarli.",
        request_id: "Bu hodisani o'sha so'rov boshqa servislarda qilgan hamma narsa bilan bog'laydi.",
        ip: "To'liq manzil emas, faqat tarmoq: «ofisdan tashqaridan» ekanini ko'rishga yetadi, shaxsiy ma'lumot kamroq.",
      },
    },
    hot: {
      short: "Qizigan jadval",
      title: "Ikki yildan keyin audit jadvali bazani egallab oldi",
      body: "Har harakat qator yozadi va hech narsa o'chirilmaydi. Audit jadvali endi 2.1 TB, mijozlar bazasining 61%. Zaxira nusxa 9 soat oladi, shu jadvaldagi vacuum hech tugamaydi, API p95 esa 52 ms dan 310 ms ga chiqdi.\n\nAudit o'zi yozib borayotgan biznesni sekinlashtirmoqda va u bilan bitta nosozlik zonasida turibdi.",
      check: {
        q: "Audit mijozlar bazasidan chiqishi kerak. API hodisalarni alohida omborga qanday yuborishi kerak?",
        options: [
          "Commit'dan keyin audit servisini HTTP orqali chaqirib, unutish",
          "Hodisani o'sha tranzaksiyada outbox jadvaliga yozish, relay esa uni keyin yetkazadi",
          "Hodisani ilova log fayliga yozib, fayllarni yig'ish",
        ],
        answer: 1,
        why: "Yubordim-unutdim har yiqilish yoki tarmoq uzilishida hodisani yo'qotadi, yo'qolgan audit yozuvi esa keyin hech kim tushuntira olmaydigan teshik. Outbox qatori o'zgartirish bilan birga commit bo'ladi, relay uni kamida bir marta yetkazadi, ombor esa takrorlarni tashlaydi.",
      },
      fields: {
        audit_events: "Eng katta jadval, har daqiqa o'sib boradi.",
        backup: "Butun baza auditning hajmida zaxiralanadi va tiklanadi.",
        vacuum: "Bunday katta jadvalga texnik xizmat ulgurmaydi.",
        p95: "Biznes so'rovlari auditning og'irligini to'laydi.",
      },
    },
    outbox: {
      short: "Outbox",
      title: "Bitta tranzaksiya, alohida ombor: outbox",
      body: "API hodisani hali ham biznes tranzaksiyasida yozadi, lekin kichik `audit_outbox` jadvaliga. Relay outbox'ni o'qiydi, har hodisani audit omboriga yozadi va faqat shundan keyin outbox qatorini o'chiradi.\n\nOmbor ishlamasa, hodisalar outbox'da kutadi, o'zgartirish esa baribir o'tadi. Sekin audit yozuvi mayli, yo'qolgani esa yo'q: to'liq bo'lmagan audit jurnaliga hech bir ishda ishonib bo'lmaydi.",
      watch: "Outbox hajmini kuzating. O'sib borayotgan outbox relay to'xtaganini va jurnal kechikayotganini bildiradi.",
      fields: {
        BEGIN: "Biznes o'zgartirishi va uning hodisasi uchun bitta tranzaksiya.",
        audit_outbox: "Kichik navbat jadvali: qatorlar relay yetkazguncha yashaydi.",
        COMMIT: "Ikkala qator bir vaqtda haqiqiy bo'ladi yoki hech biri.",
        relay: "Kamida bir marta yetkazadi. Yiqilgandan keyin hodisani ikki marta yuborishi mumkin.",
      },
    },
    partitions: {
      short: "Bo'laklar",
      title: "Faqat qo'shish, har oyga bitta bo'lak",
      body: "Audit omborida bitta jadval oylik bo'laklarga (partition) bo'lingan. Yangi hodisalar joriy oyga tushadi, eski oylarga boshqa tegilmaydi, shuning uchun ularni bir marta zaxiralab, keyin butunligicha ko'chirish mumkin.\n\nRelay'ning baza foydalanuvchisi faqat qo'sha oladi. Hech bir ilova roli audit qatorini o'zgartira yoki o'chira olmaydi.",
      fields: {
        "PARTITION BY RANGE": "Jadval hodisa vaqti bo'yicha bo'linadi.",
        audit_events_2026_11: "Shu oyning bo'lagi. Vaqt oralig'i bo'yicha so'rov faqat kerakli oylarni o'qiydi.",
        REVOKE: "Na o'zgartirish, na o'chirish: ombor ruxsat darajasida faqat qo'shiladigan.",
        "ON CONFLICT": "Relay'dan kelgan takror `event_id` bo'yicha e'tiborsiz qoldiriladi.",
      },
    },
    tamper: {
      short: "Soxtalik",
      title: "Superuser huquqi bor odam qatorni o'chiradi",
      body: "Ruxsatlar ilovalarni to'xtatadi, baza superuser'ini emas. Kechasi shunday huquqi bor kimdir aynan bitta hodisani o'chiradi: birinchi qadamdagi bank rekvizitlari o'zgarishini.\n\nOmbor `DELETE 1` deydi. Xato yo'q, ogohlantirish yo'q, keyingi tergov esa oldidan hech qanday o'zgartirish bo'lmagan begonaga to'lovni topadi.",
      watch: "Auditni o'zgartira oladigan odamlar ko'pincha audit kuzatishi kerak bo'lgan odamlarning o'zi.",
      fields: {
        superuser: "Bazadagi har qanday ruxsatdan yuqori.",
        DELETE: "Bitta noqulay hodisani olib tashlaydi.",
        "DELETE 1": "Muvaffaqiyat. Omborda buni hech narsa sezmaydi.",
      },
    },
    chain: {
      short: "Xesh zanjiri",
      title: "Har yozuv oldingisining xeshini saqlaydi",
      body: "Har hodisa `prev_hash` ni saqlaydi, o'z xeshi esa oldingi xesh va hodisaning kanonik baytlarini qamraydi. Bitta yozuvni o'zgartiring yoki o'chiring, undan keyingi har xesh mos kelmay qoladi.\n\nHar soat tekshiruv job'i zanjirni boshidan yurib chiqadi. Ichki odam o'chirganidan keyingi birinchi ishga tushishda aniq teshik chiqadi: `ae_01J9Z3` va `ae_01J9Z5` orasidagi yozuv yo'q.",
      check: {
        q: "Ehtiyotkor ichki odam qatorni o'chiradi, keyin undan keyingi har xeshni qayta hisoblaydi. Soatlik tekshiruv nimani ko'rsatadi?",
        options: [
          "O'chirilgan qatorda uzilgan bog'lanishni",
          "Hech narsa, lekin qattiq ruxsatlar buni baribir imkonsiz qiladi",
          "Hech narsa: qayta qurilgan zanjir to'g'ri, shuning uchun uning boshi ichki odam yeta olmaydigan joyda imzolanishi kerak",
        ],
        answer: 2,
        why: "Zanjir o'chirilgan qatorni faqat hujumchi uni qayta qura olmasa ushlaydi. Shuning uchun bosh xesh va yozuvlar soni har soat ichki odamda yo'q kalit bilan alohida servisda imzolanadi, nazorat nuqtasi esa bir marta yoziladigan omborga ketadi.",
      },
      fields: {
        "SHA-256": "Kriptografik xesh. Ikki xil kirish bir xil natija beradigan qilib hech kim tanlay olmaydi.",
        prev_hash: "Bu yozuvni oldingisiga bog'laydi.",
        canonical: "Hodisaning bitta qat'iy bayt ko'rinishi (kalitlar tartibi, son formati), aks holda bir hodisa har xil xeshlanadi.",
        BROKEN: "Saqlangan bog'lanish oldingi yozuv xeshiga mos emas: nimadir olib tashlangan.",
      },
    },
    anchor: {
      short: "Nazorat nuqtasi",
      title: "Imzolangan nazorat nuqtalari zanjirni mahkamlaydi",
      body: "Ehtiyotkor ichki odam qatorni o'chirib, keyingi har xeshni qayta qurishi mumkin. Shuning uchun ombor har soat alohida imzo xizmatidan joriy bosh xesh va yozuvlar sonini imzolashni so'raydi. Kalit o'sha xizmatda yashaydi, bazaga kira oladigan hech kim undan foydalana olmaydi.\n\nImzolangan nazorat nuqtasi bir marta yoziladigan arxivga yoziladi. Qayta qurilgan zanjir endi imzolangan xesh bilan tugamaydi, son ham mos kelmaydi.",
      fields: {
        Authorization: "Audit omborining imzo xizmatidagi kirish ma'lumoti. Yashirilgan.",
        count: "Shu nuqtagacha bo'lgan yozuvlar soni. O'chirilgan qator uni o'zgartiradi.",
        head_hash: "Oxirgi yozuvning xeshi: shu paytgacha butun zanjir o'rnida turadigan bitta qiymat.",
        key_id: "Qaysi kalit imzolagani, kalit almashtirilgandan keyin ham tekshirish ishlashi uchun.",
        signature: "Isbot. Bu yerda yashirilgan, ochiq kaliti bor har kim uni tekshira oladi.",
      },
    },
    pii: {
      short: "Kirish",
      title: "Auditda shaxsiy ma'lumot bor: kamaytiring va o'qishni yoping",
      body: "Audit jurnali kim kimga nima qilganini yig'adi, demak o'zi ham shaxsiy ma'lumot. Hodisalarda ism, pasport raqami va to'liq bank rekvizitlari o'rniga ID va izlar saqlanadi, IP'dan faqat tarmoq qoladi.\n\nAuditni o'qish alohida rol. Support va analitika kirishni yo'qotadi, tergovchilar uni tiket orqali oladi va ularning har so'rovi ham audit qilinadi.",
      check: {
        q: "13 oydan eski oylik bo'laklar kam o'qiladi, lekin yillab saqlanishi shart. Ular bilan nima qilinadi?",
        options: [
          "Bir marta yoziladigan obyekt omboriga eksport qilinadi, nazorat nuqtasi bilan tekshiriladi, keyin ombordan olib tashlanadi",
          "Audit omborida abadiy qoladi, disklar baribir sotib olingan",
          "O'chiriladi, chunki ularni hech kim o'qimaydi",
        ],
        answer: 0,
        why: "Eski oylar object lock bilan arzon obyekt omboriga ko'chadi, saqlash muddatigacha ularni hatto admin ham o'chira olmaydi. Bo'lak olib tashlanishidan oldin eksport imzolangan nazorat nuqtasi bilan solishtiriladi, tez disklar esa 2.1 TB dan 380 GB ga qisqaradi.",
      },
      fields: {
        audit_reader: "Audit hodisalarini o'qiy oladigan yagona rol.",
        GRANT: "Butun jamoalarga emas, tiket orqali aniq odamlarga beriladi.",
        REVOKE: "Unga faqat «har ehtimolga qarshi» muhtoj bo'lgan jamoalar uni yo'qotadi.",
        "itself audited": "Kim kimning tarixiga qaragani ham yoziladi.",
      },
    },
    retention: {
      short: "Saqlash muddati",
      title: "Saqlash muddati: eski oylar bir marta yoziladigan omborga",
      body: "Qoidalar auditni bir necha yil saqlashni talab qiladi, lekin o'tgan yilgi hodisalar tez disklarda hech kimga kerak emas. 13 oydan eski har oy bitta siqilgan fayl sifatida compliance rejimidagi object lock bilan obyekt omboriga eksport qilinadi.\n\nBo'lak olib tashlanishidan oldin eksportning oxirgi xeshi o'sha oy uchun imzolangan nazorat nuqtasi bilan solishtiriladi. Arxiv yillar o'tib ham tekshiriladigan bo'lib qoladi.",
      watch: "Saqlash muddati ikki tomonlama: audit ma'lumotini qoidalar talab qilgancha saqlang, ortiq emas.",
      fields: {
        checkpoint: "Eksport o'sha paytda imzolangan narsaga mos, demak yo'lda hech narsa o'zgarmagan.",
        "object lock": "Bir marta yozish: o'sha sanagacha hech kim, hatto akkaunt egasi ham uni o'chira yoki ustidan yoza olmaydi.",
        "DROP TABLE": "Butun bir oy tez ombordan bitta arzon amal bilan chiqadi.",
      },
    },
    investigate: {
      short: "Tergov",
      title: "Tergov: bitta request id, butun voqea",
      body: "To'lovga qaytamiz. Tergovchi bank rekvizitlari hodisasidan `request_id` ni oladi va o'sha so'rov qilgan hamma narsani so'raydi. Ikki hodisa qaytadi: `u_17` hisobni o'zgartirdi va 43 ms dan keyin to'lovlar servisida to'lov manzilini ham.\n\nZanjir oxirgi imzolangan nazorat nuqtasigacha butun, shuning uchun natija ishonchli: kim, nima, qachon, qayerdan, oldin va keyin.",
      fields: {
        request_id: "Chetda yaratiladi va har servisga uzatiladi, shuning uchun ularning hodisalarini birlashtirish mumkin.",
        u_17: "Umumiy login emas, aniq odam.",
        "payout.destination.change": "O'sha so'rovning boshqa servis yozgan ikkinchi ta'siri.",
        "chain ok": "Javob o'zgarmagani isbotlangan yozuvlardan olingan.",
      },
    },
    recap: {
      short: "Xulosa",
      title: "Xulosa",
      body: "Audit jurnali uchun olti qoida.\n\n1) Har biznes harakatiga bitta hodisa: kim, harakat, nima, vaqt, oldin va keyin, request id. 2) Uni o'zgartirish bilan bitta tranzaksiyada yozing va outbox orqali yetkazing, chunki yo'qolgan yozuv sekin yozuvdan yomonroq. 3) Uni alohida, faqat qo'shiladigan, oylarga bo'lingan omborda saqlang. 4) Yozuvlarni xesh bilan zanjirlang va boshini muntazam ravishda bazadan tashqaridagi kalit bilan imzolang. 5) Shaxsiy ma'lumotni kamaytiring, o'qishga alohida, audit qilinadigan rol bering. 6) Eski oylarni nazorat nuqtalari bilan tekshirib, bir marta yoziladigan omborga ko'chiring.",
    },
  },
};

export default text;
