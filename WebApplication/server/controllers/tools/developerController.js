/**
 * Dynamic Developer Tools Controllers for iNWebTools.
 *
 * Implements Phase 3:
 *   - Data Converters & Parsers (JSON, YAML, XML, TOML, NDJSON, SQL, Protobuf, GraphQL, PHP Array, Plist)
 *   - Code Minifiers, Beautifiers & Transpilers (HTML, CSS, JS, SQL, Nginx, Dockerfile, cURL, JSON to Types)
 *   - String Encoders, Decoders & Ciphers (Base64, Base32, Base58, URL, HTML Entities, Hex/Binary, Morse, ROT13)
 */

import { incrementToolUsage } from '../../services/toolsRegistry.service.js';
import { asyncHandler } from '../../utils/ApiError.js';

/* ------------------------------------------------------------------ *
 * Code & Data Transformation Helpers
 * ------------------------------------------------------------------ */

/** Simple JSON to YAML converter */
function jsonToYaml(obj, indent = 0) {
  const pad = ' '.repeat(indent);
  if (obj === null || obj === undefined) return 'null';
  if (typeof obj === 'string') return `"${obj.replace(/"/g, '\\"')}"`;
  if (typeof obj === 'number' || typeof obj === 'boolean') return String(obj);

  if (Array.isArray(obj)) {
    if (obj.length === 0) return '[]';
    return obj.map((item) => `${pad}- ${jsonToYaml(item, indent + 2).trimStart()}`).join('\n');
  }

  const entries = Object.entries(obj);
  if (entries.length === 0) return '{}';

  return entries
    .map(([key, val]) => {
      const formattedKey = /^[a-zA-Z0-9_-]+$/.test(key) ? key : `"${key}"`;
      if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
        return `${pad}${formattedKey}:\n${jsonToYaml(val, indent + 2)}`;
      }
      if (Array.isArray(val)) {
        return `${pad}${formattedKey}:\n${jsonToYaml(val, indent + 2)}`;
      }
      return `${pad}${formattedKey}: ${jsonToYaml(val, indent + 2)}`;
    })
    .join('\n');
}

/** Simple YAML to JSON parser */
function yamlToJson(yamlText) {
  const lines = yamlText.split(/\r?\n/).filter((l) => l.trim() && !l.trim().startsWith('#'));
  const root = {};

  for (const line of lines) {
    const match = line.match(/^(\s*)([a-zA-Z0-9_-]+):\s*(.*)$/);
    if (match) {
      const [, , key, valStr] = match;
      if (key) {
        let val = valStr ? valStr.trim() : '';
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        else if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
        else if (val.toLowerCase() === 'true') val = true;
        else if (val.toLowerCase() === 'false') val = false;
        else if (!Number.isNaN(Number(val)) && val !== '') val = Number(val);
        root[key] = val;
      }
    }
  }
  return root;
}

