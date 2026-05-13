import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabaseServer'
import { sanitizeQuery, escapeIlikeTerm, truncate } from '@/lib/search/sanitize'
import { rankAndSort } from '@/lib/search/rank'
import { searchProducts, searchMerchants, searchCoupons, searchBanners, searchStatic } from '@/lib/search/normalizers'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q') || ''
  const rawType = searchParams.get('type')
  const validTypes = ['all', 'products', 'services', 'giftcards', 'offers', 'nfc', 'solar']
  const type = validTypes.includes(rawType) ? rawType : 'all'
  
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit')) || 20))
  const page = Math.max(1, parseInt(searchParams.get('page')) || 1)

  const sanitizedQ = sanitizeQuery(q)
  if (sanitizedQ === '') {
    return NextResponse.json(
      { error: 'Query parameter "q" is required and must not be empty' }, 
      { status: 400 }
    )
  }

  const escapedTerm = escapeIlikeTerm(sanitizedQ)
  const supabase = createAdminClient()

  try {
    let results = []
    let total = 0

    if (type === 'all') {
      const [productsRes, merchantsRes, couponsRes, bannersRes, staticsRes] = await Promise.all([
        searchProducts(supabase, escapedTerm, limit),
        searchMerchants(supabase, escapedTerm, limit),
        searchCoupons(supabase, escapedTerm, limit),
        searchBanners(supabase, escapedTerm, limit),
        Promise.resolve(searchStatic(escapedTerm, limit)),
      ])
      const merged = [
        ...productsRes.results, 
        ...merchantsRes.results, 
        ...couponsRes.results, 
        ...bannersRes.results, 
        ...staticsRes.results
      ]
      const ranked = rankAndSort(merged, sanitizedQ)
      total = ranked.length
      results = ranked.slice((page - 1) * limit, page * limit)
    } else {
      let res = { results: [], total: 0 }
      
      if (type === 'products') {
        res = await searchProducts(supabase, escapedTerm, limit, page)
      } else if (type === 'services') {
        res = await searchMerchants(supabase, escapedTerm, limit, page)
      } else if (type === 'giftcards') {
        res = await searchCoupons(supabase, escapedTerm, limit, page)
      } else if (type === 'offers') {
        res = await searchBanners(supabase, escapedTerm, limit, page)
      } else if (type === 'nfc') {
        const staticResults = searchStatic(escapedTerm, 1000)
        const filtered = staticResults.results.filter(r => r.category === 'nfc')
        res = {
          total: filtered.length,
          results: filtered.slice((page - 1) * limit, page * limit)
        }
      } else if (type === 'solar') {
        const staticResults = searchStatic(escapedTerm, 1000)
        const filtered = staticResults.results.filter(r => r.category === 'solar')
        res = {
          total: filtered.length,
          results: filtered.slice((page - 1) * limit, page * limit)
        }
      }

      results = res.results
      total = res.total
    }

    const processed = results.map(row => ({
      ...row,
      description: truncate(row.description, 100)
    }))

    return NextResponse.json({ results: processed, total, page, limit }, { status: 200 })
  } catch (err) {
    console.error('[api/search]', err)
    return NextResponse.json(
      { error: 'Internal server error', results: [], total: 0, page, limit }, 
      { status: 500 }
    )
  }
}
