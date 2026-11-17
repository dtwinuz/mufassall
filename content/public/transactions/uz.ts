import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Tranzaksiyalar",
  summary:
    "Hamyon ilovasi pulni bir hisobdan boshqasiga o'tkazadi. Tranzaksiyasiz nima buziladi, ikki server bir vaqtda yozganda tranzaksiya bilan ham nima buziladi va har holatni qaysi izolyatsiya darajasi yoki qulf tuzatadi.",
  learn: [
    "Nega `BEGIN`/`COMMIT`siz ikki `UPDATE` pulni yo'qotishi mumkin",
    "Dirty read, lost update va write skew — haqiqiy ketma-ketlikda",
    "`READ COMMITTED`, `REPEATABLE READ` va `SERIALIZABLE` nimadan himoya qiladi",
    "`SELECT ... FOR UPDATE` va optimistik `version` ustuni",
  ],
  nodes: {
    app: "Hamyon ilovasi",
    api: "API 1",
    api2: "API 2",
    db: "Baza",
    report: "Hisobot job'i",
    fraud: "Firibgarlik tekshiruvi",
  },
  metrics: {
    broken: "Noto'g'ri balans",
    p95: "O'tkazma p95",
    retries: "Qayta urinish",
  },
  steps: {
    transfer: {
      short: "O'tkazma",
      title: "O'tkazma — bu ikki yozuv",
      body: "Foydalanuvchi `acc_42` hisobidan `acc_77` ga 50 000 yuboradi. API ikki so'rov bajaradi: biridan ayiradi, ikkinchisiga qo'shadi.\n\nHar so'rov o'zicha saqlanadi (autocommit). Ko'pincha ikkalasi ham o'tadi va ular orasidagi bo'shliqni hech kim sezmaydi.",
      check: {
        q: "Birinchi `UPDATE` qaytgan zahoti API jarayoni o'ldiriladi. Bazada nima qoladi?",
        options: [
          "Hech narsa o'zgarmaydi: baza yarim o'tkazmani bekor qiladi",
          "Ikkala o'zgarish: ikkinchi `UPDATE` keyin qayta bajariladi",
          "acc_42 dan 50 000 olingan, acc_77 ga esa kelmagan",
        ],
        answer: 2,
        why: "Autocommit'da birinchi `UPDATE` qaytgan zahoti butunlay saqlangan. Qo'shish so'rovi yuborilmadi, bazada esa o'tkazma boshlangani haqida iz yo'q, shuning uchun 50 000 shunchaki yo'qoladi.",
      },
      fields: {
        acc_42: "Yuboruvchi. Birinchi so'rov pulni shu yerdan oladi.",
        acc_77: "Qabul qiluvchi. Ikkinchi so'rov pulni shu yerga qo'shadi.",
        "UPDATE 1": "Bitta qator o'zgardi. Har so'rov qaytgan zahoti butunlay saqlangan.",
      },
    },
    "half-done": {
      short: "Yarim ish",
      title: "Server ikki yozuv orasida o'ldi",
      body: "Birinchi `UPDATE` saqlandi. Keyin API jarayoni o'ldirildi: xotira tugadi, deploy bo'ldi yoki tok o'chdi. Ikkinchi `UPDATE` bazaga yetmadi.\n\n50 000 `acc_42` dan chiqdi va hech qayerga kelmadi. Bazada o'tkazma boshlangani haqida hech qanday iz yo'q.",
      watch: "Jarayoningiz istalgan qatorda to'xtashi mumkin. Ikki yozuv orasidagi kod — pul yo'qoladigan bo'shliq.",
      fields: {
        killed: "Jarayon so'rovlar orasida to'xtadi. Bunday holatda hech qanday `catch` ishlamaydi.",
        "never sent": "Qo'shish yo'qoldi. Baza u kelishi kerakligini bilmaydi ham.",
      },
    },
    atomic: {
      short: "Atomar",
      title: "`BEGIN` ... `COMMIT`: yo hammasi, yo hech narsa",
      body: "Endi ikki so'rov bitta tranzaksiya ichida. `COMMIT` gacha o'zgarishlar faqat qoralama; ulanish uzilsa, baza qoralamani tashlab yuboradi.\n\nBu ACID'dagi **A** — atomarlik. Ikkinchi yarmi **D** — chidamlilik (durability): `COMMIT` qaytgan bo'lsa, o'zgarish server yiqilsa ham saqlanib qoladi.",
      fields: {
        BEGIN: "Tranzaksiyani ochadi. Keyingi so'rovlar bitta butun.",
        COMMIT: "Hammasini birdaniga saqlaydi. Bu qatordan oldin yiqilsa, ikkala hisob ham o'zgarmay qoladi.",
      },
    },
    rules: {
      short: "Qoidalar",
      title: "Qoidalarni baza qo'riqlaydi",
      body: "Xato kod 200 000 bor hisobdan 900 000 olmoqchi bo'ladi. Jadvaldagi `CHECK` cheklovi balans hech qachon noldan pastga tushmasligini aytadi.\n\nSo'rov yiqiladi va butun tranzaksiya bekor bo'ladi. Bu **C** — izchillik (consistency): har `COMMIT` ma'lumotni bir to'g'ri holatdan boshqa to'g'ri holatga o'tkazadi.",
      watch: "Faqat ilova kodida tekshirilgan qoidani bitta unutilgan kod yo'li albatta buzadi.",
      fields: {
        balance_nonneg: "`CHECK (balance >= 0)` cheklovi. Baza uni faqat shu API uchun emas, har bir yozuvchi uchun tekshiradi.",
        ROLLBACK: "Tranzaksiya bekor qilindi. Undan hech narsa saqlanmadi.",
      },
    },
    "dirty-read": {
      short: "Dirty read",
      title: "Birovning qoralamasini o'qish",
      body: "Tungi hisobot barcha balanslarni qo'shadi. Aynan shu payt o'tkazma `acc_42` dan olib bo'lgan, lekin `acc_77` ga hali qo'shmagan. Eng past izolyatsiya darajasida hisobot shu qoralamani ko'radi.\n\nJami 50 000 kam chiqadi, o'tkazma bekor bo'lsa esa hisobot hech qachon bo'lmagan pulni hisoblagan bo'ladi. `READ COMMITTED` (PostgreSQL, Oracle va SQL Server'da standart daraja) commit qilinmagan qatorlarni hech qachon ko'rsatmaydi. PostgreSQL dirty read'ga umuman yo'l qo'ymaydi: `READ UNCOMMITTED` ni `READ COMMITTED` kabi bajaradi.",
      check: {
        q: "Ikki server acc_42 (200 000) dan 50 000 va 30 000 to'laydi: har biri o'qiydi, kodda ayiradi, qayta yozadi. Balans?",
        options: [
          "120 000: `READ COMMITTED` ikkinchisini kuttiradi",
          "170 000: ikkinchi yozuv birinchisining ustidan yozadi",
          "Xato: baza ikkinchi yozuvni rad etadi",
        ],
        answer: 1,
        why: "Ikkalasi ham hech biri commit qilmasdan oldin 200 000 ni o'qidi. 30 000 lik to'lov 150 000 ustidan 170 000 ni yozadi: foydalanuvchidan 50 000 olindi, balansda esa yo'q. `READ COMMITTED` buni to'xtatmaydi.",
      },
      fields: {
        "READ UNCOMMITTED": "Eng kuchsiz daraja: o'qish boshqa tranzaksiyalarning commit qilinmagan o'zgarishlarini ko'radi. Ko'p bazalar unga ruxsat ham bermaydi.",
        SUM: "Hisobot har qatorni o'qiydi, o'tkazma o'rtasidagi qatorni ham.",
        expected: "Haqiqiy jami. Farq — yarim yo'lda ushlangan o'tkazma.",
      },
    },
    "lost-update": {
      short: "Lost update",
      title: "Ikki server, bitta balans",
      body: "Yuk oshdi, endi API serverlari ikkita. `acc_42` dan ikki to'lov birga keladi. Har biri balansni o'qiydi, kodda ayiradi va yangi sonni qayta yozadi.\n\nIkkalasi ham 200 000 ni o'qidi. Ikkinchi yozuv birinchisining ustidan yozadi va bitta to'lov yo'qoladi. Har tranzaksiya o'zicha to'g'ri edi; `READ COMMITTED` buni to'xtatmaydi.",
      watch: "O'qi, kodda hisobla, qayta yoz: ikkinchi o'quvchini kuttiradigan narsa bo'lmasa, bu naqsh yangilanishlarni yo'qotadi.",
      fields: {
        "READ COMMITTED": "Standart daraja. Qoralamalarni yashiradi, lekin ikki tranzaksiyaga bir xil eski qiymatni o'qishga yo'l qo'yadi.",
        T1: "Birinchi to'lov, 50 000.",
        T2: "Ikkinchi to'lov, 30 000. U allaqachon eskirgan qiymatdan hisoblangan sonni yozadi.",
        expected: "200 000 dan ikkala to'lov ayirilgani. Foydalanuvchidan 50 000 olindi, balansda esa yo'q.",
      },
    },
    "for-update": {
      short: "FOR UPDATE",
      title: "O'qiyotganda qatorni qulfla",
      body: "Endi o'qish qator qulfini oladi: `SELECT ... FOR UPDATE`. Shu qatorni xohlagan ikkinchi tranzaksiya birinchisi `COMMIT` qilguncha kutadi, keyin yangi qiymatni o'qiydi.\n\nBu **pessimistik** qulflash: to'qnashuv bo'ladi deb hisoblab, hammani oldindan navbatga qo'yish. Tranzaksiyalar qisqa bo'lsa, arzon.",
      watch: "Oddiy yechish uchun undan ham soddasi bor: bitta so'rovda `SET balance = balance - 50000 WHERE balance >= 50000`, o'qish kerak emas.",
      check: {
        q: "`FOR UPDATE` bilan yozuv orasida firibgarlik tekshiruvi chaqiriladi (300 ms dan 2 s gacha). Yuk ostida nima bo'ladi?",
        options: [
          "Mashhur hisobga to'lovlar navbatga turadi, p95 sakraydi",
          "Hech narsa: qulf bir necha millisekund turadi",
          "Baza uni deadlock xatosi bilan bekor qiladi",
        ],
        answer: 0,
        why: "Tashqi chaqiruv davomida qator qulflangan qoladi. Shu hisobga boshqa to'lovlar uning ortida kutadi, ulanishlar to'planadi va o'tkazma p95 1,4 s ga sakraydi.",
      },
      fields: {
        "FOR UPDATE": "Tanlangan qatorlarni tranzaksiya tugaguncha qulflaydi. Boshqalar o'qiy oladi, lekin qulflay yoki o'zgartira olmaydi.",
        waits: "Ikkinchi to'lov shu yerda to'xtab turadi. U eski balansni hech qachon ko'rmaydi.",
        "120000": "To'g'ri natija: ikkala to'lov ham hisobga olindi.",
      },
    },
    "lock-wait": {
      short: "Qulf kutish",
      title: "Tarmoq chaqiruvi davomida ushlangan qulf",
      body: "O'tkazma o'rtasiga firibgarlik tekshiruvi qo'shildi: qatorni qulfla, tashqi servisni chaqir, keyin yoz. Chaqiruv 300 ms oladi, ba'zan 2 s.\n\nShu butun vaqt qator qulflangan. Mashhur hisobga har boshqa to'lov uning ortida navbatda turadi, ulanishlar to'planadi va p95 1,4 s ga sakraydi.",
      watch: "Qulf ushlab turgan ochiq tranzaksiya ichida hech qachon tarmoqni, foydalanuvchini yoki faylni kutmang.",
      fields: {
        "still waiting": "Baza qator qulfini to'liq bir soniya kutgan tranzaksiyani log'ga yozadi.",
        "4118": "Qulfni ushlab turgan tranzaksiya. U bazani emas, firibgarlik servisini kutyapti.",
      },
    },
    version: {
      short: "Versiya",
      title: "Optimistik: versiyani yozish paytida tekshir",
      body: "Qatorda endi `version` ustuni bor. API qulfsiz o'qiydi, firibgarlik tekshiruvini chaqiradi, keyin versiya hali o'qilgani bilan bir xil bo'lsagina yozadi.\n\nOraliqda kimdir qatorni o'zgartirgan bo'lsa, birorta qator mos kelmaydi. API qayta o'qiydi va yana urinadi. Sekin chaqiruv paytida qulf yo'q, shuning uchun p95 qaytib tushadi.",
      watch: "Optimistik qulflash to'qnashuv kam bo'lganda foyda beradi. Juda issiq qatorda urinishlarning ko'pi yiqiladi va qayta urinishlar qulfdan ham qimmatga tushadi.",
      fields: {
        version: "Har yozuvda oshadigan hisoblagich. `WHERE` yozuvni shu shartga bog'laydi.",
        "UPDATE 0": "Hech bir qator mos kelmadi: boshqa tranzaksiya oldinroq ulgurdi. Hech narsa ustidan yozilmadi.",
        "re-read": "Yangi balans va versiyani o'qi, yana tekshir, yozishga yana urin.",
      },
    },
    "write-skew": {
      short: "Write skew",
      title: "Ikki tekshiruv o'tdi, qoida buzildi",
      body: "Yangi qoida: foydalanuvchi kuniga ko'pi bilan 100 000 yecha oladi. Har yechish bugungi qatorlarni qo'shadi, limitni tekshiradi va yangi qator qo'shadi. Daraja `REPEATABLE READ`: har tranzaksiya muzlatilgan snapshot'ni ko'radi.\n\nIkki yechish birga ishlaydi. Har biri 40 000 ni ko'radi, har biri 50 000 qo'shadi va o'z snapshot'ida har biri haq. Ular har xil qatorlarga tegadi, shuning uchun na qulf, na versiya buni ushlaydi.",
      watch: "Qoida bir nechta qatorni qamrasa-yu, har tranzaksiya ulardan faqat bittasini yozsa, write skew yuz beradi.",
      fields: {
        "REPEATABLE READ": "Butun tranzaksiya uchun bitta snapshot. Bitta qatordagi lost update'ni to'xtatadi, qatorlar orasidagi to'qnashuvni emas.",
        SUM: "Ikkala tranzaksiya bir xil jamini o'qiydi, bir-birining yangi qatorisiz.",
        INSERT: "Har biri o'z yangi qatorini qo'shadi. Qulflash uchun umumiy qator yo'q.",
        result: "Kunlik limitdan 40 000 ortiq, holbuki har tekshiruv o'tgan edi.",
      },
    },
    serializable: {
      short: "Serializable",
      title: "`SERIALIZABLE`: go'yo birma-bir",
      body: "Yechish endi `SERIALIZABLE` darajasida ishlaydi. Baza har tranzaksiya nimani o'qigani va yozganini kuzatadi. Natija hech bir birma-bir tartibda chiqa olmasa, ulardan birini to'xtatadi.\n\nTo'xtatilgani `40001` xatosini oladi va API butun tranzaksiyani qaytadan bajaradi. Endi u 90 000 ni ko'radi va rad etadi. Narxi: bir qancha qayta urinish va bazada qo'shimcha ish.",
      watch: "Faqat oxirgi so'rovni emas, butun tranzaksiyani birinchi o'qishdan boshlab qaytaring va urinishlar sonini cheklang.",
      fields: {
        SERIALIZABLE: "Eng qat'iy daraja: natija tranzaksiyalarning qandaydir ketma-ket tartibiga teng.",
        "40001": "Serializatsiya xatosi. Bu bug emas: qayta urinish uchun kutilgan signal.",
        retry: "Yana `BEGIN` dan. Ikkinchi urinish boshqa yechishni o'qiydi va limitda to'xtaydi.",
      },
    },
    recap: {
      short: "Xulosa",
      title: "Xulosa",
      body: "Pul yozish uchun besh qoida.\n\n1) Bir-biriga tegishli bir nechta yozuv bitta tranzaksiyada. 2) Qoidalar bazada cheklov sifatida yashaydi. 3) O'qib-yozishga `FOR UPDATE`, `version` tekshiruvi yoki bitta atomar so'rov kerak. 4) Tarmoq chaqiruvi davomida qulf ushlamang. 5) Bir necha qatorga oid qoidalarga `SERIALIZABLE` kerak va har `40001` to'liq qayta urinish oladi.",
    },
  },
};

export default text;
