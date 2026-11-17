import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Talablardan dizayngacha",
  summary:
    "Dizayn vazifasiga darhol quti chizmasdan qanday yondashish kerak. Bitta kichik tizim, shahar avtobuslari kelish taxtasi, talablar, taxminiy hisob, yuqori darajadagi rasm va bitta qismning batafsil dizaynidan o'tadi, trade-off'lar esa yozib qo'yiladi.",
  learn: [
    "Funksional va nofunksional talablar, va nega aynan ikkinchisi dizaynni belgilaydi",
    "Taxminiy hisob: bir nechta ma'lum sondan o'qish, yozish va hajm",
    "High-level dizayn: qutilar, strelkalar va tizimning ikki yo'li",
    "Bitta komponentning low-level dizayni: API, ma'lumot joylashuvi, sxema va yozilgan trade-off",
  ],
  nodes: {
    rider: "Yo'lovchi ilovasi",
    bus: "Avtobus GPS qurilmasi",
    api: "Kelish API",
    db: "Baza",
    ingest: "Qabul servisi",
    queue: "Pozitsiyalar oqimi",
    worker: "ETA worker'lar",
    cache: "ETA kesh",
  },
  metrics: {
    writes: "Kelayotgan pozitsiyalar",
    reads: "Yo'lovchi so'rovlari",
    p95: "Javob p95",
    freshness: "ETA yoshi",
  },
  steps: {
    start: {
      short: "Boshlanish",
      title: "«Avtobus kelish taxtasini qiling»",
      body: "Vazifa bitta gap. Birinchi istak — bitta server va bitta baza chizish: avtobuslar pozitsiyasini yuboradi, server uni saqlaydi.\n\nDemo uchun bu yetadi. Lekin hali hech kim nechta avtobus, nechta yo'lovchi, kelish vaqti qanchalik yangi bo'lishi kerakligini so'ramadi. Bu javoblarsiz har qanday rasm — taxmin.",
      watch: "Avval qutilarni chizish — o'lchanmagan yuk uchun dizayn qilish degani.",
      fields: {
        bus_id: "Qaysi avtobus. Taxminan 800 avtobusning har birida o'ziniki bor.",
        route: "Avtobus hozir qatnayotgan yo'nalish. Yo'lovchini avtobus emas, yo'nalish qiziqtiradi.",
        ts: "GPS nuqta qachon olingani, soniyalarda. Eski pozitsiya yangisini bosib ketmasligi kerak.",
      },
    },
    requirements: {
      short: "Talablar",
      title: "Talablar: nima qiladi va qanchalik yaxshi",
      body: "Funksional: avtobus har 10 soniyada pozitsiyasini yuboradi; yo'lovchi bekatni ochadi va keyingi avtobuslarni kelishigacha qolgan daqiqalar bilan ko'radi. Hozircha doiradan tashqarida: yo'nalish rejalash, chiptalar.\n\nNofunksional: javob p95 bo'yicha 200 ms dan kam; kelish vaqti ko'pi bilan 30 soniyalik; qismlar yiqilganda ham taxta javob beradi; tarix 90 kun saqlanadi. Dizaynni funksiyalardan ko'ra aynan shu raqamlar hal qiladi.",
      fields: {
        stop: "Yo'lovchi qarab turgan bekat. O'qish tomonining asosiy kaliti.",
        arrivals: "Shu bekatga keyingi avtobuslar, eng yaqini birinchi.",
        eta_min: "Kelishigacha daqiqalar. Birinchi chizma, batafsil dizayn uni o'zgartiradi.",
      },
    },
    estimates: {
      short: "Hisob",
      title: "Qutilardan oldin taxminiy raqamlar",
      body: "800 avtobus, har 10 soniyada bitta pozitsiya: soniyasiga 80 yozish. Ertalabki cho'qqida taxminan 60 000 yo'lovchi har 20 soniyada yangilaydi: soniyasiga 3 000 o'qish. Pozitsiya taxminan 120 bayt, demak kuniga 0.8 GB, 90 kunga taxminan 75 GB.\n\nNatija: o'qish yozishdan taxminan 40 baravar ko'p va har o'qishga hisoblangan kelish vaqti kerak. Agar bitta server uni har o'qishda bazadan hisoblasa, cho'qqida u bo'g'iladi.",
      watch: "Taxmin bir necha baravar aniqlikda to'g'ri bo'lsa yetadi. Uning vazifasi — qaysi qism og'irligini ko'rsatish.",
      check: {
        q: "O'qish yozishdan 40 baravar ko'p, har o'qishga hisoblangan kelish vaqti kerak. Yukni nima oladi?",
        options: [
          "Har o'qish uchun kattaroq baza",
          "Kelish vaqtini pozitsiya bo'yicha hisoblab, keshdan o'qish",
          "Avtobuslar pozitsiyani kamroq yuborishi",
        ],
        answer: 1,
        why: "Worker'lar kelish vaqtini har pozitsiyaga bir marta hisoblab keshga yozadi, API faqat tayyor javobni o'qiydi. Javob p95 900 ms dan 45 ms ga tushadi.",
      },
    },
    hld: {
      short: "High-level",
      title: "High-level dizayn: ikki yo'l",
      body: "Rasmda endi ikkita alohida yo'l bor. Yozish yo'li: avtobuslar pozitsiyani kichik qabul servisiga yuboradi, u esa ularni oqimga qo'yadi. Worker'lar oqimni o'qiydi, har bekat uchun kelish vaqtini hisoblaydi va keshga yozadi; tarix bazaga ketadi.\n\nO'qish yo'li: API faqat keshdan tayyor javobni o'qiydi. Og'ir ish har yo'lovchiga emas, har pozitsiyaga bir marta bajariladi va har yo'l o'zicha kengayadi.",
      fields: {
        topic: "Barcha avtobus pozitsiyalari oqimi.",
        key: "Avtobus ID'si. Bitta avtobusning hamma pozitsiyasi bitta partition'ga tushadi va tartibi saqlanadi.",
        partition: "Oqimning 12 bo'lagidan biri. Worker'lar partition'larni o'zaro bo'lishadi.",
      },
    },
    lag: {
      short: "Orqada qolish",
      title: "Worker ortda qolmoqda",
      body: "Tig'iz soatda bitta worker har pozitsiya uchun kelish vaqtini hisoblaydi. Har biri taxminan 15 ms oladi: bitta worker soniyasiga ~66 tasini ulguradi, kelayotgani esa 80 ta.\n\nNavbat 40 soniyaga o'sadi. Yo'lovchilar javobni tez oladi, lekin javob 40 soniyalik: 30 soniyalik talab buzilgan, hamma server esa sog'lom ko'rinadi.",
      check: {
        q: "Bitta worker soniyasiga 66 pozitsiya ulguradi, kelayotgani esa 80. Kelish vaqti yoshini 30 soniyadan pastga nima qaytaradi?",
        options: [
          "API oldida kattaroq kesh",
          "Oqimni bitta partitsiyaga birlashtirish",
          "12 partitsiyani bo'lishib olgan to'rtta worker",
        ],
        answer: 2,
        why: "To'rtta instans 12 partitsiyani bo'lishib oladi, har avtobus baribir bitta worker'ga boradi, tartib saqlanadi. Navbat yo'qoladi, kelish vaqti yoshi 40 soniyadan taxminan 11 soniyaga tushadi.",
      },
      fields: {
        consumers: "12 partition'ga bitta worker: o'n bittasi kutib turibdi.",
        lag: "Qabul qilingan, lekin hali ishlanmagan pozitsiyalar. Yo'lovchi ko'radigan yangilik aynan shu.",
        "eta calc": "Bitta pozitsiyaning narxi. Bir marta tez, soniyasiga 80 marta esa juda sekin.",
      },
    },
    scale: {
      short: "Kengaytirish",
      title: "Ko'proq worker, har biriga partition'lar",
      body: "Worker guruhi to'rtta nusxaga o'sadi, 12 partition ular orasida bo'linadi. Har avtobus baribir bitta worker'ga tushadi, shuning uchun pozitsiyalari tartibda qoladi.\n\nNavbat yo'qoladi, kelish vaqti taxminan 11 soniyalik. Partition'lar soni parallel worker'larning yuqori chegarasi, shuning uchun u bugungi ehtiyojdan ko'p qilib qo'yilgan.",
    },
    "lld-api": {
      short: "API",
      title: "Low-level dizayn: kelish API'si",
      body: "Endi bitta komponent batafsil. Endpoint yo'lda versiya oladi, vaqt daqiqa emas soniyada keladi va ma'lumot qachon hisoblangani qo'shiladi.\n\nJavobni 10 soniya keshlash mumkin. Shu `ETag` bilan qayta so'rov bo'sh `304` oladi. Yo'lovchilarning ko'p yangilashi endi deyarli tekin. Bu yerda ma'lumot o'zgargan, shuning uchun yangi ETag va to'liq 200 qaytadi.",
      fields: {
        v1: "Yo'ldagi versiya. Javobdagi keyingi o'zgarish eski ilovalarni buzmasdan `v2` bo'lib chiqishi mumkin.",
        "If-None-Match": "Ilovada allaqachon bor javobning tegi. Hech narsa o'zgarmagan bo'lsa, server tanani yubormaydi.",
        "Cache-Control": "Ilova va har qanday proxy bu javobni 10 soniya qayta ishlatishi mumkin.",
        updated_at: "Kelish vaqti qachon hisoblangan. Yo'lovchi uning qanchalik yangiligini ko'radi.",
        eta_s: "Daqiqa emas, soniya: ilova o'zi yaxlitlaydi va teskari sanay oladi.",
      },
    },
    "lld-cache": {
      short: "Kesh tuzilishi",
      title: "Low-level dizayn: har bekatga bitta kalit",
      body: "Keshda har bekatga bitta hash: yo'nalish va kelishgacha soniyalar, ustiga hisoblangan vaqt. API bitta kalitni bir marta o'qib javob beradi.\n\nHar kalit oxirgi yangilanishdan 90 soniya o'tib o'chadi. Worker to'xtab qolsa, eski kelish vaqtlari yo'lovchilarni abadiy aldamaydi, yo'qoladi.",
      fields: {
        HSET: "Bitta hash'ning bir nechta maydonini bitta buyruqda yozadi.",
        "arrivals:s_204": "Kalit — bekat: aynan o'qish tomoni so'raydigan narsa.",
        EXPIRE: "90 soniya umr. Eskirgan ma'lumot o'zini o'zi o'chiradi.",
      },
    },
    "lld-history": {
      short: "Sxema",
      title: "Low-level dizayn: tarix jadvali",
      body: "Tarix faqat qo'shiladi: har pozitsiyaga bitta qator, hech qachon yangilanmaydi. Kalit — avtobus va vaqt, shuning uchun takroriy xabar ikkinchi qator yarata olmaydi.\n\nJadval kuniga bitta partition'ga bo'lingan. 90 kunlik ma'lumotni o'chirish — katta `DELETE` emas, bitta partition'ni tashlab yuborish.",
      check: {
        q: "Kesh yiqildi. Taxta javob berishda davom etishi kerak. API nima qilishi kerak?",
        options: [
          "Bazadan javob berib, uni eskirgan deb belgilash",
          "Kesh qaytguncha xato qaytarish",
          "Har so'rovni kesh qaytguncha ushlab turish",
        ],
        answer: 0,
        why: "Talab mavjudlik, shuning uchun API bazadagi oxirgi pozitsiyalarga tushadi va javobni `stale` deb belgilaydi. Narxi: p95 180 ms ga chiqadi, kelish vaqti bir daqiqalik.",
      },
      fields: {
        "PRIMARY KEY": "Avtobus va vaqt: ikki marta yuborilgan pozitsiya bir marta saqlanadi.",
        "PARTITION BY": "Tashqaridan bitta jadval, ichida har kunga alohida bo'lak.",
        "90 days": "Boshidagi talab, endi sxemaga yozilgan.",
      },
    },
    tradeoff: {
      short: "Trade-off",
      title: "Trade-off: eskiroq, lekin mavjud",
      body: "Kesh yiqiladi. API xato qaytarishi yoki bazadagi oxirgi pozitsiyalarga tushib, taxminiy javob hisoblashi mumkin. Dizayn ikkinchisini tanlaydi va javobni eskirgan deb belgilaydi.\n\nBu yozilgan trade-off: yangilikdan ko'ra mavjudlik, chunki talab taxta javob berishda davom etadi deydi. Narxi — kesh yo'qligida sekinroq javob va bazaga ko'proq yuk.",
      watch: "Har trade-off'ni uni hal qilgan talab bilan birga yozing. Kelasi yil kimdir nega deb so'raydi.",
      fields: {
        updated_at: "Bir daqiqalik. Ilova vaqtni kelish vaqti yonida ko'rsatadi.",
        stale: "API javob eski ekanini tan oladi. Ilova uni yashirmay, kulrang ko'rsatadi.",
      },
    },
    recap: {
      short: "Xulosa",
      title: "Xulosa",
      body: "Dizayn — har biri raqamga bog'langan qarorlar zanjiri.\n\n1) Avval funksional va nofunksional talablarni yozing: dizaynni ikkinchisi hal qiladi. 2) Og'ir qismni topish uchun o'qish, yozish va hajmni taxmin qiling. 3) High-level: qutilar va strelkalar, har xil yukka alohida yo'l. 4) Low-level bir vaqtda bitta komponent uchun: API, ma'lumot joylashuvi, sxema. 5) Har trade-off'ni va uning ortidagi talabni yozib qo'ying.",
    },
  },
};

export default text;
