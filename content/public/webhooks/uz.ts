import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Webhook'larni ishonchli yuborish",
  summary:
    "To'lov servisi internet-do'konlarga to'lov o'tganini ularning URL manzilini chaqirib xabar qiladi: bu webhook. Uni to'lovlarni sekinlatmasdan qanday yuborish, do'kon chaqiruv haqiqiy va yangi ekanini qanday biladi va ikkala tomon takror urinishlar, dublikatlar, tartibsiz hodisalar va o'lik manzillardan qanday omon chiqadi.",
  learn: [
    "Nega webhook to'lov so'rovi ichida emas, navbat va yuboruvchi orqali ketadi",
    "Id, vaqt va tana ustidan HMAC imzo hamda qayta yuborishdan himoya",
    "Kechikishi o'sib boruvchi takror urinishlar va tez javob beradigan idempotent qabul qiluvchi",
    "Versiya bo'yicha tartib va kunlab javob bermaydigan manzillar",
  ],
  nodes: {
    payments: "To'lov API",
    shop: "Do'kon serveri",
    shopdb: "Do'kon bazasi",
    queue: "Webhook navbati",
    sender: "Yuboruvchi",
    attacker: "Hujumchi",
    oldshop: "O'lik manzil",
  },
  metrics: {
    p95: "To'lov p95",
    forged: "Qabul qilingan soxta",
    dups: "Ikki marta bajarish",
    backlog: "Yetkazishni kutmoqda",
  },
  steps: {
    inline: {
      short: "Ichida",
      title: "Webhook to'lov ichida yuboriladi",
      body: "Karta to'lovi o'tganda To'lov API do'kon URL'ini xabar bilan chaqiradi va xaridorga javob berishdan oldin javobni kutadi.\n\nBitta do'kon serveri 8 soniyada javob beradi. Endi shu do'konga har to'lov 8 soniya davom etadi, to'lov thread'larini esa begona sekin kod band qilib turadi.",
      fields: {
        type: "Nima bo'ldi. Do'kon nima qilishni shu nom bo'yicha hal qiladi.",
        order_id: "Do'konning o'z buyurtmasi, nimani jo'natishni bilsin.",
        "X-Response-Time": "To'lovning 8,1 s'i do'konni kutishga ketdi.",
      },
    },
    queue: {
      short: "Navbat",
      title: "Navbat va yuboruvchi webhook'ni to'lovdan chiqaradi",
      body: "To'lov API endi hodisani saqlaydi va xaridorga darhol javob beradi. Alohida yuboruvchi hodisalarni navbatdan oladi va do'konlarni 10 soniyalik timeout bilan chaqiradi.\n\nIstalgan `2xx` javob yetkazildi degani. Qolgan hamma narsa yoki javob yo'qligi keyinroq qayta urinish degani. Sekin do'kon endi faqat o'z yetkazishlarini sekinlatadi.",
      fields: {
        evt_9f2: "Hodisa id'si. Har takror urinishda bir xil qoladi.",
        timeout: "Yuboruvchi abadiy kutmaydi. Do'konga ko'proq vaqt kerak bo'lsa, avval javob berib, keyin ishlashi kerak.",
        "2xx": "Yetkazildi deb hisoblanadigan yagona javob.",
      },
    },
    forged: {
      short: "Soxta",
      title: "Do'konning webhook URL'ini istalgan odam chaqira oladi",
      body: "URL sir emas: u brauzer vositalarida, loglarda va support tiketlarida ko'rinadi. Hujumchi xuddi shu JSON'ni o'z buyurtmasi va katta summa bilan yuboradi.\n\nDo'kon uni haqiqiy chaqiruvdan ajrata olmaydi. Buyurtmani to'langan deb belgilaydi va hech kim pul to'lamagan tovarni jo'natadi.",
      watch: "Webhook manzili ochiq eshik. So'rov qayerdan kelganga o'xshashiga emas, tekshira oladigan narsangizga ishoning.",
      fields: {
        order_id: "Hujumchining o'z buyurtmasi, hali ham to'lanmagan.",
        amount: "Hujumchi xohlagan summa. Uni hech narsa tekshirmaydi.",
        "marked paid": "Do'kon tekshirilmagan xabar asosida ish qildi.",
      },
    },
    signing: {
      short: "Imzo",
      title: "Har webhook HMAC bilan imzolanadi",
      body: "Har do'kon manzilni ro'yxatdan o'tkazganda o'z sirini oladi. Yuboruvchi hodisa id'si, vaqt va aynan shu tana ustidan HMAC-SHA256 hisoblaydi va uni sarlavhada yuboradi.\n\nDo'kon xuddi shu sir bilan qayta hisoblaydi va solishtiradi. Sirsiz hech kim to'g'ri imzo yasay olmaydi, tananing bitta baytini o'zgartirish esa imzoni buzadi.",
      watch: "JSON'ni parse qilishdan oldin kelgan xom baytlarni tekshiring. Qayta yig'ilgan JSON bayt-bayt mos kelmasligi mumkin.",
      check: {
        q: "Hujumchi logdan bitta haqiqiy imzolangan so'rovni nusxalab, ertasi kuni yana yuboradi. Faqat imzo tekshiruvi nima qiladi?",
        options: [
          "Rad etadi: imzo bir martalik",
          "Qabul qiladi: shu baytlar uchun imzo hali ham to'g'ri",
          "Rad etadi: sir har kuni almashadi",
        ],
        answer: 1,
        why: "Imzo baytlarni kim yasaganini isbotlaydi, ular qachon yuborilganini emas. Bir xil baytlar abadiy bir xil to'g'ri imzoni olib yuradi. Takrorni to'xtatish uchun vaqt imzolanib tekshirilishi va id'lar eslab qolinishi kerak.",
      },
      fields: {
        "Webhook-Id": "Hodisaning noyob id'si, imzolanadigan satrning bir qismi.",
        "Webhook-Timestamp": "Yuboruvchi qachon imzolagani, Unix soniyalarda. U ham imzolangan.",
        "Webhook-Signature": "`v1,` va base64'dagi HMAC. Sir almashtirilayotganda bir nechta bo'lishi mumkin.",
      },
    },
    replay: {
      short: "Takror",
      title: "Haqiqiy so'rov, yana yuborilgan",
      body: "Noto'g'ri sozlangan proksi so'rovlarni to'liq loglagan va log tashqariga chiqib ketgan. Hujumchi haqiqiy buyurtma bo'yicha kechagi `payment.succeeded` ni qayta yuboradi.\n\nImzo to'g'ri, chunki bu yuboruvchi imzolagan aynan o'sha baytlar. Do'kon bitta to'lov uchun ikkinchi posilkani jo'natadi.",
      fields: {
        leaked: "Hujumchi sirni bilmaydi. Unda faqat haqiqiy so'rovning nusxasi bor.",
        yesterday: "So'rov eski, lekin uning yoshini hech narsa tekshirmaydi.",
        valid: "Imzo mos keladi, chunki baytlarda hech narsa o'zgarmagan.",
      },
    },
    timestamp: {
      short: "Vaqt",
      title: "Imzolangan vaqt, vaqt oynasi va ko'rilgan id'lar ro'yxati",
      body: "Imzolanadigan satr `id.timestamp.body`, shuning uchun vaqtni imzoni buzmasdan o'zgartirib bo'lmaydi. Do'kon 5 daqiqadan eski hamma narsani rad etadi va shu oynada ko'rgan id'larini eslab qoladi.\n\nSolishtirish doimiy vaqtda bajariladi, shunda javob vaqti imzoning nechta bayti to'g'ri ekanini oshkor qilmaydi.",
      watch: "Server soatlarini sinxron ushlang. Soati 6 daqiqa adashgan do'kon har bir haqiqiy webhook'ni rad etadi.",
      fields: {
        signed: "Id, vaqt va tana bir-biriga ulangan: imzo uchalasini qamraydi.",
        "HMAC-SHA256": "Kalitli hash. Bir xil sir va baytlar bir xil natija beradi.",
        "constant-time": "Solishtirish har qanday kirishda bir xil vaqt oladi, shuning uchun hech narsani oshkor qilmaydi.",
        reject: "Bir kunlik so'rov to'g'ri imzo bilan ham rad etiladi.",
      },
    },
    retries: {
      short: "Takror urinish",
      title: "Do'kon ishlamayapti: jadval bo'yicha qayta urinamiz",
      body: "Do'kon serveri deploy paytida bir soat ishlamaydi. Yuboruvchi taslim bo'lmaydi, lekin uni urib ham tashlamaydi: tasodifiy yoyilish bilan o'sib boruvchi jadval bo'yicha, taxminan bir yarim kunga cho'zib qayta urinadi.\n\nYetkazishlar faqat shu do'kon uchun yig'iladi. U qaytgach, ular keyingi urinishlarda ketib bo'ladi.",
      check: {
        q: "Do'kon 1-urinishni bajardi, lekin 10 s timeout'dan keyin, 12 s'da javob berdi. Keyin nima bo'ladi?",
        options: [
          "Yuboruvchi o'sha hodisani yana yuboradi va do'kon uni ikki marta bajarishi mumkin",
          "Hech narsa: do'kon ishni qildi, demak yetkazildi",
          "Yuboruvchi manzilni o'lik deb belgilaydi",
        ],
        answer: 0,
        why: "Yuboruvchi javobni o'z vaqtida olmadi, uning uchun yetkazish muvaffaqiyatsiz. U o'sha `Webhook-Id` ni qayta yuboradi. Yetkazish kamida bir marta, qabul qiluvchi takrorni kutishi kerak.",
      },
      fields: {
        "503": "Do'kon mavjud emas. Vaqtinchalik nosozlik, qayta urinishga arziydi.",
        attempt: "Yuboruvchi urinishlarni do'kon emas, har hodisa uchun sanaydi.",
        schedule: "O'sib boruvchi oraliqlar: kichik uzilishlarga tez, avariyalarga uzoq takror.",
        jitter: "Tasodifiy yoyilish: qaytgan do'konga barcha takrorlar bir zumda tushmaydi.",
      },
    },
    duplicate: {
      short: "Dublikat",
      title: "Sekin javob ikki baravar bonusga aylanadi",
      body: "Do'kon hodisani so'rovning o'zida bajaradi: buyurtmani to'langan deb belgilaydi va 500 bonus ball qo'shadi. Bu 12 soniya oladi, yuboruvchi timeout oladi va qayta yuboradi.\n\nTakror birinchi urinish hali ishlayotganda keladi. Buyurtma bir marta to'langan, lekin xaridor bonusni ikki marta oladi. Bu kuniga taxminan 25 marta bo'ladi.",
      fields: {
        timeout: "Yuboruvchi uchun birinchi urinish muvaffaqiyatsiz, do'kon esa hali u ustida ishlayapti.",
        "attempt 2": "O'sha hodisa id'si, yana yetkazilgan.",
        bonus: "Himoyasiz yon ta'sir ikki marta bajariladi.",
      },
    },
    inbox: {
      short: "Inbox",
      title: "Qabul qiluvchi: id'ni eslab qol, tez javob ber, keyin ishla",
      body: "Do'kon avval `Webhook-Id` ni noyob kalitli inbox jadvaliga yozadi. Qator allaqachon bo'lsa, hodisa ko'rilgan: do'kon `200` qaytaradi va to'xtaydi.\n\nQator yangi bo'lsa, do'kon darhol `200` qaytaradi va asl ishni fon vazifasida bajaradi. Javoblar 12 ms oladi, yuboruvchi takrorlashni to'xtatadi, takror esa hech qachon ikki marta bajarilmaydi.",
      watch: "Timeout ichida javob bering, keyin ishlang. Webhook so'rovi ichidagi uzoq ish doim dublikatga aylanadi.",
      fields: {
        webhook_id: "Sarlavhadagi hodisa id'si, inbox'da noyob.",
        "ON CONFLICT": "Ikkinchi yetkazish hech narsa yozmaydi. Poygani baza hal qiladi.",
        background: "Sekin ish so'rovdan chiqadi, javob tez bo'ladi.",
        "X-Response-Time": "12 ms: yuboruvchining 10 s timeout'idan ancha ichkarida.",
      },
    },
    ordering: {
      short: "Tartib",
      title: "Hodisalar tartibsiz keladi",
      body: "To'lov o'tdi va besh daqiqadan keyin qaytarildi. Birinchi hodisa do'kon avariyasiga to'g'ri keldi va hali takrorni kutyapti, shuning uchun qaytarish oldin keladi.\n\nYuboruvchi tartibni va'da qilmaydi. Har hodisa to'lov versiyasini olib yuradi, do'kon esa qo'llagan versiyasini saqlaydi.",
      watch: "Boshqa yo'l: yupqa hodisa \"pay_771 to'lovi o'zgardi\", joriy holatni esa do'kon API'dan oladi.",
      check: {
        q: "Qaytarish (3-versiya) qo'llandi. Endi nihoyat `payment.succeeded` (2-versiya) keladi. Do'kon nima qilishi kerak?",
        options: [
          "Qo'llash: bu kelgan xabarlarning eng yangisi",
          "500 qaytarish, yuboruvchi keyinroq qayta urinsin",
          "Tashlab ketish: uning versiyasi do'konda bor versiyadan eski",
        ],
        answer: 2,
        why: "Kelish tartibi hodisalar tartibi emas. 2-versiya qo'llangan 3-versiyadan eski, uni qo'llash qaytarilgan to'lovni yana to'langanga aylantirardi. Do'kon 200 qaytaradi va hodisani e'tiborsiz qoldiradi.",
      },
      fields: {
        type: "Qaytarish: hayotda u muvaffaqiyatdan keyin, tarmoqda esa oldin keldi.",
        created_at: "Hodisa yuboruvchida qachon bo'lgani. Log uchun foydali, tartib uchun yetarli emas.",
        version: "To'lov versiyasi. Do'kon holatini faqat yuqoriroq versiya o'zgartiradi.",
        skipped: "Kech kelgan eski hodisa qabul qilindi va e'tiborsiz qoldirildi.",
      },
    },
    "dead-endpoint": {
      short: "O'lik manzil",
      title: "Hech qachon qaytmaydigan manzil",
      body: "Bitta do'kon yopildi va uning domeni muddati tugadi. Har urinish yiqiladi, unga 9000 hodisa kutib turibdi va yuboruvchi o'rinlarini egallaydi.\n\nYuboruvchi har manzilga bir vaqtda 2 tadan ortiq yetkazishga ruxsat bermaydi, shuning uchun boshqa do'konlar sekinlashmaydi. 5 kunlik nosozlikdan keyin manzilni o'chiradi, egasiga xat yozadi va hodisalarni kabinetdan qayta yuborish uchun 30 kun saqlaydi.",
      watch: "Manzillarni bir-biridan ajrating. Bitta o'lik yoki sekin mijoz hammaning webhook'larini kechiktirmasligi kerak.",
      fields: {
        NXDOMAIN: "Bunday domen yo'q. Hech qanday takror buni tuzatmaydi.",
        "per-endpoint": "Har do'konga parallellik limiti, bitta do'kon barcha worker'larni egallab olmasin.",
        disabled: "Yuboruvchi urinishni to'xtatadi va odamga xabar beradi.",
        replay: "Hodisalar saqlanadi, do'kon qaytgach o'tkazib yuborganini oladi.",
      },
    },
    recap: {
      short: "Xulosa",
      title: "Xulosa",
      body: "Webhook'lar uchun oltita qoida.\n\n1) Biznes so'rovi ichida emas, navbatdan timeout bilan yuboring. 2) Id, vaqt va xom tanani har manzilning o'z siri bilan imzolang; doimiy vaqtda tekshiring. 3) Eski vaqtni rad eting va ko'rilgan id'larni eslab qoling. 4) Tasodifiy yoyilishli, o'sib boruvchi jadval bo'yicha qayta urining. 5) Qabul qiluvchi id'ni noyob kalit bilan saqlaydi, tez javob beradi va fonda ishlaydi. 6) Tartibga tayanmang: versiyalardan foydalaning yoki joriy holatni oling; o'lik manzillarni ajrating va o'chiring.",
    },
  },
  scenarios: {
    slow: {
      label: "Do'kon 30 s",
      steps: {
        "shop-slow": {
          short: "Sekin do'kon",
          title: "Do'kon 30 soniyada javob beradi",
          body: "Bitta do'kon butun hodisani webhook so'rovining o'zida bajaradi, bugun esa uning bazasi sekin: har javob 30 soniya oladi.\n\nYetkazish — chaqiruv: yuboruvchi javobni shu chiziqda kutadi, lekin faqat 10 soniya. Undan keyin urinish muvaffaqiyatsiz hisoblanadi, do'kon keyin nima qilishidan qat'i nazar.",
          watch: "To'lovning o'ziga tegilmadi: u hodisani navbatga tashladi va davom etdi.",
          fields: {
            timeout: "Yuboruvchi 10 s da kutishni to'xtatadi va qayta urinishni rejalashtiradi.",
            "10:00:30": "Do'konning `200` javobi yuboruvchi uzilgandan 20 s keyin keladi. Uni hech kim o'qimaydi.",
          },
        },
        "shop-retry": {
          short: "Qayta urinish",
          title: "Har takror yana bajariladi",
          body: "Yuboruvchi o'sha hodisani qayta yuboradi, har urinish ham 30 soniya oladi va yana timeout bo'ladi. Do'kon esa baribir har urinishni oxirigacha bajaradi.\n\nBuyurtma bir marta to'langan, lekin bonus har urinishda qo'shiladi — kuniga 40 martaga yaqin.",
          fields: {
            "Webhook-Id": "Har urinishda o'sha hodisa id'si. Do'kon uni hali tekshirmaydi.",
            "attempt 3": "Yuboruvchi uchun ketma-ket uchinchi muvaffaqiyatsizlik.",
            bonus: "Tugagan har urinish bonusni yana qo'shadi.",
          },
        },
        "shop-end": {
          short: "Natija",
          title: "Natija: to'lovlar tez, narxini shu do'kon to'laydi",
          body: "To'lovlar hamon 60 ms oladi: navbat tufayli sekin do'kon ularni ushlab tura olmaydi. Webhook to'lov ichida yuborilgan variant bilan solishtiring: u yerda shu do'konga har to'lov endi 30 soniya davom etardi.\n\nNarx shu do'konda qoladi: 5200 ta yetkazish kutmoqda, kuniga 60 ga yaqin ikki baravar bonus va band yuboruvchi. Qabul qiluvchi buni o'z tomonida tuzatadi: tez javob ber, keyin ishla.",
        },
      },
    },
  },
};

export default text;
