import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Ikki yoqlama hisob daftari",
  summary:
    "Marketpleys xaridorlar hamyonini yuritadi, sotuvchilarga pul o'tkazadi va komissiya oladi. Joyida yangilanadigan balans ustuni bir vaqtdagi so'rovlarda pulni yo'qotadi va u qayerga ketganini ayta olmaydi. Ikki yoqlama daftar har pul harakatini posting'lari yig'indisi nolga teng yozuv sifatida saqlaydi, balansni shundan hisoblaydi va tarixni hech qachon qayta yozmaydi.",
  learn: [
    "Nega joyida yangilanadigan balans ustuni yangilanishlarni yo'qotadi va iz qoldirmaydi",
    "Hisoblar, jurnal yozuvlari va yig'indisi nol bo'lgan posting'lar bitta tranzaksiyada",
    "Versiyali keshli hisoblangan balans, idempotency kaliti, hold va mavjud balans",
    "Qaytarish = teskari yozuv, har yig'indida bitta valyuta, har kungi trial balance va ogohlantirish",
  ],
  nodes: {
    app: "Xaridor ilovasi",
    web: "Xaridor sayti",
    api: "Hamyon API",
    wallets: "Hamyonlar jadvali",
    ledger: "Hisob daftari",
    balances: "Balans keshi",
    payout: "Yechish job",
    support: "Support xodimi",
    rates: "Valyuta kurslari",
    checker: "Trial balance",
    pager: "Navbatchi signali",
  },
  metrics: {
    unexplained: "Izohsiz pul",
    lost: "Yo'qolgan yangilanish",
    dupes: "Ikki marta yechish",
    "balance-ms": "Balansni o'qish",
  },
  steps: {
    column: {
      short: "Ustun",
      title: "Hamyon bitta qatordagi bitta son",
      body: "Xaridor buyurtma uchun $45.00 to'laydi. Hamyon API balansni o'qiydi, kodda narxni ayiradi va yangi sonni qaytarib yozadi. Har foydalanuvchiga bitta qator, bitta ustun, bitta `UPDATE`.\n\nDemoda ishlaydi. Lekin qator faqat oxirgi sonni biladi, u qanday paydo bo'lganini emas.",
      fields: {
        balance_minor: "Butun sent: `12000` = $120.00. Pul uchun hech qachon kasr son emas.",
        SET: "Eski qiymat ustidan yoziladi. U nima bo'lgani yo'qoladi.",
        "UPDATE 1": "Baza mamnun. 7500 to'g'rimi yoki yo'qmi, u bilmaydi.",
      },
    },
    lost: {
      short: "Yo'qolish",
      title: "Bir vaqtda ikki to'lov, bittasi g'oyib bo'ladi",
      body: "Xaridor bir soniyaning o'zida telefonda bir buyurtmani, brauzerda boshqasini to'laydi. Ikkala so'rov ham 12000 ni o'qiydi, har biri o'z buyurtmasini ayiradi va yozadi. Ikkinchi yozuv yutadi: hamyonda 9000 turibdi, holbuki undan 7500 chiqib ketgan.\n\nSupport'ga \"$45 qayerga ketdi?\" degan savol keladi, javob berishga hech narsa yo'q: yagona yozuv hozirgi son. Kuniga 37 ga yaqin shunday poyga, $2 480 ni hech kim izohlay olmaydi.",
      watch: "O'qish, kodda hisoblash, qaytarib yozish: bu naqshning har nusxasi poyga.",
      check: {
        q: "Poygani ham, yo'q tarixni ham nima tuzatadi?",
        options: [
          "Yozishdan oldin qatorni `SELECT ... FOR UPDATE` bilan qulflash",
          "Har harakatni posting'lari yig'indisi nol bo'lgan yozuv sifatida saqlash va balansni shundan hisoblash",
          "Har tunda hamma hamyonni buyurtmalar jadvalidan qayta hisoblash",
        ],
        answer: 1,
        why: "Qulf poygani to'xtatadi, lekin son baribir ustidan yoziladi va tarix yo'qligicha qoladi. Har harakatga yozuv qo'shish har o'zgarishni saqlaydi, balans esa hech kim yo'qota olmaydigan yig'indiga aylanadi.",
      },
      fields: {
        "tx A": "Telefondagi to'lov, $45.00.",
        "tx B": "Brauzerdagi to'lov, $30.00. U balansni A yozishidan oldin o'qigan.",
        "write 9000": "Oxirgi yozgan yutadi, A ning ayirishi yo'qoladi.",
        "no history": "Qator nima bo'lganini ayta olmaydi. Faqat log, agar kimdir saqlagan bo'lsa.",
      },
    },
    journal: {
      short: "Jurnal",
      title: "Har harakat yozuv, posting'lari yig'indisi nol",
      body: "Hamyon **hisob** (account) bo'ladi, sotuvchi va platformaning komissiya daromadi ham. Buyurtma to'lovi uchta **posting**'li bitta **jurnal yozuvi**: xaridordan $45.00 chiqadi, sotuvchiga $40.50, komissiyaga $4.50 kiradi. Ishorali summalar yig'indisi nol bo'lishi shart: debet kreditga teng.\n\nHamma posting'lar bitta tranzaksiyada qo'shiladi: yozuv yo butunlay bor, yo umuman yo'q. Hech narsa yangilanmaydi, shuning uchun bir vaqtdagi ikki to'lov shunchaki ikki yozuv.",
      watch: "Yig'indisi nol bo'lmagan yozuvni code review emas, bazaning o'zi rad etadi.",
      fields: {
        BEGIN: "Yozuv va uning hamma posting'lari uchun bitta tranzaksiya.",
        journal_entries: "Har biznes hodisaga bitta qator: nima bo'ldi va nega (`order_paid`, `ord_5120`).",
        postings: "Tegilgan har hisobga bitta qator. Faqat qo'shiladi.",
        account: "Nomli hisob: `wallet:u_42`, `seller:s_7`, `platform:fees`.",
        amount_minor: "Manfiy hisobdan chiqadi, musbat kiradi. `-4500 + 4050 + 450 = 0`.",
        COMMIT: "Kechiktirilgan cheklov har yozuv yig'indisini shu yerda, commit paytida tekshiradi.",
      },
    },
    derived: {
      short: "Balans",
      title: "Balans yig'indi, versiya bilan keshlanadi",
      body: "Haqiqiy balans hisob posting'larining `SUM(amount_minor)` i. Millionlab posting'da bu yig'indi 180 ms oladi, har ekran uchun sekin. Shuning uchun API har hisob uchun keshlangan balansni saqlaydi va uni posting'lar bilan bitta tranzaksiyada yangilaydi.\n\nYangilash o'qigan versiyasini olib boradi. Oraliqda boshqa to'lov balansni o'zgartirgan bo'lsa, versiya mos kelmaydi, nol qator yangilanadi va tranzaksiya qayta uriniladi. Xuddi shu tekshiruv noldan past sarfni ham rad etadi.",
      fields: {
        account_balances: "Yig'indining keshi, har hisobga bitta qator. Uni doim posting'lardan qayta qurish mumkin.",
        version: "Optimistic locking: yozuv faqat o'zi hisoblangan balansga qo'llanadi.",
        SUM: "Haqiqat manbai. Audit so'rovi doim kesh bilan mos kelishi kerak.",
        "UPDATE 1": "Versiya mos keldi. `UPDATE 0` degani: kimdir tezroq edi, qayta urin.",
      },
    },
    retry: {
      short: "Takror",
      title: "Takror so'rov bitta to'lovni ikki marta yozadi",
      body: "Sekin tarmoqda to'lov so'rovi timeout bo'ladi. Ilova o'sha bosishni qayta yuboradi va API o'sha buyurtma uchun ikkinchi yozuvni qo'shadi. Ikkala yozuv ham to'liq muvozanatda, muammo shunda: daftar izchil, lekin noto'g'ri.\n\nXaridor $19.90 ni ikki marta to'ladi. Kuniga 14 ga yaqin.",
      check: {
        q: "API ikkinchi so'rovni qanday zararsiz qilsin?",
        options: [
          "Ilova har amal uchun idempotency kaliti yuboradi; API uni yozuv bilan saqlaydi va takrorda birinchi natijani qaytaradi",
          "Bitta foydalanuvchidan 10 soniya ichida ikkinchi to'lovni rad etish",
          "Dublikatlarni tunda trial balance topsin",
        ],
        answer: 0,
        why: "Ikki so'rov bitta bosish ekanini faqat mijoz biladi. Har biznes amaliga bazada noyob kalit takrorni oddiy qidiruvga aylantiradi. Vaqt oynasi haqiqiy ikkinchi xaridni to'sadi, trial balance esa dublikatni ko'rmaydi: ikkala yozuv ham nolga teng.",
      },
      fields: {
        retries: "Ilova javob olmadi, shuning uchun birinchi urinish o'tganini bilmaydi.",
        je_9107: "Birinchi yozuv: to'g'ri.",
        je_9108: "Ikkinchi yozuv: u ham muvozanatda, u ham yozilgan.",
        "paid twice": "Ikki yoqlama yozuv daftar muvozanatda ekanini isbotlaydi, har hodisa bir marta bo'lganini emas.",
      },
    },
    idempotent: {
      short: "Idempotency",
      title: "Har biznes amaliga bitta kalit",
      body: "Ilova kalitni har to'lov uchun bir marta yaratadi, `pay-ord_5133`, va har takrorda yuboradi. API uni yozuv bilan birga noyob ustunga qo'shadi. Ikkinchi qo'shish to'qnashadi, API birinchi yozuvni o'qib, uni qaytaradi.\n\nKalit o'sha, summa boshqa bo'lsa, bu takror emas: API taxmin qilmaydi, `422` qaytaradi.",
      fields: {
        "Idempotency-Key": "Daftarda noyob. HTTP so'rov uchun emas, amal uchun.",
        "Idempotent-Replayed": "Bu javob birinchi so'rovning saqlangan natijasi.",
        entry_id: "Birinchi urinishdagi `je_9107` ning o'zi. Ikkinchi yozuv yo'q.",
      },
    },
    hold: {
      short: "Hold",
      title: "Hold: daftar balansi va mavjud balans",
      body: "Xaridor keyingi hafta jo'natiladigan $129.00 lik mahsulot buyurtma qiladi. Pul hozir band qilinishi va sotuvchiga faqat jo'natilganda o'tishi kerak. API **hold** qo'yadi: mavjud balansni kamaytiradigan, lekin hali posting'i yo'q yozuv.\n\nMahsulot jo'natilganda yechish job haqiqiy yozuvni qo'shadi va hold'ni bo'shatadi. Jo'natilmasa, hold muddati tugaydi. Hamyon ikki sonni ko'rsatadi: daftar (o'tgan) va mavjud (sarflash mumkin).",
      watch: "Sarf tekshiruvi mavjud balansga qaraydi. Hisobot-ko'chirma daftar balansiga.",
      check: {
        q: "Xaridor mahsulotni yechilgandan bir hafta keyin qaytaradi. To'lov qanday bekor qilinadi?",
        options: [
          "Yozuv va uning posting'larini `DELETE` qilish",
          "Posting summalarini `UPDATE` bilan nolga aylantirish",
          "Teskari posting'li yangi yozuv qo'shish va uni asl yozuvga bog'lash",
        ],
        answer: 2,
        why: "Asl to'lov haqiqatan bo'lgan, ko'chirmalar, to'lovlar va hisobotlar unga tayanadi. Teskari yozuv uning ta'sirini bekor qiladi va ikkala hodisani tarixda qoldiradi.",
      },
      fields: {
        ledger_minor: "O'tgan posting'lar yig'indisi: $310.00.",
        held_minor: "Ochiq hold'lar band qilgan: $129.00.",
        available_minor: "Daftar minus hold'lar. Keyingi xarid shunga qarab tekshiriladi.",
        expires_at: "Hech qachon yechilmagan hold pulni o'zi qaytaradi.",
      },
    },
    reversal: {
      short: "Teskari",
      title: "Qaytarish yangi yozuv, hech qachon tahrir emas",
      body: "Support `ord_5120` buyurtma pulini qaytaradi. API o'sha uchta hisob va teskari ishorali `je_9230` yozuvini qo'shadi va uni `je_9001` ni bekor qiluvchi deb belgilaydi. Xaridor hamyoni tiklanadi, sotuvchi va komissiyadan qaytarib olinadi.\n\nAsl yozuvga tegilmaydi. Ko'chirmada to'lov ham, qaytarish ham ko'rinadi, o'tgan oy hisoboti o'tgan oy yuborilgan songa tengligicha qoladi.",
      watch: "Ilova roli uchun posting'larda `UPDATE` va `DELETE` huquqini olib qo'ying.",
      fields: {
        reverses: "Bekor qilinayotgan yozuvga havola. Bitta yozuv faqat bir marta bekor qilinadi.",
        refund: "Har yozuvdagidek biznes sababi.",
        "never updated": "Tarix faqat qo'shiladi. Tuzatish yangi qator.",
        "INSERT 0 3": "Uchta yangi posting, har yozuvdagidek yig'indisi nol.",
      },
    },
    currency: {
      short: "Valyuta",
      title: "Har yig'indida bitta valyuta, ayirboshlash hisoblar orqali",
      body: "Xaridor USD hamyonga 100.00 EUR to'laydi. `-10000 EUR + 10850 USD` nol ham emas, ma'noli ham emas: yevro va dollarni qo'shib bo'lmaydi. Shuning uchun yozuv ikki qismdan iborat, har biri o'z valyutasida muvozanatda, ular platformaning FX hisoblari orqali bog'lanadi.\n\nKurs kurslar manbasidan olinadi va yozuvda saqlanadi, shunda ayirboshlashni bir yildan keyin ham tushuntirish mumkin.",
      watch: "Eng kichik birlik valyutaga qarab har xil: USD'da 2 xona, ba'zilarida 0, ba'zilarida 3. Valyutani har posting'da saqlang.",
      fields: {
        EUR: "Yevro qismi: kartadan 100.00 EUR platformaning EUR hisobiga kiradi.",
        "fx:EUR": "Platforma sotib olgan yevroni ushlab turadi.",
        "fx:USD": "Va sotgan dollarini beradi.",
        rate: "Yozuv bilan saqlanadi, keyin qayta qidirilmaydi.",
        sums: "Har valyutada nol. Daftar har valyutani alohida tekshiradi.",
      },
    },
    trial: {
      short: "Trial balance",
      title: "Har tun: hammasi hali ham nolga tengmi?",
      body: "Tungi job **trial balance** yurgizadi: har valyuta bo'yicha barcha posting'lar yig'indisi aynan nol bo'lishi kerak. Keyin har keshlangan balansni o'sha hisob posting'lari yig'indisi bilan solishtiradi.\n\nKecha ikkala jami ham 0 edi, lekin qo'lda yozilgan hotfix'dan keyin bitta kesh $2.00 ga farq qildi. Job navbatchini chaqiradi va o'sha keshni posting'lardan qayta quradi, haqiqat manbai posting'ligicha qoladi.",
      watch: "Nolga teng bo'lmagan trial balance hisobot qatori emas, incident.",
      fields: {
        "GROUP BY": "Har valyutaga bitta jami, hech qachon valyutalar aralash emas.",
        "total 0": "Har yozuv muvozanatda, demak butun daftar ham.",
        "cache drift": "Kesh posting'lar bilan mos emas. Posting'lar yutadi.",
        "on-call": "Odam bugunoq qaraydi, sabab hali yangi paytda.",
      },
    },
    recap: {
      short: "Xulosa",
      title: "Xulosa",
      body: "Mahsulotdagi pul uchun olti qoida.\n\n1) Pulni hech qachon joyida ustidan yoziladigan son sifatida saqlamang. 2) Har harakat posting'lari yig'indisi nol bo'lgan, bitta tranzaksiyada qo'shiladigan jurnal yozuvi. 3) Balans posting'lar yig'indisi; versiyasi bor va qayta quriladigan kesh bo'lishi mumkin. 4) Har biznes amaliga bitta idempotency kaliti; hold yechilguncha yoki muddati tugaguncha mavjud balansni kamaytiradi. 5) Bekor qilish teskari yozuv bilan, hech qachon `UPDATE` yoki `DELETE` emas; har yig'indida bitta valyuta, ayirboshlash hisoblar orqali. 6) Har kuni trial balance yurgizing va u nol bo'lmasa odamni chaqiring.",
    },
  },
};

export default text;
