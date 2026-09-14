/* The demo's stand-in for Lecture Studio.
 *
 * The live widget uploads a PDF or pasted transcript, extracts the text server-side
 * with pdf-parse, and sends it to a model with one of five prompts — notes, summary,
 * cheat sheet, flashcards, quiz. The first three come back as plain text; the last
 * two come back as JSON that gets parsed into card and quiz UIs.
 *
 * Here there is no model. The five artifacts below are fixed, written against one
 * sample lecture, and returned after a short delay so the loading states are real.
 * Uploading a file still extracts nothing — it just reports what the live version
 * would have pulled out. */

export const SAMPLE_NAME = "CNIT 25501 — Lecture 12, Normalization.pdf";

export const SAMPLE_TEXT = `CNIT 25501 — Lecture 12: Normalization

Normalization is the process of structuring a relational schema to reduce redundancy
and the update anomalies that come with it. Each normal form is a stricter condition
than the last; a table in 3NF is by definition also in 2NF and 1NF.

First normal form (1NF) requires that every attribute hold a single atomic value and
that each row be uniquely identifiable. A column holding a comma-separated list of
phone numbers violates 1NF.

Second normal form (2NF) requires 1NF plus the removal of partial dependencies: no
non-key attribute may depend on only part of a composite primary key. A table keyed
on (StudentID, CourseID) that also stores StudentName is in 1NF but not 2NF, because
StudentName depends on StudentID alone.

Third normal form (3NF) requires 2NF plus the removal of transitive dependencies: no
non-key attribute may depend on another non-key attribute. Storing both ZIP and City
in an order table is the classic violation, since City depends on ZIP, not on the
order key.

Boyce-Codd normal form (BCNF) tightens 3NF: every determinant must be a candidate
key. Most 3NF tables are already in BCNF; the exceptions involve overlapping
candidate keys.

Denormalization is the deliberate reversal of this for read performance, and it is
a trade, not a mistake — it buys fewer joins at the cost of maintaining redundant
data consistently.`;

export const SAMPLE_CHARS = SAMPLE_TEXT.length;

const NOTES = `NORMALIZATION — CNIT 25501, LECTURE 12

WHAT IT IS
- Structuring a relational schema to cut redundancy and the update anomalies it causes
- Normal forms are cumulative: 3NF implies 2NF implies 1NF

1NF — ATOMIC VALUES
- Every attribute holds a single value, no repeating groups or lists in a column
- Every row is uniquely identifiable
- Violation: a Phones column holding "765-555-0100, 765-555-0144"

2NF — NO PARTIAL DEPENDENCIES
- Requires 1NF
- No non-key attribute may depend on only part of a composite key
- Violation: key (StudentID, CourseID), and StudentName sits in the same table
- Fix: split StudentName into a Student table keyed on StudentID

3NF — NO TRANSITIVE DEPENDENCIES
- Requires 2NF
- No non-key attribute may depend on another non-key attribute
- Violation: an Orders table storing both ZIP and City, where City depends on ZIP
- Fix: move ZIP -> City into its own lookup table

BCNF — EVERY DETERMINANT IS A CANDIDATE KEY
- Strictly tighter than 3NF
- Most 3NF tables already satisfy it; exceptions involve overlapping candidate keys

DENORMALIZATION
- Deliberately reversing normalization to cut joins on read-heavy workloads
- A trade, not an error — you pay by keeping redundant copies consistent

EXAM WATCH
- Be able to name which form is violated AND the decomposition that fixes it
- "Depends on part of the key" = 2NF; "depends on a non-key attribute" = 3NF`;

const SUMMARY = `Normalization structures a relational schema so that a single fact is stored in a single place, which removes the insert, update and delete anomalies that redundancy causes. The normal forms are cumulative conditions of increasing strictness. First normal form demands atomic column values and uniquely identifiable rows. Second normal form adds the removal of partial dependencies, where a non-key attribute depends on only part of a composite key. Third normal form adds the removal of transitive dependencies, where a non-key attribute depends on another non-key attribute rather than on the key. Boyce-Codd normal form tightens third normal form by requiring every determinant to be a candidate key, which matters only when candidate keys overlap. Denormalization reverses the process on purpose to reduce joins on read-heavy workloads, and is a considered trade rather than a mistake, since the redundant copies then have to be kept consistent by hand.`;

const CHEATSHEET = `NORMALIZATION — ONE PAGE

THE TEST, IN ORDER
1NF  Atomic values, unique rows          | Kill lists-in-a-column
2NF  1NF + no partial dependency         | Non-key depends on PART of composite key
3NF  2NF + no transitive dependency      | Non-key depends on ANOTHER non-key
BCNF 3NF + every determinant is a key    | Only bites with overlapping candidate keys

FAST DIAGNOSIS
- Repeating group / comma list in a cell ......... 1NF
- Composite key, and an attribute needs only half . 2NF
- A -> B -> C where B and C are both non-key ..... 3NF
- A determinant that isn't a candidate key ....... BCNF

CANONICAL VIOLATIONS
- Phones = "765-555-0100, 765-555-0144"              -> 1NF
- (StudentID, CourseID) + StudentName                -> 2NF
- Orders(OrderID, ZIP, City), City depends on ZIP    -> 3NF

VOCABULARY
- Determinant: an attribute that functionally determines another
- Candidate key: a minimal attribute set that uniquely identifies a row
- Partial dependency: on part of a composite key
- Transitive dependency: through a non-key attribute

GOTCHAS
- Normal forms are cumulative — you cannot be in 3NF and not in 2NF
- 2NF is only ever at risk when the primary key is composite
- Denormalization is a performance trade, not a failure; say why you'd take it
- Decomposition must be lossless: the join of the parts must rebuild the original`;

