import { addItem, getItem, updateItem, getItemsByCode, buildNestedJSON, getAllItemsFlat, getCompleteItemTree } from "./tracker";
import { v4 as uuidv4 } from 'uuid';
import { parseBatchItem } from "./utils/batch-item";
import mockData from "./mock/data.json";

async function main() {
  const batchItems = parseBatchItem(mockData);
  console.log(batchItems);

  await batchAddItems(batchItems);
  

  // console.log("##### 아이템 추가 테스트 시작 #####");
  // console.log(`1. 아이템 추가(${sampleItem.lot}) 트랜잭션 실행`);
  // const tx = await addItem(sampleItem);
  // console.log("2. 아이템 추가 트랜잭션 완료: ", tx.hash);

  // console.log("#####아이템 조회 테스트 시작#####");
  // console.log(`3. 아이템 조회 (${sampleItem.lot})`);
  // const item = await getItem(sampleItem.lot);
  // console.log("4. 아이템 조회 완료:", item);

  // console.log("#####아이템 업데이트 테스트 시작#####");
  // console.log(`4. 아이템 업데이트 (${sampleItem.lot})`);
  // await updateItem(sampleItem.lot, 1200, "box", "20230101_20231231", "NEWCODE", "업데이트된 김치");
  // console.log("5. 코드별 아이템 조회");
  // const items = await getItemsByCode(sampleItem.itemCode);
  // console.log("6. 코드별 아이템 조회 완료:", items);

  // console.log("##### 트리 구조 변환 테스트 시작 #####");
  // const rootItem = await getCompleteItemTree(sampleItem.lot);
  // console.log("7. 트리 구조 변환 완료:", rootItem);
  // const nestedJSON = buildNestedJSON(rootItem);
  // console.log("8. 트리 구조 변환 완료:", nestedJSON);
}

main().catch(console.error);
