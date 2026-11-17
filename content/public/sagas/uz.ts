import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Saga va outbox",
  summary:
    "Bitta buyurtma uchun boshqa ikki servisda to'lov va ombor bandi kerak, har birining o'z bazasi bor. Hammasini o'raydigan bitta tranzaksiya yo'q. Uchalasini butun tizimni qulflamasdan qanday kelishtirib turish mumkin.",
  learn: [
    "Nega bitta baza tranzaksiyasi uchta servisni qamray olmaydi",
    "Ikki fazali commit (2PC) nimaga tushadi va undan nega qochishadi",
    "Saga: lokal qadamlar va kompensatsiya, orkestratsiya yoki xoreografiya",
    "Outbox: bazaga yozish va hodisa endi bir-biridan ajralmaydi",
  ],
  nodes: {
    client: "Do'kon ilovasi",
    orders: "Buyurtmalar",
    odb: "Buyurtmalar bazasi",
    payments: "To'lovlar",
    inventory: "Ombor",
    bus: "Hodisalar logi",
    relay: "Outbox relay",
  },
  metrics: {
    p95: "Buyurtma p95",
    orphans: "Pul yechildi, buyurtma yo'q",
    lost: "Yo'qolgan hodisalar",
  },
  steps: {
    "three-services": {
      short: "Uch servis",
      title: "Bitta buyurtma, uchta baza",
      body: "Do'kon ilovasi buyurtma beradi. Buyurtmalar servisi uni saqlaydi, keyin kartadan pul yechish uchun To'lovlar'ni va ikkita chiroqni band qilish uchun Ombor'ni chaqiradi.\n\nHar servisning o'z bazasi bor. Buyurtmalar bazasidagi `BEGIN ... COMMIT` qolgan ikkitasiga hech qanday ta'sir qilmaydi.",
      fields: {
        items: "Omborda nimani band qilish kerak.",
        amount: "To'lovlar'da qancha yechish kerak, eng kichik birlikda.",
        status: "`pending`: buyurtma bor, lekin to'lov va ombor hali hal bo'lmagan.",
      },
    },
    "half-done": {
      short: "Yarim ish",
      title: "Pul yechildi, ombor chaqiruvi yiqildi",
      body: "To'lovlar kartadan pulni yechdi. Keyin Ombor ishlamay qoldi va band qilish muvaffaqiyatsiz tugadi.\n\nXaridor hech qachon jo'natilmaydigan buyurtma uchun pul to'ladi. To'lovni hech narsa qaytarmaydi: u boshqa bazada allaqachon commit bo'lgan.",
      watch: "Har servis o'zi commit qiladi. 2-qadamdagi xato 1-qadamni o'zi bekor qilmaydi.",
      fields: {
        order_id: "Band qilish qaysi buyurtmaga tegishli.",
        "503": "Ombor ishlamayapti. Undan oldingi to'lov esa allaqachon o'tgan.",
        "Retry-After": "Ombor 30 soniyadan keyin qayta urinishni so'raydi. Xaridordan pul esa allaqachon yechilgan.",
      },
    },
    "two-phase": {
      short: "2PC",
      title: "Ikki fazali commit: avval hamma ovoz beradi",
      body: "Koordinator (bu yerda Buyurtmalar) har bir ishtirokchidan **prepare** qilishni so'raydi: ishni bajar, qatorlarni qulfla va ovoz ber. Hamma «ha» desa, **commit** yuboradi, aks holda **abort**.\n\nYetim to'lovlar yo'qoldi. Lekin har ishtirokchi qulfni butun aylanish davomida ushlab turadi, p95 uch barobar oshadi.",
      check: {
        q: "To'lovlar va Ombor «ha» deb ovoz bergach, Buyurtmalar yiqildi. Ikki ishtirokchi nima qiladi?",
        options: [
          "Qulfni ushlab kutadi: o'zicha qaror qila olmaydi",
          "Timeout'dan keyin o'zi abort qilib qulfni bo'shatadi",
          "O'zi commit qiladi, chunki hamma «ha» degan",
        ],
        answer: 0,
        why: "Prepare qilgan ishtirokchi yolg'iz na commit, na abort qila oladi: natijani faqat koordinator biladi. Qulflar ushlanib turadi, boshqa buyurtmalar navbatda kutadi, p95 taxminan 9 soniyaga yetadi.",
      },
      fields: {
        PREPARE: "1-faza: ishni bajar, lekin hali commit qilma.",
        VOTE: "Ishtirokchi commit qila olishini va'da qiladi. Endi u qarorni kutishga majbur.",
        COMMIT: "2-faza: qarorni koordinator qabul qiladi. Ungacha qator qulflangan.",
      },
    },
    "in-doubt": {
      short: "Noaniq",
      title: "Koordinator ovozdan keyin yiqildi",
      body: "Buyurtmalar ovoz va qaror orasida yiqildi. To'lovlar va Ombor «ha» deb ovoz bergan, endi o'zicha na commit, na abort qila oladi.\n\nQulflar ushlanib turibdi, boshqa buyurtmalar ularning orqasida navbatda, p95 to'qqiz soniyaga yetdi. Bitta kasal node sog'lomlarini to'xtatadi: shuning uchun servislar orasida 2PC kam ishlatiladi.",
      watch: "2PC izchillik uchun mavjudlikni qurbon qiladi. Har ishtirokchi koordinator qanchalik ishlasa, shunchalik ishlaydi.",
      fields: {
        "waiting for decision": "Prepare qilgan ishtirokchi yolg'iz qaror qila olmaydi: boshqa tomon commit qilgan bo'lishi mumkin.",
        lock: "Hamyon qatori hali qulflangan. `u_42` uchun boshqa har bir to'lov kutadi.",
        "coordinator unreachable": "Natijani biladigan yagona node ishlamayapti.",
      },
    },
    "saga-log": {
      short: "Saga",
      title: "Saga: lokal tranzaksiyalar zanjiri",
      body: "Global qulfdan voz kechamiz. Buyurtmalar buyurtmani **saga** sifatida yuritadi: avval to'lov, keyin band qilish, har biri o'z servisida oddiy lokal tranzaksiya. Buyurtmalar **orkestrator** bo'ladi va har qadamdan keyin saga qayerdaligini yozib qo'yadi.\n\nHech kim birovning qulfini kutmaydi, p95 qaytib tushadi. Buyurtmalar yiqilsa, qayta ishga tushganda `sagas` jadvalini o'qiydi va saqlangan qadamdan davom etadi.",
      fields: {
        sagas: "Orkestratorning o'z jadvali: har ishlayotgan saga uchun bitta qator.",
        step: "Oxirgi tugagan qadam. Qayta ishga tushish shu yerdan davom etadi.",
        status: "`running`, keyin `done` yoki `compensating`.",
      },
    },
    compensate: {
      short: "Kompensatsiya",
      title: "Xato: kompensatsiya bilan qaytarish",
      body: "Ombor «qolmagan» deb javob berdi. Saga commit bo'lgan to'lovni rollback qila olmaydi, shuning uchun **kompensatsiya**ni bajaradi: to'lovni biznes ma'nosida bekor qiladigan qaytarish (refund).\n\nKompensatsiyalar teskari tartibda bajariladi va takrorlansa ham xavfsiz bo'lishi kerak: orkestrator yiqilib, refund'ni ikki marta yuborishi mumkin.",
      watch: "Kompensatsiya — bu yangi amal, undo emas. Xaridor ko'chirmada ham yechishni, ham qaytarishni ko'rishi mumkin.",
      fields: {
        "Idempotency-Key": "Saga ID'sidan yasalgan. Shu kalit bilan ikkinchi refund birinchisining natijasini qaytaradi.",
        reason: "Buyurtma nega bekor qilinmoqda.",
        status: "To'lov bekor qilindi. Saga holati `compensated` bo'ladi.",
      },
    },
    choreography: {
      short: "Xoreografiya",
      title: "Xoreografiya: servislar hodisalarga javob beradi",
      body: "Xuddi shu sagani yuritishning boshqa yo'li: orkestrator yo'q. Buyurtmalar `OrderCreated` e'lon qiladi, To'lovlar unga javoban `PaymentCaptured` e'lon qiladi, Ombor esa bunga javob beradi.\n\nServislar bir-biriga kamroq bog'liq, mijoz javobni tezroq oladi. Narxi: jarayon ko'p joyga tarqalgan, «1042 buyurtma qayerda qotdi?» degan savolga hamma servis bo'ylab trace kerak.",
      watch: "Qadamlar ko'p bo'lsa, orkestratsiyani kuzatish osonroq. Xoreografiya kam ishtirokchili qisqa jarayonlarga mos.",
      check: {
        q: "Buyurtmalar buyurtmani commit qiladi, keyin hodisani e'lon qiladi. Broker timeout beradi, kod voz kechadi. Nima bo'ladi?",
        options: [
          "Broker hodisani keyinroq o'zi yetkazadi",
          "Baza commit'i rollback bo'ladi, buyurtma saqlanmaydi",
          "Buyurtma abadiy pending qoladi, ogohlantirish yo'q",
        ],
        answer: 2,
        why: "Baza commit'i allaqachon bajarilgan, hodisa esa faqat xotirada edi. 1042 buyurtma `pending` bo'lib qoladi: hech kim pul yechmaydi, band qilmaydi, yo'qolgan hodisalar kuniga 9 taga yetadi.",
      },
      fields: {
        key: "Buyurtma ID'si. Bitta buyurtmaning barcha hodisalari bitta partition'ga, tartib bilan tushadi.",
        type: "Nima bo'ldi. Har obunachi bunga nima qilishni o'zi hal qiladi.",
        event_id: "Shu hodisaning noyob ID'si. Iste'molchilar takrorni u orqali tashlab yuboradi.",
        offset: "Yozuvning logdagi o'rni. Broker uni saqladi.",
      },
    },
    "dual-write": {
      short: "Ikki yozuv",
      title: "Bazaga saqlandi, hodisa yuborilmadi",
      body: "Buyurtmalar buyurtmani commit qiladi, keyin hodisani e'lon qiladi: ikki alohida yozuv. Broker timeout berdi va kod voz kechdi.\n\n1042 buyurtma bazada abadiy `pending` bo'lib qoladi. Hech kim pul yechmaydi, hech kim band qilmaydi, hech qanday ogohlantirish yo'q.",
      watch: "Bazaga va brokerga yozish — ikki xil tizim. Biri muvaffaqiyatli bo'lgandan keyin ikkinchisi yiqilishi mumkin.",
      fields: {
        ERROR: "E'lon qilish baza commit'idan keyin yiqildi.",
        committed: "Baza qismi allaqachon bajarilgan va rollback bo'lmaydi.",
        "no retry": "Hodisa faqat xotirada edi. Jarayon davom etgach, u yo'qoldi.",
      },
    },
    outbox: {
      short: "Outbox",
      title: "Outbox: hodisa buyurtma bilan birga yoziladi",
      body: "Buyurtmalar buyurtmani **va** hodisani bitta lokal tranzaksiyada `outbox` jadvaliga yozadi. Yo ikkala qator ham bor, yo hech biri yo'q.\n\nAlohida relay outbox'dagi yangi qatorlarni o'qiydi va broker qabul qilmaguncha qayta urinib e'lon qiladi. Hodisa kechikishi mumkin, lekin endi yo'qolmaydi.",
      check: {
        q: "Relay `ev_5c1` ni e'lon qiladi va qatorni «yuborildi» deb belgilashdan oldin yiqiladi. Qayta ishga tushgach nima bo'ladi?",
        options: [
          "Hodisa yo'qoladi: relay uni unutdi",
          "Xuddi shu hodisani yana e'lon qiladi",
          "Broker uni «allaqachon saqlangan» deb rad etadi",
        ],
        answer: 1,
        why: "Qator hali belgilanmagan, shuning uchun relay uni yana yuboradi, broker esa yangi offset bilan saqlaydi. Outbox kamida bir marta kafolat beradi, To'lovlar nusxani `event_id` bo'yicha o'tkazib yuboradi.",
      },
      fields: {
        BEGIN: "Buyurtmalar bazasida bitta lokal tranzaksiya. Broker qatnashmaydi.",
        outbox: "Hali e'lon qilinmagan hodisalarning oddiy jadvali.",
        event_id: "Shu yerda yaratiladi, shuning uchun bu qatorning har takrori bir xil ID bilan ketadi.",
        COMMIT: "Shu lahzadan buyurtma va uning hodisasi birga mavjud.",
      },
    },
    dedupe: {
      short: "Takrorsiz",
      title: "At-least-once: iste'molchi takrorni tashlaydi",
      body: "Relay `ev_5c1` qatorini e'lon qildi va uni «yuborildi» deb belgilashdan oldin yiqildi. Qayta ishga tushganda yana e'lon qiladi. Outbox **kamida bir marta** (at-least-once) kafolat beradi, hech qachon aynan bir marta emas.\n\nTo'lovlar ishlagan har `event_id`'ni to'lov bilan bir tranzaksiyada yozib qo'yadi. Ikkinchi nusxa unique kalitga uriladi va o'tkazib yuboriladi.",
      fields: {
        offset: "Yangi offset: broker uchun bu yangi yozuv.",
        event_id: "Avvalgi ID'ning o'zi. Nusxa ekanini faqat shundan bilish mumkin.",
        "ON CONFLICT": "`event_id` dagi unique kalit ikkinchi insert'ni xatosiz rad etadi.",
        skip: "Ikkinchi marta pul yechilmaydi. Iste'molchi shunchaki ack beradi va davom etadi.",
      },
    },
    recap: {
      short: "Xulosa",
      title: "Xulosa",
      body: "Servislar oralig'idagi ish uchun to'rt qoida.\n\n1) Servislar orasida tranzaksiya yo'q; 2PC'dan qoching, u hammani eng sekin node'da to'xtatadi. 2) Saga ishlating: lokal qadamlar, har biri uchun kompensatsiya, orkestrator yoki hodisalar orqali. 3) Hodisalarni ma'lumot bilan bir tranzaksiyada outbox orqali yozing. 4) Yetkazish kamida bir marta, shuning uchun har iste'molchi `event_id` bo'yicha takrorni tashlaydi.",
    },
  },
};

export default text;
