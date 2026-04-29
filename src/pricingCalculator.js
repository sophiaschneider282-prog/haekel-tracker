/**
 * Pure pricing calculation functions for Haekel Tracker.
 * Requirements: 1.3, 1.4, 1.5
 */

/**
 * Calculates labor cost based on tracked time and hourly wage.
 * Returns 0 when wage is 0, null, or undefined.
 * @param {number} seconds - Total tracked time in seconds
 * @param {number|null} hourlyWage - Hourly wage in €/h
 * @returns {number} Labor cost in €
 */
export function calculateLaborCost(seconds, hourlyWage) {
  if (!hourlyWage || hourlyWage <= 0) return 0;
  return (seconds / 3600) * hourlyWage;
}

/**
 * Calculates the final total price including all cost components and markup.
 * Formula: (materialTotal + patternCost + laborCost) × (1 + markup/100)
 * @param {Array<{cost: number}>} materials - Array of material objects with cost property
 * @param {number|null} patternCost - Pattern cost in €
 * @param {number} laborCost - Labor cost in €
 * @param {number} markup - Markup percentage (e.g. 20 for 20%)
 * @returns {number} Final total price in €
 */
export function calculateTotalPrice(materials, patternCost, laborCost, markup) {
  const materialTotal = (materials || []).reduce((sum, m) => sum + (m.cost || 0), 0);
  const subtotal = materialTotal + (patternCost || 0) + (laborCost || 0);
  return subtotal * (1 + (markup || 0) / 100);
}

/**
 * Generates an itemized price breakdown for display.
 * @param {Array<{cost: number}>} materials - Array of material objects with cost property
 * @param {number|null} patternCost - Pattern cost in €
 * @param {number} laborCost - Labor cost in €
 * @param {number} markup - Markup percentage (e.g. 20 for 20%)
 * @returns {{
 *   materialTotal: number,
 *   patternCost: number,
 *   laborCost: number,
 *   subtotal: number,
 *   markupAmount: number,
 *   markupPercent: number,
 *   total: number
 * }}
 */
export function generatePriceBreakdown(materials, patternCost, laborCost, markup) {
  const materialTotal = (materials || []).reduce((sum, m) => sum + (m.cost || 0), 0);
  const resolvedPatternCost = patternCost || 0;
  const resolvedLaborCost = laborCost || 0;
  const resolvedMarkup = markup || 0;

  const subtotal = materialTotal + resolvedPatternCost + resolvedLaborCost;
  const markupAmount = subtotal * (resolvedMarkup / 100);
  const total = subtotal + markupAmount;

  return {
    materialTotal,
    patternCost: resolvedPatternCost,
    laborCost: resolvedLaborCost,
    subtotal,
    markupAmount,
    markupPercent: resolvedMarkup,
    total,
  };
}
