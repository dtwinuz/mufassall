import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Loyiha: Sanad, imzosini o'zi olib yuradigan sertifikat",
  summary:
    "Sanad Wonmor'ning ochiq kodli loyihasi: kurs sertifikatlari, badge'lar va tavsiyanomalar W3C Verifiable Credentials 2.0 (Open Badges 3.0 bilan mos) sifatida chiqariladi va oflayn, Telegram bot yoki veb sahifa orqali tekshiriladi. QR kod faqat manzil; imzo esa qayerda tekshirilmasin isbot. Sanad reja bosqichida: bosh sahifada haqiqiy Ed25519 demo bor, konsept demo beruvchi kabineti va tekshiruvchini ko'rsatadi, pipeline esa allaqachon test, rollback va imzolangan relizlar bilan ishlaydi. Dars o'quv markazi, bitiruvchi va ish beruvchi yo'lini, kriptografiyani va pipeline'ni ko'rsatadi.",
  learn: [
    "Nega \"tekshiruv saytiga\" olib boradigan QR kod hech narsani isbotlamaydi va imzolangan credential nimani o'zgartiradi",
    "Credential JSON: beruvchi, egasi, status yozuvi va Data Integrity isboti, aynan qaysi baytlar imzolanadi",
    "Oflayn tekshiruv: kanonik shakl, Ed25519, keshdagi did:web kaliti, o'xshash domenlarga qarshi ishonchli ro'yxat, Bitstring Status List orqali bekor qilish",
    "Kalit rotatsiyasi, fail-closed tekshiruvlar va Muhr hamda Shaffof bilan umumiy statik sayt pipeline'i",
  ],
  nodes: {
    issuer: "Sanad issuer (reja)",
    holder: "Bitiruvchi",
    verifier: "Ish beruvchi / bot",
    centre: "O'quv markazi",
    keys: "Kalitlar ombori",
    didweb: "did:web hujjati",
    status: "Status ro'yxati",
    site: "sanad-site (Caddy)",
    gh: "GitHub",
    ci: "GitHub Actions",
    rel: "GitHub Releases",
  },
  metrics: {
    forged: "Haqiqiy deb ko'rsatilgan soxtalar",
    net: "Tekshiruv uchun tarmoq so'rovlari",
    revoked: "Amalda deb ko'rsatilgan bekor qilinganlar",
    rows: "Imzolangan CSV qatorlari",
    inline: "CSP'dagi xavfli inline manbalar",
  },
  steps: {
    what: {
      short: "Nima",
      title: "Sanad: saytga ishonmasdan tekshiriladigan sertifikat",
      body: "2024-yil iyulda O'zbekistonda soxtakorlar o'xshash \"tekshiruv sayti\" yasab, soxta QR kodlarni unga yo'naltirgan (gov.uz, 2024-07-08). \"Haqiqiy\" deb yozadigan sahifa hech narsani isbotlamaydi. Sanad sertifikatni imzolangan W3C Verifiable Credential'ga aylantiradi: bitta harf o'zgarsa, kim va qayerda tekshirmasin, tekshiruv yiqiladi.\n\n2026-11-19 holati: **reja bosqichi**, hali hech narsa chiqarilmagan. Kim uchun: xususiy o'quv markazlari, IT kurslar, hakatonlar; davlat diplomi yoki ID hech qachon emas. Bu yerdagi JSON haqiqiy: repo'ning o'z `sanad-core.js` kodi yangi Ed25519 kalit bilan chiqargan.",
      fields: {
        issuer: "Kim imzolagan: markazning o'z domenidagi DID va ko'rinadigan nom.",
        validFrom: "Credential qachondan amal qiladi.",
        credentialSubject: "Bitiruvchi va yutuq: kurs nomi va mezonlari.",
        credentialStatus: "Bekor qilinganini qayerdan tekshirish: ro'yxat manzili va shu credential biti indeksi.",
        proof: "Data Integrity isboti: tekshiruvchiga kalitning o'zidan boshqa hamma narsa.",
        verificationMethod: "Qaysi kalit imzolagan: beruvchi DID'i va kalit id.",
        proofValue: "Ed25519 imzo, multibase base64url.",
      },
    },
    issue: {
      short: "Chiqarish",
      title: "Markaz: CSV kiradi, har bitiruvchiga bitta imzolangan credential chiqadi",
      body: "O'quv markazi bitiruvchilarni CSV qilib yuklaydi: ism, kurs id, sana, baho. Konsept demo namunasida 12 qator va ataylab qo'yilgan to'rtta xato bor: bo'sh ism, xato yozilgan kurs (`pyton`), bo'lmaydigan sana va kelajakdagi sana. Oldindan ko'rishda har biri qator raqami va sababi bilan belgilanadi; tugma faqat tayyor 8 qatorni imzolaydi.\n\nHar credential markazning faol kaliti bilan imzolanadi va bekor qilish ro'yxatida o'z bitini oladi. Maxfiy kalit OpenBao'da turishi va undan hech qachon chiqmasligi rejalashtirilgan.",
      check: {
        q: "12 qatordan 4 tasida xato bor. Issuer nima qilishi kerak?",
        options: [
          "Fayl mukammal bo'lguncha hammasini rad etish",
          "8 ta to'g'ri qatorni imzolash, rad etilgan har qatorni raqami va sababi bilan ko'rsatish",
          "12 tasini ham imzolash, bitiruvchilar shikoyat qilsin",
        ],
        answer: 1,
        why: "Imzolangan credential'ni keyin jimgina tuzatib bo'lmaydi: xato ism bekor qilib qayta chiqarishni anglatadi. Shuning uchun tekshiruv imzodan oldin, qatorma-qator bo'ladi va operator nima imzolanishini aniq ko'radi. Bitta xato uchun butun paketni to'xtatish 8 ta to'g'ri bitiruvchini kechiktiradi, xolos.",
      },
      fields: {
        ism: "Ism ustuni. Majburiy.",
        kurs: "Kurs id; ma'lum yutuqqa mos kelishi kerak.",
        sana: "Chiqarilgan sana: haqiqiy sana, kelajakda emas.",
        baho: "Baho; badge uchun bo'sh.",
        "8 ready": "Faqat shular imzolanadi; to'rtta xato ekranda qoladi.",
        "status-list bit": "Keyin bekor qilish mumkin bo'lsin deb chiqarish paytida ajratiladi.",
      },
    },
    hold: {
      short: "Saqlash",
      title: "Bitiruvchi: PDF, QR, fayl, akkaunt esa yo'q",
      body: "Bitiruvchi QR kodli, chop etiladigan PDF oladi. Reja credential'ning o'zini QR ichiga joylash; u doim sig'adimi, prototip bilan o'lchanadigan ochiq savol, zaxira yo'l esa JSON'ni PDF'ga biriktirib, QR'ga uning hashini qo'yish.\n\nSaqlab turiladigan akkaunt ham, tirik turishi shart bo'lgan sayt ham yo'q: imzo bor ekan, sertifikat amal qiladi. Konsept demo'dagi egasi ko'rinishi bitta bitiruvchining uchta credential'ini ko'rsatadi.",
      fields: {
        PDF: "Chop etiladi. Shablonlarda davlat hujjatiga taqlid qiladigan narsa yo'q.",
        QR: "Ishoniladigan manzil emas, ma'lumotning o'zini olib yuradi.",
        file: "Oddiy JSON: faqat Sanad emas, istalgan VC 2.0 tekshiruvchisi o'qiydi.",
        account: "Yo'q. Isbot bitiruvchining o'zida.",
      },
    },
    verify: {
      short: "Tekshirish",
      title: "Ish beruvchi: botga rasm, natija joyida",
      body: "HR menejer QR rasmini Telegram botga yuboradi yoki veb tekshiruvchini ochadi. Tekshiruv qurilmaning o'zida: format, kanonik shakl va SHA-256, Ed25519 imzosi keshdagi beruvchi kaliti bilan, ishonchli ro'yxat, amal qilish sanalari. Faqat bekor qilish tekshiruvi onlayn, u ham ixtiyoriy.\n\nNatija uchtadan biri: **haqiqiy**, **soxta** (imzo mos emas yoki kalit beruvchiniki emas) yoki **bekor qilingan**. Konsept demo'da o'nta namuna bor: haqiqiy, ism o'zgartirilgan, soat o'zgartirilgan, o'xshash domen, bekor qilingan, muddati tugagan, eski kalit, boshqa markaz, notanish kalit va buzilgan JSON.",
      check: {
        q: "Ish beruvchi telefonida internet yo'q. Bot baribir nimani ayta oladi?",
        options: [
          "Hech narsa: tekshiruvga beruvchi serveri kerak",
          "Keshdagi kalit va ishonchli ro'yxat bilan haqiqiy yoki soxtaligini; faqat bekor qilish tekshirilmay qoladi",
          "Faqat QR o'qiladimi-yo'qmi",
        ],
        answer: 1,
        why: "Imzo tekshiruviga faqat baytlar va beruvchining ochiq kaliti kerak, ikkalasi qurilmada bor. Bekor qilish chiqarilgandan keyin o'zgaradigan yagona fakt, shuning uchun faqat unga yangi ro'yxat kerak, va natija u o'tkazib yuborilganini aytadi.",
      },
      fields: {
        canonical: "Kalitlar tartiblangan, bo'shliqsiz: beruvchi imzolagan aynan o'sha baytlar.",
        signature: "O'sha baytlar ustidan Ed25519, keshdagi did:web kaliti bilan.",
        "trusted list": "Bu DID tekshiruvchi biladigan beruvchilardanmi?",
        revocation: "Status ro'yxati biti; yagona onlayn qadam.",
        Genuine: "Hamma tekshiruv o'tdi.",
      },
    },
    sign: {
      short: "Imzo",
      title: "Aynan qaysi baytlar imzolanadi",
      body: "Demo `eddsa-jcs-2022` cryptosuite'ini modellashtiradi. Isbotsiz credential kanonik JSON'ga (kalitlar tartiblangan, bo'shliqsiz) aylantiriladi, isbot opsiyalari ham: `proof` ichidagi `proofValue` dan boshqa hamma narsa. Har biri SHA-256 bilan hashlanadi va ikki 32 baytli hash ketma-ket qo'shiladi; shu 64 baytli kirish Ed25519 bilan imzolanadi.\n\n`canon()` JSON aniq olib yura olmaydigan narsani (undefined, funksiya, NaN, Infinity, klass nusxalari) rad etadi, shuning uchun ikki xil qiymat hech qachon bir xil kanonik shaklga tushmaydi. Ed25519 yo'q brauzerlarda ECDSA P-256 ishlatiladi va sahifa buni aytadi. Haqiqiy mahsulot to'liq mos JCS implementatsiyasi va to'liq cryptosuite'dan foydalanishi shart.",
      check: {
        q: "Nega JSON yozilganidek emas, kanonik shaklda imzolanadi?",
        options: [
          "Kanonik JSON qisqaroq",
          "Kalit tartibi va bo'shliqlar yo'lda o'zgarishi mumkin (QR enkoder, chiroyli formatlovchi); kanonik shakl tekshiruvchiga beruvchi imzolagan baytlarni qaytaradi",
          "Ed25519 matnni imzolay olmaydi",
        ],
        answer: 1,
        why: "Ikki JSON matni bir xil obyektni anglatib, baytma-bayt farq qilishi mumkin. Kanoniklashtirishsiz zararsiz qayta formatlash imzoni buzardi. JCS (RFC 8785) bitta qiymat uchun bitta bayt shaklini belgilaydi.",
      },
      fields: {
        canon: "JCS'ga o'xshash kanonik JSON; noaniq narsa o'zgartirilmaydi, xato beradi.",
        options: "Isbot metama'lumoti: uni qamrash sana yoki kalit id'ni tahrirlashni to'xtatadi.",
        input: "64 bayt: avval opsiyalar hashi, keyin hujjat hashi.",
        Ed25519: "Kichik, tez imzo; zamonaviy brauzerlarda WebCrypto qo'llaydi.",
        multibase: "Boshidagi u kodlashni bildiradi; faqat qat'iy base64url.",
      },
    },
    trust: {
      short: "Ishonch",
      title: "Noto'g'ri beruvchining to'g'ri imzosi baribir soxta",
      body: "Ayyor soxtakor credential'ni tahrirlamaydi; u o'z nusxasini o'z kaliti bilan, to'g'ri ko'rinadigan domen ostida imzolaydi: `markaz.example` o'rniga `rnarkaz.example`, `ilmyo1i` da raqamli bir. Imzo matematik jihatdan to'g'ri.\n\nShuning uchun tekshiruvchi yana ikki savol beradi: imzolagan kalit hujjatda nomlangan beruvchiga tegishlimi va o'sha beruvchi ishonchli ro'yxatdami? Bu yerda javob yo'q, natija \"soxta beruvchi\". Bot DID va domenni doim to'liq ko'rsatadi. Ro'yxatni kim yuritishi rejada hali ochiq savol.",
      check: {
        q: "Imzo to'g'ri, lekin beruvchi `did:web:rnarkaz.example`. Bot nima javob berishi kerak?",
        options: [
          "Haqiqiy: imzo to'g'ri",
          "Soxta beruvchi: kalit to'g'ri, lekin ishonchli ro'yxatda yo'q, o'xshash nom yordam bermaydi",
          "Noma'lum, markazga telefon qiling",
        ],
        answer: 1,
        why: "Imzo qaysi kalit imzolaganini isbotlaydi, u siz nazarda tutgan kalit ekanini emas. Kalitni beruvchi DID'iga bog'lash va o'sha DID'ni ma'lum beruvchilar ro'yxati bilan solishtirish o'xshash domenlarni yengadi.",
      },
      fields: {
        id: "Beruvchi DID'i: asl nusxadan bitta harf farq.",
        name: "Aynan ko'chirilgan: nom hech narsani isbotlamaydi.",
        sigOk: "Matematika joyida: soxtakor o'z kaliti bilan imzolagan.",
        trusted: "Bu DID tekshiruvchi ro'yxatida yo'q.",
        verdict: "fake: \"soxta beruvchi\" deb ko'rsatiladi.",
      },
    },
    revoke: {
      short: "Bekor",
      title: "Kim tekshirayotganini beruvchiga aytmasdan bekor qilish",
      body: "Ba'zan credential'ni qaytarib olish kerak: ism xato yozilgan (qayta chiqariladi), kurs puli qaytarilgan, yakuniy loyiha ko'chirilgan. Har credential W3C Bitstring Status List ichida bitta bitga ega; bekor qilish uni 1 qiladi. Demo ro'yxatida 131 072 bit, siqilganda taxminan 16 KB.\n\nTekshiruvchi butun ro'yxatni yuklaydi, shuning uchun beruvchi ish beruvchi qaysi sertifikatni ko'rganini hech qachon bilmaydi. Bekor qilingan credential imzosi baribir haqiqiy, shuning uchun natija \"soxta\" emas, \"bekor qilingan\". Noto'g'ri yoki noma'lum indeks bekor qilingan hisoblanadi.",
      check: {
        q: "Nega \"#7 bekor qilinganmi?\" deb so'ramasdan butun ro'yxat yuklanadi?",
        options: [
          "Bu tezroq",
          "Beruvchi qaysi credential'ni, kim va qachon tekshirayotganini ko'rmasin",
          "Standart unumdorlik uchun bittalik so'rovni taqiqlaydi",
        ],
        answer: 1,
        why: "Har credential uchun alohida so'rov beruvchini har ish arizasining kuzatuvchisiga aylantirardi. 16 KB lik ro'yxat tekshiruvchiga kerak bo'lgan bitta bitni 131 072 tasi orasida yashiradi; uni keshlash ham mumkin.",
      },
      fields: {
        statusPurpose: "Bu ro'yxat bekor qilish uchun (to'xtatib turish alohida ro'yxat bo'lardi).",
        statusListIndex: "Qaysi bit shu credential'niki. Qat'iy tahlil qilinadigan satr.",
        Revoked: "Imzo joyida, beruvchi uni qaytarib olgan.",
        "fail closed": "Shubha bo'lsa javob \"bekor qilingan\", hech qachon \"amalda\" emas.",
      },
    },
    keys: {
      short: "Kalitlar",
      title: "Kalit rotatsiyasi: yangi sertifikatga yangi kalit, eskilari tekshirilaveradi",
      body: "Beruvchining ochiq kalitlari o'z domenida `did:web` hujjati sifatida e'lon qilinadi. Konsept demo'da markaz avval `key-0`, keyin `key-1` bilan imzolagan; \"kalitni almashtirish\" faol kalitni nafaqaga chiqaradi va keyingisini yaratadi.\n\nNafaqadagi kalit hujjatda qoladi, shuning uchun u yillar oldin imzolagan sertifikatlar tekshirilaveradi; yangi imzo uchun faqat faol kalit ko'rsatiladi. O'g'irlangan kalit ham shunday almashtiriladi, ustiga u imzolaganlar bekor qilinadi, chiqarilgan sana esa Muhr orqali muhrlanishi mumkin, shunda keyingi kalit o'g'risi sanani orqaga sura olmaydi.",
      fields: {
        verificationMethod: "E'lon qilingan barcha kalitlar, nafaqadagilari ham.",
        publicKeyMultibase: "Ochiq kalitning o'zi, multibase kodlangan (demo'da qisqartirilgan).",
        assertionMethod: "Hozir yangi credential imzolashi mumkin bo'lgan kalit.",
      },
    },
    stack: {
      short: "Stek",
      title: "Rejadagi stek va sabablari",
      body: "Avval ochiq standartlar: VC 2.0, Data Integrity, Bitstring Status List va Open Badges 3.0, shunda credential Sanad'siz ham tekshiriladigan bo'lib qoladi. Issuer .NET 10 API sifatida rejalashtirilgan, ichida walt.id (Apache-2.0, Docker REST xizmat) yoki brauzerda digitalbazaar/vc (BSD-3-Clause). Kalitlar OpenBao'da turadi va undan chiqmaydi; identifikatsiya `did:web`, unga markaz domenidan boshqa narsa kerak emas.\n\nBot rasmdagi QR'ni o'zbek, rus va ingliz tilida o'qiydi. MVP Muhr'dan keyingi 8 hafta, pilot esa Wonmor'ning o'z ochiq repolari hissa qo'shuvchilariga badge. Keyinroq: OpenID4VCI hamyonlari va SD-JWT selective disclosure.",
      fields: {
        standards: "Mos tushadigan formatlar: Sanad'ga bog'lanib qolish yo'q.",
        "walt.id": "Qo'lda yozilgan kripto o'rniga xizmat sifatida ishlaydigan tayyor identity toolkit.",
        OpenBao: "Ochiq kodli secret manager: maxfiy kalit uning ichida ishlatiladi.",
        "did:web": "Kalitlar beruvchining o'z domenida, blokcheynsiz topiladi.",
        anchor: "Ixtiyoriy: chiqarilgan sana Muhr jurnali orqali muhrlanadi.",
      },
    },
    site: {
      short: "Sayt",
      title: "Jonli sayt: qattiq CSP ostida haqiqiy imzo demosi",
      body: "sanad.wonmor.io statik HTML, CSS va to'rtta kichik skript, shriftlar o'zimizda, build qadami va uchinchi tomon so'rovlari yo'q; uni dtwin.uz umumiy edge proksisi ortidagi Caddy beradi. Sahifadagi demo har yuklanishda brauzerda chiqarib bo'lmaydigan Ed25519 kalitlar yaratadi: maxfiy kalitni hatto sahifaning o'zi ham o'qiy olmaydi.\n\nCSP hech qanday inline skript yoki uslubga ruxsat bermaydi. Yagona istisno favicon'ning qorong'i mavzu `<style>` i, u aniq SHA-256 hashi bilan ruxsat etilgan, sayt tekshiruvchisi esa har yangi inline uslubda yiqiladi.",
      fields: {
        "Content-Security-Policy": "Faqat self, ustiga favicon uchun bitta hashlangan uslub.",
        "Cache-Control": "Har yuklanishda qayta tekshirish: deploy darhol ko'rinadi.",
      },
    },
    ci: {
      short: "CI",
      title: "CI: kripto kodi har tomondan tekshiriladi",
      body: "Har pull request `build` job'ini yurgizadi: sayt tekshiruvchisi, REUSE, ogohlantirish xato hisoblanadigan ESLint, unit testlar, tasodifiy kirishli fast-check property testlari, production CSP ostidagi Chromium end-to-end testlari va har sayt skripti bo'yicha coverage darvozasi (90 % qator va funksiya, 80 % tarmoq). e2e to'plami demoni WebCrypto'siz va Ed25519'siz ham yurgizadi.\n\nKonsept demo smoke test qo'shadi (21 tekshiruv). Ruleset `build` va `dco` tekshiruvlarini, bitta approve va code owner'ni talab qiladi; Dependabot yangilanishlarni oyiga bir guruhlaydi.",
      fields: {
        "check-site": "CSP bloklaydigan yoki hech qachon e'lon qilinmasligi kerak bo'lgan har narsada yiqiladi.",
        "fast-check": "Tasodifiy kirishli property testlar: canon barqarorligi, base64url aylanishi, Ed25519 o'zgargan har baytni rad etishi.",
        coverage: "Brauzer va unit coverage birlashtirilib, CI'da darvoza qilingan.",
        "demo smoke": "Har demo ekrani production CSP ostida konsol xatosiz ochiladi.",
      },
    },
    deploy: {
      short: "Deploy",
      title: "Deploy va reliz: Wonmor'ning umumiy pipeline'i",
      body: "Sanad Muhr va Shaffof bilan bir xil pipeline'dan foydalanadi. `main` push'i saytni tekshiradi, SHA'ni `version.txt` ga yozadi va tarball'ni faqat `receive` ni yurgiza oladigan kalitga SSH orqali oqizadi. Server relizlarni SHA bo'yicha saqlaydi va symlink'ni atomar almashtiradi, CI jonli SHA'ni tasdiqlab smoke-test qiladi, xato bo'lsa rollback.\n\n`v*` tegi arxivni ikki marta yig'ib baytma-bayt solishtiradi, SHA256SUMS yozadi va provenance'ni Sigstore bilan imzolaydi. Loyiha OpenSSF Best Practices silver (16669), Observatory A+ va SSL Labs A+ ga ega.",
      fields: {
        DEPLOY_SSH_KEY: "Repo secret'i, serverda bitta buyruqqa bog'langan.",
        receive: "Server tomoni: deploy <sha>, rollback, status.",
        "atomic symlink swap": "Hech bir so'rov yarim relizni ko'rmaydi.",
        rollback: "Deploy'dan keyingi tekshiruv yiqilsa avtomatik.",
        Sigstore: "Istalgan odam gh attestation verify bilan tekshiradigan provenance.",
      },
    },
    recap: {
      short: "Xulosa",
      title: "Xulosa",
      body: "1) QR kod manzil, imzo isbot. Sanad faqat xususiy beruvchilar uchun W3C VC 2.0 (Open Badges 3.0) credential chiqaradi. 2) Markaz CSV yuklaydi; qatorlar imzodan oldin tekshiriladi, har credential status bitini oladi. 3) Bitiruvchi PDF, QR va faylni akkauntsiz saqlaydi. 4) Tekshiruvchi oflayn ishlaydi: kanonik shakl, keshdagi did:web kaliti bilan Ed25519, o'xshash domenlarga qarshi ishonchli ro'yxat; faqat bekor qilish onlayn. 5) Isbot opsiyalari hujjat bilan birga imzolanadi. 6) Bekor qilish ro'yxati butunlay yuklanadigan bit qatori, har shubhali holat fail-closed. 7) Nafaqadagi kalitlar e'lon qilingan holda qoladi, eski sertifikatlar tekshirilaveradi. 8) Holat: reja bosqichi, haqiqiy imzo demosi va test qilingan, rollback'li pipeline bilan.",
    },
  },
  scenarios: {
    "unsigned-options": {
      label: "Imzosiz opsiyalar",
      steps: {
        "opt-gap": {
          short: "Teshik",
          title: "Sanani o'zgartirsa ham \"Haqiqiy\" chiqardi",
          body: "2026-11-14 dagi xavfsizlik ko'rigi birinchi demo faqat credential'ni imzolaganini topdi. Shu JSON'da ko'rinadigan isbot opsiyalari, `created`, `cryptosuite`, `proofPurpose`, `verificationMethod`, qamrab olinmagan edi. Masalan, `created` ni yillar oldinga surish mumkin edi va sahifa baribir \"Haqiqiy\" derdi.\n\nDemo'da xavf past edi; haqiqiy tekshiruvchida o'rtacha bo'lardi, chunki imzo sanasi va kalit id'i eski sizgan kalitga ega soxtakor aynan o'zgartirmoqchi bo'lgan narsa.",
          check: {
            q: "Data Integrity isbotining qaysi qismini imzo qamrashi shart?",
            options: [
              "Faqat credential'ni; isbot metama'lumot",
              "Credential'ni va imzo qiymatining o'zidan boshqa barcha isbot opsiyalarini",
              "Faqat proofValue'ni",
            ],
            answer: 1,
            why: "Tekshiruvchi qaror uchun o'qiydigan hamma narsa imzolangan bo'lishi kerak, aks holda uni almashtirsa bo'ladi. eddsa-jcs-2022 isbot opsiyalari va hujjatni alohida hashlab, ikkala hashni imzolaydi.",
          },
          fields: {
            created: "Imzodan keyin tahrirlangan; eski demo sezmagan.",
            proofValue: "O'zgarmagan: u created'ni hech qachon qamramagan.",
            Genuine: "Yolg'on natija.",
          },
        },
        "opt-fix": {
          short: "Tuzatish",
          title: "Opsiyalarni ham imzola va to'g'ri maqsadni talab qil",
          body: "Imzolanadigan kirish `SHA-256(canon(options)) || SHA-256(canon(credential))` bo'ldi, opsiyalar esa `proofValue` siz isbot. Tekshiruvchi `type: DataIntegrityProof` va `proofPurpose: assertionMethod` ni ham talab qiladi.\n\nEndi sana, cryptosuite yoki kalit id'ni tahrirlash imzoni buzadi, sahifa izohi esa uch tilda nima qamralganini aytadi. O'sha ko'rik base64url dekodlashni qat'iy qildi va `u` multibase tekshiruvini qo'shdi.",
          fields: {
            "proof minus proofValue": "Opsiyalar: imzodan tashqari isbotning har maydoni.",
            proofPurpose: "assertionMethod bo'lishi shart: login uchun kalit sertifikat imzolay olmaydi.",
            Forged: "Har tahrirlangan opsiya uchun natija.",
          },
        },
      },
    },
    "fail-open": {
      label: "Ochiq xato",
      steps: {
        "open-hole": {
          short: "Teshik",
          title: "Noma'lum indeks \"bekor qilinmagan\" degani edi",
          body: "O'sha ko'rikning 4-topilmasi: bekor qilish tekshiruvi ochiq holatda yiqilardi. Ro'yxatda yo'q indeks \"bekor qilinmagan\" hisoblanardi, `parseInt` esa `\"7abc\"` ni 7 deb o'qirdi. Xato yozuv, kesilgan ro'yxat yoki chegaradan tashqari indeks sertifikatni o'tkazib yuborardi.\n\nIndeks imzolangan credential ichida, shuning uchun begona odam bundan to'g'ridan-to'g'ri foydalana olmasdi, lekin xatoli issuer hech qachon bekor qilib bo'lmaydigan sertifikatlar chiqarishi mumkin edi.",
          fields: {
            statusListIndex: "Oddiy o'nlik satr bo'lishi kerak.",
            parseInt: "Birinchi raqam bo'lmagan belgida to'xtaydi: \"7abc\" e'tirozsiz 7 bo'ladi.",
            "not revoked": "Xavfli standart javob.",
          },
        },
        "open-fix": {
          short: "Yopiq",
          title: "\"Bekor qilinmagan\" ni faqat toza, ma'lum indeks ayta oladi",
          body: "`isRevoked()` endi faqat ro'yxatda o'z xossasi sifatida bor oddiy o'nlik indeksni qabul qiladi; boshqa har narsa \"bekor qilingan\" qaytaradi. Qoida umumiy: xavfsizlik tekshiruvida xato yo'li xavfsiz javob berishi kerak.\n\nUnit test unga son ko'rinishidagi `7`, `07`, `7abc`, `-7`, ro'yxatda yo'q indeks va `__proto__` beradi: hammasi \"bekor qilingan\" qaytishi shart.",
          fields: {
            "fail closed": "Shubha bekor qilingan degani.",
            "return true": "true = bekor qilingan: har noto'g'ri kirish uchun xavfsiz javob.",
          },
        },
      },
    },
    "inline-style": {
      label: "unsafe-inline'ni olib tashlash",
      steps: {
        "style-gap": {
          short: "Teshik",
          title: "CSP'da bitta bo'sh so'z, demo esa unga bog'liq edi",
          body: "Birinchi CSP `style-src 'unsafe-inline'` ga ruxsat berardi; bu assurance case'da qoldiq xavf sifatida yozilgan va #7 issue bilan kuzatilardi. Har bosh sahifada beshta `style` atributi bor edi, imzo demosining `sanad-core.js` i esa qadam belgisini inline uslub bilan yasardi.\n\nShunchaki sarlavhani qattiqlashtirib bo'lmasdi: qattiq CSP va eski skript bilan har sahifa beshta xato yozar, demo esa joylashuvini yo'qotardi. Tuzatish markup'dan boshlanishi kerak edi.",
          fields: {
            "unsafe-inline": "Kiritilgan har qanday uslubni ishlatadi: markup qachondir kiritilsa, CSS orqali hujum uchun tayanch.",
            "sanad-core.js": "Demo mantig'i: u style atributli markup yasardi.",
            "5 console errors": "Skript tuzatilishidan oldin qattiq CSP har sahifada chiqargan narsa.",
          },
        },
        "style-fix": {
          short: "Tuzatish",
          title: "Uslublarni klasslarga ko'chir, bitta hashga ruxsat ber, tekshiruvchini o'rgat",
          body: "PR #22 har inline uslubni `sanad.css` klasslariga ko'chirdi va `style-src 'self'` ustiga favicon'ning qorong'i mavzu `<style>` i SHA-256 hashini qo'ydi, bu qolgan yagona inline blok. PR #23 `check-site` ni bu naqshni butunlay rad etadigan qildi, skriptlardagi `setAttribute('style', ...)` ham.\n\nPR dalilni ko'rsatadi: uch til sahifasida hisoblangan uslublar oldin va keyin bir xil, konsolda nol xato, to'liq test to'plami yashil, tekshiruvchi esa eski skriptda kutilganidek yiqiladi.",
          fields: {
            "sha256": "Faqat favicon uslub blokiga ruxsat beradi, boshqa hech narsaga emas.",
            "check-site": "Endi inline uslub qaytishi mumkin bo'lgan har yo'lda yiqiladi.",
            "0 errors": "Yangi CSP ostida har sahifada konsol.",
          },
        },
      },
    },
  },
};

export default text;
