export interface TickResponse {
    current_page: number
    data: Tick[]
    first_page_url: string
    from: number
    last_page: number
    last_page_url: string
    links: Link[]
    next_page_url: any
    path: string
    per_page: number
    prev_page_url: any
    to: number
    total: number
  }
  
  export interface Tick {
    id: number
    date: string
    comment: any
    style: string
    leadStyle: string
    pitches: number
    text: any
    createdAt: string
    updatedAt: string
    user: any
  }
  
  export interface Link {
    url?: string
    label: string
    active: boolean
  }
  