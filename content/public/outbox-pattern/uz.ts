import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Tranzaksion outbox",
  summary:
    "Do'kon xaridni o'z bazasiga saqlaydi, keyin loyallik servisi ball yozib qo'yishi uchun hodisa (event) e'lon qiladi. Ikki xil tizimga ikki alohida yozuv, umumiy tranzaksiya yo'q: ba'zida commit o'tadi-yu, publish o'tmaydi va ballar izsiz yo'qoladi. Outbox hodisani o'sha bazaga, o'sha tranzaksiyada yozadi, relay uni kamida bir marta yetkazadi, iste'molchi takrorlarni tashlaydi, qolganini esa kalit, tozalash va log'ni o'qish hal qiladi.",
  learn: [
    "Nega \"avval commit, keyin publish\" qaysi tartibda bo'lmasin hodisani yo'qotadi va o'sha tranzaksiyadagi outbox jadvali bu bo'shliqni qanday yopadi",
    "Relay outbox'ni `FOR UPDATE SKIP LOCKED` bilan qanday o'qiydi va nega u faqat at-least-once yetkazishni va'da qila oladi",
    "Iste'molchi idempotentligi: ta'sir bilan birga commit bo'ladigan qayta ishlangan hodisalar jadvali",
    "Xabar kaliti bilan har aggregate ichida tartib, yuborilgan qatorlarni tozalash va polling bilan log'ni o'qish o'rtasidagi tanlov",
  ],
  nodes: {
    app: "Do'kon ilovasi",
    api: "Xarid servisi",
    db: "Xaridlar bazasi",
    broker: "Broker",
    loyalty: "Loyallik servisi",
    ldb: "Loyallik bazasi",
    relay: "Outbox relay",
  },
  metrics: {
    lost: "Yo'qolgan hodisalar",
    dups: "Ikki marta yozilgan ball",
    misorder: "Tartibi buzilgan hodisalar",
    delay: "Commit'dan publish'gacha",
    unsent: "Yuborilmagan outbox qatorlari",
    rows: "Outbox'dagi qatorlar",
  },
  steps: {
    buy: {
      short: "Xarid",
      title: "Xaridni saqla, keyin hammaga xabar ber",
      body: "Xarid servisi xaridni o'z bazasiga commit qiladi. Shundan so'ng darhol broker'ga `PurchaseCompleted` hodisasini e'lon qiladi, loyallik servisi esa ball yozadi: har 10 000 minor birlikka 1 ball.\n\nKodda bu bitta amaldek ko'rinadi. Aslida bu ikki xil tizimga ikki alohida yozuv va ularni hech narsa bir-biriga bog'lamaydi.",
      fields: {
        COMMIT: "Xarid saqlandi. Shu daqiqadan boshlab u sodir bo'lgan fakt.",
        publish: "Tarmoq orqali ikkinchi, alohida yozuv. U o'zicha muvaffaqiyatsiz bo'lishi mumkin.",
        "two systems": "Baza va broker bitta tranzaksiyani bo'lisha olmaydi.",
      },
    },
    dualwrite: {
      short: "Ikki yozuv",
      title: "Commit o'tadi, publish o'tmaydi",
      body: "21:14 da broker sekinlashadi. Xarid commit bo'ladi, publish 2 soniyadan keyin timeout bilan tugaydi, ilova esa baribir `201` oladi. Loyallik servisi bu xariddan bexabar qoladi.\n\nBu kam uchraydi: publish'larning 0.02% i. Lekin kuniga 300 000 xaridda bu har kuni 60 ta mijozning bali yozilmay qolishi demak, qaysilari ekanini esa hech kim bilmaydi.",
      watch: "Xatoni ushlab, log'ga yozish yordam bermaydi: xarid allaqachon commit bo'lgan, jarayon esa log qatoriga yetmasdan yiqilishi mumkin.",
      check: {
        q: "Servis avval publish qilib, keyin commit qilsa-chi?",
        options: [
          "Muammo hal bo'ladi: hodisa hech narsa buzilmasdan oldin chiqib ketadi",
          "Bug teskarisiga aylanadi: commit o'tmasa, mavjud bo'lmagan xarid uchun ball yoziladi",
          "Ilovaga javob berishdan oldin publish'ni siklda qayta urinib ko'rish kifoya",
        ],
        answer: 1,
        why: "Commit ham muvaffaqiyatsiz bo'lishi mumkin: constraint, deadlock, jarayonning yiqilishi. Unda hodisa hech qachon bo'lmagan narsani tasvirlaydi. Qayta urinish sikli xotirada yashaydi, shuning uchun commit bilan publish orasidagi deploy yoki xotira tugashi baribir hodisani yo'qotadi.",
      },
      fields: {
        COMMIT: "Xarid butunlay saqlandi.",
        timeout: "Broker o'z vaqtida javob bermadi. Xabarni olgan-olmagani noma'lum.",
        "201": "Mijoz muvaffaqiyatni ko'radi: xarid haqiqatan bo'ldi.",
        "lost events": "Foizi kichik, jami katta. Har biri support'ga bitta murojaat.",
      },
    },
    outbox: {
      short: "Outbox",
      title: "Hodisani o'sha tranzaksiyaning o'ziga yoz",
      body: "Servis broker bilan gaplashishni to'xtatadi. U hodisani xarid bilan bitta bazadagi, bitta tranzaksiyadagi `outbox` jadvaliga qo'shadi.\n\nEndi faqat bitta yozuv bor. Ikkala qator ham commit bo'ladi yoki hech biri: saqlangan xaridning hodisasi doim bor, bekor qilingan xaridniki esa hech qachon yo'q. Hodisani yetkazish alohida ishga aylanadi.",
      watch: "Outbox ma'lumot bilan bitta bazada turishi shart. Boshqa baza yoki lokal fayl yana o'sha ikki yozuvning o'zi.",
      fields: {
        purchases: "Biznes o'zgarishi, avvalgidek.",
        outbox: "Hodisa oddiy qator sifatida: keyinroq nimani e'lon qilish kerakligi.",
        aggregate_id: "Hodisa qaysi xarid haqida. Tartib va kalit uchun kerak bo'ladi.",
        COMMIT: "Xarid va uning hodisasi uchun bitta atomar commit.",
      },
    },
    relay: {
      short: "Relay",
      title: "Relay outbox'dagini e'lon qiladi",
      body: "Kichik worker, **relay**, har 500 ms da yuborilmagan qatorlarni o'qiydi, ularni e'lon qiladi, broker'dan ack kutadi va qatorlarni yuborilgan deb belgilaydi. `SKIP LOCKED` tufayli ikkinchi relay pod'i kutib turmaydi, boshqa qatorlarni oladi.\n\nHodisa endi commit'dan 4 ms emas, o'rtacha 260 ms ga yaqin keyin chiqadi. Bu narx, evaziga esa yo'qolmaydigan hodisa olinadi: broker ishlamasa, qator shunchaki kutib turadi.",
      check: {
        q: "Relay 200 ta hodisani e'lon qildi, keyin uning pod'i `UPDATE ... sent_at` dan oldin o'ldirildi. Qayta ishga tushgach nima bo'ladi?",
        options: [
          "O'sha 200 ta hodisa yo'qoladi",
          "O'sha 200 ta hodisa yana e'lon qilinadi",
          "Outbox buziladi va qo'lda tuzatish kerak",
        ],
        answer: 1,
        why: "Qatorlar hali ham yuborilmagan, shuning uchun relay ularni yana e'lon qiladi. \"Publish\" va \"yuborildi deb belgilash\" ning birorta tartibi xavfsiz emas: avval belgilasang, yiqilishda hodisa yo'qoladi; keyin belgilasang, takrorlanadi. Outbox at-least-once beradi, iste'molchi esa bunga tayyor bo'lishi kerak.",
      },
      fields: {
        sent_at: "Bo'sh bo'lsa, hali e'lon qilinmagan.",
        LIMIT: "Kichik paketlar: qisqa tranzaksiya, qisqa lock.",
        "SKIP LOCKED": "Boshqa relay pod'i ushlab turgan qatorlar kutilmaydi, o'tkazib yuboriladi.",
        acks: "Faqat broker tasdiqlagan qatorlar belgilanadi.",
        "500 ms": "Polling oralig'i. O'rtacha uning yarmi qo'shimcha kechikish bo'ladi.",
      },
    },
    dups: {
      short: "Takrorlar",
      title: "Relay qayta ishga tushadi va ball ikki marta yoziladi",
      body: "Relay pod'i publish bilan belgilash orasida o'ldiriladi. Qayta ishga tushgach u o'sha 200 ta hodisani yana yuboradi, loyallik servisi esa `u_42` ga 249 ballni ikkinchi marta yozadi.\n\nDeploy va qayta ishga tushishlar bilan kuniga 600 ga yaqin takror chiqadi. Broker'ning o'zi ham bir nechtasini qo'shadi: iste'molchining ack'i yo'qolsa, broker xabarni qayta yetkazadi.",
      fields: {
        evt_01HV9Q: "Ikkala yetkazishda ham hodisa id'si bir xil. Yechim shu id'ga tayanadi.",
        "+249": "Ta'sir har yetkazishda bir martadan qo'llanadi.",
        "re-sent": "Relay va'dasini bajardi: kamida bir marta.",
        "498": "Aynan bitta ortiqcha yozuvga noto'g'ri balans.",
      },
    },
    inbox: {
      short: "Dedup",
      title: "Iste'molchi nimani qo'llaganini eslab qoladi",
      body: "Loyallik servisi har `event_id` ni ball yozish bilan bitta tranzaksiyada `processed_events` ga yozadi. Ikkinchi yetkazish unique kalitga uriladi, hech narsa qo'shilmaydi, servis tranzaksiyani bekor qilib, xabarga ack beradi.\n\nTakrorlar zararsiz bo'lib qoladi. Bu outbox'ning ikkinchi yarmi: yuboruvchi kamida bir marta yetkazadi, qabul qiluvchi esa aynan bir marta qo'llaydi.",
      watch: "Dedup qatori va ta'sir birga commit bo'ladi. Id'ni ta'sirdan keyin, alohida qadamda saqlash yana ikki yozuvning o'zi.",
      fields: {
        processed_events: "Har qo'llangan hodisa id'siga bitta qator, unique kalit bilan.",
        "ON CONFLICT": "Takroriy id xato bermaydi, shunchaki hech narsa qo'shmaydi.",
        "0 rows": "Avval ko'rilgan: ta'sirni o'tkazib yubor, lekin xabarga baribir ack ber.",
        COMMIT: "Dedup qatori va ball birga saqlanadi.",
        "INSERT 0 0": "Takrorni bazaning o'zi aniqladi.",
      },
    },
    ordering: {
      short: "Tartib",
      title: "Qaytarish xariddan oldin yetib keladi",
      body: "O'tkazuvchanlik uchun ikkinchi relay pod'i qo'shiladi. A pod 1 dan 200 gacha, B pod 201 dan 400 gacha qatorlarni oladi va B tezroq chiqadi. Xabarlarda kalit yo'q, shuning uchun `p_9188` ning ikki hodisasi turli partition'larga tushadi.\n\nLoyallik servisi avval `PurchaseRefunded` ni oladi va 0 balansda uni rad etadi, keyin allaqachon qaytarilgan xarid uchun 249 ball yozadi. Kuniga 35 ga yaqin shunday juftlik.",
      check: {
        q: "Bitta xarid hodisalarini tartibda saqlab, baribir ikkita relay ishlatish uchun nima qilinadi?",
        options: [
          "Doim faqat bitta relay pod'i ishlatiladi",
          "Har xabarga `aggregate_id` kalit qilib beriladi, relay'lar orasidagi ish qator bo'yicha emas, shu kalit bo'yicha bo'linadi",
          "Iste'molchida vaqt belgisi bo'yicha saralanadi",
        ],
        answer: 1,
        why: "Tartib faqat bitta xarid ichida kerak. Kalit uning hamma hodisalarini bitta partition'ga yuboradi, relay'larni kalit hash'i bo'yicha bo'lish esa ularni bitta relay outbox tartibida e'lon qilishini ta'minlaydi. Turli pod'lardagi vaqt belgilari saralash uchun yetarlicha taqqoslanmaydi.",
      },
      fields: {
        partition: "Tartib partition ichida saqlanadi, partition'lar orasida hech qachon.",
        PurchaseRefunded: "Xaridning ikkinchi hodisasi, birinchi bo'lib yetkazildi.",
        key: "Kalitsiz broker xabarlarni tasodifiy tarqatadi.",
        rejected: "Bitta noto'g'ri tartib, ikkita noto'g'ri balans.",
      },
    },
    keyed: {
      short: "Kalit",
      title: "Har xaridga bitta kalit, har kalitga bitta partition",
      body: "Relay xabar kalitini xarid id'siga tenglaydi, har relay pod'i esa faqat hash'i o'z ulushiga tushgan kalitlarni oladi. `p_9188` ning hamma hodisalari outbox tartibida 3-partition'ga boradi.\n\nHar hodisa `aggregate_version` ni ham olib yuradi. Iste'molchi har xarid uchun oxirgi versiyani saqlaydi: eskirog'i o'tkazib yuboriladi, oraliq bo'lsa \"kutamiz, oldingisi kelyapti\" degani.",
      fields: {
        key: "Xarid id'si: bir xil kalit doim bir xil partition'ga tushadi.",
        event_id: "Har hodisada noyob, dedup uchun.",
        aggregate_version: "Shu xarid ichidagi o'rni: 1 = yakunlandi, 2 = qaytarildi.",
        value: "Hodisaning o'zi, outbox qanday saqlagan bo'lsa shunday.",
        partition: "Shu xaridning 1-hodisasi bilan bir xil partition.",
      },
    },
    bloat: {
      short: "Shishish",
      title: "Outbox har hodisani abadiy saqlaydi",
      body: "Yuborilgan qatorlarni hech kim o'chirmaydi. 92 kundan keyin outbox'da 27.6 million qator bor, har `UPDATE sent_at` esa indeksda o'lik yozuvlar qoldiradi. Birinchi haftada 2 ms bo'lgan relay so'rovi endi 870 ms oladi, soniyasiga ikki marta, primary'da.\n\nKechikish bir soniyadan oshadi, butun baza esa 99.99% i tarixdan iborat jadval uchun to'laydi.",
      fields: {
        sent_at: "Faqat 1 200 ta qator mos keladi. Qolgan 27.6 millioni xalaqit beradi.",
        "27.6 M rows": "Uch oy davomida kuniga 300 000 hodisa.",
        "dead entries": "Vacuum hali yetib ulgurmagan eski qator versiyalari.",
        "Execution Time": "Bir zumda bo'lishi kerak bo'lgan polling, endi haqiqiy yuk.",
      },
    },
    cleanup: {
      short: "Tozalash",
      title: "Yuborilgan qatorlarni kichik paketlarda o'chir",
      body: "Alohida ish har daqiqada 3 kundan oldin yuborilgan qatorlarni 5 000 tadan o'chiradi. Kichik paketlar lock'larni va replikatsiya kechikishini qisqa ushlaydi. Hajm kattaroq bo'lsa, har kunga bitta partition yaxshiroq: eski partition'ni tashlash bir zumda bo'ladi va o'lik qator qoldirmaydi.\n\nJadval 900 000 qatorga yaqin holatga qaytadi, polling esa bir necha millisekundga. Loyallik servisining `processed_events` jadvali ham shunday parvarish talab qiladi, lekin u id'larni eng uzun qayta yetkazishdan ko'proq, masalan 7 kun saqlashi kerak.",
      fields: {
        sent_at: "Faqat allaqachon yetkazilgan qatorlar o'chiriladi.",
        "3 days": "Insidentni tekshirishga yetarli, ortiq emas.",
        LIMIT: "Har safar minglab qator, hech qachon bitta tranzaksiyada millionlab emas.",
        DROP: "Kunlik partition'lar bilan tozalash bitta tezkor buyruq.",
        "DELETE 5000": "To'liq paket: ish biror marta hech narsa o'chirmaguncha takrorlanadi.",
      },
    },
    logtail: {
      short: "Log",
      title: "Yoki outbox'ni bazaning log'idan o'qi",
      body: "Polling o'rniga relay bazaning write-ahead log'ini replikatsiya slot'i orqali kuzatib borishi mumkin, xuddi CDC kabi. Har commit bo'lgan outbox qatori log'dan commit'dan 40 ms ga yaqin keyin chiqadi, polling so'rovi ham, `UPDATE` ham yo'q.\n\nNarxi ekspluatatsiyada: hech kim o'qimayotgan slot log'ni disk to'lguncha saqlab turadi. Polling istalgan SQL bazada ishlaydi va tushunish oson; log'ni o'qish kechikish yoki polling yuki haqiqatan muhim bo'lganda yutadi.",
      watch: "Qaysi yo'l bo'lmasin, jadval qatorlarini emas, o'zingiz loyihalagan hodisalarni e'lon qiling: outbox sizning shartnomangiz, sxema esa ichki ish.",
      fields: {
        slot: "Baza log'ni shu o'quvchi tasdiqlaguncha saqlaydi.",
        WAL: "Write-ahead log: har commit, commit tartibida.",
        "38 ms": "Commit'dan publish'gacha, polling oralig'isiz.",
        sent_at: "Endi kerak emas: log'dagi o'rin xatcho'p vazifasini bajaradi.",
        confirm: "Xatcho'pni faqat broker ack'idan keyin sur, shunda yiqilish yo'qotmaydi, takrorlaydi.",
      },
    },
    recap: {
      short: "Xulosa",
      title: "Xulosa",
      body: "Outbox uchun olti qoida.\n\n1) Baza va broker'ga hech qachon ikki qadamda yozmang: qaysi tartibda bo'lmasin, hodisa yo yo'qoladi, yo to'qib chiqariladi. 2) Hodisani ma'lumot bilan bitta tranzaksiyada outbox jadvaliga qo'shing. 3) Relay yuborilmagan qatorlarni e'lon qiladi va ack'dan keyin belgilaydi; bu at-least-once, hech qachon exactly-once emas. 4) Iste'molchilar event id bo'yicha, ta'sir bilan bitta tranzaksiyada dedup qiladi. 5) Xabarlarga aggregate id'ni kalit qiling va relay'larni kalit bo'yicha bo'ling, shunda bitta aggregate hodisalari tartibda qoladi. 6) Yuborilgan qatorlarni o'chiring yoki partition'ini tashlang; soddalik uchun polling'ni, past kechikish uchun log'ni o'qishni tanlang.",
    },
  },
  scenarios: {
    "broker-down": {
      label: "Broker 30 s o'chiq",
      steps: {
        "down-pile": {
          short: "Broker o'chiq",
          title: "Broker 30 soniya davomida javob bermaydi",
          body: "21:40 da broker ulanishlarni qabul qilmay qo'yadi. Relay oraliqni oshirib qayta urinadi: 0.5 s, 1 s, 2 s, keyin ko'pi bilan har 5 s da.\n\nDo'kon buni sezmaydi. Xaridlar outbox qatorlari bilan commit bo'ladi, ilova odatdagidek `201` oladi. Soniyasiga 40 ta xaridda outbox'da 1 200 ta hodisa navbat kutadi.",
          check: {
            q: "Shu 30 soniyada do'kon mijozlari nimani sezadi?",
            options: [
              "Har bir xarid xato bilan tugaydi",
              "To'lovda hech narsa; ballar yarim daqiqaga yaqin kechikib keladi",
              "Xaridlar o'tadi, lekin bu 1 200 ta hodisa yo'qoladi",
            ],
            answer: 1,
            why: "Xarid yo'li faqat bazaga tegadi, shuning uchun ishlashda davom etadi. Hodisalar bazada saqlangan qatorlar, demak hech biri yo'qolmaydi, faqat kechikadi. Eski ikki yozuv bilan bu 30 soniya 1 200 ta timeout yoki yo'qolgan hodisa degani bo'lardi.",
          },
          fields: {
            "connection refused": "Broker ishlamayapti. Relay hech narsa e'lon qilinmaganini biladi.",
            retry: "Oraliqlar o'sib boradi, broker tiklanayotganda relay uni bosib qo'ymaydi.",
            "201": "To'lov endi broker'ga bog'liq emas.",
            "unsent rows": "Navbat: saqlangan, tartibli, kutib turibdi.",
          },
        },
        "down-drain": {
          short: "Bo'shatish",
          title: "Broker qaytadi va navbat bo'shaydi",
          body: "21:40:30 da broker qaytadi. Relay navbatni 200 tadan paketlarda, har kalit uchun outbox tartibida e'lon qiladi va 2 soniyaga yetmay outbox yana bo'shaydi.\n\nEng eski hodisa 31 s kutdi. Hech narsa yo'qolmadi, tartib ham buzilmadi. Broker yiqilgan paytda yo'lda bo'lgan paket ikkinchi marta e'lon qilinadi, iste'molchining dedup'i esa uni tashlab yuboradi.",
          fields: {
            "in id order": "Bir xil kalit, bir xil relay, outbox'dagi tartib.",
            "unsent rows": "Yana nolga tushdi.",
            "31 s": "Uzilish yo'qotishga emas, kechikishga aylandi.",
            dedup: "At-least-once yetkazish, exactly-once ta'sir.",
          },
        },
      },
    },
  },
};

export default text;
