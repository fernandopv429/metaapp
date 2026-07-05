export interface LogEntry {
  timestamp: string;
  app_id?: string;
  company_id?: string;
  event_type: 'WEBHOOK_RECEIVE' | 'ROUTING_SUCCESS' | 'ROUTING_FAILED' | 'DATA_DELETION_REQUEST' | 'DEAUTHORIZE_EVENT';
  status_detail: string;
}

class LogsManager {
  private logs: LogEntry[] = [];
  private readonly maxLen = 100;

  append(log: LogEntry) {
    this.logs.unshift(log); // prepend to keep newest first
    if (this.logs.length > this.maxLen) {
      this.logs.pop(); // remove oldest
    }
    console.log(`[${log.event_type}] ${log.timestamp}: ${log.status_detail}`);
  }

  getLogs() {
    return this.logs;
  }
}

export const logsManager = new LogsManager();
