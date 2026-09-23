export type PuzzleScheduler = (task: () => void) => void;

const defaultScheduler: PuzzleScheduler = (task) => {
  setTimeout(task, 0);
};

export class PuzzleQueue<T> {
  private revision = 0;
  private entry: { key: string; promise: Promise<T> } | null = null;

  constructor(private readonly schedule: PuzzleScheduler = defaultScheduler) {}

  prepare(key: string, work: () => T | null): Promise<T> {
    if (this.entry?.key === key) return this.entry.promise;
    const revision = ++this.revision;
    const promise = new Promise<T>((resolve, reject) => {
      this.schedule(() => {
        if (revision !== this.revision) {
          reject(new Error("题目请求已取消"));
          return;
        }
        try {
          const result = work();
          if (result === null) reject(new Error("没有题目满足当前约束"));
          else resolve(result);
        } catch (error) {
          reject(error);
        }
      });
    });
    this.entry = { key, promise };
    return promise;
  }

  clear(): void {
    this.revision += 1;
    this.entry = null;
  }
}
