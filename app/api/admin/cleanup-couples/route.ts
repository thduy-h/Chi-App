import { NextResponse } from 'next/server'

import { createSupabaseAdminClient } from '@/lib/supabase/admin'

function isAuthorized(request: Request) {
  const secret = process.env.COUPLE_CLEANUP_SECRET || process.env.CRON_SECRET
  if (!secret) {
    return false
  }

  const headerSecret = request.headers.get('x-cleanup-secret')
  if (headerSecret && headerSecret === secret) {
    return true
  }

  const authHeader = request.headers.get('authorization')
  if (!authHeader) {
    return false
  }

  const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : authHeader
  return token === secret
}

async function runCleanup(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createSupabaseAdminClient()
  if (!admin) {
    return NextResponse.json({ error: 'Missing Supabase admin configuration.' }, { status: 500 })
  }

  const url = new URL(request.url)
  const daysParam = Number(url.searchParams.get('days') || '30')
  const days = Number.isFinite(daysParam) ? Math.max(0, Math.min(3650, Math.floor(daysParam))) : 30

  const { data, error } = await admin.rpc('cleanup_orphan_couples', { p_older_than_days: days })
  if (error) {
    return NextResponse.json(
      {
        error: `${error.message}${error.code ? ` (${error.code})` : ''}`,
        details: error.details ?? null
      },
      { status: 500 }
    )
  }

  const deleted = typeof data === 'number' ? data : Number(data || 0)
  return NextResponse.json({ ok: true, deleted, days }, { status: 200 })
}

export async function GET(request: Request) {
  return runCleanup(request)
}

export async function POST(request: Request) {
  return runCleanup(request)
}
