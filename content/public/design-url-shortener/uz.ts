import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "URL qisqartirgich loyihasi",
  summary:
    "Uzun havola kiradi, qisqa kod chiqadi, har bosish esa redirect. Butun servisni qadamma-qadam quramiz: hisob-kitob, qisqa kod, redirect, kesh, replika, bosishlar statistikasi, alias va muddat.",
  learn: [
    "O'qish ko'p bo'lgan servis hajmini bir necha raqamdan qanday hisoblash",
    "Nega hisoblagich + base62 URL hash'idan yaxshiroq",
    "301 yoki 302: har birida nimadan voz kechasiz",
    "Kesh, replika va navbat bazadan yukni qayerda oladi",
  ],
  nodes: {
    user: "Brauzer",
    api: "Havola API",
    db: "Havolalar bazasi (primary)",
    cache: "Havola keshi",
    replica: "O'qish replikasi",
    queue: "Bosishlar navbati",
    worker: "Bosishlar worker'i",
    stats: "Statistika bazasi",
  },
  metrics: {
    p99: "Redirect p99",
    "primary-reads": "Primary'dan o'qish",
    collisions: "Kod to'qnashuvi",
  },
  steps: {
    estimate: {
      short: "Hisob",
      title: "Nima quramiz va qancha katta",
      body: "Ikki chaqiruv: `POST /api/links` uzun URL'ni qisqa kodga aylantiradi, `GET /<code>` esa unga yo'naltiradi. Oyiga 100 million yangi havola desak, bu taxminan **40 yozish/s**. Havola yaratilganidan ko'ra ancha ko'p bosiladi, taxminan 100:1, demak o'rtacha **4 000 redirect/s**, cho'qqida esa uch barobar.\n\nXotira: besh yilda 6 milliard havola, har biri ~500 bayt, jami ~3 TB. 7 belgili base62 kod 62^7 ≈ 3,5 trillion qiymat beradi, joy yetarli. Tizimda o'qish ustun: quyidagi har qaror redirect yo'lini himoya qiladi.",
      check: {
        q: "Birinchi g'oya: kod — URL MD5'ining base62 dagi dastlabki 7 belgisi. Havolalar ko'payganda nima buziladi?",
        options: [
          "Hech narsa: 62^7 qiymat yetarli joy",
          "Turli URL'lar to'qnashadi va insert yiqiladi",
          "Kodlarni ketma-ket taxmin qilish mumkin",
        ],
        answer: 1,
        why: "Hash'ni kesish uning ko'p bitini tashlab yuboradi va turli URL'lar bir xil kodga tusha boshlaydi. Har to'qnashuv — muvaffaqiyatsiz insert va takror: bu yerda kuniga ~40, jadval o'sgan sari ko'payadi.",
      },
      fields: {
        long_url: "Manzil. Uni tekshiring: sxema, uzunlik va ma'lum fishing hostlar ro'yxati.",
        code: "Qisqa kalit. Havolalar jadvalida primary key, keyin kesh kaliti ham shu.",
        short_url: "Foydalanuvchi ulashadigan narsa: qisqa domenimiz + kod.",
      },
    },
    hash: {
      short: "Hash kod",
      title: "URL hash'i to'qnashadi",
      body: "Birinchi g'oya: uzun URL'dan MD5 olamiz, base62 ga o'giramiz va dastlabki 7 belgini qoldiramiz. Hech qanday kelishuv kerak emas. Lekin hash'ni kesish uning ko'p bitini tashlab yuboradi va turli URL'lar bir xil kodga tusha boshlaydi.\n\nHar to'qnashuv: muvaffaqiyatsiz insert, salt bilan takror va qo'shimcha so'rov. Milliardlab qatorda bu faqat o'sadi. Yana: ikki foydalanuvchining bir xil URL'i doim bitta kod oladi, demak alohida statistika yoki muddat bo'lmaydi.",
      watch: "Hash'ning 7 belgili boshi noyob emas. Unique cheklov uni ushlaydi, lekin endi har yozish takrorni talab qilishi mumkin.",
      fields: {
        q7Bx2Lm: "Hash'ning dastlabki 7 ta base62 belgisi. Boshqa URL allaqachon xuddi shu boshni bergan.",
        "duplicate key": "`code` bo'yicha primary key ikkinchi qatorni rad etadi. API boshqa kirish bilan qayta urinishi kerak.",
      },
    },
    counter: {
      short: "Hisoblagich",
      title: "Hisoblagich + base62: to'qnashuv bo'lishi mumkin emas",
      body: "Har havolaga noyob raqam beramiz va uni base62 da yozamiz: 125000417 → `8sujL`. Turli raqamlar doim turli kod beradi, to'qnashuv imkonsiz.\n\nHar raqam uchun bazaga bormaslik uchun har API server bitta update bilan 1 000 ta id'lik **blok** oladi va ularni xotiradan tarqatadi. Server qulasa, blokining qolganini yo'qotadi xolos: bo'shliq mayli, takror hech qachon bo'lmaydi.",
      watch: "Ketma-ket kodlarni taxmin qilish oson: istalgan odam `8sujK`, `8sujL`, `8sujM` ni aylanib chiqadi. Kodlashdan oldin raqamni qaytariladigan aralashtirish bilan chalkashtiring.",
      fields: {
        next_id: "Endi shu serverga tegishli blok oxiri: 125000001 dan 125001000 gacha id'lar.",
        RETURNING: "Yangi qiymatni o'sha atomar update ichida o'qiydi, shuning uchun ikki server bir blokni ololmaydi.",
      },
    },
    redirect: {
      short: "Redirect",
      title: "Redirect: 301 emas, 302",
      body: "Bosish `GET /8sujL` bo'lib keladi. API uzun URL'ni topadi va redirect status hamda `Location` sarlavhasi bilan javob beradi. Brauzer unga o'tadi.\n\n**301** (doimiy) brauzerda keshlanadi: keyingi bosish bizga yetib kelmaydi. Yuk kamayadi, lekin bosishlar sanog'i yo'qoladi, havolani o'zgartirib ham, muddatini tugatib ham bo'lmaydi. **302** (vaqtinchalik) har bosishni bizga qaytaradi. Biz 302 ni tanlaymiz va buning narxini trafik bilan to'laymiz.",
      check: {
        q: "Trafik 4 000 redirect/s ga yetdi, har biri primary'da qidiruv. Nima buziladi?",
        options: [
          "Primary to'lib qoladi; p99 900 ms ga chiqadi",
          "Hech narsa: indeksli qidiruv 1 ms dan kam",
          "Brauzerlar 302 javoblarni keshlay boshlaydi",
        ],
        answer: 0,
        why: "Primary barcha yozishlarni ham oladi. CPU 96% ga yetadi, har qidiruv navbatda kutadi va p99 30 ms dan 900 ms ga chiqadi, ma'lumot deyarli o'zgarmasa ham.",
      },
      fields: {
        "302": "Vaqtinchalik redirect: brauzer keyingi safar yana so'rashi shart.",
        Location: "Brauzer keyin qayerga boradi: saqlangan uzun URL.",
        "Cache-Control": "Brauzer va proxy'larga redirect'ni saqlamaslikni aytadi, keyingi bosish ham sanaladi.",
      },
    },
    "read-flood": {
      short: "O'qish oqimi",
      title: "Har bosish bazadan o'qish",
      body: "Trafik bahodagi 4 000 redirect/s ga yetdi. Har biri primary'da bir xil qidiruvni bajaradi, primary esa barcha yozishlarni ham oladi. CPU 96% da, p99 900 ms ga chiqdi.\n\nMa'lumot deyarli o'zgarmaydi: havola bir marta yoziladi va minglab marta o'qiladi. Uni har safar bazadan o'qish isrof.",
      fields: {
        code: "Qidiruv kaliti. Indeks joyida; muammo qidiruvlar sonida.",
        Time: "Odatda millisekunddan kam. Bu yukda so'rov CPU uchun navbatda turadi.",
      },
    },
    cache: {
      short: "Kesh",
      title: "Baza oldida kesh",
      body: "API avval keshdan `link:<code>` ni so'raydi. Cache hit bo'lsa darhol redirect qiladi. Miss bo'lsa bazadan o'qiydi va javobni TTL bilan keshga yozadi (cache-aside).\n\nBosishlar power law bo'yicha taqsimlangan: kichik bir guruh yangi havolalar trafikning ko'p qismini oladi. Kichkina kesh redirect'larning ~90% ini beradi, primary'dan o'qish 4 000/s dan 400/s ga tushadi.",
      watch: "Mashhur havola keshdan chiqib ketsa, bir vaqtda miss'lar to'lqini keladi. Issiq kalitlarni oldinroq yangilang yoki bitta so'rov to'ldirsin, qolganlari kutsin.",
      fields: {
        GET: "Xotirada bitta kalit qidiruvi, millisekunddan ancha kam.",
        link: "Kalit prefiksi. Havola yozuvlarini shu keshdagi boshqa ma'lumotdan ajratadi.",
      },
    },
    replicas: {
      short: "Replika",
      title: "Kesh miss'lari read replikaga",
      body: "Qolgan miss'lar primary'dan o'zgarishlarni oqim bilan oladigan read replikaga o'tadi. Endi primary faqat yozishni oladi; o'qish o'sganda yana replika qo'shamiz.\n\nReplikatsiya asinxron, shuning uchun replika biroz orqada. Bu yerda kechikish (lag) 180 ms.",
      watch: "Lag ichida yaratilib bosilgan havola replikada topilmaydi va 404 olishi mumkin. Miss bo'lsa 404 dan oldin primary'dan so'rang yoki yangi havolani yaratishda keshga ham yozing.",
      check: {
        q: "Marketing bosishlar sonini istaydi, har redirect `clicks = clicks + 1` qiladi. Viral havolada nima bo'ladi?",
        options: [
          "Hech narsa: qo'shimcha yukni kesh ko'taradi",
          "Replika 180 ms orqada, sanoq chalkashadi",
          "Update'lar bitta qatorda navbatga turadi; p99 320 ms",
        ],
        answer: 2,
        why: "Yozish keshga ham, replikaga ham bormaydi: 4 000 o'qish/s primary'da 4 000 yozish/s ga aylanadi. Viral havola bitta qatorga minglab update degani; ular qator qulfini kutadi, redirect esa ular bilan birga kutadi.",
      },
      fields: {
        lag: "Replika primary'dan qancha orqada. Kuzatib boring; bir necha soniyadan oshsa alert.",
      },
    },
    "click-count": {
      short: "Bosish soni",
      title: "Bosishlarni havolalar jadvalida sanash",
      body: "Marketing bosishlar sonini so'raydi. Tez yo'l: har redirect'da `clicks` ustunini oshirish. Bu 4 000 o'qish/s ni yana primary'ga 4 000 yozish/s qilib qaytaradi.\n\nYomoni: viral havola **bitta qatorga** minglab update degani. Ular shu qator qulfida navbatga turadi, redirect update'ni kutadi va p99 320 ms ga sakraydi.",
      fields: {
        clicks: "Har havolaga bitta hisoblagich, joyida yangilanadi: har bosish bitta qator uchun kurashadi.",
        "lock wait": "Vaqtning ko'pi shu qatorning boshqa update'lari tugashini kutishga ketadi.",
      },
    },
    "click-queue": {
      short: "Navbat",
      title: "Bosishlar navbatga, worker sanaydi",
      body: "Endi redirect faqat kichik hodisa (event) chiqaradi va javob qaytaradi. Worker navbatni o'qiydi, har havola bo'yicha har daqiqadagi bosishlarni qo'shadi va alohida statistika bazasiga bitta qator bilan yozadi.\n\nEvent kaliti kod, shuning uchun bitta havolaning barcha bosishlari bitta partition'ga tushadi va bitta worker ularni qulfsiz qo'sha oladi. Redirect p99 yana 12 ms.",
      watch: "Navbat ishlamasa ham redirect ishlashi shart. Hodisalarni kichik lokal bufer bilan javob kutmasdan yuboring: bir nechta bosish yo'qolsa mayli, redirect yiqilsa yo'q.",
      fields: {
        partition: "`8sujL` kalitidan tanlanadi: bu havolaning har bosishi 7-partition'ga, tartib bilan tushadi.",
        ts: "Bosish vaqti, kech kelgan event ham to'g'ri daqiqaga tushsin.",
        country: "Edge (chekka server) darajasida IP'dan olinadi. Xom IP emas, faqat mamlakat saqlanadi.",
        offset: "Hodisaning partition'dagi o'rni. Worker uni batch yozilgandan keyin commit qiladi.",
      },
    },
    alias: {
      short: "Alias",
      title: "O'z alias'i: bitta nomlar maydoni, ikki manba",
      body: "Foydalanuvchilar `/spring-sale` kabi o'qiladigan havola istaydi. Alias foydalanuvchi tanlagan kod xolos va o'sha jadvalda saqlanadi. Insert bitta so'rovda yo yutadi, yo nom band ekanini topadi: tekshirish va yozish orasida poyga yo'q.\n\nYaratilgan kodlar va alias'lar hech qachon to'qnashmasligi kerak: alias'da `-` bo'lsin yoki kamida 8 belgi bo'lsin, yaratilgan kodlar esa hech qachon unday emas. Shunda hisoblagich birov olib qo'ygan kodni bermaydi.",
      fields: {
        "spring-sale": "So'ralgan alias. Unda chiziqcha bor, demak u yaratilgan kod bo'la olmaydi.",
        "ON CONFLICT": "Kod mavjud bo'lsa, hech narsa yozilmaydi. Boshqa so'rov poyga qila oladigan alohida tekshiruv yo'q.",
        "409": "Nol qator yozildi: alias band. API 409 Conflict qaytaradi.",
      },
    },
    expiry: {
      short: "Muddat",
      title: "Muddati tugaydigan havolalar",
      body: "Havolada `expires_at` bo'lishi mumkin. Redirect uni tekshiradi va undan keyin **410 Gone** qaytaradi. Kesh TTL'i bir soat va qolgan vaqtning kichigi, shuning uchun muddati o'tgan havola keshda yashab qolmaydi.\n\nFon vazifasi tunda muddati o'tgan qatorlarni kichik bo'laklarda o'chiradi. Hisoblagich kodlari qayta ishlatilmaydi, shuning uchun eski bosma havola birdan boshqa joyga olib bormaydi.",
      fields: {
        EX: "Soniyalarda TTL. Bu yerda 3600, `expires_at` gacha qolgan vaqt bilan cheklangan.",
      },
    },
    recap: {
      short: "Xulosa",
      title: "Xulosa",
      body: "Redirect yo'li bu mahsulotning o'zi: uni qisqa tuting va primary'ni undan chetda saqlang.\n\n1) Avval hisoblang: 40 yozish/s, 4 000 o'qish/s, 3 TB. 2) Bloklab olingan hisoblagich + base62 takrorlarsiz noyob kod beradi. 3) 302 har bosishni ko'rinadigan qiladi. 4) Issiq havolalarga kesh, miss'larga replika, bosishlarni sanashga navbat. 5) Alias jadvalni bo'lishadi, lekin kod shaklini emas; muddat kesh TTL'ini cheklaydi.",
    },
  },
};

export default text;
