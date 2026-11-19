import type { ImportWarningCode } from "./importkit";
import type { MermaidErrorCode, MermaidKind } from "./mermaid";
import type { AuthorLang } from "./model";
import type { PipelineErrorCode, PipelineKind } from "./pipeline";

/** What the person picks in the dialog; also the `source` a system is stored with. */
export type ImportSource = "gitlab-ci" | "github-actions" | "mermaid";

/** Strings of the "import a pipeline or a diagram" dialog. `{x}` placeholders are filled with `fill`. */
export interface ImportUiStrings {
  open: string;
  title: string;
  lead: string;
  privacy: string;
  format: string;
  formats: Record<ImportSource, string>;
  hints: Record<ImportSource, string>;
  file: string;
  paste: string;
  importText: string;
  close: string;
  reading: string;
  notes: string;
  done: string;
  detected: string;
  kinds: Record<PipelineKind | MermaidKind, string>;
  pipelineError: Record<PipelineErrorCode, string>;
  mermaidError: Record<MermaidErrorCode, string>;
  warning: Record<ImportWarningCode, string>;
}

const FORMATS: Record<ImportSource, string> = {
  "gitlab-ci": "GitLab CI (.gitlab-ci.yml)",
  "github-actions": "GitHub Actions (.github/workflows)",
  mermaid: "Mermaid (flowchart, sequenceDiagram)",
};
const KINDS: Record<PipelineKind | MermaidKind, string> = {
  "gitlab-ci": "GitLab CI",
  "github-actions": "GitHub Actions",
  "mermaid-flowchart": "Mermaid flowchart",
  "mermaid-sequence": "Mermaid sequenceDiagram",
};

