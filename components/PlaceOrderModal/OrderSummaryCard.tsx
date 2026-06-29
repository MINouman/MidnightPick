"use client";

import styles from "./PlaceOrderModal.module.css";

export type OrderSummaryCardProps = {
  productName: string;
  originalPrice: number;
  discountedPrice: number;
  discountAmount: number;
  offerLabel: string;
  offerTerms: string;
  deliveryCharge: number;
  codCharge: number;
  isOfferExpired: boolean;
  currencySymbol?: string;
};

function money(value: number, currencySymbol: string): string {
  return `${currencySymbol}${Math.round(value).toLocaleString()}`;
}

export function OrderSummaryCard({
  productName,
  originalPrice,
  discountedPrice,
  discountAmount,
  offerLabel,
  offerTerms,
  deliveryCharge,
  codCharge,
  isOfferExpired,
  currencySymbol = "৳",
}: OrderSummaryCardProps) {
  const productTotal = isOfferExpired ? originalPrice : discountedPrice;
  const total = productTotal + deliveryCharge + codCharge;

  return (
    <section className={styles.summaryCard} aria-label="Order summary">
      <div className={styles.summaryProductRow}>
        <span className={styles.productName}>{productName}</span>
        <span className={styles.priceCluster}>
          {isOfferExpired ? (
            <strong>{money(originalPrice, currencySymbol)}</strong>
          ) : (
            <>
              <span className={styles.originalPrice}>{money(originalPrice, currencySymbol)}</span>
              <strong>{money(discountedPrice, currencySymbol)}</strong>
            </>
          )}
        </span>
      </div>

      {!isOfferExpired && (
        <div className={styles.offerBanner}>
          <span className={styles.offerBadge} aria-label={`Discount: ${money(discountAmount, currencySymbol)} off`}>
            {money(discountAmount, currencySymbol)} OFF
          </span>
          <span className={styles.offerText}>{offerLabel} · {offerTerms}</span>
        </div>
      )}

      <div className={styles.summaryDivider} />

      <div className={styles.breakdownRows}>
        <div>
          <span>Delivery</span>
          <strong>{money(deliveryCharge, currencySymbol)}</strong>
        </div>
        <div>
          <span>COD charge (1%)</span>
          <strong>{money(codCharge, currencySymbol)}</strong>
        </div>
      </div>

      <div className={styles.totalRow}>
        <span>Total</span>
        <strong>{money(total, currencySymbol)}</strong>
      </div>
    </section>
  );
}

export default OrderSummaryCard;
