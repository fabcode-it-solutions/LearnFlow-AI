import type { ParsedUnit, ParsedUnitTopic } from "../types";

const ROMAN_MAP: Record<string, number> = {
  i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10,
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
};

function parseUnitNumber(val?: string): number {
  if (!val) return 1;
  const clean = val.trim().toLowerCase();
  if (ROMAN_MAP[clean]) return ROMAN_MAP[clean];
  const num = parseInt(clean, 10);
  return isNaN(num) ? 1 : num;
}

// Postamble patterns that indicate end of syllabus
const POSTAMBLE_REGEX = /(?:course\s*outcomes?|text(?:\s*\/\s*reference)?\s*books?|reference\s*books?|suggested\s*readings?|evaluation\s*scheme|examination\s*scheme)/i;

function cleanHeaderTitle(title: string): string {
  const words = title.trim().split(/\s+/);
  return words.map((w, idx) => {
    const lower = w.toLowerCase();
    if (idx > 0 && ["of", "and", "in", "to", "for", "with", "a", "an", "the"].includes(lower)) {
      return lower;
    }
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  }).join(" ");
}

export function estimateTopicMinutes(title: string): number {
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

function parseTopicsFromBlock(content: string, unitNumber: number, unitTitle: string): ParsedUnitTopic[] {
  if (!content) return [];

  // Replace sub-headings like "NORMALIZATION:" or "Concurrency Control:"
  const normalized = content
    .replace(/\r?\n\s*([A-Z0-9\s\-]{3,40}:)/g, ", $1")
    .replace(/\r?\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Split on commas and semicolons
  const rawParts = normalized.split(/[;,]/);
  const cleanedParts: string[] = [];

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
      const nextParts: string[] = [];
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
  const unique: ParsedUnitTopic[] = [];
  const seen = new Set<string>();

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

export function parseSyllabusClient(rawText: string): { units: ParsedUnit[]; allTopics: ParsedUnitTopic[] } {
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

  const matches: Array<{
    fullMatch: string;
    unitStr: string;
    index: number;
    endIndex: number;
  }> = [];

  let match: RegExpExecArray | null;
  while ((match = unitRegex.exec(cleanText)) !== null) {
    matches.push({
      fullMatch: match[0],
      unitStr: match[1],
      index: match.index + (match[0].length - match[0].trimStart().length),
      endIndex: unitRegex.lastIndex,
    });
  }

  const units: ParsedUnit[] = [];
  const allTopics: ParsedUnitTopic[] = [];

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

      const parsedUnit: ParsedUnit = {
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

// Pre-built popular college / MCA curriculum samples so users can test with 1-click
export const SAMPLE_SYLLABI: Record<string, { subjectName: string; text: string }> = {
  dbms: {
    subjectName: "DATA BASE MANAGEMENT SYSTEM",
    text: `Unit–I OVERVIEW OF DATABASE MANAGEMENT SYSTEM:Database, Database Management system, Advantages of DBMS over file processing systems, Database Languages, Database Users and Administrator, Database system Structure, Storage Manager, Query Processor. Introduction to Client/Server architecture, Various views of data, three levels architecture of Database Systems, database Models, Attributes and Entity sets, Relationship and Relationship sets, mapping Constraints, Keys, Entity Relationship Diagram, Reduction of E-R diagram into tables. 
Unit-II RELATIONAL MODEL: Introduction to the Relational Model, Integrity Constraints Over relations, Enforcing Integrity constraints.
Relational Algebra and Calculus: Relational Algebra, Selection and projection set operations, renaming, Joins, Division, aggregate operations, Relational calculus- Tuple relational Calculus, Domain relational calculus, Query processing and Optimization. 
NORMALIZATION: Problems Caused by redundancy, Decompositions, Problem related to decomposition, Functional dependencies, Minimal Cover, Attribute Closure, FIRST, SECOND, THIRD Normal forms, BCNF, Lossless join Decomposition, Dependency preserving Decomposition, Schema refinement in Data base Design, Multi valued Dependencies, Fourth and Fifth Normal Form.
Unit-III OVERVIEW OF TRANSACTION MANAGEMENT: ACID Properties, Transaction States, Transactions and Schedules, Concurrent Execution of transaction.
Concurrency Control: Serializability and recoverability, Introduction to Lock Management, Lock Conversions, Specialized Locking Techniques, Time stamp based concurrency control, dealing with Dead Locks, Introduction to crash recovery, Log based recovery, Check points. 
Unit-IV PARALLEL AND DISTRIBUTED DATABASES: Basic concepts, architectures, parallelization of operations, Methods for data distribution: fragmentation and replication, catalog management, Distributed query processing: semi-joins and bloom-joins, Distributed transaction processing.`,
  },
  dataStructures: {
    subjectName: "DATA STRUCTURE",
    text: `UNIT I: Introduction to Data Structures & Arrays
Abstract Data Types (ADT), Arrays, Memory Representation, Operations on Arrays
Stacks: Array Implementation, Push and Pop Operations, Infix to Postfix Conversion, Evaluation of Postfix Expression
Queues: Linear Queue, Circular Queue, Double Ended Queue (Deque), Priority Queue

UNIT II: Linked Lists
Singly Linked Lists: Creation, Insertion, Deletion, Searching, Traversal
Doubly Linked Lists: Structure, Node Operations, Circular Linked Lists
Applications of Linked Lists: Polynomial Representation, Addition of Polynomials

UNIT III: Trees and Binary Search Trees
Tree Terminology, Binary Trees, Properties of Binary Trees
Binary Tree Traversals: Inorder, Preorder, Postorder Traversals (Recursive & Non-Recursive)
Binary Search Trees (BST): Insertion, Deletion, Search operations
Balanced Trees: AVL Trees, AVL Rotations, B-Trees, B+ Trees Introduction

UNIT IV: Graphs, Searching & Sorting
Graph Representations: Adjacency Matrix, Adjacency List
Graph Traversals: Breadth First Search (BFS), Depth First Search (DFS)
Minimum Spanning Trees: Prim's Algorithm, Kruskal's Algorithm
Shortest Paths: Dijkstra's Algorithm
Sorting Algorithms: Bubble Sort, Insertion Sort, Quick Sort, Merge Sort, Heap Sort`,
  },
  cloudComputing: {
    subjectName: "CLOUD COMPUTING",
    text: `UNIT I: Cloud Fundamentals & Models
Introduction to Cloud Computing, Roots of Cloud Computing, Cloud Characteristics
Cloud Service Models: Infrastructure as a Service (IaaS), Platform as a Service (PaaS), Software as a Service (SaaS)
Cloud Deployment Models: Public, Private, Community, Hybrid Cloud

UNIT II: Cloud Virtualization
Virtualization Concepts, Hypervisors: Type 1 and Type 2 Hypervisors
Server Virtualization, Storage Virtualization, Network Virtualization
Containerization Concepts: Docker, Containers vs Virtual Machines, Kubernetes Overview

UNIT III: Cloud Architecture & Storage
Service Oriented Architecture (SOA), Cloud Reference Architecture
Cloud Storage Architecture, Distributed File Systems, S3 Object Storage, Block Storage
Resource Management, Elasticity, Load Balancing in Cloud Environments

UNIT IV: Cloud Security & Future Trends
Cloud Security Challenges, Identity and Access Management (IAM), Data Encryption
Cloud Compliance, SLA (Service Level Agreements)
Edge Computing, Serverless Architecture, Multi-Cloud Strategies`,
  },
};
