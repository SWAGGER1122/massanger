export type Profile = {
  id: string
  full_name: string | null
  avatar_url: string | null
}

export type Message = {
  id: string
  sender_id: string
  content: string
  created_at: string
  read_by: string[] | null
}
