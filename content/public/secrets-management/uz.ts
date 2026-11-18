import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Maxfiy ma'lumotlarni boshqarish",
  summary:
    "Do'kon backend'i baza parolini repoga commit qilingan .env faylda saqlaydi, uni beshta servis bo'lishadi. Parol oqib chiqadi, shoshilinch almashtirish esa checkout'ni to'xtatib qo'yadi. Secrets manager ikkalasini ham tuzatadi: servislar o'zini workload identity bilan isbotlaydi, o'z qisqa muddatli baza foydalanuvchisini oladi, secret'lar diskda shifrlangan, kalitlar ustma-ust versiyalar bilan almashadi va har o'qish auditga yoziladi.",
  learn: [
    "Nega repo yoki env fayldagi uzoq yashovchi umumiy parol buzilishdan bitta oqish narida turadi",
    "Statik token o'rniga workload identity va lease'li, har servisga alohida dinamik baza foydalanuvchisi",
    "Diskda envelope shifrlash va ikki ustma-ust versiya orqali to'xtovsiz almashtirish",
    "Har secret o'qilishining audit jurnali va manager'ning o'zi ishlamay qolganda break-glass yo'li",
  ],
  nodes: {
    dev: "Dasturchi",
    repo: "Git repo",
    orders: "Buyurtma servisi",
    reports: "Hisobot job",
    db: "Do'kon bazasi",
    intruder: "Buzg'unchi",
    secrets: "Secrets manager",
    issuer: "Identity beruvchi",
    kms: "KMS",
    partner: "Hamkor API",
    audit: "Audit jurnali",
    oncall: "Navbatchi",
    safe: "Muhrlangan seyf",
  },
  metrics: {
    copies: "Statik secret nusxasi",
    blast: "Bir oqishda servis",
    "rotation-down": "Almashtirishda to'xtash",
    audited: "Auditdagi o'qishlar",
  },
  steps: {
    envfile: {
      short: "Env fayl",
      title: "Parol repodagi faylda yashaydi",
      body: "Buyurtma servisi baza login'ini `.env` fayldan o'qiydi. Fayl commit qilingan, demak har clone, noutbuk, CI keshi va zaxira nusxada u bor. Hisobot job va yana uchta servis ham xuddi shu `app` foydalanuvchisi va xuddi shu paroldan foydalanadi.\n\nTo'qqiz joyda abadiy ishlaydigan va butun do'kon bazasini ochadigan parol turibdi. Uni hech kim almashtirmagan, chunki nima sinishini hech kim bilmaydi.",
      fields: {
        DB_USER: "Hamma servisga bitta foydalanuvchi. Baza ularni bir-biridan ajrata olmaydi.",
        DB_PASSWORD: "Ochiq matndagi uzoq yashovchi secret. Qatorni o'chirsangiz ham git tarixida qoladi.",
        "same file": "Beshta servis bo'lishadi: bitta oqish beshalasini ochadi.",
        "never rotated": "Almashtirish uchun beshta faylni tahrirlab, beshta servisni birdan qayta deploy qilish kerak.",
      },
    },
    leak: {
      short: "Oqish",
      title: "Repo zaxirasi oqib chiqdi, kimdir kirdi",
      body: "Repo bor noutbuk zaxirasi uch kun ochiq turgan. Soat 02:14 da kimdir notanish manzildan `app` foydalanuvchisi bilan bazaga ulanadi va baza uni kiritadi: parol to'g'ri. Ikki daqiqadan keyin mijozlar jadvali tashqariga ko'chiriladi.\n\nLog'da `user=app` turibdi, hamma servisdagi nom. Buzg'unchini buyurtma servisidan IP manzildan boshqa hech narsa ajratmaydi.",
      watch: "Qachondir git'ga tushgan secret oqib chiqqan deb hisoblanadi.",
      check: {
        q: "Keyingi oqish zararini nima eng ko'p kamaytiradi?",
        options: [
          "Parolni yopiq repoga ko'chirish",
          "Har servisga ishlash paytida beriladigan alohida, qisqa muddatli baza foydalanuvchisi",
          "Parolni uzunroq qilish",
        ],
        answer: 1,
        why: "Yopiq repo ham secret'ni har clone'ga ko'chiradi, uzun parol ham xuddi shunday oqadi. Bir soatda o'ladigan, servisga alohida foydalanuvchi ko'pi bilan bir soat va faqat bitta servis jadvallarini ochadi, u hech qachon faylga yozilmaydi.",
      },
      fields: {
        "connection authorized": "Parol to'g'ri edi, bazada rad etishga sabab yo'q.",
        "user=app": "Umumiy foydalanuvchi: log qaysi servis ekanini, umuman servis bo'lganini ham ayta olmaydi.",
        "203.0.113.50": "Tarmoqdan tashqaridagi manzil. Allow-list bo'lmasa, bu faqat keyin topiladigan iz.",
        COPY: "Butun jadvalni bitta buyruq bilan ommaviy eksport qilish.",
      },
    },
    rotate: {
      short: "Almashtirish",
      title: "Shoshilinch almashtirish checkout'ni to'xtatadi",
      body: "Admin parolni 02:31 da almashtiradi. Har servis xotirasida va `.env` faylida eski parol turibdi, yangi ulanishlar xato beradi, connection pool'lar bo'shaydi. Beshta servisning har biri yangi fayl bilan qayta deploy qilinmaguncha checkout `503` qaytaradi.\n\nTo'rt daqiqa to'xtash, yangi parol esa eskisi kabi yana git'ga tushdi.",
      watch: "Secret'ni almashtirish kelishilgan qayta deploy talab qilsa, u oqib chiqmaguncha almashtirilmaydi.",
      check: {
        q: "Ishlab turgan servislarni sindirmasdan secret'ni nima almashtira oladi?",
        options: [
          "Faqat tunda, trafik kam paytda almashtirish",
          "O'zgarishdan keyin darhol hamma servisni qayta ishga tushirish",
          "Eski va yangi versiyani bir muddat ikkalasini ham amalda qoldirish, mijozlar ko'chib bo'lgach eskisini bekor qilish",
        ],
        answer: 2,
        why: "Tun ham, restart ham ba'zi mijozlar o'lik secret ushlab turgan lahzani qoldiradi. Ustma-ust oyna esa faqat bitta amaldagi versiya qolib, uni hali olmagan mijoz bo'ladigan lahzani yo'q qiladi.",
      },
      fields: {
        "ALTER ROLE": "Eski parol yangi ulanishlar uchun darhol ishlamay qoladi.",
        "password authentication failed": "Hamma servis hali eski parolni yuboryapti.",
        "503": "Pool'da tirik ulanish qolmadi, so'rovlar xato beradi.",
        "in git again": "Jarayon o'sha, oqish yo'li ham o'sha.",
      },
    },
    manager: {
      short: "Manager",
      title: "Secret'lar secrets manager'ga ko'chadi",
      body: "Parol repodan chiqariladi, git tarixi tozalanadi. Endi servislar uni ishga tushganda **secrets manager**'dan oladi: u secret'larni saqlaydigan, kim so'rayotganini tekshiradigan va faqat shu so'rovchiga ruxsat etilganini qaytaradigan servis.\n\nLekin manager bilan gaplashish uchun har servisga token kerak, token esa env o'zgaruvchida turibdi. Bu yangi statik secret: **secret zero** muammosi.",
      watch: "Statik secret'ni boshqa statik secret ichiga ko'chirish oldinga qadam, lekin yechim emas.",
      fields: {
        "X-Secret-Token": "Statik token, kimdir bekor qilmaguncha amalda. U ham parol kabi oqadi.",
        version: "Manager versiyalarni saqlaydi: har o'zgarishning raqami va tarixi bor.",
        username: "Hozircha hali umumiy `app` foydalanuvchisi.",
      },
    },
    identity: {
      short: "Identity",
      title: "Servis o'zini isbotlaydi, saqlangan token yo'q",
      body: "Pod'larni ishga tushiradigan platforma har biriga imzolangan, qisqa muddatli token beradi: \"men shop namespace'idagi buyurtma servisiman\". Servis uni manager'ga ko'rsatadi, manager imzoni identity beruvchida tekshiradi va uni `orders` roliga bog'laydi.\n\nJavob: `orders-db` policy'li, 30 daqiqa amal qiladigan client token. Hech qayerda uzoq yashovchi narsa saqlanmaydi: o'g'irlangan token o'zi o'ladi.",
      fields: {
        role: "Bu workload qaysi manager rolini so'rayapti. Identity unga mos kelishi shart.",
        jwt: "Platforma imzolagan, bir necha daqiqa amal qiladi, shu workload'ga bog'langan.",
        client_token: "Manager'ning shu servis uchun sessiya tokeni. Faqat xotirada turadi.",
        policies: "Bu token nimani o'qiy oladi: faqat buyurtma bazasi login'larini.",
        ttl: "30 daqiqa. Servis muddat tugashidan oldin qayta login qiladi.",
      },
    },
    dynamic: {
      short: "Dinamik",
      title: "Har servis lease'li o'z baza foydalanuvchisini oladi",
      body: "Buyurtma servisi saqlangan parolni o'qimaydi, login so'raydi. Manager aynan hozir unga yangi baza foydalanuvchisini yaratadi va bir soatlik **lease** bilan qaytaradi. Hisobot job faqat o'qish huquqli boshqa foydalanuvchi oladi.\n\nBu login oqib chiqsa, faqat buyurtma jadvallarini va faqat lease tugaguncha ochadi. Servis ishlab turganda lease'ni uzaytiradi; to'xtasa, foydalanuvchi o'chiriladi.",
      fields: {
        lease_id: "Aynan shu login'ni uzaytirish yoki bekor qilish uchun dastak.",
        lease_duration: "Manager foydalanuvchini o'chirishigacha soniyalar: 3600 = bir soat.",
        renewable: "Ishlayotgan servis yangi foydalanuvchi olmay, lease'ni uzaytiradi.",
        username: "Har berishda noyob. Endi baza log'i qaysi servis nima qilganini aytadi.",
      },
    },
    role: {
      short: "Rol",
      title: "Manager bazada nima qiladi",
      body: "Manager bazaga bitta admin login'ga ega, u faqat foydalanuvchi yaratish va o'chirish uchun. Har so'rovda u bazaning o'zida muddatli `CREATE ROLE` bajaradi va rolga faqat kerakli jadvallarni beradi.\n\nLease tugasa yoki kimdir bekor qilsa, manager rolni o'chiradi. Manager tozalashni unutgan taqdirda ham, `VALID UNTIL` dan keyin baza login'ni rad etadi.",
      watch: "Endi eng qimmat secret manager'ning admin login'i: uni tez-tez almashtiring va faqat manager'dan kirishga ruxsat bering.",
      fields: {
        "CREATE ROLE": "Har lease'ga yangi foydalanuvchi, tasodifiy parol bilan, manager uni saqlamaydi.",
        "VALID UNTIL": "Muddatni bazaning o'zi nazorat qiladi: lease ortidagi ikkinchi qulf.",
        GRANT: "Eng kam huquq: faqat shu servis jadvallari.",
        "DROP ROLE": "Lease tugadi: foydalanuvchi endi yo'q.",
      },
    },
    kms: {
      short: "KMS",
      title: "Diskdagi secret'lar shifrlangan, root kalit KMS'da qoladi",
      body: "Manager secret'larni o'z storage'ida saqlaydi, storage'ning esa zaxirasi olinadi. Shuning uchun har secret data key bilan shifrlanadi, data key esa faqat **o'ralgan** holda saqlanadi: KMS'dan hech qachon chiqmaydigan root kalit bilan shifrlangan.\n\nIshga tushganda manager KMS'dan data key'ni bir marta ochib berishni so'raydi va uni xotirada ushlaydi. O'g'irlangan disk yoki zaxirada faqat shifrlangan matn va KMS'dan tashqarida hech kim ocholmaydigan o'ralgan kalit bor.",
      fields: {
        key_id: "KMS'dagi root kalit. Haqiqiy nazorat shu kalitga kirish huquqida.",
        wrapped_key: "Shifrlangan data key. Ma'lumot yonida saqlash xavfsiz.",
        plaintext: "Ochiq data key, faqat manager'ga qaytadi va faqat xotirada turadi.",
        key_version: "Root kalitlar ham almashadi; eski ma'lumotni ochish uchun eski versiyalar qoladi.",
      },
    },
    rotation: {
      short: "Almashtirish",
      title: "To'xtovsiz almashtirish: ikki versiya ustma-ust",
      body: "Ba'zi secret'lar dinamik bo'la olmaydi: hamkor API kalitini hamkorning o'zi beradi. Manager uni har 30 kunda almashtiradi: 7-versiya hali ishlab turganda hamkorda 8-versiyani yaratadi, servislar keyingi o'qishda yangisini oladi.\n\nManager 7-versiya oxirgi marta qachon ishlatilganini kuzatadi. Uni hech kim ishlatmay qo'ygach va ustma-ust oyna o'tgach, bekor qilinadi. To'xtash: nol.",
      fields: {
        "version 8": "Yangi kalit, eskisiga tegishdan oldin yaratiladi.",
        "still valid": "Ustma-ust oyna: ikkala kalit ham ishlaydi, hech bir mijoz o'rtada qolmaydi.",
        "last used": "Biror narsa bekor qilinishidan oldin hamma mijoz ko'chganining isboti.",
        revoked: "Eski kalit bir kundan keyin, rejaga ko'ra o'ladi, vahimada emas.",
      },
    },
    audit: {
      short: "Audit",
      title: "Har o'qish yoziladi, noto'g'ri o'qish ko'rinadi",
      body: "Manager'ga har so'rov audit yozuvini qoldiradi: qaysi workload, qaysi yo'l, natija va qayerdan. Secret qiymatlari log'ga hech qachon tushmaydi, faqat o'qilgani.\n\nBugun hisobot job buyurtmalarning o'qish-yozish login'ini so'radi. Policy rad etdi, yozuv esa aynan qaysi pod so'raganini ko'rsatadi. Rad etilgan o'qishlarga signal jim tekshiruvni ticket'ga aylantiradi.",
      watch: "Audit log'ga yozib bo'lmasa, manager so'rovni log'siz bajargandan ko'ra rad etgani yaxshi.",
      fields: {
        entity: "Workload identity, pod'gacha aniq. Orqasiga yashirinadigan umumiy foydalanuvchi qolmadi.",
        path: "Nima so'raldi. Qiymatlar hech qachon log'ga yozilmaydi.",
        result: "`denied`: policy ishladi, nega urinilganini kimdir ko'rishi kerak.",
        remote_addr: "So'rov qayerdan kelgani, tarmoq bilan solishtirish uchun.",
      },
    },
    breakglass: {
      short: "Break-glass",
      title: "Manager ishlamay qolganda: break-glass",
      body: "Soat 04:12 da secrets manager ishlamayapti, servislar login ololmaydi. Uni tuzatish uchun navbatchiga bazaga kirish kerak. Muhrlangan favqulodda login manager'ga bog'liq bo'lmagan alohida seyfda turibdi.\n\nUni ochish uchun ikki kishi, sabab va incident raqami kerak. Login 60 daqiqa ishlaydi, hamma mas'ullarga signal boradi, keyin darhol almashtiriladi. Break-glass ikkinchi kirish yo'li emas, kam ochiladigan shovqinli eshik.",
      watch: "Break-glass'ni jadval bo'yicha sinang: hech qachon ochilmagan eshik incident paytida ochilmaydi.",
      fields: {
        "BREAK-GLASS": "Alohida, log'langan yo'l. Undan foydalanishning o'zi incident.",
        "approved by": "Ikki kishi qoidasi: hech kim uni yolg'iz ochmaydi.",
        "valid 60 min": "Qolgan hamma narsa kabi qisqa muddatli.",
        "rotated after use": "Odam ko'rgan secret kuygan hisoblanadi.",
      },
    },
    recap: {
      short: "Xulosa",
      title: "Xulosa",
      body: "Secret'lar uchun olti qoida.\n\n1) Repo, image va env fayllarda secret yo'q; git'da bo'lgan narsa oqib chiqqan. 2) Servislar o'zini saqlangan token bilan emas, workload identity bilan isbotlaydi. 3) Lease'li, eng kam huquqli, har servisga alohida dinamik login afzal. 4) Diskdagi secret'larni envelope shifrlash bilan himoya qiling, root kalit KMS'da. 5) Ikki ustma-ust versiya bilan almashtiring, eskisini faqat ishlatilmay qolgach bekor qiling. 6) Har o'qishni auditga yozing, rad etishlarga signal qo'ying va sinalgan, ikki kishilik break-glass yo'lini saqlang.",
    },
  },
};

export default text;
