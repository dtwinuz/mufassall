import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Loyiha: deploy-kit",
  summary:
    "deploy-kit (github.com/wonmortech/deploy-kit) statik saytni ochiq ulanishlarni uzmasdan o'z serveringizga deploy qiladi: uchta bash skript, reliz papkalari, bitta atomik symlink rename, tekshirilgan Caddy config, yumshoq reload, health check va rollback buyrug'i. U 2026-yil 12-noyabrdagi haqiqiy hodisadan o'sib chiqqan: boshqa saytning deploy'i bitg o'rnatuvchisini yuklab olishni 791 KB da uzib qo'ygan. Bu dars bitta deploy'ni boshidan oxirigacha qadamma-qadam kuzatadi, keyin hodisani, test to'plami topgan xatoni va hammasini buzib yuborishi mumkin bo'lgan yagona Caddy sozlamasini qayta ko'rsatadi.",
  learn: [
    "Tashrif buyuruvchiga deploy'dan nima kerak: undan oldin boshlangan yuklash davom etadi, har so'rov bitta butun relizni ko'radi",
    "Sakkiz qadam: stage, validate, unpack, swap, config, reload, prune, health check va har biri nega bor",
    "Qaysi amal atomik (ln -sfn emas, rename), qaysi obyekt inode'ni ushlab turadi (ochiq fayl, bitta faylli bind mount)",
    "To'plam serversiz qanday sinaladi va qaysi saytlar shu yo'l bilan deploy qilinadi",
  ],
  nodes: {
    dev: "Maintainer yoki CI",
    script: "deploy.sh",
    remote: "remote.sh",
    browser: "Tashrif buyuruvchi",
    edge: "Reverse proxy",
    caddy: "Caddy",
    rel: "www/releases",
    check: "Tekshiruv konteyneri",
  },
  metrics: {
    dl: "Tugagan o'rnatuvchi yuklashi",
    restarts: "Har deploy'da web konteyner qayta ishga tushishi",
    grace: "Qayta yaratishda ochiq yuklashlarga beriladigan vaqt",
    kept: "Rollback uchun saqlanadigan relizlar",
    tests: "Test to'plamidagi tekshiruvlar",
    sites: "Shu yo'l bilan deploy qilinadigan saytlar",
  },
  steps: {
    setup: {
      short: "Bu nima",
      title: "Hech kim sezmaydigan deploy",
      body: "Statik saytni deploy qilish oson ko'rinadi: fayllarni nusxalash, web serverni qayta ishga tushirish. Lekin o'rnatuvchi beradigan saytda sekin ulanishda 6 MB fayl yuklayotgan odamlar bor, qayta ishga tushirish ularning har birini uzadi. deploy-kit boshqa yo'l uchun shablon: yangi reliz o'z papkasiga tushadi, symlink unga ko'rsatadigan qilib rename qilinadi, Caddy esa hech narsani yopmasdan config'ni joyida reload qiladi.\n\nKim uchun: o'z Linux serveridan Docker va Caddy bilan statik sayt beradigan har kim, qo'lda yoki CI'dan. Bu uchta skript, Caddyfile va compose fayli, MIT litsenziyasi, 0.1.0 versiya, har host va yo'l example.com kabi o'rinbosar.",
      watch: "Raqamlar repo'dan va hodisa haqidagi wonmor.io maqolasidan: baytlarda tugagan yuklash, qayta yaratishdagi 15 s chegara, saqlanadigan 3 reliz, 33 tekshiruv va shu naqshni ishlatadigan saytlar.",
      fields: {
        "dist/": "Qurish natijangiz; to'plamga u qanday qurilgani farqi yo'q.",
        SITE_URL: "Oxiridagi health check uchun ochiq URL.",
        "origin/main": "Faqat push qilingan commit deploy qilinadi, jonli sayt doim biror commit'ga mos.",
        "deploy.sh": "Stage, yuklash, remote.sh ni chaqirish, health check.",
        "remote.sh": "Validate, unpack, swap, reload, prune.",
        "rollback.sh": "current'ni oldingi relizga qaratish va reload.",
      },
    },
    visitor: {
      short: "Tashrif buyuruvchi",
      title: "Tashrif buyuruvchiga kerak narsa: yuklash davom etsin",
      body: "Tashrif buyuruvchi tomonidan deploy ko'rinmasligi kerak. Bir daqiqa oldin boshlangan yuklash har bayti bilan tugashi, deploy'dan keyin ochilgan sahifa esa butunlay yangi relizdan kelishi kerak. O'rtasida hech narsa: papka bir lahza yo'qolgani uchun 404 ham, server qayta ishga tushgani uchun uzilgan ulanish ham yo'q.\n\nMisol to'plam ortidagi haqiqiy holat: umumiy reverse proxy orqali Caddy'ga beriladigan 6 303 744 baytlik MSI o'rnatuvchi.",
      fields: {
        GET: "Bitta uzun so'rov; soniyasiga bir necha yuz KB da u ko'p soniya ochiq turadi.",
        "Content-Length": "6 303 744 bayt, testlarda ishlatilgan o'rnatuvchi; uzilgan yuklash qisqaroq va checksum'dan o'tmaydi.",
        "200 OK": "O'rtada deploy bo'lsa ham to'liq 200 bo'lib qolishi kerak.",
      },
    },
    layout: {
      short: "Tuzilma",
      title: "Relizlar papkalarda, current symlink",
      body: "Hammasi serverdagi tuzilmadan kelib chiqadi. Har deploy www/releases ostida o'z papkasini oladi, u keyin hech qachon o'zgarmaydi. www/current ulardan biriga symlink, Caddy'ning root'i /www/current. www/history saqlanadigan relizlar ro'yxati, eng eskisi birinchi, oxirgisi jonli. REVISION jonli commit'ni yozadi.\n\nKonteyner conf/ va www/ ni faqat o'qish uchun mount qiladi. Yangi fayllarni ko'rishi uchun uni qayta yaratish hech qachon kerak emas: symlink ko'chganda ular paydo bo'ladi.",
      fields: {
        "conf/": "Config papka sifatida mount qilingan; 4-qadam nega bu muhimligini ko'rsatadi.",
        "www/releases": "Har deploy'ga bitta papka; jonli reliz hech qachon o'zgartirilmaydi.",
        "www/current": "Deploy'da o'zgaradigan yagona narsa shu havola qayerga ko'rsatishi.",
        "www/history": "Saqlanadigan relizlar nomlari; rollback uni o'qiydi.",
        "caddy:2-alpine": "Bitta kichik konteyner, restart unless-stopped, stop_grace_period 15 s.",
        REVISION: "Serverga qaragan odam uchun jonli commit hash'i.",
      },
    },
    stage: {
      short: "1. Stage",
      title: "deploy.sh push qilingan commit'dan boshqasini rad etadi",
      body: "deploy.sh sizning kompyuteringizda yoki CI'da boshlanadi. Ishchi daraxtda commit qilinmagan o'zgarish bo'lsa to'xtaydi, origin'ni fetch qiladi va HEAD origin/main bo'lmasa to'xtaydi. Keyin dist/ ni staging papkaga nusxalaydi, sayt ichidagi version.txt ga to'liq commit hash'ini yozadi, Caddyfile, compose fayli va ikkita server skriptini qo'shadi, hammasini bitta tar arxiv qilib SSH orqali oqim bilan yuboradi va u yerda commit bilan remote.sh ni chaqiradi.\n\nversion.txt kichik, lekin muhim: bu shu deploy'ga xos qiymat, health check uni ochiq URL'da qidiradi.",
      fields: {
        "--porcelain": "Commit qilinmagan har o'zgarish deploy'ni to'xtatadi.",
        "origin/main": "Lokal, push qilinmagan yoki feature branch commit'i prod'ga yetolmaydi.",
        "version.txt": "Health check uchun sayt ichidagi commit hash'i.",
        "tar -czf": "Bitta arxiv, oqim bilan: serverda chala yuklangan narsa qolmaydi.",
        "./remote.sh": "Server qismi yagona argument sifatida commit bilan ishlaydi.",
      },
    },
    validate: {
      short: "2. Validate",
      title: "Buzuq config jonli saytga hech qachon tegmaydi",
      body: "remote.sh birinchi bo'lib yangi Caddyfile'ni bir martalik konteynerda tekshiradi: tarmoq yo'q, yangi fayllar faqat o'qish uchun mount qilingan, loglar uchun tmpfs. caddy validate yiqilsa, `set -e` skriptni to'xtatadi va jonli hech narsa o'zgarmagan: eski reliz eski config bilan berilayotgan bo'ladi.\n\nEski oqimda buzuq Caddyfile saytni yiqitardi. Validatsiyani boshqa har qadamdan oldinga qo'yish o'sha uzilishni muvaffaqiyatsiz deploy'ga aylantiradi.",
      fields: {
        "--network none": "Tekshiruv hech narsaga yetolmaydi, shuning uchun yon ta'siri bo'lmaydi.",
        "new:/c:ro": "Nomzod fayllar tekshiruv ichida faqat o'qish uchun.",
        "caddy validate": "Config'ni bermasdan tahlil qiladi va sozlaydi.",
        untouched: "Bu yerdagi yiqilish hech narsaga tushmaydi: current, conf va konteyner avvalgidek.",
      },
    },
    unpack: {
      short: "3. Unpack",
      title: "Hech bir so'rov ko'rmagan papka",
      body: "Sayt www/releases/<commit'ning birinchi 12 hex belgisi>-<UTC vaqt> ga ko'chiriladi. Bu papkani hech bir so'rov ko'rmagan, shuning uchun uni to'ldirish hech kimga xalaqit bermaydi. Vaqt belgisi muhim: o'sha commit'ni qayta deploy qilish berilayotgan papkani ustidan yozmaydi, yangi papka yaratadi.\n\nSkript bu papka allaqachon mavjud bo'lsa davom etishni ham rad etadi. Bu tekshiruv xatodan keyin qo'shilgan, u ikkinchi ssenariyda ko'rsatilgan.",
      fields: {
        "${SHA:0:12}": "Commit'ning birinchi 12 hex belgisi.",
        "date -u": "Soniyagacha UTC vaqt, nomlar tartiblanadi va amalda takrorlanmaydi.",
        "already exists": "Hech narsa o'zgarishidan oldin to'xtash; bir soniyadan keyin yana deploy qilish.",
        "mv new/site": "Bitta fayl tizimi ichida rename: bir zumda, nusxalashsiz.",
      },
    },
    swap: {
      short: "4. Swap",
      title: "Rename'ning o'zi deploy",
      body: "`ln -sfn` almashtirgichga o'xshaydi, lekin u ikkita tizim chaqiruvi: eski havolani o'chirish, yangisini yaratish. Ular orasida kelgan so'rov www/current'ni topmaydi va 404 oladi. To'plam ikkinchi havola, www/current.next ni yaratadi va uni `mv -T` bilan www/current ustiga rename qiladi. Rename bitta rename(2) chaqiruvi, Linux'da atomik: har so'rov eski relizni yoki yangisini ko'radi.\n\nOchiq fayllarga ta'sir qilmaydi. Swap'dan oldin boshlangan yuklash eski faylda file descriptor ushlab turadi va undan oqim berishda davom etadi, yangi so'rovlar esa havolani yangi relizga ochadi. Eski relizlar bir muddat saqlanishining sababi ham shu.",
      check: {
        q: "Nega shunchaki `ln -sfn releases/$REL www/current` qilmaslik kerak?",
        options: [
          "ln mv dan sekinroq",
          "ln -sfn eski havolani o'chiradi, keyin yangisini yaratadi, shuning uchun so'rov havola umuman yo'q paytda kelishi mumkin; tayyor havolani ustiga rename qilish bitta atomik qadam",
          "ln nisbiy yo'lga ko'rsata olmaydi",
        ],
        answer: 1,
        why: "Atomiklik bitta tizim chaqiruvining xossasi. rename(2) papka yozuvini bir qadamda almashtiradi, shuning uchun www/current yo'q lahza bo'lmaydi. Ikki chaqiruv har doim qisqa bo'lsa ham bo'shliq qoldiradi.",
      },
      fields: {
        "www/current.next": "Jonli havola yonida yaratilgan yangi havola.",
        "mv -T": "Nishonni ichiga ko'chiriladigan papka emas, almashtiriladigan fayl deb biladi; GNU coreutils.",
        "rename(2)": "Butun deploy tayanadigan yagona atomik amal.",
        "ln -sfn alone": "O'chirish, keyin yaratish: so'rovlar yiqilishi mumkin bo'lgan bo'shliq.",
      },
    },
    config: {
      short: "5. Config",
      title: "Faylni emas, config papkasini mount qilish",
      body: "Yangi Caddyfile conf/Caddyfile.next deb yoziladi va conf/Caddyfile ustiga rename qilinadi, symlink bilan bir xil usul. Lekin bu faqat konteyner conf/ papkasini mount qilgani uchun ishlaydi. Bitta faylning bind mount'i mount paytidagi inode'ni qotirib qo'yadi; rename'dan keyin konteyner eski faylni o'qishda davom etadi va reload eski config'ni qo'llaydi.\n\nEski oqim aynan shunday edi: bitta bind mount, shuning uchun konteynerga yangi fayllarni ko'rsatishning yagona yo'li uni qayta yaratish edi. Tuzatish faqat buyruqni emas, tuzilmani o'zgartirishi kerak edi.",
      check: {
        q: "Compose fayli `./conf/Caddyfile:/etc/caddy/Caddyfile` ni mount qiladi. Siz yangi faylni conf/Caddyfile ustiga rename qilib, caddy reload qildingiz. Caddy nimani yuklaydi?",
        options: [
          "Yangi faylni, chunki yo'l bir xil",
          "Eski faylni: bitta faylli bind mount hamon rename o'zgartirmagan asl inode'ga ko'rsatadi",
          "Hech narsani, reload yiqiladi",
        ],
        answer: 1,
        why: "Fayl bind mount'i nomni emas, inode'ni ulaydi. O'sha nomga boshqa faylni rename qilish host'da nomga yangi inode beradi, konteyner esa eskisini ushlab turadi. Papkani mount qilish konteynerni nomni har safar qaytadan topishga majbur qiladi.",
      },
      fields: {
        "Caddyfile.next": "Jonli config yonida yoziladi, keyin ustiga rename qilinadi.",
        "a directory": "conf/ mount qilingan, shuning uchun ichida rename qilingan fayl ko'rinadi.",
        "pins its inode": "Eski tuzilma nega har deploy'da konteynerni qayta yaratishga majbur qilgani.",
      },
    },
    reload: {
      short: "6. Reload",
      title: "Restart emas, reload",
      body: "`docker compose up -d` har deploy'da ishlaydi, lekin docker-compose.yml'ning o'zi o'zgarmagan bo'lsa hech narsa qilmaydi. Keyin `caddy reload` config'ni konteyner ichidagi Caddy admin endpoint'i orqali qo'llaydi. Jarayon ishlashda davom etadi, konteynerning start vaqti o'zgarmaydi, ochiq ulanishlar davom etadi.\n\nBitta Caddy opsiyasi ataylab yo'q: grace_period. U uzilishsiz ish uchun yaratilgandek ko'rinadi, lekin Caddy uni reload'da ham qo'llaydi. Uchinchi ssenariy bu nega muhimligini ko'rsatadi.",
      fields: {
        "a no-op": "Konteyner faqat compose ta'rifi o'zgarganda qayta yaratiladi.",
        "caddy reload": "Yangi config joyida; jarayon qayta ishga tushmaydi.",
        "file descriptors": "Ochiq yuklashlar eski reliz fayllarini o'qishda davom etadi.",
        grace_period: "Ataylab qo'yilmagan.",
      },
    },
    prune: {
      short: "7. Prune",
      title: "Uchta relizni saqlash, qolganini o'chirish",
      body: "Yangi reliz nomi www/history ga qo'shiladi, fayl oxirgi KEEP_RELEASES yozuvgacha qisqartiriladi (standart 3) va www/releases dagi ro'yxatda yo'q har papka o'chiriladi. REVISION commit'ni oladi, skript yangi va oldingi relizni chiqaradi.\n\nEski relizlar ikki sababga ko'ra saqlanadi: sekin yuklash hali ulardan birini o'qiyotgan bo'lishi mumkin, rollback'ga esa qaytadigan joy kerak.",
      fields: {
        "www/history": "Qo'shish, keyin oxirini qoldirish: jonli reliz har doim oxirgi qator.",
        KEEP_RELEASES: "Standart 3; boshqa saytlardagi variant 5 tasini saqlaydi.",
        "rm -rf": "Faqat history'da endi yo'q papkalar.",
        REVISION: "Qolgan hammasi muvaffaqiyatli bo'lgandan keyin oxirida yoziladi.",
      },
    },
    health: {
      short: "8. Health",
      title: "Ochiq URL yangi commit'ni berayotganini isbotlash",
      body: "Kompyuteringizga qaytib, deploy.sh SITE_URL/version.txt yangi commit hash'ini o'z ichiga olguncha so'raydi: 3 soniya oraliq bilan 20 tagacha urinish. Bu reliz oldidagi hamma narsa orqali berilayotganini isbotlaydi: reverse proxy, keshlar, DNS.\n\nU hech qachon paydo bo'lmasa, skript noldan farqli kod bilan chiqadi va aniq rollback buyrug'ini chiqaradi. U o'zi orqaga qaytmaydi; bu e'lon qilingan cheklov.",
      check: {
        q: "Nega bosh sahifa 200 qaytarishini emas, commit hash'i yozilgan version.txt ni tekshirish kerak?",
        options: [
          "version.txt kichikroq va tezroq",
          "Eski reliz ham 200 qaytaradi; faqat shu deploy'ga xos qiymat ochiq URL endi yangisini berayotganini isbotlaydi",
          "Reload paytida Caddy bosh sahifani bermaydi",
        ],
        answer: 1,
        why: "Health check muvaffaqiyatni o'zgarishsizlikdan ajrata olishi kerak. Swap jimgina yiqilsa yoki kesh eski saytni ushlab qolsa, bosh sahifa baribir 200 bo'lardi. Commit hash'i faqat yangi relizdan kela oladi.",
      },
      fields: {
        "version.txt": "Cache-Control no-cache bilan beriladi, kesh tekshiruvni aldamaydi.",
        "20 tries": "Jami bir daqiqacha, 3 s oraliq bilan.",
        "deploy ready": "Yagona muvaffaqiyat xabari.",
        "Roll back with": "Skript o'zi harakat qilmaydi, aniq buyruqni chiqaradi.",
      },
    },
    rollback: {
      short: "Rollback",
      title: "Rollback o'sha rename'ni ishlatadi",
      body: "rollback.sh serverda ishlaydi. --list bilan saqlangan relizlarni ko'rsatadi va jonlisini belgilaydi. Argumentsiz www/history dagi oldingi relizga qaytadi; nom bilan o'sha relizga o'tadi. U o'sha ikki harakatni bajaradi, yangi havolani www/current ustiga rename va caddy reload, shuning uchun rollback ham hech bir ulanishni uzmaydi.",
      fields: {
        "--list": "Saqlangan relizlar, jonlisi * bilan.",
        "previous release": "History'ning jonli bo'lmagan oxirgi qatori.",
        "<release-name>": "Papka nomi bo'yicha istalgan saqlangan reliz.",
        "zero-downtime too": "Deploy bilan bir xil rename va reload.",
      },
    },
    tests: {
      short: "Testlar",
      title: "Serversiz sinaladi",
      body: "tests/run.sh docker, ssh, curl va date ning soxta versiyalarini PATH boshiga qo'yadi va uchala skriptni vaqtinchalik papkada boshidan oxirigacha yurgizadi: 33 tekshiruv, server ham, Docker ham kerak emas. CI uni har pull request'da ShellCheck bilan birga, ustiga DCO imzo tekshiruvi bilan yurgizadi. OpenSSF Scorecard har hafta ishlaydi, Dependabot action'larni yangi ushlaydi.\n\nNamuna GitHub Actions workflow'i faqat qo'lda ishga tushiriladi. U repo sirlaridan SSH kalit va qotirilgan known_hosts o'rnatadi, shuning uchun CI hech qachon birinchi marta ko'rgan host kalitiga ishonmaydi.",
      fields: {
        "33 checks": "remote.sh, rollback.sh va deploy.sh, boshidan oxirigacha.",
        stubbed: "Soxta buyruqlar argumentlarini yozib oladi; reliz nomlarini sinash uchun date qotirilgan.",
        ShellCheck: "Har skriptda style darajasidagi statik tahlil.",
        DCO: "Har commit'da Signed-off-by qatori bo'lishi shart.",
        "manual dispatch": "Deploy push'ning yon ta'siri emas, qaror bo'lib qoladi.",
        known_hosts: "Sirdan qotirilgan: birinchi foydalanishda ishonch yo'q.",
      },
    },
    adopters: {
      short: "Kim ishlatadi",
      title: "Olti sayt va bitta edge shu yo'l bilan deploy qilinadi",
      body: "Naqsh bitg.uz da boshlangan: maintainer toza checkout'dan push qiladi, server tomonini deploy/remote.sh bajaradi. wonmor.io sayti hamda muhr, sanad va shaffof saytlari CI variantini ishlatadi: GitHub Actions bitta receive skriptiga bog'langan kalit bilan SSH orqali ulanadi, u releases/<sha> ga ochadi, 5 reliz va PREVIOUS ko'rsatkichini saqlaydi, reload yiqilsa qaytaradi. mufassall.dtwin.uz o'sha receive variantini ishlatadi va ustiga avtomatik rollback'li tashqi smoke test qo'shadi. dtwin.uz ning umumiy edge proksisi ham xuddi shunday qilindi.\n\ndeploy-kit bularning barchasining umumiy versiyasi, o'rinbosarlar va testlar bilan, har kim nusxalashi uchun.",
      fields: {
        "the original": "bitg.uz, 2026-yil 13-noyabrdan; maqola shu oqimni tasvirlaydi.",
        "forced-command": "authorized_keys CI kalitini bitta dasturga bog'laydi; u shell ocholmaydi.",
        "automatic rollback": "Ochiq tekshiruvlar yiqilsa, CI current'ni orqaga qaytaradi.",
        "switch back": "Faqat reload'ning o'zi yiqilganda.",
        placeholders: "example.com, deploy@your-server, /srv/sites/example.",
      },
    },
    recap: {
      short: "Xulosa",
      title: "Xulosa",
      body: "1) Deploy ko'rinmas bo'lishi kerak: ochiq yuklashlar tugaydi, har so'rov bitta butun relizni ko'radi. 2) Faqat push qilingan commit'ni stage qilish, version.txt da uning hash'i bilan. 3) Jonli narsa o'zgarishidan oldin yangi config'ni bir martalik, tarmoqsiz konteynerda tekshirish. 4) Yangi, vaqt belgili papkaga ochish va u mavjud bo'lsa rad etish. 5) Rename'ning o'zi deploy: tayyor havola mv -T bilan current ustiga, hech qachon yolg'iz ln -sfn emas. 6) Faylni emas, config papkasini mount qilish va config'ni ham shunday rename qilish. 7) Restart emas, reload; Caddy grace_period'ini qo'ymaslik, qayta yaratishni stop_grace_period bilan chegaralash. 8) Bir nechta relizni saqlash, ochiq URL'da yangi hash'ni tekshirish va o'sha rename bilan orqaga qaytish.",
    },
  },
  scenarios: {
    "cut-download": {
      label: "Uzilgan yuklash",
      steps: {
        cut: {
          short: "791 KB",
          title: "Boshqa saytning deploy'i yuklashni uzdi",
          body: "2026-yil 12-noyabr kechqurun o'sha edge'dagi boshqa saytning deploy'i `docker compose up -d --force-recreate` ni yurgizdi. Docker umumiy web konteynerga SIGTERM, standart o'n soniyadan keyin esa SIGKILL yubordi. Bundan uzoqroq vaqt kerak bo'lgan bitg o'rnatuvchisi yuklashi 791 KB da to'xtadi, foydalanuvchi chala fayl oldi.",
          check: {
            q: "Flag bekorga turmagan edi. Eski oqim nega har deploy'da konteynerni qayta yaratardi?",
            options: [
              "Chunki Caddy config'ni reload qila olmaydi",
              "Chunki sayt butunlay almashtiriladigan bitta papkaning bitta bind mount'i edi, konteyner yangi fayllarni ko'rishining yagona yo'li qayta yaratish edi",
              "Chunki Docker har fayl o'zgarishidan keyin buni talab qiladi",
            ],
            answer: 1,
            why: "Bitta bind mount va almashtirilgan papka bilan ishlayotgan konteyner eskisini ushlab qolardi. Shuning uchun tuzatish faqat flag'ni olib tashlash emas, tuzilmani (relizlar, symlink, mount qilingan conf papkasi) o'zgartirishi kerak edi.",
          },
          fields: {
            "different site": "Sabab hatto bitg deploy'i emas edi: konteyner umumiy edi.",
            "--force-recreate": "Biror narsa o'zgarganmi yo'qmi, konteynerni qayta yaratadi.",
            SIGKILL: "Stop timeout'dan keyin ochiq ulanishlar jarayon bilan birga o'ladi.",
            "791 KB": "Taxminan 6 MB dan: ishga tushmaydigan o'rnatuvchi.",
          },
        },
        second: {
          short: "861 KB",
          title: "Ikkinchi uzilish va boshqa sabab",
          body: "Bir necha daqiqadan keyin yana bir yuklash 861 KB da to'xtadi. Uni o'sha deploy'ga ag'darish oson bo'lardi. Lekin o'sha so'rov uchun edge logi klient tomonga write timeout'ni ko'rsatdi, jamoaning o'z tarmog'idan 22 ta test yuklash esa hammasi tugadi. Ikkinchi yiqilish klientning ulanishi edi. Noto'g'ri yiqilishga qarshi sinalgan tuzatish hech narsani isbotlamaydi.",
          fields: {
            "write timeout": "Proksi klientga yubora olmadi: ularning tomonidagi tarmoq muammosi.",
            "22 test downloads": "Yaxshi tarmoqdan takrorlangan, hammasi to'liq.",
            "not the deploy": "Tuzatishni o'lchashdan oldin ikki sababni ajratish.",
          },
        },
        survives: {
          short: "To'liq fayl",
          title: "Yuklash deploy'dan omon chiqadi",
          body: "Yangi oqim avval alohida konteynerda prod papkasining nusxasiga qarshi yurgizildi. Soniyasiga 300 KB bilan cheklangan yuklash boshlandi va o'rtada javob sarlavhasini ham o'zgartirgan reliz deploy qilindi. Yuklash 200 status, 6 303 744 bayt va mos SHA-256 bilan tugadi; yangi so'rov yangi sarlavhani oldi; konteyner start vaqti o'zgarmadi. Prod'da 76 soniyalik yuklash edge deploy'i orqali to'xtamay o'tdi. Butun o'zgarish taxminan 66 qator shell edi.",
          fields: {
            "300 KB/s": "Yuklash butun deploy'ni qamrab olishi uchun yetarlicha sekin.",
            "6,303,744 bytes": "Har bayt, checksum prod fayliga teng.",
            "76-second": "Bitta prod o'lchovi: mexanizmni ko'rsatadi, foiz emas.",
            "66 lines": "Qiymat skript hajmida emas, qaysi amal atomik ekanini bilishda.",
          },
        },
      },
    },
    "same-second": {
      label: "Bir soniya",
      steps: {
        nested: {
          short: "Ichma-ich sayt",
          title: "O'sha commit'ni bir soniyada ikki marta deploy qilish",
          body: "Birinchi versiyada reliz nomi commit prefiksi va soniyagacha vaqt edi, papka yangiligini hech narsa tekshirmasdi. O'sha commit'ni bir soniya ichida ikki marta deploy qiling, ikkala deploy bir xil nomni hisoblaydi. Ikkinchi `mv new/site www/releases/$REL` mavjud papkani topadi, mv esa papka nishon bo'lganda har doim qiladigan ishni qiladi: yangi saytni uning ichiga, Caddy berayotgan relizga ko'chiradi.",
          check: {
            q: "Reliz papkasi allaqachon mavjud bo'lsa xavfsiz xatti-harakat qaysi?",
            options: [
              "Uni o'chirib, qayta ochish",
              "Hech narsa o'zgarishidan oldin to'xtash; jonli sayt avvalgidek qoladi, deploy'ni bir soniyadan keyin shunchaki takrorlash mumkin",
              "Ustidan yozib ichiga ochish",
            ],
            answer: 1,
            why: "Mavjud papka jonli reliz bo'lishi mumkin. Uni o'chirish yoki ustidan yozish joriy so'rovlarni buzadi. To'xtash bepul: hali hech narsa ko'chmagan, bir soniyadan keyin vaqt belgisi boshqa.",
          },
          fields: {
            "same name": "Commit prefiksi ham, vaqt belgisi ham teng.",
            INSIDE: "Mavjud papkaga mv manbani almashtirmaydi, ichiga joylaydi.",
            "www/releases/<rel>/site/": "Berilayotgan daraxt ichida begona nusxa.",
          },
        },
        guarded: {
          short: "33 tekshiruv",
          title: "Test to'plami uni topdi",
          body: "#2 pull request soxta docker, ssh, curl va date bilan tests/run.sh ni qo'shdi, skriptlarni istalgan kompyuterda boshidan oxirigacha yurgizish mumkin bo'ldi. Qotirilgan date bir soniya holatini qayta chiqarishni osonlashtirdi. remote.sh endi papka mavjud bo'lsa hech narsa o'zgarishidan oldin to'xtaydi. Uning testi tuzatishdan oldin yiqilgan, keyin o'tadi: passed 33, failed 0.",
          fields: {
            "[ ! -e": "Tekshiruv birinchi mv dan oldin ishlaydi.",
            "failed before the fix": "Test faqat tuzatishni emas, xatoni ham isbotlaydi.",
            "passed: 33": "Butun to'plam, lokal va CI'da.",
          },
        },
      },
    },
    "grace-trap": {
      label: "Grace period tuzog'i",
      steps: {
        tempting: {
          short: "grace_period",
          title: "Aynan to'g'ri ko'rinadigan sozlama",
          body: "Caddy'da grace_period opsiyasi bor: server o'chayotganda ochiq ulanishlarni qancha kutishi. Uzilishsiz sozlama uchun u qo'yilishi kerak bo'lgan aniq narsadek ko'rinadi. Lekin Caddy uni config reload'larida ham qo'llaydi. Har qanday qiymat butunlay oddiy deploy paytida o'sha lahzada sekin yuklashlarni majburan yopardi. Shu orada haqiqiy qayta yaratish hamon Docker'ning standart o'n soniyasini ishlatardi.",
          check: {
            q: "Ochiq ulanishlarni kutish chegarasi o'rniga qayerda turishi kerak?",
            options: [
              "Caddy grace_period'ida, bir soat kabi katta qiymat bilan",
              "Docker'ning stop_grace_period'ida, u faqat konteyner haqiqatan to'xtatilganda yoki qayta yaratilganda qo'llanadi; Caddy grace_period'ini qo'ymaslik, reload'lar ulanishlar tugashini kutsin",
              "Hech qayerda; konteynerni hech qachon to'xtatmaslik",
            ],
            answer: 1,
            why: "Reload'lar har deploy'da bo'ladi va hech narsani uzmasligi kerak, shuning uchun Caddy'ga chegara berilmaydi. Qayta yaratish kam bo'ladi (faqat compose fayli o'zgarganda) va qandaydir chegara kerak, uni reload'larga tegmasdan Docker'ning stop_grace_period'i beradi.",
          },
          fields: {
            grace_period: "O'chish uchun Caddy global opsiyasi, reload'da ham ishlatiladi.",
            "config reloads": "Har deploy reload qiladi, demak har deploy uzardi.",
            "force-closes": "Qiymatdan uzun yuklashlar erta tugaydi.",
            "10 s": "SIGKILL dan oldingi Docker standart stop timeout'i.",
          },
        },
        bounded: {
          short: "15 s",
          title: "grace_period yo'q, stop_grace_period 15 s",
          body: "Caddyfile'da grace_period yo'q, shuning uchun reload eski ulanishlar o'zi tugashini kutadi. Compose fayli stop_grace_period'ni 15 soniyaga qo'yadi, bu faqat compose ta'rifi o'zgarib, konteyner haqiqatan qayta yaratilganda ahamiyatli. Shunda ham ochiq yuklashlar 10 emas, 15 soniya oladi. Bu baribir chegara va README uni cheklov sifatida yozadi.",
          fields: {
            "no grace_period": "Reload'lar hech qachon ulanishni uzmaydi.",
            "stop_grace_period: 15s": "SIGTERM, 15 s, keyin SIGKILL, faqat haqiqiy qayta yaratishda.",
            "compose definition": "Qayta yaratishni boshlaydigan yagona o'zgarish.",
          },
        },
      },
    },
  },
};

export default text;
