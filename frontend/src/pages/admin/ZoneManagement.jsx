import React, { useState, useEffect } from 'react'
import './zone-management.css'

export default function ZoneManagement() {
  const [zones, setZones] = useState([])
  const [recentChanges, setRecentChanges] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingZone, setEditingZone] = useState(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [error, setError] = useState(null)

  // Form state for updates
  const [formData, setFormData] = useState({
    delivery_fee_base: '',
    delivery_fee_per_km: '',
    delivery_time_min: '',
    delivery_time_max: '',
    is_active: true,
    reason: '',
  })

  useEffect(() => {
    loadZones()
    loadRecentChanges()
  }, [])

  const loadZones = async () => {
    try {
      const response = await fetch('/api/v1/admin/zones/compare', {
        credentials: 'include',
      })

      if (!response.ok) throw new Error('Failed to load zones')

      const { data } = await response.json()
      setZones(data.zones)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const loadRecentChanges = async () => {
    try {
      const response = await fetch('/api/v1/admin/zones/changes/recent?limit=10', {
        credentials: 'include',
      })

      if (!response.ok) throw new Error('Failed to load recent changes')

      const { data } = await response.json()
      setRecentChanges(data.changes)
    } catch (err) {
      console.error('Error loading changes:', err)
    }
  }

  const handleEditZone = (zone) => {
    setEditingZone(zone)
    setFormData({
      delivery_fee_base: zone.delivery_fee_base,
      delivery_fee_per_km: zone.delivery_fee_per_km,
      delivery_time_min: parseInt(zone.delivery_time.split('-')[0]),
      delivery_time_max: parseInt(zone.delivery_time.split('-')[1]),
      is_active: true,
      reason: '',
    })
    setShowCreateForm(false)
  }

  const handleUpdateZone = async () => {
    if (!editingZone) return

    try {
      const response = await fetch(`/api/v1/admin/zones/${editingZone.zone_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      })

      if (!response.ok) throw new Error('Failed to update zone')

      setEditingZone(null)
      await loadZones()
      await loadRecentChanges()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  if (loading) {
    return <div className="zone-management"><p>Loading zones...</p></div>
  }

  return (
    <div className="zone-management">
      <h1>Delivery Zone Management</h1>

      {error && <div className="error-banner">{error}</div>}

      <div className="zone-controls">
        <button className="btn-primary" onClick={() => setShowCreateForm(!showCreateForm)}>
          {showCreateForm ? '✕ Cancel' : '+ Add New Zone'}
        </button>
      </div>

      {/* Zone List */}
      <div className="zones-grid">
        {zones.map((zone) => (
          <div key={zone.zone_id} className="zone-card">
            <div className="zone-header">
              <h3>{zone.zone_name}</h3>
              <span className="zone-code">{zone.zone_code}</span>
            </div>

            <div className="zone-details">
              <div className="detail-row">
                <label>Base Fee:</label>
                <span className="fee">{zone.delivery_fee_base} ৳</span>
              </div>
              <div className="detail-row">
                <label>Per KM:</label>
                <span>{zone.delivery_fee_per_km} ৳</span>
              </div>
              <div className="detail-row">
                <label>Delivery Time:</label>
                <span>{zone.delivery_time}</span>
              </div>
            </div>

            {editingZone?.zone_id === zone.zone_id ? (
              <div className="edit-form">
                <div className="form-group">
                  <label>Base Fee (৳)</label>
                  <input
                    type="number"
                    name="delivery_fee_base"
                    value={formData.delivery_fee_base}
                    onChange={handleFormChange}
                  />
                </div>

                <div className="form-group">
                  <label>Per KM (৳)</label>
                  <input
                    type="number"
                    name="delivery_fee_per_km"
                    value={formData.delivery_fee_per_km}
                    onChange={handleFormChange}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Min Days</label>
                    <input
                      type="number"
                      name="delivery_time_min"
                      value={formData.delivery_time_min}
                      onChange={handleFormChange}
                    />
                  </div>
                  <div className="form-group">
                    <label>Max Days</label>
                    <input
                      type="number"
                      name="delivery_time_max"
                      value={formData.delivery_time_max}
                      onChange={handleFormChange}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Reason for Change</label>
                  <input
                    type="text"
                    name="reason"
                    placeholder="e.g., Seasonal adjustment"
                    value={formData.reason}
                    onChange={handleFormChange}
                  />
                </div>

                <div className="form-actions">
                  <button className="btn-success" onClick={handleUpdateZone}>
                    Save Changes
                  </button>
                  <button className="btn-cancel" onClick={() => setEditingZone(null)}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button className="btn-edit" onClick={() => handleEditZone(zone)}>
                Edit Fee
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Recent Changes */}
      <div className="recent-changes">
        <h2>Recent Changes</h2>
        <div className="changes-table">
          <div className="changes-header">
            <div className="col-zone">Zone</div>
            <div className="col-change">Change</div>
            <div className="col-admin">Changed By</div>
            <div className="col-time">When</div>
          </div>

          {recentChanges.length > 0 ? (
            recentChanges.map((change) => (
              <div key={change.change_id} className="change-row">
                <div className="col-zone">{change.zone_name}</div>
                <div className="col-change">
                  {change.old_fee && change.new_fee ? (
                    <span>{change.old_fee}৳ → {change.new_fee}৳</span>
                  ) : (
                    <span>{change.reason}</span>
                  )}
                </div>
                <div className="col-admin">{change.changed_by}</div>
                <div className="col-time">{new Date(change.changed_at).toLocaleDateString()}</div>
              </div>
            ))
          ) : (
            <div className="changes-empty">No changes yet</div>
          )}
        </div>
      </div>
    </div>
  )
}
