export function customerMinimum(orderClass?: number | null) {
  return orderClass === 1 ? 5000 : orderClass === 2 ? 10000 : orderClass === 3 ? 1000 : 0;
}
