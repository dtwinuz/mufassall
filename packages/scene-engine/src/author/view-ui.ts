import type { AuthorLang } from "./model";

/** Strings of /<lang>/my/view/. `{x}` placeholders are filled with `fill`. */
export interface ViewStrings {
  title: string;
  lead: string;
  noscript: string;
  loading: string;
  privacy: string;
  edit: string;
  library: string;
  save: string;
  saving: string;
  saved: string;
  openSaved: string;
  quota: string;
  storageOff: string;
  shared: string;
  fallback: string;
  langNames: Record<AuthorLang, string>;
  empty: {
    none: string;
    notFound: string;
    broken: string;
    tooBig: string;
    unsupported: string;
    unplayable: string;
  };
}

export const VIEW_UI: Record<AuthorLang, ViewStrings> = {
  uz: {
    title: "Mening tizimim",
    lead: "O'zingiz yaratgan tizim qadamma-qadam dars sifatida.",
    noscript: "Bu sahifa tizimni brauzeringiz xotirasidan o'qiydi, buning uchun JavaScript kerak.",
    loading: "Tizim ochilmoqda...",
    privacy: "Tizimlaringiz faqat shu brauzerda saqlanadi va hech qayerga yuborilmaydi.",
    edit: "Tahrirlash",
    library: "Mening tizimlarim",
    save: "Tizimlarimga saqlash",
    saving: "Saqlanmoqda...",
    saved: "Saqlandi: endi u tizimlaringiz ro'yxatida.",
    openSaved: "Ro'yxatni ochish",
    quota: "Brauzer xotirasi to'lgan, saqlab bo'lmadi. Keraksiz tizimlarni o'chirib, qayta urinib ko'ring.",
    storageOff: "Brauzer xotirasi yopiq (masalan, maxfiy oyna), saqlab bo'lmadi.",
    shared: "Bu tizim havola orqali ochildi va hali sizda saqlanmagan.",
    fallback: "Bu tizimda {want} tilida matn yo'q, {lang} tilida ko'rsatilmoqda.",
    langNames: { uz: "o'zbek", ru: "rus", en: "ingliz" },
    empty: {
      none: "Qaysi tizimni ochish kerakligi ko'rsatilmagan. Tizimlaringiz ro'yxatidan birini tanlang.",
      notFound: "Bu tizim shu brauzerda topilmadi. U boshqa brauzerda yaratilgan yoki o'chirilgan bo'lishi mumkin.",
      broken: "Havola buzilgan: undagi tizimni o'qib bo'lmadi. Yuborgan odamdan faylni so'rang.",
      tooBig: "Havoladagi tizim juda katta. Bunday tizimlarni fayl orqali ulashing.",
      unsupported: "Bu brauzer havoladagi tizimni ocha olmaydi. Yangiroq brauzerda oching yoki faylni so'rang.",
      unplayable: "Tizimni dars sifatida ochib bo'lmadi ({x}). Uni muharrirda tuzating.",
    },
  },
  ru: {
    title: "Моя система",
    lead: "Система, которую вы собрали сами, в виде пошагового урока.",
    noscript: "Эта страница читает систему из памяти браузера, для этого нужен JavaScript.",
    loading: "Открываем систему...",
    privacy: "Ваши системы хранятся только в этом браузере и никуда не отправляются.",
    edit: "Редактировать",
    library: "Мои системы",
    save: "Сохранить в мои системы",
    saving: "Сохраняем...",
    saved: "Сохранено: теперь она в списке ваших систем.",
    openSaved: "Открыть список",
    quota: "Память браузера заполнена, сохранить не удалось. Удалите ненужные системы и попробуйте снова.",
    storageOff: "Память браузера недоступна (например, приватное окно), сохранить не удалось.",
    shared: "Эта система открыта по ссылке и ещё не сохранена у вас.",
    fallback: "В этой системе нет текста на языке «{want}», показываем на языке «{lang}».",
    langNames: { uz: "узбекский", ru: "русский", en: "английский" },
    empty: {
      none: "Не указано, какую систему открыть. Выберите её в списке ваших систем.",
      notFound: "Эта система не найдена в этом браузере. Возможно, её создали в другом браузере или удалили.",
      broken: "Ссылка повреждена: систему из неё не прочитать. Попросите у отправителя файл.",
      tooBig: "Система в ссылке слишком большая. Такими системами делитесь файлом.",
      unsupported: "Этот браузер не умеет открывать системы из ссылок. Откройте в более новом браузере или попросите файл.",
      unplayable: "Систему не удалось открыть как урок ({x}). Исправьте её в редакторе.",
    },
  },
  en: {
    title: "My system",
    lead: "A system you built yourself, as a step-by-step lesson.",
    noscript: "This page reads the system from your browser's storage, which needs JavaScript.",
    loading: "Opening the system...",
    privacy: "Your systems stay in this browser and are never sent anywhere.",
    edit: "Edit",
    library: "My systems",
    save: "Save to my systems",
    saving: "Saving...",
    saved: "Saved: it is now in your list of systems.",
    openSaved: "Open the list",
    quota: "Browser storage is full, so it could not be saved. Delete systems you no longer need and try again.",
    storageOff: "Browser storage is off (a private window, for example), so it could not be saved.",
    shared: "This system was opened from a link and is not saved on your side yet.",
    fallback: "This system has no {want} text, so it is shown in {lang}.",
    langNames: { uz: "Uzbek", ru: "Russian", en: "English" },
    empty: {
      none: "No system was named. Pick one from your list of systems.",
      notFound: "This system is not in this browser. It may have been made in another browser, or deleted.",
      broken: "The link is damaged and the system in it cannot be read. Ask the sender for a file.",
      tooBig: "The system in this link is too big. Share systems like this as a file.",
      unsupported: "This browser cannot open systems from links. Use a newer browser, or ask for a file.",
      unplayable: "The system could not be opened as a lesson ({x}). Fix it in the editor.",
    },
  },
};
