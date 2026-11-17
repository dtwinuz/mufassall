import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Konsensus va lider saylovi",
  summary:
    "Tungi to'lov job'ining ikki nusxasi uni qaysi biri bajarishini kelishib olishi kerak. Bir-birini ping qilish ishlamaydi, bitta lock server yagona nosozlik nuqtasi. Besh node'li klaster qanday qilib lider saylaydi, replikatsiya qilingan log yuritadi va ko'pchilikni sanab split brain'dan qochadi.",
  learn: [
    "Nega ikki node kim lider ekanini o'zlari xavfsiz hal qila olmaydi",
    "Raft uslubidagi klaster log'ni qanday ko'chiradi va ko'pchilikda commit qiladi",
    "Lider o'lsa yoki uzilsa term va ovozlar nima qiladi",
    "Nega lock'ga fencing token kerak va uni qayerda saqlash kerak (etcd, ZooKeeper)",
  ],
  nodes: {
    w1: "To'lov worker 1",
    w2: "To'lov worker 2",
    ledger: "To'lovlar bazasi",
    n1: "Node 1",
    n2: "Node 2",
    n3: "Node 3",
    n4: "Node 4",
    n5: "Node 5",
  },
  metrics: {
    double: "Ikki marta to'langan",
    outage: "Lock yo'q vaqt",
    commit: "Lock yozish vaqti",
  },
  steps: {
    "two-leaders": {
      short: "Ikki lider",
      title: "Ikki worker, ikkalasi ham o'zini boshliq deb biladi",
      body: "Tungi to'lov job'i ishonchlilik uchun ikki serverda turadi. Ular bir-birini ping qiladi: kim ikkinchisini eshitmay qolsa, ishni o'zi oladi.\n\nBir kechasi ular orasidagi tarmoq bir necha soniyaga uzilib qoladi. Har biri ikkinchisini o'lgan deb hisoblaydi va ikkalasi ham to'lovni bajaradi. 312 ta sotuvchiga ikki marta to'lanadi.",
      watch: "Javob kelmasligi hech qachon narigi tomon o'lganmi yoki shunchaki yetib bo'lmayaptimi, aytmaydi.",
      fields: {
        run: "To'lanayotgan kecha. Ikkala worker ham o'sha kechani yozdi.",
        "INSERT 0 312": "Worker 2 dan 312 ta to'lov qatori, worker 1 ning 312 tasi ustiga.",
      },
    },
    "lock-server": {
      short: "Lock server",
      title: "Uchinchi tomondan so'ra: bitta lock server",
      body: "Endi qarorni alohida lock server qabul qiladi. Ishga tushishdan oldin worker `payouts` lock'ini so'raydi. Uni faqat bittasi oladi; ikkinchisiga kim egallab turgani aytiladi.\n\nLock'ning umri bor: egasi o'lsa, lock muddati tugaydi va ikkinchi worker uni olishi mumkin. Ikki marta to'lash to'xtaydi.",
      check: {
        q: "Lock serverning diski ishdan chiqdi. Tungi to'lovlar nima bo'ladi?",
        options: [
          "Hech bir worker ishga tushirmaydi, hech kim pul olmaydi",
          "Worker 1 davom etadi: lock allaqachon unda",
          "Ikkala worker ham bajaradi, lock serverdan oldingidek",
        ],
        answer: 0,
        why: "Lock servisisiz hech bir worker lock ololmaydi, shuning uchun ikkalasi ham job'ni o'tkazib yuboradi. Bu xavfsiz, lekin serverni tiklash uchun ketadigan 30 daqiqa davomida to'lovlar to'xtaydi.",
      },
      fields: {
        ttl_s: "Lock oxirgi yangilanishdan 15 s keyin tugaydi. Egasi ishlayotganda uni yangilab turadi.",
        granted: "Yo'q: lock boshqada.",
        holder: "U worker 1 da. Worker 2 kutadi va keyinroq yana so'raydi.",
      },
    },
    "single-dies": {
      short: "Server o'ldi",
      title: "Lock server — yangi yagona nosozlik nuqtasi",
      body: "Lock serverning diski ishdan chiqdi. Hech bir worker lock ololmaydi, shuning uchun hech biri ishlamaydi. Bu to'g'ri, lekin to'lovlar amalga oshmaydi.\n\nServerni tiklash 30 daqiqa oladi. Agar u bo'sh disk bilan qaytsa, lock kimda bo'lganini unutgan bo'ladi.",
      fields: {
        ECONNREFUSED: "Lock portini endi hech kim tinglamayapti.",
        skipped: "Xavfsiz tanlov: lock yo'q — to'lov yo'q. Xavfsiz, lekin hech kim pul olmaydi.",
      },
    },
    cluster: {
      short: "Klaster",
      title: "Besh node, bitta lider, bitta ko'chiriladigan log",
      body: "Endi lock servisi besh node'da ishlaydi. Ulardan biri lider: u har bir o'zgarishni qabul qiladi, o'z log'iga qo'shadi va yangi yozuvlarni boshqalarga yuboradi.\n\nFollower'lar yozuvlarni diskka yozadi va javob qaytaradi. Log har bir node'da bir xil, bir xil tartibda, shuning uchun har bir node bir xil holat bilan javob bera oladi.",
      fields: {
        term: "Saylov davri. Har yangi lider kattaroq term boshlaydi; eski term — eski lider degani.",
        leader: "Kim yuboryapti. Follower'lar klientlarni unga yo'naltiradi.",
        prev_index: "Yangilaridan oldingi yozuv. Follower faqat shu yozuv o'zida ham bo'lsa qabul qiladi: log'lar bir xil qoladi.",
        entries: "Yangi o'zgarish: 42-yozuv `payouts` lock'i w1 niki deydi.",
        commit: "Xavfsiz ekani ma'lum bo'lgan oxirgi yozuv. Follower'lar shu yergacha qo'llaydi.",
        success: "Node 2 42-yozuvni diskka yozdi.",
      },
    },
    majority: {
      short: "Ko'pchilik",
      title: "Yozuv ko'pchilikda bo'lsa, xavfsiz",
      body: "Worker 1 lock so'raydi. Lider \"berildi\" deb faqat 5 node'dan 3 tasi 42-yozuvni saqlagandan keyin javob beradi: o'zi va ikki follower.\n\nKelajakdagi har qanday 3 node'li ko'pchilik shu node'lardan kamida bittasini o'z ichiga oladi. Demak bu yozuvsiz keyingi lider bo'lishi mumkin emas. Ikki node o'lsa ham commit qilingan hech narsa yo'qolmaydi.",
      check: {
        q: "Switch lider node 1 ni faqat node 5 bilan uzib qo'ydi. Worker 1 node 1 dan lock so'raydi. U nima oladi?",
        options: [
          "Lock'ni: node 1 hali ham lider",
          "Xatoni: 5 dan 2 tasi ko'pchilik emas",
          "Darhol o'rnini olgan node 2 dan lock'ni",
        ],
        answer: 1,
        why: "Node 1 43-yozuvni yozadi, lekin uni faqat node 1 va node 5 saqlaydi. 5 dan 3 tasi bo'lmasa u hech qachon commit bo'lmaydi, shuning uchun worker 1 lock o'rniga `not_committed` oladi.",
      },
      fields: {
        index: "Bu lock'ning log'dagi o'rni.",
        acks: "5 dan 3 tasi saqladi: ko'pchilik, demak commit qilindi.",
        fence: "Faqat o'sadigan raqam. Saqlab qo'ying: to'lovlar bazasi uni keyin tekshiradi.",
      },
    },
    partition: {
      short: "Bo'linish",
      title: "Lider bitta follower bilan uzilib qoldi",
      body: "Switch ishdan chiqdi. Node 1 (hali lider) va node 5 bir tomonda, node 2, 3 va 4 boshqa tomonda.\n\nNode 1 worker 1 so'rovini qabul qiladi va 43-yozuvni yozadi, lekin uni 5 tadan faqat 2 node saqlaydi. U hech qachon ko'pchilikka yetmaydi, demak hech qachon commit bo'lmaydi va klient lock o'rniga xato oladi.",
      watch: "Ozchilik tomondagi lider hali ham so'rov qabul qila oladi. Faqat ularni commit qila olmaydi.",
      fields: {
        error: "`not_committed`: yozuv ikki node'ning log'ida bor, lekin bu yetarli emas.",
        acks: "Node 1 va node 5: beshtadan ikkitasi.",
        needed: "Beshtaning ko'pchiligi. Ozchilik tomon unga hech qachon yetmaydi.",
      },
    },
    election: {
      short: "Saylov",
      title: "Ko'pchilik tomon yangi lider saylaydi",
      body: "Node 2, 3 va 4 liderdan xabar olmay qoladi. Bir necha yuz ms'lik tasodifiy timeout'dan keyin birinchi bo'lib node 2 harakat qiladi: term 2 ni boshlaydi va ovoz so'raydi.\n\nHar bir node bir term'da bitta ovoz beradi va faqat log'i o'zinikidan kam bo'lmagan nomzodga. Node 2 3 ta ovoz oladi va lider bo'ladi. Lock 0,4 s davomida mavjud bo'lmadi.",
      fields: {
        term: "Term 2: yangi davr. Hali term 1 da turgan har kim endi eskirgan.",
        candidate: "Node 2 o'ziga ovoz beradi va boshqalardan so'raydi.",
        last_index: "Node 2 da 42 gacha barcha commit qilingan yozuvlar bor, demak u lider bo'lishi mumkin.",
        vote_granted: "Node 3 ning term 2 dagi yagona ovozi. Node 4 ovozi va o'zinikini qo'shib, node 2 da 5 dan 3.",
      },
    },
    heal: {
      short: "Tiklandi",
      title: "Eski lider qaytadi va o'rnini bo'shatadi",
      body: "Switch almashtirildi. Node 1 hali ham o'zini term 1 lideri deb biladi, keyin node 2 dan term 2 li xabar oladi.\n\nKattaroq term doim yutadi: node 1 follower bo'ladi, commit qilinmagan 43-yozuvini tashlab yuboradi va node 2 log'ini ko'chiradi. Hech qachon bir vaqtda commit qila oladigan ikki lider bo'lmagan: split brain'dan sanash orqali qochildi.",
      fields: {
        "stepping down": "Kattaroq term'ni ko'rgan node darhol liderlikni to'xtatadi.",
        truncating: "43-yozuv hech qachon ko'pchilikka yetmagan, shuning uchun o'chiriladi. Hech kimga u muvaffaqiyatli deyilmagan.",
        "not committed": "Shuning uchun uni o'chirish xavfsiz: klient u uchun xato olgan.",
      },
    },
    fencing: {
      short: "Fencing",
      title: "To'xtab qolgan worker eski lock bilan uyg'onadi",
      body: "Worker 1 uzoq garbage collection pauzasida 20 s qotib qoladi. Uning lock'i tugaydi va worker 2 lock'ni 51-index bilan oladi. Keyin worker 1 uyg'onadi va hali ham 42-lock unda deb o'ylaydi.\n\nTo'lovlar bazasi ko'rgan eng katta fence'ni saqlaydi va undan eskisini rad etadi. Worker 1 yozuvi hech narsani o'zgartirmaydi va u lock'ni yo'qotganini bilib oladi.",
      watch: "Klaster haq bo'lishi mumkin, klient esa baribir tugagan lock bilan ish qilishi mumkin. Resursning o'zi fence'ni tekshirishi shart.",
      fields: {
        "fence < 42": "Ishni faqat yangiroq fence'li ishga tushish egallay oladi. Jadvalda allaqachon fence 51 turibdi.",
        "UPDATE 0": "Hech narsa yozilmadi. Worker 1 ning kechikkan to'lovi to'sildi.",
      },
    },
    recap: {
      short: "Xulosa",
      title: "Xulosa",
      body: "Lider bo'yicha kelishish uchun ping emas, ko'pchilik kerak.\n\n1) 3 yoki 5 node ishlating: ular 1 yoki 2 nosozlikka chidaydi. 2) O'zgarish faqat ko'pchilik saqlaganda commit bo'ladi. 3) Term va ovozlar har term'da ko'pi bilan bitta lider beradi; ozchilik hech qachon commit qila olmaydi. 4) Lock fencing token olib yuradi, himoyalangan resurs uni tekshiradi. Buni o'zingiz yozmang: lock, lider va config'ni etcd, ZooKeeper yoki Consul'da saqlang.",
    },
  },
};

export default text;
