const { ingestRoleMarketData } = require('./roleMarketIngestionService');

let schedulerHandle = null;
let isRunning = false;

function asText(value, fallback = '') {
  const text = String(value || '').trim();
  return text || fallback;
}

function parseBooleanFlag(value, fallback = false) {
  if (typeof value === 'boolean') {
    return value;
  }

  const normalized = asText(value).toLowerCase();
  if (!normalized) {
    return fallback;
  }

  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }

  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }

  return fallback;
}

function resolveIntervalMs() {
  const rawHours = Number(process.env.ROLE_MARKET_INTERVAL_HOURS || 24);
  const hours = Number.isFinite(rawHours) && rawHours > 0 ? rawHours : 24;
  return Math.round(hours * 60 * 60 * 1000);
}

function isRoleMarketSchedulerEnabled() {
  return parseBooleanFlag(process.env.ENABLE_ROLE_MARKET_SCHEDULER, false);
}

async function runScheduledRoleMarketIngestion() {
  if (isRunning) {
    console.info('[RoleMarketScheduler] skipping run because a previous ingestion is still active');
    return;
  }

  isRunning = true;

  try {
    const result = await ingestRoleMarketData({
      includeSalaries: true,
      includeDemand: true,
    });

    console.info('[RoleMarketScheduler] ingestion completed', {
      success: result.success,
      partialSuccess: result.partialSuccess,
      salaryRowsInserted: result.salaryRowsInserted,
      salaryRowsUpdated: result.salaryRowsUpdated,
      demandRowsInserted: result.demandRowsInserted,
      demandRowsUpdated: result.demandRowsUpdated,
      skippedRowsCount: result.skippedRowsCount,
      failedRowsCount: result.failedRowsCount,
    });
  } catch (error) {
    console.error('[RoleMarketScheduler] ingestion failed', {
      message: error.message,
      details: error.details || null,
    });
  } finally {
    isRunning = false;
  }
}

function startRoleMarketScheduler() {
  if (!isRoleMarketSchedulerEnabled()) {
    return {
      enabled: false,
      started: false,
      intervalHours: null,
    };
  }

  if (schedulerHandle) {
    return {
      enabled: true,
      started: true,
      intervalHours: resolveIntervalMs() / (60 * 60 * 1000),
    };
  }

  const intervalMs = resolveIntervalMs();
  schedulerHandle = setInterval(() => {
    void runScheduledRoleMarketIngestion();
  }, intervalMs);

  if (typeof schedulerHandle.unref === 'function') {
    schedulerHandle.unref();
  }

  return {
    enabled: true,
    started: true,
    intervalHours: intervalMs / (60 * 60 * 1000),
  };
}

async function stopRoleMarketScheduler() {
  if (!schedulerHandle) {
    return;
  }

  clearInterval(schedulerHandle);
  schedulerHandle = null;
}

module.exports = {
  isRoleMarketSchedulerEnabled,
  runScheduledRoleMarketIngestion,
  startRoleMarketScheduler,
  stopRoleMarketScheduler,
};
