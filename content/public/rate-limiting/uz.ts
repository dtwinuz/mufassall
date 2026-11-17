import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Rate limiting",
  summary:
    "Bitta shovqinli klient API'ni hamma uchun sekinlashtirishi mumkin. Har klientni adolatli cheklash: oynalar, token bucket, 429 javobi va hamma serverlar bo'lishadigan hisoblagich.",
  learn: [
    "Fixed window, sliding window va token bucket, har biri qayerda sinadi",
    "Yaxshi `429` javobi klientga nima aytadi",
    "Kimni cheklash kerak: IP, API kalit yoki foydalanuvchi",
    "Nega hisoblagich umumiy bo'lishi kerak va u yo'qolsa nima qilish kerak",
  ],
  nodes: {
    partner: "Hamkor ilovasi",
    bot: "Skript",
    office: "Ofis (300 kishi)",
    api: "API",
    api2: "API 2",
    api3: "API 3",
    lb: "Load balancer",
    db: "Baza",
    redis: "Redis",
  },
  metrics: {
    p95: "Hamkor p95",
    errors: "Oddiy klientlar xatosi",
    over: "Limitdan oshish",
  },
  steps: {
    noisy: {
      short: "Shovqinli klient",
      title: "Bitta skript butun API'ni egallaydi",
      body: "Kimdir butun katalogni imkon qadar tez varaqlaydigan skript ishga tushirdi: soniyasiga 900 so'rov. API va baza to'liq yuk bilan ishlayapti.\n\nSoniyasiga ikki so'rov yuboradigan hamkor ilovasi endi ikki soniyadan ko'p kutadi va ba'zan timeout oladi.",
      watch: "Limit bo'lmasa, eng og'ir kuningizni haqiqiy trafik emas, eng shovqinli klient belgilaydi.",
      fields: {
        "X-Api-Key": "Skriptda haqiqiy kalit bor. So'rovlar ruxsat etilgan, faqat juda ko'p.",
        page: "8812-sahifa: hech kim buncha uzoq o'qimaydi. Bu foydalanuvchi emas, crawl.",
        "X-Response-Time": "Bu so'rov ham o'z birodarlari ortidagi navbatda 2,4 soniya kutdi.",
      },
    },
    "fixed-window": {
      short: "Fixed window",
      title: "So'rovlarni soniya bo'yicha sanash",
      body: "API endi har IP uchun joriy soniyaga hisoblagich yuritadi. Birinchi 10 ta so'rov o'tadi; 11-sidan soniya tugaguncha bazaga tegmasdan darhol `429` qaytaradi.\n\nSkript hamon soniyasiga 900 yuboradi, lekin ulardan 890 tasi deyarli tekin. Yuk tushadi, hamkor yana tez.",
      watch: "Rad etish arzon bo'lishi kerak. Limitni auth tekshiruvi, baza chaqiruvi va har qanday og'ir ishdan oldin tekshiring.",
      check: {
        q: "Skript bir soniyaning oxirida 10 ta, keyingisining boshida yana 10 ta so'rov yuboradi. Qanchasi o'tadi?",
        options: ["10 ta: limit soniyasiga 10 ta", "20 tasi ham, 200 ms ichida", "10 ta, ikkinchi to'da `429` oladi"],
        answer: 1,
        why: "Har oyna noldan sanaydi, shuning uchun ikkalasi ham «10 dan 10» deydi. Baza 200 ms ichida 20 ta so'rov oladi, mo'ljaldagidan ikki barobar, va har tekshiruv o'tdi.",
      },
      fields: {
        "429": "Too Many Requests: «sekinlashing» degan standart javob, «siz buzuqsiz» emas.",
        "Retry-After": "Qachon qayta urinish, soniyada. Odobli klient aynan shuncha kutadi.",
        "X-RateLimit-Remaining": "Bu oynada nechta so'rov qoldi. Yaxshi klient nolga yetmasdan sekinlashadi.",
      },
    },
    boundary: {
      short: "Chegara",
      title: "Oyna chetida limit ikki barobar",
      body: "Skript ritmni o'rganadi: bir soniyaning eng oxirida 10 ta, keyingisining eng boshida yana 10 ta so'rov. Ikkala oyna ham «10 dan 10, joyida» deydi.\n\nBaza 200 ms ichida 20 ta so'rov oladi, mo'ljaldagidan ikki barobar. Daqiqalik oynada xuddi shu hiyla butun daqiqani ikki barobar qiladi.",
      watch: "Fixed window so'rovni har oyna bo'yicha cheklaydi, shu uzunlikdagi istalgan oraliq bo'yicha emas.",
      fields: {
        window: "Har oyna noldan sanaydi. U oldingisi haqida hech narsa bilmaydi.",
        "20 requests": "Soniyaning beshdan birida ikki barobar limit, va har tekshiruv o'tdi.",
      },
    },
    sliding: {
      short: "Sliding",
      title: "Sliding window orqaga qaraydi",
      body: "**Sliding window** kalendar soniyasini emas, istalgan paytdagi oxirgi bir soniyani sanaydi. Arzon varianti ikkita hisoblagich saqlaydi va oldingi soniyani hali qancha qismi ustma-ust tushishiga qarab tortadi.\n\nChetdagi hiyla endi ishlamaydi: 12:00:01.250 da skript o'z byudjetini allaqachon sarflagan.",
      check: {
        q: "Hamkor ilovasi ochilganda birdaniga 25 ta so'rov yuboradi, keyin bir daqiqa jim turadi. Sliding window nima qiladi?",
        options: [
          "25 tasini ham o'tkazadi: o'rtachasi limitdan ancha past",
          "Ortiqcha 15 tasini ushlab, keyingi soniyada yuboradi",
          "Ulardan 15 tasini `429` bilan rad etadi",
        ],
        answer: 2,
        why: "Sliding window faqat bir soniyadagi 25 ta so'rovni ko'radi: 10 tasini o'tkazadi, 15 tasini rad etadi. Odobli klient so'rovlarini yo'qotadi, foydalanuvchi yarmi bo'sh ekranni ko'radi.",
      },
      fields: {
        "previous second": "Ikki hisoblagich: oxirgi to'liq soniya va hozirgisi shu paytgacha.",
        estimate: "Joriy soniyaning choragi o'tdi, demak oldingisining to'rtdan uch qismi hali hisobda.",
        reject: "10 dan ko'p: yangi soniya endi boshlangan bo'lsa ham so'rov rad etiladi.",
      },
    },
    burst: {
      short: "Burst",
      title: "Halol to'lqin (burst) rad etiladi",
      body: "Hamkor ilovasi ochilganda bosh ekranni birdaniga 25 ta so'rov bilan yuklaydi, keyin bir daqiqa jim turadi. O'rtacha hisobda bu limitdan ancha past.\n\nSliding window bir soniyada 25 tani ko'radi va 15 tasini rad etadi. Foydalanuvchi yarmi bo'sh ekranni ko'radi.",
      watch: "Haqiqiy klientlar to'lqin-to'lqin (bursty) ishlaydi. Faqat tekis tezlikka ruxsat beradigan limit oddiy xulqni jazolaydi.",
      fields: {
        rejected: "Odobli klientning o'n beshta so'rovi yo'qoldi.",
        "next 60 s": "Portlashdan keyin ilova hech narsa yubormaydi. O'rtachasi soniyasiga bittadan kam.",
      },
    },
    "token-bucket": {
      short: "Token bucket",
      title: "Token bucket: to'lqinga ruxsat, o'rtacha qat'iy",
      body: "Har klientga 30 tagacha token sig'adigan **chelak** (bucket) beriladi, u soniyasiga 10 tadan to'ladi. Har so'rov bitta token oladi; token qolmasa javob `429`.\n\nHamkorning 25 talik to'lqini chelakka sig'adi. Skript uni bir zumda bo'shatadi va keyin soniyasiga 10 ta bilan cheklanadi. Har klient uchun faqat ikkita son saqlanadi.",
      watch: "Sig'im eng katta to'lqinni, to'lish tezligi uzoq muddatli tezlikni belgilaydi. Ularni alohida sozlang.",
      fields: {
        capacity: "Klient birdaniga yubora oladigan eng katta to'lqin.",
        refill: "Barqaror tezlik: tokenlar shu tezlikda qaytadi.",
        tokens: "Qolgani. Portlashdan keyin 5, bir soniyadan keyin yana 15.",
      },
    },
    "shared-ip": {
      short: "Umumiy IP",
      title: "Bitta IP ortida 300 kishi",
      body: "Mijozning 300 kishilik ofisi internetga bitta manzil orqali chiqadi. Limiter uchun ular bitta juda faol klientdek ko'rinadi.\n\nUlar soniyasiga 10 ta so'rovni bo'lishadi va ishlarining ko'pi `429` bilan yiqiladi. Ayni paytda yuzta arzon IP'si bor skript limitdan yuz barobar ko'p oladi.",
      watch: "IP — bu odam emas: NAT, mobil operatorlar va proksilar ko'p foydalanuvchini bitta manzil ortiga qo'yadi.",
      fields: {
        "X-Forwarded-For": "Ofisning ommaviy manzili, 300 kishining hammasida bir xil.",
        "429": "Oddiy xodim hamkasblarining trafigi tufayli bloklandi.",
      },
    },
    "per-key": {
      short: "Kalit bo'yicha",
      title: "Manzil bo'yicha emas, kalit bo'yicha cheklash",
      body: "Autentifikatsiyali chaqiruvlar endi har **API kalit** (yoki har foydalanuvchi) bo'yicha cheklanadi; IP limiti faqat login kabi anonim endpoint'larda qoladi va ancha yumshoq.\n\nOfisdagi har foydalanuvchining o'z byudjeti bor. Ko'p IP'li, lekin bitta kalitli skript bitta kalit ulushini oladi.",
      watch: "Bepul kalit yaratish oson. Ro'yxatdan o'tishni ham cheklang, aks holda skript shunchaki yuzta kalit ochadi.",
      check: {
        q: "API uchta serverga o'tdi, har biri o'z xotirasida sanaydi. Bitta kalit qancha oladi?",
        options: [
          "Soniyasiga 30 ta: har server 10 tadan o'tkazadi",
          "Soniyasiga 10 ta: kalit baribir bitta",
          "Soniyasiga 3 tacha: limit uchga bo'linadi",
        ],
        answer: 0,
        why: "Load balancer bitta kalitning so'rovlarini uchala serverga tarqatadi, har biri 10 taga ruxsat beradi. Skript soniyasiga 30 ta oladi, birorta server xato ko'rsatmaydi.",
      },
      fields: {
        "X-Api-Key": "Limit endi shu identifikator uchun sanaladi. Log'da u sir bo'lib qoladi.",
        "X-RateLimit-Scope": "Klientga qaysi limit unga tegishli ekanini aytadi: bu yerda kalit bo'yicha.",
      },
    },
    "scale-out": {
      short: "Uch server",
      title: "Uch server, uchta alohida hisoblagich",
      body: "Trafik o'sdi va API load balancer ortida uchta serverda ishlaydi. Har biri hamon o'z xotirasida sanaydi.\n\nBitta kalitning so'rovlari uchala serverga tarqaladi, har biri soniyasiga 10 taga ruxsat beradi. Skript 30 ta oladi: limit jimgina uch barobar oshdi.",
      watch: "Xotiradagi limiter faqat bitta serverda to'g'ri ishlaydi. Kengaytirish uni birorta xatosiz buzadi.",
      fields: {
        key_id: "O'sha bitta kalit, uch joyda uch marta sanalgan.",
        "total allowed": "Limitdan uch barobar ko'p, har server esa uni ushlab turibman deb o'ylaydi.",
      },
    },
    redis: {
      short: "Redis",
      title: "Redis'da bitta hisoblagich",
      body: "Chelak Redis'ga ko'chadi va uni hamma API serverlar bo'lishadi. Tekshirish va token olish Redis ichida atomar bajariladigan bitta kichik skript, shuning uchun ikki server oxirgi tokenni ikkalasi ham ololmaydi.\n\nLimit yana aniq. Har so'rov Redis'ga bitta borib-kelish to'laydi, taxminan bir millisekund.",
      watch: "App'dan avval o'qib keyin yozish — poyga (race): ikki server «1 ta qoldi» ni o'qib, ikkalasi o'tadi. Buni bitta atomar qadamda qiling.",
      fields: {
        EVALSHA: "Redis'ga oldindan yuklangan skriptni ishga tushiradi. Uning o'qishi va yozishi orasida boshqa hech narsa bajarilmaydi.",
        "rl:k_88": "Har kalitga bitta chelak. Klient jim qolsa, o'zi muddati tugab o'chadi.",
        "(integer) 0": "0 — ruxsat yo'q: chelak bo'sh.",
        "(integer) 100": "Keyingi tokengacha millisekundlar. API buni `Retry-After` ga qo'yadi.",
      },
    },
    "redis-down": {
      short: "Redis o'chdi",
      title: "Limiter'ning o'zi ishdan chiqsa",
      body: "Redis ishlamayapti. API tanlashi kerak: **fail closed** — hammani rad etish, yoki **fail open** — trafikni o'tkazib yuborish.\n\nBu yerda u fail open bo'ladi: har serverda haqiqiysining uchdan biri bo'lgan qo'pol lokal limit qo'yadi va alert ko'taradi. Bir muddat limitlar sal bo'sh, lekin hech kim qulflanib qolmaydi.",
      watch: "Fail closed faqat suiiste'mol to'xtashdan qimmatroq tushadigan joyda: masalan login urinishlari yoki SMS yuborish.",
      fields: {
        "fail open": "Limiter'ning to'xtashi butun API'ning to'xtashiga aylanmasligi kerak.",
        "local limit": "Har server o'zicha soniyasiga 4 ta beradi, uch server 10 o'rniga taxminan 12 ta beradi.",
        alert: "Hozir limitlar taxminiy ekanini kimdir bilishi kerak.",
      },
    },
    recap: {
      short: "Xulosa",
      title: "Xulosa",
      body: "Rate limit qolgan hammani bitta klientdan himoya qiladi, «yo'q» deyish esa arzon bo'lishi shart.\n\n1) Fixed window chetlarda teshik beradi; sliding window va token bucket bermaydi. 2) Token bucket halol to'lqinga ruxsat beradi va o'rtachani ushlaydi. 3) `429` ni `Retry-After` bilan qaytaring. 4) Kalit yoki foydalanuvchi bo'yicha cheklang, IP faqat anonim chaqiruvlarga. 5) Server ko'p bo'lsa, hisoblagichni bitta umumiy joyda saqlang va usiz qanday ishlashni oldindan hal qiling.",
    },
  },
};

export default text;
