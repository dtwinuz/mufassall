import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Yukni taqsimlash",
  summary:
    "Bitta balancer, uchta app server. Balancer har bir so'rovni qayerga yuborishni qanday tanlaydi, noto'g'ri tanlov nega bitta serverni yondirib, qolganlarini bo'sh qoldiradi, o'lik serverni qanday payqaydi va sticky sessiyalar aslida qanchaga tushadi.",
  learn: [
    "L4 va L7: ulanishlarni taqsimlash va so'rovlarni taqsimlash",
    "Round robin, least connections va og'irliklar, har biri qachon pand beradi",
    "Health check: o'lik server pool'dan qanday chiqadi",
    "Sticky sessiyalar yukni nega buzadi va stateless muqobil",
  ],
  nodes: {
    clients: "Klientlar",
    lb: "Load balancer",
    a: "Server A",
    b: "Server B",
    c: "Server C",
    db: "Baza",
    sessions: "Sessiyalar ombori",
  },
  metrics: {
    rps: "So'rovlar",
    p99: "Kechikish p99",
    errors: "Xatolar",
    hot: "Eng band server",
  },
  steps: {
    l4: {
      short: "L4",
      title: "L4 balancer ulanishlarni taqsimlaydi",
      body: "Balancer transport qatlamida (L4) ishlaydi. U IP manzil va portlarni ko'radi, TCP ulanish ochilganda serverni tanlaydi, keyin baytlarni ikki tomonga shunchaki ko'chiradi.\n\nBu tez va oddiy, u hech narsani deshifrlamaydi. Lekin HTTP so'rov nima ekanini bilmaydi.",
      check: {
        q: "Hamkor bitta keep-alive ulanish orqali soniyasiga 400 so'rov yuboradi. L4 balancer nima qiladi?",
        options: [
          "So'rovlarni A, B va C ga teng taqsimlaydi",
          "Hammasini o'zi tanlagan bitta serverda qoldiradi",
          "Ulanish juda band bo'lganda uni yopadi",
        ],
        answer: 1,
        why: "L4 har ulanishga bir marta qaror qiladi. Hamkor ulanishi A da qoladi: A 96% ga chiqadi, B va C 22% da turadi, p99 900 ms ga o'sadi.",
      },
      fields: {
        TCP: "Balancer ko'radigan hamma narsa: kim qaysi portga ulanyapti.",
        TLS: "Trafik boshidan oxirigacha shifrlangan. Balancer yo'l (path) ham, header ham ko'rmaydi.",
        "per connection": "Har bir ulanishga bitta qaror. Shu ulanishdagi barcha so'rovlar bitta serverga boradi.",
      },
    },
    "one-pipe": {
      short: "Bitta quvur",
      title: "Bitta band ulanish, bitta yonayotgan server",
      body: "Hamkor integratsiyasi bitta keep-alive ulanish ochadi va u orqali soniyasiga 400 so'rov yuboradi. L4 balancer bu ulanishni bir marta A serverga qo'ygan.\n\nA 96% da va sekin, B va C deyarli bo'sh. Balancer esa hammasi teng deb hisoblaydi: har bir serverda ulanishlar soni deyarli bir xil.",
      watch: "L4 ishni emas, ulanishlarni taqsimlaydi. Uzoq yashaydigan ulanishlar (HTTP/2, gRPC, WebSocket) buni ancha yomonlashtiradi.",
      fields: {
        "conn 7": "Trafikning ko'p qismini tashiyotgan bitta ulanish. U yashagan sari A da qoladi.",
        "keep-alive": "Klient yangi ulanish ochmasdan eskisini qayta ishlatadi, shuning uchun balancer boshqa tanlay olmaydi.",
      },
    },
    l7: {
      short: "L7",
      title: "L7 balancer so'rovlarni taqsimlaydi",
      body: "Balancer endi TLS'ni o'zida yechadi va HTTP tilida gaplashadi (L7). U har bir so'rovni o'qiydi va hammasi bitta ulanishda kelsa ham, har so'rov uchun alohida server tanlaydi.\n\nHamkorning soniyasiga 400 so'rovi uchala serverga tarqaladi. Har biri 52% da, p99 150 ms ga qaytdi.",
      watch: "L7 balancer'da ko'proq CPU talab qiladi (deshifrlash, parsing), TLS sertifikati va kaliti ham endi unda saqlanadi.",
      fields: {
        "X-Forwarded-For": "Klientning manzili. L7 balancer ortida app faqat balancer IP'sini ko'radi.",
        "X-Forwarded-Proto": "Klient HTTPS ishlatgan. App'gacha bo'lgan ichki qism oddiy HTTP bo'lishi mumkin.",
        "X-Request-Id": "Balancer qo'shadi: bitta so'rovni uning log'i va app log'i bo'ylab kuzatish uchun.",
      },
    },
    "round-robin": {
      short: "Round robin",
      title: "Round robin: navbat bilan",
      body: "Eng oddiy algoritm: A, B, C, A, B, C… Har bir server bir xil sonda so'rov oladi. Trafik soniyasiga 1 300 ga o'sadi, bu hali ham ishlaydi.\n\nRound robin har bir so'rov taxminan bir xil turadi va har bir server taxminan bir xil kattalikda deb hisoblaydi.",
      fields: {
        upstream: "So'rovni qaysi server oldi. Qat'iy aylanma: a, b, c, a.",
      },
    },
    heavy: {
      short: "Og'ir",
      title: "Soni bir xil, ishi juda har xil",
      body: "Yangi hisobot eksporti har so'rovga 4 soniya oladi, oddiy so'rov esa 13 ms. Omad kelmay, bir nechta eksport ketma-ket C ga tushadi, round robin esa C ga qolgan hamma narsadan ham teng ulushini yuboraveradi.\n\nC 98% da va uzun navbat bilan, A va B da esa joy bor. p99 2,6 s ga sakraydi.",
      check: {
        q: "Eksport 4 s, oddiy so'rov 13 ms oladi. Qaysi qoida band serverdan bosimni oladi?",
        options: [
          "Har so'rovni eng kam faol so'rovli serverga yuborish",
          "Round robin qoldirib, to'rtinchi server qo'shish",
          "Har foydalanuvchini cookie bilan bitta serverga bog'lash",
        ],
        answer: 0,
        why: "Least connections ishlanayotgan so'rovlarni kuzatadi, shuning uchun eksportlar bilan band C kamroq yangi so'rov oladi. Eng band server 98% dan 72% ga, p99 2.6 s dan 380 ms ga tushadi.",
      },
      fields: {
        export: "Bunday bitta so'rov taxminan 300 ta oddiy so'rovcha ish.",
        "Server-Timing": "4,1 s ish. Round robin uni boshqalar kabi bitta so'rov deb sanaydi.",
      },
    },
    "least-conn": {
      short: "Least conn",
      title: "Least connections: kim bo'shligini so'rash",
      body: "Balancer endi har bir server ayni damda nechta so'rov ustida ishlayotganini kuzatadi va keyingisini eng kam ishi bor serverga yuboradi.\n\nEksportlar bilan band C o'zini tiklamaguncha kamroq yangi so'rov oladi. Eng band server 72% ga, p99 380 ms ga tushadi.",
      fields: {
        active: "Har bir serverdagi ishlanayotgan so'rovlar. Sekin so'rovlar bu sonni yuqori ushlab turadi.",
        "fewest active": "Bu safar B yutdi. Sekin server o'z-o'zidan kamroq trafik oladi.",
      },
    },
    weighted: {
      short: "Og'irliklar",
      title: "Teng bo'lmagan serverlar uchun og'irlik",
      body: "C ikki baravar katta mashinaga almashtiriladi. Teng ulushda u yarim bo'sh turardi, shuning uchun unga 2, qolganlariga 1 og'irlik beriladi.\n\nC endi ikki baravar ko'p so'rov oladi va uchalasi taxminan 50% da ishlaydi. Og'irliklar yangi versiyani sinash uchun trafikning 5% ini unga yuborishga ham imkon beradi.",
      watch: "Og'irliklar qo'lda qo'yiladi. Mashinalar o'zgarib, og'irliklar o'zgarmasa, muvozanat jimgina buziladi.",
    },
    dead: {
      short: "O'lik server",
      title: "B o'ldi, balancer yuborishda davom etadi",
      body: "B serverning xotirasi tugaydi va u yiqiladi. Balancer buni bilmaydi: B ga uning chorak trafigini yuborishda davom etadi.\n\nB ga yo'naltirilgan har bir so'rov xato bilan tugaydi. A va C sog'lom bo'lsa ham, barcha so'rovlarning 25% i xato qaytaradi.",
      fields: {
        "Connection refused": "B da endi hech kim tinglamayapti.",
        "502": "Balancer o'zi tanlagan serverdan javob ololmadi, klient «bad gateway» oladi.",
      },
    },
    health: {
      short: "Health check",
      title: "Health check o'lik serverni chiqaradi",
      body: "Har 2 soniyada balancer har bir serverning `/healthz` manzilini chaqiradi. Ketma-ket 3 ta muvaffaqiyatsizlikdan keyin B pool'dan chiqariladi, uning trafigi A va C ga o'tadi.\n\nXatolar 25% dan deyarli nolga tushadi: faqat aniqlashdan oldingi bir necha soniyadagi so'rovlar yiqiladi. B yana javob bera boshlasa, qaytib qo'shiladi.",
      watch: "`/healthz` arzon va halol bo'lsin. U bazani tekshirsa, bazadagi qisqa uzilish barcha serverlarni birdaniga o'lik deb belgilashi mumkin.",
      check: {
        q: "B qaytdi, lekin savat server xotirasida, shuning uchun foydalanuvchilar cookie bilan bog'langan. Yuk qanday?",
        options: [
          "Teng: balancer baribir eng bo'sh serverni tanlaydi",
          "Teng, lekin har so'rov cookie tekshiruviga vaqt yo'qotadi",
          "Notekis: B 15% da bo'sh turadi, A 85% da ishlaydi",
        ],
        answer: 2,
        why: "Sticky algoritmni bosib ketadi: A ga bog'langanlar o'sha yerda qoladi, qaytgan B ga deyarli hech kim bog'lanmagan. A 85% da, B 15% da, p99 700 ms ga o'sadi.",
      },
      fields: {
        healthz: "Kichik endpoint: «men ishlayapman va so'rovga javob bera olaman».",
        "3 of 3": "Ketma-ket bir necha muvaffaqiyatsizlik: bitta sekin javob serverni chiqarib yubormasin.",
        removed: "B ga yangi so'rovlar bormaydi. Balancer uni fonda tekshirishda davom etadi.",
      },
    },
    sticky: {
      short: "Sticky",
      title: "Sticky sessiyalar foydalanuvchini serverga bog'laydi",
      body: "Savat har bir serverning xotirasida yashaydi, shuning uchun jamoa sticky sessiyalarni yoqadi: balancer cookie qo'yadi va har bir foydalanuvchini doim bitta serverga yuboradi.\n\nB qaytdi, lekin unga deyarli hech kim bog'lanmagan: u 15% da turibdi. Eng faol foydalanuvchilar A da, u 85% da ishlaydi. A o'lsa esa, undagi barcha savatlar yo'qoladi.",
      watch: "Sticky algoritmdan ustun turadi. Balancer endi yukni joy bor serverga ko'chira olmaydi.",
      fields: {
        "Set-Cookie": "`lb_route=a`: bundan buyon bu foydalanuvchi, A band bo'lsa ham, doim A ga boradi.",
      },
    },
    "shared-state": {
      short: "Umumiy holat",
      title: "Umumiy sessiyalar ombori, sticky'siz",
      body: "Savat va sessiyalar barcha serverlar o'qiydigan umumiy omborga ko'chadi. Sticky o'chiriladi, balancer yana erkin tanlay oladi.\n\nUchala server yana taxminan 55% da, ulardan istalgan birining yo'qolishi endi hech kimning savatini yo'qotmaydi.",
      fields: {
        HGETALL: "Butun sessiyani bitta chaqiruvda o'qiydi, data markaz ichida yarim millisekundga yaqin.",
        user_id: "Foydalanuvchi kim. Buni istalgan server o'qiy oladi, demak istalgan server javob bera oladi.",
        ttl: "Sessiya 30 daqiqa harakatsizlikdan keyin o'zi tugaydi.",
      },
    },
    recap: {
      short: "Xulosa",
      title: "Xulosa",
      body: "Balancer tanlovi qanchalik to'g'ri bo'lsa, shunchalik foydali.\n\n1) L4 ulanishlarni, L7 so'rovlarni taqsimlaydi: uzoq yashaydigan ulanishlarga L7 kerak. 2) Teng ish uchun round robin, notekis ish uchun least connections, teng bo'lmagan serverlar uchun og'irliklar. 3) Health check o'lik serverlarni soniyalar ichida chiqaradi. 4) Sticky sessiyalar qulaylik uchun muvozanat va chidamlilikni qurbon qiladi, umumiy holat — yaxshiroq yechim.",
    },
  },
};

export default text;
