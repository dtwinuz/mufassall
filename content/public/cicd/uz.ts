import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "CI/CD: commit'dan production'gacha",
  summary:
    "Jamoa haftada bir marta, qo'lda deploy qiladi va har uchinchi deploy nimanidir buzadi. Commit'dan production'gacha yo'l qadamma-qadam avtomatik, kichik va orqaga qaytariladigan bo'ladi, oxirida jamoa kuniga o'nlab marta deploy qiladi.",
  learn: [
    "CI har commit'ni bir marta build va test qiladi va bitta o'zgarmas artefakt chiqaradi",
    "Rolling, blue-green va canary deploy: har birining narxi va qanchalik tez orqaga qaytishi",
    "Xato darajasi bo'yicha avtomatik rollback va deploy'ni release'dan ajratadigan feature flag'lar",
    "To'rtta yetkazish ko'rsatkichi: kunlik deploy, lead time, muvaffaqiyatsiz deploy ulushi, tiklanish vaqti",
  ],
  nodes: {
    dev: "Dasturchi",
    users: "Foydalanuvchilar",
    lb: "Load balancer",
    blue: "Blue serverlar",
    green: "Green serverlar",
    ci: "CI/CD",
    registry: "Artefakt registry",
    flags: "Feature flag'lar",
  },
  metrics: {
    deploys: "Deploy'lar",
    failed: "Muvaffaqiyatsiz deploy",
    mttr: "Tiklanish vaqti",
    errors: "Xato darajasi",
  },
  steps: {
    manual: {
      short: "Qo'lda",
      title: "Juma kungi deploy, qo'lda, oltita serverga",
      body: "Haftada bir marta dasturchi SSH orqali oltita serverning har biriga zip ko'chiradi va ilovani qayta ishga tushiradi. Yangi versiyaga hech kim serverlarga qo'shmagan sozlama kerak.\n\nIlova ishga tushishda chiqib ketadi, server ketidan server, foydalanuvchilar xato oladi. Orqaga qaytarish — eski zip bilan o'sha ishni qo'lda takrorlash. Bir yarim soat ketadi.",
      watch: "Kam va qo'lda bo'ladigan deploy katta va xavfli bo'ladi, bu esa odamlarni uni yanada kamroq qilishga majbur qiladi.",
      fields: {
        scp: "Qo'lda ko'chirilgan fayl. Keyin qaysi serverda qaysi build turganini hech kim ayta olmaydi.",
        restart: "Qayta ishga tushish paytida shu serverdagi hamma foydalanuvchi uziladi.",
        "missing env": "Yangi kodga faqat dasturchining noutbukida bor sozlama kerak.",
      },
    },
    ci: {
      short: "CI",
      title: "CI: har commit bir marta build va test qilinadi",
      body: "Har push endi pipeline'ni ishga tushiradi: build, testlar, natijani commit bilan teglangan image qilib registry'ga qo'yish.\n\nDeploy qilinadigan yagona narsa shu image: avval staging'ga, keyin o'sha baytlar production'ga. Endi noutbukda build qilinmaydi va «menda ishlayapti» degan gap yo'q.",
      fields: {
        commit: "Image qaysi koddan qurilgani. Har deploy aniq bitta commit'ga bog'lanadi.",
        build: "Toza runner'da, har safar bir xil usulda qurilgan.",
        test: "Test yiqilsa, pipeline shu yerda to'xtaydi va hech narsa chiqarilmaydi.",
        image: "Artefakt, commit bilan teglangan. Shundan keyin u hech qachon o'zgarmaydi.",
        digest: "Image mazmunining hash'i. Deploy'lar unga tayanadi, shuning uchun baytlarni hech kim almashtira olmaydi.",
      },
    },
    rolling: {
      short: "Rolling",
      title: "Rolling deploy: bir vaqtda bitta server",
      body: "CI serverlarni birma-bir almashtiradi. Har yangi server load balancer unga trafik yuborishidan va keyingi eski server to'xtatilishidan oldin health check'dan o'tishi kerak.\n\nUzilish yo'q, qo'shimcha server ham kerak emas. Lekin almashtirish davomida eski va yangi versiya foydalanuvchilarga bir vaqtda xizmat qiladi, shuning uchun ikkalasi bir xil baza va API'lar bilan ishlay olishi shart.",
      fields: {
        healthz: "Load balancer har bir necha soniyada chaqiradigan endpoint.",
        status: "`ok` — jarayon tirik degani. Checkout ishlayapti degani emas.",
        version: "Bu serverda qaysi build ishlayapti. Ikki versiya birga tirik bo'lganda foydali.",
      },
    },
    "bad-roll": {
      short: "Yomon roll",
      title: "Health check o'tadi, checkout yiqiladi",
      body: "Almashtirish tugadi: oltita serverning hammasida yangi versiya. Health check hamma joyda yashil, lekin bitta to'lov yo'li xato beradi va so'rovlarning 12% i yiqiladi.\n\nOrqaga qaytish uchun CI eski versiyani yana oltita serverdan o'tkazishi kerak. Bu 25 daqiqa, butun vaqt foydalanuvchilar xato ko'radi.",
      watch: "Faqat jarayon tirikligini tekshiradigan health check buzilgan release'ni ham o'tkazib yuboradi.",
      fields: {
        checkout: "Xatoli yo'l. Health check uni hech qachon chaqirmaydi.",
        "500": "Server shu so'rovda yiqildi. Foydalanuvchi xato sahifasini ko'radi.",
        "X-Version": "Har javob qaysi build javob berganini aytadi. Yomon release shunday topildi.",
      },
    },
    "blue-green": {
      short: "Blue-green",
      title: "Blue-green: eski versiyani issiq holda saqlash",
      body: "Endi serverlarning ikkita to'liq to'plami bor. Yangi versiya bo'sh to'plamga tushadi va o'sha yerda tekshiriladi, keyin load balancer butun trafikni bir qadamda ko'chiradi.\n\nEski to'plam ishlab turadi. Rollback — o'sha almashtirishning teskarisi, bir soniyadan kam. Narxi: ikki baravar server, almashtirish esa birdaniga, shuning uchun xato kimdir sezguncha hamma foydalanuvchiga yetadi.",
      fields: {
        live: "Hozir butun foydalanuvchi trafigini oladigan to'plam.",
        standby: "Buzilgan release turgan to'plam. Hali ishlayapti, tekshirish yoki tuzatish uchun tayyor.",
        switched_in_ms: "Almashtirish deploy emas, marshrut o'zgarishi. Yarim soniyadan kam.",
      },
    },
    canary: {
      short: "Canary",
      title: "Canary: avval foydalanuvchilarning 5% i",
      body: "Keyingi release green'ga tushadi, lekin load balancer unga so'rovlarning faqat 5% ini yuboradi. CI oxirgi uch daqiqadagi ikki to'plamning xato darajasini solishtiradi.\n\nGreen'da 4.1%, blue'da 0.3%. Yangi xato, lekin uni yigirma foydalanuvchidan faqat bittasi va bir necha daqiqa ko'radi.",
      fields: {
        weight: "Trafik ulushi foizda. Blue 95 ni saqlaydi.",
        error_rate: "Oyna davomidagi xatolar foizda. Ikki to'plam yonma-yon solishtiriladi.",
        release: "Canary'dagi build. Gumon aynan shunga.",
      },
    },
    "auto-rollback": {
      short: "Avto rollback",
      title: "Rollback'ni odam emas, qoida qiladi",
      body: "Qoida pipeline'da yozilgan: canary'ning xato darajasi uch daqiqa davomida barqaror to'plamnikidan ikki baravar ko'p bo'lsa, uning og'irligini nolga tushir va release'ni yomon deb belgila.\n\nHech kim uyg'oq turishi shart emas. Jamoa raqamlar bilan xabar oladi, yomon build esa xato bilan qayta deploy qilinmaydi.",
      fields: {
        weight: "Nol: green trafik olmaydi. Hammasi blue'ga.",
        reason: "Aniq qoida va raqamlar. Alert'ni ochgan odam sababini ko'radi.",
        marked: "Yomon deb belgilangan release keyingi har qanday deploy'dan bloklanadi.",
      },
    },
    flags: {
      short: "Flag'lar",
      title: "Feature flag'lar: deploy — bu release emas",
      body: "Yangi checkout endi flag ortida o'chirilgan holda chiqadi. Kod boshqalari bilan birga production'ga ketadi, lekin avval faqat xodimlar uchun, keyin foydalanuvchilarning 10% i uchun ishlaydi.\n\nNoto'g'ri ishlasa, flag bir soniyada o'chiriladi: deploy ham, boshqa narsaning rollback'i ham yo'q. Deploy'lar kichik va zerikarli bo'ladi, jamoa tez-tez chiqaradi.",
      watch: "100% ga yetgan flag'ni olib tashlang. Eski flag'lar — ustida tugmasi bor o'lik kod.",
      fields: {
        enabled: "Shu foydalanuvchiga eski checkout ko'rsatiladi.",
        rollout: "Yangi kodni ko'radigan foydalanuvchilar ulushi. Qadamma-qadam oshiriladi.",
        rule: "Kim birinchi oladi. Xodimlar xatoni xaridordan oldin topadi.",
      },
    },
    numbers: {
      short: "Raqamlar",
      title: "Kuzatiladigan to'rtta raqam",
      body: "Jamoa endi to'rtta raqamni kuzatadi. Ikkitasi tezlikni ko'rsatadi: qanchalik tez-tez deploy qilinadi va commit production'ga qancha vaqtda yetadi. Ikkitasi xavfsizlikni: nechta deploy foydalanuvchiga zarar qildi va xizmat qanchalik tez tiklandi.\n\nUlar birga o'zgaradi. Kichik deploy kamroq yiqiladi, avtomatik rollback esa yiqilishni qisqa qiladi.",
      fields: {
        "deploys per day": "Haftada bitta edi. Kichik o'zgarishlar tayyor bo'lishi bilan chiqadi.",
        "lead time": "Merge'dan production'da ishlaguncha. Taxminan bir hafta edi.",
        "change failure": "Rollback yoki tuzatish talab qilgan deploy'lar. Har uchinchisi edi.",
        "time to restore": "Birinchi xatodan normal xizmatgacha. Bir yarim soat edi.",
      },
    },
    recap: {
      short: "Xulosa",
      title: "Xulosa",
      body: "Har deploy'ni kichik, avtomatik va oson qaytariladigan qiling.\n\n1) CI har commit'ni bir marta build va test qiladi va bitta o'zgarmas artefakt chiqaradi. 2) Rolling qo'shimcha server so'ramaydi, lekin sekin qaytadi. 3) Blue-green bir soniyada qaytadi, narxi ikki baravar quvvat. 4) Canary yomon release'ni bir necha foizga cheklaydi, qoida esa uni o'zi qaytaradi. 5) Feature flag'lar kodni deploy'siz yoqadi va o'chiradi. 6) Kunlik deploy, lead time, muvaffaqiyatsiz deploy ulushi va tiklanish vaqtini kuzating.",
    },
  },
};

export default text;
