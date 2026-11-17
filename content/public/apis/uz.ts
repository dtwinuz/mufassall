import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "API uslublari",
  summary:
    "Ovqat yetkazish ilovasidagi bitta ekran — «Buyurtmalarim» — avval REST, keyin GraphQL bilan, servislar orasida esa gRPC bilan. Har uslub qayerda ortiqcha yoki kam ma'lumot oladi va har API'ga kerak odatlar: cursor bilan sahifalash, versiyalash va idempotentlik kaliti.",
  learn: [
    "Over-fetching, under-fetching va ular keltirib chiqaradigan N+1 chaqiruv",
    "REST, GraphQL va gRPC: bitta funksiyada har biri nimaga yaxshi",
    "`OFFSET` o'rniga cursor bilan sahifalash, buzadigan o'zgarish o'rniga yangi versiya",
    "Takroriy `POST`'ni xavfsiz qiladigan `Idempotency-Key`",
  ],
  nodes: {
    phone: "Telefon ilovasi",
    api: "REST API",
    db: "Baza",
    gql: "GraphQL server",
    pricing: "Narx servisi",
  },
  metrics: {
    calls: "Ekranga chaqiruv",
    screen: "Ekran yuklanishi",
    payload: "Ekranga ma'lumot",
    double: "Ikki marta buyurtma",
  },
  steps: {
    rest: {
      short: "REST",
      title: "REST: bitta resurs, bitta URL",
      body: "«Buyurtmalarim» ekraniga oxirgi 20 buyurtmaning har biri uchun holati va restoran nomi kerak. REST API'da buning uchun resurs bor: `GET /v1/orders`.\n\nU to'liq buyurtma obyektini qaytaradi, 40 ga yaqin maydon: manzil, taomlar, kuryer. Ekran ulardan ikkitasini ishlatadi. Hech kim ko'rsatmaydigan maydonlarni yuklab olish **over-fetching** deyiladi.",
      fields: {
        GET: "Faqat o'qish. Takrorlash xavfsiz va keshlash oson.",
        data: "Ro'yxatning o'zi. Kalit ostida turgani yonida sahifa ma'lumotiga joy qoldiradi.",
        restaurant_id: "Faqat ID. Ekranga nom kerak, u esa bu yerda yo'q.",
        items: "Ekran hech qachon ko'rsatmaydigan og'ir maydonlar, baribir har yuklashda keladi.",
      },
    },
    "n-plus-one": {
      short: "N+1",
      title: "Under-fetching: 1 + 20 chaqiruv",
      body: "Nom yo'q, shuning uchun ilova har restoranni alohida so'raydi: ro'yxat uchun bitta chaqiruv va yana yigirmata, har buyurtmaga bittadan. Bu **under-fetching** va N+1 naqshi.\n\nMobil tarmoqda har chaqiruv 100+ ms turadi, telefon esa bir vaqtda bir nechtasini bajara oladi xolos. Ekran 2,6 s da chiqadi.",
      watch: "Ro'yxat bo'yicha siklda chaqiruv — N+1 ning klassik belgisi, telefonda ham, serverda ham.",
      fields: {
        "21 requests": "Ro'yxatga bitta, har buyurtmaga bitta. Ekran eng sekinini kutadi.",
        r_7: "Bir vaqtda bitta restoran. Ko'pincha bitta restoran ikki marta so'raladi.",
        "17 more": "Narx ro'yxat bilan o'sadi: 50 buyurtma — 51 chaqiruv.",
      },
    },
    expand: {
      short: "Expand",
      title: "Maydonlarni mijoz tanlasin",
      body: "REST API ikki parametrni o'rganadi: `fields` nima qaytarishni sanaydi, `expand` bog'liq obyektni ichiga joylaydi. Endi bitta chaqiruv ekran chizadigan ro'yxatni aynan qaytaradi.\n\nYechim ishlaydi, lekin har yangi ekran yangi kombinatsiya so'raydi va API jamoasi ularni qo'shib boraveradi. GraphQL aynan shu bosimdan paydo bo'lgan.",
      fields: {
        fields: "Faqat shu maydonlar qaytadi. Javob 40 maydondan 2 taga kichrayadi.",
        expand: "Faqat ID emas, restoranni har buyurtma ichiga joyla.",
        restaurant: "Nom endi buyurtma ichida. Ikkinchi chaqiruv yo'q.",
      },
    },
    graphql: {
      short: "GraphQL",
      title: "GraphQL: so'rovni mijoz yozadi",
      body: "GraphQL server barcha ma'lumotni bitta tiplangan sxema sifatida tasvirlaydi. Ilova bitta URL orqali so'rov yuboradi, unda aynan kerakli maydonlar, ekranga kerakli chuqurlikda.\n\nBitta chaqiruv, ortiqcha maydon yo'q. Narxi: har so'rov har xil, shuning uchun oddiy HTTP kesh yordam bermaydi, server esa juda og'ir so'rovlardan himoyalanishi kerak.",
      watch: "So'rov chuqurligi va narxini cheklang, aks holda bitta mijoz bitta so'rovda butun bazani so'rashi mumkin.",
      fields: {
        query: "O'qish. O'zgartirishlar `mutation` orqali boradi.",
        orders: "Javob so'rov bilan bir xil shaklda.",
        restaurant: "Ichma-ich obyekt. Uni telefondan ikkinchi chaqiruv emas, server topadi.",
      },
    },
    "resolver-n1": {
      short: "Yana N+1",
      title: "N+1 serverga ko'chdi",
      body: "Telefon bitta chaqiruv qiladi, lekin GraphQL server `restaurant`'ni har buyurtma uchun alohida topadi. Bitta so'rov ortida bazaga yigirma bitta so'rov yashiringan.\n\nBaza yuki 75% ga sakraydi va ekran yana sekinlashadi, endi server sababli.",
      fields: {
        LIMIT: "Birinchi so'rov: 20 buyurtma. Hozircha yaxshi.",
        r_7: "Keyin har buyurtma uchun uning restorani bo'yicha bittadan so'rov.",
        "18 more": "Yigirma so'rov, har biri bazaga borib-kelish.",
      },
    },
    batch: {
      short: "Batch",
      title: "ID'larni yig'ib, bir marta so'ra",
      body: "Server endi so'rovga kerak barcha restoran ID'larini yig'adi va bazadan `IN (...)` bilan bir marta so'raydi. Bunday guruhlash vositasini ko'pincha DataLoader deyishadi.\n\nYigirma bitta o'rniga ikki so'rov. Takrorlangan restoranlar bir marta olinadi.",
      fields: {
        IN: "Barcha ID'lar bitta so'rovda.",
        "14 rows": "Yigirma buyurtma, lekin faqat o'n to'rtta turli restoran: takrorlar birlashtirildi.",
      },
    },
    grpc: {
      short: "gRPC",
      title: "Servislar orasida gRPC",
      body: "Ekran narx servisidan yetkazish narxi va vaqtini ham ko'rsatadi. Ikki backend servis orasida jamoa gRPC ishlatadi: `.proto` faylda tasvirlangan tiplangan metodni chaqirish, HTTP/2 ustida ixcham binar formatda.\n\nIkkala tomon bitta kontraktdan kod generatsiya qiladi, shuning uchun yetishmagan maydon prod'ni emas, build'ni buzadi. Brauzer gRPC'ni to'g'ridan-to'g'ri chaqira olmaydi, shuning uchun u backend ichida yashaydi.",
      fields: {
        Quote: "Metod nomi yo'lning bir qismi: resurs emas, `servis/metod`.",
        "grpc-timeout": "Chaqiruvchi 150 ms beradi. Muddat chaqiruv bilan keyingi servisga ham boradi.",
        QuoteRequest: "Ochilgan holda ko'rsatilgan. Simda u bir necha o'n bayt protobuf.",
        "grpc-status": "`0` — OK. Xatolar HTTP status emas, trailer'larda keladi.",
      },
    },
    offset: {
      short: "Offset",
      title: "2-sahifa 1-sahifani takrorlaydi",
      body: "Eski buyurtmalar aylantirganda `OFFSET 20` bilan yuklanadi. Foydalanuvchi 1-sahifaga qarab turganda yangi buyurtma keladi. Har qator bittaga pastga suriladi va 2-sahifa ekranda allaqachon turgan buyurtma bilan boshlanadi.\n\nChuqur sahifalarda esa `OFFSET 5000` 5000 qatorni faqat tashlab yuborish uchun o'qiydi.",
      fields: {
        OFFSET: "20 qatorni o'tkazib yubor — birinchi sahifa paytida emas, shu so'rov paytida sanab.",
        ord_962: "1-sahifaning oxirgi buyurtmasi 2-sahifaning birinchisi bo'lib qaytdi.",
        "already shown": "Ekranda takror. O'chirishlar bo'lsa, aksincha qatorlar tushib qoladi.",
      },
    },
    cursor: {
      short: "Cursor",
      title: "`/v2` da cursor bilan sahifalash",
      body: "Sahifa endi nechta qatorni o'tkazishni emas, qayerda tugaganini aytadi: «shu buyurtmadan keyingi 20 tasini ber». Tepadagi yangi buyurtmalar hech narsani surmaydi, baza esa indeks bo'yicha to'g'ri o'sha joyga sakraydi.\n\nIlovaning eski versiyalari hali oylab `/v1` ni offset bilan chaqiradi. Shuning uchun o'zgarish `/v2` bo'lib chiqadi, `/v1` esa trafigi tugaguncha qoladi.",
      watch: "Maydon qo'shish xavfsiz. Nomini o'zgartirish, olib tashlash yoki ma'nosini o'zgartirish yangi versiya talab qiladi.",
      fields: {
        v2: "Yangi kontrakt uchun yangi versiya. O'rnatilgan ilovalar `/v1` dan foydalanishda davom etadi.",
        after: "Shu buyurtmadan keyin davom et. Qiymat shaffof emas: mijoz uni tahlil qilmaydi.",
        next_cursor: "Keyingi sahifa qayerdan boshlanadi. Boshqa narsa qolmasa, yo'q bo'ladi.",
      },
    },
    "double-post": {
      short: "Ikki POST",
      title: "Qayta urinish ikkinchi buyurtma beradi",
      body: "Foydalanuvchi «Buyurtma berish»ni bosadi. So'rov serverga yetadi va buyurtma yaratiladi, lekin tarmoq javobni yo'qotadi. Ilova xato ko'radi va `POST`'ni takrorlaydi.\n\nServer takrorni yangi buyurtmadan ajrata olmaydi. Foydalanuvchida ikkita buyurtma va ikki marta to'lov.",
      watch: "`POST` sukut bo'yicha takrorlashga xavfsiz emas. Mobil tarmoq esa takrorni kafolatlaydi.",
      fields: {
        POST: "Har chaqiruvda yangi narsa yaratadi.",
        cart_id: "Ikkala safar bir xil savat. Server undan takrorni aniqlash uchun foydalanmaydi.",
        id: "Ikkinchi buyurtma, `ord_991`. Birinchisi, `ord_990`, ham bor.",
      },
    },
    "idempotency-key": {
      short: "Idempotentlik",
      title: "`Idempotency-Key`: takrorga o'sha javob",
      body: "Birinchi urinishdan oldin ilova tasodifiy kalit yaratadi va uni shu buyurtmaning har takrori bilan yuboradi. Server kalitni javob bilan birga saqlaydi.\n\nKalit allaqachon ma'lum bo'lsa, server hech narsa yaratmaydi: saqlangan javobni qaytaradi. Tarmoq nima qilmasin, foydalanuvchida bitta buyurtma.",
      fields: {
        "Idempotency-Key": "Har urinishga emas, foydalanuvchining har harakatiga bitta kalit. Server uni bir kunga yaqin saqlaydi.",
        "Idempotent-Replayed": "Bu yangi buyurtma emas, birinchi urinishning saqlangan javobi.",
        id: "`ord_990`, asl buyurtma.",
      },
    },
    recap: {
      short: "Xulosa",
      title: "Xulosa",
      body: "API uchun besh odat.\n\n1) REST sodda va yaxshi keshlanadi, lekin N+1 va semiz javoblarga qarang. 2) GraphQL tanlovni mijozga beradi, lekin resolver'larni guruhlang va so'rov narxini cheklang. 3) gRPC o'z servislaringiz orasidagi chaqiruvlarga mos. 4) Cursor bilan sahifalang, buzadigan o'zgarishni yangi versiya qilib chiqaring. 5) Biror narsa yaratadigan har `POST` `Idempotency-Key` qabul qiladi.",
    },
  },
};

export default text;
