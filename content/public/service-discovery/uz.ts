import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Servislarni topish (service discovery)",
  summary:
    "Buyurtmalar servisi ombor nusxalarini chaqiradi, ular esa ishga tushadi, to'xtaydi va ko'chadi. Heartbeat'li registry qo'lda yozilgan IP'larni qanday almashtiradi va uni so'rashning uch yo'li: client'dan, DNS orqali yoki load balancer orqali.",
  learn: [
    "Nega qo'lda yozilgan manzillar nusxalar ko'chishi bilan buziladi",
    "Nusxalar qanday ro'yxatdan o'tadi va heartbeat o'liklarini qanday olib tashlaydi",
    "Client-side va server-side discovery",
    "DNS orqali topish va uning TTL'i nimaga tushadi",
  ],
  nodes: {
    orders: "Buyurtmalar servisi",
    "inv-a": "Ombor A",
    "inv-b": "Ombor B",
    "inv-c": "Ombor C",
    "inv-d": "Ombor D",
    registry: "Servislar registry'si",
    lb: "Load balancer",
  },
  metrics: {
    errors: "Yiqilgan ombor so'rovlari",
    drain: "O'lik nusxani chaqirishni to'xtatish vaqti",
    instances: "Tirik ombor nusxalari",
  },
  steps: {
    hardcoded: {
      short: "Qo'lda",
      title: "Config'da ikkita IP",
      body: "Har buyurtmadan oldin buyurtmalar servisi qoldiqni tekshiradi. Omborni u config'dagi ikkita manzil sifatida biladi, `192.0.2.11` va `192.0.2.12`, va navbat bilan ularga boradi.\n\nHech narsa qimirlamaguncha bu ishlaydi. Bulutda yoki konteyner platformasida bu uzoq davom etmaydi.",
      fields: {
        Host: "Xom IP va port. Chaqiruvchi aynan qaysi mashina bilan gaplashayotganini biladi.",
        qty: "Omborda 14 ta. Buyurtmani davom ettirsa bo'ladi.",
      },
    },
    moved: {
      short: "Ko'chdi",
      title: "Nusxa ko'chdi, config esa yo'q",
      body: "Host yiqilgandan keyin platforma B nusxasini almashtirdi. Yangi nusxa, C, `192.0.2.27` da ishga tushdi. Buyurtmalar esa hali ham chaqiruvlarning yarmini `.12` ga yuboradi, u yerda hech kim tinglamaydi.\n\nQoldiq tekshiruvlarining yarmi yiqiladi, C esa bo'sh turadi. Kimdir sezishi, config'ni tuzatishi va buyurtmalarni qayta deploy qilishi kerak: yarim soat.",
      watch: "Autoscaling, deploy va host yiqilishi manzillarni o'zgartiradi. Qo'lda yozilgan har manzil allaqachon eskirgan.",
      fields: {
        Host: "Eski manzil, hali ham config'da.",
        ECONNREFUSED: "Bu portda hech kim tinglamayapti: mashina yoki jarayon yo'q.",
        INVENTORY_HOSTS: "Ro'yxat config'da, shuning uchun uni o'zgartirish boshqa servisni deploy qilish demak.",
      },
    },
    registry: {
      short: "Registry",
      title: "Nusxalar o'zini o'zi ro'yxatdan o'tkazadi",
      body: "Servislar registry'si kichik, yuqori darajada ishonchli baza: kim qayerda ishlayapti. Har ombor nusxasi ishga tushganda registry'ga nomi, id'si va manzilini aytadi.\n\nEndi ro'yxat birovning config tahriri bilan emas, haqiqat bilan birga o'zgaradi. Hech kim IP'ni qo'lda yozmaydi.",
      fields: {
        Name: "Mantiqiy servis. `inventory` so'raladi, aniq mashina emas.",
        ID: "Shu bitta nusxa. Bir necha nusxaning nomi bitta.",
        Address: "Platforma bugun shu nusxaga bergan IP.",
        Port: "Nusxalarning portlari ham farq qilishi mumkin, shuning uchun ular taxmin qilinmaydi, ro'yxatga yoziladi.",
      },
    },
    "client-side": {
      short: "Client-side",
      title: "Client tomonida topish",
      body: "Buyurtmalar registry'dan sog' `inventory` nusxalarini so'raydi, ro'yxatni bir necha soniya keshda saqlaydi va har chaqiruvga nusxani o'zi navbat bilan tanlaydi.\n\nYuk oshganda platforma D nusxasini qo'shadi. D ro'yxatdan o'tadi, buyurtmalar uni keyingi yangilashda ko'radi va trafik hech qanday deploysiz uchta nusxaga taqsimlanadi.",
      watch: "Topish va balanslash mantig'i har chaqiruvchiga kerak. Besh til: to'g'ri ushlab turiladigan beshta kutubxona.",
      fields: {
        passing: "Faqat health check'dan o'tgan nusxalar. O'liklar javobda bo'lmasligi kerak.",
        Address: "Buyurtmalar shu manzillarga to'g'ridan ulanadi. O'rtada ortiqcha qadam yo'q.",
      },
    },
    crash: {
      short: "Yiqilish",
      title: "Yiqilgan nusxa ro'yxatda qoldi",
      body: "A nusxasining host'ida elektr o'chdi. A ro'yxatdan chiqishga ulgurmadi, shuning uchun registry uni hali ham sog' deb hisoblaydi.\n\nBuyurtmalar chaqiruvlarning uchdan birini A ga yuborishda davom etadi va har birini 2 soniya kutadi. Faqat nusxalar odob bilan xayrlashganda o'zgaradigan ro'yxat yetarli emas.",
      fields: {
        timeout: "Har chaqiruvga ikki soniya, yo'q mashinaga sarflangan.",
        passing: "Registry A aytgan oxirgi gapga ishonadi. Boshqacha bilishga hali imkoni yo'q.",
      },
    },
    heartbeat: {
      short: "Heartbeat",
      title: "Heartbeat va health check",
      body: "Endi har nusxa har 5 soniyada «men tirikman» deydi, TTL 15 soniya. TTL tugasa, registry nusxani **critical** deb belgilaydi va sog'lar ro'yxatidan chiqaradi.\n\nO'lik nusxa taxminan 20 soniyada trafik olmay qo'yadi, hech kim hech narsaga tegmasdan. Registry har nusxaning `/health`'ini o'zi ham chaqira oladi: bu tirik, lekin osilib qolgan jarayonni ushlaydi.",
      fields: {
        pass: "Heartbeat: «bu nusxa hali sog'» degan bitta kichik so'rov.",
        TTL: "Bitta heartbeat qancha amal qiladi. Uchta o'tkazib yuborilsa, nusxa chiqariladi.",
        critical: "Yiqilgan holat. Critical nusxalar chaqiruvchilarga hech qachon berilmaydi.",
      },
    },
    dns: {
      short: "DNS",
      title: "DNS orqali topish",
      body: "Registry DNS orqali ham javob bera oladi. Buyurtmalar `inventory.service.internal`'ni resolve qiladi va sog' nusxalarning IP'larini oladi. DNS'ni har qanday til va vosita tushunadi, kutubxona kerak emas.\n\nNarxi keshlash. Javobning TTL'i 5 soniya, lekin ba'zi resolver va runtime'lar uni uzoqroq saqlaydi, shuning uchun o'lik nusxa registry'ga to'g'ridan so'rovdagidan uzoqroq chaqirilishi mumkin.",
      watch: "Runtime'ingiz DNS'ni qanday keshlashini tekshiring. Ba'zilari sukut bo'yicha abadiy keshlaydi va DNS orqali topish jimgina qo'lda yozilgan IP'ga qaytadi.",
      fields: {
        "ANSWER SECTION": "Faqat sog' nusxalar: registry bu javobni tirik ro'yxatidan quradi.",
        "IN A": "Manzil yozuvi. Undan oldingi `5` soniyalardagi TTL: chaqiruvchi javobni qancha qayta ishlatishi mumkin.",
      },
    },
    "server-side": {
      short: "Server-side",
      title: "Server tomonida topish: load balancer so'raydi",
      body: "Endi buyurtmalar bitta barqaror nomni chaqiradi, `inventory.internal`. Uning ortidagi load balancer registry'ni kuzatadi va har so'rovni sog' nusxaga yuboradi.\n\nChaqiruvchilar har qanday tilda sodda qoladi. Narxi: yana bitta tarmoq qadami va o'zi ham yuqori ishonchli bo'lishi kerak bo'lgan yana bitta komponent.",
      fields: {
        Host: "Barqaror nom. Buyurtmalar nusxa manzillarini boshqa ko'rmaydi.",
        "X-Upstream": "Load balancer qaysi nusxani tanladi. Bitta nusxa g'alati ishlaganda log'da foydali.",
      },
    },
    recap: {
      short: "Xulosa",
      title: "Xulosa",
      body: "Nusxa manzillarini hech qachon qo'lda yozmang.\n\n1) Ishga tushganda nusxalar nomi va manzilini registry'ga yozadi. 2) TTL'li heartbeat va faol health check o'lik nusxalarni avtomatik olib tashlaydi. 3) Client-side: chaqiruvchi registry'dan o'zi so'raydi va balanslaydi, ortiqcha qadam yo'q. 4) Server-side: load balancer siz uchun so'raydi, chaqiruvchilar soddaroq, lekin bitta qadam ko'p. 5) DNS hamma joyda ishlaydi, lekin TTL va keshlashga e'tibor bering.",
    },
  },
};

export default text;
