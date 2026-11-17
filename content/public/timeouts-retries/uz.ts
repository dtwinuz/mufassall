import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Timeout va takroriy urinishlar",
  summary:
    "Buyurtma API'si tariflar servisiga bog'liq: u avval sekinlashadi, keyin butunlay o'ladi. Timeout, backoff, retry budjeti va circuit breaker bitta kasal servis hamma narsani yiqitmasligi uchun qanday ishlaydi.",
  learn: [
    "Nega timeout'siz chaqiruv barcha thread'larni band qilib qo'yadi",
    "Jitter bilan eksponensial backoff va takrorlar qanday bo'ronga aylanadi",
    "Retry budjeti va circuit breaker: closed, open, half-open",
    "Faqat idempotent chaqiruvni takrorlang yoki uni kalit bilan idempotent qiling",
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
      fields: {
        timeout: "Kutish shu yerda tugaydi. Thread pool'ga qaytadi.",
        fallback: "Xato o'rniga xavfsiz qiymat: mijoz qat'iy narx to'laydi, buyurtma yo'qolmaydi.",
      },
    },
    "naive-retry": {
      short: "Bo'ron",
      title: "Darhol takrorlar bo'ronga aylanadi",
      body: "Fallback'ni kamaytirish uchun API'ga uchta darhol takror qo'shildi. Ilova ham buyurtmani uch marta takrorlaydi. To'rt urinish ko'paytirish to'rt urinish: bitta buyurtmaga tariflarga 16 tagacha chaqiruv.\n\nTariflar shunchaki sekin edi. 16 barobar yuk ostida u butunlay yiqiladi va har takror ahvolni yomonlashtiradi.",
      watch: "Bir necha qatlamdagi takrorlar ko'payib ketadi. Faqat bitta qatlamda takrorlang: yiqilayotgan chaqiruvga eng yaqinida.",
      fields: {
        attempt: "Har timeout'dan keyin darhol yangi urinish. To'rt urinish, to'rt timeout.",
        "10:42:07.913": "Birinchi urinishdan 0,8 s keyin: aynan timeout, pauza yo'q. Tariflarga tiklanishga vaqt berilmaydi.",
      },
    },
    backoff: {
      short: "Backoff",
      title: "Jitter bilan eksponensial backoff",
      body: "Endi faqat API takrorlaydi, ilova emas. Urinishlar orasida API uxlaydi va pauza har safar ikki baravar oshadi: 100 ms gacha, keyin 200 gacha, keyin 400 gacha.\n\nAniq pauza shu oyna ichida tasodifiy (jitter). Usiz bir vaqtda yiqilgan minglab client'lar yana bir vaqtda takrorlaydi.",
      fields: {
        sleep: "Keyingi urinishdan oldingi pauza. Har safar o'sadi, kasal servis nafas olsin.",
        base: "Birinchi oyna. n-urinish 0 dan `base × 2^n` gacha tasodifiy vaqt kutadi, yuqori chegarasi bor.",
        jitter: "Tasodif takrorlarni vaqt bo'yicha yoyadi, ular bitta to'lqin bo'lib kelmaydi.",
      },
    },
    budget: {
      short: "Budjet",
      title: "Retry budjeti ortiqcha yukni cheklaydi",
      body: "Backoff takrorlarni vaqtga yoyadi, lekin uzoq avariyada ular baribir yig'iladi. Shuning uchun API'da budjet bor: takrorlar tariflarga oddiy chaqiruvlarning 10% idan oshmaydi.\n\nBudjet tugasa, API takrorlamaydi va darhol fallback oladi. Tariflarga qo'shimcha yuk hech qachon 1,1× dan oshmaydi.",
      fields: {
        budget: "400 chaqiruv ustiga soniyasiga 40 ta takror. Hisoblagich har bir necha soniyada nollanadi.",
        skipped: "Bu buyurtma uchun takror yo'q: budjet tugadi. O'rniga fallback.",
      },
    },
    "breaker-open": {
      short: "Breaker",
      title: "Circuit breaker: o'lik servisga qo'ng'iroq qilma",
      body: "Tariflar butunlay yiqildi. Budjet ichidagi takrorlar ham behuda, har birinchi chaqiruv esa hali ham 800 ms yeydi. Circuit breaker 10 soniyalik oynada xatolarni sanaydi.\n\nXatolar 50% dan oshsa, breaker **ochiladi**: 30 soniya API tariflarni umuman chaqirmaydi va fallback'ni millisekunddan tez qaytaradi. Tariflarga nol trafik keladi va u tinch qayta ishga tushadi.",
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
      fields: {
        HALF_OPEN: "Sinov holati: bitta chaqiruv chiqadi, qolganlari hali ham fallback oladi.",
        probe: "Bitta haqiqiy so'rov. Bilish uchun yetarli, zarar berish uchun juda kam.",
        CLOSED: "Yana odatiy: hamma chaqiruv tariflarga boradi, xatolar noldan sanaladi.",
      },
    },
    "double-charge": {
      short: "Ikki yechish",
      title: "To'lovni takrorlash ikki marta yechadi",
      body: "O'sha takror kodi to'lov chaqiruvi uchun ham ishlatildi. Birinchi `POST /v1/charges` 800 ms'da timeout bo'ldi, lekin provayder pulni allaqachon yechgan edi: faqat javob kechikdi.\n\nProvayder uchun takror yangi to'lovdek ko'rinadi. Mijozdan bitta buyurtma uchun ikki marta pul yechildi.",
      watch: "Timeout natija haqida hech narsa demaydi. Narigi tomon ishni bajarib bo'lgan bo'lishi mumkin.",
      fields: {
        order_id: "Ikkala so'rovda o'sha buyurtma. Faqat tanadan provayder buni bilolmaydi.",
        charge_id: "`ch_2`: ikkinchi, alohida yechish. Birinchisi, `ch_1`, allaqachon bor.",
      },
    },
    "idem-key": {
      short: "Kalit",
      title: "Faqat idempotent chaqiruvni takrorla",
      body: "Narx uchun GET'ni xavfsiz takrorlash mumkin. Pul yechishni esa yo'q, agar unda `Idempotency-Key` bo'lmasa: bitta buyurtmaning har urinishida bir xil kalit.\n\nProvayder kalitni natija bilan birga saqlaydi. Tanish kalitli takror saqlangan javobni, `ch_1` ni oladi va yangi pul yechilmaydi.",
      fields: {
        "Idempotency-Key": "Buyurtmadan yasaladi, har urinishga tasodifiy emas. Shu buyurtmaning har takrori bir xil qiymat yuboradi.",
        "Idempotent-Replayed": "Provayder aytadi: bu birinchi so'rovning saqlangan javobi, hozir hech narsa yechilmadi.",
        charge_id: "Yana `ch_1`. Bitta buyurtma, bitta yechish.",
      },
    },
    recap: {
      short: "Xulosa",
      title: "Xulosa",
      body: "Yiqilishi mumkin bo'lgan narsani chaqirish uchun besh qoida.\n\n1) Har tarmoq chaqiruvida haqiqiy kechikishdan tanlangan timeout bor. 2) Bitta qatlamda, jitter bilan eksponensial backoff orqali takrorlang. 3) Retry budjeti ortiqcha yukni cheklaydi. 4) Circuit breaker o'lik servisga chaqiruvni to'xtatadi va half-open'da tekshiradi. 5) Faqat idempotent chaqiruvni takrorlang, qolganiga idempotency kalitini bering.",
    },
  },
};

export default text;
