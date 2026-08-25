export interface ParsedFrontmatter {
  id: string;
  part: number;
  chapter: number;
  title: string;
  slug: string;
  difficulty: string;
  estimated_minutes: number;
  prerequisites?: string[];
  tags: string[];
  status?: string;
  [key: string]: any;
}

export interface TocHeading {
  id: string;
  text: string;
  level: number;
}

export interface ParsedMarkdown {
  frontmatter: ParsedFrontmatter;
  contentHtml: string;
  headings: TocHeading[];
  rawContent: string;
}

export function parseFrontmatter(markdown: string): { frontmatter: ParsedFrontmatter; body: string } {
  const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/;
  const match = markdown.match(frontmatterRegex);

  if (!match) {
    return {
      frontmatter: {
        id: '0.0',
        part: 1,
        chapter: 1,
        title: 'Untitled Lesson',
        slug: 'untitled',
        difficulty: 'beginner',
        estimated_minutes: 15,
        tags: []
      },
      body: markdown
    };
  }

  const yamlStr = match[1];
  const body = markdown.slice(match[0].length);
  const frontmatter: any = {};

  yamlStr.split('\n').forEach(line => {
    const colonIdx = line.indexOf(':');
    if (colonIdx !== -1) {
      const key = line.slice(0, colonIdx).trim();
      let value: any = line.slice(colonIdx + 1).trim();

      // Handle strings, numbers, arrays
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      } else if (value.startsWith("'") && value.endsWith("'")) {
        value = value.slice(1, -1);
      } else if (key === 'id' || key === 'slug' || key === 'title' || key === 'difficulty' || key === 'status') {
        // String identifiers (e.g. "1.10", "19.4") must remain string!
        value = String(value).trim();
      } else if (!isNaN(Number(value)) && key !== 'id') {
        value = Number(value);
      } else if (value.startsWith('[') && value.endsWith(']')) {
        try {
          value = JSON.parse(value.replace(/'/g, '"'));
        } catch {
          value = [];
        }
      }
      frontmatter[key] = value;
    }
  });

  if (frontmatter.id !== undefined) {
    frontmatter.id = String(frontmatter.id).trim();
  }

  return { frontmatter, body };
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-');
}

export function extractHeadings(markdownBody: string): TocHeading[] {
  const headings: TocHeading[] = [];
  const lines = markdownBody.split('\n');
  let inCodeBlock = false;

  for (const line of lines) {
    if (line.trim().startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;

    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = headingMatch[2].replace(/\*/g, '').trim();
      const id = slugify(text);
      headings.push({ id, text, level });
    }
  }

  return headings;
}
