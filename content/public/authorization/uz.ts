import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Avtorizatsiya",
  summary:
    "Kim murojaat qilayotganini bilish u nima qila olishini aytmaydi. Ko'p kompaniyalar ishlatadigan hisob-faktura ilovasi buni qiyin yo'l bilan o'rganadi: URL'dagi o'zgartirilgan ID, unutilgan tekshiruv va hamma narsani qila oladigan servis akkaunti.",
  learn: [
    "Autentifikatsiya va avtorizatsiya: nega to'g'ri token ruxsat emas",
    "Har so'rovda egalikni tekshirish va IDOR xatosi",
    "RBAC va ABAC, bitta joyda bitta siyosat",
    "Servis akkauntlari uchun eng kam imtiyoz (least privilege)",
  ],
  nodes: {
    alice: "Alisa (c_7 kompaniyasi)",
    web: "Veb ilova",
    api: "Hisob-faktura API",
    db: "Hisob-fakturalar bazasi",
    bob: "Bobur (c_9 kompaniyasi)",
    policy: "Siyosat servisi",
    reports: "Hisobot job'i",
    files: "Eksport fayllari",
  },
  metrics: {
    leaks: "Begona yozuv o'qildi",
    p95: "API p95",
    perms: "Job ruxsatlari",
  },
  steps: {
    "logged-in": {
      short: "Kirgan",
      title: "To'g'ri token va boshqa hech narsa",
      body: "`c_7` kompaniyasidan Alisa `inv_1042` hisob-fakturasini ochadi. API uning tokeni to'g'ri va imzolanganini tekshiradi, keyin hisob-fakturani ID bo'yicha yuklaydi.\n\nBu **autentifikatsiya**: «bu kim?» degan savolga javob. «Bu odam shu hisob-fakturani ko'ra oladimi?» degan savolni, ya'ni **avtorizatsiya**ni hali hech kim bermagan.",
      check: {
        q: "`c_9` kompaniyasidan Bobur tizimga kirgan va URL'da `1042` ni `1043` ga o'zgartiradi. U nima oladi?",
        options: [
          "`c_7` kompaniyasining `inv_1043` hisob-fakturasini",
          "`403 Forbidden`: hisob-faktura uniki emas",
          "`401`: uning tokeni faqat o'z ma'lumotiga amal qiladi",
        ],
        answer: 0,
        why: "API faqat token to'g'riligini tekshiradi, keyin hisob-fakturani ID bo'yicha yuklaydi. Kompaniyani hech kim solishtirmaydi, Bobur begona kompaniya hisob-fakturasini o'qiydi: IDOR xatosi.",
      },
      fields: {
        Authorization: "Alisaning access token'i. U kim ekanini isbotlaydi, boshqa hech narsani emas. Bu yerda yashirilgan.",
        company_id: "Hisob-faktura `c_7` kompaniyasiga tegishli. API buni Alisaning kompaniyasi bilan hech solishtirmagan.",
      },
    },
    idor: {
      short: "IDOR",
      title: "URL'dagi ID'ni o'zgartir — begona hisob-fakturani ol",
      body: "Bobur boshqa kompaniyada, `c_9` da ishlaydi. U ham tizimga kirgan. Manzil satrida `1042` ni `1043` ga o'zgartiradi va `c_7` kompaniyasining hisob-fakturasini oladi.\n\nBu xatoning nomi bor: **IDOR**, obyektga xavfsiz bo'lmagan to'g'ridan-to'g'ri murojaat. ID'larni taxmin qilish oson, skript ularning hammasini aylanib chiqadi: kuniga 140 begona hisob-faktura.",
      watch: "Tasodifiy ID taxmin qilishni qiyinlashtiradi, lekin tekshiruv emas. Har so'rovda server qaror qilishi kerak.",
      check: {
        q: "API endi hisob-fakturani faqat tokendagi kompaniya bilan yuklaydi. Bobur `1043` uchun nima oladi?",
        options: [
          "`403 Forbidden`: u boshqa kompaniyaniki",
          "Hisob-fakturani, lekin summa maydoni yashirilgan",
          "`404 Not Found`, go'yo u umuman yo'qdek",
        ],
        answer: 2,
        why: "So'rovga Boburning tokenidan `company_id = 'c_9'` qo'shiladi va 0 qator topiladi. API `404` qaytaradi, Bobur `1043` hisob-faktura mavjudligini ham bilmaydi.",
      },
      fields: {
        inv_1043: "Bobur shunchaki taxmin qilgan ID: keyingi raqam.",
        Authorization: "Boburning to'g'ri tokeni. API'ga shuning o'zi yetarli bo'ldi.",
        company_id: "Boburning kompaniyasi emas. Bu javob hech qachon yuborilmasligi kerak edi.",
      },
    },
    ownership: {
      short: "Egalik",
      title: "Egalikni so'rovning o'zida tekshiring",
      body: "API endi hisob-fakturani faqat murojaatchining kompaniyasi bilan birga yuklaydi, kompaniya esa URL'dan emas, tokendan olinadi. Begona ID shunchaki hech narsa topmaydi.\n\nAPI `403` emas, `404` qaytaradi: Bobur `1043` hisob-faktura mavjudligini ham bilmaydi.",
      fields: {
        company_id: "Boburning tokenidan: `c_9`. URL uni o'zgartira olmaydi.",
        "0 rows": "`1043` hisob-faktura bor, lekin `c_9` kompaniyasi uchun emas.",
        "404": "«Taqiqlangan» emas, «topilmadi», shunda ID'larni paypaslab bo'lmaydi.",
      },
    },
    roles: {
      short: "Rollar",
      title: "RBAC: har rol nima qila oladi",
      body: "Kompaniya ichida hamma ham hisob-fakturani tasdiqlay olmaydi. Foydalanuvchilarga rol beriladi: `viewer`, `accountant`, `admin`. Har rol — `invoice:approve` kabi ruxsatlar ro'yxati.\n\nAlisa — viewer. U o'qiy oladi, lekin tasdiqlash so'roviga `403` oladi. Kod rol nomini emas, ruxsatni tekshiradi, shuning uchun rollarni kodga tegmasdan o'zgartirish mumkin.",
      fields: {
        "403": "Alisa ma'lum va hisob-fakturani ko'rishi mumkin, lekin bu amal ruxsat etilmagan.",
        need: "Bu endpoint talab qiladigan ruxsat.",
        roles: "Alisada bori. `viewer` ga `invoice:approve` kirmaydi.",
      },
    },
    scattered: {
      short: "Tarqoq",
      title: "Qirqta endpoint, bitta unutilgan tekshiruv",
      body: "Egalik tekshiruvi har endpoint'ga qo'lda ko'chirilgan. Yangi eksport endpoint'i usiz chiqdi va kompaniyani query string'dan oladi.\n\nBobur `c_7` ni beradi va o'sha kompaniyaning barcha hisob-fakturalarini CSV qilib yuklab oladi. Bitta yetishmagan qator — kuniga 30 ta sizish.",
      watch: "Har endpoint eslab qolishi kerak bo'lgan tekshiruv unutiladi. Xavfsiz standart «rad etish» bo'lishi kerak.",
      fields: {
        export: "Shoshilib yozilgan yangi endpoint.",
        company_id: "Tokendan emas, URL'dan olingan. Har kim istalgan kompaniyani yoza oladi.",
      },
    },
    policy: {
      short: "Siyosat",
      title: "Bitta siyosat, bitta joydan so'raladi",
      body: "Barcha qoidalar bitta siyosatga ko'chadi: subject, amal va resurs berilsa, ruxsat yoki rad javobini beradi. Har endpoint umumiy middleware orqali undan so'raydi, aniq ruxsat etilmagan hamma narsa rad etiladi.\n\nQoidalar endi bitta joyda yashaydi va tekshiriladi. Eksport sizishi yopildi, narxi — har so'rovga bir necha millisekund.",
      watch: "Siyosat servisi endi har so'rov yo'lida. Qarorlarni qisqa muddat keshlang yoki uni API yonida kutubxona sifatida ishga tushiring.",
      fields: {
        subject: "Kim so'rayapti: tokendan ID, kompaniya va rollar.",
        action: "Nima qilmoqchi.",
        resource: "Nimaga nisbatan, qoidalarga kerak atributlar bilan.",
        allow: "Rad. Hatto `c_9` admini ham `c_7` dan hech narsa olmaydi.",
        reason: "Audit va debug uchun log'ga yoziladi; murojaatchiga to'liq ko'rsatilmaydi.",
      },
    },
    abac: {
      short: "ABAC",
      title: "ABAC: faqat rol emas, atributlar haqida qoidalar",
      body: "Yangi qoidalar: buxgalter faqat 50 milliongacha bo'lgan hisob-fakturani tasdiqlay oladi, o'zi yaratganini hech qachon, va faqat ish vaqtida. Faqat rollar buni ayta olmaydi.\n\n**ABAC** subject, resurs va kontekst atributlari bo'yicha qaror qiladi. Oddiy qismni RBAC qoplaydi, ABAC qoidalari shartlarni qo'shadi.",
      fields: {
        roles: "Alisa endi buxgalter: rol umuman tasdiqlashga ruxsat beradi.",
        amount: "72 million, 50 million chegarasidan yuqori.",
        created_by: "Bu hisob-fakturani Alisaning o'zi yaratgan. To'rt ko'z qoidasi: boshqa odam tasdiqlashi kerak.",
        context: "So'rov vaqti. Ba'zi qoidalar kim emas, qachonga bog'liq.",
        reason: "Rad etgan birinchi qoida.",
      },
    },
    "service-account": {
      short: "Servis akkaunti",
      title: "Hamma narsaning kaliti bor hisobot job'i",
      body: "Tungi job eksport fayllarini yasaydi. U bazaga `app_owner` sifatida ulanadi — migratsiyalarni bajaradigan o'sha akkaunt: 412 ruxsat, har jadvalda o'chirish ham bor.\n\nTozalash so'rovidagi xato vaqtinchalik jadval o'rniga `invoices` ga tegdi va 18240 qatorni o'chirdi. Bazani zaxiradan tiklashga to'g'ri keldi.",
      watch: "Servis akkauntlari ham foydalanuvchi. Xato yoki sizgan kalit aynan akkauntga ruxsat etilgan ishni qila oladi.",
      fields: {
        app_owner: "Butun sxemaning egasi. Hisobot job'iga bu hech qachon kerak emas.",
        invoices_export_tmp: "So'rov aslida mo'ljallangan jadval.",
        "DELETE 18240": "Baza akkauntga ruxsat etilganini bajardi.",
      },
    },
    "least-privilege": {
      short: "Kam imtiyoz",
      title: "Least privilege: faqat job'ga keragi",
      body: "Job o'z rolini oladi, `reports_ro`: hisob-fakturalarni o'qish, faqat o'z vaqtinchalik jadvaliga yozish va faylni faqat omborda o'z papkasiga qo'yish. 412 o'rniga uchta ruxsat.\n\nO'sha xato endi ma'lumotni o'chirish o'rniga xato bilan yiqiladi. Kirish ma'lumotlari qisqa umrli va har ishga tushirishga alohida beriladi, sizgani tez tugaydi.",
      fields: {
        reports_ro: "Faqat shu job uchun yasalgan rol.",
        "permission denied": "Xato hamon bor, lekin endi zarar qila olmaydi.",
        "GRANT SELECT": "Faqat o'qish. O'chirish ro'yxatda yo'q, demak mumkin emas.",
      },
    },
    recap: {
      short: "Xulosa",
      title: "Xulosa",
      body: "Avtorizatsiya uchun to'rt qoida.\n\n1) To'g'ri token — bu shaxs, ruxsat emas. 2) Har so'rovda egalikni tekshiring, tenant'ni tokendan oling va begona ID'ga `404` qaytaring. 3) Bitta siyosatni bitta joyda saqlang, standart — rad: rollar uchun RBAC, shartlar uchun ABAC. 4) Har servis akkauntiga faqat kerakli ruxsatli o'z rolini bering.",
    },
  },
};

export default text;
