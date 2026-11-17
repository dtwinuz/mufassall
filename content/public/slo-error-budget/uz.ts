import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "SLO va xato byudjeti",
  summary:
    "Taksi ilovasining buyurtma API'si soniyasiga 100 ga yaqin so'rovga xizmat qiladi. Health check 100% ko'rsatadi, yo'lovchilar esa xato ko'radi. Ishonchlilikni foydalanuvchi qanday his qilsa, shunday o'lchash, maqsadni kelishish, farqni xato byudjetiga aylantirish va odamlarni faqat byudjet haqiqatan yonayotganda uyg'otish.",
  learn: [
    "SLI, SLO va SLA: nima o'lchanadi, maqsad nima va nima va'da qilinadi",
    "Xato byudjeti hisobi: 30 kunda 99,9% — taxminan 43 daqiqa yoki 259 200 ta muvaffaqiyatsiz so'rov",
    "Yonish tezligi (burn rate) va ikki oynali alertlar: tez uyg'otadi, sakrashlarda jim turadi",
    "Byudjet tugaganda relizlarni muzlatish va persentil bo'yicha kechikish SLO'si",
  ],
  nodes: {
    riders: "Yo'lovchilar",
    lb: "Balanslovchi",
    api: "Buyurtma API",
    db: "Safarlar bazasi",
    monitor: "Monitoring",
    pager: "Navbatchi",
    pipeline: "Reliz pipeline",
  },
  metrics: {
    sli: "Yaxshi so'rovlar",
    budget: "Byudjet qoldig'i",
    burn: "Yonish tezligi",
    p99: "Buyurtma p99",
  },
  steps: {
    uptime: {
      short: "Uptime",
      title: "Health check yashil, yo'lovchilar xato ko'radi",
      body: "Monitoring har 10 soniyada buyurtma API'sining `/healthz` manzilini chaqiradi. Jarayon tirik, shuning uchun doim `200` qaytaradi va dashboard'da 100% uptime turadi.\n\nAyni paytda safarlar bazasi to'lib ketgan va har yetmishinchi buyurtma yiqiladi. Yo'lovchilar tugmani yana bosadi yoki raqib ilovasini ochadi. Dashboard'da hech narsa qizarmadi.",
      watch: "Server ishlayapti degani foydalanuvchiga xizmat ko'rsatildi degani emas. Jarayon javob beryaptimi emas, foydalanuvchi nima olayotganini o'lchang.",
      fields: {
        healthz: "Arzon ichki endpoint. U bazaga ham, buyurtma yo'liga ham tegmaydi.",
        "200": "Jarayon tirik. Yiqilgan buyurtmalar haqida bu hech narsa demaydi.",
        uptime: "Health check bo'yicha hisoblanadi, shuning uchun real yo'lovchi ko'rgan har bir xatoni yashiradi.",
      },
    },
    sli: {
      short: "SLI",
      title: "SLI: yaxshi so'rovlarni foydalanuvchi uchragan joyda sanash",
      body: "Jamoa raqamni balanslovchi logidan oladi: har bir haqiqiy buyurtma so'rovi va u yaxshi bo'lganmi. So'rov `5xx` qaytarmagan va 2 soniyada tugagan bo'lsa, yaxshi hisoblanadi.\n\nShu nisbat **SLI**, xizmat darajasi ko'rsatkichi. O'sha daqiqada u 98,5% — health check yashirgan raqam aynan shu.",
      watch: "Foydalanuvchiga iloji boricha yaqin joyda o'lchang. Balanslovchi servisning o'zi hech qachon log'ga yozmaydigan timeout va yiqilgan pod'larni ko'radi.",
      fields: {
        requests: "Bir daqiqadagi yaroqli buyurtma so'rovlari: maxraj.",
        status_5xx: "Bizning aybimiz: yomon deb sanaladi.",
        status_4xx: "Mijozning aybi (yaroqsiz karta, noto'g'ri manzil). Servisga qarshi sanalmaydi.",
        SLI: "Yaxshilari bo'lingan yaroqlilariga. Yo'lovchilarga qanday xizmat qilinganini aytadigan bitta raqam.",
      },
    },
    slo: {
      short: "SLO",
      title: "SLO: maqsad va u qoldiradigan byudjet",
      body: "Jamoa **SLO** ni kelishadi: siljuvchi 30 kun ichida buyurtma so'rovlarining 99,9% i yaxshi. 100% emas: hech bir tizim bunga yetmaydi, uni quvish esa har qanday o'zgarishni to'xtatardi.\n\nQolgan 0,1% — **xato byudjeti**: oyiga taxminan 259 000 ta muvaffaqiyatsiz so'rov yoki 43 daqiqa to'liq uzilish. Byudjet bor ekan, jamoa tavakkal qilib, reliz chiqarishi mumkin. Bu oy uning 20% i allaqachon sarflangan.",
      watch: "Byudjet ishonchlilikni bahsdan mahsulot ham, navbatchi ham o'qiy oladigan raqamga aylantiradi.",
      check: {
        q: "Jamoa 99,9% o'rniga 99,99% xohlaydi. Byudjet 30 kunda qancha to'liq uzilishga ruxsat beradi?",
        options: ["Taxminan 4,3 daqiqa", "Taxminan 43 daqiqa", "Taxminan 26 soniya"],
        answer: 0,
        why: "30 kun — 43 200 daqiqa. Uning 0,1% i 43,2 daqiqa, 0,01% i esa o'n barobar kam: 4,3 daqiqa. Har bir qo'shimcha to'qqiz byudjetni o'n barobar qisqartiradi.",
      },
      fields: {
        objective: "Yaxshi so'rovlarning maqsadli ulushi. Nima mumkinligiga emas, yo'lovchilar nimaga chidashiga qarab tanlanadi.",
        rolling: "Oyna har kuni siljiydi, shuning uchun yomon kun 30 kundan keyin unutiladi.",
        error_budget: "Yiqilishi mumkin bo'lgan 0,1%. Uni avariyalar va tavakkalli relizlar sarflaydi.",
        "43 minutes": "O'sha byudjet vaqtda: 43 200 daqiqaning 0,1% i.",
      },
    },
    sla: {
      short: "SLA",
      title: "SLA: pulga bog'langan va'da",
      body: "Korporativ mijozlar **SLA**, ya'ni shartnoma oladi: oyiga 99,5%, aks holda taksi kompaniyasi hisobning bir qismini qaytaradi.\n\nSLA ataylab ichki SLO'dan yumshoqroq. Jamoa 99,9% da uyg'otiladi, pul xavf ostida qolishidan ancha oldin. SLO va SLA teng bo'lganda, birinchi ogohlantirish pul qaytarish bilan birga kelardi.",
      fields: {
        availability: "Shartnoma va'da qilgan narsa. SLI bilan bir xil usulda o'lchanadi.",
        credit: "Jarima. SLA'ni pulga aynan shu aylantiradi.",
        "internal SLO": "Shartnomadan qattiqroq, shunda buzilishdan oldin harakat qilishga vaqt qoladi.",
      },
    },
    "bad-deploy": {
      short: "Yomon reliz",
      title: "Reliz byudjetni ellik barobar tez yoqadi",
      body: "v412 reliz tarif keshini qo'shadi. Har yigirmatadan bitta pod unda osilib qoladi va buyurtmalarning 5% i yiqiladi. SLO esa 0,1% ga ruxsat beradi.\n\n**Yonish tezligi** byudjet qanchalik tez ketayotganini aytadi: 5 / 0,1 = 50. 50x da 30 kunlik byudjet 14,4 soatda tugaydi.",
      watch: "Tezlik 1 — byudjet oyna oxirida aynan tugaydi degani. Barqaror 1 dan yuqori har qanday tezlik SLO'ni buzadi.",
      fields: {
        v412: "Bug'ni olib kelgan reliz. Pipeline u qachon chiqqanini biladi.",
        "error rate": "Ayni paytdagi yomon so'rovlar ulushi.",
        burn_rate: "Xato ulushi bo'lingan ruxsat etilgan ulushga. 50 — rejadan ellik barobar tez.",
        "14.4 hours": "Shu sur'atda butun oylik byudjet qancha yetadi.",
      },
    },
    "naive-alert": {
      short: "Sodda alertlar",
      title: "Ikki sodda alert: juda shovqinli va juda kech",
      body: "A qoida xato ulushi 5 daqiqa davomida 0,1% dan oshsa uyg'otadi. O'tgan hafta u 31 marta ishladi va 29 tasi bir necha daqiqada o'z-o'zidan o'tib ketdi. Odamlar unga e'tibor bermay qo'ydi.\n\nB qoida byudjetning 10% idan kami qolganda uyg'otadi. v412 uchun u relizdan 10 soat keyin ishladi, oylik byudjetning 70% i allaqachon yonib bo'lganda.",
      fields: {
        "rule A": "Qisqa oyna, past chegara. Har bir sakrash kimnidir uyg'otadi.",
        "31 times": "Harakat talab qilmaydigan alertlar pager'ga e'tibor bermaslikka o'rgatadi.",
        "rule B": "Byudjet bo'yicha chegara. To'g'ri, lekin faqat zarar yetib bo'lganini aytadi.",
        "10 hours": "Sezishgacha ketgan vaqt. Orqaga qaytarish esa 5 daqiqa oldi.",
      },
    },
    "burn-rate": {
      short: "Yonish alerti",
      title: "Ikki oynali yonish tezligi alertlari",
      body: "Endi page yonish tezligi oxirgi bir soatda ham, oxirgi 5 daqiqada ham 14,4 dan yuqori bo'lsa ishlaydi. Bir soat davomida 14,4x oylik byudjetning 2% ini sarflaydi: bunga odamni uyg'otishga arziydi. Sekin qoida, 6 soatda 6x, tiket ochadi.\n\nUzun oyna sakrashlarni e'tiborsiz qoldiradi, qisqasi esa muammo tuzatilishi bilan alertni o'chiradi. v412 qayta o'ynalganda: 17-daqiqada page, 25-daqiqada orqaga qaytarish, 70% o'rniga byudjetning 3% i sarflandi.",
      watch: "SLO'ga tahdid qiladigan tez yonishda uyg'oting, sekinida tiket oching. Kimnidir uyg'otishdan oldin ikkala oyna ham rozi bo'lishi kerak.",
      check: {
        q: "v412 40 daqiqa 50x da yondi va 10 daqiqa oldin orqaga qaytarildi. Bir soatlik tezlik hali ham 14,4 dan yuqori. Page hozir ishlaydimi?",
        options: [
          "Ha: bir soatlik oyna chegaradan yuqori",
          "Yo'q: 5 daqiqalik oyna allaqachon tinch",
          "Faqat byudjet nolga yetganda",
        ],
        answer: 1,
        why: "Chegarani ikkala oyna ham kesib o'tishi kerak. Orqaga qaytarishdan keyingi oxirgi 5 daqiqa toza, shuning uchun alert allaqachon yo'q muammo uchun odamni uyg'otmay, o'zi yopiladi.",
      },
      fields: {
        "burn_rate(1h)": "Uzun oyna: bu sakrash emasligining isboti.",
        "burn_rate(5m)": "Qisqa oyna: bu hali davom etayotganining isboti.",
        "2%": "14,4x dagi bir soatning narxi. 14,4 = 2% x 720 soat.",
        ticket: "Sekin yonish uchun tungi soat 3 da hech kim kerak emas, lekin shu hafta qarash shart.",
        "+17 min": "Qayta o'ynashda page 10 soat o'rniga shu paytda ishladi.",
      },
    },
    freeze: {
      short: "Muzlatish",
      title: "Byudjet tugadi: relizlar to'xtaydi",
      body: "Oyning keyingi qismida baza migratsiyasi va provayder uzilishi byudjetdan oshib ketadi: 12% ortiqcha. Oldindan kelishilgan siyosat ishga tushadi: pipeline har deploy'dan oldin SLO servisidan so'raydi va feature relizlari bloklanadi.\n\nSiljuvchi oyna tiklanmaguncha faqat ishonchlilik va xavfsizlik tuzatishlari chiqadi. Sekinlashish kerakmi, deb hech kim bahslashmaydi: raqam hal qiladi.",
      watch: "Muzlatish faqat mahsulot va muhandislar siyosatni insidentdan oldin imzolagan bo'lsa ishlaydi, insident paytida emas.",
      fields: {
        budget_left_percent: "Noldan past: oyna uchun SLO allaqachon buzilgan.",
        policy: "Jamoa shu holatda nima qilishni kelishgan.",
        allowed: "Chiqarish mumkin bo'lgan yagona o'zgarishlar turi.",
        until: "Eski nosozliklar 30 kunlik oynadan chiqqanda muzlatish o'zi tugaydi.",
      },
    },
    latency: {
      short: "Kechikish SLO",
      title: "Kechikish SLO'si — persentil, o'rtacha emas",
      body: "Muvaffaqiyat faqat \"xato yo'q\" degani emas. 4 soniya davom etgan buyurtma ham buzilgandek tuyuladi. Jamoa kechikish SLO'sini qo'shadi: buyurtmalarning 99% i 300 ms dan tez.\n\nGistogramma persentil bo'yicha o'qiladi. O'rtacha qulay 120 ms, lekin yo'lovchilar aynan sekin dumda voz kechadi.",
      check: {
        q: "O'rtacha 120 ms, p99 900 ms, so'rovlarning 98,2% i 300 ms dan tez. \"99% i 300 ms dan tez\" bajarilganmi?",
        options: [
          "Ha: o'rtacha 300 ms dan ancha past",
          "Ha: sekin so'rovlar atigi 1% ga yaqin",
          "Yo'q: 300 ms ga 99% dan kami sig'adi",
        ],
        answer: 2,
        why: "300 ms dan tez faqat 98,2%, demak 1,8% sekin — SLO ruxsat berganidan deyarli ikki barobar ko'p. O'rtacha dum haqida hech narsa demaydi.",
      },
      fields: {
        "le=300ms": "300 ms yoki undan tez so'rovlar ulushi. Shu qator SLI'ning o'zi.",
        avg: "Yaxshi ko'rinadi va sekin dumni yashiradi.",
        p99: "Har yuzta so'rovdan bittasi 900 ms dan sekin.",
        "latency SLO": "Chegara ostidagi ulush sifatida yozilgan, shuning uchun xatolar kabi uning ham byudjeti bor.",
      },
    },
    recap: {
      short: "Xulosa",
      title: "Xulosa",
      body: "SLO uchun olti qoida.\n\n1) SLI'ni foydalanuvchi uchragan joyda o'lchang: yaxshi so'rovlar yaroqlilarga nisbatan, balanslovchida. 2) SLO'ni 100% dan past tanlang; qolgani xato byudjeti (30 kunda 99,9% — taxminan 43 daqiqa). 3) SLA'ni SLO'dan yumshoqroq saqlang. 4) Yonish tezligi bo'yicha uzun va qisqa oyna bilan alert qiling: tez yonishda page, sekinida tiket. 5) Byudjet tugasa feature relizlari muzlashini oldindan kelishing. 6) Kechikish SLO'sini o'rtacha bilan emas, persentil bilan yozing.",
    },
  },
};

export default text;
