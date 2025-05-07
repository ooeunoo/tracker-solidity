// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

contract Tracker {
    // 아이템을 위한 메인 구조체 (ItemType을 string으로 변경)
    struct Item {
        bytes32 lot; // 아이템의 고유 식별자
        bytes32 parentLot; // 부모 아이템의 고유 식별자 (없을 경우 0)
        string itemCode; // 제품 코드
        uint256 amount; // 수량
        string per; // 단위 (ea, kg 등)
        string itemType; // 아이템 유형 (enum 대신 string으로 변경)
        string externalLot; // 외부 로트 정보
        string externalCode; // 외부 코드 정보
        string itemName; // 아이템 이름
        bytes32[] subItemIds; // 하위 아이템 ID 배열
        bytes32 nextItem; // 연결 리스트에서 다음 아이템 (탐색용)
        bytes32 prevItem; // 연결 리스트에서 이전 아이템 (탐색용)
    }

    // 트리 구조로 반환하기 위한 중간 데이터 구조체 (ItemType을 string으로 변경)
    struct ItemDetail {
        bytes32 lot;
        bytes32 parentLot;
        string itemCode;
        uint256 amount;
        string per;
        string itemType; // enum 대신 string으로 변경
        string externalLot;
        string externalCode;
        string itemName;
        bytes32[] childrenIds; // 직접적인 자식 아이템들의 ID 배열
    }

    // 데이터 저장을 위한 매핑
    mapping(bytes32 => Item) public items; // 모든 아이템의 메인 저장소
    mapping(string => bytes32[]) public itemsByCode; // 코드별로 아이템 필터링을 위한 매핑
    mapping(string => bytes32[]) public itemsByType; // 유형별로 아이템 필터링을 위한 매핑 (enum 대신 string 키 사용)

    // 각 itemCode에 대한 연결 리스트 추적
    mapping(string => bytes32) public headByItemCode; // 각 itemCode에 대한 첫 번째 아이템
    mapping(string => bytes32) public tailByItemCode; // 각 itemCode에 대한 마지막 아이템
    mapping(string => uint256) public countByItemCode; // 각 itemCode에 대한 아이템 수

    // 액션에 대한 이벤트
    event ItemAdded(bytes32 indexed lot, string indexed itemCode);
    event ItemUpdated(bytes32 indexed lot, string indexed itemCode);
    event SubItemAdded(bytes32 indexed parentLot, bytes32 indexed subItemLot);

    // 생성자
    constructor() {}

    // 문자열을 bytes32로 변환하는 함수
    function stringToBytes32(
        string memory source
    ) private pure returns (bytes32 result) {
        bytes memory tempEmptyStringTest = bytes(source);
        if (tempEmptyStringTest.length == 0) {
            return 0x0;
        }

        assembly {
            result := mload(add(source, 32))
        }
    }

    // 새 아이템 추가 (parentLot 매개변수 추가)
    function addItem(
        string memory _lot,
        string memory _parentLot, // 새로 추가된 매개변수: 부모 아이템의 lot
        string memory _itemCode,
        uint256 _amount,
        string memory _per,
        string memory _type, // 직접 string 타입으로 입력
        string memory _externalLot,
        string memory _externalCode,
        string memory _itemName
    ) public returns (bytes32) {
        // 문자열 lot을 bytes32로 변환
        bytes32 lotId = keccak256(abi.encodePacked(_lot));

        // 아이템이 이미 존재하는지 확인
        require(
            items[lotId].lot == bytes32(0),
            "Item with this lot ID already exists"
        );

        // 부모 lot을 bytes32로 변환 (비어있으면 0)
        bytes32 parentLotId = bytes(_parentLot).length > 0
            ? keccak256(abi.encodePacked(_parentLot))
            : bytes32(0);

        // 부모 아이템이 존재하는지 확인 (부모가 지정된 경우)
        if (parentLotId != bytes32(0)) {
            require(
                items[parentLotId].lot != bytes32(0),
                "Parent item does not exist"
            );
        }

        // 새 아이템 생성
        Item memory newItem = Item({
            lot: lotId,
            parentLot: parentLotId, // 부모 lot 설정
            itemCode: _itemCode,
            amount: _amount,
            per: _per,
            itemType: _type, // 직접 string 타입으로 저장
            externalLot: _externalLot,
            externalCode: _externalCode,
            itemName: _itemName,
            subItemIds: new bytes32[](0),
            nextItem: bytes32(0),
            prevItem: bytes32(0)
        });

        // 저장소에 추가
        items[lotId] = newItem;
        itemsByCode[_itemCode].push(lotId);
        itemsByType[_type].push(lotId); // string 키로 아이템 유형별 매핑

        // 연결 리스트 관리
        if (headByItemCode[_itemCode] == bytes32(0)) {
            // 이 itemCode에 대한 첫 번째 아이템
            headByItemCode[_itemCode] = lotId;
            tailByItemCode[_itemCode] = lotId;
        } else {
            // 연결 리스트 끝에 추가
            bytes32 currentTail = tailByItemCode[_itemCode];
            items[currentTail].nextItem = lotId;
            items[lotId].prevItem = currentTail;
            tailByItemCode[_itemCode] = lotId;
        }

        // 부모 아이템에 하위 아이템으로 추가 (부모가 있는 경우)
        if (parentLotId != bytes32(0)) {
            items[parentLotId].subItemIds.push(lotId);
            // 부모-자식 관계가 생성되었음을 알리는 이벤트
            emit SubItemAdded(parentLotId, lotId);
        }

        // 카운트 증가
        countByItemCode[_itemCode]++;

        // 이벤트 발생
        emit ItemAdded(lotId, _itemCode);

        return lotId;
    }

    // 부모 아이템에 하위 아이템 추가 (기존 함수는 호환성을 위해 유지)
    function addSubItem(bytes32 _parentLot, bytes32 _subItemLot) public {
        // 두 아이템이 모두 존재하는지 확인
        require(
            items[_parentLot].lot != bytes32(0),
            "Parent item does not exist"
        );
        require(
            items[_subItemLot].lot != bytes32(0),
            "Sub item does not exist"
        );

        // 부모에 하위 아이템 추가
        items[_parentLot].subItemIds.push(_subItemLot);

        // 하위 아이템의 parentLot 업데이트
        items[_subItemLot].parentLot = _parentLot;

        // 이벤트 발생
        emit SubItemAdded(_parentLot, _subItemLot);
    }

    // 기존 아이템 업데이트
    function updateItem(
        bytes32 _lot,
        uint256 _amount,
        string memory _per,
        string memory _externalLot,
        string memory _externalCode,
        string memory _itemName
    ) public {
        // 아이템이 존재하는지 확인
        require(items[_lot].lot != bytes32(0), "Item does not exist");

        // 아이템 필드 업데이트
        items[_lot].amount = _amount;
        items[_lot].per = _per;
        items[_lot].externalLot = _externalLot;
        items[_lot].externalCode = _externalCode;
        items[_lot].itemName = _itemName;

        // 이벤트 발생
        emit ItemUpdated(_lot, items[_lot].itemCode);
    }

    // lot ID로 아이템 조회
    function getItem(
        bytes32 _lot
    )
        public
        view
        returns (
            bytes32 lot,
            bytes32 parentLot, // 부모 아이템 반환 추가
            string memory itemCode,
            uint256 amount,
            string memory per,
            string memory itemType, // enum 대신 string 반환
            string memory externalLot,
            string memory externalCode,
            string memory itemName,
            uint256 subItemCount
        )
    {
        // 아이템이 존재하는지 확인
        require(items[_lot].lot != bytes32(0), "Item does not exist");

        Item storage item = items[_lot];

        return (
            item.lot,
            item.parentLot, // 부모 아이템 반환
            item.itemCode,
            item.amount,
            item.per,
            item.itemType, // string 타입 반환
            item.externalLot,
            item.externalCode,
            item.itemName,
            item.subItemIds.length
        );
    }

    // 부모로 직접 하위 아이템 조회
    function getChildrenByParent(
        bytes32 _parentLot
    ) public view returns (bytes32[] memory) {
        // 부모 아이템이 존재하는지 확인
        require(
            items[_parentLot].lot != bytes32(0),
            "Parent item does not exist"
        );

        return items[_parentLot].subItemIds;
    }

    // 아이템의 하위 아이템 조회 (기존 함수와 동일)
    function getSubItems(bytes32 _lot) public view returns (bytes32[] memory) {
        // 아이템이 존재하는지 확인
        require(items[_lot].lot != bytes32(0), "Item does not exist");

        return items[_lot].subItemIds;
    }

    // 아이템의 부모 조회
    function getParent(bytes32 _lot) public view returns (bytes32) {
        require(items[_lot].lot != bytes32(0), "Item does not exist");
        return items[_lot].parentLot;
    }

    // itemCode로 모든 아이템 조회
    function getItemsByCode(
        string memory _itemCode
    ) public view returns (bytes32[] memory) {
        return itemsByCode[_itemCode];
    }

    // 특정 유형의 모든 아이템 조회 (string 타입 사용)
    function getItemsByType(
        string memory _type
    ) public view returns (bytes32[] memory) {
        return itemsByType[_type];
    }

    // 특정 itemCode에 대한 연결 리스트의 아이템을 순회하는 헬퍼 함수
    function traverseItemsByCode(
        string memory _itemCode,
        uint256 _limit
    ) public view returns (bytes32[] memory lots, string[] memory itemNames) {
        bytes32 current = headByItemCode[_itemCode];
        uint256 count = countByItemCode[_itemCode];

        // 필요한 경우 반환할 아이템 수 제한
        if (_limit > 0 && _limit < count) {
            count = _limit;
        }

        lots = new bytes32[](count);
        itemNames = new string[](count);

        for (uint256 i = 0; i < count && current != bytes32(0); i++) {
            lots[i] = current;
            itemNames[i] = items[current].itemName;
            current = items[current].nextItem;
        }

        return (lots, itemNames);
    }

    // 전체 아이템 수를 재귀적으로 계산하는 헬퍼 함수
    function countItemsRecursive(bytes32 _lot) private view returns (uint256) {
        if (items[_lot].lot == bytes32(0)) {
            return 0;
        }

        uint256 count = 1; // 아이템 자체를 계산

        // 모든 하위 아이템을 재귀적으로 계산
        for (uint256 i = 0; i < items[_lot].subItemIds.length; i++) {
            count += countItemsRecursive(items[_lot].subItemIds[i]);
        }

        return count;
    }

    // 재귀적으로 모든 아이템을 평면 구조로 가져오는 고급 함수 (기존 함수)
    function getAllItemsFlat(
        bytes32 _rootLot
    ) public view returns (bytes32[] memory) {
        require(items[_rootLot].lot != bytes32(0), "Root item does not exist");

        // 전체 아이템 수 계산 (루트 + 모든 자손)
        uint256 totalItems = countItemsRecursive(_rootLot);

        bytes32[] memory result = new bytes32[](totalItems);
        uint256 index = 0;

        // 결과 배열을 재귀적으로 채우기
        populateFlatArray(_rootLot, result, index);

        return result;
    }

    // 평면 배열을 채우는 헬퍼 함수
    function populateFlatArray(
        bytes32 _lot,
        bytes32[] memory _result,
        uint256 _index
    ) private view returns (uint256) {
        if (items[_lot].lot == bytes32(0)) {
            return _index;
        }

        // 현재 아이템 추가
        _result[_index] = _lot;
        _index++;

        // 모든 하위 아이템을 재귀적으로 추가
        for (uint256 i = 0; i < items[_lot].subItemIds.length; i++) {
            _index = populateFlatArray(
                items[_lot].subItemIds[i],
                _result,
                _index
            );
        }

        return _index;
    }

    // 루트 아이템 ID로 전체 계층 트리 데이터 가져오기
    function getCompleteItemTree(
        bytes32 _rootLot
    ) public view returns (ItemDetail[] memory) {
        require(items[_rootLot].lot != bytes32(0), "Root item does not exist");

        // 전체 아이템 수 계산 (루트 + 모든 자손)
        uint256 totalItems = countItemsRecursive(_rootLot);

        // 모든 아이템 상세 정보를 담을 배열
        ItemDetail[] memory allItems = new ItemDetail[](totalItems);

        // 인덱스 초기화
        uint256 index = 0;

        // 재귀적으로 모든 아이템 정보 수집
        collectAllItems(_rootLot, allItems, index);

        return allItems;
    }

    // 재귀적으로 모든 아이템 정보를 수집하는 헬퍼 함수
    function collectAllItems(
        bytes32 _lot,
        ItemDetail[] memory _result,
        uint256 _index
    ) private view returns (uint256) {
        if (items[_lot].lot == bytes32(0)) {
            return _index;
        }

        // 현재 아이템
        Item storage item = items[_lot];

        // 현재 아이템의 상세 정보 추가
        _result[_index] = ItemDetail({
            lot: item.lot,
            parentLot: item.parentLot,
            itemCode: item.itemCode,
            amount: item.amount,
            per: item.per,
            itemType: item.itemType, // string 타입 사용
            externalLot: item.externalLot,
            externalCode: item.externalCode,
            itemName: item.itemName,
            childrenIds: item.subItemIds
        });

        uint256 currentIndex = _index;
        _index++;

        // 모든 하위 아이템을 재귀적으로 추가
        for (uint256 i = 0; i < item.subItemIds.length; i++) {
            _index = collectAllItems(item.subItemIds[i], _result, _index);
        }

        return _index;
    }

    // lot ID로 아이템과 모든 하위 아이템을 포함하는 트리 데이터 조회
    function getItemWithAllChildren(
        bytes32 _lot
    ) public view returns (ItemDetail[] memory) {
        // getCompleteItemTree 함수 재사용
        return getCompleteItemTree(_lot);
    }

    // itemCode와 일치하는 첫 번째 아이템을 기준으로 모든 아이템 및 하위 아이템 트리 데이터 조회
    function getItemTreeByCode(
        string memory _itemCode
    ) public view returns (ItemDetail[] memory) {
        bytes32[] memory topLevelItems = itemsByCode[_itemCode];

        if (topLevelItems.length == 0) {
            return new ItemDetail[](0);
        }

        // 첫 번째 아이템을 통해 모든 연결된 아이템 조회
        return getCompleteItemTree(topLevelItems[0]);
    }

    // 데이터 가져오기를 위한 일괄 추가 함수 (parentLot 매개변수 추가)
    function batchAddItems(
        string[] memory _lots,
        string[] memory _parentLots, // 새로 추가된 매개변수: 부모 lot 배열
        string[] memory _itemCodes,
        uint256[] memory _amounts,
        string[] memory _pers,
        string[] memory _types, // string 타입 배열
        string[] memory _externalLots,
        string[] memory _externalCodes,
        string[] memory _itemNames
    ) public {
        // 모든 배열의 길이가 같은지 확인
        require(
            _lots.length == _parentLots.length &&
                _lots.length == _itemCodes.length &&
                _lots.length == _amounts.length &&
                _lots.length == _pers.length &&
                _lots.length == _types.length &&
                _lots.length == _externalLots.length &&
                _lots.length == _externalCodes.length &&
                _lots.length == _itemNames.length,
            "All arrays must have the same length"
        );

        // 각 아이템 추가
        for (uint256 i = 0; i < _lots.length; i++) {
            addItem(
                _lots[i],
                _parentLots[i], // 부모 lot 전달
                _itemCodes[i],
                _amounts[i],
                _pers[i],
                _types[i], // string 타입 전달
                _externalLots[i],
                _externalCodes[i],
                _itemNames[i]
            );
        }
    }

    // 하위 아이템 일괄 추가 (기존 함수도 호환성을 위해 유지)
    function batchAddSubItems(
        bytes32[] memory _parentLots,
        bytes32[] memory _subItemLots
    ) public {
        // 두 배열의 길이가 같은지 확인
        require(
            _parentLots.length == _subItemLots.length,
            "Arrays must have the same length"
        );

        // 각 하위 아이템 추가
        for (uint256 i = 0; i < _parentLots.length; i++) {
            addSubItem(_parentLots[i], _subItemLots[i]);
        }
    }
}