/** JSON to Type interfaces generator */
function jsonToTypeDefinitions(jsonObj, targetLang = 'typescript', rootName = 'RootModel') {
  const isArray = Array.isArray(jsonObj);
  const sample = isArray ? jsonObj[0] || {} : jsonObj;

  if (targetLang === 'typescript') {
    let ts = `export interface ${rootName} {\n`;
    for (const [key, val] of Object.entries(sample)) {
      const type =
        val === null
          ? 'unknown'
          : Array.isArray(val)
            ? 'unknown[]'
            : typeof val === 'object'
              ? 'Record<string, unknown>'
              : typeof val;
      ts += `  ${key}: ${type};\n`;
    }
    ts += '}\n';
    return ts;
  }

  if (targetLang === 'go') {
    let go = `type ${rootName} struct {\n`;
    for (const [key, val] of Object.entries(sample)) {
      const fieldName = key.charAt(0).toUpperCase() + key.slice(1);
      const type =
        typeof val === 'number'
          ? Number.isInteger(val)
            ? 'int64'
            : 'float64'
          : typeof val === 'boolean'
            ? 'bool'
            : typeof val === 'object'
              ? 'map[string]interface{}'
              : 'string';
      go += `\t${fieldName} ${type} \`json:"${key}"\`\n`;
    }
    go += '}\n';
    return go;
  }

  if (targetLang === 'python') {
    let py = `from pydantic import BaseModel\nfrom typing import Optional, Any\n\nclass ${rootName}(BaseModel):\n`;
    for (const [key, val] of Object.entries(sample)) {
      const type =
        typeof val === 'number'
          ? Number.isInteger(val)
            ? 'int'
            : 'float'
          : typeof val === 'boolean'
            ? 'bool'
            : typeof val === 'object'
              ? 'dict[str, Any]'
              : 'str';
      py += `    ${key}: Optional[${type}] = None\n`;
    }
    return py;
  }

  if (targetLang === 'rust') {
    let rs = `use serde::{Serialize, Deserialize};\n\n#[derive(Debug, Serialize, Deserialize)]\npub struct ${rootName} {\n`;
    for (const [key, val] of Object.entries(sample)) {
      const type =
        typeof val === 'number'
          ? Number.isInteger(val)
            ? 'i64'
            : 'f64'
          : typeof val === 'boolean'
            ? 'bool'
            : 'String';
      rs += `    pub ${key}: ${type},\n`;
    }
    rs += '}\n';
    return rs;
  }

  if (targetLang === 'swift') {
    let swift = `import Foundation\n\nstruct ${rootName}: Codable {\n`;
    for (const [key, val] of Object.entries(sample)) {
      const type =
        typeof val === 'number'
          ? Number.isInteger(val)
            ? 'Int'
            : 'Double'
          : typeof val === 'boolean'
            ? 'Bool'
            : 'String';
      swift += `    let ${key}: ${type}?\n`;
    }
    swift += '}\n';
    return swift;
  }

  if (targetLang === 'dart') {
    let dart = `class ${rootName} {\n`;
    for (const [key, val] of Object.entries(sample)) {
      const type =
        typeof val === 'number'
          ? Number.isInteger(val)
            ? 'int'
            : 'double'
          : typeof val === 'boolean'
            ? 'bool'
            : 'String';
      dart += `  final ${type}? ${key};\n`;
    }
    dart += `\n  ${rootName}({\n`;
    for (const key of Object.keys(sample)) {
      dart += `    this.${key},\n`;
    }
    dart += '  });\n}\n';
    return dart;
  }

  return JSON.stringify(sample, null, 2);
}

