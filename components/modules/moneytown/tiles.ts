/**
 * MoneyTown - Tile names and colors (our own content, Monopoly-style layout).
 * 24 tiles: corners at 0, 6, 12, 18; pastel palette.
 */

export const TILE_NAMES: string[] = [
  'Start',      // 0 – collect when pass
  'Allowance',  // 1
  'Piggy Bank', // 2
  'Lemonade',   // 3
  'Chore Chart',// 4
  'Turn',       // 5 – corner
  'Shop',       // 6 – pay $20
  'Chance',     // 7
  'Toy Store',  // 8
  'Birthday',   // 9
  'School',     // 10
  'Bank',       // 11 – corner
  'Goal',       // 12
  'Ice Cream',  // 13
  'Yard Sale',  // 14
  'Movie',      // 15
  'Pet Store',  // 16
  'Bonus',      // 17 – corner
  'Chance',     // 18
  'Book Fair',  // 19
  'Gift',       // 20
  'Bike Shop',  // 21
  'Save',       // 22
  'Visit',      // 23 – corner
]

/** Pastel colors (light mode) – Monopoly-style variety */
const PASTEL_LIGHT: string[] = [
  '#fecaca', '#fed7aa', '#fef08a', '#bbf7d0', '#a5f3fc', '#c7d2fe',
  '#fbcfe8', '#e9d5ff', '#ddd6fe', '#fed7aa', '#bbf7d0', '#c7d2fe',
  '#fef08a', '#a5f3fc', '#fbcfe8', '#e9d5ff', '#ddd6fe', '#bbf7d0',
  '#fecaca', '#fed7aa', '#c7d2fe', '#a5f3fc', '#e9d5ff', '#fef08a',
]

/** Slightly darker pastels for dark mode */
const PASTEL_DARK: string[] = [
  '#b91c1c', '#c2410c', '#a16207', '#15803d', '#0e7490', '#3730a3',
  '#be185d', '#7c3aed', '#5b21b6', '#c2410c', '#15803d', '#3730a3',
  '#a16207', '#0e7490', '#be185d', '#7c3aed', '#5b21b6', '#15803d',
  '#b91c1c', '#c2410c', '#3730a3', '#0e7490', '#7c3aed', '#a16207',
]

export function getTileColor(tileIndex: number, dark: boolean): string {
  const arr = dark ? PASTEL_DARK : PASTEL_LIGHT
  if (tileIndex === 0) return dark ? '#047857' : '#22c55e'   // Start – green
  if (tileIndex === 6) return dark ? '#b91c1c' : '#ef4444'  // Shop – red
  return arr[tileIndex % arr.length]
}
