import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "To'lovlarni solishtirish",
  summary:
    "Do'kon karta to'lovlarini provayderning javoblari va callback'laridan yozib boradi. Ularning bir qismi yo'qoladi, timeout bo'ladi yoki ikki marta keladi, shuning uchun hisob daftari va haqiqiy pul ajralib ketadi. Har tong bir job daftarni provayderning hisob-kitob hisoboti bilan solishtiradi, xavfsizini o'zi tuzatadi, qolganini odamga beradi.",
  learn: [
    "Nega callback'lardan yig'ilgan daftar puldan ajralib ketadi va nega summa butun sonda, eng kichik birlikda saqlanadi",
    "Hisob-kitob hisobotini provayder tranzaksiya ID'si, valyuta va sana oynasi bo'yicha moslash",
    "To'rt xil nomuvofiqlik: qaysi birini job o'zi tuzatadi, qaysilari qo'lda tekshiruv navbatiga ketadi",
    "Kun oxiridagi valyuta bo'yicha jami summa, ogohlantirish va bir narsani ikki marta tuzatmaydigan qayta ishga tushirish",
  ],
  nodes: {
    client: "To'lov sahifasi",
    api: "To'lovlar API",
    provider: "Provayder",
    ledger: "Hisob daftari",
    files: "Hisobot fayllari",
    recon: "Solishtirish job",
    review: "Tekshiruv navbati",
    analyst: "Moliya xodimi",
    pager: "Navbatchi signali",
  },
  metrics: {
    mismatches: "Nomuvofiqliklar",
    unmatched: "Mos kelmagan summa",
    autofix: "Avtomatik tuzatilgan",
    review: "Ochiq ishlar",
  },
  steps: {
    record: {
      short: "Yozish",
      title: "Daftar javoblar va callback'lardan yoziladi",
      body: "Xaridor to'lov sahifasida to'laydi. To'lovlar API provayderdan kartadan pul yechishni so'raydi, provayder keyinroq imzolangan callback bilan tasdiqlaydi. API har to'lov uchun daftarga bitta qator yozadi: bizning buyurtma, ularning tranzaksiya ID'si, summa, holat.\n\nMoliya bo'limi, qaytarishlar va to'lovlar shu daftarni o'qiydi. U qaysi xabarlardan yig'ilgan bo'lsa, shunchalik to'g'ri.",
      fields: {
        Signature: "Callback provayderdan kelganini isbotlaydi. Umumiy sir, shuning uchun yashirilgan.",
        provider_txn_id: "Provayderning shu to'lov uchun ID'si. Keyin hamma narsa shu kalit bo'yicha moslanadi.",
        amount_minor:
          "`129000` sent = $1 290.00. So'mda ham xuddi shunday tiyinda. Butun sonlar aniq qo'shiladi, `0.1 + 0.2` kabi kasr sonlar esa yo'q: 48 000 qatorning yaxlitlash xatosi haqiqiy pulga aylanadi.",
        currency: "Doim summa yonida saqlanadi. Eng kichik birlik har xil: USD'da 2 xona, ba'zi valyutalarda 0, ba'zilarida 3.",
      },
    },
    drift: {
      short: "Ajralish",
      title: "Daftar va pul ajralib ketadi",
      body: "Pul yechish chaqiruvi 10 s da timeout bo'ladi va API buyurtmani `failed` deb belgilaydi. Provayder esa bir soniyadan keyin kartadan pulni yechdi, callback'i qayta ishga tushayotgan serverga tushdi. Xaridor to'ladi, daftarimiz esa to'lamadi deydi.\n\nYagona yo'l bu emas. Callback ikki marta kelib ikki qator ochadi, provayder boshqa summa yechadi, support provayder panelida pulni qaytaradi. Kuniga taxminan 34 to'lov, $1 840 endi mos kelmaydi.",
      watch: "Timeout «bilmayman» degani, hech qachon «muvaffaqiyatsiz» emas.",
      check: {
        q: "Callback'lar yo'qoladi, timeout'lar aldaydi. Do'kon daftarini nima bilan solishtira oladi?",
        options: [
          "Xaridor shikoyatlari bilan: to'lagan odam o'zi yozadi",
          "Provayderning o'zi tuzgan, kun bo'yi o'tgan har tranzaksiya ro'yxati bilan",
          "O'z serverining pul yechish chaqiruvlari logi bilan",
        ],
        answer: 1,
        why: "Provayder har kun uchun hisob-kitob hisobotini chiqaradi: haqiqatan o'tkazgan har yechish, qaytarish va komissiya. Bu pulning boshqa tomondagi yozuvi va bizga qaysi callback yetib kelganiga bog'liq emas.",
      },
      fields: {
        timeout: "O'z vaqtida javob yo'q. Pul yechilgan ham bo'lishi mumkin, yechilmagan ham.",
        failed: "API taxmin qildi va xato taxmin qildi.",
        charged: "Provayder tomoni: pul o'tdi.",
        lost: "Daftarni tuzata oladigan yagona xabar yetib kelmadi.",
      },
    },
    settlement: {
      short: "Hisobot",
      title: "Provayderning hisob-kitob hisoboti",
      body: "Provayder har tong kechagi hisobotni fayl sifatida (yoki sahifalab o'qiladigan API orqali) chiqaradi: o'tkazgan har yechish, qaytarish va komissiya uchun bitta qator. Do'kon uni o'z omboriga yuklab oladi.\n\nHisobot o'sha kun uchun yakuniy va callback'lardan boshqa tizimdan keladi. Foydasi shunda: u boshqacha buziladi.",
      watch: "Hisobotning sizdagi nusxasida karta raqami bo'lmasin. Faqat provayder ID'larini saqlang.",
      fields: {
        "T+1": "T kuni T+1 kuni hisobotga tushadi. Yarim tundagi to'lovlar keyingi kun fayliga tushishi mumkin.",
        provider_txn_id: "Callback olib kelgan ID'ning o'zi. Moslash kaliti.",
        amount_minor: "Yana butun sent. Qaytarishlar manfiy.",
        fee_minor: "Provayder komissiyasi. Pul shusiz o'tkaziladi, shuning uchun jami summa sof (net) bo'yicha hisoblanadi.",
        card: "Saqlaganingizda doim `***`. Solishtirish uchun karta raqami kerak emas.",
        refund: "Provayder tomonida qilingan qaytarish. Daftarimiz u haqda umuman eshitmagan bo'lishi mumkin.",
      },
    },
    match: {
      short: "Moslash",
      title: "Solishtirish job hisobotni daftar bilan birlashtiradi",
      body: "Job faylni oraliq jadvalga yuklaydi va uni daftar bilan provayder tranzaksiya ID'si va valyuta bo'yicha birlashtiradi. `FULL OUTER JOIN` faqat bir tomonda bor qatorlarni ham saqlaydi: bizga aynan ular kerak.\n\nDaftar tomoni kundan biroz kengroq oyna bilan olinadi, chunki provayder kunni o'z vaqt mintaqasida yopadi va yarim tunga yaqin to'lovlar chegaradan o'tib ketadi.",
      fields: {
        "FULL OUTER JOIN": "Ikkala tomonning mos kelmagan qatorlarini ham qoldiradi, yo'q tomonda `NULL` bo'ladi.",
        provider_txn_id: "Hech qachon faqat summa va vaqt bo'yicha moslamang: bir soniya farq bilan ikkita $45 lik to'lov ko'p uchraydi.",
        currency: "ID bir xil, valyuta boshqa bo'lsa, bu moslik emas, nomuvofiqlik.",
        created_at: "Kunning ikki tomoniga ikki soatdan qo'shimcha: kun yopilish vaqtidagi siljishni ushlaydi.",
        NULL: "`ptx_8813` hisobotda bor, daftarimizda esa to'langan sifatida yo'q.",
      },
    },
    classes: {
      short: "Turlar",
      title: "Har farq to'rt turdan biriga tushadi",
      body: "Job toza mos kelmagan har qatorni belgilaydi. 23 to'lovdan pul yechilgan, biz esa `failed` yoki `pending` deymiz. 6 tasini to'langan deymiz, provayder esa ularni umuman o'tkazmagan. 3 tasining ID'si bir, summasi boshqa. 2 ta provayder to'lovi uchun daftarda ikkitadan qator bor.\n\nTurlar muhim, chunki har birining sababi ham, xavfsiz harakati ham boshqa.",
      check: {
        q: "Qaysi turni job o'zi xavfsiz tuzata oladi?",
        options: [
          "`missing_ours`: biz pending yoki failed deymiz, provayder o'sha ID, summa va valyutani tasdiqlaydi",
          "`amount_differs`: bizdagi summani provaydernikiga almashtirish",
          "`missing_theirs`: xaridorga pulni qaytarish, chunki provayderda yechish yo'q",
        ],
        answer: 0,
        why: "Pul o'tganmi yoki yo'qmi, buni provayder yozuvi hal qiladi. Uning javobi ID, summa va valyutada biznikiga mos kelsa va faqat holatimiz orqada qolgan bo'lsa, `pending` ni `paid` ga o'tkazish xavfsiz. Qolgan turlarda sababni odam topishi kerak.",
      },
      fields: {
        missing_ours: "Pul yechilgan, daftarimiz esa o'tkazib yuborgan: yo'qolgan callback yoki aldagan timeout.",
        missing_theirs: "Biz to'langan deb o'ylaymiz, provayderda yechish yo'q. Mol tekinga ketgan bo'lishi mumkin.",
        amount_differs: "Bir tomon xato, qaysi biri ekanini job bila olmaydi.",
        duplicate: "Bitta yechish, ikkita qator: callback ikki marta qayta ishlangan.",
      },
    },
    autofix: {
      short: "Avto-tuzatish",
      title: "Xavfsiz turni avtomatik tuzatish, audit yozuvi bilan",
      body: "Har `missing_ours` qatori uchun job provayderning holat API'sidan yana bir marta so'raydi. U hali ham `succeeded` desa, summa va valyuta mos kelsa va shundan beri hech narsa qaytarilmagan bo'lsa, job qatorimizni `paid` ga o'tkazadi va kim, nega o'zgartirganini yozadi: `recon 2026-11-17`.\n\n34 nomuvofiqlikdan 23 tasi (68 %) odamsiz yopiladi. Mos kelmagan summa $1 450 ga tushadi.",
      watch: "Avtomatik tuzatish qatorni faqat provayder tasdiqlagan holatga oldinga suradi. Hech qachon o'chirmaydi, summani o'zgartirmaydi, pul o'tkazmaydi.",
      fields: {
        Authorization: "Do'konning provayderdagi API kaliti. Yashirilgan.",
        status: "To'lovning provayderdagi hozirgi holati, kechagi fayldagisi emas.",
        amount_minor: "Ham faylga, ham bizning qatorga teng bo'lishi shart, aks holda ish odamga ketadi.",
        refunded_minor: "Hisobotdan keyin qaytarish bo'lgan bo'lsa, `paid` noto'g'ri bo'lardi. Bu yerda `0`.",
      },
    },
    review: {
      short: "Tekshiruv",
      title: "Qolgan hammasi SLA'li qo'lda tekshiruv navbatiga",
      body: "Qolgan 11 ta holat tekshiruv ishiga aylanadi. Har birida ikkala tomon ma'lumoti bor, xodim uni loglardan qayta yig'maydi. `ptx_8790`: biz $1 290.00 yozganmiz, provayder $129.00. Kimdir ortiqcha nol yozgan.\n\nHar ishning muddati bor. SLA'si o'tgan ishlar moliya yig'ilishida ko'rinadi, chunki ochiq nomuvofiqlik hech kim hisobini bera olmaydigan pul.",
      fields: {
        case_id: "Kun va provayder ID'sidan yasaladi, shuning uchun bir nomuvofiqlik doim bitta ishga tushadi.",
        class: "Xodimga qayerdan qidirishni boshlashni aytadi.",
        ours_minor: "Bizning daftar nima deydi, sentda.",
        theirs_minor: "Provayder nima o'tkazgan, sentda.",
        sla_due: "Hal qilish uchun ikki ish kuni, keyin yuqoriga ko'tariladi.",
      },
    },
    totals: {
      short: "Jami",
      title: "Kun oxiri: valyuta bo'yicha jami summa",
      body: "Qatorma-qator moslash jami summa ushlaydigan narsani o'tkazib yuborishi mumkin: o'zgargan komissiya qoidasi, parser tashlab ketgan qator. Shuning uchun job har valyuta bo'yicha sof jami summani ham solishtiradi, ochiq ishlar tushuntirgan farqni ayirib.\n\nUSD'da farq $1 161.00, uni ochiq `ptx_8790` ishi aniq tushuntiradi. EUR'da 500.00 kam, ortida hech qanday ish yo'q. Bu tushuntirilmagan pul, shuning uchun job navbatchini chaqiradi.",
      watch: "Turli valyutadagi summalarni hech qachon qo'shmang. Har valyutaga alohida jami.",
      fields: {
        provider_net: "Provayder summalari komissiyasiz, eng kichik birlikda.",
        open_cases: "Tekshiruv ishlari allaqachon tushuntirgan farq.",
        unexplained: "`0` bo'lishi shart. Boshqa son moslash nimanidir o'tkazib yuborganini bildiradi.",
        "on-call": "Odam har nomuvofiqlik uchun emas, tushuntirilmagan pul uchun uyg'otiladi.",
      },
    },
    rerun: {
      short: "Qayta ishga",
      title: "Qayta ishga tushirish bir narsani ikki marta tuzatadi",
      body: "Provayder xato topdi va kechagi hisobotni qayta yubordi. Job o'sha kun uchun yana ishladi. 1-ishga tushirishdagi har tuzatish yana bajarildi: `ord_3307` ikkinchi tuzatishni oldi, har ochiq ishning nusxasi ochildi.\n\nEndi daftar bitta to'lov ikki marta to'langan deydi, xodimlar esa bitta nomuvofiqlik ustida ikki ishda ishlaydi.",
      check: {
        q: "Bir kun uchun ikkinchi ishga tushirishni qanday zararsiz qilish kerak?",
        options: [
          "Bir kun uchun ikkinchi marta ishlashni taqiqlash",
          "Kechagi tuzatish va ishlarni o'chirib, qaytadan qilish",
          "Har tuzatishga kun, provayder ID va harakatdan kalit berish va bor kalitni o'tkazib yuborish",
        ],
        answer: 2,
        why: "Qayta ishga tushirish kerak: hisobotlar tuzatiladi, job'lar yarim yo'lda yiqiladi. (kun, provayder ID, harakat) bo'yicha unique kalit ikkinchi urinishni hech narsa qilmaydigan qiladi, tuzatish esa faqat qator kutilgan holatda bo'lsa qo'llanadi.",
      },
      fields: {
        v2: "Tuzatilgan hisobot. Bu haqiqiy holat va yana bo'ladi.",
        "run #2": "O'sha kun ikkinchi marta qayta ishlandi.",
        adjust: "Daftardagi o'zgartirish yana bir marta qo'llandi.",
        copies: "Ish ID'lari tasodifiy edi, shuning uchun bir nomuvofiqlik yangi ish ochdi.",
      },
    },
    idempotent: {
      short: "Idempotent",
      title: "Har tuzatishning kaliti bor, qayta ishga tushirish hech narsani o'zgartirmaydi",
      body: "Daftarni o'zgartirishdan oldin job tuzatishni unique kalit bilan `recon_fixes` ga yozadi. Kalit allaqachon bo'lsa, o'tkazib yuboradi. Yangilashning o'zi faqat hali `pending` yoki `failed` qatorlarga tegadi, shuning uchun poyga ham uni ikki marta qo'llay olmaydi.\n\nIsh ID'lari kun va provayder ID'sidan yasaladi, shuning uchun qayta ishga tushirish mavjud ishni topadi va yangilaydi. Job'ni o'n marta yurgizing: daftar ham, navbat ham bir xil bo'lib qoladi.",
      fields: {
        recon_fixes: "Har avtomatik o'zgartirish jurnali: nima, qachon, qaysi ishga tushirishda. Bu audit izi ham.",
        "ON CONFLICT": "Bu tuzatish allaqachon bo'lganmi, buni baza hal qiladi.",
        "status IN": "Tuzatish faqat kutilgan holatdan qo'llanadi, kimdir allaqachon o'zgartirgan qatorga emas.",
        "INSERT 0 0": "Hech qator qo'shilmadi: 2-ishga tushirish tuzatishni topdi va hech narsa qilmadi.",
      },
    },
    recap: {
      short: "Xulosa",
      title: "Xulosa",
      body: "Solishtirishning besh qoidasi.\n\n1) Summani valyutasi bilan, butun son va eng kichik birlikda saqlang. 2) Har kuni provayder hisobotini daftaringiz bilan ularning tranzaksiya ID'si, valyuta va kengaytirilgan sana oynasi bo'yicha moslang. 3) Har farqni turga ajrating; faqat provayder tasdiqlagan qatorlarni, faqat oldinga va audit yozuvi bilan avtomatik tuzating. 4) Qolganini ikkala tomon ma'lumoti va SLA bilan tekshiruv navbatiga yuboring, valyuta bo'yicha jami summani tekshiring, toki tushuntirilmagan pul yashirinib qolmasin. 5) Har tuzatish va ishga kalit bering, qayta ishga tushirish hech narsani o'zgartirmasin.",
    },
  },
};

export default text;
