import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Fayl yuklash",
  summary:
    "Telefonlar 180 MB'lik video yuklaydigan va minglab odam ko'radigan ilova. Nega baytlar API orqali o'tmasligi kerak va ishni presigned URL, multipart upload, worker va CDN qanday bo'lishib oladi.",
  learn: [
    "Nega ilova serveri orqali yuklash sekin va uning diskini to'ldiradi",
    "Presigned URL: API imzolaydi, telefon to'g'ridan-to'g'ri storage'ga yuklaydi",
    "Multipart upload: butun fayl emas, faqat yiqilgan qism qayta yuboriladi",
    "Thumbnail va transkodlash worker'da, tarqatish CDN orqali, bazada faqat metama'lumot",
  ],
  nodes: {
    phone: "Telefon ilovasi",
    api: "API",
    disk: "API diski",
    bucket: "Object storage",
    db: "Baza",
    queue: "Navbat",
    worker: "Media worker",
    viewer: "Tomoshabinlar",
    cdn: "CDN",
  },
  metrics: {
    upload: "Yuklash p95",
    failed: "Yiqilgan yuklash",
    cost: "Oylik xarajat",
  },
  steps: {
    "through-api": {
      short: "API orqali",
      title: "Har bayt API orqali o'tadi",
      body: "Foydalanuvchi telefondan 180 MB video yuklaydi. Ilova uni API'ga yuboradi, API butun oqimni o'qib, o'z lokal diskiga yozadi.\n\nBir yarim daqiqa davomida bitta API worker'i faqat bayt ko'chiradi. Bir vaqtda bir necha o'nta yuklash bo'lsa, oddiy so'rovlar uchun worker qolmaydi.",
      watch: "Ilova serveri ko'p qisqa so'rov uchun qurilgan. Uzun yuklash butun vaqt davomida ulanish, xotira va worker'ni band qiladi.",
      fields: {
        Authorization: "Foydalanuvchi tokeni. Sir, shuning uchun yashirilgan.",
        "Content-Length": "Bitta so'rov tanasida 180 MB. 99% da uzilsa — boshidan.",
        "X-Response-Time": "Bitta so'rovga 94 soniya. Load balancer va proksilar ko'pincha 60 da uzadi.",
      },
    },
    "disk-full": {
      short: "Disk to'ldi",
      title: "Disk to'ldi, boshqa serverda fayl yo'q",
      body: "Videolar API'ning o'z diskida yozuv yiqilguncha to'planadi. Yuklashlar yiqila boshlaydi, ular bilan birga butun server ham.\n\nIkkinchi muammo: load balancer ortida ikkita API server bor. `api-1` da saqlangan fayl `api-2` da yo'q, shuning uchun ko'rishlarning yarmi 404 qaytaradi.",
      fields: {
        "no space left on device": "Lokal disk to'ldi. Bu serverdagi har yozuv endi yiqiladi, faqat yuklash emas.",
        "404": "Fayl boshqa serverning diskida. Lokal disk serverlar bilan birga kengaymaydi.",
      },
    },
    presign: {
      short: "Presign",
      title: "API imzolaydi, telefon yuklaydi",
      body: "Fayllar endi object storage'da: katta obyektlar uchun qurilgan alohida servis, to'ladigan disk yo'q. Telefon API'dan ruxsat so'raydi va qisqa muddatli imzolangan URL oladi.\n\nBaytlar telefondan to'g'ridan-to'g'ri storage'ga boradi. API faqat foydalanuvchi kimligini va fayl qancha katta bo'lishi mumkinligini tekshiradi. Uning yuki 10% ga tushadi.",
      watch: "Hajm va kontent turini ham imzolang, aks holda URL uni topib olgan har kim uchun tekin omborga aylanadi.",
      fields: {
        size: "API imzolashdan oldin limitni tekshiradi. 5 GB fayl yuklashdan keyin emas, shu yerda rad etiladi.",
        url: "Baytlar qayerga yuboriladi. API'ga emas: object storage'ga.",
        expires_in: "Ruxsat 15 daqiqa amal qiladi. Sizib chiqqan URL tez orada ishlamay qoladi.",
        "X-Upload-Signature": "Kalit, hajm va muddat ustidan API imzosi. Storage uni API'ni chaqirmasdan tekshiradi. Bu yerda yashirilgan.",
      },
    },
    flaky: {
      short: "Beqaror tarmoq",
      title: "Mobil tarmoq: 80% bo'ldi, boshidan",
      body: "Bitta `PUT` butun 180 MB'ni olib ketadi. Yurib ketayotgan avtobusdagi telefonda ulanish 151 MB da uziladi.\n\nIlova birinchi baytdan boshlashga majbur. Kuchsiz tarmoqda katta fayl hech qachon tugamasligi mumkin, har urinish esa foydalanuvchining mobil trafigini yeydi.",
      fields: {
        "Content-Length": "Butun fayl bitta so'rovda: yo hammasi, yo hech narsa.",
        "connection reset": "Yuklash o'rtasida tarmoq uzildi. Shu paytgacha yuborilgan hamma narsa yo'qoldi.",
        "byte 0": "Qayta urinish eng boshidan boshlanadi.",
      },
    },
    multipart: {
      short: "Multipart",
      title: "Multipart: fayl 8 MB'lik qismlarda",
      body: "Yuklash 8 MB'lik 23 qismga bo'linadi. Telefon bir nechtasini parallel yuboradi va faqat yiqilgan qismni qayta yuboradi. Oxirida storage'ga qismlarni bitta obyektga birlashtirishni aytadi.\n\nUzilgan ulanish endi ko'pi bilan 8 MB turadi. Yiqilgan yuklashlar yarim foizdan pastga tushadi.",
      watch: "Tugallanmagan multipart yuklashlar o'chirilguncha joy egallaydi. Ularni bir kundan keyin o'chiradigan storage qoidasini qo'ying.",
      fields: {
        uploadId: "Bitta multipart yuklash. Har qism unga ishora qiladi.",
        partNumber: "23 tadan 17-qism. Qismlar istalgan tartibda kelishi mumkin.",
        "Content-Length": "8 MB: kuchsiz tarmoqda qayta yuborsa bo'ladigan kichik bo'lak.",
        ETag: "Storage'ning shu qism uchun nazorat summasi. Yakuniy chaqiruv barcha ETag'larni tartib bilan sanab beradi.",
      },
    },
    metadata: {
      short: "Metama'lumot",
      title: "Bazada fayl emas, qator",
      body: "Yuklash tugagach, telefon API'ga xabar beradi. API obyekt haqiqatan borligini tekshiradi va bitta qator yozadi: video kimniki, qayerda yotibdi, hajmi qancha va qaysi holatda.\n\nBaza fayl haqidagi faktlarni saqlaydi, baytlarni hech qachon. Baytlar storage'da qoladi, qator ularga kalit orqali ishora qiladi.",
      fields: {
        object_key: "Storage'dagi obyekt yo'li. Qator va baytlar orasidagi yagona bog'.",
        status: "`uploaded`: xom fayl joyida, lekin ko'rishga hali tayyor emas.",
      },
    },
    "sync-transcode": {
      short: "Transkod",
      title: "So'rov ichida transkodlash",
      body: "Tomoshabinlarga 720p versiya va thumbnail kerak. Birinchi versiya buni to'g'ridan-to'g'ri API'da qildi: xom faylni yukla, konverterni ishga tushir, natijani yukla.\n\nBitta video 68 soniya to'liq CPU oladi. Boshqa so'rovlar uning ortida navbatda turadi, health check timeout bo'ladi va load balancer serverni aylanishdan chiqaradi.",
      fields: {
        transcode: "Video konvertatsiyasi millisekund emas, daqiqalar oladigan og'ir CPU ishi.",
        queued: "Oddiy so'rovlar og'ir ish ortida kutadi.",
        "timed out": "Load balancer serverni o'lgan deb hisoblaydi va unga trafik yubormay qo'yadi.",
      },
    },
    worker: {
      short: "Worker",
      title: "Storage hodisasi, navbat, worker",
      body: "Endi yangi obyekt paydo bo'lganda storage hodisa e'lon qiladi. Hodisa navbatga tushadi, alohida media worker uni oladi, 720p versiya va thumbnail'larni yasaydi, storage'ga qaytarib yozadi va holatni `ready` qiladi.\n\nAPI yana yengil. Worker'lar o'zicha kengayadi: video ko'p — worker ko'p, sahifada hech kim kutmaydi.",
      watch: "Bitta hodisa ikki marta kelishi mumkin. Natijalarni o'zgarmas kalitlar ostida yozing, shunda takror ularni shunchaki ustidan yozadi.",
      fields: {
        event: "Yangi obyekt yaratildi. Worker storage'ni so'rab o'tirmaydi.",
        key: "Qaysi faylni ishlash kerak. Worker bazadagi qatorni ham shu kalit bo'yicha topadi.",
      },
    },
    viral: {
      short: "Viral",
      title: "Video viral bo'ldi",
      body: "Minglab tomoshabin bitta videoni ochadi, har biri uni bitta regiondagi storage'dan oladi. Uzoqdagi tomoshabinlar ijro boshlanguncha 3 soniya kutadi.\n\nStorage'dan chiqqan har bayt pullik trafik. Oylik hisob bir haftada ikki barobar oshadi.",
      fields: {
        "Content-Length": "Har ko'rishga 40 MB. Bitta faylning minglab ko'rilishi — minglab bir xil yuklab olish.",
        "X-Response-Time": "Storage regionidan uzoqda birinchi baytlar sekin keladi.",
      },
    },
    cdn: {
      short: "CDN",
      title: "Storage oldida CDN",
      body: "Tomoshabinlar endi videoni CDN'dan oladi: ko'p shaharlardagi serverlar nusxani foydalanuvchiga yaqin saqlaydi. Regiondagi faqat birinchi so'rov storage'ga boradi, qolganlari chekkadan beriladi.\n\nPleyer faylni bo'laklab so'raydi, shuning uchun ijro birinchi megabaytdan keyin boshlanadi. Storage trafigi va xarajat keskin tushadi.",
      watch: "Shaxsiy videolar uchun muddatli imzolangan CDN havolalarini ishlating, aks holda nusxalangan havola har kim uchun ishlaydi.",
      fields: {
        Range: "Pleyer faqat birinchi megabaytni so'raydi, keyingisini ijro davomida.",
        "Cache-Control": "Ishlangan fayl o'z nomi ostida hech qachon o'zgarmaydi, shuning uchun chekka uni bir yil saqlashi mumkin.",
        "X-Cache": "`HIT`: chekkadan berildi, storage'dan so'ralmadi.",
      },
    },
    recap: {
      short: "Xulosa",
      title: "Xulosa",
      body: "Fayllar uchun besh qoida.\n\n1) Baytlar API orqali o'tmaydi: u qisqa muddatli URL imzolaydi, mijoz object storage'ga yuklaydi. 2) Katta fayllar birma-bir qayta yuborsa bo'ladigan qismlarda boradi. 3) Bazada fayl emas, metama'lumot va obyekt kaliti. 4) Og'ir ishlov hodisa ishga tushiradigan worker'da. 5) Ko'rishlar CDN orqali, o'zgarmaydigan fayllar uzoq keshlanadi.",
    },
  },
};

export default text;
