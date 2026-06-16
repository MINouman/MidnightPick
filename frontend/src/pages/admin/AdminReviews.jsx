import React, { useState, useEffect } from 'react'
import './admin-reviews.css'

export default function AdminReviews() {
  const [reviews, setReviews] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({
    status: 'all',
    rating: 'all',
  })

  useEffect(() => {
    loadReviews()
    loadStats()
  }, [page, filters])

  const loadReviews = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page,
        limit: 10,
        ...(filters.status !== 'all' && { status: filters.status }),
        ...(filters.rating !== 'all' && { rating: filters.rating }),
      })

      const response = await fetch(`/api/v1/admin/reviews?${params}`, {
        credentials: 'include',
      })

      if (!response.ok) throw new Error('Failed to load reviews')

      const { data } = await response.json()
      setReviews(data.reviews)
      setStats((prev) => ({ ...prev, ...data.stats, total: data.total }))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const response = await fetch('/api/v1/admin/reviews', {
        credentials: 'include',
      })

      if (!response.ok) throw new Error('Failed to load stats')

      const { data } = await response.json()
      setStats(data.stats)
    } catch (err) {
      console.error('Error loading stats:', err)
    }
  }

  const handleStatusChange = async (reviewId, newStatus) => {
    try {
      const response = await fetch(`/api/v1/admin/reviews/${reviewId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) throw new Error('Failed to update review')

      setReviews((prev) =>
        prev.map((r) => (r.id === reviewId ? { ...r, status: newStatus } : r))
      )
      await loadStats()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDelete = async (reviewId) => {
    if (!window.confirm('Delete this review permanently?')) return

    try {
      const response = await fetch(`/api/v1/admin/reviews/${reviewId}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (!response.ok) throw new Error('Failed to delete review')

      setReviews((prev) => prev.filter((r) => r.id !== reviewId))
      await loadStats()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleFilterChange = (e) => {
    const { name, value } = e.target
    setFilters((prev) => ({ ...prev, [name]: value }))
    setPage(1)
  }

  if (loading && !stats) {
    return <div className="admin-reviews"><p>Loading reviews...</p></div>
  }

  return (
    <div className="admin-reviews">
      <h1>Reviews Management</h1>

      {error && <div className="error-banner">{error}</div>}

      {/* Stats Cards */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-number">{stats.visible}</div>
            <div className="stat-label">Visible Reviews</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{stats.hidden}</div>
            <div className="stat-label">Hidden Reviews</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{stats.avg_rating?.toFixed(1)}</div>
            <div className="stat-label">Avg Rating</div>
          </div>
          <div className="stat-card">
            <div className="stat-label-main">{stats.top_tag}</div>
            <div className="stat-label">Top Tag</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="filters-row">
        <select
          name="status"
          value={filters.status}
          onChange={handleFilterChange}
          className="filter-select"
        >
          <option value="all">All Statuses</option>
          <option value="visible">Visible Only</option>
          <option value="hidden">Hidden Only</option>
        </select>

        <select
          name="rating"
          value={filters.rating}
          onChange={handleFilterChange}
          className="filter-select"
        >
          <option value="all">All Ratings</option>
          <option value="5">⭐⭐⭐⭐⭐ 5 Star</option>
          <option value="4">⭐⭐⭐⭐ 4 Star</option>
          <option value="3">⭐⭐⭐ 3 Star</option>
          <option value="2">⭐⭐ 2 Star</option>
          <option value="1">⭐ 1 Star</option>
        </select>
      </div>

      {/* Reviews Table */}
      <div className="reviews-table">
        <div className="table-header">
          <div className="col-reviewer">Reviewer</div>
          <div className="col-rating">Rating</div>
          <div className="col-tags">Tags</div>
          <div className="col-comment">Comment</div>
          <div className="col-status">Status</div>
          <div className="col-actions">Actions</div>
        </div>

        {reviews.length > 0 ? (
          reviews.map((review) => (
            <div key={review.id} className="table-row">
              <div className="col-reviewer">
                <div className="reviewer-name">{review.display_name}</div>
                {review.is_verified && <div className="badge-verified">✓ Verified</div>}
              </div>

              <div className="col-rating">
                <div className="rating-stars">
                  {'⭐'.repeat(review.rating)}
                </div>
                <div className="rating-num">{review.rating}/5</div>
              </div>

              <div className="col-tags">
                <div className="tags-list">
                  {review.highlight_tags?.length > 0
                    ? review.highlight_tags.map((tag) => (
                        <span key={tag} className="tag">
                          {tag}
                        </span>
                      ))
                    : <span className="no-tags">No tags</span>}
                </div>
              </div>

              <div className="col-comment">
                <div className="comment-text">
                  {review.comment || 'No comment'}
                </div>
              </div>

              <div className="col-status">
                <select
                  value={review.status}
                  onChange={(e) => handleStatusChange(review.id, e.target.value)}
                  className={`status-select status-${review.status}`}
                >
                  <option value="visible">Visible</option>
                  <option value="hidden">Hidden</option>
                </select>
              </div>

              <div className="col-actions">
                <button
                  onClick={() => handleDelete(review.id)}
                  className="btn-delete"
                  title="Delete review"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="table-empty">No reviews found</div>
        )}
      </div>

      {/* Pagination */}
      {stats && stats.total > 10 && (
        <div className="pagination">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn-page"
          >
            ← Previous
          </button>
          <span className="page-info">
            Page {page} of {Math.ceil(stats.total / 10)}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page * 10 >= stats.total}
            className="btn-page"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}
