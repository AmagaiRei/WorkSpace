// !Чистая логика - её легко тестировать и переиспользовать. как по мне

export function normalize(value) {
   return String(value ?? '')
      .trim()
      .toLocaleLowerCase('ru');
}

// ! Уникальные теги по всем лабораторным: [{ key, label }], key — нормализованный.
export function collectTags(subjects) {
   const unique = new Map();
   for (const subject of subjects) {
      for (const lab of subject.labs ?? []) {
         for (const tag of lab.tags ?? []) {
            const key = normalize(tag);
            if (key && !unique.has(key)) unique.set(key, String(tag).trim());
         }
      }
   }
   return [...unique]
      .map(([key, label]) => ({ key, label }))
      .sort((a, b) => a.label.localeCompare(b.label, 'ru'));
}

//!Прогресс предмета в процентах.
export function calcProgress(labs = []) {
   const total = labs.length;
   if (total === 0) return { done: 0, total: 0, percent: 0 };
   const done = labs.filter((lab) => lab.status === 'done').length;
   return { done, total, percent: Math.round((done / total) * 100) };
}

/**
 * !Фильтрует предметы по тексту и тегу.
 * !Прогресс считается по ВСЕМ лабораторным предмета — он не зависит от фильтра
 * @returns {{ subject: object, labs: object[], progress: object }[]}
 */
export function filterSubjects(subjects, { query = '', tag = null } = {}) {
   const q = normalize(query);

   return subjects
      .map((subject) => {
         const allLabs = subject.labs ?? [];
         const titleMatches = q !== '' && normalize(subject.title).includes(q);

         const labs = allLabs.filter((lab) => {
            const tagOk =
               !tag || (lab.tags ?? []).some((t) => normalize(t) === tag);
            const textOk =
               q === '' ||
               titleMatches ||
               [lab.title, lab.description, ...(lab.tags ?? [])].some((field) =>
                  normalize(field).includes(q),
               );
            return tagOk && textOk;
         });

         return {
            subject,
            labs,
            progress: calcProgress(allLabs),
            titleMatches,
         };
      })
      .filter(({ labs, titleMatches }) => {
         if (labs.length > 0) return true;
         // !Предмет без подходящих лабораторных виден, только если нет тега и он сам подошёл под запрос.
         return !tag && (q === '' || titleMatches);
      })
      .map(({ subject, labs, progress }) => ({ subject, labs, progress }));
}