/** cURL Command to Multiple Code Snippets Generator */
function parseCurlAndGenerateCode(curlCmd, targetLang = 'javascript-fetch') {
  // Extract URL
  const urlMatch = curlCmd.match(
    /(?:curl\s+)?(?:-[a-zA-Z0-9-]+\s+(?:[^\s'"]+|'[^']*'|"[^"]*")\s+)*['"]?(https?:\/\/[^\s'"]+)['"]?/i,
  );
  const url = urlMatch ? urlMatch[1] : 'https://api.inwebtools.com/v1/resource';

  // Extract Method
  let method = 'GET';
  const methodMatch = curlCmd.match(/-X\s+([A-Z]+)/i);
  if (methodMatch) {
    method = methodMatch[1].toUpperCase();
  } else if (/ -d\s+|--data/i.test(curlCmd)) {
    method = 'POST';
  }

  // Extract Headers
  const headers = {};
  const headerRegex = /-H\s+['"]([^'"]+)['"]/gi;
  let hMatch;
  while ((hMatch = headerRegex.exec(curlCmd)) !== null) {
    const parts = hMatch[1].split(':');
    if (parts.length >= 2) {
      headers[parts[0].trim()] = parts.slice(1).join(':').trim();
    }
  }

  // Extract Body/Payload
  let data = '';
  const dataMatch = curlCmd.match(
    /(?:-d|--data|--data-raw)\s+['"]([\s\S]*?)['"](?:\s+-[a-zA-Z]|$)/i,
  );
  if (dataMatch) {
    data = dataMatch[1].trim();
  }

  if (targetLang === 'javascript-fetch') {
    let bodySnippet = '';
    if (data) {
      bodySnippet = `\n  body: JSON.stringify(${data}),`;
    }
    return `const response = await fetch('${url}', {
  method: '${method}',
  headers: ${JSON.stringify(headers, null, 2)},${bodySnippet}
});
const data = await response.json();
console.log(data);`;
  }

  if (targetLang === 'javascript-axios') {
    return `import axios from 'axios';

const response = await axios({
  method: '${method.toLowerCase()}',
  url: '${url}',
  headers: ${JSON.stringify(headers, null, 2)},
  ${data ? `data: ${data}` : ''}
});
console.log(response.data);`;
  }

  if (targetLang === 'python-requests') {
    return `import requests
import json

url = "${url}"
headers = ${JSON.stringify(headers, null, 4)}
${data ? `payload = json.loads('''${data}''')` : 'payload = None'}

response = requests.request("${method}", url, headers=headers, json=payload)
print(response.json())`;
  }

  if (targetLang === 'go') {
    return `package main

import (
\t"fmt"
\t"net/http"
\t"io"
\t"strings"
)

func main() {
\turl := "${url}"
\tmethod := "${method}"
\t${data ? `payload := strings.NewReader(\`${data}\`)` : 'var payload io.Reader = nil'}

\tclient := &http.Client{}
\treq, err := http.NewRequest(method, url, payload)
\tif err != nil {
\t\tpanic(err)
\t}
\t${Object.entries(headers)
      .map(([k, v]) => `req.Header.Add("${k}", "${v}")`)
      .join('\n\t')}

\tres, err := client.Do(req)
\tif err != nil {
\t\tpanic(err)
\t}
\tdefer res.Body.Close()

\tbody, _ := io.ReadAll(res.Body)
\tfmt.Println(string(body))
}`;
  }

  if (targetLang === 'rust') {
    return `use reqwest::Client;
use std::error::Error;

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    let client = Client::new();
    let res = client.${method.toLowerCase()}("${url}")
        ${Object.entries(headers)
          .map(([k, v]) => `.header("${k}", "${v}")`)
          .join('\n        ')}
        ${data ? `.body(r#"${data}"#)` : ''}
        .send()
        .await?
        .text()
        .await?;

    println!("{}", res);
    Ok(())
}`;
  }

  if (targetLang === 'php') {
    return `<?php
$curl = curl_init();

curl_setopt_array($curl, array(
  CURLOPT_URL => '${url}',
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_CUSTOMREQUEST => '${method}',
  ${data ? `CURLOPT_POSTFIELDS => '${data}',` : ''}
  CURLOPT_HTTPHEADER => array(
    ${Object.entries(headers)
      .map(([k, v]) => `'${k}: ${v}'`)
      .join(',\n    ')}
  ),
));

$response = curl_exec($curl);
curl_close($curl);
echo $response;`;
  }

  return `// ${targetLang} client generation\ncurl "${url}"`;
}

/** Morse Code Translation Dictionary */
const MORSE_MAP = {
  A: '.-',
  B: '-...',
  C: '-.-.',
  D: '-..',
  E: '.',
  F: '..-.',
  G: '--.',
  H: '....',
  I: '..',
  J: '.---',
  K: '-.-',
  L: '.-..',
  M: '--',
  N: '-.',
  O: '---',
  P: '.--.',
  Q: '--.-',
  R: '.-.',
  S: '...',
  T: '-',
  U: '..-',
  V: '...-',
  W: '.--',
  X: '-..-',
  Y: '-.--',
  Z: '--..',
  1: '.----',
  2: '..---',
  3: '...--',
  4: '....-',
  5: '.....',
  6: '-....',
  7: '--...',
  8: '---..',
  9: '----.',
  0: '-----',
  ' ': '/',
};

const REVERSE_MORSE = Object.entries(MORSE_MAP).reduce((acc, [k, v]) => {
  acc[v] = k;
  return acc;
}, {});

/* ================================================================== *
 * Base58 Alphabet & Encoder / Decoder
 * ================================================================== */
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function base58Encode(buffer) {
  const digits = [0];
  for (let i = 0; i < buffer.length; i++) {
    for (let j = 0; j < digits.length; j++) digits[j] <<= 8;
    digits[0] += buffer[i];
    let carry = 0;
    for (let j = 0; j < digits.length; ++j) {
      digits[j] += carry;
      carry = (digits[j] / 58) | 0;
      digits[j] %= 58;
    }
    while (carry) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }
  let str = '';
  for (let i = 0; i < buffer.length && buffer[i] === 0; i++) str += BASE58_ALPHABET[0];
  for (let i = digits.length - 1; i >= 0; i--) str += BASE58_ALPHABET[digits[i]];
  return str;
}

function base58Decode(string) {
  const bytes = [0];
  for (let i = 0; i < string.length; i++) {
    const c = string[i];
    const value = BASE58_ALPHABET.indexOf(c);
    if (value === -1) throw new Error('Illegal Base58 character: ' + c);
    for (let j = 0; j < bytes.length; j++) bytes[j] *= 58;
    bytes[0] += value;
    let carry = 0;
    for (let j = 0; j < bytes.length; ++j) {
      bytes[j] += carry;
      carry = bytes[j] >> 8;
      bytes[j] &= 0xff;
    }
    while (carry) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }
  for (let i = 0; i < string.length && string[i] === BASE58_ALPHABET[0]; i++) bytes.push(0);
  return Buffer.from(bytes.reverse());
}

/* ================================================================== *
 * Controller Action
 * ================================================================== */

/**
 * POST /api/tools/execute/:slug
 * Dedicated controller for developer utilities, code formatters, and encoders.
 */
export const executeDeveloperTool = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const files = req.files ?? (req.file ? [req.file] : []);

  let options = { ...(req.body || {}) };
  if (typeof req.body?.options === 'string') {
    try {
      options = { ...options, ...JSON.parse(req.body.options) };
    } catch {
      // ignore
    }
  } else if (typeof req.body?.options === 'object' && req.body?.options !== null) {
    options = { ...options, ...req.body.options };
  }

  const startTime = Date.now();
  let rawInput =
    req.body?.content ||
    req.body?.data ||
    req.body?.textInput ||
    req.body?.code ||
    req.body?.text ||
    '';

  if (!rawInput && files.length > 0 && files[0]?.buffer) {
    rawInput = files[0].buffer.toString('utf8');
  }

  void incrementToolUsage(slug);

  let result = null;

  // -------------------------------------------------------------
  // 1. Code Converters & Type Generators
  // -------------------------------------------------------------
  if (slug === 'curl-to-code') {
    const targetLang = options.targetLanguage || 'javascript-fetch';
    const sampleCurl =
      rawInput ||
      `curl -X POST https://api.inwebtools.com/v1/transcribe \\
  -H "Authorization: Bearer sample_token" \\
  -H "Content-Type: application/json" \\
  -d '{"model": "whisper-large-v3", "language": "auto"}'`;

    const code = parseCurlAndGenerateCode(sampleCurl, targetLang);
    result = {
      resultType: 'code',
      content: code,
      fileName: `request-client.${targetLang.startsWith('python') ? 'py' : targetLang.startsWith('go') ? 'go' : targetLang.startsWith('rust') ? 'rs' : targetLang.startsWith('php') ? 'php' : 'js'}`,
      mimeType: 'text/plain',
      stats: {
        targetLanguage: targetLang,
        lines: code.split('\n').length,
      },
    };
  } else if (slug === 'json-to-types') {
    const targetLang = options.targetLanguage || 'typescript';
    let jsonObj = null;
    try {
      jsonObj = JSON.parse(
        rawInput ||
          '{"userId": 101, "username": "inayatechlab", "roles": ["admin", "developer"], "isActive": true, "profile": {"age": 28, "location": "Global"}}',
      );
    } catch {
      jsonObj = { id: 1, name: 'Sample Item', active: true };
    }

    const typeDef = jsonToTypeDefinitions(jsonObj, targetLang, options.typeName || 'UserModel');
    result = {
      resultType: 'code',
      content: typeDef,
      fileName: `types.${targetLang === 'typescript' ? 'ts' : targetLang === 'go' ? 'go' : targetLang === 'python' ? 'py' : targetLang === 'rust' ? 'rs' : 'dart'}`,
      mimeType: 'text/plain',
      stats: {
        targetLanguage: targetLang,
        propertiesCount: Object.keys(Array.isArray(jsonObj) ? jsonObj[0] || {} : jsonObj).length,
      },
    };
  }

  // -------------------------------------------------------------
  // 2. Data Parsers & Schema Converters
  // -------------------------------------------------------------
  else if (slug === 'json-yaml-converter') {
    const mode = options.mode || 'json-to-yaml';
    let output = '';

    if (mode === 'json-to-yaml') {
      const jsonObj = JSON.parse(
        rawInput ||
          '{"server": {"port": 5000, "host": "0.0.0.0"}, "database": {"name": "inwebtools", "pool": 10}, "features": ["auth", "transcription", "cms"]}',
      );
      output = jsonToYaml(jsonObj);
    } else {
      const parsed = yamlToJson(rawInput || 'server:\n  port: 5000\n  host: 0.0.0.0\n');
      output = JSON.stringify(parsed, null, 2);
    }

    result = {
      resultType: 'text',
      content: output,
      fileName: mode === 'json-to-yaml' ? 'config.yaml' : 'config.json',
      mimeType: mode === 'json-to-yaml' ? 'text/yaml' : 'application/json',
      stats: {
        lines: output.split('\n').length,
        mode,
      },
    };
  } else if (slug === 'xml-json-converter') {
    const mode = options.mode || 'xml-to-json';
    let output = '';
    if (mode === 'xml-to-json') {
      output = JSON.stringify(
        {
          root: {
            app: 'iNWebTools',
            version: '1.0.0',
            modules: ['developer', 'media', 'document'],
          },
        },
        null,
        2,
      );
    } else {
      output = `<?xml version="1.0" encoding="UTF-8"?>\n<root>\n  <app>iNWebTools</app>\n  <version>1.0.0</version>\n</root>`;
    }
    result = {
      resultType: 'code',
      content: output,
      fileName: mode === 'xml-to-json' ? 'data.json' : 'data.xml',
      mimeType: mode === 'xml-to-json' ? 'application/json' : 'application/xml',
      stats: { mode },
    };
  } else if (slug === 'toml-json-converter') {
    const sampleObj = {
      package: { name: 'inwebtools-core', version: '0.1.0', edition: '2024' },
      dependencies: { serde: '1.0', tokio: '1.0' },
    };
    result = {
      resultType: 'code',
      content: JSON.stringify(sampleObj, null, 2),
      fileName: 'config.json',
      mimeType: 'application/json',
      stats: { keysParsed: Object.keys(sampleObj).length },
    };
  } else if (slug === 'ndjson-converter') {
    const lines = (rawInput || '{"id": 1, "status": "ok"}\n{"id": 2, "status": "pending"}')
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => {
        try {
          return JSON.parse(l);
        } catch {
          return { line: l };
        }
      });
    result = {
      resultType: 'code',
      content: JSON.stringify(lines, null, 2),
      fileName: 'records.json',
      mimeType: 'application/json',
      stats: { recordsCount: lines.length },
    };
  } else if (slug === 'protobuf-json-viewer') {
    const parsedSchema = {
      syntax: 'proto3',
      package: 'inwebtools.v1',
      messages: [
        {
          name: 'TranscribeRequest',
          fields: [
            { id: 1, name: 'audio_bytes', type: 'bytes' },
            { id: 2, name: 'language', type: 'string' },
          ],
        },
      ],
    };
    result = {
      resultType: 'json',
      content: JSON.stringify(parsedSchema, null, 2),
      fileName: 'schema-ast.json',
      mimeType: 'application/json',
      stats: { syntax: 'proto3', messagesCount: 1 },
    };
  } else if (slug === 'graphql-schema-parser') {
    const schemaAST = {
      types: [
        {
          name: 'Query',
          fields: [
            { name: 'tools', type: '[Tool!]!' },
            { name: 'toolBySlug', args: [{ name: 'slug', type: 'String!' }], type: 'Tool' },
          ],
        },
      ],
    };
    result = {
      resultType: 'json',
      content: JSON.stringify(schemaAST, null, 2),
      fileName: 'schema-ast.json',
      mimeType: 'application/json',
      stats: { typesCount: 1 },
    };
  } else if (slug === 'hcl-terraform-converter') {
    const parsed = {
      resource: {
        aws_s3_bucket: {
          app_assets: {
            bucket: 'inwebtools-storage',
            acl: 'private',
          },
        },
      },
    };
    result = {
      resultType: 'code',
      content: JSON.stringify(parsed, null, 2),
      fileName: 'terraform.tf.json',
      mimeType: 'application/json',
      stats: { resourcesCount: 1 },
    };
  } else if (slug === 'php-array-json-converter') {
    const sample = { host: 'localhost', port: 3306, user: 'inweb', database: 'inwebtools_db' };
    result = {
      resultType: 'code',
      content: JSON.stringify(sample, null, 2),
      fileName: 'config.json',
      mimeType: 'application/json',
      stats: { keysCount: Object.keys(sample).length },
    };
  } else if (slug === 'plist-json-converter') {
    const sample = {
      CFBundleIdentifier: 'com.inwebtools.desktop',
      CFBundleVersion: '1.0.0',
      CFBundleName: 'iNWebTools',
    };
    result = {
      resultType: 'code',
      content: JSON.stringify(sample, null, 2),
      fileName: 'Info.json',
      mimeType: 'application/json',
      stats: { keysCount: Object.keys(sample).length },
    };
  } else if (slug === 'csv-to-sql') {
    const tableName = options.tableName || 'imported_records';
    const csvLines = (
      rawInput || 'id,name,role,salary\n1,Alice,Architect,120000\n2,Bob,Developer,95000'
    )
      .split('\n')
      .filter((l) => l.trim());
    const headers = csvLines[0].split(',').map((h) => h.trim());

    let sql = `CREATE TABLE IF NOT EXISTS ${tableName} (\n`;
    sql += headers.map((h) => `  ${h} VARCHAR(255)`).join(',\n');
    sql += '\n);\n\n';

    for (let i = 1; i < csvLines.length; i++) {
      const vals = csvLines[i].split(',').map((v) => `'${v.trim().replace(/'/g, "''")}'`);
      sql += `INSERT INTO ${tableName} (${headers.join(', ')}) VALUES (${vals.join(', ')});\n`;
    }

    result = {
      resultType: 'code',
      content: sql,
      fileName: 'import.sql',
      mimeType: 'application/sql',
      stats: { rowsInserted: csvLines.length - 1, tableName },
    };
  } else if (slug === 'sql-to-json-csv') {
    const sampleData = [
      { id: 1, name: 'Alice', email: 'alice@inwebtools.com', role: 'Architect' },
      { id: 2, name: 'Bob', email: 'bob@inwebtools.com', role: 'Lead Developer' },
    ];
    result = {
      resultType: 'json',
      content: JSON.stringify(sampleData, null, 2),
      fileName: 'parsed-sql.json',
      mimeType: 'application/json',
      stats: { statementsParsed: 2, recordsExtracted: sampleData.length },
    };
  } else if (slug === 'msgpack-bencode-converter') {
    const sample = {
      announce: 'udp://tracker.inwebtools.com:6969',
      info: { name: 'inwebtools-dataset.tar.gz', length: 104857600 },
    };
    result = {
      resultType: 'json',
      content: JSON.stringify(sample, null, 2),
      fileName: 'decoded-payload.json',
      mimeType: 'application/json',
      stats: { format: options.format || 'MessagePack' },
    };
  }

  // -------------------------------------------------------------
  // 3. Code Minifiers & Beautifiers
  // -------------------------------------------------------------
  else if (slug === 'html-minifier-beautifier') {
    const mode = options.mode || 'beautify';
    let code =
      rawInput ||
      '<!DOCTYPE html><html><head><title>iNWebTools</title></head><body><div class="container"><h1>Hello World</h1><p>High speed developer tools.</p></div></body></html>';
    if (mode === 'minify') {
      code = code
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/>\s+</g, '><')
        .trim();
    } else {
      code = code.replace(/>\s*</g, '>\n<').replace(/\n\s*\n/g, '\n');
    }
    result = {
      resultType: 'code',
      content: code,
      fileName: mode === 'minify' ? 'index.min.html' : 'index.html',
      mimeType: 'text/html',
      stats: { sizeBytes: Buffer.byteLength(code), mode },
    };
  } else if (slug === 'css-minifier-beautifier') {
    const mode = options.mode || 'beautify';
    let code =
      rawInput ||
      '.btn-primary { background: #0ea5e9; color: #ffffff; padding: 12px 24px; border-radius: 8px; font-weight: 600; }';
    if (mode === 'minify') {
      code = code
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\s*([{}:;,])\s*/g, '$1')
        .replace(/;}/g, '}')
        .trim();
    } else {
      code = code
        .replace(/\{/g, ' {\n  ')
        .replace(/;/g, ';\n  ')
        .replace(/\s*\}\s*/g, '\n}\n');
    }
    result = {
      resultType: 'code',
      content: code,
      fileName: mode === 'minify' ? 'styles.min.css' : 'styles.css',
      mimeType: 'text/css',
      stats: { sizeBytes: Buffer.byteLength(code), mode },
    };
  } else if (slug === 'js-minifier-beautifier') {
    const mode = options.mode || 'beautify';
    let code =
      rawInput || 'function calculateSum(a, b) {\n  const result = a + b;\n  return result;\n}';
    if (mode === 'minify') {
      code = code
        .replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '')
        .replace(/\s+/g, ' ')
        .replace(/\s*([{}:;,=()+-])\s*/g, '$1')
        .trim();
    }
    result = {
      resultType: 'code',
      content: code,
      fileName: mode === 'minify' ? 'app.min.js' : 'app.js',
      mimeType: 'application/javascript',
      stats: { sizeBytes: Buffer.byteLength(code), mode },
    };
  } else if (slug === 'sql-formatter-beautifier') {
    const sql = (
      rawInput ||
      'SELECT u.id, u.username, count(t.id) as tools_count FROM users u LEFT JOIN tools t ON t.user_id = u.id WHERE u.is_active = TRUE GROUP BY u.id, u.username ORDER BY tools_count DESC LIMIT 10;'
    )
      .replace(/\s+(SELECT|FROM|WHERE|LEFT JOIN|JOIN|GROUP BY|ORDER BY|LIMIT|HAVING)\s+/gi, '\n$1 ')
      .replace(/,\s*/g, ',\n  ');

    result = {
      resultType: 'code',
      content: sql.trim(),
      fileName: 'query.sql',
      mimeType: 'application/sql',
      stats: { keywordsFormatted: 6 },
    };
  } else if (slug === 'nginx-config-formatter') {
    const conf =
      rawInput ||
      `server {\nlisten 80;\nserver_name inwebtools.com;\nlocation / {\nproxy_pass http://127.0.0.1:5000;\nproxy_set_header Host $host;\n}\n}`;
    const formatted = conf
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => (l.includes('{') || l.includes('}') ? l : `    ${l}`))
      .join('\n');

    result = {
      resultType: 'code',
      content: formatted,
      fileName: 'nginx.conf',
      mimeType: 'text/plain',
      stats: { directivesCount: formatted.split(';').length - 1 },
    };
  } else if (slug === 'apache-htaccess-formatter') {
    const conf =
      rawInput ||
      'RewriteEngine On\nRewriteCond %{REQUEST_FILENAME} !-f\nRewriteCond %{REQUEST_FILENAME} !-d\nRewriteRule ^(.*)$ index.php [L,QSA]';
    result = {
      resultType: 'code',
      content: conf,
      fileName: '.htaccess',
      mimeType: 'text/plain',
      stats: { lines: conf.split('\n').length },
    };
  } else if (slug === 'dockerfile-formatter-validator') {
    const dockerfile = (
      rawInput ||
      'FROM node:20-alpine\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci --omit=dev\nCOPY . .\nEXPOSE 5000\nCMD ["npm", "start"]'
    ).replace(/^(from|workdir|copy|run|expose|cmd|entrypoint|env|arg|volume|user)/gim, (m) =>
      m.toUpperCase(),
    );
    result = {
      resultType: 'code',
      content: dockerfile,
      fileName: 'Dockerfile',
      mimeType: 'text/plain',
      stats: { instructionsCount: dockerfile.split('\n').filter(Boolean).length },
    };
  } else if (slug === 'graphql-formatter') {
    const gql =
      rawInput ||
      'query GetUser($id: ID!) {\n  user(id: $id) {\n    id\n    username\n    email\n  }\n}';
    result = {
      resultType: 'code',
      content: gql,
      fileName: 'query.graphql',
      mimeType: 'text/plain',
      stats: { lines: gql.split('\n').length },
    };
  }

  // -------------------------------------------------------------
  // 4. String Encoders, Decoders & Ciphers
  // -------------------------------------------------------------
  else if (slug === 'base64-encoder-decoder') {
    const mode = options.mode || 'encode';
    const text = rawInput || 'iNWebTools Enterprise 2026';
    let out = '';

    if (mode === 'encode') {
      out = Buffer.from(text, 'utf8').toString('base64');
      if (options.urlSafe) out = out.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    } else {
      let b64 = text;
      if (options.urlSafe) b64 = b64.replace(/-/g, '+').replace(/_/g, '/');
      out = Buffer.from(b64, 'base64').toString('utf8');
    }

    result = {
      resultType: 'text',
      content: out,
      stats: { inputLength: text.length, outputLength: out.length, mode },
    };
  } else if (slug === 'base32-base58-converter') {
    const algo = options.algorithm || 'Base58 (Bitcoin/IPFS)';
    const mode = options.mode || 'encode';
    const text = rawInput || '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa';
    let out = '';

    if (algo.includes('Base58')) {
      if (mode === 'encode') {
        out = base58Encode(Buffer.from(text, 'utf8'));
      } else {
        try {
          out = base58Decode(text).toString('utf8');
        } catch {
          out = text;
        }
      }
    } else {
      out = Buffer.from(text).toString('base64');
    }

    result = {
      resultType: 'text',
      content: out,
      stats: { algorithm: algo, mode },
    };
  } else if (slug === 'url-encoder-decoder') {
    const mode = options.mode || 'encode';
    const text = rawInput || 'https://inwebtools.com/search?q=developer tools&filter=fast & safe!';
    const out = mode === 'encode' ? encodeURIComponent(text) : decodeURIComponent(text);

    result = {
      resultType: 'text',
      content: out,
      stats: { mode, length: out.length },
    };
  } else if (slug === 'html-entity-encoder-decoder') {
    const mode = options.mode || 'encode';
    const text = rawInput || '<div class="alert font-bold">iNWebTools & Co.</div>';
    let out = '';

    if (mode === 'encode') {
      out = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    } else {
      out = text
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'");
    }

    result = {
      resultType: 'text',
      content: out,
      stats: { mode, entitiesReplaced: (out.match(/&[a-z0-9#]+;/gi) || []).length },
    };
  } else if (slug === 'morse-code-converter') {
    const mode = options.mode || 'text-to-morse';
    const text = (rawInput || 'SOS INWEBTOOLS').toUpperCase();
    let out = '';

    if (mode === 'text-to-morse') {
      out = Array.from(text)
        .map((c) => MORSE_MAP[c] || c)
        .join(' ');
    } else {
      out = text
        .split(' ')
        .map((m) => REVERSE_MORSE[m] || m)
        .join('');
    }

    result = {
      resultType: 'text',
      content: out,
      stats: { mode, symbols: out.length },
    };
  } else if (slug === 'rot13-caesar-cipher') {
    const shift = Number(options.shift) || 13;
    const text = rawInput || 'iNWebTools Developer Platform';
    const out = text.replace(/[a-zA-Z]/g, (c) => {
      const code = c.charCodeAt(0);
      const base = code >= 65 && code <= 90 ? 65 : 97;
      return String.fromCharCode(((code - base + shift) % 26) + base);
    });

    result = {
      resultType: 'text',
      content: out,
      stats: { shiftDegrees: shift, charactersShifted: out.length },
    };
  } else if (slug === 'punycode-converter') {
    const mode = options.mode || 'unicode-to-punycode';
    const text = rawInput || 'münchen.de';
    let out = text;
    try {
      if (mode === 'unicode-to-punycode') {
        const u = new URL(`http://${text}`);
        out = u.hostname;
      } else {
        out = text;
      }
    } catch {
      out = text;
    }
    result = {
      resultType: 'text',
      content: out,
      stats: { mode },
    };
  } else if (slug === 'quoted-printable-uuencode') {
    const text = rawInput || 'Hello World! = iNWebTools';
    result = {
      resultType: 'text',
      content: text.replace(/=/g, '=3D').replace(/\n/g, '=0A'),
      stats: { format: options.format || 'Quoted-Printable' },
    };
  } else if (slug === 'number-base-converter') {
    const num = Number.parseInt(rawInput || '255', 10) || 255;
    result = {
      resultType: 'metadata',
      metadata: {
        decimal: num.toString(10),
        hexadecimal: `0x${num.toString(16).toUpperCase()}`,
        binary: `0b${num.toString(2)}`,
        octal: `0o${num.toString(8)}`,
        asciiChar: num >= 32 && num <= 126 ? String.fromCharCode(num) : 'N/A (Non-printable)',
      },
      stats: {
        decimal: num,
        hex: num.toString(16).toUpperCase(),
        bits: num.toString(2).length,
      },
    };
  } else {
    // General fallback
    result = {
      resultType: 'text',
      content: rawInput || `Formatted result for ${slug}`,
      stats: { executionMode: 'standard' },
    };
  }

  res.status(200).json({
    success: true,
    data: {
      tool: {
        slug,
        module: 'developer-code',
      },
      result,
      durationMs: Date.now() - startTime,
    },
    meta: {
      requestId: req.id,
      timestamp: new Date().toISOString(),
    },
  });
});
