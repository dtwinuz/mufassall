import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Zaxira va failover",
  summary:
    "Har qanday qism ertami-kechmi ishdan chiqadi. Yagona nosozlik nuqtalarini topish, har biriga zaxira qo'yish, avtomatik almashtirish va bunda ma'lumotni yo'qotmaslik.",
  learn: [
    "Yagona nosozlik nuqtasini (single point of failure) qanday topish",
    "Active-active app serverlar va health check",
    "Active-passive baza: replika, failover, fencing",
    "Asinxron va sinxron replikatsiya narxi va nega zonalar muhim",
  ],
  nodes: {
    guest: "Mehmon",
    app1: "App 1 · A zona",
    app2: "App 2 · B zona",
    lb: "Load balancer",
    db1: "Baza 1 · A zona",
    db2: "Baza 2 · B zona",
  },
  metrics: {
    errors: "Xatolar",
    recovery: "Tiklanish vaqti",
    lost: "Yo'qolgan bron",
    "write-p95": "Yozish p95",
  },
  steps: {
    spof: {
      short: "Bitta server",
      title: "Bitta server — bitta nosozlik nuqtasi",
      body: "Mehmonxona bron sayti bitta app server va bitta bazada ishlaydi. Tungi soat 3 da app serverning diski to'ladi va jarayon o'ladi.\n\nKimdir uyg'onib, kirib, qayta ishga tushirmaguncha har bir so'rov yiqiladi: yarim soat to'liq to'xtash.",
      watch: "Yagona nosozlik nuqtasi — yo'qolsa butun tizim to'xtaydigan har qanday qism. Ular sizni topishidan oldin siz ularni toping.",
      fields: {
        "Connection refused": "Portni hech kim tinglamayapti. Mehmon xato sahifasini ko'radi, mehmonxona bronsiz qoladi.",
      },
    },
    "two-apps": {
      short: "Ikki app",
      title: "Load balancer ortida ikkita app server",
      body: "Ikkinchi app server o'sha kodni ishlatadi. Load balancer har so'rovni ulardan biriga yuboradi: ikkalasi doim trafik oladi, bu **active-active**.\n\nBu ishlaydi, chunki app serverlar o'zida holat saqlamaydi: sessiya va ma'lumot bazada.",
      watch: "Endi load balancer'ning o'zi yagona nuqta. Amalda u bitta suzuvchi IP'ni bo'lishadigan juftlik bo'lib ishlaydi.",
      fields: {
        "/healthz": "Load balancer har ikki soniyada har serverdan so'raydi: tirikmisan?",
        status: "«ok» — bu server so'rov qabul qila oladi.",
        db: "Yaxshi tekshiruv jarayon ishlayotganini emas, server ishlashi uchun kerak narsani tekshiradi.",
      },
    },
    "app-dies": {
      short: "Health check",
      title: "O'lik server soniyalarda chiqariladi",
      body: "App 2 qotib qoldi. Uning health check'i ketma-ket uch marta timeout bo'ladi va load balancer unga trafik yubormay qo'yadi.\n\nApp 2 da allaqachon turgan bir nechta so'rov yiqiladi; keyingi hammasi app 1 ga boradi. Hech kimni uyg'otish kerak bo'lmadi.",
      watch: "Endi butun trafik app 1 da. Ikki server faqat bittasi to'liq yukni ko'tara olsa himoya qiladi.",
      fields: {
        unhealthy_threshold: "Ketma-ket uchta xato: bitta sekin javob sog'lom serverni chiqarib yubormasin.",
        "removed from pool": "App 2 tekshiruvdan yana o'tmaguncha unga yangi so'rov bormaydi.",
      },
    },
    replica: {
      short: "Replika",
      title: "Bazaning zaxira nusxasi",
      body: "Bazani shunchaki ikkilantirib bo'lmaydi: ikkita server o'zicha yozuv qabul qilsa, ular kelisha olmaydi. Shuning uchun Baza 2 — **replika**: u primary'ning write-ahead log'ini oladi va qayta bajaradi.\n\nBu **active-passive**: hamma yozuvni Baza 1 oladi, Baza 2 soniyaning bir qismi orqada yurib, kutadi.",
      check: {
        q: "Baza 1 ning toki o'chdi. Ma'lumot Baza 2 da bor. Yangi bronlarga nima bo'ladi?",
        options: [
          "Baza 2 soniyalar ichida yozishni o'zi oladi",
          "App'lar Baza 2 ga shundayligicha yozishda davom etadi",
          "Kimdir Baza 2 ni qo'lda ko'tarmaguncha yiqiladi",
        ],
        answer: 2,
        why: "Baza 2 faqat o'qish uchun replika, shuning uchun har yozuv yiqiladi. Kimdir sezishi, qaror qilishi va uni ko'tarishi kerak: tunda taxminan yigirma daqiqa.",
      },
      fields: {
        START_REPLICATION: "Baza 2 primary'dan log'ni shu o'rindan boshlab oqim qilib berishni so'raydi.",
        WAL: "Write-ahead log: har o'zgarish tartib bilan. Uni qayta bajarish xuddi shu ma'lumotni tiklaydi.",
        replay_lag: "Baza 2 qancha orqada: 180 ms lik yozuv faqat Baza 1 da bor.",
      },
    },
    "primary-dies": {
      short: "Primary o'chdi",
      title: "Asosiy baza o'ladi",
      body: "Baza 1 serverining toki o'chadi. Ikkala app server bazaga tegadigan har so'rovni yiqitadi, ya'ni deyarli hammasini.\n\nMa'lumot Baza 2 da bor, lekin u faqat o'qish uchun replika. Kimdir sezishi, qaror qilishi va uni qo'lda ko'tarishi kerak: tunda yigirma daqiqa.",
      watch: "Ishga tushirish uchun odam kerak bo'lgan zaxira — bu backup, zaxiralash (redundancy) emas.",
      fields: {
        bookings: "Mehmonning broni, uni hozir hech qayerga saqlab bo'lmaydi.",
        "timed out": "Primary yo'q. App'lar kutadi, keyin yiqiladi.",
      },
    },
    failover: {
      short: "Failover",
      title: "Avtomatik failover",
      body: "Kichik klaster menejeri Baza 1 ni kuzatadi. 10 soniya javob bo'lmasa, u Baza 2 ni primary'ga **ko'taradi** (promote) va `db-primary.internal` nomini unga yo'naltiradi.\n\nApp serverlar o'sha nomga qayta ulanadi va Baza 2 ga tushadi. Yozish taxminan 30 soniyada tiklanadi.",
      watch: "Juda tez failover ham xavfli: tarmoqdagi qisqa uzilish almashtirishni qo'zg'atmasligi kerak.",
      check: {
        q: "Replikatsiya asinxron. Failover'dan keyin Baza 1 o'lishidan oldin tasdiqlagan bronlarga nima bo'ladi?",
        options: [
          "Bir qismi yo'qoladi: ular Baza 2 ga yetmagan",
          "Hammasi joyida: Baza 2 promote'dan keyin ularni qayta bajaradi",
          "Ular Baza 1 da kutib turadi va keyin qo'shiladi",
        ],
        answer: 0,
        why: "Baza 1 yozuvni Baza 2 ga yuborishdan oldin tasdiqlagan. 2,1 soniyalik tasdiqlangan bronlar faqat uning diskida edi: 240 mehmonga «bron qilindi» deyilgan, bron esa yo'q.",
      },
      fields: {
        "db-primary.internal": "App'lar hech qachon serverning o'z manzilini emas, faqat shu rol nomini ishlatadi.",
        "192.0.2.121": "Endi bu Baza 2 manzili. 5 soniyalik TTL tufayli app'lar tez sezadi.",
      },
    },
    "lost-writes": {
      short: "Yo'qolgan yozuv",
      title: "Oxirgi soniyalar replikaga yetmadi",
      body: "Replikatsiya **asinxron** edi: Baza 1 yozuvni Baza 2 ga yuborishdan oldin mehmonga tasdiqlab qo'ygan.\n\nBaza 1 o'lganda 2,1 soniyalik tasdiqlangan bronlar faqat uning diskida edi. Baza 2 ularsiz primary bo'ldi. 240 mehmonga «bron qilindi» deyilgan, bron esa yo'q.",
      watch: "Asinxron replikatsiya va failover birga: yiqilishdan oldingi oxirgi lahzalar yo'qolishi mumkin.",
      fields: {
        last_lsn: "Baza 1 commit qilib tasdiqlagan oxirgi yozuv.",
        replay_lsn: "Baza 2 olgan oxirgi yozuv. Sal eskiroq.",
        gap: "Farq: mehmonlarga tasdiqlangan, yangi primary'da esa yo'q.",
      },
    },
    "split-brain": {
      short: "Split brain",
      title: "Bir vaqtda ikki primary",
      body: "Baza 1 qayta yuklangach qaytadi. U hali ham o'zini primary deb o'ylaydi, app 1 da esa uni topadigan eski ulanish bor.\n\nEndi app 1 Baza 1 ga, app 2 Baza 2 ga yozadi. Ikki baza bir-biridan uzoqlashadi; bir tomonning bronlarini tashlab yuborishga to'g'ri keladi.",
      watch: "Split brain to'xtashdan yomonroq: ma'lumot jimgina yo'qoladi va bu kunlar o'tib bilinadi.",
      fields: {
        "INSERT 0 1": "Yozuv muvaffaqiyatli, lekin noto'g'ri bazaga.",
        primary: "Baza 1 o'zi yo'qligida almashtirilganini bilmaydi.",
      },
    },
    fencing: {
      short: "Fencing",
      title: "Eski primary'ni o'rab qo'yish",
      body: "Har promote **term** raqamini oshiradi. Term'i eskiroq baza yozuv qabul qilishga haqli emas. Baza 1 term 7 bilan qaytadi, term 8 ni ko'radi va o'rnidan tushadi.\n\nU yuborilmagan o'zgarishlarini orqaga qaytaradi (rewind), Baza 2 ning replikasi bo'ladi va uning ortidan yuradi. Bir vaqtda faqat bitta primary yoza oladi.",
      watch: "Fencing yangi primary yozuv olishidan oldin bo'lishi kerak: avval eskisini uzing, keyin promote qiling.",
      fields: {
        term: "Faqat o'sadigan hisoblagich. Katta term yutadi, eski primary rolini qaytarib ololmaydi.",
        demoted: "Baza 1 endi replika va yozuvni rad etadi.",
        rewind: "Baza 1 Baza 2 o'rnini egallagan nuqtadan keyingi yozuvlarini tashlaydi va Baza 2 dan nusxa oladi.",
      },
    },
    sync: {
      short: "Sinxron replika",
      title: "Replika olgandan keyingina tasdiqlash",
      body: "Bron yozuvlari endi **sinxron** replikatsiya ishlatadi: primary «commit bo'ldi» deb faqat replika o'zgarishni diskka yozganini tasdiqlagandan keyin javob beradi.\n\nYiqilish endi tasdiqlangan bronni yo'qota olmaydi. Narxi — har yozuvga bitta qo'shimcha borib-kelish: ikki zona orasida taxminan 3 ms.",
      watch: "Yagona sinxron replika o'lsa, yozish to'xtaydi. Prod'da ikkita replika qo'yib, istalgan bittasini kutishadi.",
      check: {
        q: "B zonada tok o'chdi: app 2 va Baza 2 birga yo'qoldi. Mehmonlar nimani ko'radi?",
        options: [
          "B zona qaytguncha to'liq to'xtash",
          "30 soniyacha sekinroq javob, birorta ham bron yo'qolmaydi",
          "Sayt ishlaydi, lekin oxirgi soniyalardagi bronlar yo'qoladi",
        ],
        answer: 1,
        why: "Load balancer app 2 ni chiqaradi, klaster menejeri Baza 1 ni promote qiladi. Sinxron replikatsiya tufayli Baza 1 da har bir tasdiqlangan yozuv allaqachon bor edi, hech narsa yo'qolmaydi.",
      },
      fields: {
        synchronous_commit: "Klientga «tayyor» deyishdan oldin replika tasdig'ini kut.",
        COMMIT: "Mehmon «bron qilindi» ni faqat shu qaytgandan keyin oladi.",
        confirm: "Qo'shimcha kutish: ma'lumot yo'qotmaslik narxi.",
      },
    },
    "zone-down": {
      short: "Zona o'chdi",
      title: "Butun zona o'chadi",
      body: "B zonada tok o'chadi: app 2 va Baza 2 birga yo'qoladi. Load balancer app 2 ni chiqaradi, klaster menejeri Baza 1 ni promote qiladi, hammasini app 1 ko'taradi.\n\nO'ttiz soniya sekinroq javob va birorta ham yo'qolgan bron yo'q: A zonadagi sinxron replikada har bir tasdiqlangan yozuv bor edi.",
      watch: "Bitta rack yoki bitta zonadagi ikki nusxa birga o'ladi. Har nusxani boshqa nosozlik o'chiradigan joyga qo'ying.",
    },
    recap: {
      short: "Xulosa",
      title: "Xulosa",
      body: "Yo'qolsa hammasini to'xtatadigan qismlarni toping va har biriga odamsiz o'rnini egallaydigan zaxira bering.\n\n1) Stateless serverlar health check ortida active-active ishlaydi. 2) Baza replika va avtomatik failover bilan active-passive. 3) Eski primary'ni fencing qiling, yozadigani bitta bo'lsin. 4) Asinxron replikatsiya oxirgi soniyalarni yo'qotishi mumkin; sinxron kechikish qo'shadi. 5) Nusxalarni zonalarga tarqating.",
    },
  },
};

export default text;
