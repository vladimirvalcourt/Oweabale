export async function yieldForPaint(): Promise<void> {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      setTimeout(resolve, 0);
    });
  });
}

export async function runAfterPaint<T>(label: string, task: () => Promise<T>): Promise<T> {
  const startMark = `${label}_start`;
  const paintMark = `${label}_paint`;
  performance.mark(startMark);
  await yieldForPaint();
  performance.mark(paintMark);
  performance.measure(`${label}_click_to_paint`, startMark, paintMark);
  return task();
}
