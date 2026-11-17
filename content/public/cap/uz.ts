import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "CAP: aloqa uzilganda",
  summary:
    "O'rin band qilish servisi ikkita data markazda ishlaydi va ular o'zgarishlarni bir-biriga ko'chiradi. Ular orasidagi aloqa uzilsa, har bir tomon tanlashi kerak: yozuvni rad etib to'g'ri qolish yoki qabul qilib, ziddiyatlarni keyin hal qilish. Quorum bu tanlovni qanday avtomatik qiladi.",
  learn: [
    "Nega asinxron replikatsiyada ba'zi o'qishlar eskirgan bo'ladi (eventual consistency)",
    "Tarmoq bo'linishi (partition) nimani tanlashga majbur qiladi: izchillik yoki ochiqlik",
    "Ochiq tizim aloqa tiklangach ziddiyatli yozuvlarni qanday kelishtiradi",
    "Nega R + W > N quorum yangi o'qish beradi va faqat ko'pchilikka yozishga ruxsat beradi",
  ],
  nodes: {
    "user-e": "Foydalanuvchi (sharq)",
    "api-e": "API sharq",
    "db-e": "Baza sharq",
    "user-w": "Foydalanuvchi (g'arb)",
    "api-w": "API g'arb",
    "db-w": "Baza g'arb",
    fixer: "Kelishtiruvchi",
    "db-t": "Uchinchi joy bazasi",
  },
  metrics: {
    accepted: "Qabul qilingan yozuvlar",
    stale: "Eskirgan o'qishlar",
    conflicts: "Hal qilinmagan ziddiyatlar",
    lag: "Replikatsiya kechikishi",
  },
  steps: {
    "two-dcs": {
      short: "Ikki DC",
      title: "Ikki data markaz, bitta band qilish tizimi",
      body: "Sharqqa yaqin foydalanuvchilar o'rinni sharq API orqali, g'arbga yaqinlari g'arb API orqali band qiladi. Har tomonning o'z bazasi bor.\n\nHar bir o'zgarish fonda, taxminan 30 ms keyin, ikkinchi tomonga ko'chiriladi. Yozuv tez qaytadi, chunki hech kim uzoq tomonni kutmaydi.",
      fields: {
        key: "O'zgargan yozuv: 14A o'rin.",
        version: "Har o'zgarishda bittaga oshadi. Replikalar qaysi nusxa yangiroq ekanini shu bilan solishtiradi.",
        lag_ms: "Nusxa asl nusxadan qancha orqada. Odatda o'nlab millisekund.",
      },
    },
    "stale-read": {
      short: "Eski o'qish",
      title: "30 ms davomida ikki tomon kelishmaydi",
      body: "`u_42` sharqda 14A o'rinni band qiladi. G'arbdagi do'sti bir lahzadan keyin, nusxa yetib kelmasdan, o'rinlar xaritasini ochadi va 14A ni bo'sh ko'radi.\n\nBu eventual consistency: yozish to'xtasa, ikki tomon oxir-oqibat bir xil bo'ladi, lekin har lahzada emas. Odatda bu o'qishlarning 2% i va buni hech kim sezmaydi.",
      fields: {
        holder: "G'arb hali hech kimni ko'rsatmaydi. Sharqda esa `u_42` allaqachon bor.",
        version: "Bu yerda 16, sharqda 17. G'arb nusxasi bitta o'zgarish orqada.",
      },
    },
    partition: {
      short: "Bo'linish",
      title: "Joylar orasidagi aloqa uzildi",
      body: "Data markazlar orasidagi optik kabel kesildi. Ikkala joy ham ishlayapti, ikkala API ham o'z foydalanuvchilariga javob beryapti, lekin bir-biriga yetolmaydi.\n\nHar tomonda o'zgarishlar yig'ilib boradi. 45 s dan keyin g'arbdagi o'qishlarning uchdan biri eski ma'lumot ko'rsatadi va farq o'sib boraveradi.",
      watch: "Bir tomondan qaraganda o'lgan qo'shni ham, uzilgan aloqa ham aynan bir xil ko'rinadi.",
      fields: {
        "timed out": "Sharq jimlikni ko'radi. G'arb o'lganmi yoki shunchaki yetib bo'lmayaptimi, bilolmaydi.",
        lag: "Endi millisekund emas: uzilish qancha davom etsa, shuncha.",
      },
    },
    refuse: {
      short: "Rad et",
      title: "1-tanlov: to'g'ri qol, yozuvni rad et",
      body: "Band qilish bo'yicha asosiy (primary) tomon — sharq. Undan uzilgan g'arb band qilishni va yangi ma'lumot talab qiladigan savollarga javob berishni to'xtatadi: 503, keyinroq urinib ko'ring.\n\nBitta o'rin ikki marta sotilmaydi, hech kim eski ma'lumot ko'rmaydi. Lekin aloqa tiklanguncha foydalanuvchilarning yarmi umuman band qila olmaydi. Bu izchil tanlov (CP).",
      fields: {
        "503": "G'arb ishlayapti, lekin ataylab rad etyapti.",
        "Retry-After": "Ilovaga serverni bosib tashlash o'rniga 30 s dan keyin qayta urinishni aytadi.",
        error: "`read_only`: aniq sabab: ilova umumiy xato o'rniga \"band qilish to'xtatilgan\" deb ko'rsata oladi.",
      },
    },
    accept: {
      short: "Qabul qil",
      title: "2-tanlov: ochiq qol, ikkala tomonda yozuv qabul qil",
      body: "Boshqa yo'l: g'arb uzilish paytida ham band qilishni davom ettiradi. Har bir foydalanuvchi band qila oladi, servis sog'lom ko'rinadi.\n\nLekin sharq ham xuddi shunday qilyapti. Sharqda `u_42` 14B o'rinni oladi; ikki soniyadan keyin g'arbda `u_77` o'sha 14B ni oladi. Har tomon o'z nusxasini tekshirdi va o'rinni bo'sh ko'rdi. Bu ochiq tanlov (AP).",
      watch: "Har tomonning tekshiruvi o'z nusxasi uchun to'g'ri. Nusxalar esa bir-biriga mos emas.",
      check: {
        q: "Kabel tuzatildi va replikatsiya qayta boshlandi. 14B o'rin bilan nima bo'ladi?",
        options: [
          "Ikkala nusxa 5-versiya, egasi har xil: ziddiyat",
          "Yangiroq versiya yutadi, nusxalar o'zi kelishadi",
          "Keyingi yozuv, `u_77`, avvalgisini shunchaki almashtiradi",
        ],
        answer: 0,
        why: "Ikkala tomon ham 4-versiyani o'zgartirgan, ikkalasi 5-versiyani har xil ega bilan yuboradi. Hech biri yangiroq emas, kimdir qaror qilishi kerak; bir soatlik uzilishda 18 ta yozuv shu holga tushdi.",
      },
      fields: {
        "holder IS NULL": "\"Faqat o'rin bo'sh bo'lsa.\" G'arb nusxasida rost, sharq esa uni allaqachon sotgan.",
        "UPDATE 1": "Muvaffaqiyat. G'arb hozirgina ikki marta band qilganini bilmaydi.",
      },
    },
    heal: {
      short: "Tiklandi",
      title: "Aloqa qaytdi, ziddiyatlar ham",
      body: "Kabel tuzatildi va replikatsiya qayta boshlandi. Endi ikkala tomon 14B o'rinning o'z versiyasini yuboradi: ikkalasi ham 5-versiya, egasi har xil.\n\nMa'lumotning o'zida to'g'ri javob yo'q. Bir soatlik uzilish davomida 18 ta yozuv shu holga tushdi.",
      fields: {
        version: "Ikkala tomonda bir xil raqam: ikkalasi ham 4-versiyani o'zgartirgan. Hech biri yangiroq emas.",
        east: "Sharq yozuvi, vaqti bilan.",
        west: "G'arb yozuvi, 2,4 s keyinroq.",
        status: "Replikator versiya bo'yicha g'olibni tanlay olmaydi. Kimdir qaror qilishi kerak.",
      },
    },
    reconcile: {
      short: "Kelishtir",
      title: "Biznes qoidasi bilan kelishtirish",
      body: "Kelishtiruvchi (reconciler) har bir ziddiyatni o'qiydi va biznes tanlagan qoidani qo'llaydi: o'rinlar uchun avvalroq band qilgan yutadi. Yutqazgan uzr va boshqa o'rin oladi.\n\nBoshqa ma'lumotga boshqa qoida kerak. Layk hisoblagichida ikkala tomonni qo'shib qo'yish mumkin; savatda mahsulotlarni birlashtirish mumkin. \"Oxirgi yozuv yutadi\" eng oddiy qoida va u bitta yozuvni jimgina tashlab yuboradi.",
      watch: "Ochiq tizimlar ziddiyatdan qochmaydi. Ular narxni uzilishdan keyinga ko'chiradi.",
      fields: {
        rule: "Har bir ma'lumot turi uchun oldindan belgilanadi. Qaysi paket oxirgi kelgani bo'yicha emas.",
        loser: "\"Band qilindi\" deb aytilgan haqiqiy odam. Qoida faqat yomon xabarni kim olishini hal qiladi.",
        action: "Kompensatsiya: boshqa o'rin. Ba'zan yagona yo'l — pulni qaytarish.",
      },
    },
    quorum: {
      short: "Quorum",
      title: "Uchta replika, ikkitasiga yoz, ikkitasidan o'qi",
      body: "Kichik uchinchi joy qo'shildi. Endi har bir o'rin N = 3 replikada yashaydi. Yozuv W = 2 replika tasdiqlagandagina hisoblanadi; o'qish R = 2 replikadan so'raydi va eng katta versiyani oladi.\n\nR + W = 4 > 3 bo'lgani uchun har bir o'qish har bir tugagan yozuv bilan kamida bitta replikada kesishadi: eskirgan o'qish yo'q. Narxi — sekinroq yozuv, 4 ms o'rniga 38 ms, chunki bitta tasdiq boshqa joydan keladi.",
      check: {
        q: "Sharq ikkala boshqa joydan uzildi. Sharq API yangi band qilish so'rovini nima qiladi?",
        options: [
          "O'zida qabul qiladi, aloqa tiklangach kelishtiradi",
          "Rad etadi: 1 tasdiq oladi, W = 2 esa kerak",
          "So'rovni aloqa qaytguncha ushlab, keyin yozadi",
        ],
        answer: 1,
        why: "Sharq faqat o'z replikasiga yetadi, 3 dan 1, W = 2 ni yig'a olmaydi va `no_quorum` qaytaradi. G'arb va uchinchi joy ko'pchilik, ular band qilishni qabul qilishda davom etadi.",
      },
      fields: {
        N: "Har bir yozuvni nechta replika saqlaydi.",
        W: "Yozuv qabul qilinishidan oldin nechtasi tasdiqlashi kerak.",
        committed: "Uchtadan ikkitasi tasdiqladi. Uchinchisi fonda yetib oladi.",
      },
    },
    majority: {
      short: "Ko'pchilik",
      title: "Endi bo'linishni tizimning o'zi hal qiladi",
      body: "Sharq ikkala boshqa joydan uzildi. G'arb va uchinchi joy hali bir-birini ko'radi: 3 dan 2, ko'pchilik. Ular band qilishni qabul qilishda davom etadi.\n\nSharq faqat o'z replikasiga yetadi: 3 dan 1. U W = 2 ni yig'a olmaydi, shuning uchun yozuvni o'zi rad etadi. Ikki marta band qilish yo'q, kelishtiruvchi kerak emas va faqat ozchilik tomon yopiq.",
      fields: {
        error: "`no_quorum`. Bu qulash emas: sharq ozchilikda ekanini biladi.",
        acks: "Faqat sharqning o'z bazasi tasdiqladi.",
        needed: "W = 2. Ikkinchi joysiz hech qanday yozuv qabul qilinmaydi.",
      },
    },
    recap: {
      short: "Xulosa",
      title: "Xulosa",
      body: "Joylar orasidagi aloqa uziladi, shunda tanlash kerak: to'g'ri bo'lish yoki ochiq bo'lish. Uzilish paytida ikkalasi birga bo'lmaydi.\n\n1) Asinxron replikatsiya yaxshi kunda ham qisqa vaqt eskirgan o'qish beradi. 2) Izchil (CP): uzilgan tomon yozuvni rad etadi. 3) Ochiq (AP): ikkala tomon qabul qiladi, keyin biznes qoidasi ziddiyatlarni kelishtiradi. 4) R + W > N quorum yangi o'qish beradi va faqat ko'pchilik tomonga yozishga ruxsat beradi.",
    },
  },
};

export default text;
