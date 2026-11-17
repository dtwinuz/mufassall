import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Video sayt loyihalash",
  summary:
    "Mualliflar bir soatlik 4K videolarni yuklaydi, tomoshabinlar esa beqaror mobil internetda telefondan ko'radi, premyera bo'lsa bir vaqtda 200 000 kishi keladi. Video sayt qadamma-qadam: davom ettiriladigan yuklash, transkodlash konveyeri, adaptiv bitreytli HLS, CDN, ko'rishlarni sanash va sovuq saqlash.",
  learn: [
    "Katta yuklash nega to'g'ridan saqlash joyiga, davom ettiriladigan qismlarda boradi",
    "Bitreyt zinapoyasiga transkodlash, parallel bo'laklarda",
    "HLS segmentlari va pleylistlari, pleyer sifatni qanday almashtiradi",
    "Origin oldida CDN, qizg'in qatorsiz ko'rishlarni sanash, issiq va sovuq saqlash",
  ],
  nodes: {
    creator: "Muallif",
    upload: "Yuklash API",
    raw: "Asl fayllar",
    viewer: "Tomoshabin",
    queue: "Transkod navbati",
    workers: "Transkoderlar",
    media: "Video ombori",
    cdn: "CDN",
    counter: "Ko'rish hisoblagichi",
    videos: "Videolar bazasi",
    cold: "Sovuq ombor",
  },
  metrics: {
    start: "Birinchi kadrgacha",
    rebuffer: "Buferlash",
    ready: "Yuklashdan ko'rishgacha",
    origin: "Origin trafigi",
    cost: "Saqlash narxi",
  },
  steps: {
    upload: {
      short: "Yuklash",
      title: "2 GB lik fayl bitta so'rovda",
      body: "Muallif mehmonxonadan bir soatlik 4K videoni, 2 GB ni yuklaydi. Ilova uni yuklash API'ga bitta POST bilan yuboradi, API esa oqimni saqlash joyiga uzatadi.\n\n23 daqiqa va 1,4 GB dan keyin Wi-Fi uziladi. So'rov yiqiladi, hech narsa saqlanmaydi, yuklash noldan boshlanadi. Bu orada har ochiq yuklash yarim soat davomida API serverining ulanishini band qilib turadi.",
      fields: {
        "Content-Length": "Bitta tanada 2 GB. Har qanday uzilish hammasini yo'qotadi.",
        "1.4 GB": "Deyarli to'rtdan uch qismi yuborilgan va tashlab yuborildi.",
        "504": "Shlyuz kutishdan charchadi. Muallif \"yuklash muvaffaqiyatsiz\" deganini ko'radi.",
      },
    },
    resumable: {
      short: "Davom ettirish",
      title: "To'g'ridan saqlash joyiga, qismlarda",
      body: "Yuklash API endi faqat muallifni tekshiradi va imzolangan havolalar beradi, har 16 MB lik qism uchun bittadan. Ilova qismlarni to'g'ridan saqlash joyiga, bir nechtasini bir vaqtda yuboradi, saqlash joyi esa qaysi qismlar kelganini eslab qoladi.\n\nUzilishdan keyin ilova qaysi qismlar saqlanganini so'raydi va faqat yetishmaganlarini yuboradi. API serverlari endi video baytlarini umuman tashimaydi.",
      watch: "Katta baytlarni ilova serverlaridan uzoq tuting: ular fayl haydamasin, ruxsat bersin.",
      fields: {
        partNumber: "128 tadan 88-qism. Qismlar istalgan tartibda kelishi mumkin.",
        "Content-Length": "Har qism 16 MB: qayta yuborish arzon bo'lishi uchun yetarlicha kichik.",
        ETag: "Saqlash joyining qism uchun kvitansiyasi. Oxirgi \"complete\" chaqiruvi hammasini sanab beradi.",
        "only part 88": "Uzilish butun fayl emas, bitta qismga tushadi.",
      },
    },
    "play-raw": {
      short: "Asl fayl",
      title: "Asl faylni telefonda ko'rsatish",
      body: "Birinchi versiya yuklangan faylni o'zicha ko'rsatadi. Bu 45 Mbit/s lik 4K, tomoshabinning telefonida esa 4 Mbit/s lik aloqa.\n\nPleyer ko'rsatishdan o'n barobardan ham sekinroq yuklab oladi. Birinchi kadr 14 soniyada chiqadi, video esa har bir necha soniyada buferlash uchun to'xtaydi. Telefonning kichik ekrani baribir 4K ni ko'rsata olmaydi.",
      fields: {
        Range: "Pleyer baytlarni boshidan so'raydi. U faqat kelib bo'lganini o'ynata oladi.",
        "45 Mbit/s": "Asl fayl to'xtovsiz o'ynashi uchun shuncha kerak.",
        "4 Mbit/s": "Tomoshabinda aslida shuncha bor. O'n bir barobar kam.",
      },
    },
    transcode: {
      short: "Transkod",
      title: "Bitreyt zinapoyasiga, bo'laklarda transkodlash",
      body: "Yuklash tugagach, saqlash joyi transkod navbatiga vazifa qo'yadi. Worker'lar videoni zinapoyaga qayta kodlaydi: 1080p, 720p, 480p va 240p, har biri o'z bitreyti bilan.\n\nBitta worker'ga bir soatlik video uchun taxminan bir soat kerak. Shuning uchun video bir daqiqalik bo'laklarga kesiladi, 60 ta worker ularni parallel kodlaydi, keyin bo'laklar ulanadi. Video yuklanganidan 12 daqiqa o'tib ko'rishga tayyor bo'ladi.",
      check: {
        q: "Bir soatlik video, bitta worker taxminan real vaqtda kodlaydi. 60 ta bir daqiqalik bo'lakni 60 ta worker kodlasa, taxminan qancha kutiladi?",
        options: [
          "Bir necha daqiqa, ustiga kesish, navbat va ulash",
          "Baribir taxminan bir soat: kodlashni bo'lib bo'lmaydi",
          "Roppa-rosa bir daqiqa",
        ],
        answer: 0,
        why: "Har bo'lak taxminan bir daqiqalik ish va ular bir vaqtda bajariladi. Faylni kesish, bo'sh worker kutish, ulash va sekin bo'laklar biroz qo'shadi, shuning uchun bir soat ham, roppa-rosa bir daqiqa ham emas, bir necha daqiqa chiqadi.",
      },
      fields: {
        chunk: "60 tadan 17-bo'lak. Har bo'lak mustaqil vazifa.",
        from_s: "Bo'lak videoning 960-soniyasidan 1020-soniyasigacha.",
        ladder: "Har bo'lak barcha sifatlarga kodlanadi, shunda istalgan variant ulanadi.",
      },
    },
    hls: {
      short: "HLS",
      title: "HLS: pleylistlar va 6 soniyalik segmentlar",
      body: "Har variant 6 soniyalik segmentlarga, `seg_042.m4s` kabi nomli kichik fayllarga kesiladi. Master pleylist variantlarni bitreyti va o'lchami bilan sanab beradi; har variantning o'z segmentlar pleylisti bor.\n\nPleyer master pleylistni yuklaydi, variant tanlaydi va segmentlarni birma-bir oladi. U katta faylni kutmay, birinchi segmentdan keyin boshlay oladi: birinchi kadr endi 2 soniyada chiqadi.",
      fields: {
        "master.m3u8": "Kirish nuqtasi: qanday sifatlar bor.",
        BANDWIDTH: "Bu variantga soniyasiga necha bit kerak. Pleyer buni aloqa bilan solishtiradi.",
        RESOLUTION: "Kadr o'lchami. Telefonga ekranidan kattasi kerak emas.",
        "6-second segments": "Oddiy HTTP orqali oddiy fayllar. Ularni istalgan veb-server yoki CDN bera oladi.",
      },
    },
    abr: {
      short: "Adaptiv",
      title: "Adaptiv bitreyt: sifat aloqaga ergashadi",
      body: "Tomoshabin metroga tushadi. Pleyer oxirgi segment 1,9 Mbit/s da kelganini va bufer 7 soniyagacha tushganini o'lchaydi. Navbatdagi segmentni u 1080p o'rniga 480p da oladi.\n\nTasvir bir muddat xiraroq bo'ladi, lekin to'xtamaydi. Bufer yana to'lgach, pleyer qaytib ko'tariladi. Barcha variantlarning segmentlari bir xil paytlarda boshlanadi, shuning uchun almashish sezilmaydi.",
      check: {
        q: "Pleyer video o'rtasida sifatni umuman qanday almashtira oladi?",
        options: [
          "Server har tomoshabin uchun videoni jonli qayta kodlaydi",
          "Pleyer dekodlashda o'lchamni o'zi pasaytiradi",
          "Hamma variant bir xil vaqt belgilarida kesilgan, shuning uchun istalgan sifatdagi 42-segment mos keladi",
        ],
        answer: 2,
        why: "Variantlar segment chegaralari tekislangan holda kodlangan. Pleyer 41-segmentni 1080p dan, 42-segmentni 480p dan olishi mumkin va vaqt uzilmay davom etadi. Tomoshabin uchun hech narsa jonli kodlanmaydi.",
      },
      fields: {
        measured: "Oxirgi segmentlarning yuklanish tezligi: pleyerning aloqa haqidagi bahosi.",
        buffer: "Necha soniyalik video allaqachon yuklangan. Bufer kam bo'lsa, hozir pastga tushiladi.",
        "480p": "Zinapoyaning pastroq pog'onasi, faqat navbatdagi segment uchun.",
      },
    },
    premiere: {
      short: "Premyera",
      title: "Premyera: bir vaqtda 200 000 tomoshabin",
      body: "Mashhur kanal soat 20:00 da yangi video premyerasini qiladi. 200 000 tomoshabin bir daqiqada \"play\" ni bosadi, har biri taxminan 5 Mbit/s tortadi.\n\nBu bitta mintaqadagi bitta saqlash bucket'idan 1 Tbit/s. Saqlash joyi so'rovlarni sekinlata boshlaydi, birinchi bayt deyarli 5 soniyada keladi, mintaqadan uzoqdagi tomoshabinlar esa eng ko'p qiynaladi.",
      fields: {
        "200000 viewers": "Hammasi bir xil daqiqalarda bir xil segmentlarni ko'radi.",
        "1 Tbit/s": "Bitta origin va bitta tarmoq kanali ko'tarishi kerak bo'lganidan ancha ko'p.",
        "Slow Down": "Saqlash joyi so'rovlarni sekinlatadi. Pleyer to'xtashlarni ko'radi.",
      },
    },
    cdn: {
      short: "CDN",
      title: "Segmentlar CDN'dan",
      body: "Video ombori oldiga CDN qo'yiladi. Tomoshabinlar segmentlarni eng yaqin tugundan oladi; har segmentning faqat birinchi so'rovi origin'ga boradi.\n\nSegmentlar yozilgandan keyin o'zgarmaydi, shuning uchun CDN ularni bir yil saqlashi mumkin. Origin trafigi 1 Tbit/s dan taxminan 20 Gbit/s gacha tushadi. Jonli efir pleylisti esa o'zgaradi, unga bir-ikki soniyalik TTL beriladi.",
      watch: "Segmentlarni hech qachon o'zgarmaydigan qilib nomlang. Shunda ularni abadiy keshlash xavfsiz, qisqa TTL faqat pleylistlarga kerak.",
      fields: {
        "Cache-Control": "Bir yilga o'zgarmas. Yangi kodlash yangi fayl nomlarini oladi.",
        "X-Cache": "CDN tugunidan berildi. Origin bu so'rovni ko'rmadi.",
        Age: "Tugun bu nusxani 312 soniyadan beri saqlayapti.",
      },
    },
    views: {
      short: "Ko'rishlar",
      title: "Har ko'rish uchun bitta qator",
      body: "Pleyer o'ynayotganda heartbeat yuboradi, hisoblagich esa har biri uchun video qatoriga bitta qo'shadi. Premyera paytida bu soniyasiga 40 000 yangilanish, hammasi bitta qatorga.\n\nHar yangilanish shu qatorning qulfini kutadi. Yangilanishlar navbatga tiziladi, baza 100% band, u bilan birga videolar jadvalidagi boshqa so'rovlar ham sekinlashadi.",
      check: {
        q: "Soniyasiga 40 000 heartbeat'ni qizg'in qatorsiz qanday sanash mumkin?",
        options: [
          "Videolar jadvali uchun tezroq baza serveri",
          "Xotirada vaqt oynasi bo'yicha sanab, har video uchun bitta yig'indini yozish",
          "Premyeralar paytida ko'rish hisoblagichini o'chirib qo'yish",
        ],
        answer: 1,
        why: "Tez server shiftni biroz ko'taradi, xolos: har yangilanish baribir o'sha qatorning qulfini oladi. Oyna bo'yicha yig'indi soniyasiga 40 000 yozuvni daqiqasiga har video uchun bitta yozuvga aylantiradi.",
      },
      fields: {
        "views + 1": "Har heartbeat uchun bitta yozuv. Ish auditoriya bilan birga o'sadi.",
        "lock wait": "Har yangilanish shu qatordagi oldingisini kutadi.",
        "one row": "Hamma yozuv bitta joyga boradi, shuning uchun server qo'shish yordam bermaydi.",
      },
    },
    "view-batch": {
      short: "To'plam",
      title: "Oynalarda sanash, daqiqada bir marta yozish",
      body: "Hisoblagich endi heartbeat'larni bir daqiqa xotirada yig'adi. U ko'rish nima ekanini ham belgilaydi: kamida 30 soniya ko'rilgan, har seansda bir marta, shunda sahifani yangilash raqamni sun'iy oshirmaydi.\n\nDaqiqada bir marta u har video uchun bitta raqam yozadi. Baza premyera uchun soniyasiga 40 000 emas, daqiqasiga bitta yangilanish ko'radi. Sahifadagi raqam bir daqiqagacha orqada qoladi va bunga hech kim qarshi emas.",
      watch: "Aniq, real vaqtli hisoblagich kamdan-kam o'z narxiga arziydi. U qanchalik kechikishi va qanchalik aniq bo'lishi mumkinligini hal qiling.",
      fields: {
        window: "Xotirada yig'ilgan bir daqiqalik heartbeat'lar.",
        "30 s": "Nima ko'rish hisoblanishi qoidasi.",
        "one per session": "Sahifani yangilash ko'rish qo'shmaydi.",
        "41700": "Daqiqa yakuni bilan bitta yozuv.",
      },
    },
    cold: {
      short: "Sovuq ombor",
      title: "Issiq va sovuq saqlash",
      body: "Ko'rishlarning ko'pi videolarning kichik qismiga to'g'ri keladi; ko'p videolarni yiliga bir necha marta ko'rishadi. Hamma videoning hamma varianti tez omborda yotadi va oyiga $18 000 turadi.\n\nHayot sikli qoidasi 90 kunda 10 tadan kam ko'rilgan videolarni sovuq omborga ko'chiradi, faqat 480p ni issiq qoldiradi, shunda ular baribir tez boshlanadi. Asl fayllar 30 kundan keyin o'chiriladi. Narx oyiga $7 000 gacha tushadi, eski videoni kamdan-kam ochgan tomoshabin esa bir necha soniya ko'proq kutadi.",
      fields: {
        rule: "Qaysi videolar sovuq: 90 kunda 10 martadan kam ko'rilgan.",
        move_to: "Arzonroq sinf: GB narxi past, birinchi bayt sekinroq.",
        keep_hot: "Bitta variant tez qoladi, eski video ham darhol boshlanadi.",
        delete_raw_after_days: "Zinapoya qurilgach, 4K asl fayl kerak emas.",
      },
    },
    recap: {
      short: "Xulosa",
      title: "Xulosa",
      body: "Video sayt uchun oltita qaror.\n\n1) Yuklash to'g'ridan saqlash joyiga, davom ettiriladigan qismlarda boradi; ilova serverlari faqat imzolaydi. 2) Bitreyt zinapoyasiga parallel bo'laklarda transkodlang. 3) HLS bering: pleylistlar va kichik, tekislangan segmentlar. 4) Pleyer sifatni aloqa va buferga moslasin. 5) Oldiga CDN qo'ying; o'zgarmas segment nomlari keshni xavfsiz qiladi. 6) Ko'rishlarni oynalarda sanang, uzun dumni sovuq omborga ko'chiring.",
    },
  },
};

export default text;
