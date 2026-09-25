import boardData from '@/data/management-august-board.json'

export type AugustBoardEntity = (typeof boardData.entities)[number]

export function getAugustBoard() {
  return boardData
}

export function getAugustBoardEntityBySlug(slug: string) {
  return boardData.entities.find((entity) => entity.slug === slug) ?? null
}

export function getAugustBoardEntityByName(name: string) {
  return boardData.entities.find((entity) => entity.name === name) ?? null
}

export function getAugustBoardCompany() {
  return boardData.entities.find((entity) => entity.slug === 'property-partners-vitacura') ?? null
}