const FLASHCARDS = [
  { front: "Normalization", back: "Structuring a relational schema to reduce redundancy and the update anomalies that come with it." },
  { front: "1NF", back: "Every attribute holds a single atomic value and every row is uniquely identifiable. No repeating groups." },
  { front: "2NF", back: "1NF plus no partial dependencies — no non-key attribute depends on only part of a composite primary key." },
  { front: "3NF", back: "2NF plus no transitive dependencies — no non-key attribute depends on another non-key attribute." },
  { front: "BCNF", back: "3NF plus: every determinant is a candidate key. Tighter than 3NF, and only differs when candidate keys overlap." },
  { front: "Partial dependency", back: "A non-key attribute depending on part, but not all, of a composite primary key. The 2NF violation." },
  { front: "Transitive dependency", back: "A non-key attribute depending on another non-key attribute rather than on the key. The 3NF violation." },
  { front: "Determinant", back: "An attribute (or set) that functionally determines another attribute." },
  { front: "Candidate key", back: "A minimal set of attributes that uniquely identifies every row in a relation." },
  { front: "Why does (StudentID, CourseID) + StudentName break 2NF?", back: "StudentName depends on StudentID alone — only part of the composite key." },
  { front: "Why do ZIP and City together break 3NF?", back: "City depends on ZIP, a non-key attribute, rather than on the table's key. That's a transitive dependency." },
  { front: "Denormalization", back: "Deliberately reintroducing redundancy to cut joins on read-heavy workloads. A trade: you pay by keeping the copies consistent." },
];

const QUIZ = [
  {
    question: "A Students table stores a Phones column containing \"765-555-0100, 765-555-0144\". Which normal form is violated?",
    options: ["1NF", "2NF", "3NF", "BCNF"],
    answer: 0,
    explanation: "1NF requires atomic values. A comma-separated list in one column is a repeating group.",
  },
  {
    question: "A table keyed on (StudentID, CourseID) also stores StudentName. What is wrong?",
    options: ["A transitive dependency", "A partial dependency", "A repeating group", "Nothing — it's in 3NF"],
    answer: 1,
    explanation: "StudentName depends on StudentID alone, which is only part of the composite key. That is a partial dependency, so the table is in 1NF but not 2NF.",
  },
  {
    question: "An Orders table stores OrderID (key), ZIP and City. Which form does it violate?",
    options: ["1NF", "2NF", "3NF", "None"],
    answer: 2,
    explanation: "City depends on ZIP, a non-key attribute, not on OrderID. That is a transitive dependency and a 3NF violation.",
  },
  {
    question: "Which statement about the normal forms is true?",
    options: [
      "A table can be in 3NF without being in 2NF",
      "They are cumulative — 3NF implies 2NF implies 1NF",
      "BCNF is weaker than 3NF",
      "2NF only applies to tables with a single-column key",
    ],
    answer: 1,
    explanation: "Each form is a stricter condition than the last, so satisfying a higher form means satisfying all lower ones.",
  },
  {
    question: "When can a table with a single-column primary key violate 2NF?",
    options: ["Whenever it has more than three columns", "Never — 2NF needs a composite key to be at risk", "When it has a foreign key", "When it stores dates"],
    answer: 1,
    explanation: "A partial dependency means depending on part of the key. With a single-column key there is no part to depend on.",
  },
  {
    question: "What distinguishes BCNF from 3NF?",
    options: [
      "BCNF requires every determinant to be a candidate key",
      "BCNF forbids composite keys",
      "BCNF allows transitive dependencies",
      "BCNF only applies to views",
    ],
    answer: 0,
    explanation: "3NF tolerates a determinant that is not a candidate key when the dependent attribute is part of a candidate key; BCNF does not.",
  },
  {
    question: "Denormalization is best described as:",
    options: [
      "A design error to be corrected",
      "A deliberate trade of redundancy for fewer joins on read",
      "A synonym for 1NF",
      "Something only NoSQL databases do",
    ],
    answer: 1,
    explanation: "It is chosen on purpose for read performance, and paid for by having to keep the redundant copies consistent.",
  },
  {
    question: "A decomposition is lossless when:",
    options: [
      "No column is dropped",
      "Joining the resulting tables reproduces the original relation exactly",
      "The tables have the same number of rows",
      "Every table ends up in BCNF",
    ],
    answer: 1,
    explanation: "Losslessness is about being able to rebuild the original by joining the parts — nothing spurious and nothing missing.",
  },
];

export const ARTIFACTS = {
  notes: { content: NOTES },
  summary: { content: SUMMARY },
  cheatsheet: { content: CHEATSHEET },
  flashcards: { data: FLASHCARDS },
  quiz: { data: QUIZ },
} as const;

export type LectureKind = keyof typeof ARTIFACTS;
