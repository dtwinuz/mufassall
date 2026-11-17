import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Autentifikatsiya",
  summary:
    "Servis kim murojaat qilayotganini qanday biladi: parolni sizib chiqish falokat bo'lmaydigan qilib saqlash, sessiya va tokenlar, token qancha yashashi va uni qanday o'ldirish, identity provider orqali kirish va ikkinchi omil.",
  learn: [
    "Nega parollar argon2 yoki bcrypt kabi sekin, tuzli hash bilan saqlanadi",
    "Server sessiyasi va JWT access token: qaysi biri qachon mos",
    "Qisqa access token, refresh token va bekor qilish",
    "Identity provider orqali kirish (OAuth2 / OIDC) va MFA",
  ],
  nodes: {
    user: "Foydalanuvchi",
    web: "Veb ilova",
    api: "Auth API",
    users: "Foydalanuvchilar bazasi",
    attacker: "Hujumchi",
    sessions: "Sessiyalar ombori",
    orders: "Buyurtmalar servisi",
    idp: "Identity provider",
  },
  metrics: {
    cracked: "Buzilgan hash'lar",
    "login-ms": "Kirish vaqti",
    takeovers: "Akkaunt o'g'irlash",
  },
  steps: {
    leak: {
      short: "Sizish",
      title: "Foydalanuvchilar jadvali sizib chiqdi",
      body: "Foydalanuvchilar jadvalining zaxira nusxasi ochiq joyga tushib qoldi. Parollar tuzsiz (salt'siz) oddiy SHA-256 sifatida saqlangan edi.\n\nSHA-256 tez bo'lishi uchun yaratilgan: bitta GPU soniyasiga milliardlab taxmin qiladi. Bir kunda hash'larning 62% buziladi, odamlar esa bu parollarni boshqa joylarda ham ishlatadi.",
      watch: "Sizib chiqishga qarshi emas, sizib chiqish uchun rejalang. Hujumchi faylni olgandan keyin ham saqlash xavfsiz qolishi kerak.",
      check: {
        q: "Parollar endi argon2id va har foydalanuvchiga tasodifiy salt bilan saqlanadi. Nima o'zgaradi?",
        options: [
          "Deyarli hech narsa: GPU argon2'ni ham shunday tez ochadi",
          "Kirish soniyalab cho'ziladi, foydalanuvchilar norozi",
          "Kirish ~250 ms sekinlashadi, buzish deyarli to'xtaydi",
        ],
        answer: 2,
        why: "Har taxmin endi taxminan 250 ms va 64 MB turadi, taxmin qilish millionlab marta sekinlashadi: buzilgan hash'lar 62% dan 0,5% ga tushadi. Kirishdagi chorak soniyani hech kim sezmaydi.",
      },
      fields: {
        password_sha256: "Parolning tez hash'i. Bu yerda yashirilgan; sizgan faylda esa taxmin qilish uchun tayyor nishon.",
        salt: "Yo'q. Bir xil parollar bir xil hash beradi, bitta taxmin `123456` tanlagan hammani ochadi.",
      },
    },
    "slow-hash": {
      short: "Sekin hash",
      title: "Sekin, tuzli hash saqlang",
      body: "API endi parollarni **argon2id** bilan saqlaydi (bcrypt ham bo'ladi): har foydalanuvchiga tasodifiy salt va hisoblash uchun taxminan 250 ms va 64 MB talab qiladigan hash.\n\nKirish chorak soniyaga sekinlashadi, buni hech kim sezmaydi. Taxmin qilish esa millionlab marta sekinlashadi: o'sha sizish endi deyarli hech narsani ochmaydi.",
      watch: "O'z sxemangizni o'ylab topmang va parollarni kalit bilan shifrlamang. Kutubxonaning argon2 yoki bcrypt'i va uning verify funksiyasini ishlating.",
      fields: {
        password_hash: "Salt, parametrlar va hash bitta qatorda. Bu yerda yashirilgan.",
        algo: "Sekin va ko'p xotira talab qiladigan qilib yaratilgan hash, GPU kam yutadi.",
        cost: "64 MB xotira, 3 o'tish. Serverlar tezlashgan sari oshiring.",
      },
    },
    session: {
      short: "Sessiya",
      title: "Sessiya: cookie'dagi tasodifiy ID",
      body: "Parol to'g'ri chiqqach, API omborda sessiya yaratadi (`u_42`, 7 kunda tugaydi) va brauzerga cookie'da tasodifiy ID beradi.\n\nKeyingi har so'rov cookie'ni olib keladi, API ID'ni qidiradi. Chiqish oddiy: sessiyani o'chirish.",
      check: {
        q: "Yangi buyurtmalar servisi ham kim murojaat qilayotganini bilishi kerak. Sessiyalarda buning narxi qanday?",
        options: [
          "Har servisdagi har so'rov bitta omborda qidiruvga aylanadi",
          "Hech qanday: cookie'ning o'zi foydalanuvchini aytadi",
          "Har servis sessiyalarning o'z nusxasini saqlashi kerak",
        ],
        answer: 0,
        why: "Cookie'da faqat tasodifiy ID bor, shuning uchun buyurtmalar ham har so'rovni sessiyalar omborida qidiradi. Ombor 92% ga chiqadi va hammasini sekinlashtiradigan yagona nuqtaga aylanadi.",
      },
      fields: {
        password: "Faqat HTTPS orqali va faqat login endpoint'iga yuboriladi. Hech qachon log'ga yozilmaydi.",
        "Set-Cookie": "`sid=...; HttpOnly; Secure; SameSite=Lax`. HttpOnly uni JavaScript'dan va XSS'dan yashiradi. Qiymat yashirilgan.",
      },
    },
    "shared-store": {
      short: "Umumiy ombor",
      title: "Har servis sessiyalar omboridan so'raydi",
      body: "Buyurtmalar servisi paydo bo'ldi. Kim murojaat qilayotganini bilish uchun u ham har so'rovni sessiyalar omborida qidiradi.\n\nEndi har servisdagi har so'rov — Redis'ga bitta borib-kelish. Ombor 92% yuklangan va sekinlashsa hammasini sekinlashtiradigan yagona narsaga aylanadi.",
      fields: {
        GET: "Har servisdan, har so'rovga bitta qidiruv.",
        sess: "Kalit — sessiya ID'si. Kimda u bo'lsa, o'sha foydalanuvchi.",
      },
    },
    jwt: {
      short: "JWT",
      title: "JWT: istalgan servis tekshira oladigan imzoli token",
      body: "Auth API endi **access token** beradi: foydalanuvchi ID'si va tugash vaqti yozilgan, API'ning maxfiy kaliti bilan imzolangan JWT.\n\nBuyurtmalar imzoni ochiq kalit bilan tekshiradi va claim'larni o'qiydi. Qidiruv yo'q, umumiy ombor yo'q: sessiyalar ombori 25% ga tushdi.",
      watch: "JWT imzolangan, lekin shifrlanmagan. Unga ega har kim payload'ni o'qiy oladi, ichiga sir qo'ymang.",
      check: {
        q: "Foydalanuvchi chiqdi, lekin uning JWT'i log'ga yozilgan URL orqali allaqachon sizgan. Nima bo'ladi?",
        options: [
          "Buyurtmalar uni rad etadi: chiqish tokenni bekor qilgan",
          "U `exp` gacha ishlayveradi, bu yerda 30 kun",
          "U faqat foydalanuvchining o'z IP manzilidan ishlaydi",
        ],
        answer: 1,
        why: "Chiqish faqat brauzerdagi nusxani o'chirgan. Buyurtmalar markaziy ro'yxatni emas, imzoni tekshiradi, shuning uchun token tugaguncha — `iat` dan 30 kun — amal qiladi.",
      },
      fields: {
        Authorization: "`Bearer` va token. Kimda token bo'lsa, o'sha foydalanuvchi. Bu yerda yashirilgan.",
        kid: "Qaysi imzo kaliti ishlatilgan, kalitlarni almashtirish uchun.",
        sub: "Subject: token nomidan gapirayotgan foydalanuvchi.",
        exp: "Tugash vaqti. Undan keyin har servis tokenni o'zi rad etadi.",
        signature: "Maxfiy kalit bilan yasalgan. Payload'dagi har o'zgarish uni buzadi.",
      },
    },
    stolen: {
      short: "O'g'irlangan",
      title: "O'g'irlangan token 30 kun yashaydi",
      body: "Token log'ga yozilgan URL orqali sizib chiqdi. Hujumchi uni Buyurtmalar'ga yuboradi, Buyurtmalar qabul qiladi: imzo to'g'ri.\n\nFoydalanuvchi «chiqish» ni bosgan, lekin bu faqat brauzerdagi nusxani o'chirgan. Hech kim markaziy ro'yxatni tekshirmaydi, token tugaguncha — 30 kun — ishlaydi.",
      watch: "«Qidiruvsiz» ning narxi: JWT'ni `exp` dan oldin qaytarib olib bo'lmaydi.",
      fields: {
        iat: "Issued at: token qachon yaratilgan.",
        exp: "`iat` dan 30 kun keyin. Bu hujumchining imkoniyat oynasi.",
      },
    },
    refresh: {
      short: "Refresh",
      title: "Qisqa access token va refresh token",
      body: "Access token'lar endi 15 daqiqa yashaydi. Yangisini olish uchun veb ilova HttpOnly cookie'dagi **refresh token**'ni auth API'ga yuboradi.\n\nRefresh token omborda tekshiriladi va har ishlatishda almashtiriladi (rotation). O'g'irlangan access token 15 daqiqada tugaydi, hujumchining takrorlari yiqila boshlaydi.",
      fields: {
        grant_type: "«Shu refresh token uchun yangi access token ber.»",
        refresh_token: "Har safar yangisi. Eskisini qayta ishlatish — o'g'irlik belgisi: butun oila bekor qilinadi.",
        access_token: "Yangi qisqa umrli JWT. Bu yerda yashirilgan.",
        expires_in: "900 soniya. O'g'irlangan access token eng ko'pi shuncha foydali.",
      },
    },
    revoke: {
      short: "Bekor qilish",
      title: "Bekor qilish: haqiqatan chiqaradigan logout",
      body: "Chiqishda yoki parol o'zgarganda API foydalanuvchining refresh token oilasini o'chiradi. Yangi access token yasab bo'lmaydi.\n\n15 daqiqa kutib bo'lmaydigan kam holatlar uchun token ID'si servislar tekshiradigan qisqa deny list'ga tushadi. U token bilan birga muddati tugaydi.",
      fields: {
        DEL: "Refresh token oilasini o'chiradi. Keyingi refresh yiqiladi.",
        jti_8c1: "JWT'ning o'z ID'si, `jti` claim'idan. Faqat shu token rad etiladi.",
        EX: "900 soniya: undan keyin token baribir tugagan bo'ladi.",
      },
    },
    oidc: {
      short: "OIDC",
      title: "Identity provider orqali kirish",
      body: "Foydalanuvchilar endi kompaniya akkaunti bilan kira oladi. Veb ilova identity provider'ga yo'naltiradi, foydalanuvchi u yerda kiradi va bir martalik `code` bilan qaytadi.\n\nAPI code'ni serverdan-serverga foydalanuvchi kimligini aytadigan **id token** (OIDC) ga almashtiradi. Ilova o'sha parolni umuman ko'rmaydi.",
      watch: "Id token'ning issuer, audience va tugash vaqtini tekshiring. Noto'g'ri issuer'dan to'g'ri imzo — bu login emas.",
      fields: {
        Authorization: "Ilovaning o'z client ID va secret'i, provider kim so'rayotganini bilishi uchun. Bu yerda yashirilgan.",
        code: "Redirect'dan kelgan bir martalik, qisqa umrli kod. Client secret'siz foydasiz.",
        redirect_uri: "Ro'yxatdan o'tgani bilan aynan mos kelishi kerak, aks holda provider rad etadi.",
        code_verifier: "PKCE: login'ni boshlagan aynan shu client ekanini isbotlaydi.",
        id_token: "Foydalanuvchi haqidagi imzoli JWT: `sub`, email, issuer. Bu yerda yashirilgan.",
      },
    },
    mfa: {
      short: "MFA",
      title: "Ikkinchi omil qayta ishlatilgan parollarni to'xtatadi",
      body: "Hujumchilar boshqa saytlardan sizgan email va parol juftlarini `/login` ga sinab ko'rishadi. Ba'zilari to'g'ri chiqadi.\n\n**MFA** bilan to'g'ri parol faqat ikkinchi qadamni ochadi: authenticator ilovadagi kod yoki passkey. Qurilmasiz login shu yerda to'xtaydi.",
      fields: {
        password: "To'g'ri, boshqa saytning sizishidan olingan. Endi uning o'zi yetmaydi.",
        mfa_required: "Parol to'g'ri, lekin hali sessiya yo'q.",
        methods: "TOTP kod yoki passkey. Passkey phishing'ga ham chidamli.",
        mfa_token: "Ikkinchi qadamni shu urinishga bog'laydi, bir necha daqiqa amal qiladi. Bu yerda yashirilgan.",
      },
    },
    recap: {
      short: "Xulosa",
      title: "Xulosa",
      body: "Autentifikatsiya uchun to'rt qoida.\n\n1) Parollarni sekin, tuzli hash bilan saqlang (argon2id, bcrypt). 2) Sessiyani bekor qilish oson; JWT'ni hamma joyda tekshirish oson, shuning uchun uni qisqa qiling. 3) 15 daqiqalik access token'ni almashinadigan refresh token bilan juftlang va refresh token'larni o'chirib bekor qiling. 4) Login uchun identity provider'ni afzal ko'ring, MFA qo'shing; token'larni hech qachon URL'ga qo'ymang, log'lar uni saqlab qoladi.",
    },
  },
};

export default text;
