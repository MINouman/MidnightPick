import React, { useState, useEffect } from 'react'
import './user-reviews.css'

export default function UserReviews() {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [stats, setStats] = useState(null)

  useEffect(() => {
    loadUserReviews()
  }, [])

  const loadUserReviews = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/v1/reviews/user', {
        credentials: 'include',
      })

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Please log in to view your reviews')
        }
        throw new Error('Failed to load your reviews')
      }

      const { data } = await response.json()
      setReviews(data.reviews || [])

      if (data.reviews?.length > 0) {
        const avgRating =
          data.reviews.reduce((sum, r) => sum + r.rating, 0) / data.reviews.length
        setStats({
          count: data.reviews.length,
          avg_rating: avgRating,
        })
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="user-reviews"><p>Loading your reviews...</p></div>
  }

  if (error) {
    return (
      <div className="user-reviews">
        <div className="error-container">
          <h2>Could not load your reviews</h2>
          <p>{error}</p>
          <a href="/login" className="btn-login">
            Go to Login
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="user-reviews">
      <div className="user-reviews-header">
        <h1>My Reviews</h1>
        <p>Track all your product reviews and ratings</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="user-stats">
          <div className="stat">
            <div className="stat-value">{stats.count}</div>
            <div className="stat-label">Reviews Written</div>
          </div>
          <div className="stat">
            <div className="stat-value">{stats.avg_rating.toFixed(1)}</div>
            <div className="stat-label">Average Rating</div>
          </div>
        </div>
      )}

      {/* Reviews List */}
      <div className="reviews-container">
        {reviews.length > 0 ? (
          reviews.map((review) => (
            <div key={review.id} className="review-item">
              <div className="review-item-header">
                <div>
                  <h3>{review.product_slug}</h3>
                  <div className="review-rating">
                    {'⭐'.repeat(review.rating)}
                    <span className="rating-text">({review.rating}/5)</span>
                  </div>
                </div>
                <div className="review-status">
                  <span className={`status-badge status-${review.status}`}>
                    {review.status === 'visible' ? '✓ Visible' : '👁️ Hidden'}
                  </span>
                  {review.is_verified && <span className="badge-verified">Verified</span>}
                </div>
              </div>

              {review.highlight_tags && review.highlight_tags.length > 0 && (
                <div className="review-tags">
                  {review.highlight_tags.map((tag) => (
                    <span key={tag} className="tag">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {review.comment && <p className="review-text">{review.comment}</p>}

              <div className="review-footer">
                <span className="review-date">
                  {new Date(review.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state">
            <div className="empty-icon">📝</div>
            <h2>No reviews yet</h2>
            <p>Start reviewing products you've purchased to help other customers!</p>
            <a href="/shop" className="btn-shop">
              Browse Products
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
