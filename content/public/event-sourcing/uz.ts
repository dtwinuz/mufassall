import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Event sourcing",
  summary:
    "Onlayn do'kon har buyurtmaga bitta qator saqlaydi va uni joyida yangilaydi. Nizolarga javob berib bo'lmaydi, bir vaqtdagi ikki tahrir esa bir-birini jimgina ustidan yozadi. Event sourcing har o'zgarishni versiyali stream'dagi o'zgarmas hodisa (event) sifatida saqlaydi, holat va read model'larni hodisalardan quradi, keyin esa uzun stream'lar, eski hodisa formatlari, o'qish kechikishi va unutilish huquqi bilan ishlashga to'g'ri keladi.",
  learn: [
    "Nega joyida yangilanadigan qator tarixni yo'qotadi va versiyali, faqat qo'shiladigan stream uni qanday saqlaydi",
    "`expected_version` bilan optimistic concurrency va yozuvchiga nima o'zgarganini aytadigan 409",
    "Checkpoint'li projection'lar, qayta qurish, uzun stream'lar uchun snapshot va eski hodisalarni upcast qilish",
    "UI'dagi CQRS o'qish kechikishi va o'zgarmas hodisalarda GDPR o'chirish: crypto-shredding",
  ],
  nodes: {
    app: "Do'kon ilovasi",
    support: "Support xodimi",
    api: "Buyurtma servisi",
    orders: "Buyurtmalar jadvali",
    store: "Event store",
    projector: "Projector",
    views: "Read model",
    vault: "Kalit ombori",
  },
  metrics: {
    unknown: "Javobsiz nizolar",
    overwritten: "Ustidan yozilgan tahrir",
    lag: "Read model kechikishi",
    "load-ms": "Bitta stream'ni yuklash",
  },
  steps: {
    table: {
      short: "Jadval",
      title: "Buyurtma doim o'zgarib turadigan qator",
      body: "Buyurtma servisi har buyurtmaga bitta qator saqlaydi. Joylash, to'lash, manzilni o'zgartirish, jo'natish: har biri o'sha qatorning `UPDATE` i. Unga mijoz ilovasi ham, support xodimlari ham yozadi.\n\nQator doim hozirgi holatni ko'rsatadi. O'tmishni ko'rsata olmaydi: kim, nimani, qachon va qaysi qiymatdan o'zgartirgan.",
      fields: {
        SET: "Yangi qiymat eskisining o'rnini egallaydi. Eskisi yo'qoladi.",
        status: "Bitta ustun buyurtmaning butun hayotini saqlaydi, faqat oxirgi holatini.",
        updated_at: "Oxirgi marta qachon o'zgargani, nima o'zgargani emas.",
        "UPDATE 1": "Bajarildi. Bundan oldingi manzilni hech narsa eslamaydi.",
      },
    },
    lost: {
      short: "Yo'qolish",
      title: "Support mijozning tahririni ustidan yozadi, hech kim bilmaydi",
      body: "10:02 da mijoz ilovada yetkazish manzilini o'zgartiradi. Bir soniyadan keyin support xodimi 09:58 da ochilgan, eski manzilli formani saqlaydi. Posilka eski manzilga ketadi.\n\nMijoz \"10:02 da o'zgartirganman\" deydi. Qator faqat `9 Oak Ave` deydi. Kuniga 23 ga yaqin nizo \"biz buni ko'rmayapmiz\" bilan tugaydi, kuniga 9 ga yaqin tahrir jimgina ustidan yoziladi.",
      watch: "Log tarix emas: u tanlab yoziladi, aylanib o'chadi va ma'lumot bilan bitta tranzaksiyada yozilmaydi.",
      check: {
        q: "Har o'zgarishni nima saqlaydi va eskirgan yozuvni ko'rinadigan qiladi?",
        options: [
          "Har yangilashdan keyin trigger to'ldiradigan `order_history` jadvali",
          "Har o'zgarishni buyurtma bo'yicha versiyali hodisa sifatida saqlash; holat hodisalardan hisoblanadi",
          "Support formasi ochiq turganda buyurtmani qulflash",
        ],
        answer: 1,
        why: "Trigger jadvali ustidan yozish natijasini qayd etadi, lekin uni to'xtatmaydi. Versiyali hodisalarda o'zgarishning o'zi yozuvga aylanadi, 5-versiyani o'qigan yozuvchi esa 6-versiyadan keyin sezdirmasdan qo'sha olmaydi. Ochiq forma ushlab turgan qulf mijozni daqiqalab to'sadi.",
      },
      fields: {
        app: "Mijozning o'zgarishi, to'g'ri va eng yangi.",
        support: "Xodimning saqlashi, to'rt daqiqa oldin ko'rganiga asoslangan.",
        "09:58": "Forma yuklangan vaqt. Uning ma'lumoti 10:02 da allaqachon eski edi.",
        "nothing else": "Bitta ustun, bitta qiymat. Kim ham, qachon ham, oldin nima bo'lgani ham yo'q.",
      },
    },
    store: {
      short: "Hodisalar",
      title: "Hodisani qo'sh, hech qachon yangilama",
      body: "Har o'zgarish **hodisa** (event) bo'ladi: `OrderPlaced`, `ItemAdded`, `AddressChanged`, `OrderShipped`. Bitta buyurtmaning hodisalari 1, 2, 3 deb raqamlangan **stream** ni tashkil qiladi. Jadvalga faqat qo'shiladi.\n\nJoriy buyurtma uning hodisalarini tartib bilan qo'llab (fold) hisoblanadi. Nizo endi oddiy so'rov: stream ikkala manzil o'zgarishini, kim va qachon qilganini ko'rsatadi.",
      watch: "Hodisalarni o'tgan zamonda, biznes fakti sifatida nomlang. `UpdateOrder` emas, `AddressChanged`.",
      fields: {
        stream_id: "Har buyurtmaga bitta stream: `ord_77` ning hamma hodisalari, tartib bilan.",
        version: "Stream'dagi o'rni. 5 degani bundan oldin to'rtta hodisa bo'lgan.",
        type: "Nima bo'lgani, biznes tilida.",
        UNIQUE: "Bitta stream'da ikki hodisa hech qachon bir o'rinni egallay olmaydi.",
        fold: "Holat = bo'sh buyurtmaga har hodisani tartib bilan qo'llash.",
        "INSERT 0 1": "Bitta yangi fakt. Eski hech narsaga tegilmadi.",
      },
    },
    conflict: {
      short: "To'qnashuv",
      title: "Kutilgan versiya: eskirgan yozuv rad etiladi",
      body: "Har qo'shish yozuvchi oxirgi marta qaysi versiyani ko'rganini aytadi. Support formasi 5-versiyani yuklagan; oraliqda mijoz 6-versiyani qo'shgan. Store qo'shishni `409` bilan rad etadi va o'shandan beri nima bo'lganini aytadi.\n\nForma qayta yuklanadi, xodimga mijozning yangi manzilini ko'rsatadi va yana so'raydi. Hech bir tahrir jimgina yo'qolmaydi: yo yozuvchi ko'rgan holat ustiga qo'llanadi, yo yozuvchi bundan xabar topadi.",
      check: {
        q: "Mijoz \"To'lash\" ni ikki marta bosadi. Ikkala so'rovda ham `expected_version: 7`. Nima bo'ladi?",
        options: [
          "Ikkalasi ham qo'shiladi, buyurtma ikki marta to'lanadi",
          "Birinchisi 8-versiya bo'lib qo'shiladi, ikkinchisi 409 oladi va buyurtma allaqachon to'langanini ko'radi",
          "Ikkalasi ham 409 oladi",
        ],
        answer: 1,
        why: "8-o'rinni faqat bitta hodisa egallay oladi, shuning uchun store ikkalasidan aynan bittasini qabul qiladi. Ikkinchisi stream oldinga ketganini va buyurtma to'langanini ko'radi, qayta to'lamasdan muvaffaqiyat javobini bera oladi.",
      },
      fields: {
        expected_version: "\"Men 5-versiyaga qarab qaror qildim.\" Optimistic: forma ochiq turganda qulf yo'q.",
        events: "Bir yoki bir nechta hodisa, hammasi birga qo'shiladi yoki hech biri.",
        "409 Conflict": "Stream allaqachon yangiroq versiyada.",
        current_version: "Stream hozir haqiqatan qayerda.",
        since: "Yozuvchi nimani o'tkazib yuborgani, UI quruq xato o'rniga shuni ko'rsata olsin.",
      },
    },
    projection: {
      short: "Projection",
      title: "Read model'lar hodisalardan quriladi",
      body: "Stream'ni fold qilish bitta buyurtma uchun yaxshi, \"shu shahardagi hamma ochiq buyurtmalar\" uchun emas. **Projector** store'dan yangi hodisalarni o'qib, **read model** ni yangilaydi: ekranlarga moslangan oddiy jadval. Yozuv store'ga, o'qish read model'ga boradi; bu bo'linish **CQRS** deyiladi.\n\nProjector checkpoint'ini yangilash bilan bitta tranzaksiyada saqlaydi, shuning uchun yiqilgandan keyin aynan to'xtagan joyidan davom etadi. Yangi ekran yangi read model oladi, u hamma hodisalarni boshidan qayta o'ynab quriladi.",
      watch: "Read model'ni istalgan payt o'chirib, qayta qurish mumkin. Hodisalarni hech qachon.",
      fields: {
        checkpoint: "Oxirgi qo'llangan hodisa o'rni. Projector'ning xatcho'pi.",
        apply: "Har hodisa read model'ni yangilaydi. Bu yerda `UPDATE` mumkin: bu jadval tashlab yuboriladigan.",
        "same transaction": "Yangilash va checkpoint birga commit bo'ladi: hech bir hodisa ikki marta qo'llanmaydi, birontasi tushib qolmaydi.",
        lag: "Read model store'dan qancha orqada. Odatda bir necha yuz millisekund.",
      },
    },
    long: {
      short: "Uzun stream",
      title: "120 000 hodisali stream",
      body: "Ulgurji xaridorlarning account stream'i bor: 2021 dan beri har buyurtma qatori, to'lov va kredit o'zgarishi. Bitta yangi buyurtmani qabul qilish uchun servis `account-b_12` ning hamma 120 037 hodisasini yuklab, fold qiladi. Bu har buyurtmada 2.6 soniya oladi.\n\nStore joyida, servis esa yo'q: deyarli o'zgarmagan holatni bilish uchun bir xil tarixni qayta-qayta o'qiydi.",
      check: {
        q: "Servis bu account'ni qanday tezroq yuklasin?",
        options: [
          "Bir yildan eski hodisalarni o'chirish",
          "Har bir necha yuz hodisada fold qilingan holatni saqlash va faqat undan keyingi hodisalarni yuklash",
          "Account holatini read model'dan o'qish",
        ],
        answer: 1,
        why: "Hodisalarni o'chirish dizaynning butun mazmuni bo'lgan tarixni buzadi. Read model kechikadi, unga qarab qaror qilish xavfli. Snapshot o'sha fold'ning saqlangan natijasi: uni yukla, keyingi bir nechta hodisani qo'lla, tamom.",
      },
      fields: {
        "account-b_12": "Bitta ulgurji xaridorning stream'i.",
        "ORDER BY": "Hodisalar stream tartibida qo'llanishi shart.",
        "120037 rows": "Besh yillik faoliyat har yangi buyurtmada o'qiladi.",
        fold: "O'qish ustiga yana CPU qismi.",
      },
    },
    snapshot: {
      short: "Snapshot",
      title: "Snapshot: saqlangan holatdan boshlash",
      body: "Har 500 hodisada servis **snapshot** saqlaydi: stream'ning ma'lum versiyadagi fold qilingan holati. Endi yuklash = oxirgi snapshot va undan keyingi hodisalar: 120 037 o'rniga 37 qator. 2.6 s o'rniga 30 ms.\n\nSnapshot haqiqat manbai emas, kesh. U holat shaklining versiyasini olib yuradi, shakl o'zgarganda eski snapshot'lar tashlanadi va hodisalardan qayta quriladi.",
      watch: "Ko'pchilik stream'lar qisqa. Faqat o'lchovda kerakligi ko'ringan stream'larga snapshot qiling.",
      fields: {
        version: "Bu holat qaysi stream o'rnigacha bo'lganini o'z ichiga oladi.",
        schema: "Snapshot formati versiyasi. 4-schema'li kod buni e'tiborsiz qoldiradi va qayta fold qiladi.",
        state: "Fold natijasi, aynan fold hisoblaydigan narsa.",
        "37 rows": "Faqat snapshot'dan yangi hodisalar o'qiladi.",
      },
    },
    schema: {
      short: "Eski hodisa",
      title: "Yangi kod 2024 yilgi hodisaga duch keladi",
      body: "Jamoa manzilni ko'cha, shahar va indeksga ajratadi. Yangi `AddressChanged` hodisalari yangi shaklda. Yangi projector qayta qurish uchun boshidan o'ynaydi va 2024 yil martidagi faqat `to` maydoni bor hodisaga uriladi. U besh marta yiqiladi va to'xtaydi.\n\nRead model qotib qoladi: kechikish 95 soniyaga, keyin daqiqalarga o'sadi. Hodisalar o'zgarmas, demak eski shakl store'da abadiy qoladi.",
      fields: {
        AddressChanged: "O'sha hodisa turi, ikki yil oldin birinchi formatda yozilgan.",
        "data.street": "Yangi kod yangi shaklni kutadi.",
        stopped: "Hodisani qo'llay olmagan projector uni o'tkazib ham yubora olmaydi, aks holda read model noto'g'ri bo'ladi.",
        checkpoint: "Qotdi: 88113 dan keyingi hech narsa read model'ga yetmaydi.",
      },
    },
    upcast: {
      short: "Upcast",
      title: "Upcasting: eski hodisa o'qishda o'giriladi",
      body: "Har hodisa sxema versiyasini olib yuradi. **Upcaster** kichik sof funksiya: hodisa o'qilayotganda 1-versiyani 2-versiyaga aylantiradi. Saqlangan hodisa o'zgarmaydi; projector ham, servis ham faqat eng yangi shaklni ko'radi.\n\nProjector qayta ishga tushadi, to'liq tezlikda yetib oladi va kechikish bir soniyadan pastga tushadi. Standart qiymatli maydon qo'shishga upcaster kerak emas; maydonni qayta nomlash yoki bo'lish uchun kerak.",
      watch: "Saqlangan hodisalarni \"migratsiya\" uchun joyida tahrirlamang. Ma'nosi o'zgarsa, yangi hodisa turini yozing.",
      fields: {
        type: "Tur o'sha: bu o'sha biznes fakti.",
        version: "Shu hodisaning sxema versiyasi. 1 = eski kod yozgan.",
        data: "Eski shakl kiradi, yangi shakl chiqadi.",
        zip: "2024 da noma'lum edi. Upcaster taxmin qilmaydi, `null` deydi.",
      },
    },
    readlag: {
      short: "Kechikish",
      title: "Foydalanuvchi saqlaydi va eski qiymatni ko'radi",
      body: "Mijoz manzilni o'zgartiradi, ilova buyurtma sahifasini ochadi. Sahifa 340 ms orqada turgan read model'dan o'qiydi: unda hali eski manzil. Mijoz saqlash o'tmadi deb o'ylaydi va yana qiladi.\n\nQo'shish yangi versiyani, 7 ni qaytaradi. Ilova uni `min_version` sifatida yuboradi; o'qish tomoni projection unga yetguncha bir soniyagacha kutadi, yoki ilova shunchaki o'zi saqlagan narsani ko'rsatadi. Bu faqat yozuvchiga kerak: boshqa foydalanuvchilar o'zgarishni bir lahzadan keyin ko'rsa bo'ladi.",
      watch: "Kechikishni har ekrandan event store'ni o'qib tuzatmang. Bu CQRS'ni bekor qiladi.",
      check: {
        q: "Bir soniyadan keyin ham read model orqada. API nima javob bersin?",
        options: [
          "Eski ma'lumot bilan 200, hech narsa demasdan",
          "\"Hali yangilanmoqda\" va versiya bilan 202, ilova o'zi saqlagan qiymatni ko'rsatsin yoki qayta so'rasin",
          "500 Internal Server Error",
        ],
        answer: 1,
        why: "Joriy deb ko'rsatilgan eski ma'lumot aynan shu bug. Aniq \"hali emas\" ilovaga foydalanuvchi saqlaganini ko'rsatib turishga imkon beradi. Bu xato emas, shuning uchun 500 emas.",
      },
      fields: {
        min_version: "\"Men hozirgina 7-versiyani yozdim, menga undan eskisini ko'rsatma.\"",
        "X-Read-Model-Version": "Javob qaysi versiyadan qurilgan.",
        version: "Ilova so'raganiga mos: o'qish yozuv bilan izchil.",
        address: "Yangi manzil. Mijoz saqlashga ishonadi.",
      },
    },
    shred: {
      short: "O'chirish",
      title: "Hodisalarni tahrirlamasdan mijozni unutish",
      body: "Mijoz o'z ma'lumotlarini o'chirishni so'raydi. Hodisalarni stream'larni buzmasdan o'chirib bo'lmaydi, ular zaxira va replikalarda ham yashaydi. Shuning uchun shaxsiy maydonlar boshidanoq har mijozga alohida kalit bilan shifrlangan, kalit esa kalit omborida. O'chirish o'sha kalitni yo'q qiladi.\n\n318 ta hodisa qoladi, buyurtma summalari va tarix baribir to'g'ri chiqadi, lekin ism, manzil va telefon hamma joyda, zaxiralarda ham, o'qib bo'lmaydigan shovqin. Bu **crypto-shredding**. Read model'lar qayta o'ynaganda yoki `CustomerErased` hodisasini olganda o'z nusxalarini o'chiradi.",
      watch: "Shaxsiy ma'lumotni hodisa turi va id'lariga qo'ymang: stream id'da email emas, `c_501`.",
      fields: {
        subject: "Kaliti yo'q qilinayotgan mijoz.",
        keys_destroyed: "Joriy va almashtirilgan eski kalit. Ularsiz shifrlangan matn shunchaki shovqin.",
        events_affected: "Hali mavjud hodisalar, lekin ularning shaxsiy maydonlarini endi hech qachon o'qib bo'lmaydi.",
      },
    },
    recap: {
      short: "Xulosa",
      title: "Xulosa",
      body: "Event sourcing uchun olti qoida.\n\n1) O'zgarishlarni versiyali stream'larda o'tgan zamondagi o'zgarmas hodisalar sifatida saqlang; holat fold natijasi. 2) `expected_version` bilan qo'shing; 409 yozuvchiga nimani o'tkazib yuborganini aytadi. 3) Read model'lar checkpoint'i bitta tranzaksiyada saqlanadigan, tashlab yuboriladigan projection'lar; ularni qayta o'ynab quring. 4) Faqat uzun stream'larga snapshot qiling va snapshot'ni kesh deb biling. 5) Hodisalar abadiy: ularni versiyalang va eskilarini o'qishda upcast qiling. 6) UI'da o'qish kechikishini rejalang, shaxsiy ma'lumotni har subyektga alohida shifrlang, shunda o'chirish kalitni o'chirishga aylanadi.",
    },
  },
};

export default text;
