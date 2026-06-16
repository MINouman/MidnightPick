import React, { useState, useEffect } from 'react'
import Swal from 'sweetalert2'
import './subscriptions.css'

export default function Subscriptions() {
  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)
  const [formData, setFormData] = useState({
    product_id: '',
    qty: 1,
    address: '',
    billing_day: 1,
  })

  useEffect(() => {
    loadSubscription()
  }, [])

  const loadSubscription = async () => {
    try {
      const response = await fetch('/api/v1/subscriptions', {
        credentials: 'include',
      })
      const { data } = await response.json()
      setSubscription(data)
      if (data) {
        setFormData({
          product_id: data.product_id || '',
          qty: data.qty,
          address: data.address,
          billing_day: data.billing_day,
        })
      }
    } catch (err) {
      console.error('Error loading subscription:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateSubmit = async (e) => {
    e.preventDefault()

    if (!formData.address.trim()) {
      Swal.fire('Error', 'Delivery address is required', 'error')
      return
    }

    try {
      const response = await fetch('/api/v1/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          product_id: formData.product_id || undefined,
          qty: formData.qty,
          address: formData.address,
          billing_day: formData.billing_day,
        }),
      })

      if (!response.ok) {
        const { error } = await response.json()
        throw new Error(error.message)
      }

      await Swal.fire('Success', 'Subscription created!', 'success')
      setShowCreateForm(false)
      await loadSubscription()
    } catch (err) {
      Swal.fire('Error', err.message, 'error')
    }
  }

  const handleUpdateSubmit = async (e) => {
    e.preventDefault()

    const updates = {}
    if (formData.product_id !== subscription.product_id) updates.product_id = formData.product_id
    if (formData.qty !== subscription.qty) updates.qty = formData.qty
    if (formData.address !== subscription.address) updates.address = formData.address
    if (formData.billing_day !== subscription.billing_day) updates.billing_day = formData.billing_day

    if (Object.keys(updates).length === 0) {
      Swal.fire('Info', 'No changes made', 'info')
      return
    }

    try {
      const response = await fetch('/api/v1/subscriptions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updates),
      })

      if (!response.ok) throw new Error('Update failed')

      await Swal.fire('Success', 'Subscription updated!', 'success')
      setShowEditForm(false)
      await loadSubscription()
    } catch (err) {
      Swal.fire('Error', err.message, 'error')
    }
  }

  const handlePause = async (months) => {
    const { isConfirmed } = await Swal.fire({
      title: `Pause for ${months} month${months > 1 ? 's' : ''}?`,
      text: `Your subscription will resume on ${getResumeDate(subscription.next_delivery_date, months)}`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Pause',
      cancelButtonText: 'Cancel',
    })

    if (!isConfirmed) return

    try {
      const response = await fetch('/api/v1/subscriptions/pause', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ months }),
      })

      if (!response.ok) throw new Error('Pause failed')

      await Swal.fire('Success', 'Subscription paused!', 'success')
      await loadSubscription()
    } catch (err) {
      Swal.fire('Error', err.message, 'error')
    }
  }

  const handleResume = async () => {
    const { isConfirmed } = await Swal.fire({
      title: 'Resume subscription?',
      text: 'Your next delivery will be as scheduled',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Resume',
    })

    if (!isConfirmed) return

    try {
      const response = await fetch('/api/v1/subscriptions/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      })

      if (!response.ok) throw new Error('Resume failed')

      await Swal.fire('Success', 'Subscription resumed!', 'success')
      await loadSubscription()
    } catch (err) {
      Swal.fire('Error', err.message, 'error')
    }
  }

  const handleCancel = async () => {
    const { isConfirmed } = await Swal.fire({
      title: 'Cancel subscription?',
      text: 'You can resubscribe anytime',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Cancel Subscription',
      confirmButtonColor: '#d33',
    })

    if (!isConfirmed) return

    try {
      const response = await fetch('/api/v1/subscriptions', {
        method: 'DELETE',
        credentials: 'include',
      })

      if (!response.ok) throw new Error('Cancel failed')

      await Swal.fire('Success', 'Subscription cancelled', 'success')
      await loadSubscription()
    } catch (err) {
      Swal.fire('Error', err.message, 'error')
    }
  }

  if (loading) {
    return <div className="subscriptions"><p>Loading...</p></div>
  }

  return (
    <div className="subscriptions">
      <h1>Subscriptions</h1>

      {!subscription ? (
        // No subscription yet
        <div className="no-subscription">
          <div className="empty-state">
            <h2>Never miss your favorite coffee</h2>
            <p>Get your Midnight Pick coffee delivered monthly on a schedule that works for you.</p>

            {!showCreateForm && (
              <button className="btn-primary" onClick={() => setShowCreateForm(true)}>
                Start Subscription
              </button>
            )}
          </div>

          {showCreateForm && (
            <div className="form-container">
              <h3>Create Subscription</h3>
              <form onSubmit={handleCreateSubmit} className="subscription-form">
                <div className="form-group">
                  <label>Product</label>
                  <input
                    type="text"
                    placeholder="Default: Midnight Blend — 95g Pouch"
                    value={formData.product_id}
                    onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Quantity</label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={formData.qty}
                      onChange={(e) => setFormData({ ...formData, qty: parseInt(e.target.value) })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Billing Day (1-28)</label>
                    <input
                      type="number"
                      min="1"
                      max="28"
                      value={formData.billing_day}
                      onChange={(e) => setFormData({ ...formData, billing_day: parseInt(e.target.value) })}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Delivery Address</label>
                  <textarea
                    placeholder="Your delivery address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    required
                  />
                </div>

                <button type="submit" className="btn-success">
                  Create Subscription
                </button>
                <button type="button" className="btn-cancel" onClick={() => setShowCreateForm(false)}>
                  Cancel
                </button>
              </form>
            </div>
          )}
        </div>
      ) : (
        // Active/Paused subscription
        <div className="subscription-card">
          <div className="subscription-status">
            <span className={`badge ${subscription.status}`}>{subscription.status.toUpperCase()}</span>
            {subscription.status === 'paused' && (
              <span className="pause-info">Until {new Date(subscription.pause_until).toLocaleDateString()}</span>
            )}
          </div>

          <div className="subscription-details">
            <div className="detail-section">
              <h3>Product</h3>
              <p className="product-name">{subscription.product_name}</p>
              <p className="product-price">{subscription.unit_price} BDT each</p>
            </div>

            <div className="detail-section">
              <h3>Plan</h3>
              <p>
                <strong>Quantity:</strong> {subscription.qty} unit{subscription.qty > 1 ? 's' : ''}
              </p>
              <p>
                <strong>Billing Day:</strong> {getOrdinalSuffix(subscription.billing_day)} of each month
              </p>
              <p>
                <strong>Next Delivery:</strong> {new Date(subscription.next_delivery_date).toLocaleDateString()}
              </p>
            </div>

            <div className="detail-section">
              <h3>Delivery Address</h3>
              <p>{subscription.address}</p>
            </div>

            <div className="detail-section">
              <h3>Monthly Cost</h3>
              <p className="monthly-cost">{subscription.unit_price * subscription.qty} BDT</p>
            </div>
          </div>

          {/* Actions */}
          <div className="subscription-actions">
            {subscription.status === 'active' && (
              <>
                <button className="btn-edit" onClick={() => setShowEditForm(true)}>
                  Edit Plan
                </button>

                <div className="pause-options">
                  <button className="btn-pause" onClick={() => handlePause(1)}>
                    Pause 1 month
                  </button>
                  <button className="btn-pause" onClick={() => handlePause(3)}>
                    Pause 3 months
                  </button>
                  <button className="btn-pause" onClick={() => handlePause(6)}>
                    Pause 6 months
                  </button>
                </div>
              </>
            )}

            {subscription.status === 'paused' && (
              <>
                <button className="btn-resume" onClick={handleResume}>
                  Resume Now
                </button>
              </>
            )}

            <button className="btn-danger" onClick={handleCancel}>
              Cancel Subscription
            </button>
          </div>

          {/* Edit Form */}
          {showEditForm && (
            <div className="edit-form">
              <h3>Edit Subscription</h3>
              <form onSubmit={handleUpdateSubmit} className="subscription-form">
                <div className="form-group">
                  <label>Quantity</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={formData.qty}
                    onChange={(e) => setFormData({ ...formData, qty: parseInt(e.target.value) })}
                  />
                </div>

                <div className="form-group">
                  <label>Billing Day</label>
                  <input
                    type="number"
                    min="1"
                    max="28"
                    value={formData.billing_day}
                    onChange={(e) => setFormData({ ...formData, billing_day: parseInt(e.target.value) })}
                  />
                </div>

                <div className="form-group">
                  <label>Delivery Address</label>
                  <textarea
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>

                <button type="submit" className="btn-success">
                  Save Changes
                </button>
                <button type="button" className="btn-cancel" onClick={() => setShowEditForm(false)}>
                  Cancel
                </button>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function getOrdinalSuffix(n) {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

function getResumeDate(dateStr, months) {
  const d = new Date(dateStr)
  d.setMonth(d.getMonth() + months)
  return d.toLocaleDateString()
}
