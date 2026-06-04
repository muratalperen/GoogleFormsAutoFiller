// Core-logic tests for Google Forms Auto Filler.
//
// No test framework, no dependencies (matches the project's zero-build stance).
// Loads the REAL source files into a sandboxed vm context, stubbing the browser
// APIs the content script touches at load time, then asserts on the actual
// exported functions.
//
//   Run:  node test/core.test.js
//   Exit: 0 = all passed, 1 = one or more failed.

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");

let pass = 0;
let fail = 0;
const failures = [];

function eq(actual, expected, name) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    pass++;
  } else {
    fail++;
    failures.push(`✗ ${name}\n    expected: ${e}\n    actual:   ${a}`);
  }
}

// ---- Sandbox with browser stubs so the content script loads under Node ----
const sandbox = {
  console,
  JSON,
  Math,
  Array,
  Object,
  String,
  parseInt,
  setTimeout: () => 0,
  clearTimeout: () => {},
  Event: class Event {},
  MutationObserver: class MutationObserver { observe() {} disconnect() {} },
  document: { readyState: "loading", querySelector: () => null },
  window: {},
  chrome: {
    storage: { onChanged: { addListener: () => {} } },
    runtime: { onMessage: { addListener: () => {} } },
  },
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

for (const f of ["scripts/csvParser.js", "scripts/GoogleForm.js"]) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), sandbox, { filename: f });
}

const parseCSV = sandbox.GFAFCsv.parseCSV;
const toISO = sandbox.toISO;
const similarity = sandbox.CalculateSimilarity;
const findBestMatch = sandbox.findBestMatch;

// ===================== CSV parser =====================
eq(parseCSV("name,John\nemail,john@x.com"),
   { name: "John", email: "john@x.com" }, "CSV: basic two rows");
eq(parseCSV('addr,"123 Main, Apt 4"'),
   { addr: "123 Main, Apt 4" }, "CSV: quoted comma kept in value");
eq(parseCSV('bio,"line1\nline2"'),
   { bio: "line1\nline2" }, "CSV: quoted newline kept in value");
eq(parseCSV('q,"He said ""hi"""'),
   { q: 'He said "hi"' }, 'CSV: "" escapes to literal quote');
eq(parseCSV("﻿name,John"),
   { name: "John" }, "CSV: leading BOM stripped");
eq(parseCSV("a,1\r\nb,2\rc,3"),
   { a: "1", b: "2", c: "3" }, "CSV: CRLF / CR / LF all terminate rows");
eq(parseCSV("name,John\nonlyonecol\nemail,x@y.com"),
   { name: "John", email: "x@y.com" }, "CSV: row with <2 cells skipped");
eq(parseCSV('k,"unterminated'),
   { k: "unterminated" }, "CSV: unterminated quote flushed, no throw");
eq(parseCSV("  name  ,  John  "),
   { name: "John" }, "CSV: key/value trimmed");
eq(parseCSV(""), {}, "CSV: empty input -> empty object");

// ===================== toISO (date normalization) =====================
eq(toISO("2026-03-04", "DMY"), "2026-03-04", "date: ISO passes through");
eq(toISO("03/04/2026", "DMY"), "2026-04-03", "date: DMY -> day=03 month=04");
eq(toISO("03/04/2026", "MDY"), "2026-03-04", "date: MDY -> month=03 day=04");
eq(toISO("13/04/2026", "AUTO"), "2026-04-13", "date: AUTO first>12 => DMY");
eq(toISO("03/14/2026", "AUTO"), "2026-03-14", "date: AUTO second>12 => MDY");
eq(toISO("03/04/2026", "AUTO"), "2026-04-03", "date: AUTO ambiguous => DMY tie-break");
eq(toISO("5/6/2026", "DMY"), "2026-06-05", "date: single-digit padded");
eq(toISO("03.04.2026", "DMY"), "2026-04-03", "date: dot separator");
eq(toISO("not a date", "DMY"), "not a date", "date: unparseable passes through");
eq(toISO("03/04/2026", undefined), "2026-04-03", "date: default fmt is DMY");

// ===================== Fuzzy matching =====================
const fd = { Email: "a@b.com", Phone: "555-1234", Name: "Jo" };

eq(similarity("email", "email"), 100, "match: identical strings = 100");

// Punctuation-level fuzziness (full-string Levenshtein path) — pre-existing.
eq(findBestMatch("E-mail", fd), "Email", "match: 'E-mail' -> 'Email' (full-string fuzzy)");
eq(findBestMatch("Name", fd), "Name", "match: exact title matches key");
eq(findBestMatch("totally unrelated xyz", fd), null, "match: below threshold returns null");

// Token-coverage path — verbose form titles vs short saved keys (NEW behavior).
eq(findBestMatch("Email Address", fd), "Email", "match: 'Email Address' -> 'Email' (token coverage)");
eq(findBestMatch("Phone Number", fd), "Phone", "match: 'Phone Number' -> 'Phone' (token coverage)");

// Must NOT match: 'Username' is a single token, only 50% similar to 'Name'.
eq(findBestMatch("Username", fd), null, "match: 'Username' does NOT reach 'Name' (single token, 50%)");

// Documented residual of token coverage: a content word collides with a key.
eq(findBestMatch("Project Name", fd), "Name", "match: 'Project Name' -> 'Name' (accepted residual)");

// ===================== Report =====================
console.log("");
for (const f of failures) console.log(f);
console.log("");
console.log(`${pass} passed, ${fail} failed, ${pass + fail} total`);
process.exit(fail === 0 ? 0 : 1);
