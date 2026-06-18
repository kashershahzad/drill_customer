import { vs } from "./responsive";

export const TAB_BAR_BASE_HEIGHT = vs(90);
export const TAB_BAR_BORDER_HEIGHT = 40;

export function getTabBarContentPadding(
  bottomInset = 0,
  extra = vs(20),
): number {
  return TAB_BAR_BASE_HEIGHT + TAB_BAR_BORDER_HEIGHT + bottomInset + extra;
}
