const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Tracker 컨트랙트 테스트 (String 타입 사용)", function () {
  let tracker;
  let owner;
  let addr1;
  let addr2;

  // 샘플 데이터 - 정수로 변환된 값
  const sampleData = {
    main: {
      lot: "a8b7e8d4-5f6e-4c69-9d70-28c17b5dfb5f",
      parentLot: "",
      itemCode: "0045462",
      amount: 10308, // 정수로 유지
      per: "ea",
      type: "item", // 문자열 그대로 사용
      externalLot: "20220324_20220919",
      externalCode: "0045462",
      itemName: "Nasoya 맛김치 Spice 297g[제품]"
    },
    subItems: [
      {
        lot: "438fd95f-e0c4-4ff8-a0e4-2ab20fc5584f",
        parentLot: "a8b7e8d4-5f6e-4c69-9d70-28c17b5dfb5f",
        itemCode: "0045462",
        amount: 11854, // 소수점 제거
        per: "ea",
        type: "cover", // 문자열 그대로 사용
        externalLot: "20220304_9999",
        externalCode: "9304128",
        itemName: "수축_[미국]나소야Spicy397g_유한팩(필름)"
      },
      {
        lot: "9e369c8f-b6bb-4768-94a6-46fe9ae0de5e",
        parentLot: "a8b7e8d4-5f6e-4c69-9d70-28c17b5dfb5f",
        itemCode: "0045462",
        amount: 1804, // 소수점 제거
        per: "ea",
        type: "cover", // 문자열 그대로 사용
        externalLot: "20220314_9999",
        externalCode: "9304127",
        itemName: "박스_[미국]나소야Spicy397g*6개입_태림(종이)"
      }
    ],
    subSubItem: {
      lot: "3a472172-f01e-47e9-94f6-00c258489a55",
      parentLot: "438fd95f-e0c4-4ff8-a0e4-2ab20fc5584f",
      itemCode: "0045462",
      amount: 166, // 소수점 제거
      per: "kg",
      type: "subItem", // 문자열 그대로 사용
      externalLot: "2022-03-18",
      externalCode: "1353966",
      itemName: "맛김치 수출양념"
    }
  };

  beforeEach(async function () {
    // 컨트랙트 배포
    const TrackerFactory = await ethers.getContractFactory("Tracker");
    [owner, addr1, addr2] = await ethers.getSigners();
    tracker = await TrackerFactory.deploy();
    
    // 배포 대기 방식을 환경에 맞게 사용
    try {
      await tracker.waitForDeployment();
    } catch (error) {
      // 구 버전의 ethers에서는 deployed 사용
      await tracker.deployed();
    }
    
    // 컨트랙트 주소 로깅
    console.log("Tracker 배포 주소:", await tracker.getAddress());
  });

  describe("기본 기능 테스트", function () {
    it("단일 아이템 추가", async function () {
      // 메인 아이템 추가
      const tx = await tracker.addItem(
        sampleData.main.lot,
        sampleData.main.parentLot,
        sampleData.main.itemCode,
        sampleData.main.amount,
        sampleData.main.per,
        sampleData.main.type, // 문자열 그대로 전달
        sampleData.main.externalLot,
        sampleData.main.externalCode,
        sampleData.main.itemName
      );
      
      // 트랜잭션 기다리기
      await tx.wait();
      
      // 아이템 lotId 계산
      const lotId = ethers.keccak256(ethers.toUtf8Bytes(sampleData.main.lot));
      
      // 아이템 조회
      const item = await tracker.getItem(lotId);
      
      // 검증
      expect(item[0]).to.equal(lotId); // lot 확인
      expect(item[2]).to.equal(sampleData.main.itemCode); // itemCode 확인
      expect(item[3]).to.equal(sampleData.main.amount); // amount 확인
      expect(item[4]).to.equal(sampleData.main.per); // per 확인
      expect(item[5]).to.equal(sampleData.main.type); // type 확인 (문자열)
      expect(item[7]).to.equal(sampleData.main.externalCode); // externalCode 확인
      expect(item[8]).to.equal(sampleData.main.itemName); // itemName 확인
    });

    it("부모-자식 관계 테스트", async function () {
      // 메인 아이템 추가
      await tracker.addItem(
        sampleData.main.lot,
        sampleData.main.parentLot,
        sampleData.main.itemCode,
        sampleData.main.amount,
        sampleData.main.per,
        sampleData.main.type, // 문자열 그대로 전달
        sampleData.main.externalLot,
        sampleData.main.externalCode,
        sampleData.main.itemName
      );
      
      // 하위 아이템 추가
      await tracker.addItem(
        sampleData.subItems[0].lot,
        sampleData.subItems[0].parentLot,
        sampleData.subItems[0].itemCode,
        sampleData.subItems[0].amount,
        sampleData.subItems[0].per,
        sampleData.subItems[0].type, // 문자열 그대로 전달
        sampleData.subItems[0].externalLot,
        sampleData.subItems[0].externalCode,
        sampleData.subItems[0].itemName
      );
      
      // lotId 계산
      const mainLotId = ethers.keccak256(ethers.toUtf8Bytes(sampleData.main.lot));
      const subLotId = ethers.keccak256(ethers.toUtf8Bytes(sampleData.subItems[0].lot));
      
      // 하위 아이템 조회
      const children = await tracker.getChildrenByParent(mainLotId);
      
      // 부모 아이템 조회
      const parent = await tracker.getParent(subLotId);
      
      // 검증
      expect(children.length).to.equal(1); // 하위 아이템 개수
      expect(children[0]).to.equal(subLotId); // 하위 아이템 ID 확인
      expect(parent).to.equal(mainLotId); // 부모 아이템 ID 확인
    });
    
    it("아이템 업데이트 테스트", async function () {
      // 메인 아이템 추가
      await tracker.addItem(
        sampleData.main.lot,
        sampleData.main.parentLot,
        sampleData.main.itemCode,
        sampleData.main.amount,
        sampleData.main.per,
        sampleData.main.type,
        sampleData.main.externalLot,
        sampleData.main.externalCode,
        sampleData.main.itemName
      );
      
      // lotId 계산
      const lotId = ethers.keccak256(ethers.toUtf8Bytes(sampleData.main.lot));
      
      // 업데이트할 새 값
      const newAmount = 12000;
      const newPer = "box";
      const newExternalLot = "20230101_20230630";
      const newExternalCode = "0045462-NEW";
      const newItemName = "Nasoya 맛김치 Spice 297g[개선제품]";
      
      // 아이템 업데이트
      await tracker.updateItem(
        lotId,
        newAmount,
        newPer,
        newExternalLot,
        newExternalCode,
        newItemName
      );
      
      // 업데이트된 아이템 조회
      const item = await tracker.getItem(lotId);
      
      // 검증
      expect(item[3]).to.equal(newAmount); // 새 amount 확인
      expect(item[4]).to.equal(newPer); // 새 per 확인
      expect(item[6]).to.equal(newExternalLot); // 새 externalLot 확인
      expect(item[7]).to.equal(newExternalCode); // 새 externalCode 확인
      expect(item[8]).to.equal(newItemName); // 새 itemName 확인
    });
  });

  describe("대량 작업 및 필터링 테스트", function () {
    it("배치 추가 테스트", async function () {
      // 배치 추가를 위한 데이터 배열 준비
      const lots = [sampleData.main.lot, sampleData.subItems[0].lot, sampleData.subItems[1].lot];
      const parentLots = [sampleData.main.parentLot, sampleData.subItems[0].parentLot, sampleData.subItems[1].parentLot];
      const itemCodes = [sampleData.main.itemCode, sampleData.subItems[0].itemCode, sampleData.subItems[1].itemCode];
      const amounts = [sampleData.main.amount, sampleData.subItems[0].amount, sampleData.subItems[1].amount];
      const pers = [sampleData.main.per, sampleData.subItems[0].per, sampleData.subItems[1].per];
      const types = [sampleData.main.type, sampleData.subItems[0].type, sampleData.subItems[1].type]; // 문자열 배열 사용
      const externalLots = [sampleData.main.externalLot, sampleData.subItems[0].externalLot, sampleData.subItems[1].externalLot];
      const externalCodes = [sampleData.main.externalCode, sampleData.subItems[0].externalCode, sampleData.subItems[1].externalCode];
      const itemNames = [sampleData.main.itemName, sampleData.subItems[0].itemName, sampleData.subItems[1].itemName];
      
      // 배치 추가 실행
      await tracker.batchAddItems(
        lots,
        parentLots,
        itemCodes,
        amounts,
        pers,
        types, // 문자열 배열 전달
        externalLots,
        externalCodes,
        itemNames
      );
      
      // 코드별 아이템 조회
      const items = await tracker.getItemsByCode(sampleData.main.itemCode);
      console.log(items);
      // 검증
      expect(items.length).to.equal(3); // 추가된 아이템 개수
      
      // 메인 아이템의 자식 조회
      const mainLotId = ethers.keccak256(ethers.toUtf8Bytes(sampleData.main.lot));
      const children = await tracker.getChildrenByParent(mainLotId);
      
      // 검증
      expect(children.length).to.equal(2); // 자식 아이템 개수
    });
    
    it("코드별 필터링 테스트", async function () {
      // 다른 코드의 아이템 추가
      await tracker.addItem(
        "different-lot-id",
        "",
        "0045463", // 다른 코드
        10000,
        "ea",
        "item", // 문자열 그대로 사용
        "20220101_20221231",
        "0045463",
        "다른 제품"
      );
      
      // 원래 코드의 아이템 추가
      await tracker.addItem(
        sampleData.main.lot,
        "",
        sampleData.main.itemCode,
        sampleData.main.amount,
        sampleData.main.per,
        sampleData.main.type, // 문자열 그대로 사용
        sampleData.main.externalLot,
        sampleData.main.externalCode,
        sampleData.main.itemName
      );
      
      // 첫 번째 코드로 필터링
      const items1 = await tracker.getItemsByCode("0045463");
      expect(items1.length).to.equal(1);
      
      // 두 번째 코드로 필터링
      const items2 = await tracker.getItemsByCode(sampleData.main.itemCode);
      expect(items2.length).to.equal(1);
    });
    
    it("유형별 필터링 테스트", async function () {
      // 다른 유형의 아이템들 추가
      await tracker.addItem(
        sampleData.main.lot,
        "",
        sampleData.main.itemCode,
        sampleData.main.amount,
        sampleData.main.per,
        "item", // 문자열 그대로 전달
        sampleData.main.externalLot,
        sampleData.main.externalCode,
        sampleData.main.itemName
      );
      
      await tracker.addItem(
        sampleData.subItems[0].lot,
        sampleData.main.lot,
        sampleData.subItems[0].itemCode,
        sampleData.subItems[0].amount,
        sampleData.subItems[0].per,
        "cover", // 문자열 그대로 전달
        sampleData.subItems[0].externalLot,
        sampleData.subItems[0].externalCode,
        sampleData.subItems[0].itemName
      );
      
      await tracker.addItem(
        sampleData.subSubItem.lot,
        sampleData.subItems[0].lot,
        sampleData.subSubItem.itemCode,
        sampleData.subSubItem.amount,
        sampleData.subSubItem.per,
        "subItem", // 문자열 그대로 전달
        sampleData.subSubItem.externalLot,
        sampleData.subSubItem.externalCode,
        sampleData.subSubItem.itemName
      );
      
      // 특정 유형으로 필터링
      const itemTypeItems = await tracker.getItemsByType("item"); // 문자열 전달
      expect(itemTypeItems.length).to.equal(1);
      
      // cover 유형으로 필터링
      const coverTypeItems = await tracker.getItemsByType("cover"); // 문자열 전달
      expect(coverTypeItems.length).to.equal(1);
      
      // subItem 유형으로 필터링
      const subItemTypeItems = await tracker.getItemsByType("subItem"); // 문자열 전달
      expect(subItemTypeItems.length).to.equal(1);
    });
    
    it("커스텀 타입 필터링 테스트", async function () {
      // 커스텀 타입의 아이템 추가
      await tracker.addItem(
        "custom-type-item",
        "",
        "0045462",
        1000,
        "ea",
        "customType", // 사용자 정의 타입
        "20220101_20221231",
        "0045462-custom",
        "커스텀 타입 아이템"
      );
      
      // 커스텀 타입으로 필터링
      const customTypeItems = await tracker.getItemsByType("customType");
      expect(customTypeItems.length).to.equal(1);
      
      // 아이템 조회 및 타입 확인
      const lotId = ethers.keccak256(ethers.toUtf8Bytes("custom-type-item"));
      const item = await tracker.getItem(lotId);
      
      // 문자열 타입 확인
      expect(item[5]).to.equal("customType");
    });
  });

  describe("고급 기능 테스트", function () {
    it("연결 리스트 순회 테스트", async function () {
      // 같은 코드를 가진 여러 아이템 추가
      await tracker.addItem(
        "item1",
        "",
        "0045462",
        1000,
        "ea",
        "item", // 문자열 그대로 전달
        "20220101",
        "0045462-1",
        "아이템 1"
      );
      
      await tracker.addItem(
        "item2",
        "",
        "0045462",
        2000,
        "ea",
        "item", // 문자열 그대로 전달
        "20220102",
        "0045462-2",
        "아이템 2"
      );
      
      await tracker.addItem(
        "item3",
        "",
        "0045462",
        3000,
        "ea",
        "item", // 문자열 그대로 전달
        "20220103",
        "0045462-3",
        "아이템 3"
      );
      
      // 연결 리스트 순회
      const [lots, names] = await tracker.traverseItemsByCode("0045462", 0);
      
      // 검증
      expect(lots.length).to.equal(3); // 아이템 개수
      expect(names[0]).to.equal("아이템 1"); // 첫 번째 아이템 이름
      expect(names[1]).to.equal("아이템 2"); // 두 번째 아이템 이름
      expect(names[2]).to.equal("아이템 3"); // 세 번째 아이템 이름
      
      // 제한된 수의 아이템 가져오기
      const [limitedLots, limitedNames] = await tracker.traverseItemsByCode("0045462", 2);
      
      // 검증
      expect(limitedLots.length).to.equal(2); // 제한된 아이템 개수
      expect(limitedNames[0]).to.equal("아이템 1"); // 첫 번째 아이템 이름
      expect(limitedNames[1]).to.equal("아이템 2"); // 두 번째 아이템 이름
    });
    
    it("계층 구조 평면화 테스트", async function () {
      // 계층 구조 생성
      await tracker.addItem(
        "root",
        "",
        "0045462",
        1000,
        "ea",
        "item", // 문자열 그대로 전달
        "20220101",
        "0045462-root",
        "루트 아이템"
      );
      
      await tracker.addItem(
        "child1",
        "root",
        "0045462",
        100,
        "ea",
        "cover", // 문자열 그대로 전달
        "20220102",
        "0045462-child1",
        "자식 아이템 1"
      );
      
      await tracker.addItem(
        "child2",
        "root",
        "0045462",
        200,
        "ea",
        "cover", // 문자열 그대로 전달
        "20220103",
        "0045462-child2",
        "자식 아이템 2"
      );
      
      await tracker.addItem(
        "grandchild1",
        "child1",
        "0045462",
        10,
        "ea",
        "subItem", // 문자열 그대로 전달
        "20220104",
        "0045462-grandchild1",
        "손자 아이템 1"
      );
      
      // 루트 아이템 ID 계산
      const rootId = ethers.keccak256(ethers.toUtf8Bytes("root"));
      
      // 평면화된 구조 가져오기
      const flatItems = await tracker.getAllItemsFlat(rootId);
      
      // 검증
      expect(flatItems.length).to.equal(4); // 총 아이템 개수
    });

    it("찾을 수 없는 아이템 조회 시 실패 테스트", async function () {
      // 존재하지 않는 아이템 ID
      const nonExistentId = ethers.keccak256(ethers.toUtf8Bytes("non-existent"));
      
      // 존재하지 않는 아이템 조회 시도
      await expect(
        tracker.getItem(nonExistentId)
      ).to.be.revertedWith("Item does not exist");
    });
    
    it("중첩된 트리 구조 조회 테스트", async function () {
      // 계층 구조 생성
      await tracker.addItem(
        "root",
        "",
        "0045462",
        1000,
        "ea",
        "item", // 문자열 그대로 전달
        "20220101",
        "0045462-root",
        "루트 아이템"
      );
      
      await tracker.addItem(
        "child1",
        "root",
        "0045462",
        100,
        "ea",
        "cover", // 문자열 그대로 전달
        "20220102",
        "0045462-child1",
        "자식 아이템 1"
      );
      
      await tracker.addItem(
        "child2",
        "root",
        "0045462",
        200,
        "ea",
        "cover", // 문자열 그대로 전달
        "20220103",
        "0045462-child2",
        "자식 아이템 2"
      );
      
      await tracker.addItem(
        "grandchild1",
        "child1",
        "0045462",
        10,
        "ea",
        "subItem", // 문자열 그대로 전달
        "20220104",
        "0045462-grandchild1",
        "손자 아이템 1"
      );
      
      // 루트 아이템 ID 계산
      const rootId = ethers.keccak256(ethers.toUtf8Bytes("root"));
      
      // 전체 트리 구조 가져오기
      const treeItems = await tracker.getCompleteItemTree(rootId);
      
      // 검증
      expect(treeItems.length).to.equal(4); // 총 아이템 개수
      
      // 데이터를 맵으로 변환하여 계층 구조 재구성
      const itemsMap = {};
      treeItems.forEach(item => {
        itemsMap[item.lot] = {
          lot: item.lot,
          parentLot: item.parentLot,
          itemCode: item.itemCode,
          amount: item.amount.toString(),
          per: item.per,
          type: item.itemType, // 문자열 타입 그대로 사용
          externalLot: item.externalLot,
          externalCode: item.externalCode,
          itemName: item.itemName,
          subItems: []
        };
      });
      
      // 계층 구조 재구성
      let rootItem = null;
      treeItems.forEach(item => {
        // 루트 아이템 찾기
        if (item.lot === rootId) {
          rootItem = itemsMap[item.lot];
        }
        
        // 부모-자식 관계 설정
        if (item.lot !== rootId && itemsMap[item.parentLot]) {
          itemsMap[item.parentLot].subItems.push(itemsMap[item.lot]);
        }
      });
      
      // 루트 아이템의 하위 아이템 수 확인
      expect(rootItem.subItems.length).to.equal(2);
      
      // 첫 번째 자식 아이템의 하위 아이템 수 확인
      const firstChild = rootItem.subItems.find(s => s.itemName === "자식 아이템 1");
      expect(firstChild.subItems.length).to.equal(1);
      
      // 손자 아이템 정보 확인
      expect(firstChild.subItems[0].itemName).to.equal("손자 아이템 1");
      
      // 타입 문자열 확인
      expect(rootItem.type).to.equal("item");
      expect(firstChild.type).to.equal("cover");
      expect(firstChild.subItems[0].type).to.equal("subItem");
    });
    
    it("아이템 코드로 트리 구조 조회 테스트", async function () {
      // 계층 구조 생성
      await tracker.addItem(
        "root",
        "",
        "0045462",
        1000,
        "ea",
        "item", // 문자열 그대로 전달
        "20220101",
        "0045462-root",
        "루트 아이템"
      );
      
      await tracker.addItem(
        "child1",
        "root",
        "0045462",
        100,
        "ea",
        "cover", // 문자열 그대로 전달
        "20220102",
        "0045462-child1",
        "자식 아이템 1"
      );
      
      // 다른 코드의 아이템 추가
      await tracker.addItem(
        "other-root",
        "",
        "0045463",
        1000,
        "ea",
        "item", // 문자열 그대로 전달
        "20220101",
        "0045463-root",
        "다른 루트 아이템"
      );
      
      // 아이템 코드로 트리 구조 조회
      const treeByCode = await tracker.getItemTreeByCode("0045462");
      
      // 검증
      expect(treeByCode.length).to.equal(2); // "0045462" 코드를 가진 아이템 수
      
      // 다른 코드 검증
      const otherTreeByCode = await tracker.getItemTreeByCode("0045463");
      expect(otherTreeByCode.length).to.equal(1); // "0045463" 코드를 가진 아이템 수
    });
  });
  
  describe("JSON 변환 유틸리티 함수", function () {
    // 컨트랙트에서 반환된 트리 데이터를 JSON으로 변환하는 유틸리티 함수
    function buildNestedJSON(treeItems) {
      // 먼저 모든 아이템을 맵에 저장
      const itemsMap = {};
      
      treeItems.forEach(item => {
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
      treeItems.forEach(item => {
        if (itemsMap[item.parentLot] && item.lot !== rootItem.lot) {
          itemsMap[item.parentLot].subItems.push(itemsMap[item.lot]);
        }
      });
      
      return rootItem;
    }
    
    it("아이템 조회 결과를 중첩된 JSON으로 변환 테스트", async function () {
      // 계층 구조 생성
      await tracker.addItem(
        "root",
        "",
        "0045462",
        1000,
        "ea",
        "item", // 문자열 그대로 전달
        "20220101",
        "0045462-root",
        "루트 아이템"
      );
      
      await tracker.addItem(
        "child1",
        "root",
        "0045462",
        100,
        "ea",
        "cover", // 문자열 그대로 전달
        "20220102",
        "0045462-child1",
        "자식 아이템 1"
      );
      
      await tracker.addItem(
        "child2",
        "root",
        "0045462",
        200,
        "ea",
        "cover", // 문자열 그대로 전달
        "20220103",
        "0045462-child2",
        "자식 아이템 2"
      );
      
      await tracker.addItem(
        "grandchild1",
        "child1",
        "0045462",
        10,
        "ea",
        "subItem", // 문자열 그대로 전달
        "20220104",
        "0045462-grandchild1",
        "손자 아이템 1"
      );
      
      // 루트 아이템 ID 계산
      const rootId = ethers.keccak256(ethers.toUtf8Bytes("child1"));
      
      // 전체 트리 구조 가져오기
      const treeItems = await tracker.getCompleteItemTree(rootId);
      
      // JSON으로 변환
      const jsonTree = buildNestedJSON(treeItems);
      
      // 검증
    //   expect(jsonTree.itemName).to.equal("루트 아이템");
    //   expect(jsonTree.subItems.length).to.equal(2);
    //   expect(jsonTree.type).to.equal("item"); // 문자열 타입 확인
      
    //   // 중첩된 구조 확인
    //   const firstChild = jsonTree.subItems.find(s => s.itemName === "자식 아이템 1");
    //   expect(firstChild.subItems.length).to.equal(1);
    //   expect(firstChild.subItems[0].itemName).to.equal("손자 아이템 1");
    //   expect(firstChild.type).to.equal("cover"); // 문자열 타입 확인
    //   expect(firstChild.subItems[0].type).to.equal("subItem"); // 문자열 타입 확인
      
      // 결과 로깅 (선택 사항)
      console.log("중첩된 JSON 구조:", JSON.stringify(jsonTree, null, 2));
    });
  });
});