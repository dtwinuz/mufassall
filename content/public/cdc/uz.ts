import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "O'zgarishlarni ushlash (CDC)",
  summary:
    "Internet-do'kon buyurtmalarni SQL bazada saqlaydi va har o'zgarishni qidiruv indeksi va ma'lumotlar omboriga ko'chirishi kerak. Bitta koddan bazaga ham, hodisalar jurnaliga ham yozish hodisalarni yo'qotadi. Bazaning o'z o'zgarishlar jurnalini o'qish esa yo'qotmaydi, agar tartib, qayta ishga tushish, birinchi snapshot va sxema o'zgarishlari o'ylab qo'yilsa.",
  learn: [
    "Nega bazaga va hodisalar jurnaliga qo'sh yozuv ajralib ketadi",
    "CDC konnektor WAL yoki binlog'ni qanday o'qiydi va o'zgarish hodisasi qanday ko'rinadi",
    "Birlamchi kalit bo'yicha tartib, saqlangan offset va qayta ishga tushgandan keyingi takrorlar",
    "Boshlang'ich snapshot va oqim, replikatsiya sloti egallagan disk, sxema o'zgarishi va outbox",
  ],
  nodes: {
    client: "Do'kon ilovasi",
    api: "Buyurtmalar API",
    db: "Buyurtmalar bazasi",
    topic: "Hodisalar jurnali",
    search: "Qidiruv indeksi",
    connector: "CDC konnektor",
    warehouse: "Ma'lumotlar ombori",
  },
  metrics: {
    missing: "Qidiruvda yo'q buyurtma",
    stale: "Qidiruv orqada qolishi",
    wal: "Ushlab turilgan WAL",
    dups: "Takror hodisalar",
  },
  steps: {
    "dual-write": {
      short: "Qo'sh yozuv",
      title: "API ikki marta yozadi: bazaga va hodisalar jurnaliga",
      body: "Buyurtma to'langanda Buyurtmalar API bazadagi qatorni yangilaydi, keyin qidiruv indeksi yangi holatni ko'rsatishi uchun hodisa e'lon qiladi.\n\nIkki xil tizimga ketma-ket ikki yozuv, ikkalasini o'raydigan tranzaksiya yo'q. Oddiy kunda hammasi joyida ko'rinadi.",
      fields: {
        key: "Buyurtma id'si. Bitta buyurtmaning barcha hodisalari bitta partitsiyaga tushadi.",
        status: "Qidiruv ko'rsatishi kerak bo'lgan yangi holat.",
        offset: "Hodisaning jurnaldagi o'rni. Endi u brokerda.",
      },
    },
    "lost-event": {
      short: "Yo'qolish",
      title: "Commit o'tdi, e'lon o'tmadi",
      body: "Baza `paid` ni saqlaydi. Keyin hodisalar jurnaliga e'lon timeout bo'ladi, bir lahzadan so'ng deploy API pod'ini qayta ishga tushiradi. Hodisa butunlay yo'qoldi.\n\nBaza va qidiruv endi har xil gapiradi va buni hech narsa tuzatmaydi: xaridor to'langan buyurtmani qidiruvda `pending` deb ko'radi. Bir kunda bu 340 marta bo'ladi.",
      watch: "Umumiy tranzaksiyasiz ikki yozuv orasida doim tirqish bor. Shu tirqishda yiqilish tizimlarni ajratib yuboradi.",
      check: {
        q: "API avval hodisani e'lon qilib, keyin qatorni commit qilsa-chi?",
        options: [
          "Tuzaladi: hodisa commit'dan oldin saqlangan bo'ladi",
          "Baribir buzuq: commit yiqilsa, to'lanmagan buyurtma haqida hodisa qoladi",
          "Brokerda uchta replika bo'lsa, tuzaladi",
        ],
        answer: 1,
        why: "Tartibni almashtirish faqat nosozlikni almashtiradi. Endi bekor bo'lgan yoki yiqilgan tranzaksiya bo'lmagan o'zgarish haqida hodisa qoldiradi. Bitta tranzaksiyasiz ikki yozuvning xavfsiz tartibi yo'q.",
      },
      fields: {
        COMMIT: "Qator diskka mustahkam yozildi. Shu paytdan baza `paid` deydi.",
        timeout: "Broker o'z vaqtida javob bermadi. API hodisa yetib bordimi, bilmaydi.",
        restarted: "Hodisaning yagona nusxasi bor jarayon yo'qoldi.",
      },
    },
    log: {
      short: "Jurnalni o'qish",
      title: "Bazaning o'z o'zgarishlar jurnalini o'qiymiz",
      body: "Baza har commit qilingan o'zgarishni hamma narsadan oldin o'z jurnaliga yozadi: PostgreSQL'da WAL, MySQL'da binlog. CDC konnektor shu jurnalga obuna bo'ladi va har o'zgarishni hodisaga aylantiradi.\n\nAPI endi faqat bazaga yozadi. O'zgarish commit qilingan bo'lsa, u jurnalda; jurnalda bo'lsa, konnektor uni e'lon qiladi. Yo'qotiladigan ikkinchi yozuv endi yo'q.",
      watch: "Haqiqatning yagona manbai: baza. Qolgan hamma narsa uning jurnalidan, commit tartibida olinadi.",
      fields: {
        SLOT: "Replikatsiya sloti: baza bu konnektor qayergacha o'qiganini eslab qoladi.",
        LOGICAL: "Mantiqiy dekodlash: qator va ustunlar, diskning xom sahifalari emas.",
        lsn: "Log sequence number: o'zgarishning jurnaldagi o'rni. Faqat o'sadi.",
      },
    },
    event: {
      short: "Hodisa",
      title: "O'zgarish hodisasi nimani olib yuradi",
      body: "Har hodisa qaysi qator o'zgarganini, qanday (`c` yaratish, `u` yangilash, `d` o'chirish), qatorning oldingi va keyingi ko'rinishini va o'zgarish jurnalning qayerida turganini aytadi.\n\nIste'molchilar bazaga qaytib so'rov yubormaydi. Kerakli hamma narsa hodisada, jurnaldagi o'rin esa yangini eskidan ajratishga yordam beradi.",
      fields: {
        key: "Qatorning birlamchi kaliti. Broker partitsiyani shu bo'yicha tanlaydi.",
        op: "`u`: yangilash. Qolganlari `c`, `d` va `r` (snapshot o'qish).",
        before: "O'zgarishdan oldingi qator. Nima o'zgarganini ko'rish mumkin.",
        after: "O'zgarishdan keyingi qator: iste'molchilar shuni qo'llaydi.",
        lsn: "Baza jurnalidagi o'rin. Iste'molchi oxirgi qo'llaganini saqlaydi.",
      },
    },
    ordering: {
      short: "Tartib",
      title: "Bitta buyurtmaning ikki o'zgarishi noto'g'ri tartibda keladi",
      body: "Konnektor hodisalarni partitsiyalarga navbatma-navbat tarqatadi, qidiruv iste'molchisi esa partitsiyalarni parallel o'qiydi. 5521 buyurtma ikki marta o'zgardi: `pending`, keyin `paid`.\n\nIkki hodisa har xil partitsiyaga tushdi va eskisi oxirida qo'llandi. Bazada `paid` bo'lsa ham, qidiruv yana `pending` ko'rsatadi.",
      check: {
        q: "Bitta buyurtma o'zgarishlarining tartibini nima saqlaydi?",
        options: [
          "Birlamchi kalit bo'yicha partitsiyalash: buyurtma doim bitta partitsiyaga boradi",
          "Ko'proq partitsiya qo'shish, har biri kamroq band bo'lsin",
          "Iste'molchi qo'llashdan oldin bir soniya kutsin",
        ],
        answer: 0,
        why: "Jurnal tartibni faqat bitta partitsiya ichida saqlaydi. Kalit buyurtma id'si bo'lsa, uning barcha o'zgarishlari commit tartibida bitta partitsiyaga boradi. Iste'molchi esa qo'shimcha ravishda allaqachon bor versiyadan eski hodisani tashlab ketadi.",
      },
      fields: {
        "round-robin": "Hodisalar teng tarqaladi, lekin bitta qator o'zgarishlari sochilib ketadi.",
        p3: "Yangi o'zgarish, birinchi qo'llandi.",
        p7: "Eski o'zgarish, keyin qo'llandi va yangisini ustidan yozdi.",
      },
    },
    keyed: {
      short: "Id bo'yicha kalit",
      title: "Birlamchi kalit bo'yicha partitsiya, eski versiyalarni tashlash",
      body: "Konnektor endi birlamchi kalitni xabar kaliti qilib oladi. 5521 buyurtmaning barcha o'zgarishlari bitta partitsiyaga boradi va jurnal tartibida o'qiladi.\n\nIste'molchi har hujjat uchun oxirgi `lsn` ni saqlaydi va undan eskisini tashlaydi. Eskirgan hodisa boshqa yo'l bilan kelsa ham, yangi holatni ustidan yoza olmaydi.",
      watch: "Tartib kalit ichida kafolatlanadi, butun topic bo'ylab emas. Iste'molchilarni shunga moslab loyihalang.",
      fields: {
        "primary key": "Xabar kaliti. Bir xil qator, bir xil kalit, bir xil partitsiya.",
        partition: "Kalit hash'i bo'yicha tanlanadi. Tartib bitta partitsiya ichida saqlanadi.",
        skip: "Iste'molchi himoyasi: hujjatdan eski hodisa e'tiborsiz qoldiriladi.",
      },
    },
    crash: {
      short: "Qayta ishga tushish",
      title: "Konnektor qayta ishga tushadi va o'zgarishlarni yana yuboradi",
      body: "Konnektor o'z o'rnini, offset'ni, har 10 soniyada saqlaydi. U saqlashdan 8 soniya keyin yiqiladi va saqlangan offset'dan qayta boshlaydi.\n\nShu 8 soniyadagi 412 o'zgarish ikkinchi marta e'lon qilinadi. Hech narsa yo'qolmadi, lekin iste'molchilar takror oladi. `lsn` tekshiruvi tufayli ular tashlab ketiladi.",
      watch: "CDC kamida bir marta yetkazadi. Har iste'molchi idempotent bo'lishi shart: kalit va jurnaldagi o'rin bo'yicha.",
      check: {
        q: "Konnektor offset'ni e'londan keyin emas, oldin saqlasa, yiqilish nimaga olib keladi?",
        options: [
          "Hech narsa o'zgarmaydi",
          "Aynan bir marta yetkazishga",
          "Yo'qotishga: offset o'zgarishlar yuborildi deydi, aslida yuborilmagan",
        ],
        answer: 2,
        why: "Oldin saqlash belgini jurnalga yetmagan hodisalardan o'tkazib qo'yadi. Qayta ishga tushgach ular abadiy o'tkazib yuboriladi. Avval e'lon, keyin saqlash yiqilishni takrorga aylantiradi, takror bilan esa iste'molchilar uddalaydi.",
      },
      fields: {
        "stored offset": "Konnektor qayerdan davom etadi. Haqiqatda yuborganidan biroz orqada.",
        "412": "Qayta yuborilgan o'zgarishlar. Yo'qotish emas, takror.",
        skip: "Iste'molchida yangiroq versiya bor, takror hech narsa qilmaydi.",
      },
    },
    slot: {
      short: "WAL diskni to'ldiradi",
      title: "Konnektor ishlamayapti, baza diski to'lib boryapti",
      body: "Konnektor shanba kuni to'xtadi va hech kim sezmadi. Baza konnektor tasdiqlamagan har o'zgarishni saqlab turadi, toki u keyin davom eta olsin.\n\nDushanbaga kelib slot 180 GB jurnalni ushlab turibdi, disk 92% to'la. Qidiruv ikki kun orqada, asosiy baza esa yozuvlarni qabul qilishni to'xtatish arafasida.",
      watch: "Replikatsiya sloti jurnalni saqlash va'dasi. Slot orqada qolishiga alert qo'ying va slot ushlab turadigan jurnal hajmiga limit belgilang.",
      fields: {
        active: "`false`: bu slotni hech kim o'qimayapti.",
        "retained WAL": "Slotga kerak bo'lgani uchun baza o'chira olmaydigan jurnal.",
        alert: "Dushanba emas, shanba kuni ishlashi kerak bo'lgan alert.",
      },
    },
    snapshot: {
      short: "Snapshot",
      title: "Yangi iste'molchi: avval snapshot, keyin oqim",
      body: "Konnektor yana ishlayapti va ma'lumotlar ombori qo'shiladi. Unga barcha 2,1 million buyurtma kerak, hodisalar jurnali esa faqat 7 kunni saqlaydi.\n\nKonnektor izchil snapshot oladi: jurnal o'rnini belgilaydi, barcha qatorlarni bitta repeatable read tranzaksiyasida o'qiydi va ularni `op=r` sifatida yuboradi. Keyin belgilangan o'rindan o'zgarishlarni oqim qilib beradi. Ikkalasi orasidan hech bir o'zgarish tushib qolmaydi.",
      watch: "Snapshot va oqim jurnalning bitta o'rnida uchrashishi kerak, aks holda o'zgarishlar chokdan sirg'alib o'tadi.",
      fields: {
        "REPEATABLE READ": "O'qish davomida jadvalning bitta muzlatilgan ko'rinishi.",
        "op=r": "Snapshot o'qish, haqiqiy o'zgarish emas. Iste'molchilar upsert qiladi.",
        stream: "Jonli o'zgarishlar aynan snapshot olingan joydan boshlanadi.",
      },
    },
    schema: {
      short: "Sxema",
      title: "Ustun nomini o'zgartirish iste'molchini sindiradi",
      body: "Dasturchi `total` ni `total_amount` ga o'zgartiradi. Buyurtmalar API uchun bu toza refaktoring. Ombor uchun esa har yangi hodisada kutilgan maydon yo'q.\n\nTushum hisoboti nol ko'rsatadi va hech kim buni boshqa jamoadagi nom o'zgarishiga bog'lamaydi.",
      watch: "Jadval CDC'sida jadval sxemasi ochiq shartnomaga aylanadi. Uni expand and contract bilan o'zgartiring: yangi ustun qo'shing, o'quvchilarni o'tkazing, eskisini keyinroq o'chiring.",
      fields: {
        "RENAME COLUMN": "Bitta servis ichida zararsiz, har CDC iste'molchisi uchun sindiruvchi.",
        missing: "Iste'molchilar o'qiydigan maydon hodisalarda endi yo'q.",
        revenue: "Zarar uzoqda, boshqa jamoaning hisobotida chiqadi.",
      },
    },
    outbox: {
      short: "Outbox",
      title: "Outbox va CDC: jadvallarni emas, hodisalarni e'lon qilamiz",
      body: "Xom jadvallarni oqim qilish o'rniga API o'zgarish bilan bitta tranzaksiyada `outbox` jadvaliga biznes hodisasini yozadi. Konnektor faqat outbox'ni o'qiydi.\n\nHodisa jadval CDC'sidagidek ma'lumot bilan atomar, lekin uning shakli jamoa egalik qiladigan shartnoma. Jadvallarni bemalol refaktoring qilish mumkin, `OrderPaid` esa o'z ma'nosini saqlaydi.",
      watch: "Jadval CDC'si: kod yo'q, lekin ichki sxema tashqariga chiqadi. Outbox: ozgina kod, barqaror shartnoma. Ko'p jamoalar ikkalasini ishlatadi: analitika uchun jadval CDC'si, boshqa servislar uchun outbox.",
      fields: {
        outbox: "Oddiy jadval. Uning qatorlari e'lon qilinadigan hodisalar.",
        OrderPaid: "Barqaror nom va shaklga ega domen hodisasi, ustunlar nusxasi emas.",
        COMMIT: "O'zgarish va uning hodisasi birga mustahkam bo'ladi yoki ikkalasi ham bo'lmaydi.",
      },
    },
    recap: {
      short: "Xulosa",
      title: "Xulosa",
      body: "O'zgarishlarni ushlash uchun oltita qoida.\n\n1) Bazaga va hodisalar jurnaliga hech qachon ikki alohida qadam bilan yozmang. 2) Konnektor bazaning o'z jurnalini o'qisin, shunda commit qilingan o'zgarish doim e'lon qilinadi. 3) Hodisa kaliti birlamchi kalit: tartib qator uchun saqlanadi, butun topic uchun emas. 4) Yetkazish kamida bir marta; iste'molchilar takrorni jurnaldagi o'rin bo'yicha tashlaydi. 5) Replikatsiya slotini kuzating, aks holda baza diski to'ladi. 6) Izchil snapshot bilan boshlang, keyin oqim; sxemani shartnoma deb biling yoki outbox orqali e'lon qiling.",
    },
  },
};

export default text;
