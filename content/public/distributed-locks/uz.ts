import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Taqsimlangan lock'lar",
  summary:
    "Marketpleys sotuvchilarga pulni har tunda ishga tushadigan job orqali to'laydi. Ishonchlilik uchun ikkita pod qo'yilgach, job ikki marta ishlaydi va har bir sotuvchiga ikki marta pul o'tadi. Redis'dagi lock bir pod'ni ikkinchisini kutishga majbur qiladi, toki lease job o'rtasida tugamaguncha yoki muzlab qolgan jarayon uyg'onib, lock hali o'zida deb o'ylamaguncha. Baza tekshiradigan fencing token, bankdagi idempotency kaliti va Redlock'ga halol nazar lock nimani va'da qila olishini, nimani qila olmasligini, qachon esa lock'ni bazaning o'zida olish yaxshiroq ekanini ko'rsatadi.",
  learn: [
    "Nega bitta jarayon ichidagi mutex pod'lar orasida hech narsani to'smaydi va `SET key token NX PX` lease'li lock'ni qanday quradi",
    "Faqat o'z lock'ingizni bo'shatish va uzaytirish: token Lua skript ichida solishtiriladi",
    "Nega GC pauzasi yoki soatning sakrashi har qanday lease'ni buzadi va storage tekshiradigan fencing token eskirgan egasini qanday zararsiz qiladi",
    "Redlock nimani tuzatadi, nimani tuzatmaydi va qachon baza lock'i yoki leader election yaxshiroq tanlov",
  ],
  nodes: {
    a: "Worker A",
    b: "Worker B",
    db: "To'lovlar bazasi",
    bank: "Bank",
    redis: "Redis",
  },
  metrics: {
    dup: "Ikki marta to'lov",
    stale: "Qabul qilingan eskirgan yozuv",
    rejected: "Rad etilgan eskirgan yozuv",
  },
  steps: {
    cron: {
      short: "Job",
      title: "Har tunda bitta pod sotuvchilarga to'laydi",
      body: "Soat 02:00 da rejali job kutilayotgan to'lovlarni o'qiydi, har biri uchun bankka o'tkazma yuboradi va uni to'langan deb belgilaydi. Oddiy tunda bu 18 soniyada 2 140 ta to'lov.\n\nPod bitta, demak ishga tushish ham bitta. Yana kim shu ishni qilyapti, degan savol hech kimning xayoliga kelmagan.",
      fields: {
        cron: "Servis ichidagi taymer: har tun soat 02:00 da.",
        pending: "Hali yuborilmagan to'lovlar. Job'ning ish ro'yxati.",
        transfers: "Har qator uchun haqiqiy pul o'tkazmasi.",
        "18 s": "Job ishni qancha vaqt ushlab turadi. Bu keyin muhim bo'ladi.",
      },
    },
    scaled: {
      short: "Ikki pod",
      title: "Ikkinchi pod qo'shiladi va har sotuvchiga ikki marta to'lanadi",
      body: "Ishonchlilik uchun servis endi ikkita pod'da ishlaydi. Ikkalasida ham jadval bir xil. 02:00 da ikkalasi ham birorta to'lovni belgilashga ulgurmay, o'sha 2 140 ta kutilayotgan to'lovni o'qiydi va hammasini yuboradi.\n\nBank 2 140 ta o'tkazmani ikki marta bajaradi. Kod o'zgarmadi: faqat uni ishga tushirayotgan nusxalar soni o'zgardi.",
      check: {
        q: "Har pod job'ni o'z jarayoni ichidagi mutex bilan o'raydi. Bu yordam beradimi?",
        options: [
          "Ha, mutex ikki marta ishga tushishni to'xtatadi",
          "Yo'q: har jarayonning o'z mutex'i bor, pod'lar bir-birinikini ko'rmaydi",
          "Faqat ikkala pod bitta mashinada ishlasa",
        ],
        answer: 1,
        why: "Mutex bitta jarayon xotirasida yashaydi. Ikki pod ikki jarayon, ko'pincha ikki mashinada; bitta host'da bo'lsa ham, biri ikkinchisining mutex'ini ko'rmaydi. Lock ikkalasi ham yeta oladigan joyda turishi kerak.",
      },
      fields: {
        "pod-b": "Aynan o'sha nusxa, 4 ms keyin ishga tushgan.",
        pending: "Ikkalasi ham ro'yxatni hech narsa belgilanmasdan oldin o'qiydi.",
        "two identical schedules": "Masshtablash faqat quvvatni emas, taymerni ham nusxaladi.",
        "paid twice": "Haqiqiy pulga tushadigan bug, birdaniga.",
      },
    },
    setnx: {
      short: "SET NX",
      title: "Redis'da lock: kalit yo'q bo'lsagina SET, lease bilan",
      body: "Ishga tushishdan oldin har pod `SET lock:payouts:<sana> <token> NX PX 30000` ni sinab ko'radi. Redis buyruqlarni birma-bir bajaradi, shuning uchun aynan bitta pod `OK` oladi; ikkinchisi hech narsa olmaydi va bu safar ishlamaydi.\n\nQiymat shu egaga xos tasodifiy token. `PX 30000` bu **lease**: ega o'lib qolsa, kalit 30 soniyadan keyin yo'qoladi va ertangi ishga tushish abadiy to'silib qolmaydi.",
      watch: "Hech qachon `SETNX` va `EXPIRE` ni ikki alohida buyruq qilmang: ular orasidagi yiqilish hech qachon tugamaydigan lock qoldiradi.",
      fields: {
        NX: "Kalit yo'q bo'lsagina yoz. Tekshirish va yozish bitta qadam.",
        PX: "Millisekunddagi lease. O'lgan ega lock'ni abadiy to'sa olmaydi.",
        "7f3c9a1e": "Tasodifiy token: lock kimda ekani, bo'shatish uchun kerak.",
        OK: "Lock pod-a da.",
        "(nil)": "Kalit allaqachon bor. pod-b ishlamaydi.",
      },
    },
    release: {
      short: "Bo'shatish",
      title: "Faqat hali ham o'zingniki bo'lgan lock'ni bo'shat",
      body: "Job tugagach, pod kalitni o'chiradi. Lekin faqat kalitda hali uning o'z tokeni turgan bo'lsa, solishtirish va o'chirishni esa bitta Lua skriptda qiladi, Redis uni bitta qadam sifatida bajaradi.\n\nOddiy `DEL` sekin tunni kutib yotgan bug bo'lardi: lease tugab, lock'ni boshqa pod olgan bo'lsa, birinchi pod'ning `DEL` i boshqa pod'ning lock'ini bo'shatib yuboradi.",
      check: {
        q: "Job tugaganda nega shunchaki `DEL lock:payouts:<sana>` qilinmaydi?",
        options: [
          "Bu o'sha narsa, faqat qisqaroq",
          "Lease allaqachon tugagan va lock pod-b da bo'lsa, `DEL` pod-b ning lock'ini bo'shatadi va uchinchi ishga tushish boshlanishi mumkin",
          "`DEL` Lua skriptdan sekinroq",
        ],
        answer: 1,
        why: "Token tekshiruvisiz lease'i tugagan ega hozir u yerda nima tursa, shuni o'chiradi: birovning lock'ini. Token \"bo'shatish\" ni \"o'zimnikini bo'shatish\" ga aylantiradi. Skript tekshirish va o'chirishni atomar ushlaydi.",
      },
      fields: {
        GET: "Lock hozir kimda ekanini o'qi.",
        ARGV: "Lock olinganda shu pod'ga berilgan token.",
        DEL: "Tokenlar mos kelsagina o'chir.",
        "return 0": "Endi bizniki emas: hech narsaga tegma.",
      },
    },
    expiry: {
      short: "Lease",
      title: "Job lease'dan uzoqroq ishlaydi",
      body: "Oy oxiri: 8 000 ta to'lov, job 45 soniya ishlaydi. Lease esa 30. 02:00:30 da pod-a 5 210-to'lovda turganda kalitning muddati tugaydi, pod-b lock'ni oladi va pod-a hali yuborayotgan o'sha 2 790 ta to'lovni boshlaydi.\n\nIkki pod bir-biridan uzoqlashguncha o'nga yaqin sotuvchiga ikki marta to'lanadi. Oxirida pod-a ning bo'shatishi 0 qaytaradi: token tekshiruvi ishladi, lekin zarar undan oldin bo'lib bo'lgan edi.",
      fields: {
        "lease 30 s": "18 soniyalik job uchun tanlangan. Hech kim uni yangilamagan.",
        expired: "Redis kalitni o'z vaqtida o'chiradi. U job hali ishlayotganini bila olmaydi.",
        OK: "Redis uchun bu bo'sh lock, to'g'ri berilgan.",
        "2 790": "pod-a hali belgilamagan qatorlar, endi ikki qo'lda.",
        "not its token": "Xavfsiz bo'shatish o'z ishini qildi, lekin kech.",
      },
    },
    renew: {
      short: "Uzaytirish",
      title: "Job ishlayotganda lease'ni uzaytir",
      body: "Job ichidagi watchdog thread har 10 soniyada lease'ni uzaytiradi, o'sha token tekshiruvi bilan: kalit hali bizniki bo'lsagina `PEXPIRE`. Skript 0 qaytarsa, lock yo'qolgan va job paketni tugatmasdan darhol to'xtaydi.\n\nLease qisqa qoladi, shuning uchun yiqilgan ega lock'ni ko'pi bilan 30 soniyada bo'shatadi, uzun job esa tirik ekan, lock'ni ushlab turadi.",
      watch: "Lease'ning uchdan birida uzaytiring: bitta o'tkazib yuborilgan uzaytirish hali lock'ning yo'qolishi emas.",
      fields: {
        PEXPIRE: "Millisekundda yangi lease o'rnat.",
        ARGV: "Avval token, keyin lease'ning yangi uzunligi.",
        "every 10 s": "30 soniyalik lease'ning uchdan biri.",
        "stops at once": "Lock'ni yo'qotish davom etish huquqini yo'qotish demak.",
      },
    },
    pause: {
      short: "Pauza",
      title: "Ega lease'dan uzoqroq muzlaydi va uyg'onadi",
      body: "02:00:05 da pod-a `po_5501` to'lovini oladi, runtime esa to'liq garbage collection uchun butun jarayonni to'xtatadi. Watchdog ham muzlaydi. Lease tugaydi, pod-b lock'ni oladi va `po_5501` ni to'laydi.\n\n41 soniyadan keyin pod-a siklining o'rtasidan davom etadi, vaqt o'tganini bilmaydi ham, va o'tkazmani yana yuboradi. VM migratsiyasi, swap yoki Redis'da oldinga sakragan soat ham xuddi shunday qiladi: lease vaqt haqidagi va'da, ega esa vaqt to'xtaganini ko'ra olmaydi.",
      check: {
        q: "pod-a har o'tkazmadan oldin `GET lock` qilib tekshiradi. Endi xavfsizmi?",
        options: [
          "Ha, u lock o'zida ekanini doim biladi",
          "Yo'q: pauza tekshiruv bilan o'tkazma orasiga tushishi mumkin",
          "Faqat tekshiruv Lua skript ichida bo'lsa",
        ],
        answer: 1,
        why: "Eganing har qanday tekshiruvi o'tmishni o'qish. Jarayon muvaffaqiyatli tekshiruvdan keyin darhol, lease qadar yoki undan ham uzoq muzlab, keyin eskirgan bilim bilan harakat qilishi mumkin. Eski egani yangisidan faqat yozuvni qabul qiladigan joy ajrata oladi.",
      },
      fields: {
        "GC pause": "Butun jarayon to'xtaydi. Hech bir thread ishlamaydi, uzaytiruvchi ham.",
        "lease expired": "Redis nuqtai nazaridan to'g'ri: uzaytirish kelmadi.",
        "41.2 s": "Lease'dan uzoq. Kam bo'ladi, lekin bo'ladi.",
        "paid again": "Eski ega endi o'zida bo'lmagan lock bilan ish qiladi.",
      },
    },
    fencing: {
      short: "Fencing",
      title: "Fencing token: baza eski egani rad etadi",
      body: "Lock skripti endi hisoblagichga `INCR` ham qiladi va raqamni lock bilan birga qaytaradi: pod-a 33 ni oldi, pod-b keyinroq 34 ni. To'lovlar jadvalidagi har band qilish shu raqamni olib yuradi, baza esa uni faqat o'sha qatorga kattaroq raqam yozmagan bo'lsa qabul qiladi.\n\npod-a 33 bilan uyg'onadi, keyingi band qilishi 0 qatorga mos keladi va u ishni to'xtatadi. Faqat band qilishdan o'tib bo'lgan bitta o'tkazma sirg'alib o'tdi.",
      watch: "Tekshiruv yozuv bo'ladigan joyda bo'lishi shart. Hech kim tekshirmaydigan token oddiy izoh.",
      fields: {
        fence: "Fencing token, o'zi himoya qiladigan qatorda saqlanadi.",
        "fence <= 33": "Bu qatorga yangiroq ega tegmagan bo'lsagina qabul qil.",
        "34": "pod-b ning tokeni. Kattaroq demak yangiroq.",
        "UPDATE 0": "Rad etildi: eskirgan egani bazaning o'zi qaytaradi.",
        abort: "Job 0 qatorni \"lock'ni yo'qotding\" deb tushunadi va to'xtaydi.",
      },
    },
    bank: {
      short: "Bank",
      title: "Bank fence'ni tekshira olmaydi: idempotency kaliti ishlat",
      body: "Bank fencing token haqida hech narsa bilmaydi. Shuning uchun har o'tkazma `Idempotency-Key: <to'lov id>` ni olib yuradi. pod-a `po_5501` ni qayta yuborganda bank ikkinchisini bajarmaydi, allaqachon bajargan o'tkazmasini qaytaradi.\n\nEndi lock optimallashtirish: u ishni bitta pod'da ushlaydi. To'g'rilikni bazadagi fence va bankdagi kalit ta'minlaydi, ular lock pand bergan paytda ham ishlaydi.",
      fields: {
        "Idempotency-Key": "Bitta to'lov, bitta kalit, istalgan pod'dan har urinishda.",
        amount_minor: "Minor birliklarda 12 500.00, takrorda ham o'sha.",
        status: "Asl o'tkazmaning natijasi.",
        replayed: "Yangi o'tkazma emas: birinchisiga berilgan javob.",
      },
    },
    redlock: {
      short: "Redlock",
      title: "Redis failover bitta lock'ni ikki marta beradi",
      body: "Redis asinxron replikatsiya qiladi. pod-a primary'dan `OK` oladi, primary 2 ms keyin yiqiladi, kalitni hech ko'rmagan replika primary qilib ko'tariladi va pod-b ham `OK` oladi. Bir vaqtda ikki ega.\n\n**Redlock** bunga 5 ta mustaqil Redis node va lease ichida ko'pchilik bergandagina lock bilan javob beradi. Bu bitta node'ning yiqilishiga chidaydi, lekin baribir fencing token bermaydi va pauza hamda soat siljishi chegaralangan deb faraz qiladi, shuning uchun unga bildirilgan tanqid o'rinli qoladi. Bu yerda fence va idempotency kaliti buni pulga emas, bitta behuda ishga tushishga aylantiradi.",
      check: {
        q: "Bitta Redis lock'i qachon yetarli?",
        options: [
          "Hech qachon",
          "Kamdan-kam ikki marta ishga tushish faqat ishni behuda qilsa, to'g'rilik esa boshqa joyda fence, unique kalit yoki idempotency kaliti bilan qo'riqlansa",
          "Faqat Redlock bo'lsa",
        ],
        answer: 1,
        why: "Samaradorlik uchun lock (bir ishni ikki marta qilmaslik) ba'zan adashishi mumkin. To'g'rilik uchun lock hech qachon adashmasligi kerak, buni esa lease'ga asoslangan birorta lock yolg'iz va'da qila olmaydi. Unda storage tekshiradigan fence yoki ularni beradigan consensus ombori kerak.",
      },
      fields: {
        async: "Primary replika kalitni olishidan oldin javob beradi.",
        promoted: "Yangi primary lock haqida hech narsa eslamaydi.",
        "two holders": "Lock aynan oldini olishi kerak bo'lgan holat.",
        Redlock: "Mustaqil node'lar ko'pchiligi, lekin baribir lease'ga asoslangan.",
        "fencing token": "Redlock bermaydigan va to'g'rilikka kerak bo'lgan narsa.",
      },
    },
    dblock: {
      short: "Baza lock'i",
      title: "Lock'ni ma'lumot turgan bazada ol",
      body: "To'lovlar baribir bitta Postgres'da, shuning uchun job lock'ni o'sha yerda oladi. `pg_try_advisory_xact_lock` umuman kim ishlashini hal qiladi, `FOR UPDATE SKIP LOCKED` esa to'lanayotgan har qatorni lock qiladi, shunda ikki pod ishni ustma-ust tushmasdan bo'lisha ham oladi. Lock'lar tranzaksiya tugashi yoki ulanish uzilishi bilan tugaydi.\n\nMuzlagan ega o'z sessiyasi va lock'ini ushlab turadi, shuning uchun uning o'rnini hech kim egallamaydi; ulanishi uzilsa, tranzaksiyasi ham yo'qoladi va uning birorta yozuvi yetib bormaydi. Uzoq yashaydigan yagona jarayon, masalan scheduler uchun consensus omborida (etcd, ZooKeeper) leader election ishlating va uning revision raqamlarini fence sifatida oling.",
      watch: "Lock servisini faqat ma'lumot lock qila oladigan tizimda turmagan bo'lsa qo'shing.",
      fields: {
        pg_try_advisory_xact_lock: "Bir marta urinib ko'r, kutma. COMMIT yoki ROLLBACK gacha ushlanadi.",
        false: "Bugun job'ni boshqa pod bajaryapti. Bu pod chiqib ketadi.",
        "SKIP LOCKED": "Qator lock'lari: har to'lov aynan bitta pod qo'lida.",
        COMMIT: "Lock va yozuvlar birga, bitta tranzaksiyada tugaydi.",
      },
    },
    recap: {
      short: "Xulosa",
      title: "Xulosa",
      body: "Taqsimlangan lock'lar uchun olti qoida.\n\n1) Mutex bitta jarayonni himoya qiladi; pod'lar orasida lock umumiy joyda turishi kerak. 2) Lock'ni bitta atomar `SET key token NX PX` bilan oling, bo'shatish va uzaytirishni esa faqat skriptdagi token tekshiruvi bilan qiling. 3) Ishlayotganda lease'ni uzaytiring, uzaytirish o'tmasa darhol to'xtang. 4) Har qanday lease'dan pauza yoki soat sakrashi uzoqroq yashashi mumkin, shuning uchun storage har yozuvda fencing token'ni tekshirishi shart. 5) Fence tekshirib bo'lmaydigan joyda, masalan tashqi API'da, idempotency kalitlarini ishlating. 6) Ma'lumot turgan bazadagi lock'ni yoki consensus omboridagi leader election'ni afzal ko'ring; Redis lock'ini, Redlock ham shu jumladan, samaradorlik vositasi deb biling.",
    },
  },
  scenarios: {
    "pause-past-lease": {
      label: "Ega muzlaydi",
      steps: {
        "p-freeze": {
          short: "Muzlash",
          title: "Fence'lar joyida, pod-a esa lease'dan uzoqroq muzlaydi",
          body: "03:10 da lock pod-a da, fence 51, har 10 soniyada uzaytiriladi. O'n ikki soniyadan keyin jarayon butunlay to'xtaydi. 03:10:20 dagi uzaytirish ishga tushmaydi, lease 03:10:42 da tugaydi, pod-b 52-fence bilan lock'ni oladi va o'sha paketni boshlaydi.\n\nBu avvalgi nosozlikning o'zi. Farqi shundaki, endi baza va bank nimanidir tekshiradi.",
          check: {
            q: "pod-a 03:10:58 da 51-fence bilan uyg'onadi. Uning keyingi band qilishi va keyingi o'tkazmasi bilan nima bo'ladi?",
            options: [
              "Ikkalasi ham avvalgidek o'tadi",
              "Band qilish rad etiladi (51 < 52), takroriy o'tkazma esa kalit bir xil bo'lgani uchun avvalgisini qaytaradi",
              "Lock yo'q bo'lgani uchun Redis ikkalasini to'sadi",
            ],
            answer: 1,
            why: "Redis yozuv yo'lida turmaydi, demak hech narsani to'sa olmaydi. Baza qatordagi fence'larni solishtiradi va 52 yozgan joyda 51 ni rad etadi. Bank o'sha idempotency kalitini ko'radi va birinchi javobni qaytaradi.",
          },
          fields: {
            "fence 51": "pod-a ning shu lock uchun tokeni.",
            "renew missed": "Muzlagan jarayon hech narsani uzaytirmaydi.",
            "lease expired": "Redis o'z ishini qiladi: lock bo'sh.",
            "fence 52": "Yangi ega, kattaroq raqam bilan.",
          },
        },
        "p-wake": {
          short: "Rad",
          title: "pod-a uyg'onadi va qaytariladi",
          body: "pod-a siklining o'rtasidan davom etadi va keyingi to'lovni 51-fence bilan band qilmoqchi bo'ladi. Qatorda allaqachon 52 turibdi, update hech narsaga mos kelmaydi va pod-a ishni to'xtatadi.\n\nHech narsa ikki marta to'lanmadi, hech bir eskirgan yozuv tushmadi. Pauza bitta pod'ning 46 soniyasiga tushdi, pulga emas.",
          fields: {
            fence: "Qatordagi 52 ga qarshi 51: yangiroq ega yutadi.",
            "UPDATE 0": "Baza eskirgan egani rad etadi.",
            stop: "Fence tekshiruvidan o'tmaslik lock'ni yo'qotish demak: to'xta, qayta urinma.",
          },
        },
      },
    },
  },
};

export default text;
