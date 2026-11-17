import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Elektron raqamli imzo",
  summary:
    "Sotuvchi shartnomani kalit tokenidan hech qachon chiqmaydigan kalit bilan imzolaydi, xaridor ham imzolaydi, imzolar esa sertifikatlar muddati tugagandan keyin ham yillab isbotlanishi kerak. Aynan nima xeshlanadi, imzo nimani qamraydi, server uni qanday tekshiradi va ishonchli vaqt tamg'asi nega kerak.",
  learn: [
    "Aynan nima imzolanadi: imzolanadigan atributlar ichidagi fayl xeshi",
    "CMS (PKCS#7) imzo ichida nima bor: detached va attached",
    "Serverdagi to'rt tekshiruv: matematika, zanjir, muddat, OCSP orqali bekor qilinganlik",
    "Nega ishonchli vaqt tamg'asi sertifikat muddati tugagach ham eski imzoni haqiqiy saqlaydi",
  ],
  nodes: {
    signer: "Sotuvchi",
    app: "Imzo ilovasi",
    token: "Kalit tokeni",
    api: "Hujjat serveri",
    docs: "Hujjatlar ombori",
    thief: "O'g'ri",
    ca: "CA (OCSP)",
    tsa: "Vaqt tamg'asi TSA",
    partner: "Xaridor ilovasi",
  },
  metrics: {
    p95: "Imzoni qabul qilish p95",
    revoked: "Bekor sertifikat bilan qabul",
    unprovable: "Isbotlab bo'lmaydigan eski imzo",
  },
  steps: {
    hash: {
      short: "Xesh",
      title: "Ilova shartnomaning aynan o'sha baytlarini xeshlaydi",
      body: "Sotuvchi `ct_2041` shartnomani imzo ilovasida ochadi. Ilova PDF'ni yuklab oladi va uning SHA-256 xeshini hisoblaydi: faylning 32 baytlik barmoq izi.\n\n84 KB faylning o'zini hech kim imzolamaydi. Keyingi hamma narsa shu xesh ustida ishlaydi, shuning uchun server saqlagan baytlar ilova xeshlagan baytlar bilan aynan bir xil bo'lishi shart.",
      watch: "JSON hujjatda aynan yuborilgan baytlarni imzolang. Serverda JSON'ni qayta yig'ish probel yoki kalitlar tartibini o'zgartirib, xeshni buzishi mumkin.",
      fields: {
        "Content-Length": "Fayl hajmi. Xesh shu baytlarning har birini qamraydi.",
        "SHA-256": "Hujjatning barmoq izi. Bitta baytni o'zgartirsangiz, butunlay boshqa qiymat chiqadi.",
      },
    },
    token: {
      short: "Kalit",
      title: "Shaxsiy kalit token ichida imzolaydi va undan chiqmaydi",
      body: "Ilova fayl xeshini to'g'ridan-to'g'ri imzolamaydi. U **imzolanadigan atributlar** yig'adi: kontent turi, `messageDigest` sifatida fayl xeshi va imzo vaqti. Ularning DER kodini xeshlaydi va shu 32 baytni tokenga yuboradi.\n\nToken PIN'ni tekshiradi va ichidagi shaxsiy kalit bilan imzolaydi. Qaytib faqat imzo keladi. Kalit eksport qilinmaydigan deb belgilangan: hech qanday ilova yoki virus uni nusxalay olmaydi.",
      watch: "Imzo atributlarni, `messageDigest` orqali esa hujjatni qamraydi. Fayl yoki vaqtni almashtirsangiz, tekshiruv yiqiladi.",
      fields: {
        signedAttrs: "Aslida imzolanadigan to'plam. U hujjat va vaqtni imzoga bog'laydi.",
        messageDigest: "Oldingi qadamdagi shartnomaning SHA-256 xeshi.",
        signingTime: "Imzolovchi da'vo qilgan vaqt. U foydalanuvchining o'z kompyuter soatidan olinadi.",
        CKA_EXTRACTABLE: "Token atributi: `false` kalitni o'qib bo'lmaydi, faqat ishlatish mumkin degani.",
        PIN: "Kalitni bitta seansga ochadi. Uni ilova emas, token tekshiradi.",
      },
    },
    send: {
      short: "CMS",
      title: "Imzo CMS paketida yuboriladi",
      body: "Ilova imzoni CMS (PKCS#7 deb ham ataladi) `SignedData` ichiga o'raydi: algoritmlar, imzolovchining sertifikati va uni bergan CA, imzolanadigan atributlar va imzo qiymati bilan `signerInfo`.\n\nBu yerda u **detached**: PDF ichida yo'q, u serverda allaqachon bor. **Attached** CMS hujjatni ichida olib yuradi: kattaroq, lekin o'zi yetarli va kichik JSON hisob-fakturalar uchun qulay.",
      fields: {
        Authorization: "Foydalanuvchining serverdagi seans tokeni. Bu yerda yashirilgan.",
        SignedData: "Imzolangan kontent uchun CMS turi.",
        detached: "`eContent` bo'sh: tekshirish uchun server yoniga aynan o'sha fayl baytlarini qo'yishi kerak.",
        certificates: "Ochiq kalitli imzolovchi sertifikati va zanjir qurish uchun uni bergan CA sertifikati.",
        sid: "Bu imzoni qaysi sertifikat qo'ygan: beruvchi va seriya raqami.",
        digestAlgorithm: "`messageDigest` va imzolanadigan atributlar uchun ishlatilgan xesh.",
        signature: "Tokendan kelgan 64 bayt. Sir emas, lekin uzun, shuning uchun qisqartirilgan.",
      },
    },
    verify: {
      short: "Tekshir",
      title: "Server imzoni to'rt qadamda tekshiradi",
      body: "Server o'zidagi fayl nusxasini xeshlaydi va `messageDigest` bilan solishtiradi. Keyin imzolanadigan atributlar ustidagi imzoni sertifikatdagi ochiq kalit bilan tekshiradi.\n\nSo'ng o'zi ishonadigan root CA'gacha zanjir quradi va sertifikat sanalarini tekshiradi. To'rttalasi ham o'tdi: fayl, CMS va xulosa omborga yoziladi.",
      check: {
        q: "Ofisdan token o'g'irlandi. Egasi xabar berdi, CA sertifikatni bekor qildi. O'g'ri ertasi kuni shartnoma imzolaydi. Shu to'rt tekshiruv nima deydi?",
        options: [
          "Rad etadi: zanjir tekshiruvi sertifikat bekor qilinganini ko'radi",
          "Qabul qiladi: matematika, zanjir va sanalar hali ham joyida",
          "Rad etadi: imzo boshqa kompyuterdan kelgan",
        ],
        answer: 1,
        why: "To'rt tekshiruvning birortasi CA'dan hech narsa so'ramaydi. Kalit ham, sertifikat ham haqiqiy, shuning uchun imzo tekshiruvdan o'tadi va shartnoma qabul qilinadi; keyingi qadam logni va yechimni ko'rsatadi.",
      },
      fields: {
        messageDigest: "Bu aynan imzolangan fayl ekanini isbotlaydi.",
        "public key": "Sertifikatdan olinadi. Bunday imzoni faqat unga mos shaxsiy kalit qo'ya oladi.",
        "Root CA": "Serverda sozlangan ishonch nuqtasi. Boshqa joyda tugaydigan zanjir rad etiladi.",
        notAfter: "Sertifikat muddatining tugash sanasi.",
      },
    },
    revoked: {
      short: "Bekor",
      title: "Bekor qilingan sertifikat baribir o'tadi",
      body: "O'g'ri o'g'irlangan tokenni ishlatadi, stikerga yozib qo'yilgan PIN'ni kiritadi va katta yetkazib berish shartnomasini imzolaydi.\n\nServer uni qabul qiladi. CA sertifikatni kecha bekor qilgan, lekin server bu haqda CA'dan hech qachon so'ramagan.",
      watch: "Sertifikat sanalari to'g'ri ekani u haqiqiy degani emas. Bekor qilinganlik haqidagi ma'lumot faqat CA'da.",
      fields: {
        ACCEPTED: "Oflayn to'rt tekshiruv ham o'tdi. Ulardan birortasi bekor qilish haqida bilmaydi.",
        revoked: "CA biladi. Server so'ramadi.",
      },
    },
    ocsp: {
      short: "OCSP",
      title: "CA'dan so'rang: bu sertifikat hali yaroqlimi?",
      body: "Imzoni qabul qilishdan oldin server sertifikatda ko'rsatilgan responder'ga OCSP so'rov yuboradi. Javobni CA imzolaydi: `good`, `revoked` yoki `unknown`.\n\nEskiroq usul CRL: bekor qilingan barcha seriyalarning imzolangan ro'yxati, uni har bir necha soatda yuklab olasiz. OCSP esa bitta sertifikat haqida hozir so'raydi. Narxi tarmoq chaqiruvi, qabul p95 o'sadi; javobni `nextUpdate`'gacha keshlash mumkin.",
      check: {
        q: "2028 yilda auditor `ct_2041` shartnomani qayta tekshiradi. Sotuvchi sertifikatining muddati 2027 yil martda tugagan. Server nima deydi?",
        options: [
          "Haqiqiy: `signingTime` sertifikat amalda bo'lganda imzolanganini ko'rsatadi",
          "Haqiqiy: 2026 yilgi OCSP javobi abadiy keshda",
          "Aniqlab bo'lmaydi: `signingTime` faqat imzolovchining da'vosi, sertifikat esa muddati o'tgan",
        ],
        answer: 2,
        why: "`signingTime`'ni foydalanuvchining o'z kompyuteri yozadi va u hech narsani isbotlamaydi. Sertifikat muddati o'tgan, CA uning holatini endi bermaydi, shuning uchun natija aniqlanmagan.",
      },
      fields: {
        serialNumber: "Qaysi sertifikat haqida so'rayapmiz.",
        nonce: "Javob takrorlashi shart bo'lgan tasodifiy qiymat: eski yozib olingan javobni qayta ishlatib bo'lmaydi.",
        certStatus: "`revoked`: imzoni rad eting.",
        revocationTime: "Shu paytdan boshlab bu kalit bilan qo'yilgan imzolarga ishonilmaydi.",
        nextUpdate: "Bu javobni keshdan qachongacha ishlatish mumkin.",
      },
    },
    expired: {
      short: "Muddat",
      title: "Ikki yildan keyin imzoni isbotlab bo'lmaydi",
      body: "Shartnomalar audit va sud uchun yillab isbotlanadigan bo'lishi kerak. 2028 yilda sotuvchi sertifikatining muddati allaqachon tugagan, CA esa uning holatini saqlamaydi.\n\nCMS ichidagi yagona vaqt `signingTime`, uni esa imzolovchining o'z kompyuteri yozgan. Imzolaganda kalit yaroqli edimi? Hech kim isbotlay olmaydi. 1200 eski shartnoma endi aniqlanmagan holatda.",
      fields: {
        signingTime: "Isbot emas, da'vo: istalgan odam soatini orqaga sura oladi.",
        expired: "Sertifikatning amal qilish muddati tugagan.",
        unknown: "CA bu sertifikat uchun endi javob bermaydi.",
        INDETERMINATE: "Na haqiqiy, na soxta: dalil yetarli emas.",
      },
    },
    timestamp: {
      short: "Tamg'a",
      title: "Ishonchli vaqt tamg'asi imzo vaqtini qotiradi",
      body: "Imzodan so'ng darhol server **imzo qiymatining** xeshini vaqt tamg'asi xizmatiga (RFC 3161) yuboradi. TSA uni o'z soatidagi vaqt bilan birga imzolaydi va token qaytaradi.\n\nToken imzolovchining **imzolanmagan atributlariga** qo'shiladi: u imzodan keyin qo'shiladi, shuning uchun imzoni buzmaydi. Endi aynan shu imzo 09:14:07 da mavjud bo'lganiga isbot bor.",
      check: {
        q: "2028 yilda sertifikat muddati o'tgan. Bundan tashqari, sotuvchi ishdan ketgani uchun u 2027 yil yanvarda bekor qilingan. 2026 yilgi imzo hali ham tekshiruvdan o'tadimi?",
        options: [
          "Ha: bekor qilish isbotlangan imzo vaqtidan keyin bo'lgan",
          "Yo'q: bekor qilingan sertifikat u qo'ygan hamma imzoni yaroqsiz qiladi",
          "Faqat sotuvchi shartnomani qayta imzolasa",
        ],
        answer: 0,
        why: "Vaqt tamg'asi imzo 2026-11-18 da mavjud bo'lganini isbotlaydi. O'shanda sertifikat yaroqli edi va o'sha paytdagi OCSP javobi saqlangan, shuning uchun keyingi bekor qilish xulosani o'zgartirmaydi.",
      },
      fields: {
        messageImprint: "Nimaga tamg'a bosiladi: xesh algoritmi va xesh qiymati.",
        hashedMessage: "Fayl emas, imzo qiymatining xeshi: aynan shu imzoni vaqtga bog'laydi.",
        nonce: "Javobni shu so'rovga bog'laydi.",
        genTime: "TSA vaqti. U foydalanuvchining emas, TSA'ning soatidan olinadi.",
        unsignedAttrs: "Imzodan keyin qo'shiladigan atributlar. Imzo ularni qamramaydi, shuning uchun qo'shish xavfsiz.",
      },
    },
    evidence: {
      short: "Dalil",
      title: "Dalillarni imzo bilan birga saqlang",
      body: "Imzo paytida server sertifikat zanjirini va vaqt tamg'asidan so'ng darhol olgan OCSP javobini ham saqlaydi. 2028 yilda tekshiruv uchun CA'ning onlayn bo'lishi shart emas.\n\nXulosa isbotlangan vaqtdan quriladi: o'shanda sertifikat yaroqli edi, holat `good` edi, bekor qilish esa keyin bo'lgan. 1200 shartnoma yana tekshiruvdan o'tadi.",
      watch: "TSA sertifikatining ham muddati tugaydi. Uzoq muddatli arxivlar har bir necha yilda eski dalillar ustiga yangi vaqt tamg'asi qo'yadi.",
      fields: {
        "proven time": "`signingTime` emas, TSA vaqti.",
        "stored OCSP": "Imzo kunidan beri CMS yonida saqlanadi.",
        after: "Faqat isbotlangan vaqtdan oldingi bekor qilish imzoni yaroqsiz qilardi.",
        VALID: "Imzoni hech kimdan so'ramasdan isbotlash mumkin.",
      },
    },
    countersign: {
      short: "Ikkinchi",
      title: "Xaridor o'sha shartnomani imzolaydi",
      body: "Xaridor shartnomani ochadi, ilova o'sha PDF'ni xeshlaydi va o'sha `messageDigest`'ni oladi. O'sha `SignedData`'ga xaridor sertifikati va o'z vaqt tamg'asi bilan ikkinchi `signerInfo` qo'shiladi.\n\nServer har imzolovchini alohida tekshiradi: o'sha to'rt tekshiruv va o'sha dalillar. Qat'iy CMS ma'nosida **countersignature** boshqa narsa: u hujjatni emas, birinchi imzolovchining imzo qiymatini imzolaydi.",
      fields: {
        Authorization: "Xaridorning seans tokeni. Bu yerda yashirilgan.",
        signerInfos: "Har imzolovchi uchun bitta yozuv: bu yerda sotuvchi va xaridor.",
        messageDigest: "Ikkalasida bir xil: ular aynan bir baytlarni imzolagan.",
        timeStampToken: "Har imzo o'z vaqt tamg'asini oladi.",
      },
    },
    recap: {
      short: "Xulosa",
      title: "Xulosa",
      body: "Biznes hujjatlaridagi ERI uchun besh qoida.\n\n1) Aynan baytlarning xeshini imzolanadigan atributlar ichida imzolang. 2) Shaxsiy kalit tokenda qoladi, undan faqat imzo chiqadi. 3) Xesh, matematika, zanjir, sanalar va bekor qilinganlikni (OCSP yoki CRL) tekshiring. 4) `signingTime` faqat da'vo: imzo qiymati ustiga TSA vaqt tamg'asini oling. 5) Zanjir va OCSP javobini imzo bilan birga saqlang, toki sertifikat muddati tugagach ham imzo isbotlanadigan bo'lib qolsin.",
    },
  },
};

export default text;
