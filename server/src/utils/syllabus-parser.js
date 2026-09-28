/**
 * Smart Academic Syllabus Parser
 * Intelligently extracts Units, Modules, Titles, and Topics from raw syllabus text,
 * scanned PDFs, and OCR text from university curricula.
 */

const ROMAN_MAP = {
  i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10,
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
};

function parseUnitNumber(val) {
  if (!val) return 1;
  const clean = val.trim().toLowerCase();
  if (ROMAN_MAP[clean]) return ROMAN_MAP[clean];
  const num = parseInt(clean, 10);
  return isNaN(num) ? 1 : num;
}

// Postamble patterns that indicate end of syllabus
const POSTAMBLE_REGEX = /(?:course\s*outcomes?|text(?:\s*\/\s*reference)?\s*books?|reference\s*books?|suggested\s*readings?|evaluation\s*scheme|examination\s*scheme)/i;

function cleanHeaderTitle(title) {
  const words = title.trim().split(/\s+/);
  return words.map((w, idx) => {
    const lower = w.toLowerCase();
    if (idx > 0 && ["of", "and", "in", "to", "for", "with", "a", "an", "the"].includes(lower)) {
      return lower;
    }
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  }).join(" ");
}

export function estimateTopicMinutes(title) {
  const clean = (title || "").toLowerCase().trim();
  const wordCount = clean.split(/\s+/).filter(Boolean).length;

  // 1. Heavy theory / deep system implementation (40–45 mins)
  if (
    /\b(b\+?\s*trees?|concurrency\s*control|serializability|deadlocks?|query\s*optimization|multiversion|recovery\s*system|distributed\s*database|two\s*phase|2pl|compiler\s*design|dynamic\s*programming|graph\s*algorithms?|system\s*design|asymmetric\s*encryption)\b/i.test(
      clean
    )
  ) {
    return 45;
  }

  // 2. Micro-concepts, syntax keywords, definitions (5–10 mins)
  if (
    /\b(definition|syntax|operator|operators|keyword|keywords|comment|comments|variable|variables|datatype|data\s*types?|primary\s*key|foreign\s*key|candidate\s*key|super\s*key|alternate\s*key|attribute|attributes|tuple|cardinality|degree|domain|schema|instance|ddl|dml|dcl|tcl|entity|tag|tags|elements?|selector|selectors|git\s*init|commit|push|pull|branch|boolean|null|undefined|constant|constants|break|continue|return|pass|goto|identifier|identifiers|tokens?|literal|literals|ternary|boolean\s*algebra)\b/i.test(
      clean
    ) ||
    (wordCount <= 2 && clean.length <= 15)
  ) {
    return clean.length <= 12 || wordCount === 1 ? 5 : 10;
  }

  // 3. Short focused primers & sub-topics (15 mins)
  if (
    /\b(introduction|overview|basics|primer|need\s*for|advantages?|disadvantages?|features|types\s*of|comparison|difference\s*between|vs\b|er\s*symbols?|keys?\s*in|views?\s*in|loops?|while|for\s*loop|functions?\s*syntax|conditional\s*statements?|if\s*else|switch\s*case|css\s*box\s*model|flexbox|grid\s*basics)\b/i.test(
      clean
    ) ||
    (wordCount <= 3 && clean.length <= 25)
  ) {
    return 15;
  }

  // 4. Standard core modules (25 mins)
  if (
    /\b(relational\s*algebra|normal\s*form|normalization|1nf|2nf|3nf|bcnf|indexing|hashing|joins?|subquer(y|ies)|aggregate\s*functions?|views|transactions?|acid|cpu\s*scheduling|paging|segmentation|binary\s*trees?|linked\s*lists?|stacks?|queues?|oop|classes|objects|inheritance|polymorphism|encapsulation|interfaces?|dom\s*manipulation|event\s*handling|rest\s*api|express\s*routes)\b/i.test(
      clean
    )
  ) {
    return 25;
  }

  // 5. Default by word count
  if (wordCount <= 2) return 10;
  if (wordCount <= 4) return 15;
  if (wordCount <= 6) return 25;
  return 35;
}

