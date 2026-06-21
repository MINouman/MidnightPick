import React, { useState, useEffect } from 'react'
import Swal from 'sweetalert2'
import './points.css'

export default function Points() {
  const [pointsBalance, setPointsBalance] = useState(0)
  const [rewards, setRewards] = useState([])
  const [redemptions, setRedemptions] = useState([])
  const [transactions, setTransactions] = useState([])
  const [pointsSettings, setPointsSettings] = useState({ points_per_100_taka: 10, min_order_amount: 0 })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('rewards')
  const [page, setPage] = useState(1)

  useEffect(() => {
    loadPointsData()
  }, [activeTab, page])

  const loadPointsData = async () => {
    setLoading(true)
    try {
      // Load points balance
      const balanceRes = await fetch('/api/v1/me/points', {
        credentials: 'include',
      })
      const { data: balanceData } = await balanceRes.json()
      setPointsBalance(balanceData.points_balance ?? balanceData.balance ?? 0)
      if (balanceData.settings) setPointsSettings(balanceData.settings)

      // Load based on active tab
      if (activeTab === 'rewards') {
        const rewardsRes = await fetch(`/api/v1/rewards?page=${page}&limit=12`, {
          credentials: 'include',
        })
        const { data: rewardsData } = await rewardsRes.json()
        setRewards(rewardsData.rewards)
      } else if (activeTab === 'redemptions') {
        const redemptionsRes = await fetch(`/api/v1/me/redemptions?page=${page}&limit=20`, {
          credentials: 'include',
        })
        const { data: redemptionsData } = await redemptionsRes.json()
        setRedemptions(redemptionsData.redemptions)
      } else if (activeTab === 'history') {
        const historyRes = await fetch(`/api/v1/me/points/transactions?page=${page}&limit=20`, {
          credentials: 'include',
        })
        const { data: historyData } = await historyRes.json()
        setTransactions(historyData.transactions)
      }
    } catch (err) {
      console.error('Error loading points data:', err)
      Swal.fire('Error', 'Failed to load points data', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleRedeem = async (rewardId, rewardLabel, ptsCost) => {
    if (pointsBalance < ptsCost) {
      Swal.fire('Insufficient Points', `You need ${ptsCost} points but only have ${pointsBalance}`, 'warning')
      return
    }

    const { isConfirmed } = await Swal.fire({
      title: 'Redeem Reward?',
      text: `Spend ${ptsCost} points for "${rewardLabel}"?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Redeem',
      cancelButtonText: 'Cancel',
    })

    if (!isConfirmed) return

    try {
      const response = await fetch(`/api/v1/me/rewards/${rewardId}/redeem`, {
        method: 'POST',
        credentials: 'include',
      })

      if (!response.ok) {
        const { error } = await response.json()
        throw new Error(error.message)
      }

      await Swal.fire('Success', 'Reward redeemed! An admin will fulfill your request shortly.', 'success')
      await loadPointsData()
    } catch (err) {
      Swal.fire('Error', err.message, 'error')
    }
  }

  return (
    <div className="points-container">
      <div className="points-header">
        <h1>Points & Rewards</h1>
        <div className="points-balance">
          <div className="balance-display">
            <span className="balance-value">{pointsBalance}</span>
            <span className="balance-label">Points</span>
          </div>
        </div>
      </div>

      <div className="points-tabs">
        <button
          className={`tab ${activeTab === 'rewards' ? 'active' : ''}`}
          onClick={() => { setActiveTab('rewards'); setPage(1) }}
        >
          🎁 Rewards
        </button>
        <button
          className={`tab ${activeTab === 'redemptions' ? 'active' : ''}`}
          onClick={() => { setActiveTab('redemptions'); setPage(1) }}
        >
          📋 My Redemptions
        </button>
        <button
          className={`tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => { setActiveTab('history'); setPage(1) }}
        >
          📊 History
        </button>
      </div>

      {loading ? (
        <div className="loading">Loading...</div>
      ) : (
        <>
          {activeTab === 'rewards' && <RewardsTab rewards={rewards} balance={pointsBalance} onRedeem={handleRedeem} />}
          {activeTab === 'redemptions' && <RedemptionsTab redemptions={redemptions} />}
          {activeTab === 'history' && <HistoryTab transactions={transactions} />}
        </>
      )}

      <div className="points-info">
        <h3>How Points Work</h3>
        <ul>
          <li><strong>Earn:</strong> Get {pointsSettings.points_per_100_taka} points for every ৳100 you spend{Number(pointsSettings.min_order_amount) > 0 ? ` on orders of ৳${pointsSettings.min_order_amount} or more` : ''}</li>
          <li><strong>Redeem:</strong> Use your points to claim rewards</li>
          <li><strong>Track:</strong> View all your points activity in history</li>
        </ul>
      </div>
    </div>
  )
}

function RewardsTab({ rewards, balance, onRedeem }) {
  if (rewards.length === 0) {
    return <div className="empty-state">No rewards available at the moment.</div>
  }

  return (
    <div className="rewards-grid">
      {rewards.map((reward) => (
        <div key={reward.id} className="reward-card">
          <div className="reward-header">
            <h3>{reward.label}</h3>
            <span className="reward-cost">{reward.pts_cost} pts</span>
          </div>
          <p className="reward-worth">{reward.worth}</p>
          <button
            className={`btn-redeem ${reward.can_redeem ? '' : 'disabled'}`}
            disabled={!reward.can_redeem}
            onClick={() => onRedeem(reward.id, reward.label, reward.pts_cost)}
          >
            {reward.can_redeem ? 'Redeem Now' : 'Not Enough Points'}
          </button>
          {!reward.can_redeem && (
            <p className="need-points">
              Need {reward.pts_cost - balance} more points
            </p>
          )}
        </div>
      ))}
    </div>
  )
}

function RedemptionsTab({ redemptions }) {
  if (redemptions.length === 0) {
    return <div className="empty-state">You haven't redeemed any rewards yet.</div>
  }

  return (
    <div className="redemptions-table">
      <div className="table-header">
        <div className="col-reward">Reward</div>
        <div className="col-points">Points</div>
        <div className="col-status">Status</div>
        <div className="col-date">Date</div>
      </div>
      {redemptions.map((redemption) => (
        <div key={redemption.id} className="table-row">
          <div className="col-reward">{redemption.reward_label}</div>
          <div className="col-points">{redemption.pts_cost}</div>
          <div className="col-status">
            <span className={`status-badge ${redemption.status}`}>
              {redemption.status}
            </span>
          </div>
          <div className="col-date">
            {new Date(redemption.created_at).toLocaleDateString()}
          </div>
        </div>
      ))}
    </div>
  )
}

function HistoryTab({ transactions }) {
  if (transactions.length === 0) {
    return <div className="empty-state">No transactions yet.</div>
  }

  return (
    <div className="history-table">
      <div className="table-header">
        <div className="col-type">Type</div>
        <div className="col-amount">Points</div>
        <div className="col-description">Description</div>
        <div className="col-balance">Balance</div>
        <div className="col-date">Date</div>
      </div>
      {transactions.map((tx) => (
        <div key={tx.id} className={`table-row ${tx.type}`}>
          <div className="col-type">
            <span className={`badge ${tx.type}`}>
              {getTypeEmoji(tx.type)} {tx.type}
            </span>
          </div>
          <div className={`col-amount ${tx.type === 'earned' ? 'earned' : 'spent'}`}>
            {tx.type === 'earned' || tx.type === 'bonus' ? '+' : '-'}{tx.points}
          </div>
          <div className="col-description">{tx.description}</div>
          <div className="col-balance">{tx.balance_after}</div>
          <div className="col-date">
            {new Date(tx.created_at).toLocaleDateString()}
          </div>
        </div>
      ))}
    </div>
  )
}

function getTypeEmoji(type) {
  const emojis = {
    earned: '✅',
    spent: '❌',
    reversed: '🔄',
    bonus: '🎉',
  }
  return emojis[type] || '•'
}
