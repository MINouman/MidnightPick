import React, { useState, useEffect } from 'react'
import './admin-feedback.css'

export default function AdminFeedback() {
  const [feedbacks, setFeedbacks] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({
    emotion: 'all',
    device: 'all',
    tag: 'all',
    search: '',
    from: '',
    to: '',
  })

  const ISSUE_TAGS = [
    'checkout',
    'payment',
    'delivery_address',
    'coupon',
    'website_speed',
    'product_info',
  ]

  const EMOTIONS = {
    very_easy: { label: '😊 Very Easy', color: '#27ae60' },
    okay: { label: '😐 Okay', color: '#f39c12' },
    confusing: { label: '😞 Confusing', color: '#e74c3c' },
  }

  useEffect(() => {
    loadFeedbacks()
    loadStats()
  }, [page, filters])

  const loadFeedbacks = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page,
        limit: 10,
        ...(filters.emotion !== 'all' && { emotion: filters.emotion }),
        ...(filters.device !== 'all' && { device: filters.device }),
        ...(filters.tag !== 'all' && { tag: filters.tag }),
        ...(filters.search && { search: filters.search }),
        ...(filters.from && { from: filters.from }),
        ...(filters.to && { to: filters.to }),
      })

      const response = await fetch(`/api/v1/admin/feedback?${params}`, {
        credentials: 'include',
      })

      if (!response.ok) throw new Error('Failed to load feedbacks')

      const { data } = await response.json()
      setFeedbacks(data.feedbacks)
      setStats((prev) => ({ ...prev, ...data.stats, total: data.total }))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const response = await fetch('/api/v1/admin/feedback', {
        credentials: 'include',
      })

      if (!response.ok) throw new Error('Failed to load stats')

      const { data } = await response.json()
      setStats(data.stats)
    } catch (err) {
      console.error('Error loading stats:', err)
    }
  }

  const handleFilterChange = (e) => {
    const { name, value } = e.target
    setFilters((prev) => ({ ...prev, [name]: value }))
    setPage(1)
  }

  if (loading && !stats) {
    return <div className="admin-feedback"><p>Loading feedback...</p></div>
  }

  const totalPages = stats ? Math.ceil(stats.total / 10) : 1

  return (
    <div className="admin-feedback">
      <h1>Feedback Analytics</h1>

      {error && <div className="error-banner">{error}</div>}

      {/* Stats Cards */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-number">{stats.total}</div>
            <div className="stat-label">Total Feedback</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{stats.avg_score?.toFixed(1)}</div>
            <div className="stat-label">Avg Score</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{stats.confusing_pct}%</div>
            <div className="stat-label">Confusing %</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{stats.mobile}</div>
            <div className="stat-label">Mobile Users</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{stats.with_comment}</div>
            <div className="stat-label">With Comments</div>
          </div>
          <div className="stat-card">
            <div className="stat-label-main">{stats.top_issue}</div>
            <div className="stat-label">Top Issue</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="filters-section">
        <div className="filters-row">
          <select
            name="emotion"
            value={filters.emotion}
            onChange={handleFilterChange}
            className="filter-select"
          >
            <option value="all">All Emotions</option>
            <option value="very_easy">😊 Very Easy</option>
            <option value="okay">😐 Okay</option>
            <option value="confusing">😞 Confusing</option>
          </select>

          <select
            name="device"
            value={filters.device}
            onChange={handleFilterChange}
            className="filter-select"
          >
            <option value="all">All Devices</option>
            <option value="mobile">📱 Mobile</option>
            <option value="tablet">📱 Tablet</option>
            <option value="desktop">💻 Desktop</option>
          </select>

          <select
            name="tag"
            value={filters.tag}
            onChange={handleFilterChange}
            className="filter-select"
          >
            <option value="all">All Issues</option>
            {ISSUE_TAGS.map((tag) => (
              <option key={tag} value={tag}>
                {tag.replace(/_/g, ' ')}
              </option>
            ))}
          </select>

          <input
            type="search"
            name="search"
            value={filters.search}
            onChange={handleFilterChange}
            placeholder="Search order ref, name, phone..."
            className="filter-search"
          />
        </div>

        <div className="filters-row">
          <input
            type="date"
            name="from"
            value={filters.from}
            onChange={handleFilterChange}
            className="filter-date"
          />
          <input
            type="date"
            name="to"
            value={filters.to}
            onChange={handleFilterChange}
            className="filter-date"
          />
        </div>
      </div>

      {/* Feedback Table */}
      <div className="feedback-table">
        <div className="table-header">
          <div className="col-order">Order Ref</div>
          <div className="col-customer">Customer</div>
          <div className="col-emotion">Emotion</div>
          <div className="col-issues">Issues</div>
          <div className="col-device">Device</div>
          <div className="col-comment">Comment</div>
        </div>

        {feedbacks.length > 0 ? (
          feedbacks.map((feedback) => (
            <div key={feedback.id} className="table-row">
              <div className="col-order">
                <div className="order-ref">{feedback.order_ref}</div>
                <div className="order-status">{feedback.order_status}</div>
              </div>

              <div className="col-customer">
                <div className="customer-name">{feedback.customer_name}</div>
                <div className="customer-phone">{feedback.customer_phone}</div>
              </div>

              <div className="col-emotion">
                <div className="emotion-badge" style={{ borderColor: EMOTIONS[feedback.emotion]?.color }}>
                  {EMOTIONS[feedback.emotion]?.label || feedback.emotion}
                </div>
                <div className="emotion-score">Score: {feedback.score}</div>
              </div>

              <div className="col-issues">
                <div className="tags-list">
                  {feedback.issue_tags?.length > 0
                    ? feedback.issue_tags.map((tag) => (
                        <span key={tag} className="issue-tag">
                          {tag.replace(/_/g, ' ')}
                        </span>
                      ))
                    : <span className="no-issues">None</span>}
                </div>
              </div>

              <div className="col-device">
                <span className="device-badge">{feedback.device_type}</span>
              </div>

              <div className="col-comment">
                <div className="comment-text" title={feedback.comment || 'No comment'}>
                  {feedback.comment || 'No comment'}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="table-empty">No feedback found</div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn-page"
          >
            ← Previous
          </button>
          <span className="page-info">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page * 10 >= (stats?.total || 0)}
            className="btn-page"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}
