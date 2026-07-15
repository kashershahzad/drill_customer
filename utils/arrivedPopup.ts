/** While popup is open — blocks duplicate opens from the same push. */
const claimedOrderIds = new Set<string>();
/** After user confirms arrived — never show again for this order. */
const confirmedOrderIds = new Set<string>();

export const claimArrivedPopup = (orderId: string): boolean => {
  const id = String(orderId || "").trim();
  if (!id) return false;
  if (confirmedOrderIds.has(id)) return false;
  if (claimedOrderIds.has(id)) return false;
  claimedOrderIds.add(id);
  return true;
};

export const hasClaimedArrivedPopup = (orderId: string): boolean => {
  const id = String(orderId || "").trim();
  return Boolean(
    id && (claimedOrderIds.has(id) || confirmedOrderIds.has(id)),
  );
};

/** "Not yet" — allow the next arrived push to open the popup again. */
export const releaseArrivedPopup = (orderId: string) => {
  const id = String(orderId || "").trim();
  if (id) claimedOrderIds.delete(id);
};

/** User confirmed arrived — do not show this order's arrived popup again. */
export const confirmArrivedPopup = (orderId: string) => {
  const id = String(orderId || "").trim();
  if (!id) return;
  claimedOrderIds.add(id);
  confirmedOrderIds.add(id);
};
