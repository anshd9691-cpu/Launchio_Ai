import { createClient } from '@supabase/supabase-js'

const supabaseUrl = (
  import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL ||
  ''
) as string

const supabaseAnonKey = (
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  ''
) as string

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type ProductType = 'ebook' | 'course' | 'template' | 'prompt_pack'
export type ProductStatus = 'draft' | 'published'

export interface Product {
  id: string
  title: string
  description: string
  type: ProductType
  price: number
  creator_id: string
  creator_email: string
  status: ProductStatus
  slug: string
  created_at: string
  file_url?: string
}

export interface Purchase {
  id: string
  product_id: string
  buyer_email: string
  amount: number
  creator_payout: number
  platform_fee: number
  created_at: string
}
