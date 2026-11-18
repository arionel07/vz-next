export type AuthUser = {
  id: number
  name: string
  surname: string | null
  email: string
  phone: string | null
  isB2B: boolean
  isCreator: boolean
}

