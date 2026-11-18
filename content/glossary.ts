import type { Lang } from "./types";

/**
 * Course glossary: one short, plain definition per term in every language, and the lesson
 * that teaches it. Rendered at /<lang>/glossary/ and included in search.
 */
export interface Term {
  /** stable anchor id, kebab-case */
  id: string;
  term: Record<Lang, string>;
  /** one or two sentences, no markdown */
  short: Record<Lang, string>;
  /** slug of the lesson that explains it */
  lesson: string;
}

export const glossary: Term[] = [
  // ---- foundations ----
  {
    id: "latency",
    term: { uz: "Kechikish (latency)", ru: "Задержка (latency)", en: "Latency" },
    short: {
      uz: "Bitta so'rov boshidan oxirigacha qancha vaqt olishi. Yuk oshganda unga ishning o'zidan tashqari navbatda kutish ham qo'shiladi.",
      ru: "Сколько времени занимает один запрос от начала до конца. Под нагрузкой к самой работе добавляется ожидание в очереди.",
      en: "How long one request takes from start to finish. Under load, time spent waiting in line is added to the work itself.",
    },
    lesson: "latency-throughput",
  },
  {
    id: "throughput",
    term: { uz: "O'tkazuvchanlik (throughput)", ru: "Пропускная способность (throughput)", en: "Throughput" },
    short: {
      uz: "Tizim soniyasiga nechta so'rovni tugatishi. Kechikish bilan bir vaqtda ishlanayotgan so'rovlar soni orqali bog'langan.",
      ru: "Сколько запросов система завершает за секунду. С задержкой её связывает число запросов, которые обрабатываются одновременно.",
      en: "How many requests a system finishes per second. It is linked to latency through the number of requests in flight.",
    },
    lesson: "latency-throughput",
  },
  {
    id: "percentile",
    term: { uz: "Persentil (p50, p95, p99)", ru: "Перцентиль (p50, p95, p99)", en: "Percentile (p50, p95, p99)" },
    short: {
      uz: "p95 — so'rovlarning 95% i shu vaqtdan tezroq tugaydi, ya'ni har yigirmatadan bittasi sekinroq. O'rtacha qiymat sekin dumni yashiradi, shuning uchun p95 va p99 kuzatiladi.",
      ru: "p95 означает, что 95% запросов быстрее этого значения, то есть каждый двадцатый медленнее. Среднее прячет медленный хвост, поэтому смотрят на p95 и p99.",
      en: "p95 means 95% of requests are faster than this value, so one in twenty is slower. The average hides the slow tail, so you watch p95 and p99.",
    },
    lesson: "latency-throughput",
  },
  {
    id: "load-shedding",
    term: { uz: "Ortiqcha yukni rad etish (load shedding)", ru: "Сброс нагрузки (load shedding)", en: "Load shedding" },
    short: {
      uz: "Server to'lib qolganda ortiqcha so'rovlarga kutdirmasdan darhol 503 qaytarish. Hammaga sekin xato bergandan ko'ra bir qismiga tez \"keyinroq urining\" deyish yaxshi.",
      ru: "При перегрузке лишние запросы сразу получают 503, а не стоят в очереди. Лучше быстро сказать части клиентов «попробуйте позже», чем медленно отказать всем.",
      en: "When a server is full, extra requests get an instant 503 instead of waiting. A fast \"try again\" for a few beats a slow failure for everyone.",
    },
    lesson: "latency-throughput",
  },
  {
    id: "napkin-math",
    term: { uz: "Qog'oz ustidagi hisob (napkin math)", ru: "Оценка на салфетке", en: "Napkin math" },
    short: {
      uz: "Tizim hajmini oddiy ko'paytirishlar zanjiri bilan taxmin qilish: foydalanuvchilar, soniyasiga so'rovlar, kunlik baytlar, keyin disk, tarmoq va serverlar. Har bir faraz yoziladi, o'rtachaga emas, cho'qqiga rejalashtiriladi.",
      ru: "Грубая оценка размера системы цепочкой простых умножений: пользователи, запросы в секунду, байты в день, затем диски, сеть и серверы. Каждое допущение записывают и считают по пику, а не по среднему.",
      en: "Sizing a system with a chain of simple multiplications: users, requests per second, bytes per day, then disks, bandwidth and servers. Write each assumption down and plan for the peak, not the average.",
    },
    lesson: "napkin-math",
  },

  // ---- scaling ----
  {
    id: "vertical-scaling",
    term: { uz: "Vertikal masshtablash", ru: "Вертикальное масштабирование", en: "Vertical scaling" },
    short: {
      uz: "Serverni kattaroq va kuchliroq serverga almashtirish. Oddiy, lekin bir kun undan kattasi qolmaydi va u baribir yagona nosozlik nuqtasi.",
      ru: "Замена сервера на более мощный. Это просто, но однажды больше сервера не найти, и он всё равно остаётся единой точкой отказа.",
      en: "Replacing a server with a bigger, stronger one. It is simple, but one day there is no bigger box, and it is still a single point of failure.",
    },
    lesson: "vertical-horizontal",
  },
  {
    id: "horizontal-scaling",
    term: { uz: "Gorizontal masshtablash", ru: "Горизонтальное масштабирование", en: "Horizontal scaling" },
    short: {
      uz: "Bitta katta server o'rniga ko'p serverlar qo'yish. Buning uchun oldida load balancer va stateless app serverlar kerak.",
      ru: "Добавление серверов вместо одного большого. Для этого нужен балансировщик впереди и stateless-серверы приложения.",
      en: "Adding more servers instead of one bigger one. It needs a load balancer in front and stateless app servers.",
    },
    lesson: "vertical-horizontal",
  },
  {
    id: "single-point-of-failure",
    term: { uz: "Yagona nosozlik nuqtasi (SPOF)", ru: "Единая точка отказа (SPOF)", en: "Single point of failure (SPOF)" },
    short: {
      uz: "Yo'qolsa butun tizimni to'xtatadigan qism. Unga odamsiz o'rnini egallaydigan zaxira beriladi.",
      ru: "Часть, без которой останавливается вся система. Ей дают резерв, который подменяет её без участия человека.",
      en: "A part whose loss stops the whole system. The fix is a spare that takes over without a human.",
    },
    lesson: "redundancy",
  },
  {
    id: "load-balancer",
    term: { uz: "Load balancer", ru: "Балансировщик нагрузки", en: "Load balancer" },
    short: {
      uz: "Kiruvchi trafikni bir nechta server orasida taqsimlaydigan qism. L4 ulanishlarni, L7 alohida so'rovlarni taqsimlaydi; round robin, least connections yoki og'irliklar bilan tanlaydi.",
      ru: "Компонент, который распределяет входящий трафик между серверами. L4 раздаёт соединения, L7 — отдельные запросы; выбирает по round robin, least connections или весам.",
      en: "A component that spreads incoming traffic across several servers. L4 balances connections, L7 balances requests; it picks by round robin, least connections or weights.",
    },
    lesson: "load-balancing",
  },
  {
    id: "health-check",
    term: { uz: "Health check", ru: "Health check (проверка здоровья)", en: "Health check" },
    short: {
      uz: "Balancer serverni muntazam tekshirib turadi va javob bermaganini bir necha soniyada pool'dan chiqaradi. Server tuzalgach u yana qaytariladi.",
      ru: "Балансировщик регулярно опрашивает сервер и за несколько секунд выводит из пула тот, что не отвечает. Когда сервер оживает, его возвращают.",
      en: "The balancer probes each server regularly and takes one that stops answering out of the pool within seconds. It comes back once it recovers.",
    },
    lesson: "load-balancing",
  },
  {
    id: "stateless",
    term: { uz: "Stateless (holatsiz) server", ru: "Stateless-сервер", en: "Stateless server" },
    short: {
      uz: "So'rovlar orasida jarayon xotirasida hech narsa saqlamaydigan server. Sessiya va fayllar umumiy omborda, shuning uchun istalgan server istalgan vaqtda o'chishi yoki qo'shilishi mumkin.",
      ru: "Сервер, который ничего не хранит в памяти процесса между запросами. Сессии и файлы лежат в общем хранилище, поэтому любой сервер можно убрать или добавить в любой момент.",
      en: "A server that keeps nothing in process memory between requests. Sessions and files live in a shared store, so any server can die or be added at any time.",
    },
    lesson: "stateless",
  },
  {
    id: "sticky-session",
    term: { uz: "Sticky sessiya", ru: "Sticky-сессия", en: "Sticky session" },
    short: {
      uz: "Balancer bir foydalanuvchini doim o'sha serverga yuboradi. Bu muammoni yashiradi, hal qilmaydi: server qayta ishga tushsa sessiya yo'qoladi, yuk esa notekis bo'ladi.",
      ru: "Балансировщик всегда отправляет пользователя на тот же сервер. Это прячет проблему, а не решает её: при перезапуске сервера сессия теряется, а нагрузка перекашивается.",
      en: "The balancer always sends a user to the same server. It hides the problem rather than solving it: a restart loses the session and load becomes uneven.",
    },
    lesson: "stateless",
  },
  {
    id: "cache-aside",
    term: { uz: "Cache-aside", ru: "Cache-aside", en: "Cache-aside" },
    short: {
      uz: "Eng keng tarqalgan kesh usuli: ilova avval keshga qaraydi, miss bo'lsa bazadan o'qiydi va javobni keshga qo'yadi. Keyingi so'rovlar hit bo'lib, xotiradan javob oladi.",
      ru: "Самая распространённая схема кеша: приложение сначала смотрит в кеш, при промахе читает базу и кладёт ответ в кеш. Следующие запросы попадают в кеш и отвечаются из памяти.",
      en: "The most common cache pattern: the app looks in the cache first, on a miss reads the database and puts the answer in the cache. Later requests hit and are served from memory.",
    },
    lesson: "caching",
  },
  {
    id: "ttl",
    term: { uz: "TTL (yashash muddati)", ru: "TTL (время жизни)", en: "TTL (time to live)" },
    short: {
      uz: "Keshdagi kalit qancha vaqtdan keyin o'zi o'chishi. Invalidatsiya unutilsa ham eskirgan ma'lumot abadiy qolmasligi uchun zaxira himoya.",
      ru: "Через сколько времени ключ в кеше исчезает сам. Страховка на случай, если инвалидацию забыли: устаревшие данные не живут вечно.",
      en: "How long a cached key lives before it expires by itself. A safety net so stale data cannot stay forever if invalidation is missed.",
    },
    lesson: "caching",
  },
  {
    id: "cache-invalidation",
    term: { uz: "Kesh invalidatsiyasi", ru: "Инвалидация кеша", en: "Cache invalidation" },
    short: {
      uz: "Ma'lumot o'zgarganda keshdagi eski nusxani o'chirish. Yozuv commit bo'lgandan keyin kalit o'chiriladi va keyingi o'qish yangi qiymatni oladi.",
      ru: "Удаление старой копии из кеша, когда данные изменились. Ключ удаляют после коммита, и следующее чтение берёт свежее значение.",
      en: "Removing the old cached copy when the data changes. The key is deleted after the commit, so the next read fetches the fresh value.",
    },
    lesson: "caching",
  },
  {
    id: "cache-stampede",
    term: { uz: "Keshga yopirilish (stampede)", ru: "Набег на кеш (stampede)", en: "Cache stampede" },
    short: {
      uz: "Issiq kalit tugagan lahzada minglab so'rov bir vaqtda miss qilib, bazaga bir xil so'rov bilan boradi. Coalescing va tasodifiy TTL bunga qarshi ishlaydi.",
      ru: "В момент истечения горячего ключа тысячи запросов одновременно промахиваются и идут в базу с одним и тем же запросом. Против этого работают coalescing и случайный TTL.",
      en: "When a hot key expires, thousands of requests miss at once and hit the database with the same query. Request coalescing and jittered TTLs prevent it.",
    },
    lesson: "caching",
  },
  {
    id: "request-coalescing",
    term: { uz: "Request coalescing", ru: "Request coalescing (склейка запросов)", en: "Request coalescing" },
    short: {
      uz: "Miss bo'lganda faqat bitta so'rov qisqa lock olib bazadan o'qiydi va keshni to'ldiradi, qolganlari bir necha millisekund kutib tayyor kalitni o'qiydi. Minglab bir xil so'rov bittaga aylanadi.",
      ru: "При промахе только один запрос берёт короткую блокировку, читает базу и заполняет кеш, остальные ждут несколько миллисекунд и читают готовый ключ. Тысячи одинаковых запросов становятся одним.",
      en: "On a miss, only one request takes a short lock, reads the database and refills the cache; the rest wait a few milliseconds and read the fresh key. Thousands of identical queries become one.",
    },
    lesson: "caching",
  },
  {
    id: "write-through-write-back",
    term: { uz: "Write-through va write-back", ru: "Write-through и write-back", en: "Write-through and write-back" },
    short: {
      uz: "Write-through bitta so'rovda keshga ham, bazaga ham yozadi: kesh doim yangi, lekin yozuv ikki marta to'laydi. Write-back faqat keshga yozadi va worker keyinroq bazaga o'tkazadi: juda tez, lekin kesh o'lsa o'tkazilmagan qism yo'qoladi.",
      ru: "Write-through пишет и в кеш, и в базу в одном запросе: кеш всегда свежий, но запись платит дважды. Write-back пишет только в кеш, а воркер позже сбрасывает в базу: очень быстро, но если кеш упал, несброшенное теряется.",
      en: "Write-through writes the cache and the database in the same request: always fresh, but every write pays twice. Write-back writes only the cache and a worker flushes later: very fast, but unflushed data is lost if the cache dies.",
    },
    lesson: "caching",
  },
  {
    id: "cdn",
    term: { uz: "CDN va edge", ru: "CDN и edge", en: "CDN and edge" },
    short: {
      uz: "Statik fayllarni foydalanuvchiga yaqin edge serverlardagi keshdan beradigan tarmoq. Origin faqat miss'larni to'ldiradi, nima va qancha keshlanishini Cache-Control hal qiladi.",
      ru: "Сеть кешей на edge-серверах рядом с пользователями, которая отдаёт статику. Origin только заполняет промахи, а что и на сколько кешировать, решает Cache-Control.",
      en: "A network of caches on edge servers near users that serves static files. The origin only fills misses, and Cache-Control decides what is cached and for how long.",
    },
    lesson: "cdn",
  },
  {
    id: "origin-shield",
    term: { uz: "Origin shield", ru: "Origin shield", en: "Origin shield" },
    short: {
      uz: "Edge'lar va origin orasidagi oraliq kesh qatlami. Har edge alohida so'rash o'rniga ko'p edge miss'i origin'ga bitta so'rov bo'lib boradi.",
      ru: "Промежуточный слой кеша между edge-серверами и origin. Вместо того чтобы каждый edge спрашивал сам, много промахов превращаются в один запрос к origin.",
      en: "A middle cache layer between the edges and the origin. Instead of every edge asking on its own, many edge misses turn into one request to the origin.",
    },
    lesson: "cdn",
  },

  // ---- data ----
  {
    id: "nosql",
    term: { uz: "NoSQL (hujjat, wide-column, key-value)", ru: "NoSQL (документ, wide-column, key-value)", en: "NoSQL (document, wide-column, key-value)" },
    short: {
      uz: "Relatsion bo'lmagan omborlar: hujjat ombori butun obyektni bitta o'qishda beradi, wide-column juda ko'p yozuvni ko'taradi, key-value faqat kalit bo'yicha qidiradi. Ular oldindan ma'lum foydalanish usuliga moslanadi, relatsion baza esa yangi savollarga ochiq.",
      ru: "Нереляционные хранилища: документное отдаёт весь объект за одно чтение, wide-column держит огромный поток записей, key-value ищет только по ключу. Они заточены под заранее известный сценарий, а реляционная база открыта новым вопросам.",
      en: "Non-relational stores: a document store returns a whole object in one read, a wide-column store takes huge write rates, a key-value store looks up by key only. Each is shaped for a known access pattern, while a relational database stays open to new questions.",
    },
    lesson: "sql-nosql",
  },
  {
    id: "index",
    term: { uz: "Indeks", ru: "Индекс", en: "Index" },
    short: {
      uz: "Baza qatorlarni butun jadvalni o'qimasdan topishi uchun alohida saralangan tuzilma, odatda B-tree. Composite indeksda ustunlar tartibi muhim, har indeks esa har yozuvni sekinlashtiradi.",
      ru: "Отдельная отсортированная структура, обычно B-tree, чтобы база находила строки без полного сканирования таблицы. В составном индексе важен порядок колонок, а каждый индекс замедляет каждую запись.",
      en: "A separate sorted structure, usually a B-tree, that lets the database find rows without scanning the whole table. In a composite index the column order matters, and every index slows down every write.",
    },
    lesson: "indexes",
  },
  {
    id: "b-tree",
    term: { uz: "B-tree", ru: "B-дерево (B-tree)", en: "B-tree" },
    short: {
      uz: "Ma'lumotni saralangan sahifalarda saqlab, joyida yangilaydigan tuzilma. O'qish va oraliq so'rovlar tez, lekin har kichik yozuv tasodifiy joydagi butun sahifani qayta yozadi.",
      ru: "Структура, которая хранит данные в отсортированных страницах и обновляет их на месте. Чтения и диапазоны быстрые, но каждая мелкая запись переписывает целую страницу в случайном месте.",
      en: "A structure that keeps data in sorted pages and updates them in place. Reads and range scans are fast, but every small write rewrites a whole page at a random spot.",
    },
    lesson: "storage-engines",
  },
  {
    id: "lsm-tree",
    term: { uz: "LSM-tree", ru: "LSM-дерево", en: "LSM-tree" },
    short: {
      uz: "Yozuvni WAL'ga qo'shib yozib, xotiradagi memtable'da saralaydigan va keyin diskka SSTable fayl qilib tushiradigan ombor. Yozish juda tez, evaziga o'qish kuchayishi va compaction keladi.",
      ru: "Хранилище, которое дописывает запись в WAL, сортирует её в memtable в памяти и потом сбрасывает на диск файлом SSTable. Запись очень быстрая, плата — усиление чтения и compaction.",
      en: "A store that appends each write to the WAL, sorts it in an in-memory memtable and later flushes it to disk as an SSTable file. Writes are very fast; the price is read amplification and compaction.",
    },
    lesson: "storage-engines",
  },
  {
    id: "write-ahead-log",
    term: { uz: "WAL (write-ahead log)", ru: "WAL (журнал предзаписи)", en: "WAL (write-ahead log)" },
    short: {
      uz: "Har o'zgarish avval faqat oxiriga qo'shib yoziladigan log faylga tushadi, keyin asosiy tuzilmaga. Server yiqilsa, ma'lumot shu logdan tiklanadi.",
      ru: "Каждое изменение сначала дописывается в конец журнала и только потом попадает в основную структуру. Если сервер упал, данные восстанавливаются из этого журнала.",
      en: "Every change is first appended to a log file that only grows at the end, then applied to the main structure. If the server crashes, data is recovered from this log.",
    },
    lesson: "storage-engines",
  },
  {
    id: "replication",
    term: { uz: "Replikatsiya (lider va follower)", ru: "Репликация (лидер и фолловеры)", en: "Replication (leader and followers)" },
    short: {
      uz: "Lider barcha yozuvlarni qabul qiladi va o'z logini follower'larga uzatadi, ular uni qayta bajarib nusxa saqlaydi. Replikalar o'qish quvvatini va failover uchun zaxirani beradi.",
      ru: "Лидер принимает все записи и передаёт свой журнал фолловерам, которые проигрывают его и держат копию. Реплики дают ёмкость на чтение и резерв для failover.",
      en: "The leader takes every write and streams its log to followers, which replay it and keep a copy. Replicas give read capacity and a spare for failover.",
    },
    lesson: "replication",
  },
  {
    id: "replication-lag",
    term: { uz: "Replikatsiya kechikishi", ru: "Отставание репликации", en: "Replication lag" },
    short: {
      uz: "Asinxron replika liderdan qancha orqada ekani. Yuk ostida u o'sadi va replikadan o'qilgan ma'lumot eskirgan bo'lishi mumkin.",
      ru: "Насколько асинхронная реплика отстаёт от лидера. Под нагрузкой отставание растёт, и чтение с реплики может вернуть устаревшие данные.",
      en: "How far an asynchronous replica is behind the leader. It grows under load, so a read from a replica can return stale data.",
    },
    lesson: "replication",
  },
  {
    id: "read-your-writes",
    term: { uz: "Read-your-writes", ru: "Read-your-writes", en: "Read-your-writes" },
    short: {
      uz: "Foydalanuvchi o'zi yozgan narsani doim ko'rishi kafolati. Yozuvdan keyin uning o'qishlari replika yetib olguncha liderga yo'naltiriladi.",
      ru: "Гарантия, что пользователь всегда видит то, что сам записал. После записи его чтения идут на лидера, пока реплика не догонит.",
      en: "A guarantee that users always see their own writes. After a write, that user's reads go to the leader until the replica has caught up.",
    },
    lesson: "replication",
  },
  {
    id: "sharding",
    term: { uz: "Sharding", ru: "Шардирование", en: "Sharding" },
    short: {
      uz: "Bitta serverga sig'may qolgan jadvalni qatorlar bo'yicha bir nechta serverga (shard'ga) bo'lish. Har qator qayerda turishini shard kaliti hal qiladi.",
      ru: "Разделение таблицы, которая не помещается на один сервер, по строкам между несколькими серверами (шардами). Где лежит каждая строка, решает ключ шардирования.",
      en: "Splitting a table that no longer fits on one server across several servers (shards) by rows. The shard key decides where each row lives.",
    },
    lesson: "sharding",
  },
  {
    id: "shard-key",
    term: { uz: "Shard kaliti", ru: "Ключ шардирования", en: "Shard key" },
    short: {
      uz: "Qator qaysi shard'da turishini hal qiladigan qiymat. Eng ko'p so'rov filtrlaydigan ustun tanlanadi, vaqt bilan o'sadigan kalit esa hash qilinadi, aks holda bitta shard qiziydi.",
      ru: "Значение, которое решает, на каком шарде лежит строка. Берут колонку, по которой фильтрует самый частый запрос, а растущий со временем ключ хешируют, иначе греется один шард.",
      en: "The value that decides which shard holds a row. Pick the column your most common query filters on, and hash keys that grow over time or one shard runs hot.",
    },
    lesson: "sharding",
  },
  {
    id: "hot-key",
    term: { uz: "Qizigan kalit (hot key)", ru: "Горячий ключ", en: "Hot key" },
    short: {
      uz: "Yuki boshqalardan juda katta bo'lgan bitta kalit, masalan ulkan kanal yoki aksiyadagi mahsulot. U bitta shard yoki kesh node'ini qizdiradi, shuning uchun bucket'larga bo'linadi.",
      ru: "Один ключ, на который приходится несоразмерно много нагрузки, например огромный канал или товар на распродаже. Он перегревает один шард или узел кеша, поэтому его режут на бакеты.",
      en: "A single key with far more load than the rest, such as a huge channel or a product on sale. It overheats one shard or cache node, so it is split into buckets.",
    },
    lesson: "sharding",
  },
  {
    id: "consistent-hashing",
    term: { uz: "Consistent hashing", ru: "Консистентное хеширование", en: "Consistent hashing" },
    short: {
      uz: "Node'lar va kalitlar bitta halqaga qo'yiladi, kalit soat strelkasi bo'yicha keyingi node'ga tegishli. Node qo'shilsa yoki chiqsa kalitlarning faqat ~1/N qismi ko'chadi; virtual node'lar yukni tenglashtiradi.",
      ru: "Узлы и ключи размещают на одном кольце, ключ принадлежит следующему узлу по часовой стрелке. При добавлении или уходе узла переезжает лишь ~1/N ключей, а виртуальные узлы выравнивают нагрузку.",
      en: "Nodes and keys sit on one ring, and a key belongs to the next node clockwise. When a node joins or leaves only about 1/N of the keys move; virtual nodes even out the load.",
    },
    lesson: "consistent-hashing",
  },
  {
    id: "uuidv7",
    term: { uz: "UUIDv7", ru: "UUIDv7", en: "UUIDv7" },
    short: {
      uz: "Birinchi 48 biti millisekunddagi vaqt, qolgani tasodifiy bo'lgan 128 bitli ID. Yangi ID'lar indeks oxiriga tushadi, shuning uchun tasodifiy UUIDv4 kabi B-tree'ni titib tashlamaydi.",
      ru: "128-битный id, у которого первые 48 бит — время в миллисекундах, а остальное случайно. Новые id попадают в конец индекса и не разрывают B-tree, как случайный UUIDv4.",
      en: "A 128-bit id whose first 48 bits are the time in milliseconds and the rest is random. New ids land at the end of the index, so it does not tear a B-tree apart like random UUIDv4.",
    },
    lesson: "unique-ids",
  },
  {
    id: "snowflake-id",
    term: { uz: "Snowflake ID (vaqt + mashina + ketma-ketlik)", ru: "Snowflake ID (время + машина + счётчик)", en: "Snowflake ID (time + machine + sequence)" },
    short: {
      uz: "64 bitli ID: tanlangan davrdan beri o'tgan millisekundlar, mashina raqami va shu millisekund ichidagi hisoblagich. Har server ID'ni o'zi yaratadi, soat orqaga ketsa kutadi yoki rad etadi.",
      ru: "64-битный id из миллисекунд с выбранной эпохи, номера машины и счётчика внутри миллисекунды. Каждый сервер делает id сам, а если часы пошли назад, ждёт или отказывает.",
      en: "A 64-bit id made of milliseconds since a chosen epoch, a machine number and a counter within that millisecond. Each server makes ids alone, and waits or refuses if its clock moves back.",
    },
    lesson: "unique-ids",
  },
  {
    id: "cap-theorem",
    term: { uz: "CAP", ru: "CAP", en: "CAP" },
    short: {
      uz: "Tarmoq bo'linganda tizim tanlashi kerak: izchil qolib (CP) uzilgan tomonda yozuvni rad etish yoki ochiq qolib (AP) ikkala tomonda qabul qilish. Uzilish paytida ikkalasi birga bo'lmaydi.",
      ru: "При сетевом разделе система должна выбрать: остаться согласованной (CP) и отказать в записи на отрезанной стороне или остаться доступной (AP) и принимать записи с обеих сторон. Во время разрыва нельзя получить и то и другое.",
      en: "When the network splits, a system must choose: stay consistent (CP) and refuse writes on the cut-off side, or stay available (AP) and accept writes on both sides. During the cut you cannot have both.",
    },
    lesson: "cap",
  },
  {
    id: "network-partition",
    term: { uz: "Tarmoq bo'linishi (partition)", ru: "Сетевой раздел (partition)", en: "Network partition" },
    short: {
      uz: "Tizim qismlari orasidagi aloqa uzilib, ular bir-birini ko'rmay qolishi. Har ikki tomon ishlayveradi, lekin kelisha olmaydi.",
      ru: "Обрыв связи между частями системы, после которого они не видят друг друга. Обе стороны продолжают работать, но согласоваться не могут.",
      en: "A broken link between parts of a system so they can no longer see each other. Both sides keep running but cannot agree.",
    },
    lesson: "cap",
  },
  {
    id: "eventual-consistency",
    term: { uz: "Eventual consistency", ru: "Eventual consistency (согласованность в конечном счёте)", en: "Eventual consistency" },
    short: {
      uz: "Yozish to'xtasa, barcha nusxalar oxir-oqibat bir xil bo'ladi, lekin har lahzada emas. Asinxron replikatsiyada qisqa vaqt eskirgan o'qish bo'lishi mumkin.",
      ru: "Если записи прекратились, все копии в итоге совпадут, но не в каждый момент. При асинхронной репликации ненадолго возможны устаревшие чтения.",
      en: "If writes stop, all copies end up the same, but not at every instant. With asynchronous replication some reads are briefly stale.",
    },
    lesson: "cap",
  },
  {
    id: "quorum",
    term: { uz: "Quorum (R + W > N)", ru: "Кворум (R + W > N)", en: "Quorum (R + W > N)" },
    short: {
      uz: "Har yozuv N ta replikadan W tasida tasdiqlansa hisoblanadi, o'qish R ta replikadan so'raydi. R + W > N bo'lsa har o'qish oxirgi yozuv bilan kamida bitta replikada kesishadi va faqat ko'pchilik tomon yoza oladi.",
      ru: "Запись считается выполненной, когда её подтвердили W из N реплик, а чтение опрашивает R реплик. Если R + W > N, каждое чтение пересекается с последней записью хотя бы на одной реплике, и писать может только большинство.",
      en: "A write counts once W of N replicas confirm it, and a read asks R replicas. If R + W > N, every read overlaps the latest write on at least one replica, and only the majority side can write.",
    },
    lesson: "cap",
  },
  {
    id: "consensus",
    term: { uz: "Konsensus (Raft)", ru: "Консенсус (Raft)", en: "Consensus (Raft)" },
    short: {
      uz: "Bir nechta node lider va umumiy log bo'yicha ko'pchilik ovozi bilan kelishadi. O'zgarish ko'pchilik saqlaganda commit bo'ladi, term va ovozlar har term'da ko'pi bilan bitta lider beradi.",
      ru: "Несколько узлов договариваются о лидере и общем журнале голосованием большинства. Изменение закоммичено, когда его сохранило большинство, а термы и голоса дают не больше одного лидера на терм.",
      en: "Several nodes agree on a leader and a shared log by majority vote. A change is committed once a majority stored it, and terms and votes allow at most one leader per term.",
    },
    lesson: "consensus",
  },
  {
    id: "fencing-token",
    term: { uz: "Fencing token", ru: "Fencing-токен", en: "Fencing token" },
    short: {
      uz: "Har yangi lock bilan beriladigan o'suvchi raqam. Himoyalangan resurs ko'rgan eng katta raqamni eslab qoladi va eski lock bilan uyg'ongan worker'ning yozuvini rad etadi.",
      ru: "Растущий номер, который выдаётся с каждой новой блокировкой. Защищаемый ресурс помнит самый большой номер и отклоняет запись воркера, проснувшегося со старой блокировкой.",
      en: "An increasing number handed out with every new lock. The protected resource remembers the highest number it has seen and rejects writes from a worker that wakes up with an old lock.",
    },
    lesson: "consensus",
  },
  {
    id: "transaction",
    term: { uz: "Tranzaksiya", ru: "Транзакция", en: "Transaction" },
    short: {
      uz: "Bir-biriga tegishli bir nechta yozuvni BEGIN ... COMMIT ichida bajarish: yo hammasi saqlanadi, yo hech biri. Server o'rtada o'lsa ham yarim yozuv qolmaydi.",
      ru: "Несколько связанных записей внутри BEGIN ... COMMIT: сохраняются либо все, либо ни одна. Даже если сервер умрёт посередине, половины записи не останется.",
      en: "Several related writes inside BEGIN ... COMMIT: either all are saved or none are. Even if the server dies halfway, no half-done change remains.",
    },
    lesson: "transactions",
  },
  {
    id: "isolation-level",
    term: { uz: "Izolyatsiya darajasi", ru: "Уровень изоляции", en: "Isolation level" },
    short: {
      uz: "Parallel tranzaksiyalar bir-birining o'zgarishini qanchalik ko'rishini belgilaydi: READ COMMITTED, REPEATABLE READ, SERIALIZABLE. Daraja qanchalik yuqori bo'lsa, shuncha ko'p anomaliya yopiladi, lekin qayta urinish ko'payadi.",
      ru: "Определяет, насколько параллельные транзакции видят изменения друг друга: READ COMMITTED, REPEATABLE READ, SERIALIZABLE. Чем выше уровень, тем больше аномалий закрыто, но тем больше повторов.",
      en: "Sets how much concurrent transactions see of each other's changes: READ COMMITTED, REPEATABLE READ, SERIALIZABLE. A higher level closes more anomalies but causes more retries.",
    },
    lesson: "transactions",
  },
  {
    id: "dirty-read",
    term: { uz: "Dirty read", ru: "Грязное чтение (dirty read)", en: "Dirty read" },
    short: {
      uz: "Boshqa tranzaksiyaning hali commit qilinmagan qoralamasini o'qish. Agar u rollback bo'lsa, o'qigan tomon hech qachon bo'lmagan ma'lumotdan foydalangan bo'ladi.",
      ru: "Чтение черновика другой транзакции, которая ещё не закоммичена. Если она откатится, читатель использовал данные, которых никогда не было.",
      en: "Reading another transaction's uncommitted draft. If that transaction rolls back, the reader used data that never existed.",
    },
    lesson: "transactions",
  },
  {
    id: "optimistic-locking",
    term: { uz: "Optimistik qulf (version)", ru: "Оптимистичная блокировка (version)", en: "Optimistic locking (version)" },
    short: {
      uz: "Qatorni oldindan qulflash o'rniga yozish paytida version ustuni o'zgarmaganini tekshirish. Agar boshqa yozuv oldinroq o'tgan bo'lsa, update hech narsani o'zgartirmaydi va amal qayta urinadi.",
      ru: "Вместо блокировки строки заранее при записи проверяется, что столбец version не изменился. Если кто-то успел раньше, update ничего не меняет, и операция повторяется.",
      en: "Instead of locking the row up front, the write checks that a version column has not changed. If someone else wrote first, the update changes nothing and the operation retries.",
    },
    lesson: "transactions",
  },
  {
    id: "presigned-url",
    term: { uz: "Presigned URL", ru: "Presigned URL", en: "Presigned URL" },
    short: {
      uz: "API imzolab beradigan qisqa muddatli havola, klient faylni u orqali to'g'ridan-to'g'ri object storage'ga yuklaydi. Baytlar API orqali o'tmaydi, API faqat kim va qancha hajm ekanini tekshiradi.",
      ru: "Короткоживущая ссылка, подписанная API, по которой клиент грузит файл прямо в объектное хранилище. Байты не идут через API, он только проверяет, кто грузит и какого размера файл.",
      en: "A short-lived link signed by the API that lets the client upload a file straight to object storage. Bytes skip the API, which only checks who the user is and how big the file may be.",
    },
    lesson: "files",
  },

  // ---- communication ----
  {
    id: "rest",
    term: { uz: "REST", ru: "REST", en: "REST" },
    short: {
      uz: "Har resursga bitta URL va standart HTTP metodlari. Sodda va yaxshi keshlanadi, lekin over-fetching, under-fetching va N+1 chaqiruvlarga olib kelishi mumkin.",
      ru: "У каждого ресурса один URL и стандартные HTTP-методы. Просто и хорошо кешируется, но легко приводит к over-fetching, under-fetching и N+1 запросам.",
      en: "One URL per resource and standard HTTP methods. Simple and cache-friendly, but it can lead to over-fetching, under-fetching and N+1 calls.",
    },
    lesson: "apis",
  },
  {
    id: "graphql",
    term: { uz: "GraphQL", ru: "GraphQL", en: "GraphQL" },
    short: {
      uz: "Klient qaysi maydonlar kerakligini so'rovning o'zida yozadi va bitta chaqiruvda oladi. N+1 serverga ko'chadi, shuning uchun resolver'lar guruhlanadi va so'rov narxi cheklanadi.",
      ru: "Клиент сам пишет в запросе, какие поля ему нужны, и получает их одним вызовом. N+1 переезжает на сервер, поэтому резолверы группируют, а стоимость запроса ограничивают.",
      en: "The client writes which fields it needs in the query and gets them in one call. The N+1 moves to the server, so resolvers are batched and query cost is limited.",
    },
    lesson: "apis",
  },
  {
    id: "grpc",
    term: { uz: "gRPC", ru: "gRPC", en: "gRPC" },
    short: {
      uz: "Qat'iy sxemali, ikkilik formatdagi tez RPC protokoli. O'z servislaringiz orasidagi ichki chaqiruvlarga mos.",
      ru: "Быстрый RPC-протокол со строгой схемой и бинарным форматом. Подходит для внутренних вызовов между своими сервисами.",
      en: "A fast RPC protocol with a strict schema and a binary format. It fits internal calls between your own services.",
    },
    lesson: "apis",
  },
  {
    id: "cursor-pagination",
    term: { uz: "Cursor bilan sahifalash", ru: "Курсорная пагинация", en: "Cursor pagination" },
    short: {
      uz: "Keyingi sahifa OFFSET bilan emas, oxirgi ko'rilgan yozuvni bildiruvchi cursor bilan so'raladi. Yangi yozuvlar qo'shilsa ham sahifalar takrorlanmaydi va o'tkazib yuborilmaydi.",
      ru: "Следующую страницу просят не через OFFSET, а курсором, указывающим на последнюю показанную запись. Новые записи не вызывают повторов и пропусков.",
      en: "The next page is requested with a cursor pointing at the last item seen, not with OFFSET. New items no longer cause repeats or gaps.",
    },
    lesson: "apis",
  },
  {
    id: "idempotency-key",
    term: { uz: "Idempotency-Key", ru: "Idempotency-Key", en: "Idempotency key" },
    short: {
      uz: "Klient har yaratish so'roviga qo'shadigan noyob kalit. Server kalitni saqlaydi va takroriy so'rovga yangi buyurtma yaratmasdan o'sha javobni qaytaradi.",
      ru: "Уникальный ключ, который клиент добавляет к каждому запросу на создание. Сервер запоминает ключ и на повтор возвращает тот же ответ, не создавая второй заказ.",
      en: "A unique key the client sends with every create request. The server stores it and answers a repeat with the same response instead of creating a second order.",
    },
    lesson: "apis",
  },
  {
    id: "idempotency",
    term: { uz: "Idempotentlik", ru: "Идемпотентность", en: "Idempotency" },
    short: {
      uz: "Amalni bir marta yoki bir necha marta bajarish bir xil natija beradi. Xabarlar qayta yetkazilishi mumkin, shuning uchun har handler idempotent bo'lishi kerak.",
      ru: "Выполнить операцию один раз или несколько — результат одинаковый. Сообщения могут доставляться повторно, поэтому каждый обработчик должен быть идемпотентным.",
      en: "Running an operation once or several times gives the same result. Messages can be delivered again, so every handler must be idempotent.",
    },
    lesson: "callbacks",
  },
  {
    id: "message-queue",
    term: { uz: "Navbat (queue)", ru: "Очередь (queue)", en: "Message queue" },
    short: {
      uz: "Producer va worker'lar orasidagi bufer: sekin yoki cheklangan ish so'rov yo'lidan chiqib navbatga tushadi va worker'lar uni o'z tezligida bajaradi. Navbat to'lqinni yutadi, ack ish tugagach beriladi.",
      ru: "Буфер между продюсером и воркерами: медленная или ограниченная работа уходит с пути запроса в очередь, и воркеры выполняют её в своём темпе. Очередь гасит пик, а ack дают после работы.",
      en: "A buffer between a producer and workers: slow or limited work leaves the request path and goes into the queue, and workers process it at their own pace. The queue absorbs spikes; ack comes after the work.",
    },
    lesson: "queues",
  },
  {
    id: "dead-letter-queue",
    term: { uz: "Dead-letter navbat", ru: "Dead-letter очередь", en: "Dead-letter queue" },
    short: {
      uz: "Bir necha urinishdan keyin ham ishlanmaydigan zaharli xabar ko'chiriladigan alohida navbat. U asosiy navbatni to'smaydi va kuzatib turiladi.",
      ru: "Отдельная очередь, куда уходит ядовитое сообщение, которое не обработалось после нескольких попыток. Оно не блокирует основную очередь, а за ней следят.",
      en: "A separate queue that receives a poison message after it fails several attempts. It stops blocking the main queue and is watched by people.",
    },
    lesson: "queues",
  },
  {
    id: "backpressure",
    term: { uz: "Backpressure", ru: "Backpressure (обратное давление)", en: "Backpressure" },
    short: {
      uz: "Iste'molchi ulgurmay qolganda producer'ni sekinlatish. Navbat chegaralanadi va cheksiz o'sish o'rniga producer kutadi.",
      ru: "Торможение продюсера, когда потребители не успевают. Очередь ограничена, и вместо бесконечного роста продюсер ждёт.",
      en: "Slowing the producer down when consumers cannot keep up. The queue is bounded, and the producer waits instead of the queue growing without limit.",
    },
    lesson: "queues",
  },
  {
    id: "pub-sub",
    term: { uz: "Pub/sub", ru: "Pub/sub", en: "Pub/sub" },
    short: {
      uz: "Producer hodisani topic'ga bir marta yozadi, har obunachi guruhi uni o'z offset'i bilan o'z tezligida o'qiydi. Sekin yoki o'lik obunachi faqat orqada qoladi, producer'ni to'xtatmaydi.",
      ru: "Продюсер один раз пишет событие в топик, а каждая группа подписчиков читает его в своём темпе по своему офсету. Медленный или упавший подписчик просто отстаёт и не тормозит продюсера.",
      en: "A producer writes an event to a topic once, and each subscriber group reads it at its own pace through its own offset. A slow or dead subscriber only falls behind; it does not stop the producer.",
    },
    lesson: "pubsub",
  },
  {
    id: "consumer-group",
    term: { uz: "Consumer group", ru: "Группа консьюмеров", en: "Consumer group" },
    short: {
      uz: "Bitta obunachining bir nechta nusxasi topic partition'larini bo'lishib oladi, har partition'ni faqat bitta a'zo o'qiydi. Kengaytirish partition sonigacha ishlaydi, tartib esa faqat kalit ichida saqlanadi.",
      ru: "Несколько экземпляров одного подписчика делят партиции топика, и каждую партицию читает ровно один участник. Масштабирование работает до числа партиций, а порядок сохраняется только внутри ключа.",
      en: "Several instances of one subscriber split the topic's partitions, and each partition is read by exactly one member. It scales up to the partition count, and order holds only per key.",
    },
    lesson: "pubsub",
  },
  {
    id: "long-polling",
    term: { uz: "Long polling", ru: "Long polling", en: "Long polling" },
    short: {
      uz: "Klient so'rov yuboradi, server esa yangi narsa paydo bo'lguncha yoki vaqt tugaguncha uni ushlab turadi. Har ikki soniyada so'rashdan arzonroq, lekin har javobdan keyin yangi so'rov kerak.",
      ru: "Клиент шлёт запрос, а сервер держит его, пока не появится новое или не истечёт время. Дешевле, чем спрашивать каждые две секунды, но после каждого ответа нужен новый запрос.",
      en: "The client sends a request and the server holds it until something new appears or a timeout passes. Cheaper than asking every two seconds, but each answer needs a new request.",
    },
    lesson: "realtime",
  },
  {
    id: "websocket",
    term: { uz: "WebSocket", ru: "WebSocket", en: "WebSocket" },
    short: {
      uz: "Klient va server orasidagi bitta doimiy ulanish, ikkala tomon ham istalgan vaqtda xabar yuboradi. Ko'p ochiq ulanishlar alohida gateway qatlamida ushlanadi.",
      ru: "Одно постоянное соединение между клиентом и сервером, по которому обе стороны пишут в любой момент. Множество открытых соединений держит отдельный слой шлюзов.",
      en: "One long-lived connection between client and server where both sides can send at any time. Many open connections are held by a separate gateway layer.",
    },
    lesson: "realtime",
  },

  // ---- reliability ----
  {
    id: "failover",
    term: { uz: "Failover", ru: "Failover", en: "Failover" },
    short: {
      uz: "Asosiy baza o'lganda zaxira replikani primary qilib ko'tarish va ilovani unga yo'naltirish. Avtomatik failover buni odamsiz, soniyalar ichida qiladi.",
      ru: "Когда основная база умирает, резервную реплику повышают до primary и переключают на неё приложение. Автоматический failover делает это без человека за секунды.",
      en: "When the primary database dies, a standby replica is promoted to primary and the app is pointed at it. Automatic failover does this without a human, in seconds.",
    },
    lesson: "redundancy",
  },
  {
    id: "split-brain",
    term: { uz: "Split brain", ru: "Split brain", en: "Split brain" },
    short: {
      uz: "Ikki node bir vaqtda o'zini primary deb hisoblab, ikkalasi ham yozishi. Ma'lumot ikki tomonga ajraladi, shuning uchun eski primary fencing bilan o'rab qo'yiladi.",
      ru: "Два узла одновременно считают себя primary и оба принимают записи. Данные расходятся, поэтому старый primary отсекают через fencing.",
      en: "Two nodes both believe they are the primary and both accept writes. The data drifts apart, so the old primary must be fenced off.",
    },
    lesson: "redundancy",
  },
  {
    id: "rate-limiting",
    term: { uz: "Rate limiting", ru: "Rate limiting (ограничение частоты)", en: "Rate limiting" },
    short: {
      uz: "Bitta klient vaqt birligida qancha so'rov yuborishini cheklash, qolganlarni undan himoya qilish uchun. Limitdan oshganda Retry-After bilan 429 qaytariladi, hisoblagich esa barcha serverlar uchun umumiy bo'ladi.",
      ru: "Ограничение числа запросов одного клиента за единицу времени, чтобы защитить от него остальных. Сверх лимита отвечают 429 с Retry-After, а счётчик общий для всех серверов.",
      en: "Capping how many requests one client may send per unit of time, to protect everyone else. Over the limit the answer is 429 with Retry-After, and the counter is shared by all servers.",
    },
    lesson: "rate-limiting",
  },
  {
    id: "token-bucket",
    term: { uz: "Token bucket", ru: "Token bucket", en: "Token bucket" },
    short: {
      uz: "Har klientda bir xil tezlikda to'ladigan, sig'imi cheklangan token chelagi bor, har so'rov bitta token oladi. Halol to'lqinga ruxsat beradi, o'rtacha tezlikni esa qat'iy ushlaydi.",
      ru: "У каждого клиента есть ведро токенов ограниченной ёмкости, которое пополняется с постоянной скоростью, и каждый запрос берёт один токен. Честные всплески проходят, а средняя скорость держится.",
      en: "Each client has a bucket of limited size refilled at a steady rate, and each request takes one token. Honest bursts fit, while the average rate stays fixed.",
    },
    lesson: "rate-limiting",
  },
  {
    id: "timeout",
    term: { uz: "Timeout", ru: "Таймаут", en: "Timeout" },
    short: {
      uz: "Javobni qancha kutib, keyin voz kechish chegarasi. Timeout'siz bitta sekin servis barcha thread'larni band qilib, hammasini muzlatishi mumkin; qiymat haqiqiy kechikishdan tanlanadi.",
      ru: "Предел ожидания ответа, после которого вызов сдаётся. Без таймаута одна медленная зависимость занимает все потоки и замораживает всё; значение выбирают по реальной задержке.",
      en: "How long to wait for an answer before giving up. Without one, a single slow dependency can tie up every thread and freeze everything; set it from real latency.",
    },
    lesson: "timeouts-retries",
  },
  {
    id: "exponential-backoff",
    term: { uz: "Eksponensial backoff", ru: "Экспоненциальный backoff", en: "Exponential backoff" },
    short: {
      uz: "Har qayta urinishdan oldin kutish vaqti ikki baravar oshadi. Darhol qayta urinishlar yiqilgan servisni bo'ronga ko'mib tashlamaydi.",
      ru: "Перед каждой повторной попыткой пауза удваивается. Мгновенные ретраи не превращаются в шторм, который добивает упавший сервис.",
      en: "The wait before each retry doubles. Instant retries no longer grow into a storm that buries a struggling service.",
    },
    lesson: "timeouts-retries",
  },
  {
    id: "jitter",
    term: { uz: "Jitter", ru: "Jitter (джиттер)", en: "Jitter" },
    short: {
      uz: "Kutish vaqtiga tasodifiy qism qo'shish, shunda ko'p klient bir lahzada qayta urinmaydi. Kesh TTL'lariga ham qo'shiladi, kalitlar birga tugamasligi uchun.",
      ru: "Случайная добавка к паузе, чтобы множество клиентов не повторяли запрос в одно мгновение. Её же добавляют к TTL в кеше, чтобы ключи не истекали разом.",
      en: "A random part added to a wait so that many clients do not retry at the same instant. It is also added to cache TTLs so keys do not expire together.",
    },
    lesson: "timeouts-retries",
  },
  {
    id: "circuit-breaker",
    term: { uz: "Circuit breaker", ru: "Circuit breaker", en: "Circuit breaker" },
    short: {
      uz: "Xatolar ulushi chegaradan oshsa, breaker ochiladi va bir muddat o'lik servisga umuman qo'ng'iroq qilmasdan zaxira javob qaytaradi. Keyin half-open holatda bitta sinov chaqiruvi uni yopish yoki qayta ochishni hal qiladi.",
      ru: "Когда доля ошибок превышает порог, breaker размыкается и на время вообще не вызывает мёртвый сервис, отдавая запасной ответ. Затем в состоянии half-open одна пробная попытка решает, замкнуть его или снова разомкнуть.",
      en: "When the failure rate passes a threshold, the breaker opens and for a while does not call the dead service at all, returning a fallback. Then, half-open, one probe call decides whether it closes or opens again.",
    },
    lesson: "timeouts-retries",
  },
  {
    id: "observability",
    term: { uz: "Observability (log, metrika, trace)", ru: "Observability (логи, метрики, трейсы)", en: "Observability (logs, metrics, traces)" },
    short: {
      uz: "Log nima bo'lganini, metrika qancha va qanchalik tez-tez bo'lganini, trace vaqt qayerga ketganini aytadi. Servislar uchun RED, resurslar uchun USE metrikalari, alert esa o'rtachaga emas, p95 ga.",
      ru: "Логи говорят, что произошло, метрики — сколько и как часто, трейсы — куда ушло время. Для сервисов метрики RED, для ресурсов USE, а алерт ставят на p95, а не на среднее.",
      en: "Logs say what happened, metrics say how much and how often, traces say where the time went. Use RED metrics for services, USE for resources, and alert on p95, not on averages.",
    },
    lesson: "observability",
  },
  {
    id: "distributed-trace",
    term: { uz: "Trace va span", ru: "Трейс и span", en: "Trace and span" },
    short: {
      uz: "Har servis bitta so'rov uchun span yozadi: nima qilgan, qachon boshlagan va qancha davom etgan. Span'lar umumiy trace id orqali bitta daraxtga yig'iladi va sekin qadam ko'rinadi.",
      ru: "Каждый сервис пишет span для запроса: что делал, когда начал и сколько длилось. Span'ы по общему trace id собираются в одно дерево, и медленный шаг становится виден.",
      en: "Each service records a span for a request: what it did, when it started and how long it took. Spans share a trace id and are assembled into one tree, so the slow hop stands out.",
    },
    lesson: "observability",
  },

  // ---- architecture ----
  {
    id: "microservice",
    term: { uz: "Mikroservis", ru: "Микросервис", en: "Microservice" },
    short: {
      uz: "Alohida deploy qilinadigan va o'z ma'lumotiga ega bo'lgan kichik servis; boshqalar unga faqat API yoki hodisa orqali murojaat qiladi. Narxi: tarmoq chaqiruvlari, qisman yiqilish va umumiy tranzaksiyaning yo'qligi, shuning uchun toza monolitdan boshlanadi.",
      ru: "Небольшой сервис со своим деплоем и своими данными; остальные обращаются к нему только через API или события. Цена — сетевые вызовы, частичные отказы и отсутствие общей транзакции, поэтому начинают с чистого монолита.",
      en: "A small service with its own deploys and its own data; others reach it only through its API or events. The cost is network calls, partial failure and no shared transaction, so you start with a clean monolith.",
    },
    lesson: "microservices",
  },
  {
    id: "api-gateway",
    term: { uz: "API gateway", ru: "API gateway", en: "API gateway" },
    short: {
      uz: "Barcha servislar oldidagi bitta kirish eshigi: tokenni tekshiradi, rate limit qo'llaydi, request id qo'shadi va yo'l bo'yicha yo'naltiradi. Ichki tuzilmani klientlardan yashiradi.",
      ru: "Единая входная дверь перед всеми сервисами: проверяет токен, применяет rate limit, добавляет request id и маршрутизирует по пути. Скрывает внутреннее устройство от клиентов.",
      en: "One front door in front of all services: it checks the token, applies rate limits, adds a request id and routes by path. It hides the inside from clients.",
    },
    lesson: "microservices",
  },
  {
    id: "service-discovery",
    term: { uz: "Service discovery", ru: "Service discovery (обнаружение сервисов)", en: "Service discovery" },
    short: {
      uz: "Nusxalar ishga tushganda nomi va manzilini registry'ga yozadi, heartbeat to'xtasa o'chiriladi. Chaqiruvchi manzilni qo'lda emas, registry'dan oladi: o'zi (client-side), load balancer orqali (server-side) yoki DNS orqali.",
      ru: "Экземпляры при старте записывают имя и адрес в реестр и удаляются, когда пропадает heartbeat. Вызывающий берёт адрес не из конфига, а из реестра: сам (client-side), через балансировщик (server-side) или через DNS.",
      en: "Instances write their name and address to a registry on start and are removed when their heartbeat stops. Callers get addresses from the registry, not from config: themselves (client-side), via a load balancer (server-side) or via DNS.",
    },
    lesson: "service-discovery",
  },
  {
    id: "two-phase-commit",
    term: { uz: "Ikki fazali commit (2PC)", ru: "Двухфазный коммит (2PC)", en: "Two-phase commit (2PC)" },
    short: {
      uz: "Koordinator avval hamma ishtirokchidan prepare va ovoz so'raydi, hamma \"ha\" desa commit yuboradi. Ishtirokchilar butun davomida qulf ushlaydi va koordinator yiqilsa osilib qoladi, shuning uchun undan qochishadi.",
      ru: "Координатор сначала просит всех участников подготовиться и проголосовать, и только если все «за», рассылает commit. Участники всё это время держат блокировки и зависают, если координатор упал, поэтому 2PC избегают.",
      en: "A coordinator first asks every participant to prepare and vote, and sends commit only if all vote yes. Participants hold locks the whole time and get stuck if the coordinator dies, so teams avoid it.",
    },
    lesson: "sagas",
  },
  {
    id: "saga",
    term: { uz: "Saga", ru: "Сага", en: "Saga" },
    short: {
      uz: "Bir nechta servisdagi ish lokal tranzaksiyalar zanjiri sifatida bajariladi, har qadamning kompensatsiyasi bor. Biror qadam yiqilsa, oldingi qadamlar kompensatsiya bilan qaytariladi; zanjirni orkestrator yoki hodisalar (xoreografiya) boshqaradi.",
      ru: "Работа через несколько сервисов идёт цепочкой локальных транзакций, у каждого шага есть компенсация. Если шаг упал, предыдущие отменяются компенсирующими действиями; цепочкой управляет оркестратор или события (хореография).",
      en: "Work across several services runs as a chain of local transactions, each with a compensating action. If a step fails, earlier steps are undone by their compensations; an orchestrator or events (choreography) drive the chain.",
    },
    lesson: "sagas",
  },
  {
    id: "outbox",
    term: { uz: "Outbox", ru: "Outbox", en: "Outbox" },
    short: {
      uz: "Servis ma'lumotni ham, hodisani ham bitta lokal tranzaksiyada outbox jadvaliga yozadi, alohida relay esa hodisani broker'ga yuboradi. Hodisa kechikishi mumkin, lekin endi yo'qolmaydi.",
      ru: "Сервис пишет данные и событие в таблицу outbox одной локальной транзакцией, а отдельный relay публикует событие в брокер. Событие может опоздать, но больше не потеряется.",
      en: "A service writes the data and the event into an outbox table in one local transaction, and a separate relay publishes the event to the broker. The event can be late, but it can no longer be lost.",
    },
    lesson: "sagas",
  },
  {
    id: "at-least-once",
    term: { uz: "At-least-once yetkazish", ru: "Доставка at-least-once", en: "At-least-once delivery" },
    short: {
      uz: "Xabar kamida bir marta yetkaziladi, ba'zan esa ikki marta. Shuning uchun iste'molchi takrorni event_id bo'yicha tashlaydi yoki idempotent yozadi.",
      ru: "Сообщение доставляется минимум один раз, а иногда дважды. Поэтому потребитель отбрасывает дубли по event_id или пишет идемпотентно.",
      en: "A message is delivered at least once, and sometimes twice. So consumers drop duplicates by event_id or write idempotently.",
    },
    lesson: "sagas",
  },
  {
    id: "stream-processing",
    term: { uz: "Batch va stream", ru: "Batch и stream", en: "Batch vs stream" },
    short: {
      uz: "Batch job ma'lumotni davriy, masalan har kecha bir yo'la ishlaydi: oddiy va qayta yurgizsa bo'ladi, lekin kechikadi. Stream hodisalarni kelishi bilan oynalar bo'yicha sanaydi: yangi, lekin murakkabroq.",
      ru: "Batch-джоб обрабатывает данные пачкой по расписанию, например каждую ночь: просто и перезапускаемо, но с опозданием. Стрим считает события по мере прихода в окнах: свежо, но сложнее.",
      en: "A batch job processes data in bulk on a schedule, such as nightly: simple and rerunnable, but late. A stream counts events in windows as they arrive: fresh, but harder.",
    },
    lesson: "batch-stream",
  },
  {
    id: "watermark",
    term: { uz: "Watermark", ru: "Watermark", en: "Watermark" },
    short: {
      uz: "Stream processor kech kelgan hodisalarni qancha kutishini hal qiladigan belgi: ko'rilgan eng yangi event time minus ruxsat etilgan kechikish. Oyna watermark uning oxiridan o'tgandagina yakuniy bo'ladi, undan kechroqlari side output'ga ketadi.",
      ru: "Метка, которая решает, сколько стрим-процессор ждёт опоздавшие события: самое новое увиденное event time минус допустимое опоздание. Окно становится окончательным, когда watermark проходит его конец, а ещё более поздние идут в side output.",
      en: "A marker that decides how long a stream processor waits for late events: the newest event time seen minus the allowed lateness. A window is final only once the watermark passes its end; later events go to a side output.",
    },
    lesson: "batch-stream",
  },

  {
    id: "row-level-security",
    term: { uz: "Row-level security", ru: "Row-level security (RLS)", en: "Row-level security" },
    short: {
      uz: "Jadvaldagi har so'rovga joriy tenant kabi shart qo'shadigan baza policy'si: so'rov filtrni unutsa ham boshqa tenant qatorlari ko'rinmaydi.",
      ru: "Политика базы, которая добавляет к каждому запросу к таблице условие вроде текущего тенанта, так что чужие строки не видны, даже если запрос забыл фильтр.",
      en: "A database policy that adds a condition such as the current tenant to every query on a table, so rows of other tenants stay invisible even when a query forgets the filter.",
    },
    lesson: "multi-tenancy",
  },
  {
    id: "noisy-neighbour",
    term: { uz: "Shovqinli qo'shni", ru: "Шумный сосед", en: "Noisy neighbour" },
    short: {
      uz: "Umumiy tizimdagi bitta tenant CPU, disk yoki ulanishlarni shunchalik ko'p ishlatadiki, qolgan hamma tenant sekinlashadi.",
      ru: "Один тенант в общей системе забирает столько CPU, диска или соединений, что тормозят все остальные.",
      en: "One tenant in a shared system using so much CPU, disk or connections that every other tenant slows down.",
    },
    lesson: "multi-tenancy",
  },
  {
    id: "pool-silo-bridge",
    term: { uz: "Pool, silo va bridge", ru: "Pool, silo и bridge", en: "Pool, silo and bridge" },
    short: {
      uz: "Tenant izolyatsiyasi modellari: hamma resursni bo'lishadi (pool), tenant o'zinikini oladi (silo) yoki kod umumiy, ma'lumot alohida aralashma (bridge).",
      ru: "Модели изоляции тенантов: все делят ресурсы (pool), тенант получает свои (silo) или смесь с общим кодом и раздельными данными (bridge).",
      en: "Tenant isolation models: all tenants share resources (pool), a tenant gets its own (silo), or a mix with shared code and separate data (bridge).",
    },
    lesson: "multi-tenancy",
  },
  {
    id: "event-sourcing",
    term: { uz: "Event sourcing", ru: "Event sourcing", en: "Event sourcing" },
    short: {
      uz: "Har o'zgarishni versiyali stream'da o'zgarmas hodisa sifatida saqlash va joriy holatni shu hodisalarni qayta o'ynab hisoblash.",
      ru: "Хранение каждого изменения как неизменяемого события в потоке с версией; текущее состояние вычисляется проигрыванием событий.",
      en: "Storing every change as an immutable event in a versioned stream and computing current state by replaying those events.",
    },
    lesson: "event-sourcing",
  },
  {
    id: "cqrs",
    term: { uz: "CQRS", ru: "CQRS", en: "CQRS" },
    short: {
      uz: "Yozuv modelini so'rovlar uchun qurilgan va odatda biroz kechikadigan read model'lardan ajratish.",
      ru: "Разделение модели записи и read-моделей, построенных под запросы и обычно немного отстающих.",
      en: "Separating the write model from read models that are built for queries and usually lag slightly behind.",
    },
    lesson: "event-sourcing",
  },
  {
    id: "crypto-shredding",
    term: { uz: "Crypto-shredding", ru: "Crypto-shredding", en: "Crypto-shredding" },
    short: {
      uz: "O'chirib bo'lmaydigan ma'lumotni, masalan hodisa yoki zaxirani, u shifrlangan har subyekt kalitini yo'q qilib o'chirish.",
      ru: "Удаление данных, которые нельзя стереть (события, бэкапы), уничтожением ключа субъекта, которым они зашифрованы.",
      en: "Erasing data that cannot be deleted, such as events or backups, by destroying the per-subject key it was encrypted with.",
    },
    lesson: "event-sourcing",
  },
  // ---- security ----
  {
    id: "password-hashing",
    term: { uz: "Parol hash'i (tuz bilan)", ru: "Хеш пароля с солью", en: "Password hashing (salted)" },
    short: {
      uz: "Parol o'zi emas, har foydalanuvchi uchun tasodifiy tuz qo'shilgan sekin hash (argon2id yoki bcrypt) saqlanadi. Login sezilmas darajada sekinlashadi, sizib chiqqan bazani buzish esa millionlab marta qiyinlashadi.",
      ru: "Хранят не сам пароль, а медленный хеш (argon2id или bcrypt) со случайной солью для каждого пользователя. Вход замедляется незаметно, а взлом утёкшей базы становится в миллионы раз дороже.",
      en: "Store a slow hash (argon2id or bcrypt) with a random salt per user, never the password itself. Login gets slower by an unnoticeable amount, while cracking a leaked table becomes millions of times harder.",
    },
    lesson: "authentication",
  },
  {
    id: "jwt",
    term: { uz: "JWT", ru: "JWT", en: "JWT" },
    short: {
      uz: "Istalgan servis bazaga so'ramasdan tekshira oladigan imzolangan token. Uni darhol bekor qilib bo'lmaydi, shuning uchun access token qisqa muddatli bo'ladi va refresh token bilan juftlanadi.",
      ru: "Подписанный токен, который любой сервис проверит без похода в базу. Мгновенно отозвать его нельзя, поэтому access-токен делают коротким и дополняют refresh-токеном.",
      en: "A signed token that any service can verify without a database lookup. It cannot be revoked instantly, so the access token is kept short-lived and paired with a refresh token.",
    },
    lesson: "authentication",
  },
  {
    id: "oauth-oidc",
    term: { uz: "OAuth2 / OIDC", ru: "OAuth2 / OIDC", en: "OAuth2 / OIDC" },
    short: {
      uz: "Foydalanuvchi identity provider'da kiradi va bir martalik code bilan qaytadi, API uni serverdan serverga id token'ga almashtiradi. Ilova parolni umuman ko'rmaydi.",
      ru: "Пользователь входит у провайдера идентификации и возвращается с одноразовым code, который API обменивает сервер-сервер на id token. Приложение вообще не видит пароль.",
      en: "The user logs in at an identity provider and comes back with a one-time code, which the API exchanges server-to-server for an id token. The app never sees the password.",
    },
    lesson: "authentication",
  },
  {
    id: "rbac",
    term: { uz: "RBAC va ABAC", ru: "RBAC и ABAC", en: "RBAC and ABAC" },
    short: {
      uz: "RBAC ruxsatni rolga qarab beradi, ABAC esa foydalanuvchi, resurs va kontekst atributlari haqidagi qoidalar bilan. Ikkalasi ham bitta joydagi bitta siyosatda, standart javob — rad.",
      ru: "RBAC выдаёт права по ролям, ABAC — по правилам об атрибутах пользователя, ресурса и контекста. Оба живут в одной политике в одном месте, по умолчанию — отказ.",
      en: "RBAC grants permissions by role, ABAC by rules about attributes of the user, the resource and the context. Both live in one policy in one place, denying by default.",
    },
    lesson: "authorization",
  },
  {
    id: "tls",
    term: { uz: "TLS", ru: "TLS", en: "TLS" },
    short: {
      uz: "Ulanishni shifrlaydigan protokol: handshake'da tomonlar umumiy kalit kelishadi, server esa sertifikat bilan shaxsini isbotlaydi. Sertifikat o'zi yangilanib turishi kerak, aks holda yarim tunda eskiradi.",
      ru: "Протокол шифрования соединения: при рукопожатии стороны договариваются об общем ключе, а сервер доказывает личность сертификатом. Сертификаты должны продлеваться сами, иначе истекут в полночь.",
      en: "The protocol that encrypts a connection: in the handshake both sides agree on a shared key and the server proves its identity with a certificate. Certificates must renew themselves or they expire at midnight.",
    },
    lesson: "encryption",
  },
  {
    id: "encryption-at-rest",
    term: { uz: "Diskda shifrlash (at rest)", ru: "Шифрование на диске (at rest)", en: "Encryption at rest" },
    short: {
      uz: "Ma'lumot bazaga yozilishdan oldin shifrlanadi, shunda disk va backup'larda faqat shifrlangan matn qoladi. Kalit ma'lumot yonida tursa, bu hech narsani himoya qilmaydi.",
      ru: "Данные шифруют до записи в базу, и на дисках и в бэкапах остаётся только шифртекст. Если ключ лежит рядом с данными, это ничего не защищает.",
      en: "Data is encrypted before it is written, so disks and backups hold only ciphertext. If the key sits next to the data, this protects nothing.",
    },
    lesson: "encryption",
  },
  {
    id: "envelope-encryption",
    term: { uz: "Envelope shifrlash (KMS)", ru: "Envelope-шифрование (KMS)", en: "Envelope encryption (KMS)" },
    short: {
      uz: "Har yozuv o'z data key'i bilan shifrlanadi, data key esa KMS'dan chiqmaydigan master key bilan o'raladi. Bazada faqat o'ralgan kalit saqlanadi; kalitni almashtirish ma'lumotni emas, kalitlarni qayta o'rashni talab qiladi.",
      ru: "Каждую запись шифруют своим data key, а data key заворачивают master key, который не покидает KMS. В базе лежит только завёрнутый ключ, а ротация требует перезавернуть ключи, а не перешифровать данные.",
      en: "Each record is encrypted with its own data key, and the data key is wrapped by a master key that never leaves the KMS. Only the wrapped key is stored, and rotation re-wraps keys instead of re-encrypting data.",
    },
    lesson: "encryption",
  },

  {
    id: "secrets-manager",
    term: { uz: "Secrets manager", ru: "Менеджер секретов", en: "Secrets manager" },
    short: {
      uz: "Secret'larni saqlaydigan, so'rovchini tekshiradigan va faqat unga ruxsat etilganini beradigan, har o'qishni auditga yozadigan servis.",
      ru: "Сервис, который хранит секреты, проверяет вызывающего и отдаёт только разрешённое ему, записывая каждое чтение в аудит.",
      en: "A service that stores secrets, checks who is asking and returns only what that caller may read, auditing every read.",
    },
    lesson: "secrets-management",
  },
  {
    id: "dynamic-credentials",
    term: { uz: "Dinamik login", ru: "Динамические доступы", en: "Dynamic credentials" },
    short: {
      uz: "So'rov paytida servisga alohida yaratiladigan, lease tugashi bilan o'chiriladigan baza foydalanuvchisi yoki kalit.",
      ru: "Пользователь БД или ключ, который создаётся для конкретного сервиса по запросу и удаляется по истечении lease.",
      en: "A database user or key created per service on request and deleted when its lease expires.",
    },
    lesson: "secrets-management",
  },
  {
    id: "workload-identity",
    term: { uz: "Workload identity", ru: "Workload identity", en: "Workload identity" },
    short: {
      uz: "Platforma servisga beradigan imzolangan qisqa muddatli token: servis saqlangan secret'siz o'zini isbotlaydi.",
      ru: "Подписанный короткоживущий токен, который платформа выдаёт сервису, чтобы тот доказал, кто он, без хранимого секрета.",
      en: "A signed, short-lived token the platform gives a service so it can prove who it is without a stored secret.",
    },
    lesson: "secrets-management",
  },
  // ---- shipping ----
  {
    id: "continuous-integration",
    term: { uz: "CI/CD", ru: "CI/CD", en: "CI/CD" },
    short: {
      uz: "CI har commit'ni bir marta build va test qilib, bitta o'zgarmas artefakt chiqaradi; faqat yashil build deploy bo'ladi. Deploy kichik, avtomatik va oson qaytariladigan bo'ladi.",
      ru: "CI собирает и тестирует каждый коммит один раз и выпускает один неизменяемый артефакт; деплоится только зелёная сборка. Деплой становится маленьким, автоматическим и легко откатываемым.",
      en: "CI builds and tests every commit once and produces one immutable artifact; only green builds deploy. Deploys become small, automatic and easy to undo.",
    },
    lesson: "cicd",
  },
  {
    id: "blue-green",
    term: { uz: "Blue-green deploy", ru: "Blue-green деплой", en: "Blue-green deploy" },
    short: {
      uz: "Ikki to'liq server to'plami: yangi versiya bo'sh to'plamga chiqadi va balancer trafikni bir qadamda o'tkazadi. Orqaga qaytish soniyadan kam, narxi esa ikki baravar server.",
      ru: "Два полных набора серверов: новая версия ставится на свободный, и балансировщик переключает трафик одним шагом. Откат занимает меньше секунды, цена — вдвое больше серверов.",
      en: "Two full sets of servers: the new version goes to the idle set and the load balancer moves all traffic in one step. Rollback takes under a second; the cost is twice the servers.",
    },
    lesson: "cicd",
  },
  {
    id: "canary",
    term: { uz: "Canary deploy", ru: "Canary-деплой", en: "Canary deploy" },
    short: {
      uz: "Yangi versiya avval trafikning kichik qismiga, masalan 5% iga beriladi va xato darajasi eski versiya bilan solishtiriladi. Yomon release ozchilikka tegadi va qoida uni o'zi orqaga qaytaradi.",
      ru: "Новая версия сначала получает малую долю трафика, например 5%, и её уровень ошибок сравнивают со старой. Плохой релиз задевает немногих, и правило откатывает его само.",
      en: "The new version first gets a small share of traffic, such as 5%, and its error rate is compared with the old one. A bad release reaches few users, and a rule rolls it back by itself.",
    },
    lesson: "cicd",
  },
  {
    id: "feature-flag",
    term: { uz: "Feature flag", ru: "Feature flag", en: "Feature flag" },
    short: {
      uz: "Kod prod'ga o'chirilgan holda chiqadi va flag orqali avval xodimlarga, keyin foydalanuvchilarning bir qismiga yoqiladi. Muammo bo'lsa flag bir soniyada o'chiriladi: deploy bu hali release emas.",
      ru: "Код уходит в прод выключенным и через флаг включается сначала для сотрудников, затем для части пользователей. При проблеме флаг гасят за секунду: деплой — это ещё не релиз.",
      en: "Code ships to production switched off and a flag turns it on for staff, then for a share of users. If it misbehaves, the flag goes off in a second: deploy is not release.",
    },
    lesson: "cicd",
  },

  {
    id: "kill-switch",
    term: { uz: "Kill switch", ru: "Kill switch", en: "Kill switch" },
    short: {
      uz: "Feature'ni deploy'siz, soniyalar ichida hamma uchun o'chiradigan flag.",
      ru: "Флаг, который выключает фичу для всех за секунды, без деплоя.",
      en: "A flag that turns a feature off for everyone within seconds, without a deploy.",
    },
    lesson: "feature-flags",
  },
  {
    id: "percentage-rollout",
    term: { uz: "Foizli rollout", ru: "Процентная раскатка", en: "Percentage rollout" },
    short: {
      uz: "Feature user id'ning barqaror hash'i bo'yicha foydalanuvchilarning bir ulushiga yoqiladi, har kim doim bir xil javob oladi.",
      ru: "Фича включается для доли пользователей по стабильному хэшу user id, и каждый всегда получает один и тот же ответ.",
      en: "A feature turned on for a share of users by a stable hash of the user id, so each user always gets the same answer.",
    },
    lesson: "feature-flags",
  },
  {
    id: "guardrail-metric",
    term: { uz: "Guardrail metrikasi", ru: "Guardrail-метрика", en: "Guardrail metric" },
    short: {
      uz: "Rollout paytida flag yoniq va o'chiq guruhlar solishtiriladigan, chegaradan oshsa flag'ni avtomatik o'chiradigan metrika.",
      ru: "Метрика, по которой во время раскатки сравнивают группы с флагом и без, и при превышении лимита флаг выключается автоматически.",
      en: "A metric compared between flag-on and flag-off users during a rollout; crossing its limit turns the flag off automatically.",
    },
    lesson: "feature-flags",
  },
  // ---- systems ----
  {
    id: "base62",
    term: { uz: "Base62 kod", ru: "Base62-код", en: "Base62 code" },
    short: {
      uz: "Har havolaga noyob raqam berib, uni harf va raqamlardan iborat qisqa kodga aylantirish. Har xil raqam doim har xil kod beradi, shuning uchun hash kabi to'qnashuv bo'lmaydi.",
      ru: "Каждой ссылке дают уникальный номер и кодируют его в короткую строку из букв и цифр. Разные номера всегда дают разные коды, поэтому коллизий, как у хеша, не бывает.",
      en: "Give every link a unique number and encode it as a short string of letters and digits. Different numbers always give different codes, so there are no collisions as with hashing.",
    },
    lesson: "design-url-shortener",
  },
  {
    id: "fan-out",
    term: { uz: "Fan-out (on write / on read)", ru: "Fan-out (on write / on read)", en: "Fan-out (on write / on read)" },
    short: {
      uz: "Fan-out on write post yozilganda uning id'sini har obunachining lenta keshiga qo'yadi, fan-out on read esa lentani ochilganda yig'adi. Ko'pchilikka push, juda mashhur akkauntlarga pull ishlatiladigan gibrid eng yaxshi ishlaydi.",
      ru: "Fan-out on write при публикации кладёт id поста в кеш ленты каждого подписчика, а fan-out on read собирает ленту при открытии. Лучше всего работает гибрид: push для большинства, pull для звёзд.",
      en: "Fan-out on write pushes a new post's id into every follower's feed cache at posting time; fan-out on read builds the feed when it is opened. A hybrid works best: push for most, pull for huge accounts.",
    },
    lesson: "design-news-feed",
  },
  {
    id: "trie",
    term: { uz: "Trie (prefiks daraxti)", ru: "Trie (префиксное дерево)", en: "Trie (prefix tree)" },
    short: {
      uz: "Har prefiksga bitta tugun bo'lgan daraxt; qidiruv narxi yozilgan harflar soniga bog'liq, ma'lumot hajmiga emas.",
      ru: "Дерево с узлом на каждый префикс; цена поиска зависит от длины префикса, а не от объёма данных.",
      en: "A tree with one node per prefix; lookup cost depends on the prefix length, not on how much data there is.",
    },
    lesson: "design-search-autocomplete",
  },
  {
    id: "top-k",
    term: { uz: "Top-k", ru: "Top-k", en: "Top-k" },
    short: {
      uz: "Eng yaxshi k ta natijaning oldindan hisoblab qo'yilgan ro'yxati, so'rov paytida saralashga hojat qolmaydi.",
      ru: "Заранее посчитанный список k лучших результатов, чтобы не сортировать во время запроса.",
      en: "A precomputed list of the k best results, so nothing has to be sorted at request time.",
    },
    lesson: "design-search-autocomplete",
  },
  {
    id: "debounce",
    term: { uz: "Debounce", ru: "Debounce", en: "Debounce" },
    short: {
      uz: "Oxirgi hodisadan keyin qisqa pauzani kutib, faqat keyin so'rov yuborish; tez bosishlar bitta so'rovga aylanadi.",
      ru: "Отправлять запрос только после короткой паузы с последнего события, так серия быстрых нажатий даёт один запрос.",
      en: "Send the request only after a short pause since the last event, so a burst of keystrokes becomes one request.",
    },
    lesson: "design-search-autocomplete",
  },
  {
    id: "skip-locked",
    term: { uz: "SKIP LOCKED", ru: "SKIP LOCKED", en: "SKIP LOCKED" },
    short: {
      uz: "FOR UPDATE ga qo'shimcha: boshqa tranzaksiya qulflagan qatorlarni kutmasdan o'tkazib yuboradi, worker'lar bir-birini to'smaydi.",
      ru: "Добавка к FOR UPDATE: пропускает строки, заблокированные другой транзакцией, вместо ожидания, и воркеры не мешают друг другу.",
      en: "An addition to FOR UPDATE that skips rows another transaction has locked instead of waiting, so workers never block each other.",
    },
    lesson: "design-job-scheduler",
  },
  {
    id: "lease",
    term: { uz: "Lease (ijara muddati)", ru: "Лиз (lease)", en: "Lease" },
    short: {
      uz: "Ishga vaqtincha egalik huquqi; egasi heartbeat bilan yangilab turmasa, muddati tugaydi va ish boshqasiga o'tadi.",
      ru: "Временное право владеть задачей; если владелец не продлевает его heartbeat-ом, оно истекает и задача переходит к другому.",
      en: "A time-limited claim on a job that expires unless the owner renews it with heartbeats, so a dead worker's job is handed to another.",
    },
    lesson: "design-job-scheduler",
  },
  {
    id: "time-partition",
    term: { uz: "Vaqt bo'yicha partitsiya", ru: "Партиции по времени", en: "Time partitioning" },
    short: {
      uz: "Jadvalni soat yoki kun bo'yicha bo'laklarga ajratish; so'rovlar faqat joriy bo'lakka tegadi, eskisi butunlay o'chiriladi.",
      ru: "Деление таблицы на куски по часу или дню; запросы трогают только текущий кусок, старые удаляются целиком.",
      en: "Splitting a table into hourly or daily pieces; queries touch only the current piece and old pieces are dropped whole.",
    },
    lesson: "design-job-scheduler",
  },
  // ---- terms from earlier lessons ----
  {
    id: "sse",
    term: { uz: "Server-Sent Events (SSE)", ru: "Server-Sent Events (SSE)", en: "Server-Sent Events (SSE)" },
    short: {
      uz: "Server bitta ochiq HTTP javob orqali mijozga hodisalarni ketma-ket yuborib turadi. Faqat bir tomonlama (serverdan mijozga), lekin oddiy HTTP ustida ishlaydi va uzilsa o'zi qayta ulanadi.",
      ru: "Сервер по одному открытому HTTP-ответу шлёт клиенту события одно за другим. Связь только в одну сторону (от сервера к клиенту), зато это обычный HTTP, и после обрыва браузер переподключается сам.",
      en: "The server keeps one HTTP response open and pushes events down it one after another. It is one-way (server to client), but it is plain HTTP and the browser reconnects by itself after a drop.",
    },
    lesson: "realtime",
  },
  {
    id: "idor",
    term: { uz: "IDOR (begona obyektga to'g'ridan murojaat)", ru: "IDOR (прямой доступ к чужому объекту)", en: "IDOR (insecure direct object reference)" },
    short: {
      uz: "Server so'rovdagi id bo'yicha yozuvni qaytaradi, lekin u shu foydalanuvchiniki ekanini tekshirmaydi. URL'dagi raqamni o'zgartirib, begona buyurtma yoki hujjatni ochish mumkin bo'lib qoladi.",
      ru: "Сервер отдаёт запись по id из запроса, но не проверяет, что она принадлежит этому пользователю. Поменяв число в URL, можно открыть чужой заказ или документ.",
      en: "The server returns a record by the id in the request but never checks that it belongs to this user. Changing a number in the URL opens someone else's order or document.",
    },
    lesson: "authorization",
  },
  {
    id: "refresh-token",
    term: { uz: "Refresh token", ru: "Refresh-токен", en: "Refresh token" },
    short: {
      uz: "Qisqa yashaydigan access token tugaganda yangisini olish uchun ishlatiladigan uzoq muddatli token. U faqat auth serverga yuboriladi, har ishlatilganda almashtiriladi va o'g'irlansa bekor qilinadi.",
      ru: "Долгоживущий токен, которым получают новый короткий access-токен, когда старый истёк. Его шлют только серверу авторизации, меняют при каждом использовании и отзывают при краже.",
      en: "A long-lived token used to get a new short-lived access token when the old one expires. It goes only to the auth server, is rotated on every use and can be revoked if stolen.",
    },
    lesson: "authentication",
  },
  {
    id: "visibility-timeout",
    term: { uz: "Visibility timeout (lease)", ru: "Visibility timeout (аренда сообщения)", en: "Visibility timeout (lease)" },
    short: {
      uz: "Navbat xabarni worker'ga berganda uni o'chirmaydi, shu vaqtga boshqalardan yashiradi. Worker vaqt ichida ack bermasa, xabar yana ko'rinadi va boshqa worker'ga ketadi.",
      ru: "Выдав сообщение воркеру, очередь не удаляет его, а прячет от остальных на это время. Если воркер не подтвердит обработку вовремя, сообщение снова становится видимым и уходит другому.",
      en: "When a queue hands a message to a worker it does not delete it, it hides it from others for this long. If the worker does not ack in time, the message becomes visible again and goes to another worker.",
    },
    lesson: "queues",
  },
  // ---- data: bloom filter, geo ----
  {
    id: "bloom-filter",
    term: { uz: "Bloom filtr", ru: "Фильтр Блума", en: "Bloom filter" },
    short: {
      uz: "Bit massivi va bir nechta hash: \"bu kalit to'plamda yo'q\" deganida doim to'g'ri, \"bor bo'lishi mumkin\" deganida esa ba'zan xato qiladi. Kalitiga 10 bit va 7 hash bilan xato taxminan 1% bo'ladi, oddiy filtrdan kalitni o'chirib bo'lmaydi.",
      ru: "Битовый массив и несколько хешей: ответ «ключа точно нет» всегда верен, а «возможно, есть» иногда ошибочен. При 10 битах на ключ и 7 хешах ошибка около 1%, удалить ключ из обычного фильтра нельзя.",
      en: "A bit array plus several hashes: \"this key is definitely not here\" is always right, \"it might be here\" is sometimes wrong. With 10 bits per key and 7 hashes the error is about 1%, and a plain filter cannot delete a key.",
    },
    lesson: "bloom-filter",
  },
  {
    id: "geohash",
    term: { uz: "Geohash", ru: "Geohash", en: "Geohash" },
    short: {
      uz: "Kenglik va uzunlikni bitta qisqa satrga aylantirish: umumiy prefiksi uzun nuqtalar odatda yaqin turadi. Yaqin atrofni qidirishda kerakli katak va uning 8 qo'shnisi so'raladi, chunki yaqin nuqta chegaraning narigi tomonida bo'lishi mumkin.",
      ru: "Широта и долгота кодируются одной короткой строкой: точки с длинным общим префиксом обычно рядом. При поиске поблизости запрашивают нужную ячейку и 8 соседних, ведь близкая точка может оказаться за границей ячейки.",
      en: "Latitude and longitude encoded as one short string: points sharing a long prefix are usually close. A nearby search asks for the cell and its 8 neighbours, because a close point can sit just across a cell border.",
    },
    lesson: "geo-search",
  },
  {
    id: "quadtree",
    term: { uz: "Quadtree", ru: "Квадродерево (quadtree)", en: "Quadtree" },
    short: {
      uz: "Xaritani to'rtta kvadratga, to'lib qolgan kvadratni yana to'rttaga bo'ladigan daraxt. Shahar markazida kataklar mayda, cho'lda yirik bo'ladi, shuning uchun har katakda nuqtalar soni taxminan teng qoladi.",
      ru: "Дерево, которое делит карту на четыре квадрата, а переполненный квадрат снова на четыре. В центре города ячейки мелкие, в пустыне крупные, поэтому точек в каждой ячейке примерно поровну.",
      en: "A tree that splits the map into four squares and splits any crowded square into four again. Cells are small in a city centre and large in a desert, so each cell holds roughly the same number of points.",
    },
    lesson: "geo-search",
  },
  // ---- communication: webhooks ----
  {
    id: "webhook",
    term: { uz: "Webhook", ru: "Вебхук (webhook)", en: "Webhook" },
    short: {
      uz: "Hodisa sodir bo'lganda bir tizim boshqasining URL'iga o'zi HTTP POST yuboradi. Yetkazish kamida bir marta: yuboruvchi backoff bilan qayta urinadi, qabul qiluvchi esa takrorni hodisa id'si bo'yicha tashlaydi.",
      ru: "Когда происходит событие, одна система сама шлёт HTTP POST на URL другой. Доставка как минимум один раз: отправитель повторяет с backoff, а получатель отбрасывает дубли по id события.",
      en: "When an event happens, one system sends an HTTP POST to another system's URL on its own. Delivery is at least once: the sender retries with backoff and the receiver drops repeats by event id.",
    },
    lesson: "webhooks",
  },
  {
    id: "hmac-signature",
    term: { uz: "HMAC imzo", ru: "HMAC-подпись", en: "HMAC signature" },
    short: {
      uz: "Xabar tanasi va vaqt belgisi umumiy sir bilan hash qilinadi va sarlavhada yuboriladi. Qabul qiluvchi xuddi shunday hisoblab solishtiradi: mos kelmasa yoki vaqt eski bo'lsa, so'rov rad etiladi.",
      ru: "Тело сообщения и метка времени хешируются общим секретом, результат идёт в заголовке. Получатель считает так же и сравнивает: не совпало или метка старая — запрос отклоняется.",
      en: "The message body and a timestamp are hashed with a shared secret and sent in a header. The receiver computes the same and compares: a mismatch or an old timestamp means the request is rejected.",
    },
    lesson: "webhooks",
  },
  // ---- reliability: SLO ----
  {
    id: "sli",
    term: { uz: "SLI (xizmat darajasi ko'rsatkichi)", ru: "SLI (индикатор уровня сервиса)", en: "SLI (service level indicator)" },
    short: {
      uz: "Foydalanuvchi sezadigan narsaning o'lchovi: yaxshi so'rovlar ulushi yoki ma'lum vaqtdan tez tugaganlar ulushi. Masalan, \"300 ms dan tez va xatosiz javoblar foizi\".",
      ru: "Измерение того, что чувствует пользователь: доля хороших запросов или доля уложившихся в заданное время. Например, «процент ответов без ошибки и быстрее 300 мс».",
      en: "A measure of what users feel: the share of good requests, or of requests faster than a threshold. For example, \"the percentage of answers without error and under 300 ms\".",
    },
    lesson: "slo-error-budget",
  },
  {
    id: "slo",
    term: { uz: "SLO (xizmat darajasi maqsadi)", ru: "SLO (цель уровня сервиса)", en: "SLO (service level objective)" },
    short: {
      uz: "SLI uchun ichki maqsad va davr: \"28 kunda so'rovlarning 99,9% i yaxshi\". 100% maqsad qilinmaydi: har bir qo'shimcha to'qqiz narxi keskin oshadi, foydalanuvchi esa farqni sezmaydi.",
      ru: "Внутренняя цель для SLI и окно: «за 28 дней 99,9% запросов хорошие». 100% не ставят: каждая следующая девятка резко дороже, а пользователь разницы не заметит.",
      en: "An internal target for an SLI over a window: \"99.9% of requests are good over 28 days\". Nobody targets 100%: each extra nine costs far more and users would not notice.",
    },
    lesson: "slo-error-budget",
  },
  {
    id: "sla",
    term: { uz: "SLA (xizmat darajasi shartnomasi)", ru: "SLA (соглашение об уровне сервиса)", en: "SLA (service level agreement)" },
    short: {
      uz: "Mijoz bilan shartnomadagi va'da: buzilsa pul qaytariladi yoki chegirma beriladi. Odatda ichki SLO'dan yumshoqroq qo'yiladi, toki jamoa shartnoma buzilishidan oldin xabar topsin.",
      ru: "Обещание в договоре с клиентом: при нарушении возвращают деньги или дают скидку. Его ставят мягче внутреннего SLO, чтобы команда узнала о проблеме раньше, чем нарушится договор.",
      en: "A promise in a contract with a customer: breaking it means a refund or credit. It is set looser than the internal SLO, so the team hears about trouble before the contract is broken.",
    },
    lesson: "slo-error-budget",
  },
  {
    id: "error-budget",
    term: { uz: "Xato byudjeti (error budget)", ru: "Бюджет ошибок (error budget)", en: "Error budget" },
    short: {
      uz: "SLO ruxsat bergan yomon so'rovlar ulushi: 99,9% da 0,1%, ya'ni 30 kunda taxminan 43 daqiqa to'liq uzilish. Byudjet qolsa reliz chiqariladi, tugasa relizlar to'xtatilib ishonchlilikka ishlanadi.",
      ru: "Доля плохих запросов, которую разрешает SLO: при 99,9% это 0,1%, то есть около 43 минут полного простоя за 30 дней. Пока бюджет есть, выпускают релизы; кончился — релизы замораживают и чинят надёжность.",
      en: "The share of bad requests an SLO allows: at 99.9% it is 0.1%, about 43 minutes of full outage in 30 days. While budget is left you ship; when it runs out, releases freeze and reliability work comes first.",
    },
    lesson: "slo-error-budget",
  },
  {
    id: "burn-rate",
    term: { uz: "Yonish tezligi (burn rate)", ru: "Скорость сжигания (burn rate)", en: "Burn rate" },
    short: {
      uz: "Xato byudjeti me'yordan necha barobar tez sarflanayotgani: 1 — davr oxirida aynan tugaydi, 14,4 — 30 kunlik byudjetning 2% i bir soatda ketadi. Alert ikki oynada (uzun va qisqa) birga tekshiriladi.",
      ru: "Во сколько раз быстрее нормы тратится бюджет ошибок: 1 — ровно кончится к концу окна, 14,4 — за час уходит 2% бюджета на 30 дней. Алерт проверяет два окна сразу, длинное и короткое.",
      en: "How many times faster than normal the error budget is being spent: 1 runs out exactly at the end of the window, 14.4 burns 2% of a 30-day budget in one hour. Alerts check a long and a short window together.",
    },
    lesson: "slo-error-budget",
  },
  // ---- architecture: CDC ----
  {
    id: "cdc",
    term: { uz: "CDC (o'zgarishlarni ushlash)", ru: "CDC (захват изменений данных)", en: "CDC (change data capture)" },
    short: {
      uz: "Bazaning o'z jurnalini (WAL yoki binlog) o'qib, har bir yozuv o'zgarishini hodisa sifatida tashqariga uzatish. Ilova ikki joyga yozmaydi, shuning uchun baza va hodisalar bir-biridan ajralib ketmaydi.",
      ru: "Чтение собственного журнала базы (WAL или binlog) и передача каждого изменения строки наружу как события. Приложение не пишет в два места, поэтому база и события не расходятся.",
      en: "Reading the database's own log (WAL or binlog) and publishing every row change as an event. The application never writes to two places, so the database and the events cannot diverge.",
    },
    lesson: "cdc",
  },
  {
    id: "dual-write",
    term: { uz: "Ikki joyga yozish (dual write)", ru: "Двойная запись (dual write)", en: "Dual write" },
    short: {
      uz: "Ilova bir o'zgarishni ketma-ket bazaga va brokerga (yoki qidiruv indeksiga) yozadi. Ikkinchi yozuv yiqilsa yoki tartib aralashsa, ikki tizim jimgina ajralib ketadi.",
      ru: "Приложение пишет одно изменение по очереди в базу и в брокер (или поисковый индекс). Если вторая запись упала или порядок перепутался, две системы молча расходятся.",
      en: "The application writes one change to the database and then to a broker (or search index). If the second write fails or the order gets mixed up, the two systems silently diverge.",
    },
    lesson: "cdc",
  },
  // ---- systems: video ----
  {
    id: "transcoding",
    term: { uz: "Transkodlash", ru: "Транскодирование", en: "Transcoding" },
    short: {
      uz: "Yuklangan videoni bir nechta sifat va formatga (masalan 1080p, 720p, 480p) qayta kodlash. Og'ir ish, shuning uchun video bo'laklarga bo'linib, ko'p worker'da parallel bajariladi.",
      ru: "Перекодирование загруженного видео в несколько качеств и форматов (например 1080p, 720p, 480p). Это тяжёлая работа, поэтому видео режут на куски и кодируют параллельно на многих воркерах.",
      en: "Re-encoding an uploaded video into several qualities and formats (for example 1080p, 720p, 480p). It is heavy work, so the video is cut into chunks and encoded in parallel on many workers.",
    },
    lesson: "design-video-streaming",
  },
  {
    id: "hls",
    term: { uz: "HLS (HTTP Live Streaming)", ru: "HLS (HTTP Live Streaming)", en: "HLS (HTTP Live Streaming)" },
    short: {
      uz: "Video bir necha soniyalik bo'laklarga bo'linadi, pleyer esa ro'yxat faylidan (.m3u8) keyingi bo'lakni oddiy HTTP GET bilan oladi. Bo'laklar oddiy fayl bo'lgani uchun CDN ularni yaxshi keshlaydi.",
      ru: "Видео режут на куски по несколько секунд, а плеер по файлу-списку (.m3u8) берёт следующий кусок обычным HTTP GET. Куски — обычные файлы, поэтому CDN хорошо их кеширует.",
      en: "Video is cut into segments a few seconds long, and the player fetches the next one with a plain HTTP GET, following a playlist file (.m3u8). Segments are ordinary files, so a CDN caches them well.",
    },
    lesson: "design-video-streaming",
  },
  {
    id: "adaptive-bitrate",
    term: { uz: "Moslashuvchan bitreyt (ABR)", ru: "Адаптивный битрейт (ABR)", en: "Adaptive bitrate (ABR)" },
    short: {
      uz: "Pleyer har bo'lakdan oldin tarmoq tezligi va buferga qarab sifatni tanlaydi: internet sekinlashsa 480p ga tushadi, tezlashsa 1080p ga qaytadi. Video to'xtab qolmaydi, faqat sifati o'zgaradi.",
      ru: "Перед каждым куском плеер выбирает качество по скорости сети и запасу буфера: сеть просела — переходит на 480p, ускорилась — обратно на 1080p. Видео не замирает, меняется только качество.",
      en: "Before each segment the player picks a quality from the network speed and the buffer: when the network slows it drops to 480p, when it recovers it goes back to 1080p. The video keeps playing, only the quality changes.",
    },
    lesson: "design-video-streaming",
  },
  // ---- business ----
  {
    id: "delivery-receipt",
    term: { uz: "Yetkazish kvitansiyasi (DLR)", ru: "Отчёт о доставке (DLR)", en: "Delivery receipt (DLR)" },
    short: {
      uz: "SMS yoki push provayderining xabar telefonga yetdimi yoki yo'qligini keyinroq bildiradigan callback'i. Qabul qilindi degani yetkazildi degani emas.",
      ru: "Последующий колбэк SMS- или push-провайдера о том, дошло ли сообщение до телефона. Принято не значит доставлено.",
      en: "A later callback from an SMS or push provider saying whether the message reached the phone. Accepted is not delivered.",
    },
    lesson: "notification-delivery",
  },
  {
    id: "channel-fallback",
    term: { uz: "Kanallar zaxira zanjiri", ru: "Цепочка резервных каналов", en: "Channel fallback chain" },
    short: {
      uz: "Xabar turi uchun ketma-ket sinaladigan kanallar (push, SMS, email). Birinchi tasdiqlangan yetkazishda yoki xabar muddati tugaganda to'xtaydi.",
      ru: "Упорядоченный список каналов (push, SMS, email) для типа сообщения. Останавливается на первой подтверждённой доставке или на дедлайне.",
      en: "An ordered list of channels (push, SMS, email) per kind of message, stopping at the first confirmed delivery or at the message's deadline.",
    },
    lesson: "notification-delivery",
  },
  {
    id: "quiet-hours",
    term: { uz: "Sokin soatlar", ru: "Тихие часы", en: "Quiet hours" },
    short: {
      uz: "Foydalanuvchining mahalliy vaqtidagi oraliq: shoshilinch bo'lmagan xabarlar ertalabgacha ushlab turiladi. Kodlar va xavfsizlik ogohlantirishlari bundan mustasno.",
      ru: "Окно местного времени пользователя, когда несрочные уведомления откладываются до утра. Коды и оповещения безопасности не откладываются.",
      en: "A window in the user's local time when non-urgent notifications are held until morning. Codes and security alerts are exempt.",
    },
    lesson: "notification-delivery",
  },
  {
    id: "upsert",
    term: { uz: "Upsert", ru: "Upsert", en: "Upsert" },
    short: {
      uz: "Bitta so'rovda qatorni qo'shish yoki shu kalitli qator bor bo'lsa uni yangilash (ON CONFLICT ... DO UPDATE). Qayta yurgizish zararsiz.",
      ru: "Одним запросом вставить строку или обновить её, если строка с таким ключом уже есть (ON CONFLICT ... DO UPDATE). Повтор безвреден.",
      en: "Insert a row, or update it if a row with the same key exists, in one statement (ON CONFLICT ... DO UPDATE). Re-running it is harmless.",
    },
    lesson: "bulk-import",
  },
  {
    id: "checkpoint",
    term: { uz: "Checkpoint", ru: "Чекпоинт", en: "Checkpoint" },
    short: {
      uz: "Uzun ish har bir commit qilingan batch bilan saqlaydigan joy: qayta ishga tushganda boshidan emas, shu yerdan davom etadi.",
      ru: "Позиция, которую длинная задача сохраняет с каждой закоммиченной пачкой, чтобы после перезапуска продолжить оттуда, а не начинать заново.",
      en: "The position a long job saves with each committed batch, so after a restart it resumes from there instead of starting over.",
    },
    lesson: "bulk-import",
  },
  {
    id: "double-entry",
    term: { uz: "Ikki yoqlama yozuv", ru: "Двойная запись", en: "Double-entry ledger" },
    short: {
      uz: "Har bir pul harakati posting'lari yig'indisi nolga teng bitta yozuv: debet kreditga teng.",
      ru: "Каждое движение денег — проводка, сумма строк которой равна нулю: дебет равен кредиту.",
      en: "Every money movement is one entry whose postings sum to zero: debit equals credit.",
    },
    lesson: "double-entry-ledger",
  },
  {
    id: "trial-balance",
    term: { uz: "Trial balance", ru: "Оборотный баланс", en: "Trial balance" },
    short: {
      uz: "Har bir valyuta bo'yicha barcha posting'lar yig'indisi aynan nol ekanini muntazam tekshirish.",
      ru: "Регулярная проверка, что сумма всех строк по каждой валюте ровно ноль.",
      en: "A regular check that all postings in each currency sum to exactly zero.",
    },
    lesson: "double-entry-ledger",
  },
  {
    id: "reversal-entry",
    term: { uz: "Teskari yozuv", ru: "Сторнирующая проводка", en: "Reversal entry" },
    short: {
      uz: "Avvalgi yozuvni tahrir qilmasdan bekor qiladigan, teskari posting'li yangi yozuv.",
      ru: "Новая проводка с обратными строками, отменяющая прежнюю без её правки.",
      en: "A new entry with opposite postings that undoes an earlier one without editing it.",
    },
    lesson: "double-entry-ledger",
  },
  {
    id: "dunning",
    term: { uz: "Dunning", ru: "Даннинг", en: "Dunning" },
    short: {
      uz: "O'tmagan obuna to'lovini bir necha kun qayta urinish, mijozga xabar berish va imtiyozli davrdan keyin obunani to'xtatish.",
      ru: "Повтор неудавшегося продления в течение нескольких дней, уведомления клиенту и приостановка после льготного периода.",
      en: "Retrying a failed renewal over several days, notifying the customer, then suspending after a grace period.",
    },
    lesson: "subscription-billing",
  },
  {
    id: "proration",
    term: { uz: "Proratsiya", ru: "Прорейт", en: "Proration" },
    short: {
      uz: "Davr o'rtasida tarif almashganda eski tarifning ishlatilmagan qismini qaytarish va yangisining qolgan qismini yechish.",
      ru: "При смене тарифа посреди периода: кредит за неиспользованную часть старого и списание за остаток нового.",
      en: "On a mid-period plan change, credit the unused part of the old plan and charge the rest of the new one.",
    },
    lesson: "subscription-billing",
  },
  {
    id: "reconciliation",
    term: { uz: "Solishtirish (reconciliation)", ru: "Сверка (reconciliation)", en: "Reconciliation" },
    short: {
      uz: "O'z hisob daftaringizni o'sha pulning tashqi yozuvi bilan solishtirib, har bir farqni hal qilish.",
      ru: "Сравнение своего журнала с внешней записью тех же денег и разбор каждого расхождения.",
      en: "Comparing your own ledger with an outside record of the same money and resolving every difference.",
    },
    lesson: "reconciliation",
  },
  {
    id: "settlement-report",
    term: { uz: "Hisob-kitob hisoboti", ru: "Реестр расчётов", en: "Settlement report" },
    short: {
      uz: "To'lov provayderining haqiqatan o'tkazgan har bir yechish, qaytarish va komissiyasi bo'yicha kunlik (T+1) ro'yxati.",
      ru: "Ежедневный (T+1) список провайдера по всем реально проведённым списаниям, возвратам и комиссиям.",
      en: "The payment provider's daily (T+1) list of every charge, refund and fee it actually booked.",
    },
    lesson: "reconciliation",
  },
  {
    id: "minor-units",
    term: { uz: "Eng kichik birlik (tiyin)", ru: "Минимальные единицы", en: "Minor units" },
    short: {
      uz: "Pulni eng kichik birlikda (tiyin, sent) butun son sifatida saqlash, shunda yig'indilar aniq chiqadi.",
      ru: "Хранение денег целым числом в наименьших единицах (тийины, центы), чтобы суммы были точными.",
      en: "Money stored as an integer of the smallest unit (tiyin, cents), so sums are exact.",
    },
    lesson: "reconciliation",
  },
  {
    id: "electronic-signature",
    term: { uz: "Elektron raqamli imzo (ERI)", ru: "Электронная цифровая подпись (ЭЦП)", en: "Electronic digital signature" },
    short: {
      uz: "Hujjat xeshi ustidan shaxsiy kalit bilan qo'yilgan imzo. Uni sertifikatdagi ochiq kalit bilan har kim tekshira oladi.",
      ru: "Подпись закрытым ключом над хешем документа. Любой может проверить её открытым ключом из сертификата.",
      en: "A private-key signature over a document's hash. Anyone can check it with the public key from the certificate.",
    },
    lesson: "digital-signature",
  },
  {
    id: "cms-pkcs7",
    term: { uz: "CMS (PKCS#7)", ru: "CMS (PKCS#7)", en: "CMS (PKCS#7)" },
    short: {
      uz: "Imzo, sertifikatlar va imzolangan atributlarni bitta paketga o'raydigan format: hujjat ichida (attached) yoki alohida (detached).",
      ru: "Формат, упаковывающий подпись, сертификаты и подписываемые атрибуты: вместе с документом (attached) или отдельно (detached).",
      en: "The format that packs a signature, certificates and signed attributes, with the document inside (attached) or apart (detached).",
    },
    lesson: "digital-signature",
  },
  {
    id: "ocsp",
    term: { uz: "OCSP", ru: "OCSP", en: "OCSP" },
    short: {
      uz: "Sertifikat hozir yaroqli, bekor qilingan yoki noma'lumligini sertifikat markazidan so'rash. CRL ro'yxatining onlayn muqobili.",
      ru: "Запрос к удостоверяющему центру: действует ли сертификат сейчас, отозван или неизвестен. Онлайн-альтернатива списку CRL.",
      en: "Asking the certificate authority whether a certificate is good, revoked or unknown right now. The online alternative to a CRL.",
    },
    lesson: "digital-signature",
  },
  {
    id: "trusted-timestamp",
    term: { uz: "Ishonchli vaqt tamg'asi", ru: "Доверенная метка времени", en: "Trusted timestamp" },
    short: {
      uz: "Vaqt tamg'asi xizmati (TSA) imzo qiymati xeshini o'z vaqti bilan imzolaydi. Sertifikat muddati tugagach ham imzo qachon qo'yilgani isbotlanadi.",
      ru: "Служба меток времени (TSA) подписывает хеш значения подписи своим временем. Момент подписи доказуем и после истечения сертификата.",
      en: "A timestamp authority (TSA) signs the hash of a signature value with its own time, so the signing time stays provable after the certificate expires.",
    },
    lesson: "digital-signature",
  },
  {
    id: "state-machine",
    term: { uz: "Holat mashinasi", ru: "Машина состояний", en: "State machine" },
    short: {
      uz: "Obyekt faqat o'tishlar jadvalida ruxsat etilgan (holat, amal) juftliklari bo'yicha o'zgaradi. Boshqa har qanday o'tish rad etiladi.",
      ru: "Объект меняется только по парам (состояние, действие), разрешённым в таблице переходов. Любой другой переход отклоняется.",
      en: "An object changes only through (state, action) pairs allowed by a transition table. Any other transition is rejected.",
    },
    lesson: "document-lifecycle",
  },
  {
    id: "pending-state",
    term: { uz: "Kutish holati (pending)", ru: "Промежуточное состояние (pending)", en: "Pending state" },
    short: {
      uz: "Tashqi tizim tasdiqlaguncha hujjat turadigan oraliq holat. Tasdiq kelmaguncha foydalanuvchiga yakuniy natija ko'rsatilmaydi.",
      ru: "Промежуточное состояние, в котором документ ждёт подтверждения внешней системы. До подтверждения итог пользователю не показывают.",
      en: "An in-between state a document holds until an external system confirms. The final result is not shown before that.",
    },
    lesson: "document-lifecycle",
  },
  {
    id: "audit-log",
    term: { uz: "Audit jurnali", ru: "Журнал аудита", en: "Audit log" },
    short: {
      uz: "Biznes harakatlarining faqat qo'shiladigan yozuvi: kim, nima qildi, nimaga, qachon, qayerdan, oldin va keyin.",
      ru: "Журнал бизнес-действий только на добавление: кто, что сделал, над чем, когда, откуда, до и после.",
      en: "An append-only record of business actions: who did what, to what, when, from where, before and after.",
    },
    lesson: "audit-log",
  },
  {
    id: "hash-chain",
    term: { uz: "Xesh zanjiri", ru: "Хеш-цепочка", en: "Hash chain" },
    short: {
      uz: "Har bir yozuv oldingisining xeshini saqlaydi, shuning uchun bitta yozuvni o'zgartirish yoki o'chirish undan keyingi hamma bog'lanishni buzadi.",
      ru: "Каждая запись хранит хеш предыдущей, поэтому изменение или удаление одной записи ломает все последующие связи.",
      en: "Each record stores the previous record's hash, so changing or deleting one record breaks every later link.",
    },
    lesson: "audit-log",
  },
  {
    id: "worm-storage",
    term: { uz: "WORM ombori", ru: "WORM-хранилище", en: "WORM storage" },
    short: {
      uz: "Bir marta yoz, ko'p o'qi: object lock yoqilgan ombor. Saqlash muddati tugaguncha hech kim ma'lumotni o'chira yoki ustidan yoza olmaydi.",
      ru: "«Записал один раз, читай много»: хранилище с object lock. До конца срока хранения данные никто не удалит и не перезапишет.",
      en: "Write once, read many: storage with an object lock. Until the retention date nobody can delete or overwrite the data.",
    },
    lesson: "audit-log",
  },
];
