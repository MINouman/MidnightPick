'use client';

import { useEffect, useRef } from 'react';
import styles from './OfferExpiredAlert.module.css';

type OfferExpiredAlertProps = {
  productName: string;
  price: number;
  isOfferExpired: boolean;
  currencySymbol?: string;
};

const OFFER_EXPIRED_MESSAGE =
  'This offer is no longer available for this phone number. Regular price applies.';

export function OfferExpiredAlert({
  productName,
  price,
  isOfferExpired,
  currencySymbol = '৳',
}: OfferExpiredAlertProps) {
  const alertRef = useRef<HTMLDivElement>(null);
  const formattedPrice = `${currencySymbol}${price.toLocaleString()}`;

  useEffect(() => {
    if (!isOfferExpired || !alertRef.current) return;

    const el = alertRef.current;
    el.classList.remove(styles['shake-active']);
    // Force a reflow so re-adding the class restarts the CSS animation
    // when the modal opens again without a full component unmount.
    void el.offsetWidth;
    el.classList.add(styles['shake-active']);
  }, [isOfferExpired]);

  if (!isOfferExpired) {
    return (
      <div className={styles.plainRow}>
        <span className={styles.productName}>{productName}</span>
        <span className={styles.price}>{formattedPrice}</span>
      </div>
    );
  }

  return (
    <div ref={alertRef} className={styles.wrapper}>
      <div className={styles.productRow}>
        <span className={styles.productName}>{productName}</span>
        <span className={styles.price}>{formattedPrice}</span>
      </div>

      <div className={styles.banner} role="alert" aria-live="assertive">
        <span className={styles.icon} aria-hidden="true">
          <svg
            className={styles.iconSvg}
            viewBox="0 0 24 24"
            focusable="false"
          >
            <path
              d="M12 3.75 2.85 19.5h18.3L12 3.75Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <path
              d="M12 8.25v5.25M12 17.25h.01"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </span>
        <span className={styles.message}>{OFFER_EXPIRED_MESSAGE}</span>
      </div>
    </div>
  );
}

export default OfferExpiredAlert;
