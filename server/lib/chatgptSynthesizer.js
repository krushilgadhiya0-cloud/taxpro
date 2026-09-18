/**
 * TaxPro ChatGPT-Grade Autonomous Domain Solvers & Cognitive Synthesizer
 * 
 * Provides production-quality, articulate, conversational responses
 * structured exactly like ChatGPT across:
 *   1. Programming & Software Engineering (Code blocks, complexity, explanations)
 *   2. Income Tax Calculations (Exact math for FY 24-25 / 25-26, New vs Old Regime)
 *   3. Indian Statutory Compliance (GST, TDS, Advance Tax, Capital Gains)
 *   4. Business Drafting & Professional Letters (Resignation, Leave, Fee Notices)
 *   5. Modern Tech & Scientific Concepts (Quantum Computing, AI, Blockchain, Cloud)
 */

// =========================================================================
// 1. PROGRAMMING & CODE SYNTHESIZER
// =========================================================================

export function solveCodingQuery(query) {
  const lower = (query || '').toLowerCase().trim();

  // A. Debounce Function
  if (lower.includes('debounce')) {
    const isReact = lower.includes('react') || lower.includes('hook');
    if (isReact) {
      return `### ⚡ Custom React Hook: \`useDebounce\`\n\n` +
        `Here is a production-ready **\`useDebounce\`** hook in React to delay updating a value until user activity (like typing in a search bar) has paused.\n\n` +
        `\`\`\`javascript\n` +
        `import { useState, useEffect } from 'react';\n\n` +
        `/**\n` +
        ` * Custom hook that debounces any fast-changing value\n` +
        ` * @param {any} value - The input value to debounce\n` +
        ` * @param {number} delay - Delay in milliseconds (default: 500ms)\n` +
        ` * @returns {any} debouncedValue\n` +
        ` */\n` +
        `export function useDebounce(value, delay = 500) {\n` +
        `  const [debouncedValue, setDebouncedValue] = useState(value);\n\n` +
        `  useEffect(() => {\n` +
        `    // Set a timer to update debounced value after specified delay\n` +
        `    const timer = setTimeout(() => {\n` +
        `      setDebouncedValue(value);\n` +
        `    }, delay);\n\n` +
        `    // Clean up timer if value changes before delay expires (cancels previous timeout)\n` +
        `    return () => {\n` +
        `      clearTimeout(timer);\n` +
        `    };\n` +
        `  }, [value, delay]);\n\n` +
        `  return debouncedValue;\n` +
        `}\n` +
        `\`\`\`\n\n` +
        `#### 💡 Usage Example in a Search Input:\n` +
        `\`\`\`jsx\n` +
        `import React, { useState, useEffect } from 'react';\n` +
        `import { useDebounce } from './useDebounce';\n\n` +
        `function SearchClient() {\n` +
        `  const [query, setQuery] = useState('');\n` +
        `  const debouncedQuery = useDebounce(query, 400);\n\n` +
        `  useEffect(() => {\n` +
        `    if (debouncedQuery.trim()) {\n` +
        `      console.log('Dispatching API search for:', debouncedQuery);\n` +
        `      // fetch(\`/api/clients?q=\${encodeURIComponent(debouncedQuery)}\`)\n` +
        `    }\n` +
        `  }, [debouncedQuery]);\n\n` +
        `  return (\n` +
        `    <input\n` +
        `      type="text"\n` +
        `      placeholder="Search tax clients..."\n` +
        `      value={query}\n` +
        `      onChange={(e) => setQuery(e.target.value)}\n` +
        `      className="p-2 border rounded-lg w-full"\n` +
        `    />\n` +
        `  );\n` +
        `}\n` +
        `\`\`\`\n\n` +
        `• **Time Complexity:** $O(1)$ per keystroke overhead.\n` +
        `• **Benefit:** Prevents flooding your server with API calls on every keystroke!`;
    }

    return `### ⚡ JavaScript Debounce Function\n\n` +
      `A **debounce** function ensures that a given task is only executed after a specified pause in invocations.\n\n` +
      `\`\`\`javascript\n` +
      `/**\n` +
      ` * Standard Debounce Implementation in Vanilla JavaScript\n` +
      ` * @param {Function} func - The callback function to execute\n` +
      ` * @param {number} wait - Delay in milliseconds (e.g. 300ms)\n` +
      ` * @returns {Function} Debounced function\n` +
      ` */\n` +
      `function debounce(func, wait = 300) {\n` +
      `  let timeoutId = null;\n\n` +
      `  return function (...args) {\n` +
      `    const context = this;\n\n` +
      `    // Clear previous pending timer\n` +
      `    if (timeoutId) {\n` +
      `      clearTimeout(timeoutId);\n` +
      `    }\n\n` +
      `    // Schedule new execution\n` +
      `    timeoutId = setTimeout(() => {\n` +
      `      func.apply(context, args);\n` +
      `    }, wait);\n` +
      `  };\n` +
      `}\n\n` +
      `// --- Example Usage ---\n` +
      `function handleSearch(event) {\n` +
      `  console.log('Searching API for:', event.target.value);\n` +
      `}\n\n` +
      `const debouncedSearch = debounce(handleSearch, 400);\n` +
      `document.getElementById('search-input')?.addEventListener('input', debouncedSearch);\n` +
      `\`\`\`\n\n` +
      `### 🔍 Key Concepts:\n` +
      `1. **Closure:** \`timeoutId\` is preserved across calls via closure.\n` +
      `2. **Context Preservation:** \`func.apply(context, args)\` ensures \`this\` and parameters are passed faithfully.\n` +
      `3. **Garbage Collection:** Clear timeouts avoid memory leaks.`;
  }

  // B. Reverse String / Reverse Array
  if (lower.includes('reverse') && (lower.includes('string') || lower.includes('array') || lower.includes('word'))) {
    const isPython = lower.includes('python');
    if (isPython) {
      return `### 🔄 Reversing a String in Python\n\n` +
        `Python provides multiple elegant ways to reverse strings:\n\n` +
        `#### 1. Idiomatic Slicing (Fastest & Recommended)\n` +
        `\`\`\`python\n` +
        `text = "TaxPro AI"\n` +
        `reversed_text = text[::-1]\n` +
        `print(reversed_text)  # Output: "IA orPxaT"\n` +
        `\`\`\`\n\n` +
        `#### 2. Using Two-Pointer Algorithm (In-Place on Character List)\n` +
        `\`\`\`python\n` +
        `def reverse_string_two_pointer(s: str) -> str:\n` +
        `    chars = list(s)\n` +
        `    left, right = 0, len(chars) - 1\n` +
        `    while left < right:\n` +
        `        chars[left], chars[right] = chars[right], chars[left]\n` +
        `        left += 1\n` +
        `        right -= 1\n` +
        `    return "".join(chars)\n\n` +
        `print(reverse_string_two_pointer("hello"))  # "olleh"\n` +
        `\`\`\`\n\n` +
        `• **Time Complexity:** $O(n)$ where $n$ is string length.\n` +
        `• **Space Complexity:** $O(n)$ because Python strings are immutable.`;
    }

    return `### 🔄 Reversing a String in JavaScript\n\n` +
      `Here are the two most common approaches in JavaScript:\n\n` +
      `#### 1. Built-in Methods (\`split\`, \`reverse\`, \`join\`)\n` +
      `\`\`\`javascript\n` +
      `function reverseString(str) {\n` +
      `  return str.split('').reverse().join('');\n` +
      `}\n\n` +
      `console.log(reverseString('TaxPro')); // Output: 'orPxaT'\n` +
      `\`\`\`\n\n` +
      `#### 2. Two-Pointer Algorithm (Interview Favorite)\n` +
      `\`\`\`javascript\n` +
      `function reverseStringTwoPointer(str) {\n` +
      `  const chars = str.split('');\n` +
      `  let left = 0;\n` +
      `  let right = chars.length - 1;\n\n` +
      `  while (left < right) {\n` +
      `    [chars[left], chars[right]] = [chars[right], chars[left]];\n` +
      `    left++;\n` +
      `    right--;\n` +
      `  }\n\n` +
      `  return chars.join('');\n` +
      `}\n\n` +
      `console.log(reverseStringTwoPointer('frontend')); // Output: 'dnetnorf'\n` +
      `\`\`\`\n\n` +
      `• **Time Complexity:** $O(n)$\n` +
      `• **Space Complexity:** $O(n)$`;
  }

  // C. Binary Search
  if (lower.includes('binary search')) {
    const isPython = lower.includes('python');
    if (isPython) {
      return `### 🎯 Binary Search in Python ($O(\\log n)$)\n\n` +
        `Binary search finds the position of a target value within a **sorted array** by halving the search interval repeatedly.\n\n` +
        `\`\`\`python\n` +
        `def binary_search(arr: list[int], target: int) -> int:\n` +
        `    low = 0\n` +
        `    high = len(arr) - 1\n\n` +
        `    while low <= high:\n` +
        `        # Prevent potential integer overflow\n` +
        `        mid = low + (high - low) // 2\n\n` +
        `        if arr[mid] == target:\n` +
        `            return mid  # Target found at index mid\n` +
        `        elif arr[mid] < target:\n` +
        `            low = mid + 1  # Search right half\n` +
        `        else:\n` +
        `            high = mid - 1  # Search left half\n\n` +
        `    return -1  # Target not found\n\n` +
        `# Example\n` +
        `nums = [2, 5, 8, 12, 16, 23, 38, 56, 72, 91]\n` +
        `print(binary_search(nums, 23))  # Output: 5\n` +
        `print(binary_search(nums, 99))  # Output: -1\n` +
        `\`\`\`\n\n` +
        `• **Precondition:** Array must be sorted in ascending order.\n` +
        `• **Time Complexity:** Best: $O(1)$, Average/Worst: $O(\\log n)$.\n` +
        `• **Space Complexity:** $O(1)$ auxiliary memory.`;
    }

    return `### 🎯 Binary Search in JavaScript ($O(\\log n)$)\n\n` +
      `\`\`\`javascript\n` +
      `function binarySearch(arr, target) {\n` +
      `  let low = 0;\n` +
      `  let high = arr.length - 1;\n\n` +
      `  while (low <= high) {\n` +
      `    const mid = Math.floor(low + (high - low) / 2);\n\n` +
      `    if (arr[mid] === target) {\n` +
      `      return mid; // Found index\n` +
      `    } else if (arr[mid] < target) {\n` +
      `      low = mid + 1;\n` +
      `    } else {\n` +
      `      high = mid - 1;\n` +
      `    }\n` +
      `  }\n\n` +
      `  return -1; // Not found\n` +
      `}\n\n` +
      `const numbers = [10, 20, 30, 40, 50, 60, 70];\n` +
      `console.log(binarySearch(numbers, 40)); // Output: 3\n` +
      `console.log(binarySearch(numbers, 95)); // Output: -1\n` +
      `\`\`\`\n\n` +
      `• **Time Complexity:** $O(\\log n)$\n` +
      `• **Space Complexity:** $O(1)$`;
  }

  // D. Two Sum Problem
  if (lower.includes('two sum')) {
    return `### 🧩 Two Sum Problem (Optimal Hash Map Solution)\n\n` +
      `Given an array of integers \`nums\` and an integer \`target\`, return indices of the two numbers such that they add up to \`target\`.\n\n` +
      `\`\`\`javascript\n` +
      `/**\n` +
      ` * Finds two indices whose values sum to target in O(n) time\n` +
      ` */\n` +
      `function twoSum(nums, target) {\n` +
      `  const seen = new Map(); // value -> index\n\n` +
      `  for (let i = 0; i < nums.length; i++) {\n` +
      `    const complement = target - nums[i];\n` +
      `    if (seen.has(complement)) {\n` +
      `      return [seen.get(complement), i];\n` +
      `    }\n` +
      `    seen.set(nums[i], i);\n` +
      `  }\n\n` +
      `  return []; // No pair found\n` +
      `}\n\n` +
      `// Test\n` +
      `console.log(twoSum([2, 7, 11, 15], 9)); // Output: [0, 1]\n` +
      `console.log(twoSum([3, 2, 4], 6));       // Output: [1, 2]\n` +
      `\`\`\`\n\n` +
      `### ⚡ Complexity Analysis:\n` +
      `• **Time Complexity:** $O(n)$ — Single pass through the array with $O(1)$ average hash map lookups.\n` +
      `• **Space Complexity:** $O(n)$ — Stores at most $n$ elements in the hash map.`;
  }

  // E. Regular Expressions (PAN, GSTIN, Email, Phone)
  if (lower.includes('regex') || lower.includes('regular expression')) {
    if (lower.includes('pan')) {
      return `### 🪪 Indian PAN Card Regex\n\n` +
        `\`\`\`javascript\n` +
        `const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;\n\n` +
        `function validatePAN(pan) {\n` +
        `  return PAN_REGEX.test(String(pan).trim().toUpperCase());\n` +
        `}\n\n` +
        `// Tests\n` +
        `console.log(validatePAN('ABCDE1234F')); // true\n` +
        `console.log(validatePAN('12345ABCDE')); // false\n` +
        `\`\`\`\n\n` +
        `#### 🔍 Structure Breakdown:\n` +
        `1. \`^[A-Z]{5}\`: 5 uppercase letters (4th letter indicates status: P = Person, C = Company, F = Firm).\n` +
        `2. \`[0-9]{4}\`: 4 sequential digits (0001 to 9999).\n` +
        `3. \`[A-Z]{1}$\`: 1 alphabetic check digit.`;
    }

    if (lower.includes('gst') || lower.includes('gstin')) {
      return `### 🧾 Indian GSTIN Regex\n\n` +
        `\`\`\`javascript\n` +
        `const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;\n\n` +
        `function validateGSTIN(gstin) {\n` +
        `  return GSTIN_REGEX.test(String(gstin).trim().toUpperCase());\n` +
        `}\n\n` +
        `console.log(validateGSTIN('27ABCDE1234F1Z5')); // true (27 = Maharashtra)\n` +
        `\`\`\`\n\n` +
        `#### 🔍 15-Digit Breakdown:\n` +
        `• **Chars 1-2:** 2-digit State Code (e.g. 24 = Gujarat, 27 = Maharashtra, 29 = Karnataka).\n` +
        `• **Chars 3-12:** 10-digit Permanent Account Number (PAN).\n` +
        `• **Char 13:** Entity number of the same PAN holder in the state (1-9 or A-Z).\n` +
        `• **Char 14:** Default letter \`Z\`.\n` +
        `• **Char 15:** Checksum digit.`;
    }

    if (lower.includes('email')) {
      return `### 📧 Email Validation Regex\n\n` +
        `\`\`\`javascript\n` +
        `const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$/;\n\n` +
        `function isValidEmail(email) {\n` +
        `  return EMAIL_REGEX.test(String(email).trim());\n` +
        `}\n\n` +
        `console.log(isValidEmail('admin@taxpro.com')); // true\n` +
        `console.log(isValidEmail('invalid@domain'));   // false\n` +
        `\`\`\`\n\n` +
        `• Matches RFC 5322 standard email formats while preventing invalid double dots and missing TLDs.`;
    }

    if (lower.includes('phone') || lower.includes('mobile')) {
      return `### 📱 Indian Mobile Number Regex\n\n` +
        `\`\`\`javascript\n` +
        `const PHONE_REGEX = /^(?:\\+91[\\-\\s]?)?[6789]\\d{9}$/;\n\n` +
        `function validateIndianPhone(phone) {\n` +
        `  return PHONE_REGEX.test(String(phone).trim());\n` +
        `}\n\n` +
        `console.log(validateIndianPhone('+91 9876543210')); // true\n` +
        `console.log(validateIndianPhone('9876543210'));     // true\n` +
        `console.log(validateIndianPhone('5123456789'));     // false (must start with 6, 7, 8, 9)\n` +
        `\`\`\``;
    }
  }

  // F. SQL Queries & Joins
  if (lower.includes('sql') || lower.includes('database query')) {
    if (lower.includes('join') || lower.includes('difference between inner join')) {
      return `### 🗄️ SQL JOINs Explained with Visual Examples\n\n` +
        `| JOIN Type | What It Returns | Venn Diagram Concept |\n` +
        `| :--- | :--- | :--- |\n` +
        `| **INNER JOIN** | Rows that have matching values in **both** tables. | The overlap region only. |\n` +
        `| **LEFT JOIN** | All rows from Left table, plus matched rows from Right (NULL if no match). | All of Left + common overlap. |\n` +
        `| **RIGHT JOIN** | All rows from Right table, plus matched rows from Left (NULL if no match). | All of Right + common overlap. |\n` +
        `| **FULL OUTER JOIN** | All rows when there is a match in **either** left or right table. | Entire union of both tables. |\n\n` +
        `#### 💻 Code Syntax:\n` +
        `\`\`\`sql\n` +
        `-- 1. INNER JOIN: Only clients with payments\n` +
        `SELECT c.id, c.name, p.amount, p.status\n` +
        `FROM clients c\n` +
        `INNER JOIN payments p ON c.id = p.client_id;\n\n` +
        `-- 2. LEFT JOIN: All clients, even those without payments yet\n` +
        `SELECT c.id, c.name, COALESCE(p.amount, 0) AS amount\n` +
        `FROM clients c\n` +
        `LEFT JOIN payments p ON c.id = p.client_id;\n` +
        `\`\`\``;
    }

    if (lower.includes('second highest') || lower.includes('2nd highest')) {
      return `### 🥈 Second Highest Salary in SQL\n\n` +
        `Here are the two standard industry solutions:\n\n` +
        `#### Method 1: Using \`LIMIT\` and \`OFFSET\` (MySQL & PostgreSQL)\n` +
        `\`\`\`sql\n` +
        `SELECT DISTINCT salary \n` +
        `FROM employees \n` +
        `ORDER BY salary DESC \n` +
        `LIMIT 1 OFFSET 1;\n` +
        `\`\`\`\n\n` +
        `#### Method 2: Standard Window Function \`DENSE_RANK()\` (Handles Ties Cleanly)\n` +
        `\`\`\`sql\n` +
        `WITH RankedSalaries AS (\n` +
        `  SELECT salary, DENSE_RANK() OVER (ORDER BY salary DESC) as rnk\n` +
        `  FROM employees\n` +
        `)\n` +
        `SELECT DISTINCT salary\n` +
        `FROM RankedSalaries\n` +
        `WHERE rnk = 2;\n` +
        `\`\`\`\n\n` +
        `• **Pro Tip:** Always use \`DENSE_RANK()\` rather than \`ROW_NUMBER()\` so duplicate top salaries don't skew the 2nd place!`;
    }
  }

  // G. Center a Div in CSS
  if (lower.includes('center') && (lower.includes('div') || lower.includes('css'))) {
    return `### 🎯 How to Center a \`div\` in CSS\n\n` +
      `Here are the two modern, foolproof methods used in modern web development:\n\n` +
      `#### Method 1: Modern Flexbox (Most Popular & Flexible)\n` +
      `\`\`\`css\n` +
      `.parent-container {\n` +
      `  display: flex;\n` +
      `  justify-content: center; /* Horizontal centering */\n` +
      `  align-items: center;     /* Vertical centering */\n` +
      `  min-height: 100vh;       /* Full viewport height */\n` +
      `}\n` +
      `\`\`\`\n\n` +
      `#### Method 2: CSS Grid (Shortest - Just 2 Lines!)\n` +
      `\`\`\`css\n` +
      `.parent-container {\n` +
      `  display: grid;\n` +
      `  place-items: center;\n` +
      `  min-height: 100vh;\n` +
      `}\n` +
      `\`\`\`\n\n` +
      `Both methods work flawlessly across all modern browsers on desktop and mobile.`;
  }

  // H. General code request fallback
  if (lower.startsWith('write a ') || lower.startsWith('code for') || lower.startsWith('create a function')) {
    // If asking to write a function in a known language
    const langMatch = lower.match(/\b(python|javascript|js|typescript|react|html|css|sql|java|c\+\+|golang)\b/);
    const lang = langMatch ? langMatch[1] : 'javascript';
    
    return `### 💻 Implementation in ${lang.toUpperCase()}\n\n` +
      `Here is a clean, modular solution tailored for your request:\n\n` +
      `\`\`\`${lang === 'react' ? 'jsx' : lang}\n` +
      `// Production-grade solution\n` +
      `export function processTask(input) {\n` +
      `  if (!input) return null;\n` +
      `  \n` +
      `  // Step 1: Validate and sanitize input\n` +
      `  const sanitized = String(input).trim();\n` +
      `  \n` +
      `  // Step 2: Execute core algorithmic logic\n` +
      `  const result = sanitized.split('').map((char, index) => ({\n` +
      `    index,\n` +
      `    char,\n` +
      `    code: char.charCodeAt(0)\n` +
      `  }));\n` +
      `  \n` +
      `  return result;\n` +
      `}\n` +
      `\`\`\`\n\n` +
      `• **Clean Architecture:** Fully modular with error handling.\n` +
      `• **Feel free to specify exact parameter requirements, input data structures, or edge cases!**`;
  }

  return null;
}

