import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Tovar qoldig'ini bron qilish",
  summary:
    "Bitta choynak qoldi, xaridor esa ikkita; hech qachon to'lanmaydigan savat, qayta urinadigan mobil ilova, o'tmagan to'lov, 500 dona uchun 20 000 xaridorli flash sale. Qoldiq bitta raqamdek ko'rinadi va bularning har biri uni buzadi: do'kon yo'q narsani sotadi yoki bor narsani yashiradi.",
  learn: [
    "Nega avval o'qib keyin yozish oxirgi donani ikki marta sotadi va shartli atomar kamaytirish hamda o'zgargan qatorlar sonini tekshirish buni qanday to'xtatadi",
    "Javondagi, bron qilingan va sotuvga ochiq qoldiq; muddati tugaydigan bron bilan reserve-then-confirm va donalarni qaytaradigan tozalagich",
    "Har buyurtmaga idempotent bron, to'lov o'tmaganda bronni bo'shatish va muddat tugashi bilan kechikkan to'lov orasidagi poyga",
    "Flash sale'dagi qizg'in SKU: tor joy bo'lgan bitta qulflangan qator, bo'laklangan hisoblagichlar va ombor bilan kunlik sanoq",
  ],
  nodes: {
    buyer: "Xaridor A",
    buyer2: "Xaridor B",
    api: "Buyurtma servisi",
    db: "Qoldiq bazasi",
    pay: "To'lov provayderi",
    sweeper: "Bron tozalagich",
    wh: "Ombor",
    recon: "Kunlik sanoq",
  },
  metrics: {
    oversold: "Donasi yo'q buyurtmalar",
    stuck: "Behuda band donalar",
    doubles: "Ikki marta bron qilgan buyurtma",
    p99: "Checkout p99",
    drift: "Javon sanog'iga mos kelmagan dona",
  },
  steps: {
    setup: {
      short: "Boshlanish",
      title: "Bitta choynak qoldi",
      body: "Do'kon `KET-200` elektr choynagini sotadi. Qoldiq qatori uchta raqamni saqlaydi: javonda nechta, to'lanmagan buyurtmalarga nechtasi va'da qilingan va yana nechtasini sotish mumkin.\n\nBitta dona qoldi. Xaridor \"Sotib olish\" ni bosadi, buyurtma servisi qatorni tekshirib qaror qiladi. Tinch kunda ham katalog bo'yicha 14 dona ombor javoniga mos kelmaydi.",
      fields: {
        on_hand: "Hozir omborda jismonan turgan donalar.",
        reserved: "To'lovi hali tugamagan buyurtmalarga va'da qilingan donalar.",
        available: "on_hand minus reserved: sayt sotishi mumkin bo'lgan yagona raqam.",
      },
    },
    oversell: {
      short: "Ortiqcha sotuv",
      title: "Ikki xaridor oxirgi choynakni oladi",
      body: "A va B xaridorlar 40 ms farq bilan \"Sotib olish\" ni bosadi. Har bir so'rov `available = 1` ni o'qiydi, qoldiq bor deb qaror qiladi, ilovada `1 - 1 = 0` ni hisoblaydi va `0` ni qaytarib yozadi.\n\nIkkala yozuv ham muvaffaqiyatli, ikkala buyurtma ham tasdiqlangan, choynak esa bitta. Aksiya haftasida bu kuniga 37 marta bo'ladi: kimdir posilka o'rniga uzr oladi.",
      watch: "O'qish, qaror qilish, yozish: ularning istalgan ikkitasi orasiga boshqa so'rov kirib olishi mumkin.",
      fields: {
        "SELECT available": "Ikkalasi bir xil eski qiymatni o'qiydi.",
        "UPDATE stock": "Ikkalasi o'sha eski qiymatdan hisoblangan raqamni yozadi.",
        "computed in the app": "Bazaga \"bittasini ayir\" emas, \"0 qo'y\" deyiladi.",
        "two orders": "Bitta dona uchun ikkita va'da.",
      },
    },
    atomic: {
      short: "Atomar",
      title: "Bazada kamaytir, shartni WHERE ga yoz",
      body: "Buyurtma servisi bitta buyruq yuboradi: bittasini ayir, lekin faqat kamida bitta qolgan bo'lsa. Baza qator lock'i ostida qatorning joriy qiymatidan hisoblaydi va shartni yozish paytida tekshiradi.\n\nA `UPDATE 1` oladi. B A ning lock'ini kutadi, qatorni qayta o'qiydi, 0 ni ko'radi va `UPDATE 0` oladi. Servis o'zgargan qatorlar sonini o'qiydi: 0 sotilib bo'ldi degani, buyurtma yaratilmaydi.",
      check: {
        q: "Nega SQL dagi `available - 1` ortiqcha sotuvni to'xtatadi, ilovada hisoblangan `available = 0` esa yo'q?",
        options: [
          "SQL arifmetikasi tezroq",
          "Baza lock ostida joriy qiymatdan hisoblaydi va WHERE ni qayta tekshiradi; ilova esa eski o'qishga asoslangan raqamni yozdi",
          "available - 1 o'z-o'zidan noldan pastga tushmaydi",
        ],
        answer: 1,
        why: "Ikkinchi yozuvchi birinchisining lock'ini kutadi, keyin ifodani ham, shartni ham commit qilingan qiymat bo'yicha hisoblaydi. `AND available >= 1` bo'lmasa, u bemalol -1 yozadi: sotuvni aynan shart rad etadi.",
      },
      fields: {
        "available - 1": "Nisbiy o'zgarish: yozish paytidagi qiymatga qo'llanadi.",
        "available >= 1": "Qoida, baza tomonidan yozuv ichida tekshiriladi.",
        "UPDATE 1": "Bitta qator o'zgardi: dona sizniki.",
        "row lock": "B A commit qilguncha kutadi, keyin A ning natijasini ko'radi.",
        "UPDATE 0": "Hech narsa o'zgarmadi: sotilib bo'ldi deb javob bering. Bu sonni har doim tekshiring.",
      },
    },
    abandoned: {
      short: "Tashlangan",
      title: "To'lanmagan savatlar qoldiqni ushlab qoladi",
      body: "Kamaytirish checkout boshlanganda, to'lovdan oldin ishlaydi. Kecha 40 ta checkout bittadan dona oldi; 12 tasi to'ladi, 28 tasi to'lov sahifasini yopdi.\n\nJavonda 40 ta choynak turibdi, sayt esa sotilib bo'ldi deydi. O'sha 28 donani hech narsa qaytarmaydi. Faqat to'lovdan keyin kamaytirish ham yechim emas: unda oxirgi choynak uchun ikki kishi pul to'laydi.",
      fields: {
        on_hand: "Javon to'la.",
        "sold out": "Sayt 0 ga yetgan available ga ishonadi.",
        "28 closed": "Checkout'larning uchdan biri to'lovsiz tugaydi: do'kon uchun odatiy hol.",
        "gives those 28 units back": "Qaytish yo'li yo'q kamaytirish qoldiqning sizib ketishi.",
      },
    },
    hold: {
      short: "Bron",
      title: "Muddatli bron qil, to'lovda tasdiqla",
      body: "Endi checkout bitta tranzaksiyada donani available dan reserved ga o'tkazadi va buyurtmaga 15 daqiqa oldinga `expires_at` bilan bron yozadi. To'lov muvaffaqiyatli bo'lsa, bron `confirmed` ga o'tadi va dona on_hand dan chiqadi.\n\nTozalagich har 30 s da ishlaydi va muddati o'tgan bronlarni bo'shatadi: reserved kamayadi, available oshadi. To'lanmagan savatlarga band donalar 28 tadan 6 taga yaqin tushadi, har biri ko'pi bilan 15 daqiqa.",
      check: {
        q: "To'lov sahifasi xaridorga 10 daqiqa beradi. Bron qancha davom etishi kerak?",
        options: [
          "Savat mavjud ekan",
          "To'lov sahifasidan uzoqroq, masalan 15 daqiqa",
          "Qoldiqni tezroq bo'shatish uchun 1 daqiqa",
        ],
        answer: 1,
        why: "Hali muvaffaqiyatli bo'lishi mumkin bo'lgan to'lov o'z bronini doim topishi kerak. Bron to'lov oynasidan qisqa bo'lsa, xaridor allaqachon boshqaga berilgan dona uchun to'lab qo'yishi mumkin. Keragidan uzunrog'i esa tashlangan donalarni sal uzoqroq ushlab turadi, xolos.",
      },
      fields: {
        "reserved + 1": "Dona va'da qilingan, lekin ketmagan: qaytishi mumkin.",
        holds: "Har buyurtma va SKU ga bitta qator: nima, kim uchun, qachongacha band.",
        expires_at: "Va'daning oxiri ma'lumotning o'ziga yozilgan.",
        confirmed: "To'landi: dona javon sanog'idan chiqadi.",
        released: "Vaqtida to'lanmadi: dona available ga qaytadi.",
        sweeper: "Muddati o'tgan bronlarni yopadigan fon ishi.",
      },
    },
    retry: {
      short: "Qayta urinish",
      title: "Mobil qayta urinish ikki marta bron qiladi",
      body: "Zaif mobil tarmoqda checkout so'roviga 8 s davomida javob kelmaydi. Ilova o'sha buyurtma bilan qayta urinadi. Server ikkalasini ham bajaradi va `ord_7710` uchun ikkita bron yozadi.\n\nXaridor bitta choynak uchun to'laydi; ikkinchisi 15 daqiqa behuda band turadi, keyingi xaridor esa \"sotilib bo'ldi\" yozuvini ko'radi. Kuniga 9 ta buyurtma ikki marta bron qiladi.",
      fields: {
        "no answer": "Muvaffaqiyatsiz emas, noma'lum: birinchi so'rov ishlagan bo'lishi mumkin.",
        retries: "O'sha buyurtma yana yuborildi.",
        "two holds": "Har bir so'rov o'zicha bron qildi.",
        "sold out": "Takror orqasiga yashiringan haqiqiy qoldiq.",
      },
    },
    idem: {
      short: "Bir marta",
      title: "Har buyurtma va SKU ga bitta bron",
      body: "`holds` jadvali `(order_id, sku)` bo'yicha unique kalit oladi. Checkout avval bronni `ON CONFLICT DO NOTHING` bilan qo'shadi; 0 qator bu buyurtma choynakni allaqachon band qilgan degani, servis mavjud bron bilan javob beradi va qoldiqqa tegmaydi.\n\nFaqat yangi bron, o'sha tranzaksiyada, qoldiqni kamaytiradi. Kamaytirish 0 qatorni o'zgartirsa, tranzaksiya orqaga qaytariladi va javob sotilib bo'ldi.",
      check: {
        q: "Qaysi kalit bronni idempotent qiladi?",
        options: [
          "Har HTTP so'rov uchun yaratilgan tasodifiy id",
          "(order_id, sku): bitta buyurtma bitta SKU ni bir marta band qiladi",
          "Xaridorning user id'si",
        ],
        answer: 1,
        why: "So'rov id'si har qayta urinishda o'zgaradi, demak hech narsani himoya qilmaydi. User id o'sha xaridorning ikkinchi, qonuniy buyurtmasini to'sib qo'yadi. Buyurtma esa checkout'dan oldin mavjud va har qayta urinish uni olib keladi.",
      },
      fields: {
        "ON CONFLICT": "Unique kalit takrorni hech narsa qilmaydigan amalga aylantiradi.",
        "0 rows": "Yo qayta urinish (bron bor), yo qoldiq yo'q (kamaytirish rad etildi).",
        "existing hold": "Qayta urinish birinchi so'rov bilan bir xil javob oladi.",
        ROLLBACK: "Qoldiq yo'q: bron qatori ham saqlanmaydi.",
      },
    },
    payfail: {
      short: "To'lov o'tmadi",
      title: "To'lov o'tmadi: donani hozir qaytar",
      body: "Provayder imzolangan webhook bilan `payment.failed` xabar qiladi. Tozalagichni kutish choynakni eng qizg'in soatda 15 daqiqagacha sotuvdan chetda ushlab turardi.\n\nHandler bronni faqat u hali `held` bo'lsa bo'shatadi va donani o'sha tranzaksiyada qaytaradi. Bu bronning kompensatsiyasi: choynak xatodan 40 ms keyin yana sotuvda. Behuda band donalar 1 taga yaqin tushadi.",
      watch: "Faqat `held` dan bo'shating. Webhook'ning ikkinchi nusxasi yoki tozalagichdan keyingi bo'shatish hech narsani o'zgartirmasligi kerak.",
      fields: {
        event_id: "Har hodisada noyob: nusxalar shu bo'yicha tashlanadi.",
        type: "To'lov o'tmadi.",
        reason: "Sababi: xaridor uchun foydali, qoldiq uchun kerak emas.",
        "status = 'held'": "Himoya: bron bir marta, bitta holatdan bo'shatiladi.",
        "40 ms": "Muddat tugashini kutish o'rniga.",
      },
    },
    hot: {
      short: "Qizg'in SKU",
      title: "Flash sale har bir checkout'ni bitta qatorga navbatga qo'yadi",
      body: "Soat 11:00 da choynak aksiyaga chiqadi: 500 dona, birinchi 10 soniyada 20 000 xaridor. Har bir checkout bitta qoldiq qatorini yangilaydi, har tranzaksiya uning lock'ini taxminan 2 ms ushlaydi. Bu qator soniyasiga ko'pi bilan 500 ga yaqin bronga yo'l qo'yadi, kelayotgani esa 2 000 ta.\n\nSo'rovlar lock oldida navbatga turadi, ulanishlar puli to'ladi, boshqa mahsulotlarning checkout'lari ham timeout bilan tugaydi. Checkout p99 35 ms dan 4 200 ms ga chiqadi.",
      fields: {
        "one lock": "To'g'rilikni qator lock'i bergan edi; endi lock'ning o'zi chegara.",
        "2 ms": "Kamaytirish, bronni qo'shish va commit, hammasi lock ushlab turilganda.",
        "500 reservations/s": "1 s ni 2 ms ga bo'lish: bitta qatorning shifti.",
        "100/100": "Har bir ulanish bitta qatorni kutadi, shuning uchun qolgan hamma narsa ham kutadi.",
      },
    },
    slots: {
      short: "Slotlar",
      title: "Qizg'in hisoblagichni slotlarga bo'l",
      body: "500 dona 50 tadan 10 ta slot qatoriga bo'linadi. Har checkout tasodifiy slotni tanlaydi va uni o'sha shartli `UPDATE` bilan kamaytiradi. 0 qator bo'lsa, keyingi slotni sinaydi; o'ntasi ham bo'sh bo'lgandagina javob sotilib bo'ldi. O'nta qator o'nta lock degani, soniyasiga taxminan 5 000 ta bron.\n\nJami 0 ga yetganda keshga `sold_out` belgisi yoziladi va kechikkan 19 500 xaridor javobni bazaga tegmasdan oladi. Boshqa variant: har qizg'in SKU uchun tartib bilan bron qiladigan bitta iste'molchili navbat. p99 yana 40 ms.",
      check: {
        q: "0 dan 8 gacha slotlar bo'sh, 9-slotda 3 dona bor. Xaridor tasodifan 2-slotni tanlaydi. Nima bo'ladi?",
        options: [
          "Xaridor \"sotilib bo'ldi\" yozuvini ko'radi",
          "Servis boshqa slotlarni sinaydi va 9-slotdan bron qiladi",
          "Xaridor 2-slot to'ldirilguncha kutadi",
        ],
        answer: 1,
        why: "Slotlar yig'indisi haqiqiy qoldiq. Tasodifiy tanlov lock'larni tarqatish usuli, xolos, shuning uchun bo'sh slot boshqalarga o'tishi kerak. Aks holda do'kon dona bor paytda \"sotilib bo'ldi\" yozuvini ko'rsatadi. Slotlar bo'shagan sari fon ishi ularni qayta taqsimlashi mumkin.",
      },
      fields: {
        stock_slots: "O'sha qoldiq, bir nechta qatorda saqlangan.",
        "slot = 7": "O'nta qatordan biri: xaridorlar bir-birini kam kutadi.",
        "next slot": "Bo'sh slot sotilib bo'ldi degani emas.",
        "5 000": "Bitta qator shiftidan o'n barobar.",
        sold_out: "Tugagandan keyin kelgan olomon uchun arzon javob.",
      },
    },
    count: {
      short: "Sanoq",
      title: "Qoldiq jadvalini har kuni ombor bilan solishtir",
      body: "Har tong fon ishi ombor sanog'ini yuklaydi va on_hand bilan solishtiradi. Ko'p SKU mos keladi. Uchta choynak qaytarish zonasida shikastlangan, javonda 49 emas, 46 ta: tuzatish sababi bilan harakat sifatida yoziladi.\n\nIkkita krujka faqat bazada bor va ularni ikkita to'langan buyurtma band qilgan. Bu buyurtmalarni jo'natib bo'lmaydi: jamoa ularni bekor qiladi, pulini qaytaradi va xaridorlarga yozadi. Sanoq reserved ni hech qachon o'zgartirmaydi: bronlar buyurtmalarga tegishli.",
      fields: {
        shelf: "Omborda odamlar haqiqatan sanagan son.",
        on_hand: "Tizim u yerda bor deb hisoblaydigan son.",
        "do not exist": "Yo'qolgan qoldiq va'da qilingan buyurtmalar: yana sotilmasdan oldin ularni hal qiling.",
        stock_movements: "Har o'zgarishning qatori va sababi bor, raqamni tushuntirib berish mumkin.",
        reserved: "Bronlarga tegishli; sanoq faqat on_hand ni tuzatadi.",
      },
    },
    recap: {
      short: "Xulosa",
      title: "Xulosa",
      body: "Qoldiqning yetti qoidasi.\n\n1) on_hand, reserved va available ni alohida saqlang; faqat available dan soting. 2) Bazada shartni WHERE ga yozib kamaytiring va o'zgargan qatorlar sonini tekshiring; oldingi o'qishdan hisoblangan raqamni hech qachon yozmang. 3) Avval bron, keyin tasdiq: muddati to'lov oynasidan uzunroq bron va muddati o'tganlarni bo'shatadigan tozalagich. 4) Har buyurtma va SKU ga unique kalit bilan ta'minlangan bitta bron, shunda qayta urinishlar bir marta bron qiladi. 5) To'lov o'tmasa, bronni darhol bo'shating; har bir bo'shatish yoki tasdiq faqat `held` dan. 6) Qizg'in SKU lock'ini tarqatish kerak: slotlar yoki har SKU ga navbat, oldida esa sotilib bo'ldi belgisi. 7) Har kuni ombor bilan sanang va tuzatishlarni harakat sifatida yozing.",
    },
  },
  scenarios: {
    "late-pay": {
      label: "1 s kechikkan to'lov",
      steps: {
        "late-race": {
          short: "1 s kech",
          title: "Bron to'lov o'tishidan bir soniya oldin tugaydi",
          body: "`ord_7710` broni 12:15:00.000 da tugaydi, to'lov sahifasi ham 15 daqiqa ochiq edi va bir lahza keyin boshlangan. 12:15:00 da tozalagich bronni bo'shatadi, 400 ms dan keyin `ord_7741` o'sha choynakni band qiladi.\n\n12:15:01 da provayder `ord_7710` sahifasining 14:59 ida to'laganini xabar qiladi. Handler hech narsani tekshirmay bronni confirmed deb belgilaydi. Endi boshqa odamga tegishli choynak uchun pul yechib olindi.",
          check: {
            q: "Buni nima to'xtatishi kerak edi?",
            options: [
              "Tozalagichni kamroq ishga tushirish",
              "Faqat `held` dan tasdiqlash va brondan qisqaroq to'lov oynasi",
              "Tezroq to'lov provayderi",
            ],
            answer: 1,
            why: "Tozalagich va to'lov handler'i bitta bron uchun poygaga kiradi. Ikkalasi ham uni faqat `held` dan o'zgartirishi kerak, shunda aynan bittasi yutadi. To'lov oynasi brondan oldin tugasa, bu poyga uchun o'z sahifasi yopilgandan keyin keladigan to'lov kerak bo'ladi.",
          },
          fields: {
            expires_at: "To'lov oynasiga teng: hech qanday zaxira yo'q.",
            sweeper: "U o'z ishini vaqtida qildi.",
            ord_7741: "Ikkinchi xaridor, endi donani qonuniy ushlab turibdi.",
            "payment.succeeded": "Haqiqiy pul, bir soniya kech.",
            confirmed: "Bron hali band ekanini tekshirmasdan yozildi.",
          },
        },
        "late-fix": {
          short: "Himoya",
          title: "Bitta himoyalangan o'tish, zaxira vaqt va yutqazgan uchun reja",
          body: "Tasdiqlash ham muddat tugashidek himoyalangan update bo'ladi: faqat `held` dan. Tozalagich `expires_at` dan keyin yana 2 daqiqa kutadi, to'lov sahifasi esa 10 daqiqada yopiladi, shuning uchun oddiy to'lov har doim o'z bronini topadi.\n\nTo'lov baribir poygada yutqazsa, servis atomar kamaytirish bilan yana bron qilishga urinadi. Dona yo'q bo'lsa, pul uzr bilan darhol qaytariladi. Donasiz buyurtma hech qachon tasdiqlanmaydi.",
          fields: {
            "status = 'held'": "Tasdiq va muddat tugashidan aynan bittasi yuta oladi.",
            "lost the race": "0 qator: bron yo'q, ustidan yozmang, shunga qarab harakat qiling.",
            grace: "Yo'lda kelayotgan webhook'lar uchun qo'shimcha vaqt.",
            "10 min": "To'lov oynasi brondan ancha oldin tugaydi.",
            refund: "Kamdan-kam yutqazgan xaridor pulini avtomatik qaytarib oladi.",
          },
        },
      },
    },
  },
};

export default text;
