import fs from 'fs';
import path from 'path';

const BASE_DIR = process.cwd();
const CURRICULUM_PATH = path.join(BASE_DIR, 'data/curriculum.json');

console.log('🔍 Running AI-DeepDive Content Validator...');

if (!fs.existsSync(CURRICULUM_PATH)) {
  console.error('❌ Error: curriculum.json not found!');
  process.exit(1);
}

const curriculum = JSON.parse(fs.readFileSync(CURRICULUM_PATH, 'utf-8'));
let totalLessons = 0;
let errors = 0;
const lessonIds = new Set();

curriculum.parts.forEach(part => {
  part.chapters.forEach(chapter => {
    chapter.lessons.forEach(lesson => {
      totalLessons++;
      if (lessonIds.has(lesson.id)) {
        console.error(`❌ Duplicate lesson ID found: ${lesson.id}`);
        errors++;
      }
      lessonIds.add(lesson.id);

      // Verify file exists on disk
      const filePath = path.join(BASE_DIR, 'content', `${part.id}-${part.slug}`, `${chapter.id}-${chapter.slug}`, lesson.file);
      if (!fs.existsSync(filePath)) {
        console.error(`❌ Missing file for lesson ${lesson.id}: ${filePath}`);
        errors++;
      }
    });
  });
});

console.log(`✅ Scanned ${curriculum.parts.length} Parts, ${totalLessons} Lessons.`);

if (errors > 0) {
  console.error(`❌ Validation failed with ${errors} error(s).`);
  process.exit(1);
} else {
  console.log('✨ All content files and metadata validated successfully!');
}
