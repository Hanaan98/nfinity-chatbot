/**
 * Performance Monitoring Utility
 * Lightweight version for customer chatbot
 */

class PerformanceMonitor {
  constructor() {
    this.enabled = import.meta.env.MODE !== "production";
  }

  start(label) {
    if (!this.enabled || typeof performance === "undefined") return;
    performance.mark(`${label}-start`);
  }

  end(label) {
    if (!this.enabled || typeof performance === "undefined") return;

    try {
      performance.mark(`${label}-end`);
      performance.measure(label, `${label}-start`, `${label}-end`);

      const measure = performance.getEntriesByName(label)[0];
      if (measure && measure.duration > 100) {
        console.log(`⏱️ ${label}: ${measure.duration.toFixed(2)}ms`);
      }
    } catch {
      // Silently fail
    }
  }

  async measureAsync(label, fn) {
    this.start(label);
    try {
      return await fn();
    } finally {
      this.end(label);
    }
  }
}

const performanceMonitor = new PerformanceMonitor();

export default performanceMonitor;
