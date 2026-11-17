import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "So'rovning yo'li",
  summary:
    "Foydalanuvchi sahifani ochadi. Birinchi bayt kelishidan oldin so'rov manzilni topadi, ulanish ochadi, shifrlashni kelishadi, load balancer va app serverdan o'tadi, bazadan so'raydi. Millisekundlar qayerga ketadi?",
  learn: [
    "DNS, TCP va TLS so'rov yuborilmasdan oldin qancha vaqt oladi",
    "Load balancer app serverga yo'lda nima qo'shadi",
    "Nega bitta yo'q indeks butun tarmoqdan qimmatroq tushishi mumkin",
    "Masofa nega og'riydi va qayta ishlatilgan ulanish uni qanday yashiradi",
  ],
  nodes: {
    client: "Brauzer",
    resolver: "DNS resolver",
    lb: "Load balancer",
    app: "App server",
    db: "Baza",
  },
  metrics: {
    elapsed: "O'tgan vaqt",
    trips: "Borib-kelishlar",
    "db-time": "Baza vaqti",
  },
  steps: {
    dns: {
      short: "DNS",
      title: "Avval manzilni topish",
      body: "Foydalanuvchi `shop.example.com` ni yozadi. Brauzer nomga emas, faqat IP manzilga ulana oladi, shuning uchun DNS resolver'dan so'raydi.\n\nResolver manzilni va javobni qancha vaqt keshda saqlash mumkinligini qaytaradi. Bu birinchi qidiruv 38 ms oldi, do'konga esa hali hech narsa yuborilmagan.",
      fields: {
        "IN A": "Savol: shu nom uchun IPv4 manzilni ber (`A` turidagi yozuv).",
        "203.0.113.10": "Javob. Bu bitta serverning emas, do'kon load balancer'ining ochiq manzili.",
        TTL: "300 soniya. Brauzer va OS besh daqiqa davomida qayta so'ramasdan shu javobni ishlatadi.",
      },
    },
    tcp: {
      short: "TCP",
      title: "Ulanishni ochish",
      body: "Manzil ma'lum bo'lgach, brauzer 443-portga TCP ulanish ochadi. Buning uchun uch qadamli handshake kerak: `SYN`, `SYN-ACK`, `ACK`.\n\nHandshake bitta to'liq borib-kelish (round trip) oladi, bu yerda 40 ms. Foydali hech narsa yuborilmadi: ikki tomon faqat gaplashishga kelishdi.",
      watch: "Borib-kelish vaqtini optik toladagi yorug'lik tezligi cheklaydi. Tezroq server uni qisqartirmaydi, faqat yaqinroq bo'lish qisqartiradi.",
      fields: {
        SYN: "Brauzer: «gaplashmoqchiman, mana mening boshlang'ich tartib raqamim».",
        "SYN-ACK": "Load balancer: «roziman, mana meniki». Brauzerning oxirgi `ACK` i ma'lumot ham olib keta oladi.",
        "round trip": "Brauzerdan load balancer'gacha va orqaga. Handshake'ning har qadami shunday bittasini oladi.",
      },
    },
    tls: {
      short: "TLS",
      title: "Shifrlashni kelishib olish",
      body: "Yangi ulanish ustida brauzer va load balancer TLS 1.3 handshake qiladi. Ular shifr tanlaydi, server sertifikat bilan kimligini isbotlaydi, ikkalasi kalitlarni hisoblab chiqadi.\n\nTLS 1.3 yana bitta borib-kelish oladi. 118 ms o'tdi, haqiqiy so'rov esa hali brauzerdan chiqmagan.",
      fields: {
        sni: "Brauzer qaysi saytni xohlayotgani. Bitta load balancer ko'p saytga xizmat qiladi va sertifikatni shu nom bo'yicha tanlaydi.",
        alpn: "Ichkarida qaysi protokolda gaplashish: server `h2`, ya'ni HTTP/2 ni tanlaydi.",
        key_share: "Kalit almashuvining brauzer tomonidagi yarmi. Darhol yuboriladi, shunda handshake bitta borib-kelishga sig'adi.",
        certificate: "Bu server haqiqatan `shop.example.com` ekanining isboti. Uni brauzer ishonadigan markaz imzolagan.",
      },
    },
    http: {
      short: "HTTP",
      title: "So'rov app serverga yetadi",
      body: "Endi brauzer `GET /orders` yuboradi. Load balancer uni deshifrlaydi, sog'lom app serverni tanlaydi va so'rovni tez ichki tarmoq orqali uzatadi.\n\nYo'lda u bir nechta header qo'shadi: app haqiqiy klient kimligini bilsin va so'rovni log'lar bo'ylab kuzatish mumkin bo'lsin.",
      fields: {
        Cookie: "Foydalanuvchi sessiyasi. Bu sir, shuning uchun bu yerda yashirilgan.",
        "X-Forwarded-For": "Klientning haqiqiy manzili. Busiz app faqat load balancer IP'sini ko'radi.",
        "X-Request-Id": "Shu so'rovning har bir log'dagi yagona ID'si: load balancer, app va bazada.",
      },
    },
    "slow-query": {
      short: "Sekin so'rov",
      title: "Baza har bir qatorni o'qiydi",
      body: "Foydalanuvchi buyurtmalarini chiqarish uchun app bazadan oxirgi 20 tasini so'raydi. `user_id` bo'yicha indeks yo'q, shuning uchun baza ularni topish uchun 1,8 million qatorning hammasini o'qiydi.\n\nShu bitta so'rov 281 ms oladi: DNS, TCP va TLS birgalikda olganidan ko'p.",
      watch: "Ko'pchilik sekin sahifalar tarmoq sababli sekin emas. Taxmin qilishdan oldin vaqt qayerga ketayotganini o'lchang.",
      check: {
        q: "`(user_id, created_at)` bo'yicha indeks qo'shamiz. Bu sahifa bilan nima bo'ladi?",
        options: [
          "So'rov bir necha ms ga tushadi, sahifani yana tarmoq cheklaydi",
          "So'rov biroz tezlashadi, lekin sahifada baribir eng ko'p vaqt oladi",
          "Sahifa sekinlashadi: har yozuv endi indeksni yangilaydi",
        ],
        answer: 0,
        why: "Baza foydalanuvchi buyurtmalariga sakraydi va aniq 20 qator o'qiydi. So'rov 281 ms dan 4 ms ga tushadi, asosiy xarajat yana tarmoqdagi borib-kelishlar bo'ladi.",
      },
      fields: {
        user_id: "Filtr. Unda indeks bo'lmasa, baza har bir qatorni tekshirishga majbur.",
        "Seq Scan": "Ketma-ket skan: jadval boshidan oxirigacha o'qiladi.",
        "Execution Time": "20 qatorlik natija uchun 281 ms baza ishi.",
      },
    },
    index: {
      short: "Indeks",
      title: "Indeks qatorlarni to'g'ridan-to'g'ri topadi",
      body: "`(user_id, created_at)` indeksi har bir foydalanuvchining buyurtmalarini bir joyda va sana bo'yicha tartiblangan holda saqlaydi. Baza kerakli joyga sakraydi va aniq 20 qator o'qiydi.\n\nSo'rov 281 ms dan 4 ms ga tushdi. Sahifani endi yana tarmoq cheklaydi.",
      fields: {
        "CREATE INDEX": "Bir marta quriladi. Keyin baza uni har bir yozuvda o'zi yangilab turadi.",
        "Index Scan": "Baza jadval bo'ylab emas, indeks bo'ylab yuradi.",
        "rows scanned": "1,8 million o'rniga 20: indeks ularni allaqachon to'g'ri tartibda beradi.",
      },
    },
    response: {
      short: "Javob",
      title: "Javob orqaga qaytadi",
      body: "Qatorlar app'ga qaytadi, app JSON yasaydi, load balancer uni siqadi, shifrlaydi va brauzerga yuboradi.\n\nJami: 176 ms. Shundan 158 ms tarmoqdagi borib-kelishlar, serverlarning ishi esa atigi 18 ms.",
      check: {
        q: "Yangi foydalanuvchi o'sha sahifani chet eldan ochadi: borib-kelish 40 emas, 150 ms. Jami vaqt nima bo'ladi?",
        options: [
          "Deyarli o'zgarmaydi: serverlar avvalgidek tez",
          "Taxminan uch baravar oshadi: har handshake to'liq borib-kelish oladi",
          "176 ms atrofida qoladi, chunki ulanish qayta ishlatiladi",
        ],
        answer: 1,
        why: "Server ishi baribir 18 ms, lekin DNS, TCP, TLS va so'rovning har biri uzun borib-kelish to'laydi. Sahifa endi 176 emas, 558 ms da ochiladi.",
      },
      fields: {
        "server-timing": "Serverlar o'z vaqtini aytadi: load balancer 2 ms, app 11 ms, baza 4 ms. Brauzer buni dev tools'da ko'rsatadi.",
        "content-encoding": "JSON gzip bilan siqilgan: sekin oxirgi bo'g'indan kamroq bayt o'tadi.",
        next_page: "Klient 2-sahifani yangi so'rov bilan, o'sha ulanish orqali so'raydi.",
      },
    },
    far: {
      short: "Uzoqdan",
      title: "O'sha sahifa, uzoqdan",
      body: "Boshqa foydalanuvchi sahifani boshqa davlatdan mobil internet orqali ochadi. Borib-kelish endi 40 emas, 150 ms, uning resolver'i esa bu nomni hech ko'rmagan.\n\nServerlar avvalgidek tez, lekin har bir handshake to'liq borib-kelish oladi: sahifa endi 558 ms da ochiladi.",
      watch: "Kechikish har bir borib-kelishda qo'shilib boradi. Bitta ortiqcha borib-kelish talab qiladigan protokol aynan uzoqdagi foydalanuvchilar uchun sekinroq.",
      fields: {
        connect: "TCP handshake: 150 ms lik bitta borib-kelish.",
        tls: "TLS handshake: yana 150 ms.",
        TTFB: "Birinchi baytgacha vaqt: yana bitta borib-kelish va 18 ms server ishi.",
      },
    },
    reuse: {
      short: "Qayta ulanish",
      title: "Ikkinchi so'rov handshake'larsiz",
      body: "U 2-sahifani ochganda brauzerda DNS javobi ham, ochiq va shifrlangan HTTP/2 ulanish ham bor. So'rov darhol yuboriladi.\n\nTo'rtta o'rniga bitta borib-kelish: 558 o'rniga 168 ms. Ulanishlarni ochiq saqlash eng arzon tezlashtirishlardan biri.",
      fields: {
        cached: "DNS javobi hali 300 soniyalik TTL ichida.",
        reused: "TCP ulanish va uning TLS kalitlari hali ochiq, ikkala handshake ham qayta bajarilmaydi.",
        TTFB: "Qolgani: bitta borib-kelish va serverlarning o'z ishi.",
      },
    },
    recap: {
      short: "Xulosa",
      title: "Xulosa",
      body: "So'rov yuborilishidan oldin DNS, TCP va TLS uchun to'laydi, ularning har biri bitta borib-kelish.\n\n1) Har bir borib-kelish narxini masofa belgilaydi. 2) Qayta ishlatilgan ulanish va keshdagi DNS ularning ko'pini tejaydi. 3) Data markaz ichida bitta sekin so'rov butun tarmoqdan og'irroq bo'lishi mumkin: `Server-Timing` bilan o'lchang va kerakli joyga indeks qo'ying.",
    },
  },
};

export default text;
