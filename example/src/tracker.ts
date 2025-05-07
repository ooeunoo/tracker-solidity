import { ethers } from "ethers";
import * as dotenv from "dotenv";
import TrackerAbi from "./abi/Tracker.abi.json";

dotenv.config({ path: "../.env" });

const RPC_URL = process.env.RPC_URL as string;
const PRIVATE_KEY = process.env.PRIVATE_KEY as string;
const TRACKER_ADDRESS = process.env.TRACKER_ADDRESS as string;

console.log("######환경 변수 세팅##########");
console.log("RPC_URL: ", RPC_URL);
console.log("PRIVATE_KEY: ", PRIVATE_KEY);
console.log("TRACKER_ADDRESS: ", TRACKER_ADDRESS);
console.log("#########################");

const provider = new ethers.JsonRpcProvider(RPC_URL);
const signer = new ethers.Wallet(PRIVATE_KEY, provider);

const trackerContract = new ethers.Contract(TRACKER_ADDRESS, TrackerAbi, signer);

type ItemType = {
  lot: string;
  parentLot: string;
  itemCode: string;
  amount: number;
  per: string;
  type: string;
  externalLot: string;
  externalCode: string;
  itemName: string;
};

// 문자열 lot 값을 keccak256으로 변환
function toLotId(lot: string): string {
  return ethers.keccak256(ethers.toUtf8Bytes(lot));
}

// 아이템 추가 함수
export async function addItem(item: ItemType) {
  const tx = await trackerContract.addItem(
    item.lot,
    item.parentLot,
    item.itemCode,
    item.amount,
    item.per,
    item.type,
    item.externalLot,
    item.externalCode,
    item.itemName
  );
  await tx.wait();
  return tx;
}

// 아이템 조회
export async function getItem(lot: string) {
  const lotId = toLotId(lot);
  const item = await trackerContract.getItem(lotId);
  console.log(`아이템 ${lot} 조회 결과:`, item);
  return item;
}

// 아이템 업데이트
export async function updateItem(
  lot: string,
  amount: number,
  per: string,
  externalLot: string,
  externalCode: string,
  itemName: string
) {
  const lotId = toLotId(lot);
  const tx = await trackerContract.updateItem(
    lotId,
    amount,
    per,
    externalLot,
    externalCode,
    itemName
  );
  await tx.wait();
  console.log(`아이템 ${lot} 업데이트 완료`);
}

// 아이템 코드로 필터링
export async function getItemsByCode(itemCode: string) {
  const items = await trackerContract.getItemsByCode(itemCode);
  console.log(`${itemCode} 코드로 필터된 아이템 수:`, items.length);
  return items;
}

// 트리 구조 평면화
export async function getAllItemsFlat(lot: string) {
  const lotId = toLotId(lot);
  const flatItems = await trackerContract.getAllItemsFlat(lotId);
  return flatItems;
}

export async function getCompleteItemTree(lot: string) {
  const lotId = toLotId(lot);
  const treeItems = await trackerContract.getCompleteItemTree(lotId);
  return treeItems;
}

export function buildNestedJSON(treeItems: any) {
  // 먼저 모든 아이템을 맵에 저장
  const itemsMap: any = {};
  
  console.log("treeItems: ", treeItems);
  treeItems.forEach((item: any) => {
    itemsMap[item.lot] = {
      lot: item.lot,
      parentLot: item.parentLot,
      itemCode: item.itemCode,
      amount: item.amount.toString(),
      per: item.per,
      type: item.itemType, // 문자열 그대로 사용
      externalLot: item.externalLot,
      externalCode: item.externalCode,
      itemName: item.itemName,
      subItems: []
    };
  });
  
  // 루트 아이템 찾기
  let rootItem = null;
  for (const item of treeItems) {
    if (itemsMap[item.parentLot] === undefined || item.parentLot === ethers.ZeroHash) {
      rootItem = itemsMap[item.lot];
      break;
    }
  }
  
  // 부모-자식 관계 설정
  treeItems.forEach((item: any) => {
    if (itemsMap[item.parentLot] && item.lot !== rootItem.lot) {
      itemsMap[item.parentLot].subItems.push(itemsMap[item.lot]);
    }
  });
  
  return rootItem;
}
