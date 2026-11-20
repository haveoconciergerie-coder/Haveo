#!/usr/bin/env node

import { promises as fs } from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const jsonMode = args.includes("--json");
const targetArg = args.find((arg) => !arg.startsWith("--")) ?? ".";
const target = path.resolve(targetArg);

const ignored = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  ".next",
  ".nuxt",
  ".svelte-kit",
  "coverage",
  "vendor"
]);

const extensions = new Set([
  ".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx",
  ".vue", ".svelte", ".astro", ".html", ".css",
  ".scss", ".sass", ".less"
]);

const rules = [
  {
    id: "global-scroll-listener",
    severity: "review",
    pattern: /(?:window|document)\.addEventListener\s*\(\s*["']scroll["']/g,
    message: "Global scroll listener found. Confirm that work is rAF-coalesced, passive where valid, and cleaned up."
  },
  {
    id: "layout-read",
    severity: "review",
    pattern: /\.getBoundingClientRect\s*\(\s*\)/g,
    message: "Layout measurement found. Check whether it runs repeatedly during scroll after layout writes."
  },
  {
    id: "hardcoded-scroll-track",
    severity: "warning",
    pattern: /(?:height|min-height|block-size|min-block-size)\s*:\s*(?:[3-9]\d{2}|[1-9]\d{3,})vh\b/gi,
    message: "Large viewport-height track found. Prefer real step elements when scroll distance represents discrete content."
  },
  {
    id: "transition-all",
    severity: "warning",
    pattern: /transition(?:-property)?\s*:\s*all\b/gi,
    message: "`transition: all` can animate layout or paint-heavy properties accidentally. Name the intended properties."
  },
  {
    id: "layout-property-transition",
    severity: "warning",
    pattern: /transition(?:-property)?\s*:[^;]*(?:width|height|top|left|right|bottom|margin|padding)/gi,
    message: "A layout-related property appears in a transition. Prefer transform/opacity where the visual design allows."
  },
  {
    id: "broad-will-change",
    severity: "warning",
    pattern: /will-change\s*:\s*(?:all|auto|[^;]*,[^;]*,[^;]*)/gi,
    message: "Broad `will-change` usage found. Excess layer promotion can increase memory and compositing cost."
  },
  {
    id: "smooth-scroll-css",
    severity: "review",
    pattern: /scroll-behavior\s*:\s*smooth/gi,
    message: "Smooth scrolling found. Confirm a reduced-motion override sets it to auto."
  },
  {
    id: "backdrop-filter",
    severity: "review",
    pattern: /backdrop-filter\s*:/gi,
    message: "Backdrop filtering found. Profile repaint/compositing cost, especially inside sticky or fixed regions."
  },
  {
    id: "fixed-background",
    severity: "review",
    pattern: /background-attachment\s*:\s*fixed/gi,
    message: "Fixed background found. Test mobile painting and scrolling behavior."
  },
  {
    id: "react-scroll-state",
    severity: "warning",
    pattern: /addEventListener\s*\(\s*["']scroll["'][\s\S]{0,500}\bset[A-Z]\w*\s*\(/g,
    message: "A scroll handler appears to call a React-style state setter. Continuous progress should not rerender the tree per event."
  },
  {
    id: "manual-scroll-offset",
    severity: "review",
    pattern: /window\.scrollTo\s*\([\s\S]{0,250}(?:offsetTop|getBoundingClientRect|scrollHeight|innerHeight)/g,
    message: "Manual scroll-coordinate calculation found. Prefer scrolling to a real target element when possible."
  }
];

async function walk(dir) {
  const output = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (ignored.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      output.push(...await walk(full));
    } else if (extensions.has(path.extname(entry.name).toLowerCase())) {
      output.push(full);
    }
  }
  return output;
}

function lineForIndex(text, index) {
  return text.slice(0, index).split("\n").length;
}

async function main() {
  const stat = await fs.stat(target).catch(() => null);
  if (!stat) {
    console.error(`Target does not exist: ${target}`);
    process.exit(2);
  }

  const files = stat.isDirectory() ? await walk(target) : [target];
  const findings = [];
  let hasReducedMotion = false;
  let hasObserver = false;

  for (const file of files) {
    const text = await fs.readFile(file, "utf8").catch(() => "");
    if (/prefers-reduced-motion/.test(text)) hasReducedMotion = true;
    if (/IntersectionObserver/.test(text)) hasObserver = true;

    for (const rule of rules) {
      rule.pattern.lastIndex = 0;
      for (const match of text.matchAll(rule.pattern)) {
        findings.push({
          rule: rule.id,
          severity: rule.severity,
          file: path.relative(target, file) || path.basename(file),
          line: lineForIndex(text, match.index ?? 0),
          message: rule.message
        });
      }
    }
  }

  if (findings.some((item) => item.rule === "smooth-scroll-css") && !hasReducedMotion) {
    findings.push({
      rule: "missing-reduced-motion",
      severity: "warning",
      file: "(project)",
      line: 0,
      message: "Smooth scrolling was found but no `prefers-reduced-motion` handling was detected in scanned source."
    });
  }

  const result = {
    target,
    scannedFiles: files.length,
    signals: {
      intersectionObserverDetected: hasObserver,
      reducedMotionDetected: hasReducedMotion
    },
    findings
  };

  if (jsonMode) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log("# Zero-Jank Scroll Source Audit\n");
  console.log(`Scanned **${files.length}** source files.\n`);
  console.log("> This is a heuristic source review. It cannot prove or disprove runtime smoothness.\n");

  if (findings.length === 0) {
    console.log("No configured source-level risk patterns were found.");
    return;
  }

  for (const finding of findings) {
    const location = finding.line ? `${finding.file}:${finding.line}` : finding.file;
    console.log(`- **${finding.severity.toUpperCase()}** \`${finding.rule}\` — ${location}`);
    console.log(`  ${finding.message}`);
  }

  console.log("\n## Signals");
  console.log(`- IntersectionObserver detected: ${hasObserver ? "yes" : "no"}`);
  console.log(`- Reduced-motion handling detected: ${hasReducedMotion ? "yes" : "no"}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
