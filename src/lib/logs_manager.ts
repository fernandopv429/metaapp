export interface LogEntry {
  timestamp: string;
  company_id?: string;
  event_type: string;
  status_detail: string;
}

class LogsManager {
  private logs: LogEntry[] = [];
  private readonly maxLen = 100;

  private sanitize(text: string): string {
    if (!text) return text;
    // Sanitize phone numbers: +5511999XXXXXX
    let sanitized = text.replace(/(\+?\d{6})\d{4,}/g, '$1******');
    
    // Sanitize tokens
    sanitized = sanitized.replace(/(EAA[a-zA-Z0-9_-]{15,})/g, 'EAA******[HIDDEN]');
    
    // Sanitize any generic bearer tokens or secrets if accidentally logged
    sanitized = sanitized.replace(/([A-Za-z0-9_-]{40,})/g, '[REDACTED_TOKEN]');
    
    return sanitized;
  }

  append(log: LogEntry) {
    const safeLog = {
      ...log,
      status_detail: this.sanitize(log.status_detail)
    };
    
    this.logs.unshift(safeLog); // prepend to keep newest first
    if (this.logs.length > this.maxLen) {
      this.logs.pop(); // remove oldest
    }
    console.log(`[${safeLog.event_type}] ${safeLog.timestamp}: ${safeLog.status_detail}`);
  }

  getLogs() {
    return this.logs;
  }
}

export const logsManager = new LogsManager();
