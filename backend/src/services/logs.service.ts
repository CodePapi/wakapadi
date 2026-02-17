import { Injectable } from '@nestjs/common'

export type LogEntry = { ts: string; msg: string }

@Injectable()
export class LogsService {
  private buffer: LogEntry[] = []
  private max = 1000

  add(msg: string) {
    try {
      const entry: LogEntry = { ts: new Date().toISOString(), msg }
      this.buffer.push(entry)
      if (this.buffer.length > this.max) this.buffer.shift()
    } catch (e) {
      // swallow
    }
  }

  getAll() {
    return this.buffer.slice()
  }

  clear() {
    this.buffer = []
  }
}
