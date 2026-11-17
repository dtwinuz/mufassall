import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Chat loyihasi",
  summary:
    "Alisa Bobga yozadi, xabar esa soniyaning bir qismida, to'g'ri tartibda, telefoni uxlab yotgan bo'lsa ham uning ekranida paydo bo'lishi kerak. Chatni qadamma-qadam quramiz: WebSocket gateway'lar, yo'naltirish, suhbat bo'yicha saqlash, tartib raqamlari, belgilar, push, guruhlar va onlayn holat.",
  learn: [
    "Nega chat WebSocket'ni ochiq ushlaydi va xabar kerakli gateway'ni qanday topadi",
    "Nega xabarlar foydalanuvchi bo'yicha emas, suhbat bo'yicha bo'linadi",
    "Soat o'rniga har suhbatga alohida tartib raqami",
    "Yetkazildi/o'qildi belgilari, oflayn uchun push, guruhga tarqatish va TTL bilan onlayn holat",
  ],
  nodes: {
    alice: "Alisa ilovasi",
    bob: "Bob ilovasi",
    chat: "Chat servisi",
    msgs: "Xabarlar ombori",
    "gw-a": "Gateway A",
    "gw-b": "Gateway B",
    sessions: "Sessiyalar reyestri",
    notify: "Push worker",
    push: "Push servisi",
  },
  metrics: {
    "deliver-p99": "Yetkazish p99",
    misordered: "Tartibi buzilgan xabarlar",
    missed: "1 soatdan ko'p ko'rilmagan",
  },
  steps: {
    polling: {
      short: "Polling",
      title: "Har ikki soniyada: yangi narsa bormi?",
      body: "Birinchi versiya: Bobning ilovasi har 2 soniyada serverdan yangi xabar so'raydi. 10 million ulangan foydalanuvchida bu soniyasiga 5 million so'rov, va ularning deyarli hammasi bo'sh qaytadi.\n\nXabar baribir Bob ko'rishidan oldin 2 s gacha kutadi. Server CPU'ning 90% ini \"yangi narsa yo'q\" deb javob berishga sarflaydi.",
      fields: {
        since: "Ilova oxirgi marta tekshirgan vaqt. Server undan yangisini qaytaradi.",
        messages: "Ko'pchilik so'rovdagidek bo'sh: hech narsa bo'lmaganda so'rashning narxi.",
      },
    },
    websocket: {
      short: "WebSocket",
      title: "Har qurilmaga bitta ochiq ulanish",
      body: "Har ilova **gateway**'ga WebSocket ochadi va uni ochiq ushlaydi. Endi server xabar kelishi bilan uni yubora oladi; hech kim behuda so'ramaydi. Gateway'lar faqat ulanishlarni ushlaydi, shuning uchun bitta server yuz minglab ulanishni ko'taradi.\n\nBob ulanganda gateway B sessiyalar reyestriga yozadi: \"u_bob shu yerda ulangan\". Yetkazish p99 2,1 s dan 120 ms ga tushdi.",
      watch: "Ulanishlar uzoq yashaydi, shuning uchun load balancer so'rovlarni emas, ulanishlarni taqsimlashi kerak. Deploy uchun gateway'ni bo'shatish = klientlardan boshqa joyga qayta ulanishni so'rash.",
      fields: {
        Upgrade: "Klient shu HTTP ulanishni WebSocket protokoliga o'tkazishni so'raydi.",
        Authorization: "Faqat ulanishda bir marta tekshiriladi. Keyingi har frame shu foydalanuvchiniki.",
        "101": "Switching Protocols: shundan keyin o'sha TCP ulanish ikki tomonga frame tashiydi.",
      },
    },
    route: {
      short: "Yo'naltirish",
      title: "Bobning gateway'ini topish",
      body: "Alisaning xabari gateway A ga keladi, u xabarni chat servisiga beradi. Chat servisi reyestrdan Bob qayerda ulanganini so'raydi va xabarni o'sha gateway'ga yuboradi, gateway esa uni Bobning socket'iga yozadi.\n\nBobda ikki qurilma bor, telefon va noutbuk, demak ikki ulanish, ehtimol ikki xil gateway'da. Ikkalasi ham xabarni oladi.",
      fields: {
        SMEMBERS: "Bitta foydalanuvchining barcha ochiq ulanishlari. To'plam, chunki qurilma bir nechta bo'lishi mumkin.",
        "gw-b": "Gateway B, `c_8812` ulanishi: Bobning telefoni.",
        "gw-d": "Boshqa gateway: Bobning noutbuki o'sha yerga ulangan.",
      },
    },
    storage: {
      short: "Saqlash",
      title: "Foydalanuvchi bo'yicha emas, suhbat bo'yicha saqlash",
      body: "Har xabar yetkazilishidan oldin yoziladi. Partition kaliti **suhbat**: `c_a1b2` ning barcha xabarlari bitta shard'da, ichida saralangan. Chatni ochish bitta oraliq o'qish: bitta partition'ning oxirgi 50 qatori.\n\nFoydalanuvchi bo'yicha bo'lish 1:1 chatda har xabarni ikki marta, guruhda esa 300 marta yozish degani. Suhbat bo'yicha u bir marta yoziladi, 64 ta shard esa yukni taqsimlaydi.",
      fields: {
        conv_id: "Partition kaliti. Shard'ni u hal qiladi, shuning uchun bitta chat hech qachon mashinalarga bo'linmaydi.",
        sent_at: "Hozircha xabarlar server soati bo'yicha saralanadi. Keyingi qadam buning nega muammo ekanini ko'rsatadi.",
        shard: "`c_a1b2` hash'i 12-shard'ga tushadi. Bu chatning har xabari o'sha yerga boradi.",
      },
    },
    order: {
      short: "Tartib",
      title: "Ikki tez xabar almashib keldi",
      body: "Alisa \"bugun kechki ovqat?\" va darhol \"soat 7 dami?\" deb yozadi. Ular soatlari 50 ms farq qiladigan ikki xil chat servisi nusxasiga tushadi. Ikkinchi xabar oldingi vaqt belgisini oladi.\n\nBob avval \"soat 7 dami?\" ni ko'radi. Turli mashinalar soati bo'yicha saralash bitta suhbat ichida ishonchli tartib bera olmaydi.",
      watch: "NTP bo'lsa ham server soatlari millisekundlab siljiydi. Hech qachon turli mashinada olingan vaqt bo'yicha tartiblamang.",
      fields: {
        sent_at: "Har nusxa o'z soatini qo'ydi. Ular kelishmaydi.",
        m_7f40: "Ikkinchi xabar, birinchi ko'rsatildi, chunki uning serveri soati orqada edi.",
      },
    },
    seq: {
      short: "Raqam",
      title: "Har suhbatga tartib raqami",
      body: "Suhbat egasi bo'lgan shard keyingi raqamni atomar beradi: 1042, 1043, 1044. Tartib shu raqam, soatlar qanday bo'lmasin. Qulf har suhbatga alohida, shuning uchun global tor joy yo'q.\n\nKlient `seq` bo'yicha saralaydi va bo'shliqni ko'radi: 1042 dan keyin 1044 kelsa, 1043 ni so'raydi. Qayta yuborilgan xabar o'sha klient id'sini olib keladi, shuning uchun takror dublikat yaratmaydi.",
      fields: {
        last_seq: "Bu suhbatda oxirgi ishlatilgan raqam. Yangi xabar 1043 ni oladi.",
        RETURNING: "Oshirish va o'qish bitta so'rovda, shuning uchun ikki yozuvchi bir xil raqam olmaydi.",
      },
    },
    receipts: {
      short: "Belgilar",
      title: "Yetkazildi va o'qildi",
      body: "Bobning qurilmasi xabarni olganda uni tasdiqlaydi: Alisada bitta belgi. Bob chatni ochganda ilova o'qildi belgisini yuboradi.\n\nBu har xabarga alohida belgi emas, har suhbatda har a'zoga bitta raqam: \"1043 gacha o'qildi\". Undan oldingi hammasi o'qilgan. Har xabarga bitta yozish o'rniga bitta kichik yozish.",
      fields: {
        type: "Qurilmadan `delivered`, chat ekranda bo'lganda `read`.",
        up_to_seq: "Shu raqamgacha hammasi o'qilgan. Alisadagi belgilar ularning hammasi uchun ko'k bo'ladi.",
      },
    },
    offline: {
      short: "Oflayn",
      title: "Bobning telefoni uxlab qoldi",
      body: "Telefon ilovani fonga o'tkazadi va operatsion tizim uning socket'ini yopadi. Reyestrda Bob uchun ulanish yo'q, chat servisi xabarni hech qayerga yubora olmaydi.\n\nXabar omborda xavfsiz, lekin Bob u borligini bilmaydi. Kuniga 900 xabar bir soatdan ko'p ko'rilmay yotadi.",
      fields: {
        "empty array": "Ochiq ulanish yo'q. Boshqa kanal bo'lmasa xabar shunchaki kutadi.",
      },
    },
    push: {
      short: "Push",
      title: "Push bildirishnoma, keyin yetib olish",
      body: "Ulanish topilmasa, chat servisi navbatga event qo'yadi. Push worker uni o'qiydi va telefon platformasining push servisini chaqiradi, u telefonni uyg'otib bildirishnoma ko'rsatadi.\n\nBob uni bosadi, ilova qayta ulanadi va har suhbat uchun o'zidagi oxirgi `seq` ni yuboradi. Server ombordan undan yangi hammasini qaytaradi. Push faqat uyg'otadi; haqiqat manbai ombor.",
      watch: "Push kafolatsiz: kechikishi, birlashishi yoki yo'qolishi mumkin. Xabarni hech qachon faqat push ichida yubormang.",
      fields: {
        device_token: "Shu telefondagi shu ilovani belgilaydi. Sir sifatida qaraladi va yashirilgan.",
        collapse_key: "Bitta chatdagi o'nta xabar o'nta emas, bitta bildirishnoma bo'ladi.",
        badge: "Ilova belgisida ko'rsatiladigan o'qilmaganlar soni.",
      },
    },
    group: {
      short: "Guruh",
      title: "Guruh chati: bir marta saqlash, onlayn bo'lganlarga tarqatish",
      body: "300 a'zoli jamoa chati. Xabar boshqa suhbatlar kabi guruh partition'ida bir marta saqlanadi. Keyin chat servisi qaysi a'zolar onlayn ekanini topadi va har a'zoga emas, har **gateway**'ga bitta frame yuboradi; har gateway o'z socket'lariga o'zi yetkazadi.\n\nOflayn 259 a'zo chat bo'yicha birlashtirilib push navbatiga tushadi. 100 000+ a'zoli ulkan kanallarda har a'zoga tarqatish umuman yo'q: klientlar `seq` bo'yicha o'zi tortadi, lentadagi mashhurlar holatidagidek.",
      fields: {
        SINTER: "Ikki to'plam kesishmasi, kichigidan yuriladi: millionlab onlayn emas, 300 a'zo.",
        members: "Guruh a'zolari ro'yxati, keshda.",
        online: "Kamida bitta tirik ulanishi bor har kim.",
        "41": "300 dan 41 tasi onlayn. Qolganlari push oladi.",
      },
    },
    presence: {
      short: "Onlayn",
      title: "Onlayn va oxirgi marta ko'rilgan",
      body: "Har gateway o'z foydalanuvchilari uchun har 25 s da heartbeat yuboradi, presence kaliti esa 60 s yashaydi. Telefon tunnelga kirib ketsa, hech kim chiqmaydi: kalit shunchaki tugaydi va Bob \"1 daqiqa oldin ko'rilgan\" bo'ladi.\n\nHolat o'zgarishi faqat hozir Bob bilan chat ochiq turganlarga yuboriladi, uning barcha kontaktlariga emas. Aks holda har kirish yuzlab xabarni keltirib chiqaradi.",
      watch: "Yomon tarmoqdagi telefonlar onlayn-oflayn o'rtasida sakraydi. O'zgarishni e'lon qilishdan oldin bir necha soniya kuting.",
      fields: {
        presence: "Har foydalanuvchiga bitta kalit. Uning borligi = onlayn holat.",
        EX: "60 s TTL, har heartbeat yangilaydi. Heartbeat yo'q, kalit yo'q: oflayn.",
      },
    },
    recap: {
      short: "Xulosa",
      title: "Xulosa",
      body: "Chat bu ombor va ochiq quvurlar to'plami.\n\n1) WebSocket gateway'lar ulanishlarni ushlaydi; reyestr har foydalanuvchi qayerdaligini aytadi. 2) Avval saqlash, suhbat bo'yicha bo'lingan. 3) Tartib soat bilan emas, suhbat ichidagi raqam bilan; klient bo'shliqlarni `seq` bo'yicha to'ldiradi. 4) Belgilar har a'zoga bitta raqam. 5) Oflayn foydalanuvchi push oladi va ombordan yetib oladi. 6) Guruhlar gateway bo'yicha tarqatiladi, onlayn holat TTL'da yashaydi.",
    },
  },
};

export default text;
