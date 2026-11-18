import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Hujjatlarni uzluksiz raqamlash",
  summary:
    "Ko'p mamlakatlarda chiqarilgan hisob-varaqlar uzluksiz raqamlanishi shart: har seriya va har yil ichida birorta raqam tushib qolmasligi va ikki marta ishlatilmasligi kerak, auditor esa reyestrni tekshiradi. Bazadagi sequence bo'shliq qoldiradi, MAX()+1 esa dublikat beradi. Yakunlash tranzaksiyasida olinadigan hisoblagich qatori ikkala kafolatni ham beradi, evaziga yozuvchilar navbatda turadi. Shuning uchun dars bu narxni o'lchaydi va uni kichik ushlaydi.",
  learn: [
    "Nega bazadagi sequence'lar ataylab bo'shliq qoldiradi va nega MAX()+1 bitta raqamni ikki hujjatga beradi",
    "Har seriya va yil uchun hisoblagich qatori: hujjat bilan bitta tranzaksiyada UPDATE ... RETURNING bilan olinadi; uning qator lock'i o'tkazuvchanlikka qanchaga tushadi",
    "Raqam qoralamada emas, yakunlashda olinadi; tranzaksiyaning lock ostidagi qismi qisqa ushlanadi",
    "O'chirish o'rniga bekor qilish, har filialga o'z seriyasi va yil almashinuvi kompaniyaning qonuniy vaqt zonasida",
  ],
  nodes: {
    clerk: "Buxgalter",
    clerk2: "Ikkinchi buxgalter",
    branch: "Filial",
    api: "Hisob-varaq servisi",
    db: "Hisob-varaqlar bazasi",
    export: "Reyestr eksporti",
    auditor: "Soliq auditori",
  },
  metrics: {
    gaps: "Tushib qolgan raqamlar",
    dups: "Ikki marta ishlatilgan raqamlar",
    tps: "Seriya bo'yicha yakunlash",
    wait: "Yakunlashda p99 kutish",
  },
  steps: {
    issue: {
      short: "Raqam",
      title: "Har hisob-varaq navbatdagi raqamni oladi",
      body: "Buxgalter hisob-varaq yaratadi, servis esa unga `INV-2026-000481` kabi raqam beradi: seriya, yil va tartib raqami. Raqam qoralama yaratilgan zahoti bazadagi sequence'dan olinadi.\n\nKompaniya amal qiladigan qonun bitta seriya va yil ichidagi chiqarilgan hisob-varaqlar uzluksiz raqamlanishini talab qiladi. Tushib qolgan raqamlar yozma tushuntirilishi kerak, takrorlangan raqam esa ikki hujjatni bitta shaxsga da'vo qildiradi.",
      fields: {
        number: "Hujjatning yuridik identifikatori: unga bosiladi va hisobotga kiradi.",
        nextval: "Bazadagi sequence: tez, hech qachon bloklamaydi, hech qachon orqaga qaytmaydi.",
        draft: "Hujjat hali chiqarilmagan, lekin allaqachon raqamni egallab turibdi.",
        "INV-2026-000481": "INV seriyasi, 2026 yil, yilning 481-hujjati.",
      },
    },
    gaps: {
      short: "Bo'shliqlar",
      title: "Reyestrda teshiklar bor",
      body: "Yil oxirida reyestr soliq auditori uchun eksport qilinadi. Unda 214 ta raqam tushib qolgan.\n\nUlarning birortasi ham yo'qolgan hisob-varaq emas. Keyin rollback bo'lgan tranzaksiya olgan sequence qiymati butunlay ketadi. O'chirilgan qoralama raqamini o'zi bilan olib ketadi. `CACHE 20` li sequence har ulanishga 20 ta raqamni oldindan beradi, qayta ishga tushirish esa ishlatilmaganlarini tashlab yuboradi; kesh bo'lmasa ham, yiqilishdan keyin 32 tagacha qiymat o'tkazib yuborilishi mumkin. Har bir teshik yozma tushuntirish talab qiladi.",
      watch: "Sequence id uchun to'g'ri vosita. Qonun uzluksiz bo'lishini talab qiladigan raqam uchun esa noto'g'ri.",
      check: {
        q: "Nega `ROLLBACK` 000483 ni sequence'ga qaytarib bermaydi?",
        options: [
          "Bu bazadagi bug",
          "Sequence'lar tranzaksiyadan tashqarida ataylab ishlaydi: aks holda har yozuvchi oldingisi commit qilishini kutardi",
          "Raqam qaytariladi, lekin faqat qayta ishga tushirishdan keyin",
        ],
        answer: 1,
        why: "Agar rollback raqamni qaytara olganda, keyingi yozuvchi 000483 commit bo'lish-bo'lmasligini bilmaguncha 000484 ni ololmas edi. Sequence'lar hech qachon orqaga qaytmay, shu kutishdan qochadi, bo'shliqlar esa ularning tezligi narxi.",
      },
      fields: {
        "register 2026": "Chiqarilgan hujjatlarning raqam tartibidagi yillik ro'yxati.",
        ROLLBACK: "Tranzaksiya bekor bo'ldi, u olgan raqam esa yo'q.",
        "drafts deleted": "Umuman mavjud bo'lmagan hujjatlarga tegishli raqamlar.",
        "cached values": "Ulanishga oldindan berilgan va u bilan birga yo'qolgan raqamlar.",
        "214 missing": "Har biri auditordan bitta savol.",
      },
    },
    maxplus: {
      short: "MAX+1",
      title: "MAX()+1 bitta raqamni ikki marta beradi",
      body: "Dasturchi sequence'ni almashtiradi: navbatdagi raqam = eng kattasi plus bir. Rollback endi teshik qoldirmaydi, shuning uchun rollback va kesh bo'shliqlari yo'qoladi; o'chirilgan qoralamalar esa hali ham 60 ta qoldiradi.\n\nLekin bitta millisekunddagi ikki yakunlash ikkalasi ham commit'dan oldin 481 ni o'qiydi va ikkalasi 482 ni yozadi. Unique indeks bo'lmasa, kompaniyada bir xil raqamli ikki hisob-varaq paydo bo'ladi, yiliga 40 marta. Indeks bo'lsa, ikkinchi foydalanuvchi shunchaki xato oladi.",
      fields: {
        "max(no) + 1": "Avval o'qish, keyin yozish: oradagi vaqtda boshqa tranzaksiya ham o'sha qiymatni o'qiydi.",
        "has not committed": "T2 hali T1 ning qatorini ko'rmaydi, shuning uchun o'sha maksimumni ko'radi.",
        "INV-2026-000482": "Bitta raqam, ikki hujjat, ikki xaridor.",
        "unique index": "Dublikatlarni muvaffaqiyatsiz so'rovga aylantiradi: yaxshiroq, lekin baribir noto'g'ri.",
      },
    },
    counter: {
      short: "Hisoblagich",
      title: "Har seriya va yil uchun hisoblagich qatori",
      body: "Har seriya va yil uchun bitta qator oxirgi ishlatilgan raqamni saqlaydi. Yakunlash tranzaksiyasi uni `UPDATE ... RETURNING` bilan oshiradi va qaytgan qiymatdan foydalanadi.\n\n`UPDATE` qatorni tranzaksiya tugaguncha lock qiladi. Ikkinchi yozuvchi kutadi, keyin commit bo'lgan qiymatni o'qiydi, shuning uchun ikki hujjat bir xil raqam olmaydi. Tranzaksiya rollback bo'lsa, oshirish ham u bilan birga bekor bo'ladi: raqam o'tkazib yuborilmaydi, qayta ishlatiladi.",
      check: {
        q: "Tranzaksiya hisoblagichdan 482 ni oldi, keyin rollback bo'ldi. Keyingi yakunlash qaysi raqamni oladi?",
        options: ["483", "482", "Kimdir hisoblagichni tiklamaguncha xato"],
        answer: 1,
        why: "Oshirish tranzaksiyaning bir qismi, shuning uchun rollback uni bekor qiladi: hisoblagich yana 481 da, keyingi yozuvchi 482 ni oladi. Sequence'dan farqi aynan shunda.",
      },
      fields: {
        number_counters: "Kichkina jadval: har seriya va yil uchun bitta qator.",
        last_no: "Shu seriyada berilgan oxirgi raqam.",
        year: "Raqamlash har yili qaytadan boshlanadi, shuning uchun yil kalitning bir qismi.",
        "same transaction": "Raqam va hujjat birga commit yoki birga rollback bo'ladi.",
        locked: "Shu seriyaning boshqa yozuvchilari shu yerda kutadi: bu ham kafolat, ham narx.",
      },
    },
    finalize: {
      short: "Yakunlashda",
      title: "Raqam faqat hujjat chiqarilganda",
      body: "Qoralamalar endi raqam olmaydi: ularda faqat ichki id bor. Raqam statusni `draft` dan `issued` ga o'zgartiradigan o'sha tranzaksiyada olinadi.\n\nBuxgalterlar istagancha qoralama yaratib, o'chirishi mumkin, reyestr esa faqat chiqarilgan hujjatlarni ko'radi. Oxirgi 60 ta bo'shliq ham yo'qoladi.",
      fields: {
        finalize: "Qoralamani yuridik hujjatga aylantiradigan yagona lahza.",
        RETURNING: "Yangi raqam, o'sha buyruqning o'zidan qaytib o'qiladi.",
        issued: "Shu paytdan hujjat xaridor va auditor uchun mavjud.",
        "status = 'draft'": "O'sha hujjatni ikkinchi marta yakunlash hech narsani o'zgartirmaydi.",
        "no number": "Qoralama shunchaki hali tugallanmagan ish.",
      },
    },
    serial: {
      short: "Birma-bir",
      title: "Hamma bitta qatorni kutadi",
      body: "Oy oxirida yuklama testi bitta seriyada 64 ta parallel yakunlashni yurgizadi. Sequence bilan soniyasiga 900 ta edi. Endi 80 ta, eng sekin 1% esa 780 ms kutadi.\n\nSabab CPU emas. Qator hisoblagich `UPDATE` idan `COMMIT` gacha lock'da turadi, hisoblagich esa birinchi bo'lib olinadi: keyin 40 ta qator yozuvi, jami summalar va PDF hash'i yoziladi, bu seriyaning qolgan hamma yakunlashlari esa kutib turadi. 12 ms ushlangan bitta lock soniyasiga ko'pi bilan 83 ta yakunlashga yo'l beradi.",
      fields: {
        "one series": "Hisoblagich qatori seriyaning har bir hujjati uchun umumiy.",
        "taken first": "Lock erta boshlanadi va keyingi hamma ish davomida turadi.",
        "lock held 12 ms": "Haqiqiy chegara: yozuvchilar birma-bir o'tadi.",
        "83 finalizes": "1 soniya bo'lingan lock vaqtiga; ko'proq server yordam bermaydi.",
      },
    },
    short: {
      short: "Qisqa lock",
      title: "Raqamni oxirida ol, og'ir ishni tashqarida qil",
      body: "Tekshiruv va jami summalar `BEGIN` dan oldinga ko'chadi. Tranzaksiya ichida avval qatorlar yoziladi, hisoblagich esa eng oxirida, `COMMIT` dan sal oldin olinadi. PDF, imzo va e-mail commit'dan keyin, chiqarilgan hujjatdan yasaladi.\n\nLock endi 2.4 ms davom etadi, bitta seriya soniyasiga 410 ga yaqin yakunlashni bajaradi, p99 kutish esa 18 ms ga tushadi.",
      check: {
        q: "PDF raqamni ko'rsatishi shart. Uni qayerda yasash kerak?",
        options: [
          "Tranzaksiya ichida, COMMIT'dan oldin, PDF va raqam mos tushishi uchun",
          "COMMIT'dan keyin, chiqarilgan hujjatdan; yasash muvaffaqiyatsiz bo'lsa, yasash qayta uriniladi, raqam o'zgarmaydi",
          "Raqam olinishidan oldin, vaqtinchalik belgi bilan",
        ],
        answer: 1,
        why: "PDF yasash o'nlab millisekund oladi va tranzaksiya ichida u lock'ni qolgan hamma yozuvchilar uchun ushlab turardi. Commit'dan keyin raqam yakuniy, shuning uchun yasashni hisoblagichga tegmasdan istagancha qayta urinish mumkin.",
      },
      fields: {
        "before BEGIN": "Lock talab qilmaydigan ish tranzaksiya boshlanishidan oldin bajariladi.",
        "the lock starts": "Iloji boricha kech.",
        COMMIT: "Lock tranzaksiya bilan birga tugaydi.",
        "after COMMIT": "Sekin ish lock'dan tashqarida: boshqa yozuvchilarni sekinlashtira olmaydi.",
      },
    },
    delete: {
      short: "O'chirish",
      title: "Chiqarilgan hisob-varaq o'chiriladi",
      body: "000517 hisob-varaq noto'g'ri xaridorga ketgan. Buxgalter uni o'chiradi va yangisini chiqaradi.\n\nReyestr endi 000516 dan 000518 ga sakraydi. Auditor 000517 qayerda, deb so'raydi, xaridorda esa sotuvchi umuman bo'lmagan deyayotgan hujjatning nusxasi bor.",
      fields: {
        DELETE: "Hujjatni ham, tushuntirishni ham birga o'chiradi.",
        "wrong buyer": "Haqiqiy sabab, lekin endi u faqat kimningdir xotirasida.",
        "where is 000517": "Hisoblagich oldini ololmaydigan bo'shliq: u chiqarilgandan keyin yasaldi.",
        "no longer has": "Ikki tomon, bitta raqamning ikki xil tarixi.",
      },
    },
    cancel: {
      short: "Bekor qilish",
      title: "Bekor qil, hech qachon o'chirma",
      body: "Chiqarilgan hujjat bekor qilinadi: status `cancelled`, vaqti, sababi va uni almashtiruvchi hujjatga havola. Ilovaning baza roli chiqarilgan hisob-varaqlarda umuman `DELETE` huquqiga ega emas.\n\n000517 raqami reyestrda bekor qilingan deb belgilangan holda qoladi. Auditor nima bo'lganini va nega bo'lganini ko'radi, almashtiruvchi hujjat esa o'zining yangi raqamini oladi.",
      fields: {
        cancelled: "Hujjat hali ham bor, shunchaki endi hisobga kirmaydi.",
        cancel_reason: "Tushuntirish raqam bilan birga saqlanadi.",
        replaced_by: "Tuzatilgan hujjatga havola.",
        "no DELETE": "Chiqarilgan raqamlarni o'chirishni bazaning o'zi rad etadi.",
        register: "Har raqam bir marta uchraydi: chiqarilgan yoki bekor qilingan.",
      },
    },
    series: {
      short: "Filiallar",
      title: "Har filialga o'z seriyasi",
      body: "Kompaniya filial ochadi. Ikkala ofis ham hisob-varaq chiqaradi va bitta seriya bilan ular bitta hisoblagich qatorini kutib turishardi.\n\nHar filial o'z prefiksi va o'z hisoblagich qatorini oladi: `HQ-2026-000517` va `BR2-2026-000045`. Ular hech qachon bir-birini kutmaydi, jami esa soniyasiga 780 ga yaqin yakunlashga chiqadi. Buni qilishdan oldin qoidalar har filial uchun alohida seriyaga ruxsat berishini tekshiring.",
      fields: {
        series: "Hisoblagich kaliti: bitta seriya, raqamlarning bitta ketma-ketligi.",
        BR2: "Filial prefiksi, bosilgan raqamning bir qismi.",
        "one counter row": "Har filialning o'z lock'i bor.",
        "never wait": "Raqobat kompaniya bo'yicha emas, seriya bo'yicha.",
        "rules allow": "Ba'zi qoidalar kompaniyaga bitta uzluksiz seriyani talab qiladi.",
      },
    },
    rollover: {
      short: "Yangi yil",
      title: "Raqamlash 1-yanvarda qaytadan boshlanadi",
      body: "Yangi yilda har seriya 000001 dan boshlanadi. 2027 yil qatorlari 1-dekabrda yaratiladi, toki 1-yanvar yarim tunida ularni qo'shish uchun poyga boshlanmasin.\n\nYil UTC'dagi server soatidan emas, kompaniyaning qonuniy vaqt zonasidagi chiqarilish vaqtidan olinadi. Mahalliy vaqt bilan 1-yanvar 00:10 da chiqarilgan hisob-varaq UTC bo'yicha hali 31-dekabr, lekin u 2027 yilga tegishli.",
      watch: "Chiqarilish vaqtini UTC'da saqlang, lekin yil va seriyani qoidalar ko'rsatgan yagona vaqt zonasida hisoblang.",
      fields: {
        year: "Hisoblagich kalitining bir qismi: yangi yil = yangi qator.",
        "ON CONFLICT": "Ishni ikki marta yurgizish hech narsani o'zgartirmaydi.",
        "1 December": "Qatorlar oldindan, eng qizg'in paytdan tashqarida yaratiladi.",
        "legal time zone": "Server emas, qonun ko'radigan yil.",
        "000001": "2027 yilning birinchi raqami.",
      },
    },
    recap: {
      short: "Xulosa",
      title: "Xulosa",
      body: "Qonun uzluksiz bo'lishini talab qiladigan raqamlar uchun olti qoida.\n\n1) Ular uchun bazadagi sequence'dan foydalanmang: u ataylab raqam o'tkazib yuboradi. 2) MAX()+1 dan foydalanmang: ikki yozuvchi bir xil maksimumni o'qiydi. 3) Har seriya va yil uchun hisoblagich qatorini saqlang va raqamni hujjat bilan bitta tranzaksiyada `UPDATE ... RETURNING` bilan oling: rollback uni qayta ishlatadi. 4) Raqamni yakunlashda oling, hech qachon qoralamada emas. 5) Qator lock'i yozuvchilarni navbatga qo'yadi: raqamni oxirida oling, og'ir ishni tashqarida qiling, qoidalar ruxsat bersa, seriyalarga bo'ling. 6) O'chirish o'rniga bekor qiling, yilni esa qonuniy vaqt zonasida, oldindan yaratilgan qatorlar bilan almashtiring.",
    },
  },
  scenarios: {
    "same-ms": {
      label: "Bir millisekund",
      steps: {
        "ms-wait": {
          short: "Ikkalasi birga",
          title: "Bitta millisekundda ikki yakunlash",
          body: "Ikki buxgalter bitta seriya uchun 10:15:00.123 da \"Chiqarish\" ni bosadi. T1 ning `UPDATE` i hisoblagich qatorini oladi va 482 ni oladi. T2 ning `UPDATE` i o'sha qatorga yetadi va kutadi.\n\nT1 2.1 ms dan keyin commit qiladi. T2 uyg'onadi, commit bo'lgan qatorni qayta o'qiydi va 483 ni oladi. Hech kim xato ko'rmaydi, T2 shunchaki sal kutdi.",
          fields: {
            "row locked": "Birinchi yozuvchi qatorni tranzaksiyasi tugaguncha ushlab turadi.",
            "waits for T1": "Ikkinchi yozuvchi rad etilmaydi, navbatga turadi.",
            "re-reads": "Lock bo'shagach T2 eng yangi qiymatni ko'radi.",
            "483": "Navbatdagi raqam, hech qachon o'sha raqam emas.",
            "READ COMMITTED": "Standart daraja: UPDATE qatorning eng yangi versiyasini qayta tekshiradi.",
          },
        },
        "ms-rollback": {
          short: "Rollback",
          title: "Birinchisi muvaffaqiyatsiz tugaydi",
          body: "O'sha lahza, lekin T1 482 ni oladi, keyin xaridorning soliq raqami tekshiruvdan o'tmaydi. T1 rollback bo'ladi va uning oshirishi ham birga bekor bo'ladi.\n\nQatorni kutib turgan T2 482 ni oladi. Reyestrda teshik yo'q, hech narsani tushuntirish shart emas.",
          check: {
            q: "Hisoblagich qatori o'rnida sequence bo'lganda, reyestr bu yerda nimani ko'rsatardi?",
            options: [
              "O'shani: T2 ning hisob-varag'i uchun 482",
              "482 da bo'shliq, T2 ning hisob-varag'i 483",
              "482 raqamli ikkita hisob-varaq",
            ],
            answer: 1,
            why: "Sequence qiymati bir marta olingach, rollback bo'lsa ham, ketadi. T1 482 ni kuydirdi, T2 483 ni oldi, auditor esa 482 haqida so'rardi.",
          },
          fields: {
            ROLLBACK: "Butun tranzaksiya bekor bo'ladi, hisoblagich oshirilishi ham.",
            "goes back to 481": "Go'yo T1 hech qachon so'ramagandek.",
            "482": "Keyingi yozuvchi qayta ishlatadi: bo'shliq yo'q.",
          },
        },
        "ms-retry": {
          short: "Qayta urinish",
          title: "Qat'iyroq izolyatsiya darajasida qayta urin",
          body: "Ba'zi servislar yakunlashni `REPEATABLE READ` da yurgizadi. U yerda T2 qatorni qayta o'qimaydi: baza uni serializatsiya xatosi bilan to'xtatadi, chunki T2 ning snapshot'i endi qatorga mos kelmaydi.\n\nYechim: qisqa tasodifiy pauzadan keyin butun tranzaksiyani qayta urinish, ko'pi bilan uch marta. T2 ikkinchi urinishda 483 ni oladi, birorta raqam takrorlanmaydi va tushib qolmaydi.",
          fields: {
            "REPEATABLE READ": "Tranzaksiya boshidan bitta snapshot'ni ko'radi.",
            "40001": "\"Tranzaksiyani qayta urin\" ning standart kodi.",
            "whole transaction": "Yangi snapshot bilan birinchi buyruqdan qaytadan boshla.",
            "at most 3 tries": "Chegaralangan, shunda yuklama qayta urinishlar bo'roniga aylanmaydi.",
            stale: "Xatodan oldin o'qilgan hamma narsa allaqachon eskirgan bo'lishi mumkin.",
          },
        },
      },
    },
  },
};

export default text;
