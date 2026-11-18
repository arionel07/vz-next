import { and, count, eq } from 'drizzle-orm'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'

import { db } from '@/db'
import { articleLikes, articles } from '../../../../../../drizzle/schema'

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const articleId = Number((await params).id)
  if (!Number.isInteger(articleId) || articleId <= 0) {
    return NextResponse.json({ error: 'Invalid article' }, { status: 400 })
  }

  const [article] = await db
    .select({ id: articles.id })
    .from(articles)
    .where(and(eq(articles.id, articleId), eq(articles.isShown, 1), eq(articles.isBlog, 1)))
    .limit(1)

  if (!article) return NextResponse.json({ error: 'Article not found' }, { status: 404 })

  const cookieStore = await cookies()
  const existingVisitor = cookieStore.get('blog_visitor')?.value
  const visitorKey = existingVisitor || randomUUID().replaceAll('-', '')
  const [existing] = await db
    .select({ id: articleLikes.id })
    .from(articleLikes)
    .where(and(eq(articleLikes.articleId, articleId), eq(articleLikes.visitorKey, visitorKey)))
    .limit(1)

  let liked = false
  if (existing) {
    await db.delete(articleLikes).where(eq(articleLikes.id, existing.id))
  } else {
    await db.insert(articleLikes).values({
      articleId,
      visitorKey,
      createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
    })
    liked = true
  }

  const [{ likes }] = await db.select({ likes: count() }).from(articleLikes).where(eq(articleLikes.articleId, articleId))
  const response = NextResponse.json({ liked, count: Number(likes) })
  if (!existingVisitor) {
    response.cookies.set('blog_visitor', visitorKey, {
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    })
  }
  return response
}
