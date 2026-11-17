import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Real-time yangilanishlar",
  summary:
    "Chat yangi xabarni yuborilgan zahoti ko'rsatishi kerak. Polling, long polling, Server-Sent Events va WebSocket, hamda ko'p ochiq ulanishni ushlab turish uchun nima kerak.",
  learn: [
    "Polling, long polling, SSE va WebSocket serverga qanchaga tushadi",
    "Nega uzoq yashaydigan ulanishlarga alohida gateway qatlami kerak",
    "Pub/sub boshqa gateway'dagi foydalanuvchiga xabarni qanday yetkazadi",
    "Klient xabar yo'qotmasdan qanday qayta ulanadi",
  ],
  nodes: {
    alice: "Alisa",
    bob: "Bobur",
    api: "Chat server",
    db: "Baza",
    lb: "Load balancer",
    gw1: "Gateway 1",
    gw2: "Gateway 2",
    chat: "Chat servisi",
    bus: "Pub/sub",
  },
  metrics: {
    requests: "So'rovlar",
    delay: "Yetkazish kechikishi",
    missed: "Yetib bormagan",
  },
  steps: {
    polling: {
      short: "Polling",
      title: "Har ikki soniyada so'rash",
      body: "Har bir ochiq chat serverdan ikki soniyada bir marta «`m_730` dan keyin yangi narsa bormi?» deb so'raydi. 100 000 ochiq chat bilan bu soniyasiga 50 000 so'rov.\n\nDeyarli har bir javob bo'sh. Xabar esa baribir o'rtacha bir soniya, ya'ni intervalning yarmi kutadi.",
      watch: "Polling yukni kechikishga almashtiradi: tez so'rasangiz yuk oshadi, sekin so'rasangiz xabar kech keladi.",
      fields: {
        since: "Klientda bor oxirgi xabar. Server faqat undan yangilarini qaytaradi.",
        messages: "Bo'sh. Server bazani o'qidi va «hech narsa yo'q» deyish uchun bir so'rov sarfladi.",
      },
    },
    "long-poll": {
      short: "Long poll",
      title: "Long polling: server so'rovni ushlab turadi",
      body: "Klient o'sha so'rovni yuboradi, lekin server darhol javob bermaydi. Xabar kelguncha yoki 25 soniya o'tguncha so'rovni ochiq ushlab turadi, keyin klient yana so'raydi.\n\nSo'rovlar o'n barobardan ko'p kamayadi, xabar esa paydo bo'lgan zahoti jo'natiladi.",
      watch: "Kutayotgan har bir so'rov baribir serverda ulanish va joy egallaydi. Timeout'i qisqa proksilar uni uzib qo'yadi.",
      fields: {
        wait: "«Hali hech narsa bo'lmasa, so'rovni 25 soniyagacha ushlab tur.»",
        "X-Response-Time": "Yetti soniya: so'rov Boburning hamkasbi nimadir yozguncha kutdi.",
        cursor: "Keyingi so'rov qayerdan davom etishi: hech narsa tashlab ketilmaydi va takrorlanmaydi.",
      },
    },
    sse: {
      short: "SSE",
      title: "Server-Sent Events: pastga bitta oqim",
      body: "Klient bitta HTTP so'rov ochadi, server esa javobni hech qachon tugatmaydi. Har yangi xabar shu oqimga hodisa (event) bo'lib yoziladi.\n\nBu oddiy HTTP, ko'p proksilardan o'tadi, brauzer o'zi qayta ulanadi. Lekin u bir tomonlama: xabar yuborish uchun klient baribir oddiy POST qiladi.",
      fields: {
        Accept: "Klient bitta javob emas, hodisalar oqimini so'raydi.",
        id: "Har hodisaning ID'si bor. Qayta ulanganda brauzer oxirgisini `Last-Event-ID` da yuboradi.",
        data: "Xabarning o'zi. Shu ulanishda undan keyin yana minglab hodisa kelishi mumkin.",
      },
    },
    websocket: {
      short: "WebSocket",
      title: "WebSocket: bitta ulanish, ikki tomonga",
      body: "Klient HTTP so'rov bilan boshlaydi va uni **upgrade** qilishni so'raydi. `101` javobidan keyin o'sha TCP ulanish ikki tomonga kichik frame'larni tashiydi.\n\nXabarlar, «yozmoqda» belgisi, «o'qildi» belgisi hammasi shu orqali. HTTP so'rovlar deyarli yo'qoladi, yetkazish o'nlab millisekund oladi.",
      watch: "WebSocket holatli (stateful): server endi o'ziga kim ulanganini eslab turadi. Bu kengaytirish usulini o'zgartiradi.",
      fields: {
        Upgrade: "Bu ulanishni HTTP'dan WebSocket protokoliga o'tkazishni so'raydi.",
        "101": "Switching Protocols: bundan keyin bu endi HTTP emas.",
        "Sec-WebSocket-Accept": "Klient kalitidan hisoblanadi. Server haqiqatan WebSocket bilishini isbotlaydi. Sir emas.",
      },
    },
    "too-many": {
      short: "Juda ko'p",
      title: "Bitta server, 65 000 socket",
      body: "Har foydalanuvchi socket'ni kun bo'yi ochiq ushlaydi. Yagona chat serverda file descriptor'lar tugaydi, xotira o'sadi, garbage collection pauzalari hamma ulanishni birdaniga to'xtatadi.\n\nYangi foydalanuvchi ulana olmaydi, ulanganlarga xabar kech keladi yoki umuman kelmaydi.",
      watch: "Endi chegara so'rovlar emas, ulanishlar soni. Jim turgan socket ham xotira yeydi.",
      fields: {
        EMFILE: "Jarayon ochiq fayllar chegarasiga yetdi: har socket bitta file descriptor.",
        open_sockets: "Aynan chegarada. Keyingi foydalanuvchi rad etiladi.",
        "gc pause": "640 ms davomida bu serverdagi birorta socket ham xizmat ko'rmaydi.",
      },
    },
    gateways: {
      short: "Gateway'lar",
      title: "Ulanishlarni gateway qatlami ushlaydi",
      body: "Ulanishlar **gateway**'lar qatlamiga ko'chadi. Gateway faqat socket'larni ushlaydi va frame'larni uzatadi; chat mantig'i va baza uning ortidagi oddiy stateless servisda.\n\nLoad balancer yangi ulanishlarni gateway'larga tarqatadi: foydalanuvchi ko'paysa, gateway qo'shiladi.",
      watch: "So'rovlar soni emas, ulanishlar soni bo'yicha taqsimlang: bitta socket soatlab yashaydi.",
      fields: {
        room: "Klient kuzatmoqchi bo'lgan chat xonasi.",
        "X-Gateway": "Bobur 2-gateway'ga tushdi. Alisa 1-gateway'da.",
      },
    },
    "wrong-node": {
      short: "Boshqa gateway",
      title: "Xabar noto'g'ri gateway'da qolib ketadi",
      body: "Alisa xabar yuboradi. 1-gateway uni chat servisi orqali saqlaydi va xonadagi **1-gateway'ga ulangan** hammaga yetkazadi.\n\nBobur 2-gateway'da. 2-gateway'ga hech kim aytmaydi, Bobur sahifani yangilamaguncha hech narsa ko'rmaydi.",
      watch: "Gateway bittadan ko'p bo'lsa, yuboruvchi va qabul qiluvchi deyarli hech qachon bitta gateway'da bo'lmaydi.",
      fields: {
        "local members": "1-gateway faqat o'z socket'larini biladi: bu yerda Alisa bor.",
        skipped: "Bobur xonada, lekin bu gateway'da emas. Xabar unga yetib bormaydi.",
      },
    },
    bus: {
      short: "Pub/sub",
      title: "Gateway'lar orasida pub/sub",
      body: "Xabarni saqlagach, chat servisi uni xona kanaliga **publish** qiladi. Har gateway o'z foydalanuvchilari ochgan xonalar kanaliga obuna bo'lgan.\n\nHar gateway xabarni oladi va o'zidagi socket'larga jo'natadi. Bobur uni 2-gateway'dan oladi.",
      watch: "Bu pub/sub «yubordim va unutdim» turida: o'sha paytda obuna bo'lmagan gateway xabarni hech qachon ko'rmaydi.",
      fields: {
        PUBLISH: "Hozir kanalga obuna bo'lgan hammaga yubor.",
        "room:r_17": "Har xonaga bitta kanal: gateway faqat o'ziga kerakli xonalarni oladi.",
        "(integer) 2": "Ikkita gateway obuna bo'lgan edi va xabarni oldi.",
      },
    },
    dropped: {
      short: "Uzilish",
      title: "Telefon tunnelga kirdi",
      body: "Boburning ulanishi xayrlashmasdan uziladi. U yo'qligida uchta xabar publish qilinadi.\n\n2-gateway'da Bobur uchun socket yo'q, xabarlarni beradigan odam yo'q. Bobur qaytganda chatda bo'shliq qoladi.",
      watch: "Mobil ulanish doim uzilib turadi. Faqat yaxshi holatni emas, qayta ulanishni rejalashtiring.",
      fields: {
        "1006": "Noodatiy yopilish: socket close frame'siz o'ldi, tarmoq yo'qolganda shunday bo'ladi.",
        dropped: "Jonli pub/sub yo'q obunachi uchun hech narsa saqlamaydi.",
      },
    },
    resume: {
      short: "Davom etish",
      title: "Qayta ulanib, oxirgi ID'dan yetib olish",
      body: "Boburning ilovasi tobora uzayadigan pauza va tasodifiy jitter bilan qayta ulanadi, shunda minglab telefon bitta soniyada yopirilib kelmaydi. Keyin oxirgi ko'rgan xabarini aytadi.\n\nGateway undan yangi hamma xabarni chat servisidan oladi va shundan keyingina jonli yetkazishga o'tadi. Bo'shliq to'ldi.",
      watch: "Haqiqat manbai — baza; jonli kanal faqat tez yo'l. Takrorlarni klient xabar ID'si bo'yicha tashlab yuboradi.",
      fields: {
        after: "Bobur uzilishdan oldin ko'rgan oxirgi xabar.",
        messages: "Bobur yo'qligida publish qilingan uchta xabar, bazadan o'qilgan.",
        live: "Tarix tugadi; bundan keyin yangi xabarlar jonli kanal orqali keladi.",
      },
    },
    recap: {
      short: "Xulosa",
      title: "Xulosa",
      body: "Mos keladigan eng arzon kanalni tanlang: kam yangilanishga polling, serverdan klientga oqimga SSE, ikki tomonlama chatga WebSocket.\n\n1) Uzoq yashaydigan ulanishlar alohida gateway qatlamida. 2) Gateway'lar xabardan pub/sub orqali xabar topadi. 3) Jonli yetkazish o'tkazib yuborishi mumkin; haqiqat bazada. 4) Klient backoff va jitter bilan qayta ulanadi va oxirgi ID'dan davom etadi.",
    },
  },
};

export default text;
