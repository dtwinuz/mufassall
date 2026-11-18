import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Job scheduler (vazifa rejalashtiruvchi) dizayni",
  summary:
    "\"Dayjestni 09:00 da yubor\", \"ertaga eslat\", \"har 5 daqiqada sinxronla\": ko'p tenant uchun millionlab kechiktirilgan va takrorlanuvchi vazifalar. Bitta cron serverdan `SKIP LOCKED` bilan olinadigan jobs jadvaliga, heartbeat'li lease'larga, idempotent at-least-once ishga tushirishlarga, backoff'li qayta urinishlar va dead-letter jadvaliga o'tamiz, keyin 09:00 cho'qqisini vaqt partitsiyalari va tenant'lar o'rtasidagi adolat bilan yengamiz.",
  learn: [
    "Nega bitta cron server ham vazifalarni o'tkazib yuboradi, ham failover'dan keyin ikki marta ishga tushiradi",
    "Worker'lar vaqti kelgan qatorlarni `FOR UPDATE SKIP LOCKED` bilan qanday xavfsiz oladi",
    "Lease va heartbeat: nega ular at-least-once beradi va nega buning uchun idempotency kaliti kerak",
    "Jitter'li backoff, dead-letter jadvali, vaqt partitsiyalari va tenant'lar o'rtasida adolat",
  ],
  nodes: {
    app: "Tenant ilovasi",
    cron: "Cron server A",
    cron2: "Cron server B",
    mail: "Email provayder",
    api: "Scheduler API",
    db: "Jobs jadvali",
    w1: "Worker 1",
    w2: "Worker 2",
    dlq: "O'lik job'lar",
    app2: "Katta tenant",
  },
  metrics: {
    lag: "Boshlanish kechikishi p99",
    missed: "Bajarilmagan job",
    dupes: "Ikki marta bajarilgan",
  },
  steps: {
    cron: {
      short: "Cron server",
      title: "Bitta mashina, bitta crontab",
      body: "Tenant'lar ilova orqali ish rejalashtiradi: har kuni 09:00 da dayjest, har besh daqiqada kurs sinxroni, ertaga bir martalik eslatma. Birinchi versiya har birini bitta serverning crontab'iga qator qilib yozadi, cron esa buyruqni vaqtida ishga tushiradi.\n\nOddiy va birinchi kuni ishlaydi. Lekin butun jadval bitta diskda, bitta jarayonda, bitta mashinada yashaydi.",
      check: {
        q: "08:12 da cron server tarmoqdan uziladi. 08:15 dan 08:50 gacha bajarilishi kerak bo'lgan job'lar bilan nima bo'ladi?",
        options: [
          "Server qaytgach cron ularni kechikib bajaradi",
          "Ular hech qachon bajarilmaydi va mijozlar shikoyat qilguncha hech kim sezmaydi",
          "Boshqa server ularni avtomatik oladi",
        ],
        answer: 1,
        why: "Cron daqiqasida ishga tushiradi yoki umuman tushirmaydi: nima kutilayotganini yozib qo'ymaydi. O'chiq server o'sha oynadagi hamma narsani jimgina o'tkazib yuboradi.",
      },
      fields: {
        "0 9 * * *": "0-daqiqa, 9-soat, har kuni. Server qaysi vaqt zonasida bo'lsa, o'shanda.",
        "*/5": "Har besh daqiqada. Ishga tushirish olti daqiqa olsa, ikki nusxa ustma-ust tushadi.",
        "--once": "Yillik qator qilib soxtalashtirilgan bir martalik job. Bajarilgach kimdir uni o'chirishi kerak.",
      },
    },
    failover: {
      short: "Failover",
      title: "Server o'ladi, keyin ikki marta qaytadi",
      body: "08:12 da cron-a tarmoqni yo'qotadi. 08:50 gacha bajarilishi kerak bo'lgan job'lar shunchaki bajarilmaydi: yomon kunlarda kuniga 4 200 ga yaqin. Muhandis crontab nusxasi bilan cron-b ni ko'taradi.\n\n08:55 da cron-a ning tarmog'i qaytadi. Endi ikki mashinada bir xil crontab bor va ikkalasi ham 09:00 da ishga tushadi: `t_17` tenant'ining har mijozi dayjestni ikki marta oladi. Zaxira server yagona nosozlik nuqtasini yo'qotmaydi, u ikkinchi haqiqat manbasini qo'shadi.",
      watch: "Fencing'siz failover \"hech narsa ishlamaydi\" ni \"hamma narsa ikki marta ishlaydi\" ga aylantiradi.",
      check: {
        q: "Bajarilmay qolishni ham, ikki marta bajarishni ham nima yo'qotadi?",
        options: [
          "Uchinchi cron server va ovoz berish",
          "Job'larni vaqti yozilgan qatorlar sifatida saqlash; stateless worker'lar vaqti kelgan qatorlarni shu jadvaldan oladi",
          "Cron'ni avtomatik qayta ishga tushadigan konteynerda yurgizish",
        ],
        answer: 1,
        why: "Jadval bitta joydagi ma'lumotga aylangach, istalgan worker istalgan job'ni bajara oladi, o'lgan worker shunchaki kamroq quvvat, \"bu job'ni kim bajaradi\" savoliga esa baza javob beradi.",
      },
      fields: {
        "never ran": "Cron navbat saqlamaydi. Uzilish oynasidagi ish yo'qoladi.",
        promoted: "Qo'lda failover: eski server to'silmagan (fencing yo'q).",
        "came back": "O'lgan mashina emas, tarmoq uzilishi. Crontab'i hali joyida edi.",
        "cron-b": "O'sha qator, o'sha daqiqa, har emailning ikkinchi nusxasi.",
      },
    },
    table: {
      short: "Jobs jadvali",
      title: "Jadval vaqti yozilgan qatorlarga aylanadi",
      body: "Endi API har job'ni qator qilib qo'shadi: nima bajariladi, qaysi tenant uchun va `run_at`, UTC da. Navbatdagi qatorlar ustidagi `run_at` partial indeksi \"hozir nima vaqti keldi\" savolini arzon qiladi. Takrorlanuvchi job tugaganda o'zining keyingi qatorini qo'shadi.\n\nIstalgan miqdordagi stateless worker jadvalni so'raydi. O'lgan worker endi jadvalni yo'qotmaydi: bajarilmaganlar nolga tushadi. Lekin bir vaqtda so'ragan ikki worker bir xil qatorlarni o'qiydi va ikkalasi ham bajaradi: kuniga 900 dublikat.",
      watch: "`run_at` ni UTC da saqlang, tenant vaqt zonasini yonida saqlang. \"Har kuni 09:00\" yozgi vaqtga o'tishdan ham omon chiqishi kerak.",
      fields: {
        run_at: "Job vaqti, UTC da. 04:00Z bu UTC+5 da 09:00.",
        status: "`queued`, `running`, `done`, `dead`. Worker'lar faqat `queued` ni o'qiydi.",
        attempt: "Necha marta urinilgan. Keyinroq backoff shunga tayanadi.",
        max_attempts: "Shuncha xatodan keyin job jadvaldan dead-letter jadvaliga o'tadi.",
      },
    },
    claim: {
      short: "SKIP LOCKED",
      title: "Qatorlarni `FOR UPDATE SKIP LOCKED` bilan olish",
      body: "Har worker bitta so'rovda bir to'plamni oladi. U `run_at` bo'yicha tartiblangan 50 tagacha vaqti kelgan qatorni tanlaydi va ularni `FOR UPDATE` bilan qulflaydi. `SKIP LOCKED` ikkinchi worker'ni allaqachon qulflangan qatorlarni kutish o'rniga ulardan o'tib ketishga majbur qiladi, u keyingi 50 tani oladi.\n\nO'sha so'rov qatorlarni `running` deb belgilaydi va qaysi worker egasi ekanini yozadi. Ikki worker hech qachon bitta qatorni ololmaydi va hech kim to'silmaydi: dublikatlar nolga, boshlanish kechikishi bir soniyaga yaqin tushadi.",
      watch: "`SKIP LOCKED` siz ikkinchi worker birinchisining qulflarini kutadi; oddiy `SELECT` bilan esa o'sha job'larni bajaradi.",
      check: {
        q: "Worker 2 50 ta job oladi, ularni running deb belgilaydi va OOM killer uni o'ldiradi. O'sha 50 ta job bilan nima bo'ladi?",
        options: [
          "Ulanish uzilganda baza ularni bo'shatadi",
          "Ular abadiy `running` bo'lib qoladi: ularni hech kim tugatmaydi",
          "Worker 1 keyingi so'rovida ularni oladi",
        ],
        answer: 1,
        why: "Qator qulflari tranzaksiya bilan birga ancha oldin tugagan. Qolgani `running` statusi va `w-2` nomi, olish so'rovi esa faqat `queued` qatorlarni qidiradi.",
      },
      fields: {
        run_at: "Faqat hozir vaqti kelgan qatorlar, eng eskisi birinchi.",
        LIMIT: "To'plam hajmi: kamroq borib-kelish, lekin yiqilish ko'proq job'ga tegadi.",
        "FOR UPDATE": "Tanlangan qatorlarni so'rov commit bo'lguncha qulflaydi.",
        "SKIP LOCKED": "Boshqa worker ushlab turgan qatorlar kutilmaydi, o'tkazib yuboriladi.",
        RETURNING: "Worker o'z job'larini o'sha atomik so'rovdan qaytarib oladi.",
      },
    },
    dies: {
      short: "Worker o'ldi",
      title: "O'lgan worker o'z job'larini osilib qoldiradi",
      body: "Worker 2 09:00:05 da 50 ta job olgan holda o'ldiriladi. Ularning qatorlarida `running`, egasi `w-2`, va buni hech narsa o'zgartirmaydi. 47 daqiqadan keyin ham ular joyida.\n\n`running` statusi endi mavjud bo'lmasligi mumkin bo'lgan jarayonning va'dasi. Scheduler sekin job'ni o'lgan worker'dan ajrata olmaydi.",
      fields: {
        locked_by: "Egasi. Bu yerda endi mavjud bo'lmagan worker.",
        running: "Olingan, lekin tugatilmagan. Olish so'rovi bularni o'tkazib yuboradi.",
        "w-2": "O'ldirilgan worker. Uning 50 ta job'i ham osilib qolgan.",
        "wait forever": "Timeout yo'q, demak tiklanish ham yo'q.",
      },
    },
    lease: {
      short: "Lease",
      title: "Yangilanmasa muddati tugaydigan lease",
      body: "Endi olish **lease** beradi: `lease_until` 30 soniya oldinda. Job ishlayotganda worker uni har 10 soniyada yangilaydi (heartbeat). Olish so'rovi lease muddati tugagan `running` qatorlarni ham oladi, shuning uchun o'lgan worker job'lari 30 soniya ichida qaytadi. Bajarilmaganlar nolga tushadi.\n\nHamma vaqt worker soatlaridan emas, bazaning `now()` idan olinadi: mashina soatlari soniyalab farq qiladi. Narxi: uzoq GC pauzada qotib qolgan worker lease'ini yo'qotadi, job'ni boshqa worker bajaradi, keyin birinchisi uyg'onib uni ham tugatadi. Endi yetkazish **at least once**: kuniga 40 ga yaqin dublikat.",
      watch: "Heartbeat `UPDATE 0` qaytarsa, lease yo'qolgan. Worker davom etmasligi, to'xtashi kerak.",
      check: {
        q: "Endi job ikki marta bajarilishi mumkin. Mijoz ikkita email olmasligini qanday ta'minlaymiz?",
        options: [
          "Lease'ni 10 daqiqa qilish",
          "Har ishga tushirishga kalit berish va email provayder ko'rgan kalitini e'tiborsiz qoldirsin",
          "Yuborishdan oldin job statusini tekshirish",
        ],
        answer: 1,
        why: "Uzunroq lease faqat tiklanishni kechiktiradi. Status tekshiruvi poyga: ikkala worker ham `running` ni ko'rib yuborishi mumkin. Idempotency kaliti ikkinchi yuborishni qayerdan kelmasin zararsiz qiladi.",
      },
      fields: {
        lease_until: "Egasining job'ni bajarish huquqi yangilanmasa shu yerda tugaydi.",
        "now()": "Baza vaqti. Hamma worker uchun bitta soat, mashinalar orasida farq yo'q.",
        locked_by: "Faqat hozirgi egasi yangilay oladi; eskirgan worker nol qatorga mos keladi.",
        "UPDATE 0": "Lease boshqasiga o'tgan. Ishni to'xtating va tashqi ta'sirlarni commit qilmang.",
      },
    },
    idempotent: {
      short: "Idempotency",
      title: "Har ishga tushirish idempotency kaliti bilan",
      body: "Worker har emailni job id va rejalashtirilgan vaqtdan tuzilgan kalit bilan yuboradi: `j_8812:2026-11-19T04:00Z`. Bitta hodisaning ikki ishga tushirishi bir xil kalit yuboradi; ertangi dayjestniki boshqa.\n\nProvayder kalitlarni bir kun eslab qoladi. Ikkinchi yuborish birinchi natijani `replayed: true` bilan qaytaradi, ikkinchi email ketmaydi. Dublikatlar nolga tushadi. O'z bazamizdagi ta'sirlar uchun o'sha kalit noyob ustunga yoziladi.",
      watch: "Kalitni urinish raqamidan yoki joriy vaqtdan tuzmang: har qayta urinish yangidek ko'rinadi.",
      fields: {
        "Idempotency-Key": "Job id va rejalashtirilgan vaqt: bu ishga tushirishning har urinishi uchun bir xil.",
        message_id: "Birinchi marta yuborilgan email.",
        replayed: "Bu javob oldingi so'rovning saqlangan natijasi. Hech narsa qayta yuborilmadi.",
      },
    },
    storm: {
      short: "Retry bo'roni",
      title: "Provayder yiqiladi, worker'lar uni so'rovlar bilan ko'mib tashlaydi",
      body: "09:00 da email provayder o'n daqiqa davomida `503` qaytara boshlaydi. Worker'lar har job'ni 200 ms ichida uch marta, hammasi bir vaqtda qayta urinadi, keyin uni failed deb belgilaydi. Zo'rg'a turgan provayder uch baravar trafik oladi.\n\nU tiklanganda 6 000 dayjest failed deb belgilangan va ularni hech kim yubormaydi. Provayder hatto qachon qaytishni `Retry-After` da aytgan edi, biz e'tibor bermadik.",
      check: {
        q: "Vaqtinchalik xatodan keyin worker job'ni qanday qayta urinishi kerak?",
        options: [
          "Ishlaguncha siklda darhol qayta urinish",
          "Job'ni `run_at` eksponensial surilgan holda, jitter bilan qaytarish va oxirgi urinishdan keyin dead-letter jadvaliga qo'yish",
          "Job'ni tashlab yuborish: tenant qayta rejalashtirsin",
        ],
        answer: 1,
        why: "Qayta rejalashtirish scheduler'ning o'zidan foydalanadi: job keyinroq `run_at` bilan qaytadi, worker bo'shaydi, o'sib boruvchi kechikishlar provayderga nafas beradi. Jitter minglab qayta urinishni yoyadi, dead-letter jadvali esa yuborib bo'lmaganini saqlaydi.",
      },
      fields: {
        "503": "Vaqtinchalik xato: qayta urinishga arziydi, lekin keyinroq.",
        "Retry-After": "Provayderning o'z maslahati: ikki daqiqa.",
        "at once": "Bir xil 200 ms da qayta uringan minglab worker uzilishni battar qiladi.",
        failed: "200 ms dagi uch urinish o'n daqiqalik uzilishdan uzoq yashay olmaydi.",
      },
    },
    backoff: {
      short: "Backoff + DLQ",
      title: "Eksponensial backoff, jitter va dead-letter jadvali",
      body: "Muvaffaqiyatsiz job `run_at` surilgan holda `queued` ga qaytadi: 30 s, 1 daqiqa, 2 daqiqa, 32 daqiqagacha ikki baravardan, har kechikish 20% gacha tasodifiy siljiydi. Bu scheduler o'z qayta urinishlarini o'zi rejalashtirishi; worker darhol bo'shaydi. Sakkiz urinish taxminan bir soatni qoplaydi.\n\nDoimiy xatolar, masalan mavjud bo'lmagan pochta qutisi, erta to'xtaydi. Urinishlari tugagan job oxirgi xatosi bilan **dead-letter jadvaliga** o'tadi, tenant panelidan uni qayta yuborish mumkin. O'sha o'n daqiqalik uzilishda hech narsa yo'qolmaydi.",
      watch: "Hech kim qaramaydigan dead-letter jadvali job'larni yo'qotishning sekinroq usuli. Uning o'sishiga ogohlantirish qo'ying.",
      fields: {
        "8/8": "Oxirgi ruxsat etilgan urinish.",
        "550": "Doimiy xato: qayta urinish hech qachon yordam bermaydi.",
        dead_jobs: "Dead-letter jadvali: job, payload'i va har xatosi, qayta yuborish uchun saqlanadi.",
        jitter: "Tasodifiy yoyish, bitta uzilishdagi qayta urinishlar bir soniyaga tushmasligi uchun.",
        replay: "Kimdir sababni tuzatgach job'ni `queued` ga qaytaradi.",
      },
    },
    peak: {
      short: "09:00 cho'qqisi",
      title: "Hamma aynan 09:00 ni xohlaydi",
      body: "Ko'pchilik yaxlit vaqtni tanlaydi, bitta katta tenant `t_9` esa 09:00 ga 1.5 million eslatma rejalashtirgan. Olish doim eng eski qatorlarni birinchi oladi, shuning uchun kichik tenant'lar ularning hammasi orqasida kutadi: 09:00 dagi dayjest 09:15 da boshlanadi.\n\nJadval ham qiynaladi: har kuni millionlab qo'shilgan, yangilangan va o'chirilgan qatorlar 41 million dead tuple qoldiradi, `run_at` indeksi shunchalik shishganki, har olish sekinlashadi.",
      check: {
        q: "88 ta job'i bor tenant 1.5 millionli tenant yonida vaqtida boshlashi uchun nima kerak?",
        options: [
          "Har to'plamda umumiy eng eski qatorlar o'rniga har faol tenant'dan bir nechta job olish",
          "Katta tenant'larga alohida baza berish",
          "Tenant'lardan yaxlit vaqtdan qochishni so'rash",
        ],
        answer: 0,
        why: "Adolat olish so'rovining xususiyati. Har tenant'dan kichik ulush olish katta tenant'ga quvvatning ko'p qismini beradi, lekin hech qachon hammasini emas.",
      },
      fields: {
        due: "Hozir bajarishga tayyor job'lar, tenant bo'yicha.",
        late: "Eng eski vaqti kelgan job qancha kutgan. Hamma uchun 15 daqiqa.",
        t_9: "Bitta tenant navbatning 99.9% ini ushlab turibdi.",
        "dead tuples": "Qatorlarning eski versiyalari. Vacuum ulgurmaydi, indeks shishadi.",
      },
    },
    fair: {
      short: "Adolat",
      title: "Soatlik partitsiyalar va har tenant'ga ulush",
      body: "Jobs jadvali `run_at` soati bo'yicha partitsiyalangan. Olish faqat joriy partitsiyaga tegadi, u kichik va issiq qoladi. Eski partitsiyalar uch kundan keyin butunlay o'chiriladi: `DELETE` yo'q, shishish yo'q, vacuum bilan kurash yo'q.\n\nOlish har faol tenant'dan ko'pi bilan beshta vaqti kelgan job oladi. `t_9` hali ham worker'larning ko'p qismini ishlatadi, lekin `t_17` va `t_3` har to'plamda o'z ulushini oladi. Boshlanish kechikishi 15 daqiqadan 3 soniyaga tushadi. Juda katta tizimlar bir qadam oldinga borib, keyingi daqiqalarni xotiradagi time wheel'ga yuklaydi, lekin qoida o'sha.",
      watch: "Tenant bo'yicha cheklov uchun tenant bo'yicha vaqti kelgan ish ko'rinishi kerak. Vaqti kelgan job'i bor tenant'larning kichik jadvalini saqlang, aks holda tashqi sikl hammani skanerlaydi.",
      fields: {
        LATERAL: "Har faol tenant uchun ichki so'rovni yurgizadi: har biridan beshtagacha job.",
        jobs_2026_11_19_09: "09:00 soat partitsiyasi. Kichik, yangi va olish tegadigan yagona partitsiya.",
        "LIMIT 5": "Har to'plamda tenant ulushi. Katta tenant ko'p to'plam oladi, hech qachon bittasini butunlay emas.",
        "DROP TABLE": "Butun soatni o'chirib saqlash muddatini boshqarish: bir zumda va o'lik qator qoldirmaydi.",
      },
    },
    recap: {
      short: "Xulosa",
      title: "Xulosa",
      body: "Scheduler bu vaqtlar bazasi va tirik qolishiga ishonib bo'lmaydigan worker'lar.\n\n1) Bitta cron server o'chiqligida job'larni o'tkazib yuboradi, failover'dan keyin ikki marta bajaradi. 2) Job'larni `run_at` UTC da yozilgan qatorlar sifatida saqlang; worker'lar `FOR UPDATE SKIP LOCKED` bilan oladi. 3) Olish heartbeat bilan yangilanadigan lease, baza soati bo'yicha; muddat tugashi osilib qolgan job'larni qaytaradi. 4) Bu ishga tushirishni at least once qiladi, shuning uchun har tashqi ta'sir idempotency kaliti bilan boradi. 5) Eksponensial backoff va jitter bilan qayta rejalashtirib qayta urining; qolganini dead-letter jadvaliga qo'ying va ogohlantirish qo'ying. 6) Vaqt bo'yicha partitsiyalang, eski partitsiyalarni o'chiring va 09:00 adolatli bo'lishi uchun har tenant'dan ulush oling.",
    },
  },
};

export default text;
