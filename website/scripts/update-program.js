#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Paths
const ANCHOR_TOML_PATH = path.join(__dirname, '../../program/Anchor.toml');
const IDL_SOURCE_PATH = path.join(__dirname, '../../program/target/idl/puzi.json');
const IDL_DEST_PATH = path.join(__dirname, '../anchor-idl/idl.json');
const IDL_TS_PATH = path.join(__dirname, '../anchor-idl/idl.ts');
const ENV_CONFIG_PATH = path.join(__dirname, '../config/env.ts');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function extractProgramId() {
  try {
    const tomlContent = fs.readFileSync(ANCHOR_TOML_PATH, 'utf8');
    const match = tomlContent.match(/\[programs\.devnet\]\s*puzi\s*=\s*"([^"]+)"/);
    if (match && match[1]) {
      return match[1];
    }
    throw new Error('Program ID not found in Anchor.toml');
  } catch (error) {
    log(`Error reading Anchor.toml: ${error.message}`, 'red');
    process.exit(1);
  }
}

function updateIDL() {
  try {
    // Check if IDL exists
    if (!fs.existsSync(IDL_SOURCE_PATH)) {
      log('IDL not found. Please run "anchor build" first.', 'red');
      process.exit(1);
    }

    // Copy IDL
    const idlContent = fs.readFileSync(IDL_SOURCE_PATH, 'utf8');
    fs.writeFileSync(IDL_DEST_PATH, idlContent);
    log('✓ IDL copied to anchor-idl/idl.json', 'green');

    // Generate TypeScript IDL
    const idl = JSON.parse(idlContent);
    const tsContent = `export type Puzi = ${JSON.stringify(idl, null, 2)};

export const IDL: Puzi = ${JSON.stringify(idl, null, 2)};
`;
    fs.writeFileSync(IDL_TS_PATH, tsContent);
    log('✓ TypeScript IDL generated at anchor-idl/idl.ts', 'green');

    return idl;
  } catch (error) {
    log(`Error updating IDL: ${error.message}`, 'red');
    process.exit(1);
  }
}

function updateProgramId(programId) {
  try {
    let envContent = fs.readFileSync(ENV_CONFIG_PATH, 'utf8');
    
    // Update devnet program ID
    envContent = envContent.replace(
      /programId:\s*'[^']*'/,
      `programId: '${programId}'`
    );
    
    fs.writeFileSync(ENV_CONFIG_PATH, envContent);
    log(`✓ Program ID updated in config/env.ts: ${programId}`, 'green');
  } catch (error) {
    log(`Error updating program ID: ${error.message}`, 'red');
    process.exit(1);
  }
}

function main() {
  log('\n🚀 Updating Puzi.io Program Configuration\n', 'cyan');
  
  // Extract program ID from Anchor.toml
  log('Reading program ID from Anchor.toml...', 'yellow');
  const programId = extractProgramId();
  log(`Found program ID: ${programId}`, 'cyan');
  
  // Update IDL files
  log('\nUpdating IDL files...', 'yellow');
  const idl = updateIDL();
  
  // Update program ID in config
  log('\nUpdating program ID in config...', 'yellow');
  updateProgramId(programId);
  
  log('\n✅ Update complete!', 'green');
  log('\nProgram Details:', 'cyan');
  log(`  Name: ${idl.name}`, 'reset');
  log(`  Version: ${idl.version}`, 'reset');
  log(`  Program ID: ${programId}`, 'reset');
  log(`  Instructions: ${idl.instructions.map(i => i.name).join(', ')}`, 'reset');
  
  log('\nYou can now run:', 'yellow');
  log('  npm run dev:devnet  # For devnet', 'reset');
  log('  npm run dev:mainnet # For mainnet', 'reset');
}

main();