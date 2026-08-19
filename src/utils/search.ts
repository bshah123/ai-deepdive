import MiniSearch from 'minisearch';
import curriculumData from '../../data/curriculum.json';
import glossaryData from '../../data/glossary.json';

export interface SearchResultItem {
  id: string;
  type: 'lesson' | 'glossary';
  title: string;
  subtitle: string;
  url: string;
  partNumber?: number;
  chapterNumber?: string;
  lessonId?: string;
  tags: string[];
}

let miniSearchInstance: MiniSearch | null = null;
const searchDocuments: any[] = [];

export function initializeSearchEngine(): MiniSearch {
  if (miniSearchInstance) return miniSearchInstance;

  miniSearchInstance = new MiniSearch({
    fields: ['title', 'subtitle', 'body', 'tags'],
    storeFields: ['title', 'subtitle', 'url', 'type', 'partNumber', 'chapterNumber', 'lessonId', 'tags']
  });

  // Index all lessons from curriculum
  curriculumData.parts.forEach(part => {
    part.chapters.forEach(chapter => {
      chapter.lessons.forEach(lesson => {
        searchDocuments.push({
          id: `lesson-${lesson.id}`,
          type: 'lesson',
          title: `${lesson.id} ${lesson.title}`,
          subtitle: `Part ${part.number} • Chapter ${chapter.number} (${chapter.title})`,
          body: `${lesson.title} ${lesson.tags.join(' ')} ${chapter.title} ${part.title}`,
          url: `/lesson/${lesson.id}`,
          partNumber: part.number,
          chapterNumber: chapter.number,
          lessonId: lesson.id,
          tags: lesson.tags
        });
      });
    });
  });

  // Index all glossary terms
  glossaryData.forEach((term: any) => {
    searchDocuments.push({
      id: `glossary-${term.id}`,
      type: 'glossary',
      title: term.term,
      subtitle: term.definition,
      body: `${term.term} ${term.simpleExplanation} ${term.technicalExplanation}`,
      url: `/glossary#${term.id}`,
      tags: ['glossary', 'definition']
    });
  });

  miniSearchInstance.addAll(searchDocuments);
  return miniSearchInstance;
}

export function performSearch(query: string): SearchResultItem[] {
  if (!query.trim()) return [];
  const searcher = initializeSearchEngine();
  const results = searcher.search(query, { prefix: true, fuzzy: 0.2 });

  return results.slice(0, 10).map((res: any) => ({
    id: res.id,
    type: res.type,
    title: res.title,
    subtitle: res.subtitle,
    url: res.url,
    partNumber: res.partNumber,
    chapterNumber: res.chapterNumber,
    lessonId: res.lessonId,
    tags: res.tags || []
  }));
}
