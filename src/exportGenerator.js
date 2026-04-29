/**
 * Export generation functions for Haekel Tracker.
 * Supports text and PDF export with German labels.
 * Requirements: 4.5
 */

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { calculateLaborCost, generatePriceBreakdown } from './pricingCalculator';

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatCurrency(value) {
  return `${(value || 0).toFixed(2)} €`;
}

/**
 * Generates a formatted German text export for an order.
 * @param {object} order - The order object
 * @param {object} settings - App settings including exportPreferences and hourlyWage
 * @returns {string} Formatted invoice-style text
 */
export function generateTextExport(order, settings) {
  const includePriceDetails = settings?.exportPreferences?.includePriceDetails !== false;
  const hourlyWage = settings?.hourlyWage || 0;
  const markup = settings?.markup || 0;

  const laborCost = calculateLaborCost(order.timeSeconds || 0, hourlyWage);
  const breakdown = generatePriceBreakdown(
    order.materials || [],
    order.patternCost,
    laborCost,
    markup
  );

  const lines = [];

  lines.push('========================================');
  lines.push('           AUFTRAGSÜBERSICHT');
  lines.push('========================================');
  lines.push('');
  lines.push(`Auftrag:     ${order.name || '–'}`);
  lines.push(`Kunde:       ${order.customer || '–'}`);
  if (order.description) {
    lines.push(`Beschreibung: ${order.description}`);
  }
  lines.push(`Datum:       ${new Date().toLocaleDateString('de-DE')}`);
  lines.push('');

  // Materials
  if (order.materials && order.materials.length > 0) {
    lines.push('----------------------------------------');
    lines.push('MATERIALIEN');
    lines.push('----------------------------------------');
    for (const mat of order.materials) {
      lines.push(`  ${mat.name || 'Unbekannt'}  ${formatCurrency(mat.cost)}`);
    }
    lines.push('');
  }

  // Time
  lines.push('----------------------------------------');
  lines.push('ZEITERFASSUNG');
  lines.push('----------------------------------------');
  lines.push(`  Gesamtzeit: ${formatDuration(order.timeSeconds || 0)}`);
  lines.push('');

  // Price
  lines.push('----------------------------------------');
  lines.push('PREIS');
  lines.push('----------------------------------------');

  if (includePriceDetails) {
    lines.push(`  Materialkosten:  ${formatCurrency(breakdown.materialTotal)}`);
    if (breakdown.patternCost > 0) {
      lines.push(`  Schnittmuster:   ${formatCurrency(breakdown.patternCost)}`);
    }
    if (breakdown.laborCost > 0) {
      lines.push(`  Arbeitskosten:   ${formatCurrency(breakdown.laborCost)}`);
    }
    lines.push(`  Zwischensumme:   ${formatCurrency(breakdown.subtotal)}`);
    if (breakdown.markupPercent > 0) {
      lines.push(`  Aufschlag (${breakdown.markupPercent}%): ${formatCurrency(breakdown.markupAmount)}`);
    }
  }

  lines.push(`  Gesamtpreis:     ${formatCurrency(breakdown.total)}`);
  lines.push('');
  lines.push('========================================');

  return lines.join('\n');
}

/**
 * Generates a PDF export for an order using expo-print.
 * @param {object} order - The order object
 * @param {object} settings - App settings including exportPreferences and hourlyWage
 * @returns {Promise<string>} File URI of the generated PDF
 */
