// ============================================================
// Web Worker: чистая фильтрация предметов вне главного потока
// Подключается, когда subjects.json разрастается >100 записей
// ============================================================
import { normalize, calcProgress } from '../filters.js';

self.onmessage = (event) => {
   const { subjects, query, tag } = event.data;
   const q = normalize(query);

   const results = subjects
      .map((subject) => {
         const allLabs = subject.labs ?? [];
         const titleMatches = q !== '' && normalize(subject.title).includes(q);

         const labs = allLabs.filter((lab) => {
            const tagOk =
               !tag || (lab.tags ?? []).some((t) => normalize(t) === tag);
            const textOk =
               q === '' ||
               titleMatches ||
               [lab.title, lab.description, ...(lab.tags ?? [])].some((f) =>
                  normalize(f).includes(q),
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
         return !tag && (q === '' || titleMatches);
      })
      .map(({ subject, labs, progress }) => ({ subject, labs, progress }));

   self.postMessage({ results });
};
