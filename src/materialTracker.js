/**
 * Pure material stock management functions for Haekel Tracker.
 * Requirements: 3.1, 3.2, 3.4, 3.6, 6.4
 *
 * All functions are pure — they take and return plain objects with no side effects.
 *
 * Material shape:
 * {
 *   id: string,
 *   stock: number | null,
 *   minStock: number | null,
 *   orderLinks: Array<{ orderId: string, quantityUsed: number, usedAt: string }>,
 *   usageStatistics: { totalUsed: number, averagePerOrder: number, lastUsed: string | null }
 * }
 */

/**
 * Links a material to an order by decrementing stock and recording the usage.
 * Requirements: 3.1, 3.2
 *
 * @param {object} material - The material object
 * @param {number} quantityUsed - Amount of material used
 * @param {string} orderId - ID of the order using the material
 * @returns {object} Updated material with decremented stock and new orderLink entry
 */
export function linkMaterialToOrder(material, quantityUsed, orderId) {
  const existingLinks = material.orderLinks || [];
  const newLink = {
    orderId,
    quantityUsed,
    usedAt: new Date().toISOString(),
  };

  const newStock = material.stock != null ? material.stock - quantityUsed : null;
  const newTotalUsed = (material.usageStatistics?.totalUsed || 0) + quantityUsed;
  const newOrderLinks = [...existingLinks, newLink];
  const orderCount = newOrderLinks.length;

  return {
    ...material,
    stock: newStock,
    orderLinks: newOrderLinks,
    usageStatistics: {
      ...material.usageStatistics,
      totalUsed: newTotalUsed,
      averagePerOrder: newTotalUsed / orderCount,
      lastUsed: newLink.usedAt,
    },
  };
}

/**
 * Unlinks a material from an order by restoring stock and removing the orderLink entry.
 * Requirements: 3.6
 *
 * @param {object} material - The material object
 * @param {string} orderId - ID of the order to unlink
 * @returns {object} Updated material with restored stock and removed orderLink entry
 */
export function unlinkMaterialFromOrder(material, orderId) {
  const existingLinks = material.orderLinks || [];
  const linkToRemove = existingLinks.find((l) => l.orderId === orderId);

  if (!linkToRemove) {
    return material;
  }

  const newOrderLinks = existingLinks.filter((l) => l.orderId !== orderId);
  const restoredStock =
    material.stock != null ? material.stock + linkToRemove.quantityUsed : null;

  const newTotalUsed = Math.max(
    0,
    (material.usageStatistics?.totalUsed || 0) - linkToRemove.quantityUsed
  );
  const orderCount = newOrderLinks.length;
  const lastUsed =
    orderCount > 0
      ? newOrderLinks.reduce((latest, l) =>
          l.usedAt > latest.usedAt ? l : latest
        ).usedAt
      : null;

  return {
    ...material,
    stock: restoredStock,
    orderLinks: newOrderLinks,
    usageStatistics: {
      ...material.usageStatistics,
      totalUsed: newTotalUsed,
      averagePerOrder: orderCount > 0 ? newTotalUsed / orderCount : 0,
      lastUsed,
    },
  };
}

/**
 * Checks whether a material's stock is below its minimum threshold.
 * Requirements: 3.4
 *
 * @param {object} material - The material object
 * @returns {{ low: boolean, deficit: number }} Stock status and deficit amount
 */
export function checkStockLevel(material) {
  const stock = material.stock ?? null;
  const minStock = material.minStock ?? null;

  if (stock == null || minStock == null) {
    return { low: false, deficit: 0 };
  }

  const deficit = Math.max(0, minStock - stock);
  return {
    low: stock < minStock,
    deficit,
  };
}

/**
 * Computes usage analytics for a material across a list of orders.
 * Requirements: 6.1, 6.3
 *
 * @param {string} materialId - ID of the material to analyse
 * @param {Array<object>} orders - All orders (each with a materials array)
 * @returns {{
 *   totalUsed: number,
 *   ordersUsedIn: string[],
 *   averagePerOrder: number,
 *   lastUsed: string | null
 * }}
 */
export function getMaterialUsageAnalytics(materialId, orders) {
  const relevantOrders = (orders || []).filter((order) =>
    (order.materials || []).some((m) => m.materialId === materialId)
  );

  let totalUsed = 0;
  let lastUsed = null;

  for (const order of relevantOrders) {
    for (const m of order.materials || []) {
      if (m.materialId === materialId) {
        totalUsed += m.quantityUsed || 0;
        const usedAt = m.usedAt || order.createdAt || null;
        if (usedAt && (!lastUsed || usedAt > lastUsed)) {
          lastUsed = usedAt;
        }
      }
    }
  }

  const ordersUsedIn = relevantOrders.map((o) => o.id);
  const averagePerOrder =
    ordersUsedIn.length > 0 ? totalUsed / ordersUsedIn.length : 0;

  return {
    totalUsed,
    ordersUsedIn,
    averagePerOrder,
    lastUsed,
  };
}

/**
 * Suggests a reorder quantity for a material based on a 30-day moving average usage.
 * Requirements: 6.4
 *
 * The suggestion covers 30 days of projected usage minus current stock (minimum 0).
 *
 * @param {object} material - The material object
 * @param {Array<object>} orders - All orders (each with a materials array and createdAt)
 * @returns {{ suggestedQuantity: number, dailyUsageRate: number, reasoning: string }}
 */
export function getReorderSuggestion(material, orders) {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const recentOrders = (orders || []).filter((order) => {
    if (!order.createdAt) return false;
    return new Date(order.createdAt) >= thirtyDaysAgo;
  });

  let usedInLast30Days = 0;
  for (const order of recentOrders) {
    for (const m of order.materials || []) {
      if (m.materialId === material.id) {
        usedInLast30Days += m.quantityUsed || 0;
      }
    }
  }

  const dailyUsageRate = usedInLast30Days / 30;
  const projectedUsage = dailyUsageRate * 30;
  const currentStock = material.stock ?? 0;
  const suggestedQuantity = Math.max(0, Math.ceil(projectedUsage - currentStock));

  const reasoning =
    usedInLast30Days === 0
      ? 'No usage in the last 30 days; no reorder needed based on recent activity.'
      : `Used ${usedInLast30Days} units over the last 30 days (${dailyUsageRate.toFixed(2)}/day). ` +
        `Current stock: ${currentStock}. Suggested reorder: ${suggestedQuantity} units.`;

  return {
    suggestedQuantity,
    dailyUsageRate,
    reasoning,
  };
}
