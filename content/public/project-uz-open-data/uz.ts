import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Loyiha: uz-open-data, retsepti biriktirilgan ochiq ma'lumotlar",
  summary:
    "uz-open-data - wonmortech'ning kichik ommaviy reposi: OpenStreetMap'dan O'zbekistondagi 2 289 masjid GeoJSON ko'rinishida va o'zbek kirill yozuvidan 2026 lotin alifbosiga harflar jadvali. Har dataset o'zi olingan aniq so'rov yoki manba yonida turadi, shuning uchun har kim uni bitta curl va bitta python3 bilan qayta qura oladi. Butun pipeline: ma'lumotdan kim va qanday foydalanadi, Overpass'dan olish, kichik barqaror formatga tozalash, transliteratsiya jadvali va qoidalari, papka bo'yicha litsenziya, ma'lumot sifati ko'rinishi, brauzerdagi explorer qanday yig'iladi, test qilinadi va nashr etiladi.",
  learn: [
    "Foydalanuvchi tomoni: faylni bitta qatorda yuklab olish, explorer'da ko'rib chiqish, kirillni 2026 lotin alifbosiga o'girish",
    "Ma'lumot pipeline'i: Overpass so'rovi, snapshot vaqtlari, faqat standart kutubxonali konvertor, har qatorda bitta feature bo'lgan saralangan GeoJSON",
    "Nega qiymatlar bu yerda hech qachon tuzatilmaydi, nega litsenziya papka bo'yicha va ODbL qayta foydalanuvchidan nima talab qiladi",
    "Explorer qanday yig'iladi, sizishga tekshiriladi, smoke-test qilinadi va isbot hamda rollback bilan deploy qilinadi",
  ],
  nodes: {
    user: "Ma'lumot foydalanuvchisi",
    repo: "uz-open-data repo",
    app: "Brauzerdagi explorer",
    site: "wonmor.io",
    conv: "Qayta qurish skripti",
    osm: "Overpass API",
    bitg: "bitg konvertori",
    ci: "Build va deploy",
  },
  metrics: {
    features: "Datasetdagi masjidlar",
    unnamed: "Nomi yo'q masjidlar",
    failed: "Faylda qolgan muvaffaqiyatsiz qayta qurishlar",
    unexplained: "Izohsiz son farqi",
  },
  steps: {
    what: {
      short: "Bu nima",
      title: "Kichik datasetlar, har biri o'z retsepti bilan",
      body: "O'zbekiston haqidagi ochiq ma'lumot ko'pincha PDF jadval yoki hech kim qayta qura olmaydigan elektron jadval bo'ladi. `wonmortech/uz-open-data` teskari yo'ldan boradi: har dataset kichik, o'z papkasida turadi va papkada u qurilgan aniq so'rov yoki manba saqlanadi.\n\nBugun ikkitasi bor. `mosques/` - O'zbekistondagi musulmon ibodat joyi deb belgilangan har bir OpenStreetMap obyektining snapshot'i: 2 289 feature. `alphabet/` - har o'zbek kirill harfi 2026 lotin alifbosida qanday yozilishi jadvali, ochiq bitg konvertoridan ko'chirilgan. Uchinchisi, o'zbek so'z ro'yxatlari, rejada va README u uchun hali hech narsa nashr qilinmaganini aytadi.\n\nHammasini bitta qoida belgilaydi: qiymatlar manbadagidek ko'chiriladi. Masjid nomi xato yozilgan bo'lsa, tuzatish OpenStreetMap'da qilinadi, u yerda bu ma'lumotdan foydalanadigan har xarita uni oladi.",
      fields: {
        "mosques/": "GeoJSON, Overpass so'rovi va konvertor yonma-yon.",
        "alphabet/": "Ikki kontekst qoidasi yozib qo'yilgan CSV.",
        planned: "E'lon qilingan, lekin nashr etilmagan: repo o'zini boshqacha ko'rsatmaydi.",
        "corrections belong upstream": "Bu repo retseptli ko'zgu, ikkinchi haqiqat manbai emas.",
      },
    },
    use: {
      short: "Yuklab olish",
      title: "Yuklab olishga bitta qator, ishlatishga besh qator",
      body: "Eng ko'p uchraydigan foydalanuvchi - nuqtalar kerak bo'lgan dasturchi yoki tadqiqotchi. README'dagi tez boshlash butun yo'lni ko'rsatadi: xom faylni `curl` bilan yuklab olish, Python'ning standart `json` moduli bilan ochish va sanash. `2289 2137` natijasi README'da yozilgan, o'quvchi o'sha faylni olganini tekshira oladi: 2 289 feature, ulardan 2 137 tasida `name` bor.\n\nHar feature WGS 84 dagi GeoJSON Point, `osm_type` va `osm_id` bilan, shuning uchun `openstreetmap.org/<osm_type>/<osm_id>` asl obyektni, uning tarixini va kim xaritaga qo'shganini ochadi. Fayl QGIS, geojson.io yoki har qanday GIS asbobida to'g'ridan-to'g'ri ochiladi, API kaliti ham, akkaunt ham kerak emas.",
      fields: {
        curl: "Repodan xom fayl: API yo'q, cheklov yo'q, kalit yo'q.",
        encoding: "Nomlar o'zbek, rus va aralash yozuvlarda: UTF-8 sifatida o'qing.",
        named: "Faqat ba'zi obyektlarda name tegi bor; son nechtaligini aytadi.",
        "2289 2137": "README'da yozilgan kutilgan natija, nusxangizni tekshirishingiz uchun.",
      },
    },
    explore: {
      short: "Explorer",
      title: "Aynan shu fayllarni yuklaydigan explorer",
      body: "Hamma ham Python yozmaydi. `wonmor.io/demo/uz-open-data/` dagi jonli demo - o'sha fayllarni brauzerda yuklaydigan explorer: filtrlar va zichlik qatlamli xarita, CSV va GeoJSON eksportli qidiriladigan jadval, eng yaqin qo'shnilari bilan har masjid sahifasi, ma'lumot sifati hisoboti va konvertor.\n\nQidiruv lotin yoki kirillda ishlaydi va apostroflarga qaramaydi, chunki bitta nom bir nechta turli apostrof belgisi bilan yoziladi. Belgilangan ro'yxat xaritalash safarini rejalash uchun va faqat xotirada yashaydi: qayta yuklashda tozalanadi. **Nega xarita plitkalari yo'q:** plitkalar har mehmon uchun uchinchi tomonga so'rov degani. Chegaralar Natural Earth'dan (jamoat mulki) chiziladi, shuning uchun sahifa umuman uchinchi tomonga so'rov yubormaydi.",
      fields: {
        Map: "Oddiy chegaralar ustidagi nuqtalar, OSM turi bo'yicha ranglangan.",
        Table: "Har feature, qidirsa va eksport qilsa bo'ladi.",
        "apostrophes ignored": "o', o` va boshqalar bitta nomga mos keladi.",
        Pinned: "Hech narsa saqlanmaydi: bir seans uchun xaritalash ro'yxati.",
        "no tiles": "Backend ham, uchinchi tomon so'rovlari ham yo'q: yuklangach sahifa oflayn ishlaydi.",
      },
    },
    "convert-text": {
      short: "Konvertor",
      title: "Kirill kiradi, 2026 lotini chiqadi",
      body: "Ikkinchi foydalanuvchi yo'li - matn. O'zbekiston 2026 yilda yangilangan lotin alifbosiga o'tadi, mavjud matnlarning ko'pi esa kirillda. Explorer konvertori siz joylashtirgan matnga harflar jadvalini jonli qo'llaydi.\n\nEkrandagi misollar bitg'ning o'z unit testlari: e harfi so'z boshida yoki unlidan keyin ye bo'ladi, ts so'z boshida s bo'ladi, lekin unlidan keyin ts qoladi, ayirish belgisi U+02BC tutuq belgisiga aylanadi, ikki lotin harfiga aylanadigan bosh harfda faqat birinchisi bosh harf bo'ladi, agar butun so'z bosh harflarda bo'lmasa. README chegarani ogohlantiradi: harflar jadvali ismlar va xorijiy so'zlarni bilmaydi, shuning uchun uzluksiz matn uchun to'liq bitg konvertori to'g'ri asbob.",
      fields: {
        yer: "So'z boshidagi e: ye.",
        poyezd: "Unlidan keyingi e: ye.",
        litsey: "Unlidan keyingi ts ts bo'lib qoladi.",
        sirk: "Boshqa joyda s: o'zlashma so'zlar uchun ma'lum tuzoq.",
        "U+02BC": "bitg default ishlatadigan tutuq belgisi, ASCII apostrof emas.",
        Yangi: "Ikki harfli tovush bilan boshlanadigan so'z uchun bosh harf.",
      },
    },
    query: {
      short: "Olish",
      title: "Olish: bitta Overpass so'rovi",
      body: "Pipeline Overpass API'ga so'rovdan boshlanadi - bu OpenStreetMap ustidagi faqat o'qish uchun so'rov xizmati. So'rov to'rt qator, `query.overpassql` da turadi va uni birinchi tasvirlagan postdagidek o'zgarmagan: O'zbekiston davlat chegarasini ISO kodi bo'yicha topish, uning ichida `amenity=place_of_worship` va `religion=muslim` deb belgilangan har node, way va relation'ni tanlash, teglar va markaz nuqtasini chiqarish.\n\n**Nega to'liq OSM ko'chirmasi emas, Overpass:** mamlakat ko'chirmasi yuzlab megabayt va asboblar to'plamini talab qiladi; bu so'rov bir daqiqadan kam vaqtda aynan kerakli obyektlarni qaytaradi. `out tags center` teglar va har obyektga bitta nuqta so'raydi, shuning uchun kontur sifatida chizilgan binolar (way) va majmualar (relation) bitta koordinata oladi.",
      fields: {
        timeout: "Server voz kechishdan oldin 150 soniyagacha vaqt olishi mumkin.",
        "ISO3166-1": "Chegara qo'lda chizilgan to'rtburchak bilan emas, mamlakat kodi bilan topiladi.",
        place_of_worship: "Postdagi filtrning o'zi, sonlarni solishtirsa bo'ladi.",
        center: "Way va relation'lar hisoblangan markaz nuqtasini oladi.",
      },
    },
    snapshot: {
      short: "Snapshot",
      title: "Snapshot - bir lahza, shuning uchun lahzani yozib qo'ying",
      body: "OpenStreetMap har daqiqa o'zgaradi, shuning uchun undan olingan dataset faqat sana bilan ma'noli. Javobning o'zi ma'lumot qanchalik yangi ekanini aytadi: `timestamp_osm_base` - o'sha serverda OSM ma'lumoti oxirgi marta qachon yangilangani, `timestamp_areas_base` - hudud chegaralari oxirgi marta qachon hisoblangani.\n\nMasjidlar README'si hammasini Snapshot jadvalida yozadi: so'rov 2026-11-13 kuni 07:33:00 UTC da yuborilgan, javob 41 soniyadan keyin kelgan, OSM ma'lumoti 07:32:21 holatida, hududlar 04:27:32 holatida, va endpoint. Keyinroq qayta qurgan har kim biroz boshqacha fayl oladi, bu qatorlar sababini tushuntiradi.",
      fields: {
        timestamp_osm_base: "So'rovning emas, ma'lumotning yoshi.",
        timestamp_areas_base: "Chegaralar ma'lumotdan kamroq qayta hisoblanadi.",
        type: "node, way yoki relation: koordinata qayerdan olinishini hal qiladi.",
        tags: "Xaritachilar kiritgan erkin kalit-qiymat juftliklari.",
      },
    },
    clean: {
      short: "Tozalash",
      title: "Tozalash: faqat standart kutubxonadan foydalanadigan konvertor",
      body: "`to_geojson.py` Overpass javobini GeoJSON'ga aylantiradi. U to'rtta tegni (`name`, `name:uz`, `name:ru`, `addr:city`) va obyekt turi hamda id'sini saqlaydi, boshqa hech narsani emas, shuning uchun fayl kichik va tasodifiy shaxsiy teglarni olib yurmaydi. Node o'z koordinatasini saqlaydi; way yoki relation Overpass hisoblagan markazni oladi; koordinatasiz element tashlab ketiladi.\n\nFeature'lar tur va id bo'yicha saralanadi va har qatorga bittadan yoziladi, ASCII bo'lmagan belgilar o'z holicha qoladi. **Nega:** keyingi qayta qurish inson o'qiy oladigan git diff beradi, o'zgargan har masjidga bitta qator. Skript statistika qatorini chiqaradi, shuning uchun yomon yurish darhol ko'rinadi. U faqat Python standart kutubxonasidan foydalanadi: o'rnatiladigan narsa yo'q, keyin buziladigan narsa yo'q.",
      check: {
        q: "Nega feature'larni (osm_type, osm_id) bo'yicha saralash va har qatorga bittadan yozish kerak?",
        options: [
          "GeoJSON saralangan feature'larni talab qiladi",
          "Qayta qurish kichik, o'qiladigan git diff berishi uchun: o'zgargan har masjidga bitta o'zgargan qator",
          "Faylni kichikroq qilish uchun",
        ],
        answer: 1,
        why: "Overpass elementlarni va'da qilingan tartibsiz qaytaradi. Saralash va har qatorga bitta feature qayta yurishni butun faylni qayta yozish emas, ko'rib chiqsa bo'ladigan diff'ga aylantiradi.",
      },
      fields: {
        KEEP: "Saqlanib qoladigan teglarning to'liq ro'yxati.",
        center: "Way va relation'lar nuqtaga aylanadi.",
        "sort by": "Barqaror tartib diff'larni ma'noli qiladi.",
        features: "2 289 nuqta yozildi.",
        by_type: "1 511 node, 740 way, 38 relation: README'ga mos.",
      },
    },
    format: {
      short: "Format",
      title: "Iste'molchi oladigan format",
      body: "Faylning har qatori shunday bitta feature: WGS 84 dagi `[longitude, latitude]` li Point va properties obyekti. `osm_type` va `osm_id` doim bor; to'rtta nom va manzil maydoni faqat xaritachilar kiritgan bo'lsa.\n\nMisol \"qiymatlar o'zgarmaydi\" amalda nimani anglatishini ko'rsatadi: nom aynan xaritachi yozganidek, bu yerda apostrof o'rnida backtick bilan yozilgan, ruscha nom esa o'z maydonida saqlangan. Dataset transliteratsiya ham, normallashtirish ham qilmaydi; explorer'ning sifat sahifasi bunday yozuvlarni ko'rsatadi, kimdir ularni OpenStreetMap'da tuzatishi uchun.",
      fields: {
        coordinates: "GeoJSON talab qilganidek, avval uzunlik.",
        osm_type: "Doim bor: OSM'ga qaytish havolasini qurish uchun kerak.",
        osm_id: "Doim bor: obyektning doimiy raqami.",
        name: "Kiritilganidek; bo'lmasligi mumkin, istalgan apostrofdan foydalanishi mumkin.",
      },
    },
    alphabet: {
      short: "Alifbo",
      title: "Transliteratsiya: ishlab turgan koddan ko'chirilgan harflar jadvali",
      body: "Alifbo jadvali noldan yozilmagan. U bitg'ning Rust manbasidan mahkamlangan commit'da (`2de5c94`, 2026-11-13) ko'chirilgan, chunki bitg - odamlar haqiqatan ishlatadigan konvertor va uning qoidalari unit testlar bilan qoplangan. README fayl, funksiyalar va commit'ni nomlaydi va bitg o'zgarsa, bitg ustun bo'lishi va jadval qayta yasalishini aytadi.\n\nCSV'da 37 harf uchun 39 qator bor: ikki harf o'zidan oldingi harfga bog'liq, shuning uchun har biri shartli ikki qator oladi. 2026 alifbosi avvalgi lotin alifbosining to'rt harfini almashtiradi (O' o'rniga Ö, G' o'rniga Ğ, Sh o'rniga Ş, Ch o'rniga Ç), bitg README'sida keltirilgan 2026-10-21 dagi O'RQ-1184 qonuniga ko'ra.",
      check: {
        q: "Nega jadvalni qonun matnidan yozish o'rniga bitg'dan mahkamlangan commit'da ko'chirish kerak?",
        options: [
          "Chunki qonun matni ommaviy emas",
          "Jadval test qilingan implementatsiyaga aynan mos kelishi va har kim uni o'sha commit bilan tekshira olishi uchun",
          "Chunki CSV qoidalarni ifodalay olmaydi",
        ],
        answer: 1,
        why: "Yagona haqiqat manbai: jadval ikkinchi, biroz boshqacha talqinga aylanish o'rniga ma'lum commit'dagi test qilingan konvertor nima qilishini takrorlaydi.",
      },
      fields: {
        condition: "Bo'sh - doim; aks holda qoida so'z bilan.",
        elsewhere: "Kontekstga bog'liq harf uchun zaxira qator.",
        "39 rows": "37 harf, ulardan ikkitasi ikki qatorli.",
        authoritative: "Kelishmasa, bitg to'g'ri va jadval qayta quriladi.",
      },
    },
    licence: {
      short: "Litsenziya",
      title: "Har papkaga o'z litsenziyasi",
      body: "Ma'lumot va kodning litsenziyasi har xil, repo ularni papka bo'yicha ajratadi. Masjidlar ma'lumoti OpenStreetMap'dan, shuning uchun u \"© OpenStreetMap contributors\" atributsiyasi bilan Open Database License 1.0 ostida qoladi; moslashtirilgan bazani nashr qilgan har kim uni ham ODbL ostida ulashishi kerak. So'rov, konvertor va harflar jadvali MIT.\n\n**Foydalanuvchi uchun nega muhim:** kompaniya masjid nuqtalarini ilovada ishlatishi mumkin, lekin OpenStreetMap'ni ko'rsatishi kerak, bazaning yaxshilangan nusxasi esa ochiq qolishi kerak. Ma'lumot yonidagi `LICENSE-ODbL.md` buni oddiy so'zlar bilan tushuntiradi, explorer esa bu izohni o'zi beradigan ma'lumot yoniga ko'chiradi.",
      check: {
        q: "Startap masjidlarni o'z ish vaqtlari bilan birlashtirib, umumiy bazani nashr qiladi. ODbL nima talab qiladi?",
        options: [
          "Hech narsa, ma'lumot bepul",
          "OpenStreetMap atributsiyasini saqlash va moslashtirilgan bazani ODbL ostida ulashish",
          "OpenStreetMap'ga to'lov qilish",
        ],
        answer: 1,
        why: "ODbL bazalar uchun share-alike: atributsiya va moslashtirilgan bazalar uchun o'sha litsenziya. Chizilgan xarita kabi hosila ishlarning majburiyati yengilroq.",
      },
      fields: {
        "ODbL 1.0": "Barcha OpenStreetMap ma'lumotlarining litsenziyasi.",
        "adapted database": "Share-alike undan foydalanadigan har ilovaga emas, bazaga taalluqli.",
        MIT: "Kod va jadval: erkin foydalaning, izohni saqlang.",
        "ODbL notice": "Explorer litsenziyani o'zi ko'rsatadigan ma'lumot bilan birga olib yuradi.",
      },
    },
    quality: {
      short: "Sifat",
      title: "Bo'shliqlarni yashirish o'rniga ko'rsatish",
      body: "Explorer'ning ma'lumot sifati sahifasi nima yetishmasligi yoki g'alati ekanini sanaydi: 2 137 nomli va 152 nomsiz, 1 297 tasida ruscha nom, faqat 26 tasida aniq o'zbekcha nom, 178 tasida shahar. U umumiy nomlarni (faqat masjid deydigan nom), o'zbekcha apostrof sifatida ishlatilgan oltita turli belgini va ehtimoliy dublikatlarni ro'yxatlaydi: 150 m ichida bir xil umumiy bo'lmagan nom.\n\nBu yerda hech narsa ma'lumotni tahrirlamaydi. Bular xaritachilar OpenStreetMap'da tuzatishi uchun ko'rsatkichlar. Hududlar sahifasi ham xuddi shunday halol: u har masjidni katta doira masofasi bo'yicha 14 ta viloyat markazining eng yaqiniga biriktiradi va buni ma'muriy chegara emas, ko'rib chiqish uchun taxminiy deb ataydi.",
      check: {
        q: "Sifat sahifasi 80 m oraliqda bir xil nomli ikki masjidni topdi. Loyiha nima qiladi?",
        options: [
          "Ulardan birini mosques.geojson'dan o'chiradi",
          "Faylda hech narsa: xaritachi OpenStreetMap'da tekshirib tuzatishi uchun ehtimoliy dublikat sifatida ko'rsatiladi",
          "to_geojson.py da avtomatik birlashtiradi",
        ],
        answer: 1,
        why: "Qiymatlar o'zgarmasdan ko'chiriladi; faqat shu yerda qilingan tuzatish keyingi qayta qurishda yo'qoladi va boshqa xaritalarga hech qachon yetmaydi.",
      },
      fields: {
        "unnamed 152": "Masjid deb belgilangan, lekin nomsiz obyektlar.",
        "generic names": "Faqat obyekt nima ekanini aytadigan nom.",
        "six different characters": "Qidiruv nega apostroflarga qaramasligi sababi.",
        "150 m": "Ikki marta chizilgan bitta bino bo'lishi uchun yetarlicha yaqin.",
        approximation: "Huquqiy chegara emas, eng yaqin markaz: sahifada aytilgan.",
      },
    },
    build: {
      short: "Build",
      title: "Explorer'ni yig'ish va sizishni nashr qilishdan bosh tortish",
      body: "Datasetlarga build kerak emas. Explorer oddiy HTML, CSS va JavaScript, `tools/build-demo.mjs` esa uni istalgan sub-path ostida ishlaydigan papkaga yig'adi: sahifani, litsenziyalari bilan o'zida joylashgan shriftlarni va datasetlarning o'zini ODbL izohi bilan `data/` ga o'zgarishsiz ko'chiradi.\n\nKeyin o'zi yaratgan har HTML, JS va CSS faylni hech qachon nashr qilinmasligi kerak bo'lgan matnga tekshiradi: IPv4 manzillar, o'zbek telefon raqamlari, GitHub tokenlari va yopiq kalitlar. Bitta topilma - va build xato bilan chiqadi. **Nega build'da:** explorer boshqa repoga ko'chiriladi va u yerdan xizmat qilinadi; bu uning o'z reposi xatoni to'xtata oladigan oxirgi nuqta.",
      fields: {
        "plain HTML": "Framework yo'q: xizmat qilinadigan fayllar repodagi fayllar.",
        unchanged: "Explorer repoda nima bo'lsa, aynan shuni ko'rsatadi.",
        "forbidden text": "Sizish degani bo'ladigan kichik naqshlar ro'yxati.",
        "exit 1": "Muvaffaqiyatsiz tekshiruv - nashr qiladigan natija yo'q.",
      },
    },
    test: {
      short: "Test",
      title: "Haqiqiy brauzerda smoke testlar",
      body: "`npm run test:demo` yig'ilgan explorer'ga qarshi Playwright'ni yurgizadi: har marshrut chiziladi, umumiy ko'rinishdagi sonlar datasetga mos, jadval filtrlaydi va har feature bo'ylab sahifalaydi, xaritadagi nuqtani bosish eng yaqin masjidlarni ko'rsatadi, belgilar qo'shiladi, izohlanadi, o'chiriladi va qayta yuklashda tozalanadi, konvertor bitg misollaridan o'tadi.\n\n14 test o'tadi, konvertor bitg'ning barcha 9 misoliga mos. Repoda OpenSSF Scorecard ishlaydi, action'lar Dependabot bilan yangilanadi, CODEOWNERS har o'zgarishni maintainer'ga yo'naltiradi.",
      fields: {
        renders: "Har sahifaga bitta test: bo'sh marshrut chiqmaydi.",
        "overview counts": "Ekrandagi sonlar fayldagi sonlar.",
        "nearest mosques": "Xarita bilan o'zaro ta'sir boshidan oxirigacha ishlaydi.",
        "bitg examples": "Brauzer konvertori Rust implementatsiyasi bilan kelishadi.",
        "14 passed": "Butun smoke to'plami.",
      },
    },
    publish: {
      short: "Nashr",
      title: "wonmor.io orqali isbot va rollback bilan nashr qilish",
      body: "Yig'ilgan explorer ommaviy `wonmortech/wonmor.io` reposida `public/demo/uz-open-data/` ostiga joylashtiriladi (boshqa mahsulot demolari bilan birga PR #27 da qo'shilgan) va o'sha saytning deploy'i bilan jonli bo'ladi.\n\nBu pipeline main'ga har push'da yuradi: o'z tekshiruvlari bilan build (sayt tekshiruvi, maxfiylik skani, havola tekshiruvi), commit SHA'ni `version.txt` ga yozish va tarball'ni faqat `bin/receive` ni yurgiza oladigan kalitga SSH orqali yuborish. Keyin CI `wonmor.io/version.txt` SHA'ni ko'rsatguncha so'raydi (3 soniya oraliq bilan 20 urinishgacha), asosiy sahifalar, 404 va CSP'ni smoke-test qiladi va yuborishdan keyin biror narsa yiqilsa `rollback` ni yurgizadi.",
      check: {
        q: "SSH yuklash muvaffaqiyatli, lekin bir daqiqadan keyin ham jonli version.txt eski SHA'ni ko'rsatmoqda. Nima bo'ladi?",
        options: [
          "CI baribir muvaffaqiyat deb xabar beradi",
          "Tekshirish qadami yiqiladi va yuborish muvaffaqiyatli bo'lgani uchun rollback qadami yuradi",
          "Deploy abadiy kutadi",
        ],
        answer: 1,
        why: "Isbot - yuklash emas, xizmat qilinayotgan SHA. 20 urinishdan keyin qadam yiqiladi; yuborish qadami muvaffaqiyatli bo'lib, keyingi qadam yiqilganda rollback qadami yuradi.",
      },
      fields: {
        "public/demo/uz-open-data/": "Demo sayt reposi ichidagi statik papka.",
        "bin/receive": "Majburiy buyruq: CI kaliti nashr qilishi yoki orqaga qaytarishi mumkin, boshqa hech narsa.",
        "version.txt": "Jonli sayt qaysi commit'ni berayotganini aytadi.",
        "connect-src": "Ommaviy CSP kengaytirilgan bo'lsa, smoke test yiqiladi.",
        rollback: "Oldingi reliz bitta symlink almashtirish uzoqligida.",
      },
    },
    recap: {
      short: "Xulosa",
      title: "uz-open-data bir ekranda",
      body: "**Foydalanuvchi tomoni:** bitta GeoJSON'ni curl bilan yuklab olish va yozilgan `2289 2137` bilan tekshirish; uni xarita, jadval, eksport, sifat hisoboti va kirilldan 2026 lotiniga konvertorli explorer'da ko'rib chiqish; akkaunt ham, kalit ham, uchinchi tomon so'rovlari ham yo'q.\n\n**Ma'lumot pipeline'i:** to'rt qatorli Overpass so'rovi, yozib qo'yilgan snapshot vaqtlari, to'rt tegni saqlaydigan, way va relation'lar uchun markazni oladigan va o'qiladigan diff'lar uchun saralaydigan standart kutubxonali konvertor; bitg'dan mahkamlangan commit'da ko'chirilgan, kontekst qoidalari bilan harflar jadvali.\n\n**Qoidalar:** qiymatlar o'zgarmaydi, tuzatishlar manbada; OSM ma'lumoti uchun atributsiya va share-alike bilan ODbL, kod uchun MIT; bo'shliqlar yashirilmaydi, ko'rsatiladi.\n\n**Pipeline'lar:** sizish skani bilan build, Playwright smoke testlari va konvertor tekshiruvlari, Scorecard; wonmor.io orqali SHA isboti, smoke test va rollback bilan nashr.",
    },
  },
  scenarios: {
    "overpass-busy": {
      label: "Overpass band",
      steps: {
        "busy-bug": {
          short: "504",
          title: "Umumiy server 504 deydi",
          body: "Ommaviy Overpass serverlaridan hamma birga foydalanadi, README esa yuklama ostida ular 502 yoki 504 javob berishini ogohlantiradi. `curl -s -o overpass.json` bilan xato sahifasi faylga xuddi haqiqiy javobdek yoziladi.",
          fields: {
            "error page": "Fayl mavjud, shuning uchun e'tiborsiz skript davom etib ketardi.",
            "502 or 504": "So'rovdagi xato emas, umumiy xizmatdagi yuklama.",
          },
        },
        "busy-fix": {
          short: "Qayta urinish",
          title: "Kuting, qayta urining va statistika qatoriga ishoning",
          body: "README maslahati - umumiy serverni bosib tashlash o'rniga kutib, qayta urinish. Konvertor javobdagi `elements` ni o'qiydi va turlar bo'yicha sonlar hamda ma'lumot vaqti bilan statistika qatorini chiqaradi, shuning uchun buzuq yoki chala javob darhol ko'rinadi, sonlar to'g'ri ko'rinmaguncha hech narsa commit qilinmaydi.",
          fields: {
            "wait and retry": "Bepul ommaviy xizmatga hurmat retseptning bir qismi.",
            "timeout:150": "So'rov serverga tugatish uchun allaqachon vaqt beradi.",
            "stats line": "Sonlar va vaqtlar yomon faylni commit'dan oldin ochiq ko'rsatadi.",
          },
        },
      },
    },
    "count-drift": {
      label: "Son siljishi",
      steps: {
        "drift-bug": {
          short: "2 285 yoki 2 289",
          title: "Bitta filtr uchun ikki xil son",
          body: "Filtrni birinchi tasvirlagan wonmor.io posti 2 285 jamoatni ko'rsatgan. Bu repodagi dataset o'sha filtr bilan 2 289 feature'ga ega. Ularni solishtirgan o'quvchi qaysi biri noto'g'ri deb so'rashi tabiiy.",
          fields: {
            "2,285": "Postning o'z importi, avvalgi sanadan.",
            "2,289": "2026-11-13 da olingan snapshot.",
            "which one is wrong": "Sanalarsiz farq xatodek ko'rinadi.",
          },
        },
        "drift-fix": {
          short: "Sanali",
          title: "Qachonligini yozing, farq o'zini tushuntiradi",
          body: "Masjidlar README'si bunga snapshot jadvalida javob beradi: so'rov qachon yuborilgani, javob qachon kelgani, OSM ma'lumoti qanchalik yangi bo'lgani va qaysi endpoint javob bergani, va bitta gap: OpenStreetMap uzluksiz tahrirlanadi, bu fayl post importining nusxasi emas, yangi olingan ma'lumot. Hech bir son noto'g'ri emas.",
          fields: {
            "Query sent": "Olish lahzasi.",
            timestamp_osm_base: "Server javob bergan ma'lumotning yoshi.",
            Endpoint: "Qaysi server; boshqa ko'zgu orqada qolishi mumkin.",
            "new pull": "Kutilgan siljish, oldindan aytilgan.",
          },
        },
      },
    },
  },
};

export default text;
