import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Bloom filtri",
  summary:
    "Internet-do'konning ro'yxatdan o'tish formasi har bir tugma bosilganda 50 million akkaunt ichida \"bu nom bandmi?\" deb so'raydi. Yozilayotgan nomlarning ko'pi bo'sh, har biri esa bazaga bitta so'rov. 62 MB lik bit massivi bazasiz qanday qilib \"aniq bo'sh\" deydi, uni qanday hisoblash kerak, nega u unutolmaydi va shu usul saqlash dvigatellari ichida qayerda yashirinadi.",
  learn: [
    "Bloom filtri qanday ishlaydi: m bit, k xesh, \"aniq yo'q\" yoki \"balki\"",
    "Soxta musbat javob hisobi: kalitga 10 ga yaqin bit va 7 xesh taxminan 1% beradi",
    "Nega filtr o'sishni hisobga olib o'lchanadi va to'lganda qayta quriladi",
    "Nega undan o'chirib bo'lmaydi, sanovchi Bloom filtri va LSM o'qishlaridagi Bloom filtrlari",
  ],
  nodes: {
    form: "Ro'yxat formasi",
    api: "Akkauntlar API",
    db: "Foydalanuvchilar bazasi",
    filter: "Bloom filtri",
    sst1: "SSTable 1",
    sst2: "SSTable 2",
    sst3: "SSTable 3",
  },
  metrics: {
    reads: "Baza o'qishlari",
    p95: "Tekshiruv p95",
    fp: "Soxta musbat",
    memory: "Filtr xotirasi",
  },
  steps: {
    "every-key": {
      short: "Har kalit",
      title: "Har bir bosishga bazadan qidiruv",
      body: "Yangi xaridor nom yozayotganda, forma har to'xtashdan keyin API'dan so'raydi: `ali_k1993x` bo'shmi? API nomni foydalanuvchilar jadvalidan qidiradi — taxminan 4 ms lik indeksli so'rov.\n\nSoniyasiga 1000 tekshiruvda baza bardosh beradi. Bu eng arzon so'rov, lekin baribir har tekshiruvga bazaga borib kelish.",
      fields: {
        available: "Butun javob: bir bit ma'lumot.",
        "X-DB-Time": "Hech kimda yo'q nom uchun ham har tekshiruv bazaga borib kelishga tushadi.",
      },
    },
    load: {
      short: "Yuk",
      title: "Ro'yxatdan o'tish kampaniyasi tekshiruvlarni uch barobar oshiradi",
      body: "Marketing kampaniyasi ro'yxatdan o'tish to'lqinini olib keladi: soniyasiga 3000 tekshiruv. Baza quvvatining katta qismini \"bunday nom yo'q\" deb javob berishga sarflaydi va u bilan birga buyurtmalar ham sekinlashadi.\n\nManzara ko'p narsani aytadi: tekshiruvlarning 80% i mavjud bo'lmagan nomlar uchun. Baza yo'qlikni isbotlash bilan band.",
      watch: "Mavjud bo'lmagan kalitlarni qidirish ko'pincha o'qishlarning eng katta va eng befoyda ulushi bo'ladi.",
      fields: {
        username: "Indeksli ustun: tez qidiruv, lekin baribir qidiruv.",
        "0 rows": "Odatiy javob. Hech narsa yo'qligini bilish uchun ish qilindi.",
        "80%": "Tekshiruvlarning ko'pi — topilmaydi. Bloom filtri aynan shunda kuchli.",
      },
    },
    bloom: {
      short: "Bloom filtri",
      title: "\"Aniq yo'q\" deydigan bit massivi",
      body: "API xotirada **Bloom filtri** saqlaydi: m bitli massiv, boshida hammasi nol. Nom qo'shish uchun u k xil xesh funksiya bilan xeshlanadi va ular ko'rsatgan k bit 1 ga qo'yiladi. Mavjud 50 million nomning hammasi qo'shilgan.\n\nNomni tekshirish uchun o'sha k bit o'qiladi. Bittasi 0 bo'lsa, nom hech qachon qo'shilmagan: u **aniq bo'sh** va bazadan so'ralmaydi. Bitta nolning o'zi yetarli.",
      watch: "Bloom filtri \"yo'q\" deganda hech qachon adashmaydi. U faqat ba'zan yo'q kalit uchun \"balki\" deydi.",
      check: {
        q: "\"zarina_t\" nomi uchun barcha k bit 1. API nima qilishi kerak?",
        options: [
          "Bazadan so'ramay \"band\" deb javob berish",
          "Bazadan so'rash: bu soxta musbat bo'lishi mumkin",
          "Nomni filtrga yana qo'shish",
        ],
        answer: 1,
        why: "Hammasi bir \"balki\" degani: bitlarni boshqa nomlar qo'ygan bo'lishi mumkin. Aniq faqat baza biladi. Filtrning qiymati nollarda — ular bo'sh nomlarning ko'pi uchun bazani chetlab o'tadi.",
      },
      fields: {
        h1: "Birinchi xesh 1 bo'lgan bitga tushadi. Qaror uchun bu kam.",
        h2: "Ikkinchi xesh 0 ga tushadi. Nom hech qachon qo'shilmagan.",
        "definitely not": "Bitta nol — isbot. Qolgan xeshlar hatto hisoblanmaydi.",
      },
    },
    maybe: {
      short: "Balki",
      title: "\"Balki\" bazaga boradi",
      body: "Band nomda barcha k bit 1, va API buni bazada tasdiqlaydi. Bo'sh nomlarning kichik qismida ham shunday bo'ladi — ularning bitlarini tasodifan boshqa nomlar qo'ygan: bu **soxta musbat** javob.\n\nFoydalanuvchiga javob doim to'g'ri. Filtr faqat bazadan qanchalik tez-tez so'rash kerakligini hal qiladi.",
      fields: {
        "all = 1": "Hamma bit qo'yilgan: yo nom bor, yo bitlarni boshqalar qo'ygan.",
        maybe: "Filtr bu ikki holatni ajrata olmaydi.",
        "1 row": "Baza aniq javob beradi: band.",
      },
    },
    math: {
      short: "Hisob",
      title: "U qanchalik tez-tez aldaydi: soxta musbat formulasi",
      body: "n ta nom, m bit va k xeshda bo'sh nomning barcha bitlari 1 chiqish ehtimoli taxminan p = (1 - e^(-kn/m))^k.\n\n50 million nom va har nomga 10 bit (62,5 MB) uchun eng yaxshi k taxminan 7, va p = 0,82%. Soniyasiga 2400 ta bo'sh nom tekshiruvidan 19 ga yaqini baribir bazaga yetadi, qo'shimcha haqiqatan mavjud nomlar uchun 600 ta: 3000 o'rniga 620 o'qish.",
      fields: {
        n: "Filtrda nechta kalit bor.",
        m: "Unda nechta bit bor. Muhimi m/n — kalitga bit.",
        k: "Kalitga nechta xesh. Juda kam ham, juda ko'p ham p ni oshiradi; eng yaxshisi m/n x ln 2.",
        p: "Soxta musbat ulushi: yo'q kalitlarning baribir \"balki\" deydigan qismi.",
      },
    },
    sizing: {
      short: "O'lcham",
      title: "Xotirani aniqlikka almashtirish",
      body: "Ulush umumiy o'lchamga emas, faqat kalitga to'g'ri keladigan bitga bog'liq. Kalitga 5 bit taxminan 9%, 10 bit taxminan 0,8%, 15 bit taxminan 0,07% beradi.\n\nDo'kon 10 bitni tanlaydi: 50 million nom uchun har API nusxasida 62,5 MB. Nomlarning o'zini saqlash taxminan bir gigabayt olardi.",
      check: {
        q: "Eng yaxshi k bilan kalitga har qo'shimcha 5 bit soxta musbat ulushini nima qiladi?",
        options: ["Ikki barobar kamaytiradi", "k qotirilgan bo'lsa, hech narsa", "Taxminan o'n barobar kamaytiradi"],
        answer: 2,
        why: "Kalitga 5 bitdan 10 bitga o'tganda ulush 9,2% dan 0,82% ga, 10 dan 15 ga o'tganda 0,07% ga tushadi: har safar taxminan o'n barobar. Aniqlik arzon: xotira chiziqli o'sadi, xatolar eksponensial kamayadi.",
      },
      fields: {
        "bits/key": "m/n: aniqlikni belgilaydigan yagona dastak.",
        "false positives": "Kalitga har ~5 qo'shimcha bitda taxminan o'n barobar tushadi.",
        memory: "Kalitga bit va nomlar soniga chiziqli bog'liq o'sadi.",
      },
    },
    growth: {
      short: "O'sish",
      title: "Foydalanuvchilar ko'paygan sari filtr to'ladi",
      body: "Ikki yildan keyin do'konda 120 million akkaunt bor, filtrda esa hamon 500 million bit. Bitlarning ko'pi endi 1, soxta musbat ulushi 24% ga chiqadi: har to'rtinchi bo'sh nom yana bazaga boradi.\n\nBloom filtrini joyida kengaytirib bo'lmaydi. Servis fonda foydalanuvchilar jadvalidan 150 MB lik yangi filtr quradi va eskisini almashtiradi.",
      watch: "Filtrni bo'ladigan n ga hisoblang va to'lish ulushiga alert qo'ying. To'lgan filtr jim buziladi: u shunchaki hamma narsaga \"balki\" deydi.",
      fields: {
        n: "Filtr mo'ljallanganidan ikki yarim barobar ko'p kalit.",
        "0.24": "Yangi n bilan o'sha formula. Bitlar deyarli hammasi bir.",
        rebuild: "Kattaroq bit massiviga to'liq o'tish. Eski bitlarni cho'zib bo'lmaydi.",
        swap: "API darhol yangi filtrga o'tadi; tekshiruvlar to'xtamaydi.",
      },
    },
    delete: {
      short: "O'chirish",
      title: "Filtr unutolmaydi",
      body: "Xaridor `ali_k` akkauntini yopadi va nom bo'shashi kerak. Eng oddiy yo'l — uning k bitini nolga qaytarish.\n\nLekin bitlar umumiy: ulardan birini `zarina_t` ham qo'ygan. Nollagandan keyin filtr `zarina_t` aniq yo'q deydi va ikkinchi odam band nomni ro'yxatdan o'tkazishi mumkin. Soxta manfiy javob filtrning yagona va'dasini buzadi.",
      check: {
        q: "Nega o'chirilgan nomning k bitini shunchaki 0 ga qaytarib bo'lmaydi?",
        options: [
          "Bu bitlarni boshqa nomlar ham bo'lishadi va ular bo'sh ko'rinib qoladi",
          "Bu juda sekin: har o'chirishga k ta yozuv",
          "Qulf ostida qilinsa bo'ladi",
        ],
        answer: 0,
        why: "Har bir bit ko'p nomga tegishli bo'lishi mumkin. Uni nollash hammasini filtrdan olib tashlaydi va band nomlar \"aniq yo'q\" deb javob bera boshlaydi. Qulf yordam bermaydi: muammo parallellikda emas, umumiy bitlarda.",
      },
      fields: {
        remove: "Oddiy Bloom filtrida xavfsiz o'chirish yo'q.",
        "also set": "Bitlar ularni kim qo'yganini eslamaydi.",
        "false negative": "Bloom filtri hech qachon qilmasligi kerak bo'lgan yagona xato.",
      },
    },
    counting: {
      short: "Sanovchi",
      title: "Sanovchi Bloom filtri yoki qayta qurish",
      body: "**Sanovchi Bloom filtri** har katakda bit o'rniga kichik hisoblagich saqlaydi. Nom qo'shish uning k hisoblagichini oshiradi, o'chirish kamaytiradi, katak esa hisoblagich noldan katta ekan \"qo'yilgan\" hisoblanadi.\n\nNarxi — to'rt barobar ko'p xotira. Akkaunt yopish kam uchraydi, bo'shagan nom esa bir kun kutishi mumkin, shuning uchun do'kon oddiy filtrni qoldiradi va uni har kecha qayta quradi. Bugun bo'shagan nom ungacha \"balki\" bo'lib turadi va baza to'g'ri javob beradi.",
      watch: "Oddiy filtrda ortiqcha birlar xavfsiz (ortiqcha \"balki\"), yetishmaydigan birlar esa yo'q. Kalitlar o'chirilsa, jadval bo'yicha qayta quring.",
      fields: {
        "4-bit counters": "Bir katakka 15 tagacha nom sig'adi; me'yoriy o'lchamda to'lib ketish kam uchraydi.",
        counter: "Umumiy kataklar endi o'z egalarini sanaydi.",
        maybe: "ali_k o'chirilgandan keyin ham zarina_t to'g'ri javob beradi.",
        memory: "Katakka bitta o'rniga to'rt bit.",
      },
    },
    lsm: {
      short: "LSM ichida",
      title: "Baza ichidagi o'sha usul",
      body: "LSM daraxtiga qurilgan saqlash dvigatellari ma'lumotni diskdagi ko'p saralangan fayllarda — SSTable'larda saqlaydi. Kalitni o'qish ularning har biriga, yangisidan eskisiga qarab kirishi mumkin, yo'q kalit esa hamma faylni ochish degani.\n\nShuning uchun har SSTable'ning xotirada o'z Bloom filtri bor. O'qish avval filtrlardan so'raydi va faqat \"balki\" degan fayllarni ochadi. Yo'q kalit bitta ham disk o'qishiga tushmaydi.",
      watch: "Qidiruv qimmat va topilmaslik tez-tez bo'ladigan har joyda uning oldidagi Bloom filtri o'zini oqlaydi.",
      fields: {
        SSTables: "O'zgarmas saralangan fayllar. Qancha ko'p bo'lsa, topilmaslik shuncha qimmat.",
        skip: "Filtr \"aniq yo'q\" dedi, fayl ochilmaydi.",
        "0 disk reads": "Uchta disk o'qishi o'rniga topilmaslikka xotiradan javob berildi.",
      },
    },
    recap: {
      short: "Xulosa",
      title: "Xulosa",
      body: "Bloom filtri uchun besh qoida.\n\n1) So'raladigan kalitlarning ko'pi mavjud bo'lmasa, uni qimmat qidiruv oldiga qo'ying. 2) \"Yo'q\" — aniq, \"balki\" haqiqiy omborga boradi. 3) Kalitga 10 ga yaqin bit va 7 xesh taxminan 1% soxta musbat beradi; har ~5 qo'shimcha bit buni o'n barobar kamaytiradi. 4) Kelajakdagi n ga hisoblang, to'lishni kuzating, kattaroq filtrga qayta quring. 5) Oddiy filtr o'chira olmaydi: sanovchi filtrdan foydalaning yoki jadval bo'yicha qayta quring.",
    },
  },
};

export default text;
