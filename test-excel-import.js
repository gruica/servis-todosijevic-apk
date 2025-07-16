#!/usr/bin/env node

/**
 * Test script za analizu Excel fajla koji je korisnik poslao
 * Analizira strukturu i pokušava uvoz kroz aplikaciju
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function analyzeExcelFile() {
  try {
    // Učitaj XLSX biblioteku
    const XLSX = await import('xlsx');
    
    // Putanja do fajla
    const filePath = path.join(__dirname, 'attached_assets', 'APLIKACIJA exsel_1752656349764.xlsx');
    
    console.log('🔍 ANALIZA EXCEL FAJLA');
    console.log('='.repeat(50));
    
    // Provjeri da li fajl postoji
    if (!fs.existsSync(filePath)) {
      console.error('❌ Fajl ne postoji na putanji:', filePath);
      return;
    }
    
    // Učitaj Excel fajl
    const buffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    
    console.log('📊 OSNOVNE INFORMACIJE:');
    console.log('Sheet nazivi:', workbook.SheetNames);
    console.log('Broj sheet-ova:', workbook.SheetNames.length);
    
    // Analiziraj prvi sheet
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    console.log('\n📋 ANALIZA PRVOG SHEET-a:', firstSheetName);
    console.log('='.repeat(50));
    
    // Konvertuj u JSON
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    console.log('Ukupno redova:', data.length);
    
    if (data.length > 0) {
      console.log('\n📝 STRUKTURA KOLONA:');
      const columns = Object.keys(data[0]);
      columns.forEach((col, index) => {
        console.log(`${index + 1}. ${col}`);
      });
      
      console.log('\n📄 PRIMER PRVOG REDA:');
      console.log(JSON.stringify(data[0], null, 2));
      
      if (data.length > 1) {
        console.log('\n📄 PRIMER DRUGOG REDA:');
        console.log(JSON.stringify(data[1], null, 2));
      }
      
      if (data.length > 2) {
        console.log('\n📄 PRIMER TREĆEG REDA:');
        console.log(JSON.stringify(data[2], null, 2));
      }
      
      console.log('\n📊 ANALIZA PODATAKA:');
      console.log('='.repeat(50));
      
      // Analiza kolona
      const columnAnalysis = {};
      columns.forEach(col => {
        columnAnalysis[col] = {
          nonEmpty: 0,
          empty: 0,
          sampleValues: []
        };
      });
      
      data.forEach((row, index) => {
        if (index < 5) { // Analiziraj samo prvih 5 redova za sample
          columns.forEach(col => {
            const value = row[col];
            if (value !== null && value !== undefined && value !== '') {
              columnAnalysis[col].nonEmpty++;
              if (columnAnalysis[col].sampleValues.length < 3) {
                columnAnalysis[col].sampleValues.push(value);
              }
            } else {
              columnAnalysis[col].empty++;
            }
          });
        }
      });
      
      console.log('Analiza kolona (prvih 5 redova):');
      Object.entries(columnAnalysis).forEach(([col, analysis]) => {
        console.log(`\n${col}:`);
        console.log(`  - Neprazno: ${analysis.nonEmpty}`);
        console.log(`  - Prazno: ${analysis.empty}`);
        console.log(`  - Primeri: ${analysis.sampleValues.join(', ')}`);
      });
      
      // Preporučena mapiranja
      console.log('\n💡 PREPORUČENA MAPIRANJA:');
      console.log('='.repeat(50));
      
      const mappings = {
        'Ime': 'fullName',
        'Ime i prezime': 'fullName', 
        'Telefon': 'phone',
        'Grad': 'city',
        'Aparat': 'applianceType',
        'Proizvođač': 'manufacturer',
        'Model': 'model',
        'Serijski broj': 'serialNumber',
        'Datum': 'registrationDate',
        'Opis kvara': 'serviceDescription',
        'Garancija': 'warranty'
      };
      
      columns.forEach(col => {
        const mapping = mappings[col] || 'nepoznato';
        console.log(`${col} → ${mapping}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Greška pri analizi fajla:', error);
  }
}

// Pokreni analizu
analyzeExcelFile().catch(console.error);