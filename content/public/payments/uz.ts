import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "To'lov shlyuzi",
  summary:
    "Xaridor buyurtma uchun shlyuz orqali to'laydi, shlyuz esa do'koningizga to'rt marta murojaat qiladi. Har chaqiruv nimani anglatadi va pul yoki mol qayerda yo'qoladi.",
  learn: [
    "To'rt chaqiruv: tekshir, yarat, bajar, bekor qil",
    "Nega takroriy `CreateTransaction` bir xil javob olishi kerak",
    "Tranzaksiya holatlari: `1`, `2`, `-1` va `-2`",
    "Nega mol faqat `state: 2` dan keyin jo'natiladi",
  ],
  nodes: {
    payer: "Xaridor",
    gateway: "Shlyuz",
    api: "Do'kon API",
    orders: "Buyurtmalar bazasi",
    warehouse: "Ombor",
  },
  metrics: {
    p95: "Javob p95",
    double: "Ikki marta yechish",
    unpaid: "To'lovsiz jo'natilgan",
  },
  steps: {
    check: {
      short: "Tekshir",
      title: "Tekshiruv: bu buyurtmani to'lash mumkinmi?",
      body: "Xaridor shlyuzda karta ma'lumotini kiritadi. Pul yechishdan oldin shlyuz do'kondan so'raydi: `1042` buyurtma bormi, summa to'g'rimi?\n\nAPI buyurtmani o'qiydi va «ha» yoki «yo'q» deydi. Hali hech narsa yechilmagan.",
      fields: {
        Authorization: "Shlyuz o'zi ekanini isbotlaydi. Umumiy sir, shuning uchun bu yerda yashirilgan.",
        amount: "Eng kichik birlikda (tiyin): `500000` = 5 000 so'm. Hech qachon kasr son emas.",
        order_id: "Do'konning o'z buyurtma raqami: xaridor kiritgan yoki to'lov havolasi olib kelgan.",
        allow: "Ha: buyurtma bor, to'lanmagan va summa mos.",
      },
    },
    create: {
      short: "Yarat",
      title: "Yaratish: tranzaksiya ochiladi",
      body: "Shlyuz pulni band qildi va do'kondan buyurtma uchun tranzaksiya ochishni so'raydi.\n\nAPI qator yozadi: shlyuz ID, o'z tranzaksiya ID, holat `1`. Pul band qilingan, lekin hali sizniki emas.",
      fields: {
        id: "Shlyuzning shu to'lov uchun ID'si. Uni eslab qoling: keyingi har chaqiruv shunga ishora qiladi.",
        time: "Shlyuz to'lovni yaratgan vaqt, millisekundlarda.",
        transaction: "Shu tranzaksiyaning do'kondagi o'z ID'si.",
        state: "`1` — yaratildi, bajarilishini kutmoqda.",
      },
    },
    "create-twice": {
      short: "Ikki marta",
      title: "Bitta yaratish ikki marta keldi",
      body: "API sekin ishladi, shlyuzning timeout'i tugadi va u `CreateTransaction`'ni o'sha `id` bilan qayta yubordi.\n\nKod uni qidirmadi va ikkinchi tranzaksiya ochdi. Bitta to'lov, ikkita tranzaksiya: ikki marta yechish yoki hisobda chalkashlik.",
      watch: "Shlyuz cheksiz kutmaydi. Har bir chaqiruv bir necha marta kelishi mumkin.",
      check: {
        q: "Shlyuz `CreateTransaction`'ni o'sha `id` bilan qayta yuboradi. Do'kon nima deb javob berishi kerak?",
        options: [
          "Xato, toki shlyuz qayta urinishni to'xtatsin",
          "Yangi tranzaksiya, chunki bu yangi chaqiruv",
          "Mavjud `tx_77`'ni, o'zgartirmasdan",
        ],
        answer: 2,
        why: "API avval shlyuz ID bo'yicha qidiradi va mavjud tranzaksiyani so'zma-so'z qaytaradi. Shlyuz ID'dagi unique indeks ikki parallel chaqiruvning ikkalasi ham yaratishiga yo'l qo'ymaydi, ikki marta yechish 0 ga tushadi.",
      },
      fields: {
        id: "Avvalgi shlyuz ID'ning o'zi. Bu yangi to'lov emas, takror.",
        transaction: "Yangi ID, `tx_78`. Endi bitta to'lov uchun do'konda ikkita tranzaksiya bor.",
      },
    },
    "same-answer": {
      short: "Bir xil javob",
      title: "Takrorga — o'sha javob",
      body: "Yaratishdan oldin API shlyuz ID bo'yicha qidiradi. Tranzaksiya bo'lsa, uni o'zgartirmasdan qaytaradi: o'sha ID, o'sha vaqt, o'sha holat.\n\nShlyuz ID bazada **unique** cheklov bilan saqlanadi, shuning uchun ikki parallel chaqiruv ikkalasi ham yarata olmaydi.",
      fields: {
        gateway_id: "Qidiruv kaliti. Undagi unique indeks takrorni xavfsiz qiladi.",
        tx_77: "Mavjud tranzaksiya. Javob uni so'zma-so'z takrorlaydi.",
      },
    },
    perform: {
      short: "Bajar",
      title: "Bajarish: pul endi sizniki",
      body: "Shlyuz kartadan pulni yechadi va do'kondan tranzaksiyani bajarishni so'raydi.\n\nAPI holatni `1` dan `2` ga o'tkazadi va buyurtmani to'langan deb belgilaydi. Takroriy `Perform` o'sha `perform_time`'ni qaytaradi.",
      check: {
        q: "Do'kon buyurtmani tranzaksiya yaratilishi bilan omborga yuborsa nima bo'ladi?",
        options: [
          "Keyin bekor qilinadigan to'lovlar uchun ham mol ketadi",
          "Hech narsa: yaratilgan tranzaksiya doim bajariladi",
          "Shlyuz tranzaksiyani bajarishdan bosh tortadi",
        ],
        answer: 0,
        why: "`1` holati faqat va'da: karta rad etiladi, xaridor chiqib ketadi. Timeout'dan keyin shlyuz `-1` holati bilan bekor qiladi, kuniga 4 ta to'lanmagan buyurtma esa allaqachon yo'lda.",
      },
      fields: {
        perform_time: "To'lov yakunlangan vaqt. Takror ham aynan shu qiymatni qaytarishi shart.",
        state: "`2` — bajarildi. Buyurtma faqat endi to'langan.",
      },
    },
    "ship-early": {
      short: "Erta jo'natish",
      title: "Mol puldan oldin ketdi",
      body: "Do'kon tranzaksiya **yaratilishi** bilan buyurtmani omborga topshirdi.\n\nLekin har yaratilgan tranzaksiya bajarilmaydi: karta rad etiladi yoki xaridor chiqib ketadi. Timeout'dan keyin shlyuz uni bekor qiladi, mol esa allaqachon yo'lda.",
      watch: "`1` holati — pulning va'dasi, pulning o'zi emas.",
      fields: {
        reason: "`4` — timeout bo'yicha bekor qilindi: tranzaksiya hech qachon bajarilmadi.",
        state: "`-1` — bajarilishidan oldin bekor qilindi. Pul kelmadi.",
      },
    },
    "ship-after": {
      short: "Keyin jo'nat",
      title: "Faqat `state: 2` dan keyin jo'nat",
      body: "Ombor endi buyurtmani faqat `PerformTransaction`'dan keyin oladi. So'rovda tranzaksiya va uning holati bor, ombor boshqasini qabul qilmaydi.\n\nBekor qilingan to'lovlar endi jo'natilgan molga aylanmaydi.",
      fields: {
        paid_state: "Ombor buni o'zi tekshiradi: API'dagi xato ham to'lanmagan buyurtmani jo'nata olmaydi.",
      },
    },
    refund: {
      short: "Qaytarish",
      title: "To'langan tranzaksiyani bekor qilish",
      body: "Xaridor pulini qaytarishni so'raydi. Shlyuz bajarilgan tranzaksiya uchun `CancelTransaction` yuboradi.\n\nBuyurtmani qaytarish mumkin bo'lsa, API uni bekor qiladi va holat `-2` bo'ladi. Mol allaqachon yetkazilgan bo'lsa, xato bilan javob beradi va pul avtomatik qaytmaydi.",
      fields: {
        reason: "`5` — to'lovdan keyin so'ralgan qaytarish.",
        code: "`-31007` — bu tranzaksiyani bekor qilib bo'lmaydi: buyurtma allaqachon yetkazilgan.",
      },
    },
    recap: {
      short: "Xulosa",
      title: "Xulosa",
      body: "To'lov shlyuzi uchun to'rt qoida.\n\n1) Summa eng kichik birlikda, kasr son emas. 2) Har chaqiruv takrorlanishi mumkin: shlyuz ID bo'yicha qidiring va o'sha javobni qaytaring. 3) Mol faqat `state: 2` dan keyin jo'natiladi. 4) Bekor qilishning ikki holati bor: `-1` puldan oldin, `-2` puldan keyin.",
    },
  },
  scenarios: {
    late: {
      label: "Perform 30 s",
      steps: {
        "perform-slow": {
          short: "Sekin perform",
          title: "Do'kon `Perform`'ga 30 soniyada javob beradi",
          body: "Buyurtmalar bazasini uzoq hisobot qulflab turibdi. API tranzaksiyani bajaradi, lekin javob 30 soniyadan keyin chiqadi.\n\n`PerformTransaction` — sinxron chaqiruv: shlyuz uni ochiq ushlab, javobni shu chiziqda kutadi. Uning timeout'i ancha qisqa.",
          watch: "Do'kon bazasida allaqachon `state: 2`. Shlyuz buni eshitmagan.",
          fields: {
            "X-Response-Time": "30 soniya. Bu paytda shlyuz kutishni to'xtatgan.",
            state: "Do'kon bazasida `2`: u yerda buyurtma to'langan hisoblanadi.",
          },
        },
        "perform-cancel": {
          short: "Bekor",
          title: "Shlyuz voz kechadi va bekor qiladi",
          body: "Shlyuz uchun vaqtida javob yo'q — to'lov o'tmadi degani. U pulni xaridorga qaytaradi va `4` sababi bilan `CancelTransaction` yuboradi.\n\nBu orada do'kon `state: 2` ni ko'rib, buyurtmani omborga allaqachon yuborgan.",
          fields: {
            reason: "`4` — timeout bo'yicha bekor qilindi. Shlyuz uchun bajarish yakunlanmagan.",
            state: "`-2` — bajarilgandan keyin bekor qilindi. Do'kon rozi, lekin posilka allaqachon qadoqlangan.",
          },
        },
        "perform-end": {
          short: "Natija",
          title: "Natija: pul qaytdi, mol qaytmadi",
          body: "Hisobot tugaydi, baza yana tez. Do'kon jo'natmani qaytarishga urinadi, lekin posilka allaqachon kuryerda.\n\nOdatdagi yo'l bilan solishtiring: o'sha buyurtma, o'sha chaqiruvlar, faqat bitta sekin javob. Kuniga 5 ga yaqin buyurtma to'lovsiz ketadi, har birini qo'lda quvish kerak.",
          watch: "Chaqiruvga sekin javob — kechikkan muvaffaqiyat emas: chaqiruvchi uchun bu xato.",
          fields: {
            recall: "Do'kon ombordan posilkani to'xtatishni so'raydi.",
            "409": "Kech: posilka ketgan. Buyurtma jo'natilgan, lekin to'lanmagan.",
          },
        },
      },
    },
  },
};

export default text;