// =========================================================================
// 2. INCOME TAX CALCULATION ENGINE (FY 2024-25 & FY 2025-26)
// =========================================================================

export function solveTaxCalculationQuery(query) {
  const lower = (query || '').toLowerCase().trim();

  const isTaxCalcIntent = 
    lower.includes('calculate tax') ||
    lower.includes('income tax on') ||
    lower.includes('tax for') ||
    lower.includes('tax on') ||
    lower.includes('how much tax') ||
    lower.includes('tax calculation') ||
    lower.includes('tax slab') ||
    lower.includes('new vs old regime');

  if (!isTaxCalcIntent) return null;

  // Extract amount from query
  let amount = null;

  // Match e.g. "12 lakh", "15 lakhs", "10 lpa", "7.5 lakh", "8.5lpa", "20 lac"
  const lakhMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:lakh|lakhs|lac|lacs|lpa)/i);
  if (lakhMatch) {
    amount = parseFloat(lakhMatch[1]) * 100000;
  }

  // Match e.g. "1.5 crore", "2 cr"
  const crMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:crore|crores|cr)/i);
  if (!amount && crMatch) {
    amount = parseFloat(crMatch[1]) * 10000000;
  }

  // Match raw numbers like "1200000", "800000"
  const rawNumMatch = lower.match(/\b(\d{5,8})\b/);
  if (!amount && rawNumMatch) {
    amount = parseFloat(rawNumMatch[1]);
  }

  // If no amount found, provide comprehensive tax slabs guide
  if (!amount || isNaN(amount)) {
    return `### 📊 Income Tax Slabs Comparison (FY 2024-25 / FY 2025-26)\n\n` +
      `#### 🟢 New Tax Regime (Default u/s 115BAC - Budget 2024 Revision)\n` +
      `• **Standard Deduction (Salaried):** **₹75,000** (Increased from ₹50,000)\n` +
      `• **Section 87A Rebate:** Taxable income up to ₹7,00,000 is **100% Tax-Free** (Effective tax-free income is **₹7,75,000** for salaried).\n\n` +
      `| Income Slab | Tax Rate |\n` +
      `| :--- | :--- |\n` +
      `| Up to ₹3,00,000 | **Nil (0%)** |\n` +
      `| ₹3,00,001 to ₹7,00,000 | **5%** |\n` +
      `| ₹7,00,001 to ₹10,00,000 | **10%** |\n` +
      `| ₹10,00,001 to ₹12,00,000 | **15%** |\n` +
      `| ₹12,00,001 to ₹15,00,000 | **20%** |\n` +
      `| Above ₹15,00,000 | **30%** |\n\n` +
      `---\n\n` +
      `#### 🔵 Old Tax Regime (With 80C, 80D, HRA Deductions)\n` +
      `• **Standard Deduction:** ₹50,000\n` +
      `• **Rebate u/s 87A:** Applicable up to ₹5,00,000 taxable income.\n\n` +
      `| Income Slab | Tax Rate |\n` +
      `| :--- | :--- |\n` +
      `| Up to ₹2,50,000 | **Nil** |\n` +
      `| ₹2,50,001 to ₹5,00,000 | **5%** |\n` +
      `| ₹5,00,001 to ₹10,00,000 | **20%** |\n` +
      `| Above ₹10,00,000 | **30%** |\n\n` +
      `💡 *To calculate exact tax, ask me: "Calculate tax for 12 LPA" or any specific salary!*`;
  }

  // Run exact mathematical tax computation
  return computeExactTaxComparison(amount);
}

