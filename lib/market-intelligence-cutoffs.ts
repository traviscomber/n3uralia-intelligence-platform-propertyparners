export function latestCutoff(values: Array<string | null | undefined>) {
  const timestamps = values
    .filter((value): value is string => Boolean(value))
    .map((value) => ({ value, time: new Date(value).getTime() }))
    .filter(({ time }) => !Number.isNaN(time))
    .sort((a, b) => b.time - a.time)

  return timestamps[0]?.value ?? null
}
