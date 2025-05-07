export interface Item {
  lot: string;
  parentLot: string;
  itemCode: string;
  amount: number;
  per: string;
  type: string;
  externalLot: string;
  externalCode: string;
  itemName: string;
}

export interface ItemDetail {
  lot: string;
  parentLot: string;
  itemCode: string;
  amount: number;
  per: string;
  type: string;
  externalLot: string;
  externalCode: string;
  itemName: string;
  subItems?: ItemDetail[];
}