export async function generatePDFExport(order, settings) {
  const includePriceDetails = settings?.exportPreferences?.includePriceDetails !== false;
  const customerFacing = settings?.exportPreferences?.customerFacing === true;
  const hourlyWage = settings?.hourlyWage || 0;
  const markup = settings?.markup || 0;

  const laborCost = calculateLaborCost(order.timeSeconds || 0, hourlyWage);
  const breakdown = generatePriceBreakdown(
    order.materials || [],
    order.patternCost,
    laborCost,
    markup
  );

  const today = new Date().toLocaleDateString('de-DE');

  const materialsRows = (order.materials || [])
    .map(
      (mat) => `
      <tr>
        <td>${mat.name || 'Unbekannt'}</td>
        <td>${mat.grams ? mat.grams + ' g' : mat.meters ? mat.meters + ' m' : '–'}</td>
        <td class="amount">${formatCurrency(mat.cost)}</td>
      </tr>`
    )
    .join('');

  const priceDetailsHtml =
    includePriceDetails
      ? `
      <tr><td>Materialkosten</td><td class="amount">${formatCurrency(breakdown.materialTotal)}</td></tr>
      ${breakdown.patternCost > 0 ? `<tr><td>Schnittmuster</td><td class="amount">${formatCurrency(breakdown.patternCost)}</td></tr>` : ''}
      ${!customerFacing && breakdown.laborCost > 0 ? `<tr><td>Arbeitskosten</td><td class="amount">${formatCurrency(breakdown.laborCost)}</td></tr>` : ''}
      <tr><td>Zwischensumme</td><td class="amount">${formatCurrency(breakdown.subtotal)}</td></tr>
      ${breakdown.markupPercent > 0 ? `<tr><td>Aufschlag (${breakdown.markupPercent}%)</td><td class="amount">${formatCurrency(breakdown.markupAmount)}</td></tr>` : ''}
      <tr class="total"><td><strong>Gesamtpreis</strong></td><td class="amount"><strong>${formatCurrency(breakdown.total)}</strong></td></tr>`
      : `<tr class="total"><td><strong>Gesamtpreis</strong></td><td class="amount"><strong>${formatCurrency(breakdown.total)}</strong></td></tr>`;

  const html = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <style>
    body { font-family: Arial, sans-serif; font-size: 14px; color: #222; margin: 40px; }
    h1 { font-size: 22px; margin-bottom: 4px; }
    .subtitle { color: #666; font-size: 13px; margin-bottom: 24px; }
    .section { margin-bottom: 24px; }
    .section h2 { font-size: 15px; border-bottom: 1px solid #ccc; padding-bottom: 4px; margin-bottom: 10px; }
    table { width: 100%; border-collapse: collapse; }
    td, th { padding: 6px 8px; text-align: left; }
    th { background: #f0f0f0; font-weight: bold; }
    tr:nth-child(even) { background: #fafafa; }
    .amount { text-align: right; }
    .total td { border-top: 2px solid #333; padding-top: 8px; }
  </style>
</head>
<body>
  <h1>${order.name || 'Auftrag'}</h1>
  <div class="subtitle">Erstellt am ${today}</div>

  <div class="section">
    <h2>Kundeninformationen</h2>
    <p><strong>Kunde:</strong> ${order.customer || '–'}</p>
    ${order.description ? `<p><strong>Beschreibung:</strong> ${order.description}</p>` : ''}
  </div>

  ${materialsRows ? `
  <div class="section">
    <h2>Materialien</h2>
    <table>
      <thead><tr><th>Material</th><th>Menge</th><th class="amount">Kosten</th></tr></thead>
      <tbody>${materialsRows}</tbody>
    </table>
  </div>` : ''}

  <div class="section">
    <h2>Zeiterfassung</h2>
    <p>Gesamtzeit: <strong>${formatDuration(order.timeSeconds || 0)}</strong></p>
  </div>

  <div class="section">
    <h2>Preisübersicht</h2>
    <table>
      <tbody>${priceDetailsHtml}</tbody>
    </table>
  </div>
</body>
</html>`;

  const result = await Print.printToFileAsync({ html });
  return result.uri;
}

/**
 * Shares a file using the device's native sharing dialog.
 * @param {string} uri - File URI to share
 * @param {string} mimeType - MIME type of the file
 * @returns {Promise<void>}
 */
export async function shareFile(uri, mimeType) {
  const available = await Sharing.isAvailableAsync();
  if (!available) {
    throw new Error('Teilen ist auf diesem Gerät nicht verfügbar.');
  }
  await Sharing.shareAsync(uri, { mimeType, dialogTitle: 'Auftrag teilen' });
}
