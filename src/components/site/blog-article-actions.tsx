'use client'

import { Heart, Share2 } from 'lucide-react'
import * as React from 'react'

import type { StoreLocale } from '@/lib/locale-routing'

export function BlogArticleActions({ articleId, initialLikes, locale = 'ru' }: { articleId: number; initialLikes: number; locale?: StoreLocale }) {
  const [liked, setLiked] = React.useState(false)
  const [likes, setLikes] = React.useState(initialLikes)
  const [pending, setPending] = React.useState(false)
  const [shareLabel, setShareLabel] = React.useState('')
  const text = locale === 'ro'
    ? { copied: 'Link copiat', like: 'Îmi place articolul', share: 'Distribuie articolul' }
    : { copied: 'Ссылка скопирована', like: 'Нравится статья', share: 'Поделиться статьёй' }

  async function toggleLike() {
    if (pending) return
    setPending(true)
    try {
      const response = await fetch(`/api/blog/like/${articleId}`, { method: 'POST' })
      if (!response.ok) throw new Error('Like request failed')
      const result = await response.json() as { liked: boolean; count: number }
      setLiked(result.liked)
      setLikes(result.count)
    } finally {
      setPending(false)
    }
  }

  async function shareArticle() {
    const url = window.location.href
    try {
      if (navigator.share) {
        await navigator.share({ title: document.title, url })
        return
      }
      await navigator.clipboard.writeText(url)
      setShareLabel(text.copied)
      window.setTimeout(() => setShareLabel(''), 1800)
    } catch {
      setShareLabel('')
    }
  }

  return (
    <div className="blog-article-actions">
      <button
        className={`blog-article-actions__button${liked ? ' is-liked' : ''}`}
        type="button"
        onClick={toggleLike}
        disabled={pending}
        aria-pressed={liked}
        aria-label={text.like}
      >
        <Heart size={17} fill={liked ? 'currentColor' : 'none'} />
        <span>{likes}</span>
      </button>
      <button className="blog-article-actions__button" type="button" onClick={shareArticle} aria-label={text.share}>
        <Share2 size={17} />
      </button>
      {shareLabel ? <span className="blog-share-label" role="status">{shareLabel}</span> : null}
    </div>
  )
}

export function BlogReadingProgress() {
  const [progress, setProgress] = React.useState(0)

  React.useEffect(() => {
    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      setProgress(max > 0 ? Math.min(100, Math.max(0, (window.scrollY / max) * 100)) : 0)
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  return <div className="blog-reading-progress" aria-hidden="true"><span style={{ transform: `scaleX(${progress / 100})` }} /></div>
}
