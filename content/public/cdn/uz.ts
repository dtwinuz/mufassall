import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "CDN va chekka keshlar",
  summary:
    "Do'kon serveri bir qit'ada, xaridorlari boshqasida. Rasm va skriptlar foydalanuvchilarga yaqin chekka keshlarga (edge) ko'chadi: so'rov edge'ga qanday yetadi, qachon origin'ga qaytadi, faylni qanday almashtirish va nimani hech qachon keshlab bo'lmaydi.",
  learn: [
    "Edge kesh foydalanuvchi va origin orasida qanday turadi, miss va hit qanchaga tushadi",
    "Nima va qancha keshlanishini `Cache-Control` hal qiladi",
    "Faylni almashtirish: purge yoki versiyali URL",
    "Origin shield va nega shaxsiy javoblar hech qachon keshlanmaydi",
  ],
  nodes: {
    client: "Xaridor, A hudud",
    origin: "Origin server",
    bucket: "Fayl ombori",
    edge: "Edge kesh A",
    ops: "Muhandis",
    client2: "Xaridor, B hudud",
    edge2: "Edge kesh B",
    shield: "Origin shield",
  },
  metrics: {
    p95: "Sahifa yuklanishi p95",
    "hit-ratio": "Edge'da hit ulushi",
    "origin-reqs": "Origin'ga so'rovlar",
    wrong: "Noto'g'ri kontent",
  },
  steps: {
    "far-origin": {
      short: "Uzoqda",
      title: "Har rasm sayyoraning yarmini kesib o'tadi",
      body: "Do'kon serveri bitta data markazda. Uzoqdagi xaridor 40 ta rasm va bir nechta skriptli mahsulot sahifasini ochadi, ularning har biri butun masofani borib-keladi.\n\nFaqat tarmoq kechikishi har borib-kelishga 200 ms atrofida. Sahifa deyarli ikki soniya ochiladi, server esa bir xil fayllarni qayta-qayta yuborish bilan band.",
      fields: {
        "Content-Length": "Bitta rasm uchun 412 KB. Har tashrifchi uchun o'sha baytlar serverdan chiqadi.",
        "Server-Timing": "Jami 1870 ms. Ko'p qismi ish emas, masofa.",
      },
    },
    "edge-cache": {
      short: "Edge",
      title: "Xaridorlar yonida kesh",
      body: "CDN ko'p shaharlarda kesh serverlarini ushlab turadi. Statik fayllarga alohida nom beriladi, DNS esa bu nomni xaridorga eng yaqin edge'ga yo'naltiradi.\n\nXaridor endi bir necha millisekund narida turgan server bilan gaplashadi. Edge hozircha bo'sh, shuning uchun avvaliga har so'rov baribir origin'gacha boradi.",
      fields: {
        CNAME: "Do'kon nomi CDN nomining taxallusi. Qaysi edge javob berishini CDN hal qiladi.",
        "198.51.100.24": "Shu xaridorga eng yaqin edge manzili. Boshqa joydagi xaridor boshqasini oladi.",
      },
    },
    miss: {
      short: "Miss",
      title: "Miss: edge origin'dan bir marta so'raydi",
      body: "Edge'da rasm hali yo'q. U uni origin'dan oladi, xaridorga uzatadi va nusxasini saqlab qoladi.\n\nNusxa saqlash mumkinmi va qancha vaqtga — buni origin `Cache-Control` sarlavhasida hal qiladi.",
      watch: "`Cache-Control` bo'lmasa, har CDN o'zicha taxmin qiladi. Uni doim aniq qo'ying.",
      fields: {
        "Cache-Control": "`public`: istalgan kesh saqlashi mumkin. `max-age=86400`: bir kunga.",
        ETag: "Fayl shu versiyasining barmoq izi. Keyin edge «o'zgardimi?» deb arzon so'ray oladi.",
      },
    },
    hit: {
      short: "Hit",
      title: "Hit: origin ishtirok etmaydi",
      body: "Shu hududdagi keyingi har xaridor rasmni to'g'ridan-to'g'ri edge'dan oladi. So'rovlarning 95% origin'ga umuman yetmaydi.\n\nSahifalar 100 ms atrofida ochiladi, origin deyarli bo'sh turadi.",
      fields: {
        "X-Cache": "Edge keshidan javob berildi.",
        Age: "Bu nusxa keshda 5312 soniyadan beri turibdi, taxminan bir yarim soat.",
      },
    },
    "wrong-image": {
      short: "Eski fayl",
      title: "Rasm o'zgardi, edge'da esa eskisi",
      body: "Do'kon o'sha fayl nomi bilan yaxshiroq rasm yuklaydi. Origin'da yangi rasm; edge'lar esa `max-age` tugaguncha eskisini berishda davom etadi.\n\nBir kungacha ba'zi xaridorlar qaysi edge'ga tushishiga qarab eski rasmni ko'radi.",
      fields: {
        ETag: "Eski barmoq izi. Bu faylning oldingi versiyasi.",
        Age: "8 soatlik va edge bilishicha yana 16 soat amal qiladi.",
      },
    },
    purge: {
      short: "Purge",
      title: "Purge: har edge'ga faylni tashlashni ayt",
      body: "Muhandis CDN'ning purge API'sini chaqiradi. Bir necha soniyada har edge o'z nusxasini tashlaydi, keyingi so'rov yangi rasmni oladi.\n\nIshlaydi, lekin bu har o'zgarishdan keyingi qo'lda qadam, va purge'dan so'ng darhol barcha edge'lar birdaniga miss oladi.",
      fields: {
        Authorization: "CDN akkaunt kaliti. Bu yerda yashirilgan.",
        paths: "Qaysi fayllar tashlanadi. Wildcard purge ancha ko'p narsani bo'shatadi va origin'ga qattiqroq uradi.",
        eta_s: "Barcha edge'lar tashlaguncha taxminan 5 soniya.",
      },
    },
    versioned: {
      short: "Versiyalar",
      title: "Versiyali URL: yangi faylga yangi nom",
      body: "Build har fayl nomiga uning tarkibidan olingan qisqa hash qo'shadi. Yangi rasm = yangi URL; eski URL shunchaki boshqa so'ralmaydi.\n\nEndi har faylni bir yilga keshlash mumkin va hech narsani purge qilish shart emas. Faqat URL'larni sanab beradigan HTML sahifa qisqa kesh muddatida qoladi.",
      watch: "Shuning uchun sahifaning o'zi uzoq keshlanmasligi kerak: yangi nomlarga aynan u ishora qiladi.",
      fields: {
        "3f9a2c": "Fayl tarkibining hash'i. Bitta bayt o'zgarsa, nom ham o'zgaradi.",
        "Cache-Control": "Bir yil va `immutable`: bu nom ostida hech qachon boshqa kontent bo'lmaydi.",
      },
    },
    "many-edges": {
      short: "Ko'p edge",
      title: "Har edge origin'dan o'zi so'raydi",
      body: "Ikkinchi hududdagi xaridorlarga o'z edge'i beriladi. Dunyo bo'ylab 41 ta edge bor, reliz'dan keyin har biri yangi skriptni alohida miss qiladi.\n\nOrigin bir daqiqada bitta faylga 41 ta bir xil so'rov oladi, reliz'dagi boshqa yangi fayllar ustiga. U sekinlashadi.",
      fields: {
        MISS: "Har edge o'zi uchun miss oladi. Edge'lar keshini bir-biri bilan bo'lishmaydi.",
        "41 edges": "Bitta fayl uchun 41 ta bir xil so'rov, reliz'dagi har yangi faylga ko'paytiring.",
      },
    },
    shield: {
      short: "Shield",
      title: "O'rtada origin shield",
      body: "Edge'lar endi origin o'rniga bitta o'rta keshdan, **origin shield**'dan so'raydi. Origin bilan faqat shield gaplashadi.\n\n41 ta edge bir xil faylni miss qilsa, shield uni bir marta oladi va qolganlarga beradi. Origin yana tinch.",
      fields: {
        Via: "So'rov yo'li: B edge, keyin shield. Shundan keyingina origin'ga yetadi.",
        "Cache-Control": "Avvalgi sarlavhaning o'zi: shield edge'lar bilan bir xil qoidaga amal qiladi.",
      },
    },
    "private-leak": {
      short: "Sizib chiqish",
      title: "Shaxsiy javob keshlandi",
      body: "Savat endpoint'i xato bilan `public` deb javob berdi. Edge `u_42` xaridorning savatini bir daqiqaga keshladi va `/api/cart` ni ochgan keyingi xaridorga berdi.\n\nSarlavhadagi bitta qator ma'lumot sizib chiqishiga aylandi.",
      watch: "Kim so'rayotganiga bog'liq har narsa (savat, profil, buyurtmalar, ismi yozilgan sahifa) hech qachon umumiy keshga tushmasligi kerak.",
      fields: {
        Cookie: "So'ragan xaridor — `u_77`. Edge bunga qaramadi.",
        "Cache-Control": "`public` har umumiy keshga saqlashga ruxsat beradi. Shaxsiy javob uchun noto'g'ri.",
        "X-Cache": "Keshdan berildi: origin bu so'rovni umuman ko'rmadi.",
        user_id: "Boshqa birovning savati.",
      },
    },
    "no-store": {
      short: "No store",
      title: "Shaxsiy javoblar: private, no-store",
      body: "Shaxsiy API javoblari endi `private, no-store` bilan keladi. Edge ularni har safar origin'ga o'tkazadi va hech narsa saqlamaydi.\n\nHit ulushi biroz tushadi, chunki bu so'rovlar doim origin'ga boradi. Bu to'g'ri narx.",
      fields: {
        "Cache-Control": "`private`: faqat xaridorning o'z brauzeri saqlashi mumkin. `no-store`: hech qayerga yozma.",
        "X-Cache": "Edge o'z keshini butunlay chetlab o'tdi.",
        user_id: "To'g'ri xaridorga to'g'ri savat.",
      },
    },
    recap: {
      short: "Xulosa",
      title: "Xulosa",
      body: "CDN uchun besh qoida.\n\n1) Statik fayllar foydalanuvchiga yaqin edge'dan beriladi; origin faqat miss'larni to'ldiradi. 2) Origin har javobda `Cache-Control` ni aniq qo'yadi. 3) Fayllar versiyali URL bilan almashtiriladi; purge favqulodda holat uchun. 4) Origin shield ko'p edge miss'ini bittaga aylantiradi. 5) Shaxsiy javoblar doim `private, no-store`.",
    },
  },
};

export default text;
