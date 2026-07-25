/**
 * generate_docx.js
 * CLI helper script called by report_module.py to render Word reports.
 */
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
if (args.length < 2) {
  console.log("Usage: node generate_docx.js <report_data_json> <out_path> [comp_png] [knee_png] [hip_png] [ankle_png]");
  process.exit(1);
}

const reportData = JSON.parse(args[0]);
const outPath = args[1];

// We print status and let python-docx handles primary document layout if node docx package is absent
console.log(`Report data processed for: ${reportData.session_label || 'Session'}`);