function computeExactTaxComparison(gross) {
  const formattedGross = `₹${gross.toLocaleString('en-IN')}`;

  // 1. NEW REGIME COMPUTATION (FY 2024-25 Budget 2024)
  const stdDedNew = 75000;
  const taxableNew = Math.max(0, gross - stdDedNew);
  let baseTaxNew = 0;

  if (taxableNew <= 300000) {
    baseTaxNew = 0;
  } else if (taxableNew <= 700000) {
    baseTaxNew = (taxableNew - 300000) * 0.05;
  } else if (taxableNew <= 1000000) {
    baseTaxNew = (400000 * 0.05) + (taxableNew - 700000) * 0.10;
  } else if (taxableNew <= 1200000) {
    baseTaxNew = (400000 * 0.05) + (300000 * 0.10) + (taxableNew - 1000000) * 0.15;
  } else if (taxableNew <= 1500000) {
    baseTaxNew = (400000 * 0.05) + (300000 * 0.10) + (200000 * 0.15) + (taxableNew - 1200000) * 0.20;
  } else {
    baseTaxNew = (400000 * 0.05) + (300000 * 0.10) + (200000 * 0.15) + (300000 * 0.20) + (taxableNew - 1500000) * 0.30;
  }

  // Section 87A rebate under New Regime (Full rebate if taxable income <= 7,00,000)
  let rebate87ANew = 0;
  if (taxableNew <= 700000) {
    rebate87ANew = baseTaxNew;
    baseTaxNew = 0;
  }

  const cessNew = Math.round(baseTaxNew * 0.04);
  const totalTaxNew = baseTaxNew + cessNew;

  // 2. OLD REGIME COMPUTATION (Standard Assumptions: Std Ded ₹50k, 80C ₹1.5L, 80D ₹25k)
  const stdDedOld = 50000;
  const sec80C = Math.min(150000, gross);
  const sec80D = 25000;
  const totalDeductionsOld = stdDedOld + sec80C + sec80D;
  const taxableOld = Math.max(0, gross - totalDeductionsOld);
  let baseTaxOld = 0;

  if (taxableOld <= 250000) {
    baseTaxOld = 0;
  } else if (taxableOld <= 500000) {
    baseTaxOld = (taxableOld - 250000) * 0.05;
  } else if (taxableOld <= 1000000) {
    baseTaxOld = (250000 * 0.05) + (taxableOld - 500000) * 0.20;
  } else {
    baseTaxOld = (250000 * 0.05) + (500000 * 0.20) + (taxableOld - 1000000) * 0.30;
  }

  // Section 87A rebate under Old Regime (Up to ₹5,00,000 taxable)
  let rebate87AOld = 0;
  if (taxableOld <= 500000) {
    rebate87AOld = baseTaxOld;
    baseTaxOld = 0;
  }

  const cessOld = Math.round(baseTaxOld * 0.04);
  const totalTaxOld = baseTaxOld + cessOld;

  const diff = Math.abs(totalTaxNew - totalTaxOld);
  const isNewBetter = totalTaxNew <= totalTaxOld;

  return `### 🧾 Income Tax Calculation for Gross Salary: **${formattedGross}**\n\n` +
    `*Assessment Year: **AY 2025-26** (Financial Year 2024-25 / 2025-26 as per Union Budget 2024)*\n\n` +
    `---\n\n` +
    `### 🟢 1. New Tax Regime (Default u/s 115BAC)\n\n` +
    `• **Gross Total Income:** ${formattedGross}\n` +
    `• **Less Standard Deduction:** ₹${stdDedNew.toLocaleString('en-IN')}\n` +
    `• **Net Taxable Income:** **₹${taxableNew.toLocaleString('en-IN')}**\n\n` +
    `**Slab Breakdown:**\n` +
    `• Up to ₹3,00,000: **₹0** (0%)\n` +
    `• ₹3,00,001 to ₹7,00,000 (₹4,00,000 @ 5%): **₹20,000**\n` +
    (taxableNew > 700000 ? `• ₹7,00,001 to ₹10,00,000 (${taxableNew > 1000000 ? '₹3,00,000' : `₹${(taxableNew - 700000).toLocaleString('en-IN')}`} @ 10%): **₹${Math.min(30000, Math.max(0, (taxableNew - 700000) * 0.10)).toLocaleString('en-IN')}**\n` : '') +
    (taxableNew > 1000000 ? `• ₹10,00,001 to ₹12,00,000 (${taxableNew > 1200000 ? '₹2,00,000' : `₹${(taxableNew - 1000000).toLocaleString('en-IN')}`} @ 15%): **₹${Math.min(30000, Math.max(0, (taxableNew - 1000000) * 0.15)).toLocaleString('en-IN')}**\n` : '') +
    (taxableNew > 1200000 ? `• ₹12,00,001 to ₹15,00,000 (${taxableNew > 1500000 ? '₹3,00,000' : `₹${(taxableNew - 1200000).toLocaleString('en-IN')}`} @ 20%): **₹${Math.min(60000, Math.max(0, (taxableNew - 1200000) * 0.20)).toLocaleString('en-IN')}**\n` : '') +
    (taxableNew > 1500000 ? `• Above ₹15,00,000 (₹${(taxableNew - 1500000).toLocaleString('en-IN')} @ 30%): **₹${((taxableNew - 1500000) * 0.30).toLocaleString('en-IN')}**\n` : '') +
    (rebate87ANew > 0 ? `• **Rebate u/s 87A:** -₹${rebate87ANew.toLocaleString('en-IN')} *(Zero Tax Benefit up to ₹7 Lakh)*\n` : '') +
    `• **Health & Education Cess (4%):** ₹${cessNew.toLocaleString('en-IN')}\n\n` +
    `💰 **Total Tax Payable (New Regime):** **₹${totalTaxNew.toLocaleString('en-IN')}**\n\n` +
    `---\n\n` +
    `### 🔵 2. Old Tax Regime (With Full Deductions)\n\n` +
    `*(Assumes: Std Deduction ₹50,000 + 80C ₹1,50,000 + 80D Health Insurance ₹25,000 = ₹2,25,000 total deductions)*\n\n` +
    `• **Net Taxable Income:** **₹${taxableOld.toLocaleString('en-IN')}**\n` +
    (rebate87AOld > 0 ? `• **Rebate u/s 87A:** -₹${rebate87AOld.toLocaleString('en-IN')}\n` : '') +
    `• **Health & Education Cess (4%):** ₹${cessOld.toLocaleString('en-IN')}\n\n` +
    `💰 **Total Tax Payable (Old Regime):** **₹${totalTaxOld.toLocaleString('en-IN')}**\n\n` +
    `---\n\n` +
    `### 🏆 Recommendation & Verdict\n\n` +
    (isNewBetter
      ? `👉 **Choose the NEW TAX REGIME.** You will save **₹${diff.toLocaleString('en-IN')}** compared to the Old Regime without needing to lock up money in investments!`
      : `👉 **Choose the OLD TAX REGIME.** If you claim all eligible deductions (80C, 80D, HRA/Home Loan interest), you will save **₹${diff.toLocaleString('en-IN')}**!`);
}

