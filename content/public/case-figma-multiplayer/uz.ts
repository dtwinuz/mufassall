import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Tajriba: Figma'da birgalikda tahrirlash",
  summary:
    "Bir necha kishi bitta dizayn faylini bir vaqtda tahrirlaydi. Figma operational transform'larsiz hammani qanday sinxron saqlaydi: yagona hakam bo'lgan server, har xususiyat uchun last-writer-wins, yashirilgan aks-sado, mijoz yaratgan id'lar, sikl tekshiruvi va kasr indekslar. Manba: https://www.figma.com/blog/how-figmas-multiplayer-technology-works/",
  learn: [
    "Nega markaziy hakam OT va CRDT'ning qiyin qismlarini tashlab ketishga imkon beradi",
    "Hujjat — obyektlardan xususiyatlarga xarita, konfliktlar xususiyat darajasida",
    "Nega mijoz o'zining tasdiqlanmagan o'zgarishiga zid server o'zgarishlarini yashiradi",
    "Obyektni oflayn yaratish, daraxtdagi sikllarni rad etish va kasr indekslar bilan tartiblash",
    "Aloqa qaytganda oflayn qilingan tahrirlar bilan nima bo'ladi",
  ],
  nodes: {
    alice: "Alisa brauzeri",
    bob: "Bob brauzeri",
    srv: "Hujjat jarayoni",
  },
  metrics: {
    unacked: "Tasdiqlanmagan",
    flicker: "Miltillash",
    lost: "Yo'qolgan tahrir",
  },
  steps: {
    open: {
      short: "Ochish",
      title: "Har hujjatga bitta jarayon, o'zgarishlar WebSocket orqali",
      body: "Mijozlar — serverlar klasteri bilan WebSocket orqali gaplashadigan veb-sahifalar. Serverlar har birgalikdagi hujjat uchun alohida jarayon ishga tushiradi va shu faylni tahrirlayotgan hamma unga ulanadi.\n\nOchilganda mijoz faylning to'liq nusxasini yuklab oladi, keyin ikki tomonga faqat o'zgarishlar yuradi. Izohlar, foydalanuvchilar, jamoalar va loyihalar Postgres'da saqlanadi va boshqa tizim orqali sinxronlanadi. Darsdagi qadamlar mexanizmning soddalashtirilgan namunasi, Figma protokoli emas.",
      fields: {
        "full copy": "Boshlang'ich holat. O'zgarishlar uning ustiga qo'llanadi.",
        WebSocket: "Shu hujjat egasi bo'lgan jarayonga uzoq ulanish.",
        "only changes": "Har safar butun fayl o'rniga kichik xabarlar.",
      },
    },
    model: {
      short: "Model",
      title: "Hujjat — obyektlardan xususiyatlarga xarita",
      body: "Figma hujjati HTML DOM kabi obyektlar daraxti: ildiz, sahifalar, keyin har sahifadagi narsalar. G'oyaviy jihatdan bu `Map<ObjectID, Map<Property, Value>>`.\n\nJamoa Google Docs ortidagi operational transform yondashuvidan voz kechdi: Figma matn muharriri emas, OT u uchun ortiqcha murakkab edi. Dizayn CRDT'dan ilhomlangan, lekin server markaziy hakam bo'lgani uchun CRDT'ning ko'p ortiqcha yukini tashlab ketish mumkin.",
      watch: "Hammasini tartiblaydigan bitta hakam — katta soddalashtirish. Mahsulotingiz o'rtada server bilan yashay olsa, shuni tanlang.",
      fields: {
        id: "Qaysi obyekt. Tashqi xaritaning kaliti.",
        fill: "Bitta xususiyat. Server istalgan mijoz yuborgan oxirgi qiymatni saqlaydi.",
        ack: "Server o'zgarish unda ekanini tasdiqlaydi; shungacha u tasdiqlanmagan.",
      },
    },
    "no-conflict": {
      short: "Konfliktsiz",
      title: "Har xil xususiyatlar to'qnashmaydi",
      body: "Alisa to'rtburchak rangini o'zgartiradi, Bob esa uni suradi. Ular bitta obyektning har xil xususiyatlariga tegadi, shuning uchun ikkala o'zgarish ham shunchaki qoladi.\n\nHar xil xususiyatlar yoki har xil obyektlardagi bir xil xususiyat o'zgarishlari umuman to'qnashmaydi. Haqiqiy tahrirlarning ko'pi shu holatga tushadi.",
      fields: {
        id: "Alisa bo'yayotgan o'sha to'rtburchak.",
        x: "fill emas, boshqa xususiyat, hal qiladigan narsa yo'q.",
      },
    },
    "same-property": {
      short: "Bir xususiyat",
      title: "Bir xil xususiyat: server oxirgi olgani yutadi",
      body: "Endi ikkalasi bir vaqtda bitta matn xususiyatini tahrirlaydi. Qoida — last-writer-wins: server oxirgi qabul qilgan qiymatni qoldiradi. Tartibni server belgilaydi, shuning uchun vaqt belgilari kerak emas.\n\nQiymatlar atomar. Matn \"B\" bo'lsa, Alisa uni \"AB\", Bob \"BC\" qilsa, natija AB yoki BC bo'ladi, hech qachon ABC emas.",
      check: {
        q: "Matn \"B\". Alisa \"AB\", Bob o'sha lahzada \"BC\" yozadi. Fayl nima bilan tugashi mumkin?",
        options: [
          "\"ABC\": server ikkala tahrirni qo'shib yuboradi",
          "\"AB\" yoki \"BC\": serverga qaysi biri oxirgi yetgan bo'lsa",
          "Xato: server ikkalasidan qayta urinishni so'raydi",
        ],
        answer: 1,
        why: "Xususiyat qiymati butunlay almashtiriladi. Server oxirgi olganini qoldiradi va hammaga yuboradi. Belgilar bo'yicha birlashtirish matn muharriri mexanikasini talab qilardi, Figma esa undan ataylab qochgan.",
      },
      fields: {
        text: "Ikkalasi yozgan bitta xususiyat. Ikki qiymatdan biri butunlay yutadi.",
        never: "Belgilar bo'yicha birlashtirish yo'q: qiymatlar atomar.",
      },
    },
    flicker: {
      short: "Miltillash",
      title: "Eskirgan aks-sado ekranni miltillatadi",
      body: "Mijoz o'z o'zgarishini serverni kutmasdan darhol qo'llaydi. Alisa to'rtburchakni qizil qiladi. Server uning o'zgarishini tasdiqlashidan oldin Bobning avvalroq qilgan o'zgarishini yuboradi: ko'k.\n\nAgar Alisaning mijozi uni qo'llasa, ekrani qizil, keyin ko'k, o'z o'zgarishi tasdiqlanganda yana qizil bo'lardi.",
      fields: {
        unacknowledged: "Yuborilgan, lokal qo'llangan, server hali tasdiqlamagan.",
        older: "Bobning o'zgarishi serverga avvalroq yetgan, shuning uchun Alisa uchun u allaqachon eskirgan.",
        screen: "Foydalanuvchi ko'radigan miltillash.",
      },
    },
    "drop-echo": {
      short: "Aks-sadoni yashirish",
      title: "O'zingning kutilayotgan o'zgarishingga zid kelganini tashla",
      body: "Yechim: mijozda biror xususiyat bo'yicha tasdiqlanmagan o'zgarish bor ekan, u o'sha xususiyatga kelgan server o'zgarishlarini tashlab yuboradi. Boshqa xususiyatlar o'zgarishi odatdagidek qo'llanadi.\n\nAlisaning ekranida qizil qoladi, server uni tasdiqlagach esa hamma qizilda kelishadi.",
      fields: {
        drop: "Kutilayotgan lokal o'zgarish bilan bir xil obyekt va xususiyat: e'tiborsiz qoldiriladi.",
        apply: "Boshqa xususiyat: zidlik yo'q, ko'rsatiladi.",
      },
    },
    ids: {
      short: "Obyekt id'lari",
      title: "Obyekt id'larini mijozlar o'zi yaratadi",
      body: "Obyekt yaratish va o'chirish — aniq harakatlar; noma'lum id'ga yozish hech narsa yaratmaydi. Har mijozning noyob mijoz id'si bor va u shu mijoz yaratgan har obyekt id'siga kiradi, shuning uchun ikki mijoz hech qachon bir xil id tanlamaydi.\n\nO'chirilgan obyekt serverdan olib tashlanadi; uning ma'lumoti o'chirgan mijozning undo buferida yashaydi.",
      check: {
        q: "Nega obyekt id'sini server emas, mijoz yaratadi?",
        options: [
          "Server id tarqatishga juda sekin",
          "Xavfsizlik uchun id tasodifiy bo'lishi kerak",
          "Obyekt yaratish oflayn ham ishlashi kerak",
        ],
        answer: 2,
        why: "Id'ni faqat server bersa, aloqasiz hech narsa yaratib bo'lmasdi. Har obyekt id'si ichidagi noyob mijoz id'si har mijozga obyektlarni mustaqil va to'qnashuvsiz yaratish imkonini beradi.",
      },
      fields: {
        id: "Ichida mijoz id'si bor, shuning uchun serverdan so'ramay ham noyob.",
        type: "Nima yaratilyapti. Yaratish — alohida aniq harakat.",
        parent: "Yangi obyekt daraxtning qayeriga tushadi.",
      },
    },
    cycle: {
      short: "Sikl",
      title: "Sikl hosil qiladigan ikki ko'chirish",
      body: "Har obyekt ota-obyektiga havolani xususiyat sifatida saqlaydi, shuning uchun ko'chirilganda obyekt o'z kimligini saqlaydi. Alisa A freymni B ichiga, Bob esa B'ni A ichiga ko'chiradi. Ikkalasi qo'llansa, har biri ikkinchisining ichida bo'lib qoladi.\n\nServer sikl hosil qiladigan ota-obyekt o'zgarishini rad etadi. Bir lahza mijoz siklni ko'rishi mumkin; shunda u server qaror qilguncha bu obyektlarni daraxtdan olib turadi. Ular qisqa vaqt yo'qolib qoladi — bu kam uchragani uchun qabul qilingan murosa.",
      fields: {
        parent: "Ota-obyekt havolasi oddiy xususiyat, boshqalari kabi o'zgaradi.",
        rejected: "Server daraxtni tekshiradi va halqani yopadigan ko'chirishni rad etadi.",
      },
    },
    order: {
      short: "Tartib",
      title: "Bolalarni kasr indekslar bilan tartiblash",
      body: "Ota-obyekt ichidagi qatlamlar tartibi — 0 va 1 orasidagi kasr. Obyektni ikki obyekt orasiga qo'yish uchun ularning pozitsiyalari o'rtachasi olinadi. Boshqalarning pozitsiyasi o'zgarmaydi, shuning uchun bir vaqtda qo'shayotgan ikki kishi umumiy ro'yxat uchun talashmaydi.\n\nOta-obyekt havolasi va pozitsiya bitta xususiyat sifatida saqlanadi, shuning uchun doim birga o'zgaradi.",
      check: {
        q: "Qo'shnilar 0,5 va 0,75 da turibdi. Yangi qatlam qayerga tushadi?",
        options: ["0,625", "0,76", "Ikkala qo'shni joy bo'shatish uchun suriladi"],
        answer: 0,
        why: "0,5 va 0,75 ning o'rtachasi 0,625, aynan ular orasida. Boshqa hech bir obyekt qayta raqamlanmaydi, o'zgarish faqat qo'yilayotgan obyektga tegadi.",
      },
      fields: {
        parent_and_position: "Ikkalasini saqlaydigan bitta xususiyat, shuning uchun ko'chirish atomar. Bu yerdagi nom shartli.",
        position: "Ikki qo'shni orasidagi kasr.",
      },
    },
    offline: {
      short: "Oflayn",
      title: "Tarmoqsiz tahrirlash",
      body: "Bobning noutbuki tarmoqni yo'qotadi. Figma mijozga istalgancha uzoq oflayn tahrirlashga ruxsat beradi: uning o'zgarishlari lokal qo'llanadi va kutib turadi.\n\nShu orada Alisa o'sha faylni tahrirlashda davom etadi, Bob oxirgi ko'rgan holat esa eskiradi.",
      fields: {
        locally: "Tahrirlar Bob qayta ulanguncha uning tomonida saqlanadi.",
        Alice: "Hujjat usiz ham oldinga ketadi.",
      },
    },
    reconnect: {
      short: "Qayta ulanish",
      title: "Qayta ulanish: yangi nusxa, keyin takrorlash",
      body: "Bob qayta ulanganda uning mijozi hujjatning yangi nusxasini yuklab oladi, oflayn tahrirlarini shu eng so'nggi holat ustiga qayta qo'llaydi va yangi WebSocket ochadi.\n\nUning tahrirlari boshqa har qanday o'zgarish kabi o'sha qoidalardan o'tadi: xususiyat bo'yicha last-writer-wins va serverdagi sikl tekshiruvi.",
      watch: "Lokal niyatni eng yangi holat ustida takrorlash ikki tarixni birlashtirishdan soddaroq.",
      fields: {
        "fresh copy": "Joriy holat, Alisa qilgan hamma narsa bilan.",
        reapply: "Bobning oflayn o'zgarishlari, uning ustiga qo'llangan.",
        "new WebSocket": "Yana odatdagidek: bundan buyon faqat o'zgarishlar.",
      },
    },
    recap: {
      short: "Xulosa",
      title: "Xulosa",
      body: "Figma dizaynidan nimani olish kerak.\n\n1) Server yagona hakam bo'la olsa, OT va CRDT murakkabligining ko'p qismini tashlab ketish mumkin. 2) Hujjatni xususiyatli obyektlar sifatida modellashtiring; konflikt faqat bir xil xususiyatda bo'ladi va atomar qiymatlar bilan last-writer-wins orqali hal qilinadi. 3) Lokal o'zgarishlarni darhol qo'llang va tasdiqlanmagan o'zgarishingizga zid server o'zgarishlarini e'tiborsiz qoldiring. 4) Id'larni mijozlar yaratsin (ichida mijoz id'si), server daraxtdagi ko'chirishlarni siklga tekshirsin, bolalar tartibini kasr indekslar bersin. 5) Oflayn ishdan keyin yangi nusxani yuklang va lokal tahrirlarni takrorlang. Undo haqida esa: ko'p marta bekor qilib, biror narsani nusxalab, redo bilan hozirgi holatga qaytsangiz, hujjat o'zgarmasligi kerak.\n\nManba: https://www.figma.com/blog/how-figmas-multiplayer-technology-works/",
    },
  },
};

export default text;
