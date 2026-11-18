import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Pul va yaxlitlash",
  summary:
    "Do'kon so'mda sotadi va 12% QQS bilan elektron hisob-faktura chiqaradi. Narxlar suzuvchi nuqtali sonlar bo'lsa, aynan to'g'ri summadagi to'lov tenglik tekshiruvidan o'tmaydi. Summalar valyutasi bilan birga eng kichik birlikdagi butun songa aylanadi, keyin esa asl savollar boshlanadi: qaysi yaxlitlash qoidasi, qayerda yaxlitlash (har qatorda yoki butun hujjatda), summani bir tiyin ham yo'qotmasdan qanday bo'lish, bir haftadan keyin ham isbotlay oladigan kurs bilan qanday konvertatsiya qilish va nega formatlash faqat eng chekkada bo'lishi kerak.",
  learn: [
    "Nega ikkilik suzuvchi nuqta 0.1 yoki 19 990.10 ni aniq saqlay olmaydi va valyutali eng kichik birlikdagi butun sonlar buni qanday hal qiladi (0, 2 va 3 kasr xonali valyutalar)",
    "Yaxlitlash usullari: half-up, half-even (bank usuli) va nosimmetrik Math.round, hamda nega qoida bir marta yozib qo'yiladigan biznes qarori",
    "Har qatorda yoki butun hisob-fakturada yaxlitlash: QQS'dagi 1 tiyinlik farq va jami summalar chop etilgan qatorlar yig'indisi degan qoida",
    "Summani eng katta qoldiq usuli bilan bo'lish, valyutani saqlangan kurs va vaqt bilan konvertatsiya qilish va lokal bo'yicha formatlashni chekkada qilish",
  ],
  nodes: {
    app: "Checkout",
    api: "Buyurtma servisi",
    db: "Buyurtmalar bazasi",
    tax: "Hisob-faktura tizimi",
    fx: "Kurs manbai",
    report: "Hisobot job'i",
  },
  metrics: {
    drift: "Farq, tiyin",
    bad: "Mos kelmagan hujjatlar",
    gap: "Qaytarishdagi kamomad, tiyin",
  },
  steps: {
    cart: {
      short: "Buyurtma",
      title: "Narxlari oddiy son bo'lgan buyurtma",
      body: "Checkout buyurtma yuboradi: 19 990.10 so'mlik uch quti choy. 1 so'm 100 tiyin. Narxlar JSON sonlari sifatida boradi, buyurtma servisi ularni ko'paytiradi, qo'shadi va buyurtmani to'lov kutilmoqda holatida saqlaydi.\n\nZararsiz ko'rinadi: bular shunchaki ikki kasr xonali sonlar.",
      fields: {
        price: "19 990.10 so'm JSON soni sifatida yuborilgan, demak u ikkilik float'ga aylanadi.",
        qty: "Soni: butun son, bu yerda muammo yo'q.",
        total: "Mijozda ham, serverda ham float'lar bilan hisoblangan.",
        status: "Buyurtma aynan shu summadagi to'lov kelguncha kutadi.",
      },
    },
    float: {
      short: "Float",
      title: "To'g'ri to'lov jami summaga mos kelmaydi",
      body: "Ikkilik suzuvchi nuqtada 19 990.10 eng yaqin ikkilik kasr sifatida saqlanadi, u esa biroz farq qiladi. 3 ga ko'paytirilganda 59 970.299999999996 chiqadi. Mijoz 59 970.30 to'laydi, solishtirish `false` deydi va buyurtma to'lanmagan bo'lib qoladi.\n\nKuniga 180 ga yaqin buyurtma shunday osilib qoladi. 19 990.10 dan bir million qatorni qo'shsangiz, natija 0.016907 so'mga farq qiladi, shuning uchun hisobotlar ham mos kelmaydi.",
      watch: "Solishtirishdan oldin float'ni yaxlitlash faqat alomatni yashiradi; minglab qiymatlarning navbatdagi yig'indisi uni qaytarib olib keladi.",
      check: {
        q: "Nega 0.1 + 0.2 natijasi 0.30000000000000004?",
        options: [
          "Bu JavaScript'dagi bug, boshqa tillarda yo'q",
          "Ikkilik suzuvchi nuqta 0.1 ni aniq saqlay olmaydi, xuddi o'nlik kasrda 1/3 ni yozib bo'lmagani kabi; double ishlatadigan har qanday til shunday ishlaydi",
          "Protsessor turli mashinalarda turlicha yaxlitlaydi",
        ],
        answer: 1,
        why: "Ikkilik sanoqda 0.1 cheksiz kasr, shuning uchun double o'zi saqlay oladigan eng yaqin qiymatni oladi. Bu kichik xatolar deterministik, lekin ular yig'iladi va tenglikni buzadi. Pulga aniq arifmetika kerak: butun sonlar yoki decimal turi.",
      },
      fields: {
        "59970.299999999996": "Hech qachon aynan 19 990.10 bo'lmagan narxning uch baravari.",
        "0.30000000000000004": "Klassik misol: o'sha xato kichikroq miqyosda.",
        false: "To'lov tiyinigacha to'g'ri, tekshiruv esa baribir o'tmaydi.",
        "19990100000.016907": "Xato har bir qo'shishda o'sadi: hisobotlar siljiydi.",
      },
    },
    minor: {
      short: "Eng kichik birlik",
      title: "Eng kichik birlikdagi butun sonlarni saqla",
      body: "Endi har bir summa **eng kichik birlikdagi** butun son va valyutadan iborat: UZS'da 1 999 010 tiyin. Butun sonlarni ko'paytirish va qo'shish har qanday tilda aniq, shuning uchun 3 × 1 999 010 doim 5 997 030.\n\nValyutada nechta kasr xonasi borligi kodga yozilgan `/ 100` dan emas, jadvaldan (ISO 4217) olinadi: iyenada kasr yo'q, Quvayt dinorida uchta. JSON'da summa satr bo'ladi, shunda hech bir parser uni qayta float'ga aylantirmaydi; bazada esa `bigint`.",
      watch: "Valyutasiz summa kutib turgan bug: 4 999 USD'da ham, UZS'da ham butunlay boshqa pul.",
      fields: {
        minor: "Tiyindagi summa, satr ichidagi butun son.",
        currency: "Doim summa yonida: ikkalasi birgalikda bitta qiymat.",
        total: "Xuddi shu ko'rinish: butun sonlar yig'indisi, aniq.",
        exponent: "Valyutada nechta kasr xonasi bor.",
        JPY: "Eng kichik birlik yo'q: 4 999 iyena 4999 bo'lib saqlanadi.",
        KWD: "Uch kasr xonasi: 12.345 dinor 12345 bo'lib saqlanadi.",
      },
    },
    modes: {
      short: "Usullar",
      title: "Yaxlitlash usullari: aynan yarimda nima bo'ladi",
      body: "Butun sonlar yaxlitlashni yo'q qilmaydi: 10 003.00 so'mdan 1.5% komissiya 15 004.5 tiyin, undirish esa faqat butun tiyinda mumkin. **Half-up** .5 ni doim yuqoriga oladi. **Half-even** (bank yaxlitlashi) uni juft qo'shniga oladi, shunda yarimlar teng miqdorda yuqoriga ham, pastga ham ketadi.\n\nOyiga 200 000 ta yarimda half-up aniq summalardan taxminan 1 000 so'm ko'p undiradi, half-even esa deyarli hech narsa. Qaysi biri to'g'ri ekani texnik savol emas: soliq qoidalari odatda half-up'ni belgilaydi, shartnomalar boshqasini belgilashi mumkin. Qoidani yozib qo'y va hamma joyda bitta yaxlitlash funksiyasini ishlat.",
      check: {
        q: "Qaytarish -2.5 tiyin bo'lib chiqdi, kod esa JavaScript'ning `Math.round` idan foydalanadi. Natija qanday?",
        options: ["-3", "-2", "Xato: manfiy summani yaxlitlab bo'lmaydi"],
        answer: 1,
        why: "`Math.round` yarimlarni musbat cheksizlik tomonga oladi: 2.5 3 ga, -2.5 esa -2 ga aylanadi. Undirish va uning qaytarilishi turlicha yaxlitlanadi. Usuli aniq ko'rsatilgan nomli yaxlitlash funksiyasi bu kutilmagan holatdan saqlaydi.",
      },
      fields: {
        "half-up": "Yarim noldan uzoqqa: 15 004.5 15 005 ga, -2.5 -3 ga aylanadi.",
        "half-even": "Yarim juft qo'shniga: 15 004.5 15 004 ga, 15 005.5 15 006 ga aylanadi.",
        "Math.round": "Ikkalasi ham emas: yarimlar musbat va manfiy sonlarda bir xil yuqoriga ketadi.",
        "+1 000 so'm": "Kichik, lekin tizimli siljish, doim bir tomonga.",
        "one function": "Yaxlitlaydigan bitta joy, usuli aniq argument sifatida.",
      },
    },
    perline: {
      short: "Har qatorda",
      title: "Qatorlar QQS'i jami summaga teng chiqmaydi",
      body: "Hisob-fakturada uchta qator bor. Servis har bir qatorning QQS'ini yaxlitlaydi, jami 10 660.72 so'm chiqadi. Jami qator uchun esa umumiy sof summaning 12% ini bir marta hisoblaydi: 10 660.7148, yaxlitlanganda 10 660.71.\n\nBir tiyin farq. Hisob-faktura tizimi jami summa qatorlar yig'indisiga tengligini tekshiradi va hisob-fakturani rad etadi: kuniga 120 taga yaqin.",
      check: {
        q: "\"Jami QQS\" maydoniga qaysi son yoziladi?",
        options: [
          "10 660.71: jami summaning 12% i, faqat bir marta yaxlitlangan",
          "10 660.72: yaxlitlangan qatorlar yig'indisi, shunda hujjat o'zaro mos keladi",
          "Istalgani: 1 tiyinlik farq ahamiyatsiz",
        ],
        answer: 1,
        why: "Hujjat chop etilgan ko'rinishida mos kelishi kerak: jami summalar qatorlar yig'indisi. Bu elektron hisob-faktura formati aynan shuni tekshiradi. Ba'zi qoidalar aksincha, avval jamini yaxlitlab, keyin qatorlarni unga taqsimlash orqali moslaydi; qaysi yo'l bo'lmasin, qoida bir marta yoziladi va chop etilgan sonlar aniq mos keladi.",
      },
      fields: {
        "VAT rounded": "Har bir qator alohida yaxlitlanadi: 0.29, 0.43, 0.00.",
        "sum of lines": "Hisob-fakturani o'qigan odam qo'shib chiqadigan QQS: 10 660.72.",
        "10 660.71": "Jamidan hisoblangan QQS: arifmetika to'g'ri, hujjat esa o'zaro mos emas.",
        rejected: "Qabul qiluvchi tomon summalarni tiyinigacha tekshiradi.",
      },
    },
    oneplace: {
      short: "Bitta qoida",
      title: "Har qatorda bir marta yaxlitla, saqlanganini qo'sh",
      body: "Endi qoida shunday: QQS har bir qatorda, half-up bilan, qator yaratilganda yaxlitlanadi va saqlanadi. Har bir jami summa saqlangan qator summalarining yig'indisi, yaxlitlanmagan qiymatlardan hech qachon qayta hisoblanmaydi.\n\nHisob-fakturada aynan saqlangan sonlar bor, jami summalar mos keladi va hisob-faktura tizimi uni qabul qiladi.",
      watch: "Faqat kirish qiymatlarini emas, yaxlitlangan summalarni saqla. Agar QQS keyinroq, stavka yoki kod o'zgargach qayta hisoblansa, chiqarilgan hujjatning sonlari o'zgarib ketadi.",
      fields: {
        net_minor: "Qatorning sof summasi tiyinda, saqlanganidek.",
        vat_minor: "Qator yaratilganda bir marta yaxlitlangan va boshqa hech qachon.",
        total_vat_minor: "Uchta `vat_minor` yig'indisi: 1 066 072 tiyin.",
        accepted: "Jami summalar qatorlar yig'indisiga teng.",
      },
    },
    split: {
      short: "Bo'lish",
      title: "Uchta to'lov, bitta tiyin yetishmaydi",
      body: "Mijoz 100 000.00 so'mni 3 oylik to'lov bilan to'laydi. Kod bo'ladi va har bir qismni yaxlitlaydi: uch marta 33 333.33 so'm. Bu 99 999.99: bir tiyin hech qachon undirilmaydi.\n\nArzimas eshitiladi, lekin endi to'lov rejasi buyurtma summasiga teng emas va oyiga 52 000 ta muddatli to'lov rejasi solishtiruvdan o'tmaydi.",
      check: {
        q: "100 000.00 so'mni 3 ta to'lovga qanday bo'lasiz?",
        options: [
          "Uch marta 33 333.33",
          "33 333.34 + 33 333.33 + 33 333.33",
          "Uch marta 33 333.33, yetishmagan tiyinni esa hisobdan chiqarish",
        ],
        answer: 1,
        why: "Qismlar butunga teng bo'lishi kerak. Har kimga pastga yaxlitlangan ulushni ber, keyin ortib qolgan tiyinlarni bittadan tarqat. Hisobdan chiqarish oson tuyuladi, lekin har bir hisobdan chiqarish buxgalteriyada tushuntirilmagan farq.",
      },
      fields: {
        exact: "10 000 000 tiyinning uchdan biri butun son emas.",
        "round()": "Har bir qismni alohida yaxlitlash boshqalarini hisobga olmaydi.",
        "9 999 999": "Qismlar endi butunga teng emas.",
        "1 tiyin": "Kichik, lekin yig'indilarni solishtiradigan har bir tekshiruvni buzadi.",
      },
    },
    allocate: {
      short: "Taqsimlash",
      title: "Qoldiqni eng kattasidan boshlab taqsimla",
      body: "**Taqsimlash** (allocation) summani vaznlar bo'yicha qismlar doim butunga teng bo'ladigan qilib bo'ladi. Har bir qism avval o'zining pastga yaxlitlangan aniq ulushini oladi; ortib qolgan tiyinlar bittadan eng katta qoldiqli qismlarga beriladi (eng katta qoldiq usuli).\n\n5 000.00 so'mlik chegirma uchta qatorga 150 754 + 138 191 + 211 055 tiyin bo'lib tushadi: aynan 500 000. Muddatli to'lovlar ham teng vaznlar bilan xuddi shunday: 33 333.34 + 33 333.33 + 33 333.33.",
      watch: "Teng qoldiqlarni qat'iy tartibda, masalan qator raqami bo'yicha ajrat, shunda o'sha summani qayta bo'lish o'sha qismlarni beradi.",
      fields: {
        floor: "Hamma avval pastga yaxlitlangan ulushni oladi.",
        remainder: "Har bir qism pastga yaxlitlashda nima yo'qotgani.",
        "2 tiyin left": "Butun minus floor'lar yig'indisi: doim qismlar sonidan kam.",
        "largest remainders": "Ortgan tiyinlar eng katta qoldiqli 2- va 1-qatorlarga ketadi.",
        "3 333 334": "Birinchi to'lov bir tiyin katta, reja esa butunga teng.",
      },
    },
    fx: {
      short: "Konvertatsiya",
      title: "Bugungi kurs bilan qaytarish",
      body: "Mahsulot narxi 49.99 USD, mijoz esa so'mda to'laydi. 9-noyabrda servis dollarni 12 687.43 so'mdan konvertatsiya qiladi va 634 244.63 so'm undiradi.\n\nTo'qqiz kundan keyin mijoz mahsulotni qaytaradi. Qaytarish kodi kursni qaytadan oladi, 12 590.10 ni ko'radi va 629 379.10 so'm qaytaradi: to'laganidan 4 865.53 kam. Asl kurssiz buning sababini hech kim tushuntira olmaydi.",
      check: {
        q: "Qaytarishda qaysi kurs ishlatilishi kerak?",
        options: [
          "Bugungi kurs: dollarning hozirgi qiymati shu",
          "Qaytarish shartlarida aytilganidek, undirish bilan birga saqlangan kurs",
          "Ikki kursning o'rtachasi",
        ],
        answer: 1,
        why: "Qaytarish aniq bir to'lovni bekor qiladi, shuning uchun o'sha to'lovning sonlarini ishlatadi: saqlangan summa va kurs. Siyosat boshqacha bo'lishi mumkin, lekin u yozib qo'yilishi shart va faqat asl kurs saqlangan bo'lsagina uni qo'llash mumkin.",
      },
      fields: {
        "634 244.63": "Undirilgan summa, tiyinigacha yaxlitlangan.",
        "rate fetched again": "Bug: eski kurs hech qachon saqlanmagan, shuning uchun qaytadan olinadi.",
        "629 379.10": "O'sha 49.99 USD boshqa kunning kursida.",
        "4 865.53": "Mijozning yo'qotishi va support'ga murojaat.",
      },
    },
    fxrate: {
      short: "Saqlangan kurs",
      title: "Kursni, uning manbai va vaqtini konvertatsiya bilan birga saqla",
      body: "Endi har bir konvertatsiya yozuv: asl summa, aniq o'nlik kasr ko'rinishidagi kurs, u qayerdan va qachon olingani, konvertatsiya qilingan summa va yaxlitlash usuli. Arifmetika butun sonlarda: 4 999 sent × dollariga 1 268 743 tiyin ÷ 100, half-up bilan bir marta yaxlitlanadi.\n\nQaytarish shu yozuvni o'qiydi va aynan 63 424 463 tiyin qaytaradi. Oylar o'tib auditor har bir sonni qayta hisoblab chiqa oladi.",
      fields: {
        rate: "Float emas, o'nlik kasrli satr: dollariga 12 687.43 so'm.",
        rate_as_of: "Kurs amal qilgan payt. Kurslar har kuni, ba'zan tezroq o'zgaradi.",
        converted: "Natija saqlanadi, keyin qayta hisoblanmaydi.",
        rounding: "Usul yozuvning bir qismi, shunda natijani tekshirish mumkin.",
        "stored rate": "Qaytarish undirishning sonlarini qayta ishlatadi.",
      },
    },
    display: {
      short: "Ko'rsatish",
      title: "Faqat chekkada, lokal bo'yicha formatla",
      body: "Baza, API'lar va log'lar eng kichik birlik va valyutani saqlaydi. Ularni faqat ilova, eng oxirgi daqiqada, lokal qoidalari bilan matnga aylantiradi: o'zbek va rus tilida minglar orasida bo'sh joy va o'nlik vergul, ingliz tilida vergul va nuqta.\n\nKasr xonalari soni valyutadan olinadi: iyena kasrsiz, dinor uch xonali.",
      watch: "Formatlangan summani hech qachon qaytadan songa parse qilma: \"634,244\" bir lokalda 634 ming, boshqasida 634 butun 244.",
      fields: {
        "uz-Latn": "634 244,63 so'm: minglar uchun bo'sh joy, kasr uchun vergul.",
        "en-US": "Minglar uchun vergul, kasr uchun nuqta, kod oldinda.",
        "0 decimals": "Iyenada eng kichik birlik yo'q, bo'ladigan narsa ham yo'q.",
        "3 decimals": "Dinor 100 ga emas, 1 000 ga bo'linadi.",
        "minor units": "Ekrandan boshqa hamma joy butun sonlar va valyuta kodlarida gaplashadi.",
      },
    },
    recap: {
      short: "Xulosa",
      title: "Xulosa",
      body: "Pul uchun yetti qoida.\n\n1) Hech qachon float emas: eng kichik birlikdagi butun sonlar, doim valyuta bilan. 2) Kasr xonalari valyuta jadvalidan olinadi: 0, 2 yoki 3. 3) Yaxlitlash usulini qoidaga ko'ra tanla va usuli aniq ko'rsatilgan bitta funksiyani ishlat. 4) Bitta belgilangan joyda yaxlitla, yaxlitlangan summalarni saqla va jami summalar saqlangan narsalar yig'indisi bo'lsin. 5) Taqsimlash bilan bo'l, shunda qismlar doim butunga teng. 6) Har bir konvertatsiyani kursi, manbai va vaqti bilan saqla va qaytarishda qayta ishlat. 7) Lokal bo'yicha faqat ilovada formatla.",
    },
  },
  scenarios: {
    "report-drift": {
      label: "Hisobot siljishi",
      steps: {
        "report-sum": {
          short: "Hisobot",
          title: "Hisobot QQS'ni qayta hisoblaydi va hisob-fakturalarga mos kelmaydi",
          body: "Oylik QQS hisoboti bitta so'rov qilib yozilgan: barcha sof summalar yig'indisining 12% i, bir marta yaxlitlangan. U 61 284 517 961 tiyin beradi. Shu oyda chiqarilgan 41 200 ta hisob-fakturaning QQS'i esa jami 61 284 518 175 tiyin.\n\nHisobot hisob-fakturalardan boshqa joyda yaxlitlaydi, natijada deklaratsiya bilan hujjatlar orasida 214 tiyin farq bor.",
          check: {
            q: "Soliq deklaratsiyasiga qaysi son yoziladi?",
            options: [
              "Hisobotniki: xom summalardan hisoblangan, demak aniqroq",
              "Chiqarilgan hisob-fakturalar yig'indisi: hujjatlar ular, hisobot chiqarilgan narsani qo'shishi kerak",
              "Istalgani: oyiga 2.14 so'm bu shovqin",
            ],
            answer: 1,
            why: "Chiqarilgan hisob-fakturalar yuridik yozuv, ularning QQS'i yaratilganda har qatorda yaxlitlangan. Boshqa joyda yaxlitlaydigan hisobot hech qachon chiqarilmagan hisob-fakturalarni tasvirlaydi. Har qanday farq, hatto bir tiyin ham, auditorga tushuntirilishi kerak bo'lgan narsa.",
          },
          fields: {
            "sum(net_minor)": "Yaxlitlanmagan qator summalari, hech qanday yaxlitlashdan oldin qo'shilgan.",
            "0.12": "QQS hisob-fakturalardagidek har qatorga emas, bir marta butun oyga qo'llangan.",
            "issued invoices": "Xaridorlar va soliq tizimi haqiqatan olgan narsa.",
            "214 tiyin": "Kichik, lekin solishtiruv yo aniq, yo muvaffaqiyatsiz.",
          },
        },
        "report-fix": {
          short: "Saqlanganini qo'sh",
          title: "Saqlangan summalarni qo'sh va har kecha tekshir",
          body: "Endi hisobot qabul qilingan hisob-fakturalarning saqlangan `total_vat_minor` ini qo'shadi: 61 284 518 175 tiyin, aynan chiqarilgan narsa. U QQS'ni hech qachon qayta hisoblamaydi.\n\nHar kecha tekshiruv har bir hisob-faktura jamisini uning saqlangan qatorlari yig'indisi bilan solishtiradi. Farq 0, agar u qachondir 0 bo'lmasa, bu haqda soliq tekshiruvida emas, ertasi kuni ertalab bilinadi.",
          fields: {
            "sum(total_vat_minor)": "Summalarni chiqarilganidek, hech narsani qayta yaxlitlamasdan qo'shadi.",
            accepted: "Faqat hisob-faktura tizimi qabul qilgan hisob-fakturalar hisoblanadi.",
            "nightly check": "Qismlar butunga qarshi, har kecha, tiyinigacha.",
            "difference 0": "Hisobot va hujjatlar mos keladi.",
          },
        },
      },
    },
  },
};

export default text;
