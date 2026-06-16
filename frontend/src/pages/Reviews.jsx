import React, { useState, useEffect } from 'react'
import './reviews.css'

export default function Reviews() {
  const [reviews, setReviews] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)
  const [selectedTag, setSelectedTag] = useState(null)
  const [product, setProduct] = useState('midnight-blend')

  useEffect(() => {
    loadReviews()
  }, [page, selectedTag, product])

  const loadReviews = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        product,
        page,
        limit: 10,
      })

      const response = await fetch(`/api/v1/reviews?${params}`)

      if (!response.ok) throw new Error('Failed to load reviews')

      const { data } = await response.json()
      setReviews(data.reviews)
      setStats({
        total: data.total,
        avg_rating: data.avg_rating,
        top_tags: data.top_tags,
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleTagFilter = (tag) => {
    setSelectedTag(selectedTag === tag ? null : tag)
    setPage(1)
  }

  const filteredReviews = selectedTag
    ? reviews.filter((r) => r.highlight_tags?.includes(selectedTag))
    : reviews

  const totalPages = stats ? Math.ceil(stats.total / 10) : 1

  const getRatingStars = (rating) => {
    return '⭐'.repeat(rating)
  }

  if (loading && !stats) {
    return <div className="reviews-page"><p>Loading reviews...</p></div>
  }

  return (
    <div className="reviews-page">
      <div className="reviews-header">
        <h1>Customer Reviews</h1>
        <p>See what our customers think about Midnight Blend</p>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {/* Stats Section */}
      {stats && (
        <div className="stats-section">
          <div className="rating-summary">
            <div className="avg-rating">
              <div className="big-rating">{stats.avg_rating?.toFixed(1)}</div>
              <div className="rating-stars">{getRatingStars(Math.round(stats.avg_rating))}</div>
              <div className="total-reviews">Based on {stats.total} reviews</div>
            </div>

            {/* Rating Distribution */}
            <div className="rating-distribution">
              {[5, 4, 3, 2, 1].map((rating) => {
                const count = reviews.filter((r) => r.rating === rating).length
                const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0
                return (
                  <div key={rating} className="rating-bar">
                    <div className="rating-label">{rating}⭐</div>
                    <div className="bar-container">
                      <div className="bar-fill" style={{ width: `${percentage}%` }}></div>
                    </div>
                    <div className="rating-count">{count}</div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Tag Cloud */}
          <div className="tags-section">
            <h3>Popular Tags</h3>
            <div className="tags-cloud">
              {stats.top_tags?.map((tag, idx) => (
                <button
                  key={tag.tag}
                  onClick={() => handleTagFilter(tag.tag)}
                  className={`tag-button ${selectedTag === tag.tag ? 'active' : ''}`}
                  style={{ fontSize: `${12 + (stats.top_tags.length - idx) * 1.5}px` }}
                >
                  {tag.tag} <span className="tag-count">({tag.uses})</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Reviews List */}
      <div className="reviews-list">
        <div className="reviews-list-header">
          <h2>{selectedTag ? `Reviews about "${selectedTag}"` : 'All Reviews'}</h2>
          {selectedTag && (
            <button onClick={() => setSelectedTag(null)} className="clear-filter">
              ✕ Clear Filter
            </button>
          )}
        </div>

        {filteredReviews.length > 0 ? (
          filteredReviews.map((review) => (
            <div key={review.id} className="review-card">
              <div className="review-header">
                <div className="reviewer-info">
                  <div className="reviewer-name">{review.display_name}</div>
                  {review.is_verified && <span className="badge-verified">✓ Verified Purchase</span>}
                </div>
                <div className="review-rating">{getRatingStars(review.rating)}</div>
              </div>

              {review.highlight_tags && review.highlight_tags.length > 0 && (
                <div className="review-tags">
                  {review.highlight_tags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => handleTagFilter(tag)}
                      className="review-tag-chip"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              )}

              {review.comment && <p className="review-comment">{review.comment}</p>}

              <div className="review-date">
                {new Date(review.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </div>
            </div>
          ))
        ) : (
          <div className="no-reviews">
            {selectedTag ? (
              <>
                <p>No reviews found for "{selectedTag}"</p>
                <button onClick={() => setSelectedTag(null)} className="btn-back">
                  Back to All Reviews
                </button>
              </>
            ) : (
              <p>No reviews yet. Be the first to review!</p>
            )}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && filteredReviews.length > 0 && (
        <div className="pagination">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn-nav"
          >
            ← Previous
          </button>
          <span className="page-info">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page * 10 >= stats.total}
            className="btn-nav"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}
