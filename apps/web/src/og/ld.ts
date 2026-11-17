// schema.org JSON-LD for the home page (Course) and each lesson (LearningResource); passed to Base.astro.
import { type Lang, lessons, order } from "@mufassall/content";
import { site } from "../i18n/site";
import { player } from "../i18n/ui";

const SITE = "https://mufassall.dtwin.uz";

const provider = { "@type": "Organization", name: "dtwin", url: "https://dtwin.uz" };

function courseRef(lang: Lang) {
  return { "@type": "Course", name: `mufassall: ${site[lang].tagline}`, url: `${SITE}/${lang}/` };
}

export function courseLd(lang: Lang) {
  const minutes = order.reduce((sum, sl) => sum + lessons[sl]!.lesson.minutes, 0);
  return {
    "@context": "https://schema.org",
    ...courseRef(lang),
    description: site[lang].description,
    inLanguage: lang,
    image: `${SITE}/og/${lang}.png`,
    provider,
    isAccessibleForFree: true,
    license: "https://creativecommons.org/licenses/by-sa/4.0/",
    hasCourseInstance: {
      "@type": "CourseInstance",
      courseMode: "online",
      courseWorkload: `PT${minutes}M`,
    },
    offers: { "@type": "Offer", price: 0, priceCurrency: "USD", category: "Free" },
  };
}

export function lessonLd(lang: Lang, slug: string) {
  const entry = lessons[slug]!;
  const text = entry.text[lang];
  return {
    "@context": "https://schema.org",
    "@type": "LearningResource",
    name: text.title,
    description: text.summary,
    inLanguage: lang,
    url: `${SITE}/${lang}/l/${slug}/`,
    image: `${SITE}/og/${lang}/${slug}.png`,
    educationalLevel: player[lang].levels[entry.lesson.level],
    timeRequired: `PT${entry.lesson.minutes}M`,
    learningResourceType: "interactive lesson",
    isAccessibleForFree: true,
    license: "https://creativecommons.org/licenses/by-sa/4.0/",
    provider,
    isPartOf: courseRef(lang),
  };
}
