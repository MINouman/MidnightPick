"use client";

import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { IdentityCard } from "./IdentityCard";
import { OrderSummaryCard } from "./OrderSummaryCard";
import styles from "./PlaceOrderModal.module.css";

export type Address = {
  id: string;
  label?: string;
  line1: string;
  city: string;
  area: string;
};

export type PlaceOrderModalProps = {
  productName: string;
  originalPrice: number;
  discountedPrice: number;
  discountAmount: number;
  offerLabel: string;
  offerTerms: string;
  deliveryCharge: number;
  codCharge: number;
  confirmedPhone: string;
  userName: string;
  userInitials: string;
  savedAddresses: Address[];
  onChangePhone: () => void;
  onPlaceOrder: (address: Address) => void;
  isOfferExpired: boolean;
  onClose?: () => void;
};

const EMPTY_ADDRESS: Address = {
  id: "manual",
  line1: "",
  city: "",
  area: "",
};

export function PlaceOrderModal({
  productName,
  originalPrice,
  discountedPrice,
  discountAmount,
  offerLabel,
  offerTerms,
  deliveryCharge,
  codCharge,
  confirmedPhone,
  userName,
  userInitials,
  savedAddresses,
  onChangePhone,
  onPlaceOrder,
  isOfferExpired,
  onClose,
}: PlaceOrderModalProps) {
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [manualAddress, setManualAddress] = useState<Address>(EMPTY_ADDRESS);
  const total = (isOfferExpired ? originalPrice : discountedPrice) + deliveryCharge + codCharge;

  const selectedAddress = useMemo(
    () => savedAddresses.find(address => address.id === selectedAddressId) ?? manualAddress,
    [manualAddress, savedAddresses, selectedAddressId],
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onPlaceOrder(selectedAddress);
  };

  return (
    <div className={styles.overlay}>
      <section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <header className={styles.header}>
          <h2 id="modal-title">Place Order</h2>
          {onClose && <button type="button" aria-label="Close" onClick={onClose}>×</button>}
        </header>

        <form className={styles.body} onSubmit={handleSubmit}>
          <OrderSummaryCard
            productName={productName}
            originalPrice={originalPrice}
            discountedPrice={discountedPrice}
            discountAmount={discountAmount}
            offerLabel={offerLabel}
            offerTerms={offerTerms}
            deliveryCharge={deliveryCharge}
            codCharge={codCharge}
            isOfferExpired={isOfferExpired}
          />

          <IdentityCard
            confirmedPhone={confirmedPhone}
            userName={userName}
            userInitials={userInitials}
            onChangePhone={onChangePhone}
          />

          <section className={styles.addressSection}>
            <label className={styles.sectionLabel} htmlFor="saved-address">Delivery address</label>
            <select
              id="saved-address"
              value={selectedAddressId}
              onChange={event => setSelectedAddressId(event.target.value)}
              className={styles.control}
            >
              <option value="">Choose a saved address</option>
              {savedAddresses.map(address => (
                <option key={address.id} value={address.id}>
                  {address.label ? `${address.label} - ${address.line1}` : address.line1}
                </option>
              ))}
            </select>

            <button type="button" className={styles.addAddressButton}>+ Add new address</button>

            <div className={styles.addressGrid}>
              <input
                className={styles.control}
                placeholder="City"
                value={manualAddress.city}
                onChange={event => setManualAddress(address => ({ ...address, city: event.target.value }))}
              />
              <input
                className={styles.control}
                placeholder="Area"
                value={manualAddress.area}
                onChange={event => setManualAddress(address => ({ ...address, area: event.target.value }))}
              />
            </div>
            <input
              className={styles.control}
              placeholder="House no., road, block, building"
              value={manualAddress.line1}
              onChange={event => setManualAddress(address => ({ ...address, line1: event.target.value }))}
            />
          </section>

          <button className={styles.cta} type="submit" aria-label={`Place order for ৳${total.toLocaleString()}, cash on delivery`}>
            <svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M16.5 5.5 8.1 13.9 3.8 9.6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Place Order — ৳{total.toLocaleString()}
          </button>
          <p className={styles.note}>Cash on delivery · Delivery and 1% COD charge included</p>
        </form>
      </section>
    </div>
  );
}

export default PlaceOrderModal;
