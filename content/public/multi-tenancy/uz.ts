import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Multi-tenancy: ko'p mijozli tizim",
  summary:
    "B2B invoys servisi 1 200 mijoz kompaniyani bitta bazada saqlaydi. Bitta unutilgan `WHERE tenant_id` invoyslarni oqizadi, bitta katta mijozning eksporti hammani sekinlashtiradi, bitta migratsiya hammani birdan sindirishi mumkin. Yechimlar: izolyatsiyani bazaning o'zi ta'minlaydi, tenant faqat token'dan olinadi, har tenant'ga kvota, katta tenant'ga marshrutlash katalogi orqali alohida silo, har tenant'ga o'z kaliti va to'lqinma-to'lqin migratsiya.",
  learn: [
    "Nega ilova kodidagi `tenant_id` filtri oqib chiqadi va row-level security hamda har tranzaksiyadagi tenant konteksti buni qanday to'xtatadi",
    "Tenant qayerdan olinishi kerak: imzolangan token'dan, mijoz o'zgartira oladigan header yoki URL'dan hech qachon",
    "Shovqinli qo'shni: har tenant'ga kvota, limit header'lari bilan 429, og'ir ish navbatda",
    "Pool, silo va bridge, tenant marshrutlash, har tenant'ga kalit va to'lqinlab migratsiya",
  ],
  nodes: {
    ta: "Kichik tenant",
    tb: "Katta tenant",
    api: "Invoys API",
    db: "Umumiy baza",
    exporter: "Eksport worker",
    catalog: "Tenant katalogi",
    db900: "Silo baza",
    kms: "Kalit servisi",
    migrator: "Migratsiya runner",
  },
  metrics: {
    leaked: "Oqqan qatorlar",
    p99: "API p99",
    blast: "Bitta o'zgarish ta'siri",
  },
  steps: {
    shared: {
      short: "Pool",
      title: "1 200 kompaniya, bitta baza",
      body: "Invoys SaaS kompaniyalarga sotiladi. Har mijoz kompaniya bitta **tenant**. Hammasi bitta bazada yashaydi: har jadvalda `tenant_id` ustuni bor va har so'rov u bo'yicha filtrlaydi.\n\nBu **pool** modeli: arzon, migratsiya uchun bitta sxema, zaxira uchun bitta joy. Izolyatsiya faqat har so'rov o'z filtrini eslab turgancha bor.",
      fields: {
        tenant_id: "Qator qaysi kompaniyaniki. Har so'rov shu bo'yicha filtrlashi shart.",
        "one table": "Hamma tenant'ning invoyslari bitta jadvalda yonma-yon turadi.",
        "3 rows": "To'g'ri: t_17 faqat o'zining uchta ochiq invoyssini ko'radi.",
      },
    },
    leak: {
      short: "Oqish",
      title: "Bitta unutilgan filtr, bitta CSV'da 37 kompaniya",
      body: "Dasturchi t_900 uchun \"muddati o'tgan invoyslar\" hisobotini qo'shadi. So'rov sana va status bo'yicha filtrlaydi, tenant'ni esa unutadi. t_900 yuklab olgan CSV'da 37 kompaniyaning 1 840 ta invoyssi bor.\n\nCode review buni o'tkazib yubordi, chunki so'rov to'g'ri ko'rinadi: unda xato narsa yo'q, bir narsa yetishmaydi. Yuzlab so'rov ichida ertami-kechmi bittasi unutadi.",
      watch: "Tenant'lar orasidagi oqish oddiy bug tiketi emas, xabar berish majburiyati bor xavfsizlik incidenti.",
      check: {
        q: "Keyingi unutilgan filtrni nima zararsiz qiladi?",
        options: [
          "Har SQL satrida `tenant_id` borligini qidiradigan lint qoidasi",
          "Har so'rov uchun o'rnatilgan tenant bo'yicha boshqa tenant qatorlarini bazaning o'zi yashiradi",
          "Har tenant'ga ilovaning alohida nusxasini berish",
        ],
        answer: 1,
        why: "Lint faqat matnni tekshiradi, join, view va ORM so'rovlarini o'tkazib yuboradi. Row-level security jadvaldagi har so'rovga, qo'lda yozilgan yoki generatsiya qilinganiga ham qo'llanadi. Har tenant'ga ilova nusxasi ham izolyatsiya beradi, lekin 1 200 ta deploy turadi.",
      },
      fields: {
        tenant_id: "Tanlangan, lekin filtrlanmagan.",
        forgot: "Yetishmayotgan shart. Hech narsa yiqilmaydi, hamma tenant qatorlari mos keladi.",
        "1840 rows": "So'rov sanaga mos butun bazadagi invoyslarni qaytaradi.",
        "37 tenants": "Ma'lumoti hozirgina tashqariga chiqib ketgan yana 36 kompaniya.",
      },
    },
    rls: {
      short: "RLS",
      title: "Row-level security: filtrni baza qo'yadi",
      body: "Jadvaldagi policy har so'rovga, uni unutgan so'rovga ham, `tenant_id = joriy tenant` shartini qo'shadi. API tranzaksiya ochadi, `app.tenant_id` ni o'rnatadi va so'rovlarini avvalgidek yurgizadi.\n\n`SET LOCAL` faqat tranzaksiya oxirigacha yashaydi. Oddiy `SET` pool'dagi ulanishda qolib ketardi va keyingi so'rov, boshqa tenant'niki, uni meros qilib olardi.",
      watch: "Ilova `BYPASSRLS` huquqisiz rol bilan ulanishi kerak, jadval egasi sifatida emas, aks holda policy o'tkazib yuboriladi.",
      fields: {
        "ROW LEVEL SECURITY": "Shu jadval uchun policy'larni yoqadi.",
        FORCE: "Policy jadval egasiga ham qo'llanadi, kichik tizimlarda ilova odatda shu rol bilan ishlaydi.",
        "CREATE POLICY": "Butun jadval uchun bitta qoida, migratsiyada bir marta yoziladi.",
        USING: "Har o'qishga qo'shiladigan shart: qator faqat joriy tenant'ga ko'rinadi.",
        "SET LOCAL": "Faqat shu tranzaksiya uchun tenant. `COMMIT` da yo'qoladi, connection pool bilan xavfsiz.",
        "312 rows": "O'sha hisobot so'rovi, endi faqat t_900 ning o'z invoyslari.",
      },
    },
    spoof: {
      short: "Soxta",
      title: "Tenant foydalanuvchi boshqaradigan header'dan kelgan",
      body: "API tenant'ni veb-ilova yuborgan `X-Tenant-Id` header'idan olgan. t_900 foydalanuvchisi brauzerning dev tools'ida uni `t_17` ga almashtiradi. RLS a'lo ishlaydi va aynan t_17 ning 214 ta invoyssini ko'rsatadi.\n\nBaza o'ziga berilgan tenant'ni qo'lladi. Xato tenant'ni kim berganida.",
      check: {
        q: "API tenant'ni qayerdan olishi kerak?",
        options: [
          "Header'dan, lekin qiymat tenant id'ga o'xshashini tekshirgandan keyin",
          "Login paytida berilgan imzolangan access token'dan, boshqa hech qayerdan emas",
          "Subdomendan, masalan `t17.app.example.com`",
        ],
        answer: 1,
        why: "Mijoz imzosiz yuborgan har narsani o'zgartirish mumkin. Login servisi tenant'ni token'ga yozib, imzolaydi, shuning uchun API unga ishona oladi. Subdomen login sahifasi uchun yaxshi ishora, lekin baribir mijoz kiritgan ma'lumot.",
      },
      fields: {
        "X-Tenant-Id": "Mijoz kiritgan qiymat. Bu yerga istalgan kishi istalgan narsani yoza oladi.",
        tenant: "Boshqa kompaniyaning id'si, hech qanday savolsiz berildi.",
        count: "t_17 ning 214 ta invoyssini t_900 foydalanuvchisi ko'rdi.",
      },
    },
    token: {
      short: "Token",
      title: "Tenant faqat imzolangan token'dan",
      body: "Login paytida identity servisi tenant'ni access token'ga yozadi va imzolaydi. API imzoni tekshiradi, `tenant` ni o'qiydi va tenant kontekstini shundan o'rnatadi. Unga zid header rad etiladi va audit log'ga yoziladi.\n\nKontekst bitta joyda, har handler'dan oldin ishlaydigan middleware'da o'rnatiladi. Handler'lar hech qachon tenant tanlamaydi.",
      watch: "Bir nechta kompaniyadagi foydalanuvchi tenant'ni parametr yuborib emas, yangi token olib almashtiradi.",
      fields: {
        sub: "Foydalanuvchi.",
        tenant: "Bu sessiya qaysi kompaniya nomidan ishlaydi. Imzolangan, o'zgartirib bo'lmaydi.",
        exp: "Amal qilish muddati. Tenant'dan chiqarilgan foydalanuvchi bir necha daqiqada kirishni yo'qotadi.",
        sig: "Imzo. `***` bilan ko'rsatilgan: to'liq token'ni hech qachon log'ga yozmang.",
        "403": "Token'ga zid header yo hujum, yo bug. Ikkalasida ham: rad et va yozib qo'y.",
      },
    },
    noisy: {
      short: "Shovqin",
      title: "Bitta tenant eksporti hammani sekinlashtiradi",
      body: "Eng katta mijoz t_900 yetti yillik invoyslar eksportini boshlaydi, sekin tuyulgani uchun yana bir marta boshlaydi. Umumiy baza vaqtining 71% ini bitta tenant'ga sarflaydi. Qolgan hammaning p99 i 120 ms dan 2.4 s ga chiqadi.\n\nBu **noisy neighbour**, shovqinli qo'shni: pool'da tenant'lar CPU, disk va ulanishlarni bo'lishadi, birontasining hammasini olib qo'yishiga hech narsa to'sqinlik qilmaydi.",
      check: {
        q: "t_900 ni butunlay to'smasdan boshqa tenant'larni nima himoya qiladi?",
        options: [
          "Ikki barobar katta baza sotib olish",
          "Har tenant'ga kvota: so'rovlar limiti, bir vaqtda ko'pi bilan 2 eksport, eksportni navbatdan worker bajaradi",
          "Bir yildan katta eksportni taqiqlash",
        ],
        answer: 1,
        why: "Katta baza limitni suradi, keyingi eksport uni yana to'ldiradi. Kvota bitta tenant bir vaqtda qancha olishini cheklaydi, navbat esa portlashni bir tekis fon yukiga aylantiradi. t_900 eksportini baribir oladi, faqat birdaniga emas.",
      },
      fields: {
        t_900: "1 200 tenant'dan bittasi.",
        "71%": "Uning baza vaqtidagi ulushi: qolgan hammanikidan ko'p.",
        p99: "Eng sekin 1% so'rovlar, hamma tenant uchun. Kichik mijozlar birinchi sezadi.",
      },
    },
    quota: {
      short: "Kvota",
      title: "Har tenant'ga kvota va eksport navbati",
      body: "API so'rovlar va ishlayotgan eksportlarni har tenant bo'yicha sanaydi. Interaktiv chaqiruvlar daqiqasiga cheklanadi; eksportlar navbatga tushadi, eksport worker har tenant uchun ko'pi bilan ikkitasini statement timeout bilan bajaradi. Uchinchi eksport qachon qayta urinishni aytadigan header'lar bilan `429` oladi.\n\nBaza 55% ga, p99 180 ms ga qaytadi. Limitlar tenant tarifidan olinadi, katta mijoz katta kvota uchun to'laydi.",
      watch: "Kvota foydalanuvchiga emas, tenant'ga: 500 foydalanuvchili tenant 500 barobar ulush olmasligi kerak.",
      fields: {
        "RateLimit-Limit": "Bu tenant bir vaqtda 2 ta eksport yurgiza oladi.",
        "RateLimit-Remaining": "Hozir bo'sh joy qolmadi.",
        "Retry-After": "Joy bo'shashiga taxminan necha soniya. Yaxshi mijoz urib turmasdan kutadi.",
        running_exports: "Tenant'ning navbatdagi eksportlari, UI ularni ko'rsata olsin.",
      },
    },
    silo: {
      short: "Silo",
      title: "Eng katta tenant o'z bazasini oladi",
      body: "t_900 butun ma'lumotning 30% i va alohida muhit uchun to'laydi. U o'z bazasiga ko'chadi: bu **silo** modeli. Qolganlar pool'da qoladi. Kod o'sha, API o'sha, faqat ma'lumot boshqa joyda; bu aralashma **bridge** deyiladi.\n\nEndi API har tenant qayerda yashashini bilishi kerak. Kichik **tenant katalogi** tenant'ni cell va baza hostiga bog'laydi; API uni 30 soniya keshlaydi va har so'rovni yo'naltiradi.",
      watch: "Tenant'ni ko'chirish ham migratsiya: nusxalash, yetib olish, yozuvni soniyalarga muzlatish, marshrutni almashtirish.",
      fields: {
        tenant_routes: "Marshrut jadvali: har tenant'ga bitta qator.",
        cell: "Bitta bazani bo'lishadigan va birga yiqiladigan tenant'lar guruhi.",
        db_host: "Bu tenant so'rovlari qayerga boradi.",
        state: "`active`, yoki tenant boshqa cell'ga nusxalanayotganda `moving`.",
        "pool-1": "Kichik tenant'lar umumiy cell'larda qoladi.",
      },
    },
    keys: {
      short: "Kalitlar",
      title: "Har tenant'ga bitta shifrlash kaliti",
      body: "Har tenant o'z data key'ini oladi, u kalit servisidagi master key bilan o'ralgan. API kalit servisidan t_900 kalitini ochib berishni so'raydi va maxfiy ustunlarni shu kalit bilan shifrlaydi. Boshqa tenant cell'ining oqib ketgan zaxirasi t_900 ma'lumoti uchun foydasiz.\n\nTenant ketganda uning kaliti yo'q qilinadi: uning hamma qatorlari va zaxiralari birdan o'qib bo'lmaydigan bo'ladi. Katta mijoz hatto o'z master key'ini olib kelishi mumkin.",
      fields: {
        key_id: "Har tenant'ga, versiya bilan: kalitlar eski ma'lumotni birdan qayta yozmasdan almashadi.",
        wrapped_key: "Master key bilan shifrlangan data key. Ma'lumot yonida saqlash xavfsiz.",
        tenant: "So'rovga bog'langan: t_900 kalitini boshqa tenant uchun ochib bo'lmaydi.",
        plaintext_key: "Faqat API xotirasida yashaydi. Hech qachon diskka yoki log'ga yozilmaydi.",
      },
    },
    migrate: {
      short: "To'lqin",
      title: "Migratsiya birdan emas, to'lqinlab",
      body: "O'tgan chorakda bitta `ALTER TABLE` umumiy jadvalni hamma tenant uchun 40 daqiqaga qulflab qo'ydi. Endi migratsiya runner har sxema o'zgarishini cell'ma-cell qo'llaydi: avval ichki va test tenant'lardan iborat canary, keyin pool'lar, keyin silo'lar. Yiqilgan to'lqin rollout'ni to'xtatadi.\n\nKatalog har tenant'ning sxema versiyasini saqlaydi, ilova kodi esa oxirgi to'lqin tugaguncha eski va yangi sxema bilan ishlaydi. Bitta yomon o'zgarish endi hammaga emas, tenant'larning 1% iga tegadi.",
      watch: "Har migratsiyaga `lock_timeout` qo'ying: qulflangan jadvaldan to'xtagan to'lqin yaxshi.",
      fields: {
        canary: "12 ta ichki va test tenant birinchi o'tadi.",
        wave: "Birga migratsiya qilinadigan cell'lar guruhi. Keyingisi oldingisi sog'lom bo'lsagina boshlanadi.",
        lock_timeout: "Silo'da uzoq so'rov bor edi; migratsiya yozuvni to'sib qo'yish o'rniga taslim bo'ldi.",
        schema_version: "Har tenant uchun. Ilova va runner har tenant qayerda turganini biladi.",
      },
    },
    recap: {
      short: "Xulosa",
      title: "Xulosa",
      body: "Bitta tizimda ko'p mijoz uchun olti qoida.\n\n1) Har so'rov `tenant_id` ni eslashiga ishonmang: uni bazada row-level security va har tranzaksiyada `SET LOCAL` bilan majburlang. 2) Tenant faqat imzolangan token'dan keladi; boshqa har manba ishonish uchun emas, tekshirish uchun kiritma. 3) Har tenant'ga kvota va navbat bitta mijozning hammasini olib qo'yishiga yo'l qo'ymaydi. 4) Odatda pool, kerak bo'lgan yoki to'laganlarga silo, har tenant'ni yo'naltiradigan katalog. 5) Har tenant'ga bitta kalit: oqish kichik qoladi, ketish kalitni o'chirish bilan tugaydi. 6) Canary va har tenant'ga versiya bilan to'lqinlab migratsiya qiling.",
    },
  },
};

export default text;
