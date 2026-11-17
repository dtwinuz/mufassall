import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Timeout va qayta urinishlar",
  summary:
    "Buyurtma API'si tariflar servisiga bog'liq: u avval sekinlashadi, keyin butunlay o'ladi. Timeout, backoff, qayta urinish budjeti va circuit breaker bitta kasal servis hamma narsani yiqitmasligi uchun qanday ishlaydi.",
  learn: [
    "Nega timeout'siz chaqiruv barcha thread'larni band qilib qo'yadi",
    "Jitter bilan eksponensial backoff va qayta urinishlar qanday bo'ronga aylanadi",
    "Qayta urinish budjeti va circuit breaker: closed, open, half-open",
    "Faqat idempotent chaqiruvga qayta urining yoki uni kalit bilan idempotent qiling",
  ],
  nodes: {
    client: "Do'kon ilovasi",
    api: "Buyurtma API",
    rates: "Tariflar servisi",
    db: "Buyurtmalar bazasi",
    pay: "To'lov provayderi",
  },
  metrics: {
    p95: "Buyurtma p95",
    errors: "Muvaffaqiyatsiz buyurtma",
    "rates-rps": "Tariflarga chaqiruv",
    double: "Ikki marta yechish",
  },
  steps: {
    normal: {
      short: "Odatiy",
      title: "Har buyurtma yetkazish narxini so'raydi",
      body: "Ilova buyurtmani API'ga yuboradi. Saqlashdan oldin API tariflar servisidan yetkazish qancha turishini so'raydi.\n\nOddiy kunda javob 85 ms'da keladi va hech kim u haqida o'ylamaydi. Kod shunchaki kutadi.",
      check: {
        q: "Tariflar 30 soniyada javob bera boshlaydi. API'da timeout yo'q. API bilan nima bo'ladi?",
        options: [
          "Faqat buyurtma sekinlashadi, qolgani ishlaydi",
          "HTTP client bir soniyada o'zi voz kechadi",
          "200 ta thread hammasi osilib, har endpoint yiqiladi",
        ],
        answer: 2,
        why: "Har so'rov kutayotganda bitta ishchi thread'ni ushlab turadi. Bir necha soniyada 200 ta thread'ning hammasi tariflarda tiqiladi va tariflarga aloqasi yo'q so'rovlar ham bo'sh thread topolmay yiqiladi.",
      },
      fields: {
        Host: "Ichki servis, ommaviy emas. Baribir bu tarmoq chaqiruvi va u osilib qolishi mumkin.",
        "X-Response-Time": "Bugun 85 ms. 30 soniya bo'lsa nima qilishni kod bilmaydi.",
        price: "Yetkazish narxi eng kichik birlikda. Qandaydir narxsiz buyurtma tugamaydi.",
      },
    },
    "slow-dep": {
      short: "Osilish",
      title: "Bitta sekin servis hammasini muzlatadi",
      body: "Tariflar servisi 85 ms o'rniga 30 soniyada javob bera boshlaydi. API'da timeout yo'q, shuning uchun har so'rov kutayotganda bitta ishchi thread'ni ushlab turadi.\n\nBir necha soniyada 200 ta thread'ning hammasi tariflarni kutadi. Endi tariflarga umuman aloqasi yo'q so'rovlar ham, masalan buyurtmani ochish, bo'sh thread topolmaydi va yiqiladi.",
      watch: "Ko'p HTTP client'lar sukut bo'yicha cheksiz yoki juda uzoq kutadi. Sukut qiymati yomon kunni kutayotgan bug.",
      fields: {
        "X-Response-Time": "O'ttiz soniya thread faqat kutadi.",
        "threads busy": "Pool to'ldi. Har yangi so'rov tariflarda tiqilib qolganlar ortida navbat kutadi.",
      },
    },
    timeout: {
      short: "Timeout",
      title: "800 ms'dan keyin voz kech",
      body: "Endi API tariflarni ko'pi bilan 800 ms kutadi: qisqa connect timeout va read timeout. Vaqt tugasa, qat'iy yetkazish narxi olinadi va buyurtma rasmiylashtiriladi.\n\nThread'lar tez bo'shaydi, API'ning qolgan qismi yana ishlaydi. Timeout tasodifan emas, tariflarning haqiqiy p99'i va ozgina zaxira bo'yicha tanlanadi.",
      check: {
        q: "Endi API darhol 3 marta qayta urinadi, ilova ham buyurtmani 3 marta qayta yuboradi. Tariflarga nima keladi?",
        options: [
          "Buyurtmaga 16 tagacha chaqiruv, u yiqiladi",
          "Buyurtmaga ko'pi bilan 4 ta: urinishlar qo'shilmaydi",
          "Kamroq fallback va tiklanishga vaqt",
        ],
        answer: 0,
        why: "Ilovadagi to'rt urinish ko'paytirish API'dagi to'rt urinish: bitta buyurtmaga tariflarga 16 tagacha chaqiruv. Tariflar shunchaki sekin edi, bunday yuk ostida u butunlay yiqiladi va har qayta urinish ahvolni yomonlashtiradi.",
      },
      fields: {
        timeout: "Kutish shu yerda tugaydi. Thread pool'ga qaytadi.",
        fallback: "Xato o'rniga xavfsiz qiymat: mijoz qat'iy narx to'laydi, buyurtma yo'qolmaydi.",
      },
    },
    "naive-retry": {
      short: "Bo'ron",
      title: "Darhol qayta urinishlar bo'ronga aylanadi",
      body: "Fallback'ni kamaytirish uchun API'ga uchta darhol qayta urinish qo'shildi. Ilova ham buyurtmani uch marta qayta urinib ko'radi. To'rt urinish ko'paytirish to'rt urinish: bitta buyurtmaga tariflarga 16 tagacha chaqiruv.\n\nTariflar shunchaki sekin edi. 16 barobar yuk ostida u butunlay yiqiladi va har qayta urinish ahvolni yomonlashtiradi.",
      watch: "Bir necha qatlamdagi qayta urinishlar ko'payib ketadi. Faqat bitta qatlamda qayta urining: yiqilayotgan chaqiruvga eng yaqinida.",
      fields: {
        attempt: "Har timeout'dan keyin darhol yangi urinish. To'rt urinish, to'rt timeout.",
        "10:42:07.913": "Birinchi urinishdan 0,8 s keyin: aynan timeout, pauza yo'q. Tariflarga tiklanishga vaqt berilmaydi.",
      },
    },
    backoff: {
      short: "Backoff",
      title: "Jitter bilan eksponensial backoff",
      body: "Endi faqat API qayta urinadi, ilova emas. Urinishlar orasida API uxlaydi va pauza har safar ikki baravar oshadi: 100 ms gacha, keyin 200 gacha, keyin 400 gacha.\n\nAniq pauza shu oyna ichida tasodifiy (jitter). Usiz bir vaqtda yiqilgan minglab client'lar yana bir vaqtda qayta urinadi.",
      fields: {
        sleep: "Keyingi urinishdan oldingi pauza. Har safar o'sadi, kasal servis nafas olsin.",
        base: "Birinchi oyna. n-urinish 0 dan `base × 2^n` gacha tasodifiy vaqt kutadi, yuqori chegarasi bor.",
        jitter: "Tasodif qayta urinishlarni vaqt bo'yicha yoyadi, ular bitta to'lqin bo'lib kelmaydi.",
      },
    },
    budget: {
      short: "Budjet",
      title: "Qayta urinish budjeti ortiqcha yukni cheklaydi",
      body: "Backoff qayta urinishlarni vaqtga yoyadi, lekin uzoq avariyada ular baribir yig'iladi. Shuning uchun API'da budjet bor: qayta urinishlar tariflarga oddiy chaqiruvlarning 10% idan oshmaydi.\n\nBudjet tugasa, API qayta urinmaydi va darhol fallback oladi. Tariflarga qo'shimcha yuk hech qachon 1,1× dan oshmaydi.",
      fields: {
        budget: "400 chaqiruv ustiga soniyasiga 40 ta qayta urinish. Hisoblagich har bir necha soniyada nollanadi.",
        skipped: "Bu buyurtma uchun qayta urinish yo'q: budjet tugadi. O'rniga fallback.",
      },
    },
    "breaker-open": {
      short: "Breaker",
      title: "Circuit breaker: o'lik servisga qo'ng'iroq qilma",
      body: "Tariflar butunlay yiqildi. Budjet ichidagi qayta urinishlar ham behuda, har birinchi chaqiruv esa hali ham 800 ms yeydi. Circuit breaker 10 soniyalik oynada xatolarni sanaydi.\n\nXatolar 50% dan oshsa, breaker **ochiladi**: 30 soniya API tariflarni umuman chaqirmaydi va fallback'ni millisekunddan tez qaytaradi. Tariflarga nol trafik keladi va u tinch qayta ishga tushadi.",
      watch: "Har bog'liq servisga alohida breaker. Umumiy breaker sog' servislarni ham uzib qo'yadi.",
      fields: {
        OPEN: "Open: zanjir uzilgan, chaqiruvlar tashqariga umuman chiqmaydi.",
        failures: "Oxirgi 50 chaqiruvning 62% i yiqildi: 50% chegarasidan yuqori.",
        "fail fast": "Baribir yiqiladigan chaqiruvni 800 ms kutgandan ko'ra darhol fallback yaxshi.",
      },
    },
    "half-open": {
      short: "Half-open",
      title: "Half-open: bitta sinov hal qiladi",
      body: "30 soniyadan keyin breaker **half-open** holatiga o'tadi va bitta haqiqiy chaqiruvni o'tkazadi. U yiqilsa, breaker yana 30 soniyaga ochiladi.\n\nSinov 92 ms'da javob berdi, breaker yopiladi va trafik qaytadi. Hech kim uyg'onib, rubilnikni bosishi shart bo'lmadi.",
      check: {
        q: "O'sha qayta urinish kodi endi to'lov chaqiruviga ham qo'yildi. Birinchi to'lov 800 ms'da timeout bo'ldi. Nima bo'ladi?",
        options: [
          "Yomon narsa yo'q: timeout pul yechilmaganini bildiradi",
          "Bitta buyurtma uchun mijozdan ikki marta pul yechiladi",
          "Provayder o'sha order_id'ni ko'rib, takrorni tashlaydi",
        ],
        answer: 1,
        why: "Provayder pulni allaqachon olgan edi, faqat javob kechikdi. Qayta urinish provayderga yangi to'lovdek ko'rinadi va `ch_1` yonida ikkinchi `ch_2` to'lovi paydo bo'ladi.",
      },
      fields: {
        HALF_OPEN: "Sinov holati: bitta chaqiruv chiqadi, qolganlari hali ham fallback oladi.",
        probe: "Bitta haqiqiy so'rov. Bilish uchun yetarli, zarar berish uchun juda kam.",
        CLOSED: "Yana odatiy: hamma chaqiruv tariflarga boradi, xatolar noldan sanaladi.",
      },
    },
    "double-charge": {
      short: "Ikki yechish",
      title: "To'lovga qayta urinish ikki marta yechadi",
      body: "O'sha qayta urinish kodi to'lov chaqiruvi uchun ham ishlatildi. Birinchi `POST /v1/charges` 800 ms'da timeout bo'ldi, lekin provayder pulni allaqachon yechgan edi: faqat javob kechikdi.\n\nProvayder uchun qayta urinish yangi to'lovdek ko'rinadi. Mijozdan bitta buyurtma uchun ikki marta pul yechildi.",
      watch: "Timeout natija haqida hech narsa demaydi. Narigi tomon ishni bajarib bo'lgan bo'lishi mumkin.",
      fields: {
        order_id: "Ikkala so'rovda o'sha buyurtma. Faqat tanadan provayder buni bilolmaydi.",
        charge_id: "`ch_2`: ikkinchi, alohida yechish. Birinchisi, `ch_1`, allaqachon bor.",
      },
    },
    "idem-key": {
      short: "Kalit",
      title: "Faqat idempotent chaqiruvga qayta urining",
      body: "Narx uchun GET'ga xavfsiz qayta urinish mumkin. Pul yechishni esa yo'q, agar unda `Idempotency-Key` bo'lmasa: bitta buyurtmaning har urinishida bir xil kalit.\n\nProvayder kalitni natija bilan birga saqlaydi. Tanish kalitli qayta urinish saqlangan javobni, `ch_1` ni oladi va yangi pul yechilmaydi.",
      fields: {
        "Idempotency-Key": "Buyurtmadan yasaladi, har urinishga tasodifiy emas. Shu buyurtmaning har qayta urinishi bir xil qiymat yuboradi.",
        "Idempotent-Replayed": "Provayder aytadi: bu birinchi so'rovning saqlangan javobi, hozir hech narsa yechilmadi.",
        charge_id: "Yana `ch_1`. Bitta buyurtma, bitta yechish.",
      },
    },
    recap: {
      short: "Xulosa",
      title: "Xulosa",
      body: "Yiqilishi mumkin bo'lgan narsani chaqirish uchun besh qoida.\n\n1) Har tarmoq chaqiruvida haqiqiy kechikishdan tanlangan timeout bor. 2) Bitta qatlamda, jitter bilan eksponensial backoff orqali qayta urining. 3) Qayta urinish budjeti ortiqcha yukni cheklaydi. 4) Circuit breaker o'lik servisga chaqiruvni to'xtatadi va half-open'da tekshiradi. 5) Faqat idempotent chaqiruvga qayta urining, qolganiga idempotency kalitini bering.",
    },
  },
};

export default text;
