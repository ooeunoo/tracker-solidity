import { Item, ItemDetail } from "../interfaces/item";

export function parseBatchItem(item: ItemDetail): Item[] {
  const result: Item[] = [];

  function flatten(current: ItemDetail, parentLot: string = "") {
    // 현재 항목을 flat 형태로 추가
    result.push({
      lot: current.lot,
      parentLot: parentLot, // 전달받은 상위 lot 사용
      itemCode: current.itemCode,
      amount: current.amount,
      per: current.per,
      type: current.type,
      externalLot: current.externalLot,
      externalCode: current.externalCode,
      itemName: current.itemName
    });

    // 재귀적으로 하위 항목 처리
    if (current.subItems && current.subItems.length > 0) {
      for (const sub of current.subItems) {
        flatten(sub, current.lot);
      }
    }
  }

  flatten(item);
  return result;
}