export const IMPORT_UI: Record<AuthorLang, ImportUiStrings> = {
  en: {
    open: "Import pipeline or diagram",
    title: "Import a pipeline or a diagram",
    lead: "Paste your CI file or Mermaid text and get a step-by-step lesson: blocks, lines, real messages and texts in three languages.",
    privacy: "Everything is read in your browser; nothing is sent anywhere.",
    format: "Format",
    formats: FORMATS,
    hints: {
      "gitlab-ci": "Paste .gitlab-ci.yml. Files from include are not fetched.",
      "github-actions": "Paste a workflow file from .github/workflows.",
      mermaid: "Paste a flowchart (or graph) or a sequenceDiagram.",
    },
    file: "File",
    paste: "Or paste the text",
    importText: "Import",
    close: "Close",
    reading: "Reading…",
    notes: "Notes",
    done: "Done: {nodes} blocks, {steps} steps.",
    detected: "Detected: {x}.",
    kinds: KINDS,
    pipelineError: {
      empty: "The text is empty.",
      tooLarge: "The file is too large or expands too much through aliases; the limit is 1 MB.",
      notYaml: "This is not valid YAML.",
      notPipeline: "This YAML is not a GitLab CI or GitHub Actions pipeline.",
      noJobs: "The pipeline has no jobs to show (only settings or include).",
    },
    mermaidError: {
      empty: "The text is empty.",
      tooLarge: "The text is too large; the limit is 1 MB.",
      notMermaid: "Start with flowchart, graph or sequenceDiagram.",
      noNodes: "The diagram has no blocks.",
    },
    warning: {
      include: "include is not followed: {x}. Jobs from those files are not in the lesson.",
      extends: "extends was followed one level only; check: {x}.",
      unknownStage: "Stages missing from the stages list: {x} (added before .post).",
      unknownNeeds: "needs points to jobs that are not in the file: {x}.",
      cycle: "A loop was found ({x}); it does not block the order of steps.",
      notes: "{x} notes (Note over ...) were skipped.",
      blocks: "Blocks were flattened, every message is one step: {x}.",
      subgraph: "{x} subgraphs were flattened into one picture.",
      unsupported: "Lines that could not be read were skipped: {x}.",
      selfLoop: "Arrows from a block to itself were skipped: {x}.",
      noLines: "There are no lines, so the steps have no real messages yet.",
      maxNodes: "Too many blocks: {x} were folded or left out (the limit is 30).",
      maxSteps: "Too many steps: {x} did not fit (the limit is 16).",
      translate: "Names were copied as written; the texts are generated in all three languages, read them and adjust.",
    },
  },
  ru: {
    open: "Импорт пайплайна или диаграммы",
    title: "Импорт пайплайна или диаграммы",
    lead: "Вставьте CI-файл или текст Mermaid и получите пошаговый урок: блоки, линии, реальные сообщения и тексты на трёх языках.",
    privacy: "Всё читается в вашем браузере и никуда не отправляется.",
    format: "Формат",
    formats: FORMATS,
    hints: {
      "gitlab-ci": "Вставьте .gitlab-ci.yml. Файлы из include не загружаются.",
      "github-actions": "Вставьте файл workflow из .github/workflows.",
      mermaid: "Вставьте flowchart (или graph) либо sequenceDiagram.",
    },
    file: "Файл",
    paste: "Или вставьте текст",
    importText: "Импортировать",
    close: "Закрыть",
    reading: "Читаю…",
    notes: "Заметки",
    done: "Готово: блоков — {nodes}, шагов — {steps}.",
    detected: "Определено: {x}.",
    kinds: KINDS,
    pipelineError: {
      empty: "Текст пустой.",
      tooLarge: "Файл слишком большой или слишком разрастается из-за алиасов; предел 1 МБ.",
      notYaml: "Это не корректный YAML.",
      notPipeline: "Этот YAML не похож на пайплайн GitLab CI или GitHub Actions.",
      noJobs: "В пайплайне нет задач (только настройки или include).",
    },
    mermaidError: {
      empty: "Текст пустой.",
      tooLarge: "Текст слишком большой; предел 1 МБ.",
      notMermaid: "Начните с flowchart, graph или sequenceDiagram.",
      noNodes: "В диаграмме нет блоков.",
    },
    warning: {
      include: "include не загружается: {x}. Задач из этих файлов в уроке нет.",
      extends: "extends раскрыт только на один уровень; проверьте: {x}.",
      unknownStage: "Этапы, которых нет в списке stages: {x} (добавлены перед .post).",
      unknownNeeds: "needs ссылается на задачи, которых нет в файле: {x}.",
      cycle: "Найден цикл ({x}); он не мешает порядку шагов.",
      notes: "Пропущено заметок (Note over ...): {x}.",
      blocks: "Блоки развёрнуты, каждое сообщение — один шаг: {x}.",
      subgraph: "Подграфы ({x}) развёрнуты в одну схему.",
      unsupported: "Нечитаемые строки пропущены: {x}.",
      selfLoop: "Стрелки из блока в самого себя пропущены: {x}.",
      noLines: "Линий нет, поэтому у шагов пока нет реальных сообщений.",
      maxNodes: "Слишком много блоков: {x} свёрнуто или не вошло (предел 30).",
      maxSteps: "Слишком много шагов: {x} не вошло (предел 16).",
      translate: "Названия скопированы как есть; тексты созданы на трёх языках, прочитайте и поправьте их.",
    },
  },
  uz: {
    open: "Pipeline yoki diagramma import qilish",
    title: "Pipeline yoki diagrammani import qilish",
    lead: "CI faylingiz yoki Mermaid matnini qo'ying va qadamma-qadam dars oling: bloklar, chiziqlar, haqiqiy xabarlar va uch tildagi matnlar.",
    privacy: "Hammasi brauzeringizda o'qiladi, hech qayerga yuborilmaydi.",
    format: "Format",
    formats: FORMATS,
    hints: {
      "gitlab-ci": ".gitlab-ci.yml ni qo'ying. include fayllari yuklanmaydi.",
      "github-actions": ".github/workflows dagi workflow faylini qo'ying.",
      mermaid: "flowchart (yoki graph) yoki sequenceDiagram ni qo'ying.",
    },
    file: "Fayl",
    paste: "Yoki matnni qo'ying",
    importText: "Import qilish",
    close: "Yopish",
    reading: "O'qilmoqda…",
    notes: "Izohlar",
    done: "Tayyor: {nodes} ta blok, {steps} ta qadam.",
    detected: "Aniqlandi: {x}.",
    kinds: KINDS,
    pipelineError: {
      empty: "Matn bo'sh.",
      tooLarge: "Fayl juda katta yoki alias'lar orqali juda kengayib ketadi; chegara 1 MB.",
      notYaml: "Bu to'g'ri YAML emas.",
      notPipeline: "Bu YAML GitLab CI yoki GitHub Actions pipeline'iga o'xshamaydi.",
      noJobs: "Pipeline'da ko'rsatadigan job yo'q (faqat sozlamalar yoki include).",
    },
    mermaidError: {
      empty: "Matn bo'sh.",
      tooLarge: "Matn juda katta; chegara 1 MB.",
      notMermaid: "flowchart, graph yoki sequenceDiagram bilan boshlang.",
      noNodes: "Diagrammada blok yo'q.",
    },
    warning: {
      include: "include yuklanmaydi: {x}. U fayllardagi job'lar darsda yo'q.",
      extends: "extends faqat bir daraja ochildi; tekshiring: {x}.",
      unknownStage: "stages ro'yxatida yo'q bosqichlar: {x} (.post oldidan qo'shildi).",
      unknownNeeds: "needs faylda yo'q job'larga ishora qiladi: {x}.",
      cycle: "Aylana topildi ({x}); u qadamlar tartibiga xalaqit bermaydi.",
      notes: "{x} ta izoh (Note over ...) o'tkazib yuborildi.",
      blocks: "Bloklar yoyildi, har bir xabar bitta qadam: {x}.",
      subgraph: "{x} ta subgraph bitta sxemaga yoyildi.",
      unsupported: "O'qib bo'lmagan qatorlar o'tkazib yuborildi: {x}.",
      selfLoop: "Blokdan o'ziga chizilgan strelkalar o'tkazib yuborildi: {x}.",
      noLines: "Chiziqlar yo'q, shuning uchun qadamlarda hali haqiqiy xabar yo'q.",
      maxNodes: "Bloklar juda ko'p: {x} tasi yig'ildi yoki kirmadi (chegara 30).",
      maxSteps: "Qadamlar juda ko'p: {x} tasi sig'madi (chegara 16).",
      translate: "Nomlar yozilganidek ko'chirildi; matnlar uch tilda yaratildi, ularni o'qib chiqib, tuzating.",
    },
  },
};
