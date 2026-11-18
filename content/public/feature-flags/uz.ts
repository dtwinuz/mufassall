import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Feature flag'lar",
  summary:
    "Do'kon yangi checkout oqimini chiqaradi. Deploy va release bitta harakat bo'lsa, bug hamma foydalanuvchiga yetadi, ortga qaytish esa 15 daqiqalik qayta deploy. Feature flag'lar ikkalasini ajratadi: kod o'chirilgan holda chiqadi, kim ko'rishini flag servisi hal qiladi, SDK lokal baholaydi va o'zgarishlarni stream orqali oladi, kill switch ikki soniyada o'chiradi, egasi va muddati bor flag'lar esa eskilari to'planib qolishiga yo'l qo'ymaydi.",
  learn: [
    "Nega deploy release emas va segment hamda foizli flag qoidasi qanday ko'rinadi",
    "Har so'rovga masofaviy chaqiruv o'rniga keshlangan snapshot'dan lokal baholash va stream orqali yangilanish",
    "User id'ning barqaror hash'i bo'yicha foizli rollout, kill switch va o'zi ortga qaytaradigan guardrail",
    "Eskirgan flag'lar qarz sifatida: egasi, muddati va build'ni yiqitadigan CI tekshiruvi",
  ],
  nodes: {
    users: "Xaridorlar",
    api: "Checkout API",
    db: "Buyurtma bazasi",
    ci: "CI/CD",
    flags: "Flag servisi",
    team: "Checkout jamoasi",
    events: "Metrika hodisalari",
    guard: "Guardrail",
  },
  metrics: {
    errors: "Checkout xatolari",
    "off-s": "O'chirish vaqti",
    p99: "Checkout p99",
    stale: "Eskirgan flag'lar",
  },
  steps: {
    deploy: {
      short: "Deploy",
      title: "Deploy va release bir lahzada",
      body: "Jamoa yangi checkout oqimini tugatadi va PR'ni merge qiladi. CI `v412` versiyasini yig'adi va uni 24 pod'ning hammasiga chiqaradi. To'rt daqiqadan keyin har xaridor yangi oqimda.\n\nUni foydalanuvchilarning 100% iga chiqarishni hech kim hal qilmagan. Merge'ning o'zi qaror bo'ldi, o'chirish esa oldingi versiyani deploy qilish degani: taxminan 15 daqiqa.",
      fields: {
        v412: "Bitta build: yangi oqim va haftaning boshqa hamma o'zgarishlari birga.",
        "new checkout flow": "Feature shunchaki kodning bir qismi.",
        "100% of traffic": "Hech kim va hamma o'rtasida oraliq qadam yo'q.",
        "release decision": "Feature'ni kim ko'rishini merge tugmasi hal qiladi.",
      },
    },
    bug: {
      short: "Bug",
      title: "Yangi oqimdagi bug hammaga tegadi",
      body: "Yangi oqim soliqni boshqacha yaxlitlaydi va ba'zi savatlar `500` bilan yiqiladi. Checkout xatolari 0.4% dan 7.2% ga sakraydi. Tuzatish bitta qator, lekin unga build, test va rollout kerak. Eski versiyaga qaytish ham xuddi shu pipeline'dan o'tadi.\n\n15 daqiqa davomida har 100 xaridordan 7 tasi to'lay olmaydi.",
      watch: "Feature'ni o'chirishning yagona yo'li deploy bo'lsa, har incident kamida bitta pipeline davom etadi.",
      check: {
        q: "Jamoa yangi oqimni deploy'siz qanday o'chira oladi?",
        options: [
          "Ikkala oqimni ham kodda saqlash va build'dan tashqarida turgan kalit bilan ishlash paytida tanlash",
          "Tezroq deploy qilish: pipeline'ni 5 daqiqagacha qisqartirish",
          "Merge'dan oldin ko'proq test qilish",
        ],
        answer: 0,
        why: "Tez pipeline baribir pipeline, testlar esa hamma narsani ushlamaydi. Eski va yangi yo'l ikkalasi ham chiqsa va birini runtime kaliti tanlasa, o'chirish soniyalar oladigan config o'zgarishiga aylanadi.",
      },
      fields: {
        error: "Bug faqat yangi kod yo'lida.",
        request_id: "Shu so'rovni log'dan topish uchun.",
        version: "Butun build yomon, demak butun build ketishi kerak.",
      },
    },
    flag: {
      short: "Flag",
      title: "Kod o'chiq chiqadi, flag hal qiladi",
      body: "Yangi oqim endi `if (flags.on(\"new-checkout\", user))` ortida turibdi. Kod hamma pod'ga deploy qilingan, lekin default holatda eski oqimni beradi. **Flag servisi** qoidalarni saqlaydi: xodimlar yangi oqimni oladi, keyin xaridorlarning 5% i, qolganlar default'ni.\n\nHozircha API har checkout'da flag servisidan so'raydi. Feature'ni o'chirish flag servisidagi bitta o'zgarish, keyingi so'rovdan kuchga kiradi.",
      fields: {
        enabled: "Flag'ning bosh kaliti. `false` bo'lsa hamma default'ni oladi.",
        rules: "Yuqoridan pastga tekshiriladi; birinchi mos kelgani hal qiladi.",
        segment: "Nomlangan guruh, bu yerda kompaniyaning o'z xodimlari.",
        rollout: "Foydalanuvchilarning bir ulushi, `by` dagi maydon bo'yicha bo'linadi.",
        default: "Hech qaysi qoidaga tushmaganlar oladigan narsa. Xavfsiz tanlov: eski oqim.",
        version: "Har o'zgarish raqam oladi: javob qaysi config bilan berilgani ko'rinadi.",
      },
    },
    remote: {
      short: "Masofaviy",
      title: "Har so'rovga tarmoq chaqiruvi: sekin va mo'rt",
      body: "Har checkout endi flag servisiga chaqiruvni kutadi: 46 dan 51 ms gacha, p99 esa 180 dan 226 ms ga o'sadi. Daqiqasiga 3 400 checkout'da flag servisi yuki 92%. U qotib qolsa, chaqiruvlar timeout bo'ladi va default'ga tushadi.\n\nFlag servisi checkout yo'lining bir qismiga aylandi: u sekin bo'lsa, checkout ham sekin.",
      watch: "Flag tekshiruvi hech qachon mahsulotni yiqita olmasligi kerak.",
      check: {
        q: "API flag'larni qanday baholashi kerak?",
        options: [
          "Har foydalanuvchi uchun javobni bir soatga keshlash",
          "Hamma qoidalarni bir marta yuklab olish, xotirada baholash va o'zgarishlarni push orqali olish",
          "Flag servisiga ko'proq replika qo'shish",
        ],
        answer: 1,
        why: "Javobni foydalanuvchi bo'yicha keshlash har yangi foydalanuvchi uchun baribir servisni chaqiradi va o'chirilgan flag'ni bir soat yoniq ushlaydi. Replikalar pul turadi va tarmoq sakrashi qoladi. Qoidalar kichik: lokal nusxa bilan tekshiruv oddiy funksiya chaqiruvi, servis esa faqat o'zgarishlar uchun kerak.",
      },
      fields: {
        remote: "Tekshiruv har so'rovda tarmoqdan o'tadi.",
        timeout: "Flag servisi 200 ms ichida javob bermadi.",
        "default off": "Zaxira yo'l: xavfsiz, lekin foydalanuvchi rollout'dan jimgina tushib qoladi.",
        "calls/min": "Flag yuki checkout trafigi bilan birga, birga-bir o'sadi.",
      },
    },
    sdk: {
      short: "SDK",
      title: "SDK lokal nusxa saqlaydi va xotirada baholaydi",
      body: "API endi flag **SDK**'sidan foydalanadi. Ishga tushganda u hamma flag va qoidalarning snapshot'ini yuklab oladi, keyin har tekshiruvni xotirada baholaydi: mikrosoniyalar, tarmoqsiz. p99 yana 181 ms. Flag servisi ishlamasa ham SDK oxirgi snapshot bilan ishlashda davom etadi.\n\nNarxi: SDK yangi snapshot'ni daqiqada bir marta so'raydi, demak flag'ni o'chirish endi 60 soniyagacha oladi.",
      fields: {
        "If-None-Match": "Qo'lingdagi versiyani yubor; `304` hech narsa o'zgarmadi va hech narsa yuklanmaydi degani.",
        version: "Snapshot versiyasi. Har baholash uni log'ga yozishi mumkin.",
        flags: "Shu muhitning hamma qoidalari, bir necha KB.",
        poll_seconds: "Lokal nusxa qanchalik eskirishi mumkin. Incident uchun 60 s juda uzoq.",
      },
    },
    stream: {
      short: "Stream",
      title: "O'zgarishlar stream orqali yuboriladi",
      body: "SDK flag servisi bilan **SSE** (server-sent events) orqali bitta uzoq yashovchi ulanish ushlab turadi. Kimdir flag'ni o'zgartirsa, servis hodisa yuboradi va har pod taxminan ikki soniyada o'z nusxasini yangilaydi.\n\nUlanish uzilsa, SDK oxirgi ko'rgan hodisa id'si bilan qayta ulanadi va o'tkazib yuborganini oladi. Polling sekin xavfsizlik to'ri sifatida qoladi.",
      fields: {
        Accept: "Hodisalar oqimini so'raydi: hech qachon tugamaydigan bitta HTTP javob.",
        "Last-Event-ID": "Qayta ulangandan keyin: 1841-hodisadan keyingi hammasini yubor.",
        event: "Nima bo'ldi: flag o'zgardi.",
        data: "O'zgargan flag va uning yangi versiyasi; SDK uni almashtiradi.",
        "keep-alive": "Har necha soniyada izoh qatori, proxy bo'sh ulanishni yopmasligi uchun.",
      },
    },
    rollout: {
      short: "Rollout",
      title: "Barqaror hash bo'yicha foizli rollout",
      body: "Rollout 5% dan 25% ga o'sadi. SDK har so'rovda zar tashlamaydi: u flag salt'i va user id'ni hash qilib 0 dan 9999 gacha **bucket**'ga joylaydi. 2500 dan kichik bucket'lar yangi oqimni oladi.\n\nBitta foydalanuvchi har pod'da va har kuni bir xil bucket'ga tushadi, hech kim xarid o'rtasida oqimlar orasida sakramaydi. 25% ni 50% ga ko'tarish faqat foydalanuvchi qo'shadi; ichkaridagilar ichkarida qoladi.",
      watch: "Tajriba tegishli bo'lgan id bo'yicha hash qiling: login qilingan oqim uchun user id, request id yoki pod emas.",
      fields: {
        bucket: "Foydalanuvchining shu flag uchun 0..9999 chizig'idagi qat'iy joyi.",
        hash: "Har flag'ga o'z salt'i: bitta foydalanuvchi har rollout'da birinchi bo'lib qolmaydi.",
        rollout: "Qoida: 2500 dan kichik bucket'lar, ya'ni 25%.",
        "no network call": "Lokal snapshot'dan xotirada baholangan.",
      },
    },
    kill: {
      short: "Kill switch",
      title: "Incident: rollback emas, kill switch",
      body: "25% da yangi oqimda karta rad etishlari sakraydi: shu foydalanuvchilar orasida checkout xatolari 4.8% ga yetadi. Navbatchi pipeline'ga tegmaydi. U sabab sifatida incident raqami bilan `enabled: false` qo'yadi.\n\nStream buni 24 pod'ning hammasiga 1.8 soniyada yetkazadi, hamma eski oqimga qaytadi. Yomon kod hali deploy qilingan, lekin uni hech kim ishga tushirmaydi.",
      watch: "Kill switch boshqa hamma narsa singanda ham ishlashi kerak: uni sinang va ruxsatini navbatchida saqlang.",
      fields: {
        enabled: "Qoidalar nima desa ham, hamma uchun o'chiq.",
        reason: "Har o'zgarish auditga yoziladi: kim, qachon va nega.",
        streamed_to: "O'zgarishni nechta SDK ulanishi oldi.",
        took_ms: "Bosishdan oxirgi pod'gacha: 15 daqiqa o'rniga 2 soniyadan kam.",
      },
    },
    guardrail: {
      short: "Guardrail",
      title: "Guardrail flag'ni o'zi o'chiradi",
      body: "Har checkout olgan flag qiymati bilan hodisa yuboradi. Guardrail job 10 daqiqalik oynada flag yoniq foydalanuvchilarni o'chiqlar bilan solishtiradi. Har metrikaning chegarasi bor: xato ulushi ko'pi bilan +1 punkt, p99 ko'pi bilan +30 ms.\n\n50% da yangi oqimda 0.4% ga qarshi 3.9% xato bo'ldi. Guardrail flag'ni o'chirdi va jamoaga signal yubordi. Hech kim dashboard'ga qarab o'tirishi shart emas edi.",
      fields: {
        GUARDRAIL: "Har rollout paytida ishlaydigan avtomatik tekshiruv.",
        checkout_error_rate: "Ikki guruh bir vaqtda solishtiriladi, trafik tebranishi bir-birini yo'qqa chiqaradi.",
        limit: "Ruxsat etilgan farq. Incident paytida emas, rollout'dan oldin kelishiladi.",
        "disabled automatically": "Guardrail odam ishlatadigan o'sha kill switch'dan foydalanadi.",
      },
    },
    stale: {
      short: "Eskirgan",
      title: "Eski flag'lar to'planib qarzga aylanadi",
      body: "Bir yildan keyin 142 ta flag bor, ularning 61 tasi eskirgan. Ba'zilari haftalab 100% da, ba'zilari oylab 0% da va egasi ketib qolgan, ba'zilari kod o'chirilgandan keyin ham config'da turibdi.\n\nHar flag kodda bitta tarmoq. Ikki flag sinash uchun to'rt kombinatsiya beradi, o'ntasi mingtadan ortiq. Eskisini o'chirishga hech kim botinmaydi, chunki unga kim tayanishini hech kim bilmaydi.",
      check: {
        q: "Release flag'lari to'planib qolishini nima to'xtatadi?",
        options: [
          "Har chorakda tozalash sprinti",
          "Har flag'ning egasi va muddati bor, kod muddati o'tgan flag'ni ishlatsa CI yiqiladi",
          "30 kun o'zgarmagan har flag'ni o'chirish",
        ],
        answer: 1,
        why: "Tozalash sprintlari o'tkazib yuboriladi. Yoshiga qarab o'chirish uzoq yashovchi kill switch va ruxsat flag'larini sindiradi. Yaratishda qo'yilgan ega va muddat olib tashlashni rejaning bir qismiga aylantiradi, CI esa qarzni egasining o'z build'ida ko'rsatadi.",
      },
      fields: {
        stale: "Uzoq vaqt o'zgarmagan va butunlay yoniq yoki butunlay o'chiq.",
        "100% on": "Rollout tugagan: eski tarmoq endi o'lik kod.",
        "owner left": "Uni olib tashlash xavfsizmi, hech kim ayta olmaydi.",
        "removed in code": "Kodi yo'q, config'dagi flag: zararsiz, lekin shovqin.",
      },
    },
    expiry: {
      short: "Muddat",
      title: "Har flag'ning egasi va muddati bor",
      body: "Endi flag yaratish uchun ega va muddat majburiy. CI qadami koddagi har flag'ni topadi va muddati o'tganda ega jamoaning build'ini yiqitadi: eski tarmoqni olib tashla yoki sababini yozib muddatni uzaytir.\n\nKill switch va operatsion flag'lar doimiy deb belgilanadi va o'rniga ko'rib chiqiladi. Eskirgan flag'lar 61 dan 4 ga tushdi.",
      fields: {
        FAIL: "Ega biror narsa qilmaguncha uning build'i qizil.",
        expired: "Flag yaratilganda qo'yilgan sana.",
        owner: "Shaxs emas, jamoa: odamlar ketganda ham saqlanadi.",
        "extend with a reason": "Flag'ni uzoqroq saqlash mumkin, lekin bu ko'rinadigan qaror.",
        permanent: "Kill switch va ops flag'lari qolish uchun mo'ljallangan, egasi bilan.",
      },
    },
    recap: {
      short: "Xulosa",
      title: "Xulosa",
      body: "Feature flag'lar uchun olti qoida.\n\n1) Deploy release emas: kodni o'chiq chiqaring, kim ko'rishini flag'da hal qiling. 2) SDK snapshot'idan xotirada baholang; har so'rovga tarmoq chaqiruvi yo'q, flag servisi ishlamasa ham ishlashda davom eting. 3) O'zgarishlarni stream orqali yuboring, o'chirish soniyalar olsin. 4) User id'ning barqaror hash'i bo'yicha rollout qiling: foydalanuvchilar sakramaydi, foiz faqat odam qo'shadi. 5) Sinalgan kill switch va metrikalar bo'yicha o'zi ortga qaytaradigan guardrail'lar saqlang. 6) Har flag'ning egasi va muddati bor, CI buni majburlaydi.",
    },
  },
};

export default text;
