export const composeClasses = (
  ...classes: (string | undefined | null | boolean)[]
): string => {
  const filteredClasses = classes.filter(Boolean)
  return filteredClasses.join(' ').trim()
}