function parseTopicsFromBlock(content, unitNumber, unitTitle) {
  if (!content) return [];

  // Replace sub-headings like "NORMALIZATION:" or "Concurrency Control:"
  const normalized = content
    .replace(/\r?\n\s*([A-Z0-9\s\-]{3,40}:)/g, ", $1")
    .replace(/\r?\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Split on commas and semicolons
  const rawParts = normalized.split(/[;,]/);
  const cleanedParts = [];

  for (let i = 0; i < rawParts.length; i++) {
    let part = rawParts[i].trim();
    if (!part) continue;

    // Handle subheadings ending with colon (e.g. "NORMALIZATION: Problems Caused by redundancy")
    if (part.includes(":")) {
      const colonSplit = part.split(":");
      for (const cs of colonSplit) {
        const cst = cs.trim();
        if (cst && cst.length >= 3) cleanedParts.push(cst);
      }
      continue;
    }

    // Merge ordinal normal forms like "FIRST", "SECOND", "THIRD Normal forms"
    if (/^(first|second|third|fourth|fifth|1st|2nd|3rd)$/i.test(part)) {
      const nextParts = [];
      while (i + 1 < rawParts.length && /^(first|second|third|fourth|fifth|1st|2nd|3rd)$/i.test(rawParts[i + 1].trim())) {
        nextParts.push(rawParts[i + 1].trim());
        i++;
      }
      if (i + 1 < rawParts.length) {
        nextParts.push(rawParts[i + 1].trim());
        i++;
      }
      part = [part, ...nextParts].join(", ");
    }

    // Clean bullets and junk prefixes
    part = part
      .replace(/^[\u2022\u25E6\u25AA\u2013\u2014\-*+]\s*/, "")
      .replace(/^\d+[\.\)]\s*/, "")
      .replace(/^[a-z][\.\)]\s*/i, "")
      .replace(/\s*\(\s*\d+\s*(?:hrs?|hours?|lectures?|credits?)\s*\)\s*$/i, "")
      .trim();

    if (part && part.length >= 3 && part.length <= 110) {
      // Discard boilerplate course metadata lines
      if (!/^(course\s*objectives?|credits?|sessional|theory\s*exam|total|pre-\s*requisite)/i.test(part)) {
        cleanedParts.push(part);
      }
    }
  }

  // Deduplicate and estimate minutes
  const unique = [];
  const seen = new Set();

  for (const title of cleanedParts) {
    const key = title.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      const est = estimateTopicMinutes(title);

      unique.push({
        title,
        unitNumber,
        unitTitle,
        confidenceScore: 3,
        estimatedMinutes: est,
        completed: false,
      });
    }
  }

  return unique;
}

export function parseSyllabusText(rawText) {
  if (!rawText || typeof rawText !== "string") {
    return { units: [], allTopics: [] };
  }

  // 1. Cut off postamble (Course Outcomes, Text Books, Reference Books)
  let cleanText = rawText;
  const postambleMatch = cleanText.search(POSTAMBLE_REGEX);
  if (postambleMatch !== -1 && postambleMatch > 200) {
    cleanText = cleanText.slice(0, postambleMatch);
  }

  // 2. Find all Unit / Module occurrences using global regex supporting hyphens, en-dashes, and colons
  // Matches: Unit-I, Unit–I, Unit - I, Unit I:, Unit 1, Module 1, Module-I, etc.
  const unitRegex = /\b(?:unit|module|chapter|section)\s*[\-–—:]?\s*([0-9ivxlcdm]+|one|two|three|four|five|six)\b\s*[:\-–—]?\s*/gi;

  const matches = [];
  let match;
  while ((match = unitRegex.exec(cleanText)) !== null) {
    matches.push({
      fullMatch: match[0],
      unitStr: match[1],
      index: match.index + (match[0].length - match[0].trimStart().length),
      length: match[0].trim().length,
      endIndex: unitRegex.lastIndex,
    });
  }

  const units = [];
  const allTopics = [];

  if (matches.length > 0) {
    for (let i = 0; i < matches.length; i++) {
      const current = matches[i];
      const next = matches[i + 1];
      const unitNum = parseUnitNumber(current.unitStr);

      const segmentText = cleanText.slice(
        current.endIndex,
        next ? next.index : cleanText.length
      ).trim();

      // Extract Unit Title: text before the first colon or first newline
      let unitTitle = `Unit ${unitNum}`;
      let topicContent = segmentText;

      const firstColonIdx = segmentText.indexOf(":");
      const firstNewlineIdx = segmentText.indexOf("\n");

      if (firstColonIdx !== -1 && (firstNewlineIdx === -1 || firstColonIdx < firstNewlineIdx + 80)) {
        const potentialTitle = segmentText.slice(0, firstColonIdx).trim();
        if (potentialTitle.length > 2 && potentialTitle.length < 90 && !potentialTitle.includes(",")) {
          unitTitle = `Unit ${unitNum}: ${cleanHeaderTitle(potentialTitle)}`;
          topicContent = segmentText.slice(firstColonIdx + 1).trim();
        }
      } else if (firstNewlineIdx !== -1 && firstNewlineIdx < 90) {
        const potentialTitle = segmentText.slice(0, firstNewlineIdx).trim();
        if (potentialTitle.length > 2 && !potentialTitle.includes(",")) {
          unitTitle = `Unit ${unitNum}: ${cleanHeaderTitle(potentialTitle)}`;
          topicContent = segmentText.slice(firstNewlineIdx + 1).trim();
        }
      }

      const extractedTopics = parseTopicsFromBlock(topicContent, unitNum, unitTitle);

      const parsedUnit = {
        unitNumber: unitNum,
        unitTitle,
        topics: extractedTopics,
      };

      units.push(parsedUnit);
      allTopics.push(...extractedTopics);
    }
  } else {
    // Fallback: extract line by line
    const extractedTopics = parseTopicsFromBlock(cleanText, 1, "Unit 1: Core Curriculum");
    units.push({
      unitNumber: 1,
      unitTitle: "Unit 1: Core Curriculum",
      topics: extractedTopics,
    });
    allTopics.push(...extractedTopics);
  }

  return { units, allTopics };
}
