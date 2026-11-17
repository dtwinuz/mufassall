import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Shifrlash va sirlar",
  summary:
    "Eslatmalar ilovasi odamlarning shaxsiy yozuvlarini saqlaydi. O'g'irlangan nusxa o'qiladigan har bir joyni topamiz: tarmoq, disk, backup va config fayl, keyin ularni birma-bir yopamiz.",
  learn: [
    "TLS handshake nimani tekshiradi va nega sertifikat o'zi yangilanishi kerak",
    "Saqlanayotgan ma'lumotni shifrlash va nega kalit ma'lumot yonida tursa hech narsani himoya qilmaydi",
    "Envelope shifrlash: har yozuvga data key, master key esa KMS'dan chiqmaydi",
    "Sirlar qisqa muddatli lease bilan secrets manager'da, kalitni hamma narsani qayta shifrlamasdan almashtirish",
  ],
  nodes: {
    app: "Telefon ilovasi",
    api: "Eslatmalar API",
    db: "Baza",
    attacker: "Hujumchi",
    ca: "Sertifikat markazi",
    backup: "Backup'lar",
    kms: "KMS",
    secrets: "Secrets manager",
  },
  metrics: {
    "open-spots": "O'qiladigan nusxalar",
    p95: "Javob p95",
    errors: "Xato so'rovlar",
  },
  steps: {
    plain: {
      short: "Ochiq HTTP",
      title: "Eslatmalar ochiq matnda ketmoqda",
      body: "Ilova eslatmalarni oddiy HTTP orqali yuboradi. Kafedagi Wi-Fi'da o'sha tarmoqdagi istalgan odam har bir paketni yozib olishi mumkin.\n\nU eslatmani ham, `Authorization` token'ni ham ko'radi, demak keyin foydalanuvchi nomidan ish qila oladi. Ma'lumot to'rt joyda o'qiladi: tarmoqda, diskda, backup'da va config faylda.",
      watch: "Ochiq matnda yuborilgan token — qo'lga berib yuborilgan parol bilan teng.",
      fields: {
        Host: "So'rov qaysi serverga. TLS bo'lmasa, bu va pastdagi hamma narsa yo'lda ko'rinadi.",
        Authorization: "Foydalanuvchi sessiya token'i. Kim nusxalasa, muddati tugaguncha o'sha foydalanuvchiga aylanadi.",
        text: "Shaxsiy eslatmaning o'zi, yo'ldagi har bir router uni o'qiy oladi.",
      },
    },
    tls: {
      short: "TLS",
      title: "TLS handshake: umumiy kalit va shaxsni isbotlash",
      body: "Ma'lumotdan oldin ilova va server yangi kalitga kelishadi: har biri `key_share`'ning ochiq yarmini yuboradi va ikkalasi bir xil sirni hisoblaydi. Kuzatib turgan odam uni hisoblay olmaydi.\n\nServer sertifikatini ham yuboradi: CA imzolagan guvohnoma, bu kalit `api.example.com`'ga tegishli. Ilova nomni, imzoni va sanalarni tekshiradi. Yangi ulanishdagi birinchi so'rov bitta qo'shimcha aylanishga to'laydi, shuning uchun p95 biroz o'sadi.",
      fields: {
        SNI: "Ilova qaysi nomni xohlaydi. Bitta IP'da ko'p sayt bo'lishi mumkin, shu orqali to'g'ri sertifikat tanlanadi.",
        key_share: "Bir martalik kalitning ochiq yarmi. Ikki yarmidan ikkala tomon bir xil sirni oladi.",
        subject: "Sertifikat kim uchun. Ilova so'ragan nom bilan mos kelishi shart.",
        issuer: "Kim imzolagan. Ilova faqat o'zida bor qisqa ro'yxatdagi imzolovchilarga ishonadi.",
        "valid until": "Amal qilish muddati. Undan keyin har bir mijoz sertifikatni rad etadi.",
        Finished: "Shu yerdan trafik shifrlangan. Kuzatuvchi endi faqat shovqin ko'radi.",
      },
    },
    expired: {
      short: "Muddat o'tdi",
      title: "Sertifikat yarim tunda eskirdi",
      body: "Sertifikatni yiliga bir marta kimdir qo'lda yangilardi. Bu yil eslatma ishdan ketgan odamga borgan.\n\nYarim tunda hamma ilovalar serverni rad eta boshlaydi. Kodda hech narsa o'zgarmagan, lekin yangi sertifikat qo'yilmaguncha so'rovlarning 100% i yiqiladi.",
      watch: "Muddat — bu kimdir bekor qilishni unutgan rejalashtirilgan uzilish.",
      fields: {
        "valid until": "Sertifikatning oxirgi amal qiladigan payti, kecha.",
        "client clock": "Telefonning o'z vaqti. Tekshiruv serverda emas, mijozda bo'ladi.",
        expired: "Mijoz ulanishni yopadi. Foydalanuvchi tarmoq xatosini ko'radi.",
      },
    },
    renew: {
      short: "Avto yangilash",
      title: "Sertifikat o'zi yangilanadi",
      body: "Server endi CA'dan yangi sertifikatni o'zi so'raydi, ACME protokoli orqali. Domen unga tegishli ekanini isbotlaydi va 90 kunlik sertifikat oladi.\n\nYangilash muddatning uchdan biri qolganda boshlanadi, 14 kundan kam qolsa alert keladi. Hech kim eslab yurishi shart bo'lmasa, qisqa muddat qo'rqinchli emas.",
      fields: {
        identifiers: "Sertifikat qamrab olishi kerak bo'lgan nomlar.",
        status: "CA server domenni haqiqatan boshqarishini tekshirguncha `pending`.",
        finalize: "Tekshiruv o'tgach, server sertifikat olish uchun kalit so'rovini shu yerga yuboradi.",
      },
    },
    backup: {
      short: "Backup",
      title: "Backup tashqariga chiqdi, u esa ochiq matn",
      body: "Har kecha backup storage bucket'ga tushadi. Bitta bucket'da ruxsat noto'g'ri qo'yilgan edi va fayl nusxalab olindi.\n\nTLS harakatdagi ma'lumotni himoya qiladi, diskda yotganini emas. Backup — bu bazaning o'zi: oddiy vositalar bilan har bir eslatma o'qiladi.",
      watch: "Ma'lumotning har bir nusxasi hisobga kiradi: replica, backup, eksport, log.",
      fields: {
        strings: "Istalgan fayldan o'qiladigan matnni chiqaradigan oddiy vosita. Parol kerak emas.",
        u_42: "Eslatma egasi. Bitta fayl hamma foydalanuvchilarning eslatmalarini beradi.",
      },
    },
    "at-rest": {
      short: "Diskda",
      title: "Eslatmani saqlashdan oldin shifrlash",
      body: "API endi `INSERT`'dan oldin eslatmani AES-256-GCM bilan shifrlaydi. Bazada, uning diskida va backup'larida faqat shifrlangan matn yotadi.\n\nKalit API'ning config faylida, ishga tushganda o'qiladi. Chiqib ketgan backup endi foydasiz, narxi esa har so'rovga bir necha millisekund.",
      fields: {
        text_enc: "Shifrlangan eslatma. Kalitsiz bu tasodifiy baytlar.",
        nonce: "Har shifrlashga noyob qiymat. Bir kalit bilan qayta ishlatilsa GCM sinadi, shuning uchun qator yonida saqlanadi.",
      },
    },
    "key-leak": {
      short: "Kalit oqdi",
      title: "Kalit ma'lumot yonida turibdi",
      body: "Config fayli bor container image xato bilan ochiq registry'ga chiqib ketdi. Unda bazaning paroli ham, shifrlash kaliti ham bor.\n\nKalit bilan eski backup soniyalarda ochiladi. Kalit ikki yoshda va hamma qatorga bitta: uni almashtirish butun jadvalni qayta shifrlash degani, shuning uchun hech kim qilmagan.",
      watch: "Shifrlash muammoni kalitga ko'chiradi. Kalit qayerda yashashi hamma narsani hal qiladi.",
      fields: {
        db_password: "Baza paroli, kod bilan bitta faylda. Bu yerda yashirilgan.",
        notes_key: "Hamma eslatmalar uchun yagona kalit. Kimda bo'lsa, har qachongi backup'ni o'qiydi. Bu yerda yashirilgan.",
        notes_key_created: "Hech qachon almashtirilmagan. Ikki yillik hamma eslatma shu bilan shifrlangan.",
      },
    },
    envelope: {
      short: "Envelope",
      title: "KMS bilan envelope shifrlash",
      body: "Master key endi KMS ichida yashaydi va undan chiqmaydi. Har eslatma uchun API yangi data key so'raydi: shifrlash uchun ochiq ko'rinishini va o'sha kalitni master key bilan o'ralgan holda oladi.\n\nAPI eslatmani shifrlaydi, o'ralgan kalitni qator yoniga yozadi va ochig'ini unutadi. O'qish uchun o'ralgan kalitni KMS'ga qaytaradi, KMS ruxsatni tekshiradi va chaqiruvni log'ga yozadi. KMS'ga kirishsiz bazaning nusxasi shunchaki shovqin.",
      watch: "Har o'qishda KMS'ga chiqmang. Ochilgan data key'larni bir necha daqiqa xotirada saqlang, hech qachon diskda emas.",
      fields: {
        key_spec: "Qanday data key yaratish: 256 bitli AES.",
        plaintext: "Data key ochiq ko'rinishda. Xotirada ishlatiladi va tashlanadi. Bu yerda yashirilgan.",
        ciphertext_blob: "O'sha data key, master key bilan o'ralgan. Eslatma yonida saqlash xavfsiz.",
        key_version: "Uni master key'ning qaysi versiyasi o'ragan. Keyin almashtirish uchun kerak.",
      },
    },
    secrets: {
      short: "Sirlar",
      title: "Kodda sir yo'q: secrets manager",
      body: "Baza paroli config fayldan chiqariladi. Ishga tushganda API mashina identity'si bilan o'zini isbotlaydi va secrets manager'dan baza login'ini oladi.\n\nLogin bir soat yashaydi va API ishlab turganda yangilanib turadi. Endi image'da ham, repository'da ham birorta sir yo'q, chiqib ketgan sir esa o'zi ishlamay qoladi.",
      fields: {
        "X-Auth-Token": "Shu mashinaga berilgan qisqa muddatli token, odam terib kiritmaydi. Bu yerda yashirilgan.",
        username: "Shu API nusxasi uchun yaratilgan login. Har nusxaga alohida.",
        password: "Baza paroli, faqat shu lease davomida amal qiladi. Bu yerda yashirilgan.",
        lease_duration: "Soniyalarda bir soat. Keyin baza login'ni rad etadi.",
      },
    },
    rotate: {
      short: "Almashtirish",
      title: "Ma'lumotni qayta shifrlamasdan kalitni almashtirish",
      body: "Har yili KMS master key'ning yangi versiyasini yaratadi, eski versiyalar esa eski ma'lumotni ochish uchun qoladi. Yangi eslatmalar darhol `4`-versiyani oladi.\n\nFondagi job saqlangan data key'larni qayta o'raydi: har o'ralgan kalitni KMS'ga yuboradi va yangisini yozadi. Faqat kichik kalitlar o'zgaradi, eslatmalar o'z holicha qoladi. Baza login'lari esa har soatda o'zi almashadi.",
      fields: {
        source_key_version: "Oldin shu data key'ni o'ragan versiya.",
        key_version: "Yangi versiya. `3`-versiyani ishlatadigan qator qolmagach, uni o'chirish mumkin.",
      },
    },
    recap: {
      short: "Xulosa",
      title: "Xulosa",
      body: "Ma'lumot nusxasi yashaydigan har bir joyni toping va har birini yoping.\n\n1) Har ulanishda TLS, sertifikat o'zi yangilanadi, muddatdan oldin alert. 2) Diskda shifrlash, backup'lar ham. 3) Envelope shifrlash: har yozuvga data key, master key faqat KMS'da. 4) Sirlar secrets manager'da qisqa lease bilan, hech qachon kodda emas. 5) Almashtirish ma'lumotni emas, kalitlarni qayta o'rash orqali.",
    },
  },
};

export default text;