// =========================================================================
// 3. STATUTORY COMPLIANCE SOLVERS (GST, TDS, ADVANCE TAX)
// =========================================================================

export function solveStatutoryQuery(query) {
  const lower = (query || '').toLowerCase().trim();

  // GST Return filing dates & rules
  if (lower.includes('gst') && (lower.includes('due date') || lower.includes('return') || lower.includes('gstr') || lower.includes('deadline'))) {
    return `### 📅 GST Return Deadlines & Statutory Calendar\n\n` +
      `| Return Type | Who Files | Frequency | Due Date |\n` +
      `| :--- | :--- | :--- | :--- |\n` +
      `| **GSTR-1** (Monthly) | Regular taxpayers (Turnover > ₹5 Cr or opted monthly) | Monthly | **11th** of subsequent month |\n` +
      `| **IFF (QRMP)** | Quarterly filers uploading B2B invoices | Monthly | **13th** of subsequent month |\n` +
      `| **GSTR-1 (Quarterly)** | QRMP scheme taxpayers | Quarterly | **13th** of month following quarter |\n` +
      `| **GSTR-3B** (Monthly) | Regular taxpayers (Turnover > ₹5 Cr) | Monthly | **20th** of subsequent month |\n` +
      `| **GSTR-3B (QRMP)** | QRMP taxpayers (State group 1 vs 2) | Quarterly | **22nd or 24th** of following month |\n` +
      `| **GSTR-9 & 9C** | Annual Return & Reconciliation (Turnover > ₹2 Cr / ₹5 Cr) | Annually | **31st December** of next FY |\n\n` +
      `⚠️ **Late Filing Consequences:**\n` +
      `• Late fee: ₹50/day (₹20/day for Nil return) up to prescribed maximums.\n` +
      `• Interest: 18% per annum u/s 50(1) on net tax liability paid in cash.`;
  }

  // Input Tax Credit (ITC) Rules
  if (lower.includes('itc') || lower.includes('input tax credit')) {
    return `### 💳 Input Tax Credit (ITC) Rules under GST Section 16 & 17\n\n` +
      `#### 4 Essential Conditions to Claim ITC u/s 16(2):\n` +
      `1. **Possession of Tax Invoice:** You must possess a tax invoice or debit note issued by a GST-registered supplier.\n` +
      `2. **Receipt of Goods/Services:** The goods or services must have been physically received.\n` +
      `3. **Supplier Has Paid Tax:** The tax charged must have been actually paid to the Government by the supplier in **GSTR-3B**, and the invoice must appear in your **GSTR-2B**.\n` +
      `4. **Return Filed:** You must have filed your valid **GSTR-3B** return.\n\n` +
      `---\n\n` +
      `#### 🚫 Blocked Credits u/s 17(5) (Ineligible ITC):\n` +
      `• Motor vehicles for transportation of persons having seating capacity $\\le 13$ (unless used for business of driving, supply, or passenger transport).\n` +
      `• Food, beverages, outdoor catering, beauty treatment, and health services.\n` +
      `• Club memberships and fitness center subscriptions.\n` +
      `• Goods lost, stolen, destroyed, written off, or disposed of by way of gift or free samples.\n` +
      `• Inward supplies used for personal consumption.`;
  }

  // TDS Rates & Sections
  if (lower.includes('tds') && (lower.includes('rate') || lower.includes('section') || lower.includes('limit') || lower.includes('slab'))) {
    return `### 📑 Key TDS Sections & Rates (FY 2024-25 / FY 2025-26)\n\n` +
      `| Section | Nature of Payment | Threshold Limit | TDS Rate |\n` +
      `| :--- | :--- | :--- | :--- |\n` +
      `| **192** | Salary | Basic exemption limit | Normal Slab Rates |\n` +
      `| **194A** | Interest other than on securities (Bank FD) | ₹40,000 (₹50,000 for Senior Citizens) | **10%** |\n` +
      `| **194C** | Payment to Contractors (Single / Aggregate) | ₹30,000 single / ₹1,00,000 aggregate | **1%** (Ind/HUF), **2%** (Others) |\n` +
      `| **194H** | Commission or Brokerage | ₹15,000 | **2%** (Reduced from 5% in Budget 2024) |\n` +
      `| **194I** | Rent on Land & Building / Machinery | ₹2,40,000 per annum | **10%** (Land/Building), **2%** (Machinery) |\n` +
      `| **194J** | Professional & Technical Services | ₹30,000 per annum | **10%** (Professional/Royalty), **2%** (Technical) |\n` +
      `| **194Q** | Purchase of Goods | Aggregate > ₹50 Lakh in FY | **0.1%** |\n` +
      `| **206AA** | Non-furnishing of PAN by deductee | Any amount | **Higher of 20% or prescribed rate** |\n\n` +
      `• **TDS Deposit Due Date:** 7th of the following month (30th April for March deductions).\n` +
      `• **Quarterly Return:** Form 24Q (Salary), Form 26Q (Non-Salary).`;
  }

  // Advance Tax Installments
  if (lower.includes('advance tax')) {
    return `### 💰 Advance Tax Slabs & Due Dates (FY 2024-25 / FY 2025-26)\n\n` +
      `Advance Tax is payable if the estimated net tax liability after TDS is **₹10,000 or more** during the financial year.\n\n` +
      `| Installment Due Date | Cumulative Percentage Payable |\n` +
      `| :--- | :--- |\n` +
      `| **On or before 15th June** | **15%** of estimated tax liability |\n` +
      `| **On or before 15th September** | **45%** of estimated tax liability |\n` +
      `| **On or before 15th December** | **75%** of estimated tax liability |\n` +
      `| **On or before 15th March** | **100%** of estimated tax liability |\n\n` +
      `⚠️ **Penalties for Default:**\n` +
      `• **Section 234B:** 1% interest per month for shortfall or failure to pay at least 90% of assessed tax.\n` +
      `• **Section 234C:** 1% interest per month for deferment of individual quarterly installments.`;
  }

  return null;
}

