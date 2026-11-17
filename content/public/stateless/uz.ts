import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Holatsiz (stateless) serverlar",
  summary:
    "Do'kon API'si tizimga kirgan foydalanuvchilarni o'z xotirasida saqlaydi. Bitta serverda ishlaydi, ikkinchisini qo'shishingiz yoki birinchisini qayta ishga tushirishingiz bilan buziladi. Holat aslida qayerda turishi kerak.",
  learn: [
    "Nega jarayon xotirasidagi sessiya foydalanuvchini bitta serverga bog'lab qo'yadi",
    "Nega sticky sessiya muammoni faqat yashiradi",
    "Sessiyalarni Redis kabi umumiy omborga ko'chirish",
    "Imzolangan token: qidiruv yo'q, lekin darhol chiqarib yuborish ham yo'q",
  ],
  nodes: {
    client: "Brauzer",
    app1: "Ilova serveri 1",
    app2: "Ilova serveri 2",
    lb: "Load balancer",
    redis: "Sessiya ombori",
  },
  metrics: {
    servers: "Ishlayotgan serverlar",
    logouts: "Kutilmagan chiqishlar",
    p95: "Javob p95",
  },
  steps: {
    "one-server": {
      short: "Bitta server",
      title: "Bitta serverda tizimga kirish",
      body: "Foydalanuvchi tizimga kiradi. Server parolni tekshiradi, o'z xotirasida sessiya obyektini yaratadi va sessiya ID'si bor cookie qaytaradi.\n\nKeyingi so'rovda server cookie'ni o'qiydi va sessiyani o'sha xotiradan topadi. Bitta serverda bu oddiy va tez.",
      fields: {
        password: "Bir marta, HTTPS orqali yuboriladi. Bu yerda yashirilgan.",
        "Set-Cookie": "Sessiya ID'si. Kimda bo'lsa, o'sha shu foydalanuvchi nomidan kiradi, shuning uchun u ham yashirilgan.",
        user_id: "Kim kirdi. Server buni sessiya ID'si yonida, o'z RAM'ida eslab qoladi.",
      },
    },
    overloaded: {
      short: "Ortiqcha yuk",
      title: "Bitta server yetmay qoldi",
      body: "Trafik uch barobar oshdi. Yagona server CPU'ni deyarli 100% band qiladi va ba'zi so'rovlarga `503` bilan javob bera boshlaydi.\n\nTabiiy yechim: ilovaning ikkinchi nusxasini ishga tushirib, trafikni bo'lish.",
      fields: {
        Cookie: "Brauzer sessiya cookie'sini har so'rovda yuboradi.",
        "Retry-After": "Server mijozdan 5 soniyadan keyin qaytishni so'raydi. Foydalanuvchi xato sahifasini ko'radi.",
      },
    },
    "add-lb": {
      short: "Ikki server",
      title: "Load balancer va ikkinchi server",
      body: "Endi har so'rovni load balancer qabul qiladi va navbat bilan tarqatadi: biri 1-serverga, keyingisi 2-serverga.\n\nHar server yarim yuklangan, javoblar yana tez. Kod umuman o'zgarmadi.",
      fields: {
        upstream: "Load balancer so'rov yubora oladigan serverlar guruhi.",
        "round-robin": "Standart usul: so'rovlar serverlarga navbat bilan ketadi, foydalanuvchi kimligiga qaralmaydi.",
      },
    },
    "lost-session": {
      short: "Sessiya yo'q",
      title: "2-server bu foydalanuvchini hech ko'rmagan",
      body: "Foydalanuvchi 1-serverda kirgan. Keyingi so'rovi 2-serverga tushadi, u sessiyani o'z xotirasidan qidiradi va hech narsa topmaydi.\n\nFoydalanuvchi kirish sahifasiga qaytariladi, go'yo tasodifan: har ikkinchi bosishda.",
      watch: "Bir jarayonning xotirasini faqat o'sha jarayon ko'radi. Ilovaning ikki nusxasi = ikkita alohida xotira.",
      fields: {
        Cookie: "Mutlaqo to'g'ri sessiya ID'si. Faqat u 1-serverda yaratilgan.",
        error: "2-server buzilmagan. Unda shunchaki bunday sessiya yo'q.",
      },
    },
    sticky: {
      short: "Sticky",
      title: "Sticky sessiya: doim o'sha server",
      body: "Load balancer endi sessiya cookie'sidan hash oladi va foydalanuvchini doim bitta serverga yuboradi. Chiqib ketishlar to'xtaydi.\n\nLekin yuk endi teng emas: bir nechta og'ir foydalanuvchi 1-serverga tushdi, balancer esa ularni ko'chira olmaydi.",
      watch: "Sticky sessiya holatni baribir bitta mashinada qoldiradi. U muammoni yashiradi, yo'qotmaydi.",
      fields: {
        hash: "Server navbat bilan emas, sessiya cookie'si bo'yicha tanlanadi.",
        consistent: "Server qo'shilsa yoki olib tashlansa, ko'p foydalanuvchilar eski serverida qoladi.",
      },
    },
    restart: {
      short: "Qayta ishga tushish",
      title: "Deploy 1-serverni qayta ishga tushiradi",
      body: "Yangi versiya chiqariladi va 1-server qayta ishga tushadi. Uning xotirasidagi barcha sessiyalar jarayon bilan birga yo'qoladi.\n\nMinglab foydalanuvchi bir vaqtda tizimdan chiqib ketadi, yarim to'ldirilgan savatlari ham yo'q bo'ladi.",
      fields: {
        SIGTERM: "Yangi versiya ishga tushishidan oldingi to'xtash signali. Oddiy, rejali voqea.",
        sessions: "Hammasi faqat RAM'da edi. Boshqa hech kimda nusxasi yo'q.",
      },
    },
    "shared-store": {
      short: "Umumiy ombor",
      title: "Sessiyalar umumiy omborga ko'chadi",
      body: "Serverlar endi sessiyani o'z xotirasida saqlamaydi. Ular uni alohida omborda, Redis'da o'qiydi va yozadi, unga ikkala server ham yeta oladi.\n\nEndi istalgan server istalgan so'rovga xizmat qila oladi. Load balancer yana oddiy round-robin'ga qaytadi, yuk teng.",
      watch: "**Stateless** degani shu: server so'rovlar orasida hech narsa saqlamaydi. Holat yo'qolmadi, u umumiy joyga ko'chdi.",
      fields: {
        sess: "Kalit prefiksi. Kalit cookie'ning hash'i, shuning uchun omborda xom sessiya ID'si turmaydi.",
        user_id: "Avval server xotirasida turgan o'sha ma'lumot.",
        cart_items: "Yarim to'ldirilgan savat endi istalgan serverning qayta ishga tushishidan omon qoladi.",
      },
    },
    "deploy-ok": {
      short: "Yana deploy",
      title: "O'sha deploy, hech kim sezmaydi",
      body: "Keyingi reliz uchun 1-server qayta ishga tushadi. Load balancer unga trafik yubormay qo'yadi, hammaga 2-server xizmat qiladi.\n\n2-server sessiyalarni Redis'dan o'qiydi. Hech kim tizimdan chiqmaydi; bitta server hamma ishni qilayotgani uchun javoblar biroz sekinlashadi, xolos.",
      fields: {
        Cookie: "Qayta ishga tushishdan oldin 1-serverda yaratilgan sessiya.",
        "X-Served-By": "2-server javob berdi. Foydalanuvchi farqni ko'rmaydi.",
      },
    },
    "signed-token": {
      short: "Imzoli token",
      title: "Boshqa yo'l: holat so'rov bilan birga yuradi",
      body: "Sessiya ID'si o'rniga login imzolangan token (JWT) qaytaradi, uning ichida foydalanuvchi ID'si va amal qilish muddati bor. Server imzoni o'z kaliti bilan tekshiradi, omborga murojaat kerak emas.\n\nRedis deyarli bo'sh, har server tokenni o'zi tekshira oladi.",
      watch: "Token imzolangan, shifrlanmagan. Kimda bo'lsa, ichini o'qiy oladi, shuning uchun unga sir narsa qo'ymang.",
      fields: {
        access_token: "Imzolangan token. Brauzer uni har so'rovda `Authorization` sarlavhasida yuboradi.",
        expires_in: "900 soniya (15 daqiqa) amal qiladi. Keyin mijoz yangisini olishi kerak.",
      },
    },
    revoke: {
      short: "Chiqish",
      title: "Narxi: tokenni qaytarib olib bo'lmaydi",
      body: "Foydalanuvchi o'g'irlangan noutbukda «chiqish»ni bosadi. Token yana 15 daqiqagacha amal qiladi va serverlar bu haqda hech kimdan so'ramaydi.\n\nShuning uchun kichik taqiq ro'yxati qaytadi: token ID'si u baribir tugaydigan vaqtgacha Redis'ga yoziladi. Qisqa muddatli tokenlar bu ro'yxatni kichik saqlaydi.",
      fields: {
        deny: "Endi qabul qilinmasligi kerak bo'lgan tokenlar ro'yxati.",
        jti_7f2: "Tokenning o'z noyob ID'si, `jti` maydonidan.",
        EX: "900 soniya saqlanadi: undan keyin token o'zi tugaydi.",
      },
    },
    recap: {
      short: "Xulosa",
      title: "Xulosa",
      body: "Holatsiz serverlar uchun to'rt qoida.\n\n1) So'rovlar orasida jarayon xotirasida hech narsa qolmaydi: istalgan server istalgan vaqtda o'chishi yoki qo'shilishi mumkin. 2) Sticky sessiya muammoni yashiradi, hal qilmaydi. 3) Umumiy holat umumiy omborga ketadi (Redis, baza). 4) Imzolangan token qidiruvni olib tashlaydi, lekin chiqishni qiyinlashtiradi: muddatini qisqa qiling.",
    },
  },
};

export default text;
