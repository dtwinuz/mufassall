import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Hujjatning hayot sikli",
  summary:
    "Ikki kompaniya orasidagi elektron hisob-faktura qoralamadan tasdiqlangan, rad etilgan yoki bekor qilingan holatgacha boradi, yuridik ahamiyatli har qadamni esa tashqi reestr ham tasdiqlashi kerak. Ikki odam bir vaqtda bossa va reestr kech, ikki marta yoki umuman javob bermasa, shu holat mashinasini qanday to'g'ri saqlash.",
  learn: [
    "Hujjat holatlari va tarqoq if'lar o'rniga o'tishlar jadvali",
    "Optimistik parallellik: `version` ustuni, 0 qator va 409",
    "Reestr callback orqali tasdiqlaguncha kutish holatlari",
    "Idempotent callback'lar, holat sinxroni ishi, tarix va outbox",
  ],
  nodes: {
    seller: "Sotuvchi ilovasi",
    buyer: "Xaridor ilovasi",
    api: "Hujjat API",
    db: "Hujjatlar bazasi",
    registry: "Reestr",
    worker: "Holat sinxroni",
    events: "Hodisalar",
  },
  metrics: {
    lost: "Yo'qolgan yangilanish",
    mismatch: "Reestrdan farqli",
    stuck: "Kutishda qotgan",
    dups: "Takroriy ta'sir",
  },
  steps: {
    lifecycle: {
      short: "Holatlar",
      title: "Hisob-faktura bu holat mashinasi",
      body: "Sotuvchi `inv_5120` hisob-fakturani `draft` (qoralama) sifatida yaratadi, imzolaydi (`signed`) va yuboradi (`sent`). U xaridorning kiruvchi qutisiga tushganda `delivered` bo'ladi, xaridor esa uni tasdiqlashi (`accept`) yoki rad etishi (`reject`) mumkin. Xaridor javob bermaguncha sotuvchi uni bekor qila oladi (`cancel`).\n\nHar o'zgarish `version`'ni bittaga oshiradi. Server mijozga hozir qaysi amallar mumkinligini aytadi: tugmalar holatga ergashadi, aksincha emas.",
      fields: {
        state: "Hozirgi holat. Uni faqat server o'zgartiradi.",
        version: "Hujjat necha marta o'zgargani. Qoralama 1, imzolangan 2, yuborilgan 3, yetkazilgan 4.",
        actions: "Shu foydalanuvchi shu holatda nima qila oladi. UI faqat shu tugmalarni ko'rsatadi.",
      },
    },
    race: {
      short: "Poyga",
      title: "Ikki foydalanuvchi bir vaqtda harakat qiladi",
      body: "Xaridor **tasdiqlash**ni bosadi, 5 ms dan keyin sotuvchi **bekor qilish**ni bosadi. Ikkala so'rov `delivered`'ni o'qiydi, ikkalasi o'z amalini ruxsat etilgan deb hisoblaydi, ikkalasi yozadi.\n\nOxirgi yozuv yutadi: hujjat `cancelled` bo'lib qoladi, xaridorga esa tasdiqlandi deyilgan va u tovarni allaqachon kirim qilgan. Hech kim xato ko'rmaydi.",
      watch: "O'qish, qaror, yozish uch qadam. Ular orasida boshqa so'rov qatorni o'zgartirishi mumkin.",
      check: {
        q: "Ikkinchi yozuv birinchisini jimgina ustidan yozib yubormasligi uchun nima qilinadi?",
        options: [
          "Qator hali ham o'qilgan versiyada bo'lsagina yangilash",
          "Yozishdan oldin holatni yana bir marta o'qish",
          "Vaqt bo'yicha birinchi kelgan so'rovni yutgan deb hisoblash",
        ],
        answer: 0,
        why: "Keyingi qadam update'ning `WHERE`'iga `version = 4` qo'yadi. Birinchi yozuvchi qatorni 5-versiyaga o'tkazadi, shuning uchun ikkinchi update ustidan yozish o'rniga 0 qatorga tushadi.",
      },
      fields: {
        read: "Ikkala so'rov ham o'sha eski holatni ko'rdi.",
        accepted: "Xaridorning yozuvi. Qaror qilinganda u to'g'ri edi.",
        cancelled: "Sotuvchining yozuvi xaridornikini jimgina almashtirdi.",
      },
    },
    version: {
      short: "Versiya",
      title: "Faqat o'qilgan versiyani yangilang",
      body: "Endi update qaysi versiyaga asoslanganini aytadi. Orada kimdir qatorni o'zgartirgan bo'lsa, shart mos kelmaydi va baza **0 qator** o'zgartiradi.\n\nBu optimistik parallellik: foydalanuvchi o'ylab turganda hech qanday lock ushlanmaydi, ziddiyat yozish paytida ushlanadi. API 0 qatorni hech qachon muvaffaqiyat deb emas, ziddiyat deb qabul qiladi.",
      fields: {
        version: "Har o'zgarishda bittaga oshadi. Eski qiymati shart bo'lib xizmat qiladi.",
        WHERE: "Qator so'rov o'qigan holatda aynan qolgan bo'lishi kerak.",
        "UPDATE 0": "Hech narsa o'zgarmadi: boshqa kimdir birinchi bo'ldi.",
      },
    },
    conflict: {
      short: "409",
      title: "Yutqazgan 409 oladi, jim ustidan yozish emas",
      body: "Mijoz foydalanuvchiga ko'rsatgan versiyani `If-Match`'da yuboradi. API joriy holat va versiya bilan **409 Conflict** qaytaradi.\n\nSotuvchi ekrani yangilanadi va aytadi: xaridor bu hisob-fakturani allaqachon tasdiqlagan. Endi sotuvchi oldida haqiqiy holat bilan qaytadan qaror qiladi.",
      fields: {
        "If-Match": "Foydalanuvchi ko'rgan versiya. API uni `WHERE`'ga qo'yadi.",
        "409": "Ziddiyat: siz ochgandan keyin hujjat o'zgargan.",
        error: "Barqaror kod: mijoz kerakli xabarni ko'rsata oladi.",
        state: "Hujjat hozir qanday. Mijoz taxmin qilmasdan shuni ko'rsatadi.",
      },
    },
    transitions: {
      short: "Jadval",
      title: "Ruxsat etilgan o'tishlar bitta jadvaldan",
      body: "Xaridorning ikkinchi xodimida eski tab ochiq qolgan va u allaqachon tasdiqlangan hisob-fakturada yangi versiya bilan **rad etish**ni bosadi. Versiya tekshiruvi o'tadi, lekin o'tish noto'g'ri.\n\nHar amal bitta jadvaldan o'tadi: `(holat, amal) -> keyingi holat`. `delivered + accept` unda bor, `accepted + reject` yo'q, shuning uchun API hech narsa yozmasdan 422 qaytaradi. Tasdiqlangan hisob-faktura yakuniy: xato orqaga qaytarish bilan emas, tuzatuvchi hujjat bilan to'g'rilanadi.",
      watch: "Controller'larga tarqalgan if'lar vaqt o'tib bir-biridan farq qilib qoladi. Bitta jadvalni o'qish, test qilish va chizish oson.",
      fields: {
        "422": "So'rov to'g'ri tuzilgan, lekin bu holatdan bunday o'tish mumkin emas.",
        action: "Foydalanuvchi nima qilmoqchi bo'ldi.",
        allowed: "Jadval `accepted`'dan nimaga ruxsat beradi: hech narsaga.",
      },
    },
    "too-early": {
      short: "Erta",
      title: "So'nggi so'z reestrda, u esa keyinroq javob beradi",
      body: "Tasdiqlangan hisob-faktura faqat reestr uni ro'yxatga olgandan keyin kuchga kiradi. API xaridorning imzolangan tasdig'ini yuboradi va **202 Accepted** oladi: qabul qilindi, hali ishlanmoqda.\n\nAPI esa darhol `accepted` deb yozib qo'ydi. Bir soatdan keyin reestr bu tasdiqlarning bir qismini rad etdi, masalan imzolovchining sertifikati bekor qilingani uchun. Endi 37 hujjat bizda `accepted`, reestrda esa rad etilgan.",
      check: {
        q: "Reestrga yuborish va uning tasdig'i orasida lokal holat qanday bo'lishi kerak?",
        options: [
          "`accepted`, reestr rad etsa orqaga qaytariladi",
          "`delivered`, go'yo hali hech narsa bo'lmagandek",
          "Alohida `accept_pending` holati",
        ],
        answer: 2,
        why: "Keyingi qadam `accept_pending`'ni qo'shadi: xaridor harakat qildi, lekin yakuniy narsa ko'rsatilmaydi va yuborilmaydi. Uni faqat reestr callback'i `accepted`'ga yoki sababi bilan `delivered`'ga qaytaradi.",
      },
      fields: {
        action: "Reestrdan nimani ro'yxatga olish so'ralmoqda.",
        signature: "Xaridorning tasdiq ustidagi CMS imzosi. Sir emas, bu yerda qisqartirilgan.",
        "202": "Qabul qilindi, lekin hal qilinmadi. Hech qachon muvaffaqiyat deb hisoblamang.",
        status: "`processing`: javob keyinroq callback orqali keladi.",
      },
    },
    pending: {
      short: "Kutish",
      title: "Reestr tasdiqlaguncha kutish holatida turing",
      body: "Jadvalga yangi qatorlar qo'shiladi: `delivered + accept -> accept_pending`, keyin `accept_pending + registered -> accepted` va `accept_pending + rejected -> delivered`. Yuborish va bekor qilish ham xuddi shunday.\n\nReestr natija bilan callback yuboradi. API imzo sarlavhasini tekshiradi, hujjatni o'tkazadi va faqat shundan keyin xaridorga tasdiqlandi deydi. Lokal holat va reestr yana mos.",
      fields: {
        "X-Signature": "Callback reestrdan kelganini isbotlaydi. Bu yerda yashirilgan.",
        event_id: "Reestrning shu hodisa uchun noyob ID'si. Har takror urinish uni takrorlaydi.",
        status: "`registered`: tasdiq endi yuridik kuchga kirdi.",
        registered_at: "Reestrdan kelgan vaqt, hujjat tarixida ko'rsatiladi.",
      },
    },
    "lost-dup": {
      short: "Yo'qolish",
      title: "Callback ikki marta keladi yoki umuman kelmaydi",
      body: "API birinchi callback'ni 12 soniya ishladi, reestr 10 soniyada kutishni to'xtatdi va uni qayta yubordi. Xaridor ikkita bildirishnoma oldi, boshqa holatlarda tovar ikki marta kirim qilindi.\n\nBoshqa callback'lar yo'lda yo'qoldi. 140 hujjat kunlab kutish holatida turibdi va ularni hech narsa hech qachon siljitmaydi.",
      fields: {
        timeout: "Reestr javobimizni kutmadi va urinishni muvaffaqiyatsiz deb hisobladi.",
        "attempt 2": "Yana o'sha `event_id`.",
        notified: "Yon ta'sir ikki marta bajarildi.",
        lost: "Callback yo'q, takror yo'q: hujjat abadiy kutadi.",
      },
    },
    idempotent: {
      short: "Idempotent",
      title: "Har event ID'ni bir marta ishlang",
      body: "Handler avval `event_id`'ni noyob kalitli jadvalga yozadi. Qator allaqachon bo'lsa, 200 qaytaradi va hech narsa qilmaydi. Yangi bo'lsa, o'tishni **o'sha tranzaksiyada** bajaradi.\n\nO'tishlar jadvali ham yordam beradi: ikkinchi `registered` hujjatni allaqachon `accepted` holatda topadi, bunday o'tish esa jadvalda yo'q.",
      check: {
        q: "`inv_5133` uchun callback hech qachon kelmaydi. Uni `accept_pending`'dan nima chiqaradi?",
        options: [
          "Reestr 200 olguncha qayta urinishda davom etadi",
          "Davriy ish juda uzoq kutayotgan hujjatlar haqida reestrdan so'raydi",
          "Xaridor tasdiqlashni yana bir marta bosadi",
        ],
        answer: 1,
        why: "Reestr o'z xabari yo'qolganini bilmaydi. Keyingi qadam eski kutayotgan hujjatlar holatini reestrdan so'raydigan va javobni o'sha handler orqali qo'llaydigan ish qo'shadi.",
      },
      fields: {
        event_id: "Takrorni aniqlash kaliti, reestrdan keladi.",
        "ON CONFLICT": "Shu ID'ni ikkinchi marta yozish hech narsani o'zgartirmaydi.",
        "0 rows": "Allaqachon ishlangan: reestr urinishni to'xtatishi uchun 200 qaytaring.",
        "this transaction": "Hodisa qatori va holat o'zgarishi birga saqlanadi yoki umuman saqlanmaydi.",
      },
    },
    sync: {
      short: "Sinxron",
      title: "Sinxron ishi qotib qolgan hujjatlarni so'raydi",
      body: "Har 5 daqiqada ish 15 daqiqadan ortiq kutish holatida turgan hujjatlarni tanlaydi va ularning holatini reestrdan so'raydi.\n\nJavob callback bilan bir xil handler'dan o'z `event_id`'si bilan o'tadi. Callback baribir keyinroq kelsa, u takror bo'ladi va hech narsa qilmaydi. 140 qotgan hujjat hal bo'ldi.",
      fields: {
        status: "Shu hujjat bo'yicha reestrdagi haqiqat.",
        event_id: "Callback olib keladigan o'sha ID: ikkala yo'l birga takrordan tozalanadi.",
        registered_at: "Ish ishga tushgan vaqt emas, reestrdagi vaqt.",
      },
    },
    history: {
      short: "Tarix",
      title: "Har o'tish tarix va outbox qatorini yozadi",
      body: "Bitta tranzaksiyada API hujjatni yangilaydi, tarix qatorini (qayerdan, qayerga, kim, nega, qachon) va outbox qatorini qo'shadi. Relay outbox'ni o'qiydi va hodisalarni e'lon qiladi.\n\nUI, bildirishnomalar va buxgalteriya shu hodisalarga ergashadi. Orqaga qaytarilgan o'zgarish uchun bildirishnoma hech qachon ketmaydi, support esa hujjatni kim va nega siljitganini ko'radi.",
      fields: {
        document_history: "Faqat qo'shiladi: qayerdan, qayerga, kim, sabab va vaqt.",
        accept_pending: "Oldingi holat. Tarix har qadamni, kutish holatlarini ham saqlaydi.",
        outbox: "E'lon qilinadigan hodisa, o'zgarish bilan birga saqlanadi.",
        COMMIT: "Uchala qator ham saqlanadi yoki birortasi ham saqlanmaydi.",
      },
    },
    recap: {
      short: "Xulosa",
      title: "Xulosa",
      body: "Reestr bilan sinxronlanadigan hujjatlar uchun besh qoida.\n\n1) Holatlar va o'tishlar bitta o'tishlar jadvalida. 2) Har update `version`'ni tekshiradi; 0 qator 409 degani. 3) Reestr tasdiqlaguncha hujjat kutish holatida, hech qachon yakuniy emas. 4) Callback'lar `event_id` bo'yicha takrordan tozalanadi, yo'qolganlarini sinxron ishi topadi. 5) Har o'tish o'sha tranzaksiyada tarix va outbox qatorini yozadi.",
    },
  },
};

export default text;