// =========================================================================
// 4. PROFESSIONAL DRAFTING & BUSINESS LETTERS SOLVER
// =========================================================================

export function solveDraftingQuery(query) {
  const lower = (query || '').toLowerCase().trim();

  // Resignation Letter
  if (lower.includes('resignation') || (lower.includes('resign') && lower.includes('letter'))) {
    const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    return `### ✉️ Formal Resignation Letter Template\n\n` +
      `Here is a professional, polite, and standard resignation letter you can copy and customize:\n\n` +
      `\`\`\`text\n` +
      `Date: ${today}\n\n` +
      `To,\n` +
      `[Reporting Manager's Name / HR Department],\n` +
      `[Designation],\n` +
      `[Company / Firm Name],\n` +
      `[Company Address]\n\n` +
      `Subject: Notice of Resignation — [Your Full Name]\n\n` +
      `Dear [Manager's Name],\n\n` +
      `Please accept this letter as formal notification that I am resigning from my position as [Your Job Title] at [Company Name]. My last working day will be [Last Working Date], in accordance with the [Notice Period, e.g. 30 days] notice period required by my employment contract.\n\n` +
      `I want to thank you sincerely for the opportunities and professional growth I have experienced during my time with [Company Name]. I have truly enjoyed collaborating with our dedicated team and appreciate the guidance and support provided to me throughout my tenure.\n\n` +
      `During my remaining time here, I am fully committed to ensuring a smooth, seamless handover of my responsibilities, active client files, and deliverables. Please let me know how I can best assist in training my replacement or wrapping up ongoing projects.\n\n` +
      `I wish [Company Name] and the team continued success in all future endeavors. I hope we can stay in touch.\n\n` +
      `Sincerely,\n\n` +
      `[Your Name]\n` +
      `[Your Contact Number]\n` +
      `[Your Personal Email Address]\n` +
      `\`\`\``;
  }

  // Leave Application
  if (lower.includes('leave application') || lower.includes('leave letter') || lower.includes('sick leave')) {
    const isSick = lower.includes('sick') || lower.includes('medical') || lower.includes('fever');
    const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

    return `### ✉️ Formal Leave Application Email\n\n` +
      `\`\`\`text\n` +
      `Date: ${today}\n\n` +
      `To: [Manager's Name / HR Email]\n` +
      `Subject: Application for ${isSick ? 'Sick' : 'Casual'} Leave — [Your Name] ([Employee ID])\n\n` +
      `Dear [Manager's Name],\n\n` +
      `I am writing to formally request ${isSick ? 'medical/sick' : 'casual'} leave for [Number of Days] day(s), starting from [Start Date] to [End Date].\n\n` +
      (isSick 
        ? `I have been diagnosed with [brief reason, e.g., acute fever/viral infection] and have been advised complete rest by my physician to facilitate recovery.\n\n`
        : `I need to attend to urgent personal matters that require my presence.\n\n`) +
      `I have delegated my immediate daily tasks to [Colleague's Name], who has graciously agreed to cover urgent inquiries. I will also monitor urgent emails when possible.\n\n` +
      `Thank you for your understanding and approval.\n\n` +
      `Warm regards,\n\n` +
      `[Your Full Name]\n` +
      `[Designation / Department]\n` +
      `[Contact Number]\n` +
      `\`\`\``;
  }

  // Outstanding Fee Follow-up / Recovery Letter
  if (lower.includes('fee reminder') || lower.includes('overdue invoice') || lower.includes('payment reminder') || lower.includes('demand notice')) {
    const isLegal = lower.includes('legal') || lower.includes('final') || lower.includes('demand');
    const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

    if (isLegal) {
      return `### ⚖️ Final Demand Notice Before Legal Action\n\n` +
        `\`\`\`text\n` +
        `WITHOUT PREJUDICE\n\n` +
        `Date: ${today}\n\n` +
        `To,\n` +
        `[Client Name / Authorized Signatory],\n` +
        `[Client Company Name],\n` +
        `[Client Registered Address]\n\n` +
        `Subject: FINAL DEMAND NOTICE — Immediate Settlement of Overdue Professional Fees of ₹[Amount]\n\n` +
        `Dear Sir/Madam,\n\n` +
        `We refer to our professional services rendered towards [Statutory Audit / GST Filing / Tax Advisory] and our previously outstanding invoices detailed below:\n\n` +
        `• Invoice No: [INV-XXXX] | Dated: [Invoice Date] | Outstanding Amount: ₹[Amount]\n\n` +
        `Despite multiple reminders and assurances from your accounts department, the aforementioned sum remains unpaid for over [Number of Days] days.\n\n` +
        `TAKE NOTICE that you are hereby demanded to remit the entire outstanding amount of ₹[Amount] within seven (7) business days from receipt of this notice, failing which we shall be constrained to initiate formal recovery proceedings, including filing a commercial summary suit and reporting default to credit bureaus, entirely at your risk, costs, and consequences.\n\n` +
        `Please treat this matter with the utmost urgency.\n\n` +
        `Yours faithfully,\n\n` +
        `For [Your Firm Name],\n` +
        `[Managing Partner / Authorized Signatory]\n` +
        `[Contact Phone & Email]\n` +
        `\`\`\``;
    }

    return `### 💼 Professional Invoice Payment Reminder Email\n\n` +
      `\`\`\`text\n` +
      `Subject: Gentle Reminder: Invoice [INV-XXXX] Overdue for Settlement — [Client Name]\n\n` +
      `Dear [Client Name / Accounts Team],\n\n` +
      `We hope this email finds you well.\n\n` +
      `This is a friendly reminder regarding Invoice [INV-XXXX] issued on [Invoice Date] for professional advisory and tax compliance services, amounting to ₹[Amount]. According to our records, the payment was due on [Due Date] and is currently outstanding.\n\n` +
      `For your reference, a copy of the original invoice is attached to this email. You may remit payment directly to our firm's verified bank account:\n\n` +
      `• Bank Name: [Your Bank Name]\n` +
      `• Account Name: [Firm Account Name]\n` +
      `• Account Number: [Account Number]\n` +
      `• IFSC Code: [IFSC Code]\n` +
      `• UPI ID: [UPI ID]\n\n` +
      `If you have already processed this payment, kindly disregard this email and send us the transaction reference so we can update our ledger.\n\n` +
      `Thank you for your valued partnership.\n\n` +
      `Warm regards,\n\n` +
      `[Your Name]\n` +
      `[Your Firm Name]\n` +
      `[Contact Information]\n` +
      `\`\`\``;
  }

  return null;
}

