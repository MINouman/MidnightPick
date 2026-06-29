"use client";

import styles from "./PlaceOrderModal.module.css";

export type IdentityCardProps = {
  confirmedPhone: string;
  userName: string;
  userInitials: string;
  onChangePhone: () => void;
};

export function IdentityCard({
  confirmedPhone,
  userName,
  userInitials,
  onChangePhone,
}: IdentityCardProps) {
  return (
    <section className={styles.identityCard} aria-label="Confirmed customer">
      <div className={styles.phoneStrip}>
        <span className={styles.checkBadge} aria-hidden="true">✓</span>
        <span className={styles.phoneText}>
          <span>Phone confirmed</span>
          <strong aria-label={`Confirmed phone: ${confirmedPhone}`}>{confirmedPhone}</strong>
        </span>
        <button type="button" onClick={onChangePhone} aria-label="Use a different phone number">
          Change
        </button>
      </div>

      <div className={styles.userRow}>
        <span className={styles.avatar} aria-hidden="true">{userInitials}</span>
        <span>
          <strong>{userName}</strong>
          <small>Ordering for this account</small>
        </span>
      </div>
    </section>
  );
}

export default IdentityCard;
