import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "SQL va NoSQL",
  summary:
    "Bitta do'kon, bir necha xil ma'lumot. Buyurtmalarga JOIN va tranzaksiya kerak, buyurtma sahifasi bitta o'qishni xohlaydi, sahifa ko'rishlari soniyasiga o'n minglab keladi, savat bitta kalit bo'yicha olinadi. Omborni ma'lumot qanday o'qilishi va yozilishiga qarab tanlash, savollar o'zgarganda nima bo'lishi.",
  learn: [
    "Relatsion baza nima beradi: JOIN, tranzaksiya, sxemani qayta qurmasdan yangi savollar",
    "Hujjat ombori: butun obyekt bitta o'qishda, bitta foydalanish usuliga moslangan",
    "Wide-column ombor: juda ko'p yozuv, lekin har savolga bitta jadval",
    "Key-value ombor: eng tez qidiruv, boshqa hech narsa yo'q",
  ],
  nodes: {
    client: "Do'kon ilovasi",
    api: "API",
    sql: "Relatsion baza",
    docs: "Hujjat ombori",
    events: "Wide-column ombor",
    kv: "Key-value ombor",
  },
  metrics: {
    p95: "So'rov p95",
    scanned: "So'rovga o'qilgan qatorlar",
    writes: "Qabul qilingan yozuvlar",
  },
  steps: {
    tables: {
      short: "Jadvallar",
      title: "Relatsion: ma'lumot jadvallarda, o'qishda birlashtiriladi",
      body: "Buyurtmalar, buyurtma qatorlari va mahsulotlar alohida jadvallarda turadi. Har fakt bir marta saqlanadi: mahsulot nomi faqat `products` da.\n\n901-buyurtmani ko'rsatish uchun baza uchta jadvalni kalitlari bo'yicha **JOIN** qiladi. Bitta so'rov, uchta qator, bir necha millisekund.",
      fields: {
        JOIN: "Kalitlari mos keladigan ikki jadval qatorlarini birlashtir.",
        ON: "Moslash qoidasi: buyurtma qatori shu ID'li buyurtmaga tegishli.",
        "3 rows": "Har buyurtma qatoriga bitta qator, mahsulot nomi bilan allaqachon birlashtirilgan.",
      },
    },
    transaction: {
      short: "Tranzaksiya",
      title: "Tranzaksiya: hammasi yoki hech narsa",
      body: "Buyurtma berish ikki yozuv: buyurtmani yaratish va chiroqlarni qoldiqdan ayirish. Ikkalasi ham bo'lishi kerak yoki hech biri.\n\nBuni baza kafolatlaydi: qoldiq yetmasa yoki server o'rtada yiqilsa, hech narsa saqlanmaydi. Relatsion bazalar aynan shu uchun qurilgan.",
      fields: {
        BEGIN: "`COMMIT` gacha hammasi bitta birlik.",
        "stock >= 2": "Omborda yo'q narsani sotishni bazaning o'zi rad etadi, bir paytda ikki xaridor bo'lsa ham.",
        COMMIT: "Ikkala yozuv birga ko'rinadi.",
      },
    },
    document: {
      short: "Hujjat",
      title: "Hujjat: butun buyurtma bitta o'qishda",
      body: "Hujjat ombori buyurtmani bitta JSON obyekt sifatida saqlaydi, qatorlar va mahsulot nomlari uning ichida. O'qish — bitta qidiruv, JOIN yo'q.\n\nBuyurtma sahifasi uchun bu ideal: sahifaga har safar aynan shu obyekt kerak.",
      watch: "Mahsulot nomi buyurtma ichiga nusxalangan. Buyurtma uchun bu to'g'ri (nima sotib olinganini ko'rsatadi), lekin o'zgarishi kerak bo'lsa, har nusxani yangilash kerak.",
      fields: {
        _id: "Hujjat kaliti. Kalit bo'yicha o'qish — tez yo'l.",
        items: "Buyurtma qatorlari boshqa jadvalda emas, buyurtmaning ichida.",
        name: "Mahsulot nomining xarid paytida muzlatilgan nusxasi.",
      },
    },
    "new-question": {
      short: "Yangi savol",
      title: "Model ko'zlamagan yangi savol",
      body: "Biznes so'raydi: «`p_17` chiroq qaysi buyurtmalarda bor?». Hujjatlar mahsulot atrofida emas, bitta buyurtmani o'qish atrofida qurilgan.\n\nO'sha maydonda indeks bo'lmasa, ombor mos kelganlarini topish uchun 4,8 million buyurtmaning hammasini o'qiydi. So'rov soniyalab davom etadi va qolgan hamma narsani sekinlashtiradi.",
      watch: "Hujjat modeli ma'lum so'rovlar atrofida loyihalanadi. Har yangi savol — yangi indeks, ma'lumotning yangi nusxasi yoki to'liq skanerlash.",
      fields: {
        COLLSCAN: "Kolleksiyani skanerlash: har hujjat o'qiladi va tekshiriladi.",
        docsExamined: "Bitta savolga javob uchun 4,8 million hujjat o'qildi.",
      },
    },
    "relational-answer": {
      short: "Erkin so'rov",
      title: "O'sha savol SQL'da",
      body: "Relatsion bazada buyurtma qatorlari allaqachon `product_id` bo'yicha indeksli jadval. Yangi savol — shunchaki yangi so'rov; sxemada hech narsa o'zgarmaydi.\n\nRelatsion saqlashning asosiy kuchi shu: jadvallarni loyihalaganda hech kim o'ylamagan savollarga ham javob arzon.",
      fields: {
        "GROUP BY": "Miqdorlarni har mahsulot bo'yicha baza ichida yig'.",
        "Index Scan": "Butun jadval emas, indeks orqali faqat 17-mahsulot qatorlari o'qiladi.",
      },
    },
    "hot-writes": {
      short: "Yozuv toshqini",
      title: "Sahifa ko'rishlari relatsion bazani bosib ketadi",
      body: "Yangi funksiya har sahifa ko'rishni yozadi: soniyasiga 40 000 ta INSERT. O'sha baza buyurtma va to'lovlarga ham xizmat qiladi.\n\nUlanishlar va disk o'tkazuvchanligi tugaydi, ko'rishlar bilan birga buyurtmalar ham yiqila boshlaydi.",
      fields: {
        page_views: "Har ko'rishga bitta kichik qator. Hech qachon yangilanmaydi, kamdan-kam bittalab o'qiladi.",
        ERROR: "Baza yangi ulanishlarni rad etadi. Faqat ko'rishlar emas, buyurtmalar ham yiqiladi.",
      },
    },
    "wide-column": {
      short: "Wide-column",
      title: "Hodisalar oqimi uchun wide-column ombor",
      body: "Sahifa ko'rishlari wide-column omborga ko'chadi. Jadval `user_id` bo'yicha ko'p mashinalarga bo'lingan, har foydalanuvchi ichida qatorlar vaqt bo'yicha tartiblangan.\n\nYozuvlar tarqalgan va faqat oxiriga qo'shiladi, shuning uchun klaster soniyasiga 40 000 tani bemalol oladi. Relatsion bazada faqat buyurtmalar qoldi, u yana tinch.",
      fields: {
        views_by_user: "Jadval o'z savoli nomi bilan atalgan: bitta foydalanuvchining ko'rishlari, eng yangisi birinchi.",
        user_id: "Partition kaliti. Qator qaysi mashinalarda saqlanishini u hal qiladi.",
        TTL: "Qatorlar 30 kundan keyin o'zi o'chadi. Tozalash job'lari kerak emas.",
      },
    },
    "wrong-key": {
      short: "Noto'g'ri kalit",
      title: "Kalit bo'lmagan ustun bo'yicha so'rash",
      body: "Endi kimdir so'raydi: «bu buyurtma sahifasini kimlar ko'rgan?». Jadval sahifa bo'yicha emas, foydalanuvchi bo'yicha bo'lingan, ombor har mashinadan so'rab, hammasini o'qishi kerak bo'lardi.\n\nBuning o'rniga u rad etadi. Bunday omborda faqat jadval qurilgan kalit bo'yicha so'rash mumkin.",
      fields: {
        InvalidRequest: "Ombor butun klasterni skanerlash o'rniga so'rovni rad etadi.",
        "ALLOW FILTERING": "Qochish yo'li. Katta jadvalda hammasini o'qiydi; prod'da ishlatmang.",
      },
    },
    "second-table": {
      short: "Ikki jadval",
      title: "Har savolga bitta jadval",
      body: "Yechim — o'sha ko'rishni ikki marta saqlash: bir marta foydalanuvchi bo'yicha, bir marta sahifa bo'yicha. Har savol o'z jadvalini o'z kaliti bo'yicha o'qiydi.\n\nYozuvlar ikki baravar, ma'lumot takrorlanadi — wide-column omborda bu odatiy narx. Relatsion baza bunga bitta indeks bilan javob bergan bo'lardi.",
      fields: {
        views_by_page: "O'sha hodisa, bu safar sahifa kaliti bilan.",
        "APPLY BATCH": "Ikkala INSERT birga yuboriladi, ikki jadval bir-biridan uzoqlashmasin.",
      },
    },
    "key-value": {
      short: "Key-value",
      title: "Savat uchun key-value ombor",
      body: "Savat faqat foydalanuvchi ID'si bo'yicha o'qiladi va yoziladi, har tashrifda ko'p marta. Key-value ombor aynan shuni qiladi: kalit bo'yicha ol, kalit bo'yicha yoz, xotiradan.\n\nU millisekundda javob beradi, lekin qidira, JOIN qila yoki yig'a olmaydi. Bu yaxshi, chunki savatga bular kerak emas.",
      fields: {
        HGETALL: "Bitta kalitning barcha maydonlarini o'qi: mahsulot ID'lari va miqdorlar.",
        "cart:u_42": "Kalit — yagona kirish yo'li. Boshqa savol berib bo'lmaydi.",
      },
    },
    recap: {
      short: "Xulosa",
      title: "Xulosa",
      body: "Omborni ma'lumot qanday ishlatilishiga qarab tanlang.\n\n1) Relatsion: JOIN, tranzaksiya va sxemani qayta qurmasdan yangi savollar; biznes ma'lumoti uchun standart tanlov. 2) Hujjat: foydalanish usuli ma'lum bo'lsa, bitta obyekt bitta o'qishda. 3) Wide-column: juda ko'p yozuv, har savolga bitta jadval. 4) Key-value: kalit bo'yicha qidiruv va boshqa hech narsa. Bitta tizim ko'pincha bir nechtasini ishlatadi.",
    },
  },
};

export default text;