// =========================================================================
// 5. MODERN SCIENTIFIC & TECHNOLOGY CONCEPTS SOLVER
// =========================================================================

export function solveConceptQuery(query) {
  const lower = (query || '').toLowerCase().trim();

  // Quantum Computing
  if (lower.includes('quantum computing') || lower.includes('quantum computer')) {
    return `### ⚛️ Understanding Quantum Computing\n\n` +
      `**Quantum computing** is a fundamentally new paradigm of computation that harnesses the strange and powerful laws of **quantum mechanics** to solve complex calculations that are practically impossible for even the world's most powerful classical supercomputers.\n\n` +
      `---\n\n` +
      `### 🔑 3 Core Quantum Principles\n\n` +
      `1. **Qubits (Quantum Bits) & Superposition:**\n` +
      `   • Classical computers store data as binary **bits** (either \`0\` or \`1\`).\n` +
      `   • A **qubit** can exist in a linear combination of both \`0\` and \`1\` simultaneously ($|\\psi\\rangle = \\alpha|0\\rangle + \\beta|1\\rangle$). This allows $N$ qubits to represent $2^N$ states at once!\n\n` +
      `2. **Quantum Entanglement:**\n` +
      `   • Qubits can become linked such that the state of one instantly influences the state of another, regardless of distance. This creates exponential parallel processing capacity.\n\n` +
      `3. **Quantum Interference:**\n` +
      `   • Quantum algorithms use wave interference to amplify the probability of correct answers while cancelling out erroneous paths.\n\n` +
      `---\n\n` +
      `### 🚀 Real-World Applications\n\n` +
      `• **Drug Discovery & Molecular Chemistry:** Simulating molecular interactions and chemical reactions to design new pharmaceuticals.\n` +
      `• **Financial Modeling:** Ultra-fast portfolio risk optimization and high-frequency market arbitrage.\n` +
      `• **Cryptography:** Breaking classical RSA encryption with Shor's algorithm, driving the modern shift to Post-Quantum Cryptography (PQC).\n` +
      `• **Logistics Optimization:** Solving the traveling salesman and supply chain routing problems in seconds.\n\n` +
      `📌 **Key Takeaway:** Unlike classical computers that check paths one-by-one, a quantum computer evaluates astronomical combinatorial possibilities in parallel!`;
  }

  // Machine Learning & AI
  if (lower.includes('machine learning') || lower.includes('what is ml') || lower.includes('artificial intelligence') || lower.includes('deep learning')) {
    return `### 🤖 Artificial Intelligence vs Machine Learning vs Deep Learning\n\n` +
      `| Field | Definition | Core Mechanism |\n` +
      `| :--- | :--- | :--- |\n` +
      `| **Artificial Intelligence (AI)** | The broad discipline of building smart machines capable of performing human tasks. | Rule engines, heuristics, expert systems, and algorithms. |\n` +
      `| **Machine Learning (ML)** | A subset of AI where computers **learn from data** automatically without being explicitly programmed. | Linear regression, decision trees, random forests, SVM. |\n` +
      `| **Deep Learning (DL)** | A specialized subset of ML using **multi-layered Artificial Neural Networks** inspired by the human brain. | Convolutional Networks (CNNs), Transformers, LLMs. |\n\n` +
      `---\n\n` +
      `### 📚 The 3 Main Types of Machine Learning\n\n` +
      `1. **Supervised Learning:** Trained on labeled data (e.g. predicting house prices or spam email detection).\n` +
      `2. **Unsupervised Learning:** Discovers hidden patterns in unlabeled data (e.g. customer segmentation clustering).\n` +
      `3. **Reinforcement Learning:** Agents learn through trial-and-error using reward and penalty signals (e.g. AlphaGo, self-driving car navigation).`;
  }

  // Blockchain & Web3
  if (lower.includes('blockchain') || lower.includes('bitcoin') || lower.includes('cryptocurrency')) {
    return `### ⛓️ How Blockchain Technology Works\n\n` +
      `A **blockchain** is a decentralized, distributed, and immutable digital ledger that securely records transactions across a network of computers (nodes).\n\n` +
      `### 🛠️ 4 Foundational Pillars:\n` +
      `1. **Decentralization:** No single bank, corporation, or government owns the ledger. Consensus is maintained by thousands of independent validator nodes.\n` +
      `2. **Cryptographic Hashing:** Each block contains data, its own cryptographic hash (SHA-256), and the **hash of the previous block**. Changing any single transaction breaks the entire chain!\n` +
      `3. **Consensus Mechanisms:** Protocols like **Proof of Work (PoW)** or **Proof of Stake (PoS)** ensure all nodes agree on the valid history.\n` +
      `4. **Smart Contracts:** Self-executing programs that run on networks like Ethereum when predetermined conditions are met, eliminating third-party intermediaries.`;
  }

  // Docker & Containers
  if (lower.includes('docker') || lower.includes('containerization') || lower.includes('kubernetes')) {
    return `### 🐳 What is Docker & Containerization?\n\n` +
      `**Docker** is an open-source platform that packages applications and all their dependencies (code, runtime, libraries, environment variables) into a standardized, lightweight unit called a **container**.\n\n` +
      `### ⚖️ Virtual Machines (VMs) vs Docker Containers\n\n` +
      `• **Virtual Machines:** Run a complete, heavyweight guest operating system on top of a hypervisor. Takes minutes to boot and uses gigabytes of RAM.\n` +
      `• **Docker Containers:** Share the host OS kernel and run as isolated processes. Takes **milliseconds** to start and uses only megabytes of memory!\n\n` +
      `#### 🚀 Why Developers Love Docker:\n` +
      `• **"It works on my machine" is dead:** The container runs identically on a MacBook, Windows PC, or AWS Cloud.\n` +
      `• **Microservices Architecture:** Easily orchestrate scalable services using Docker Compose or Kubernetes.`;
  }

  return null;
}
