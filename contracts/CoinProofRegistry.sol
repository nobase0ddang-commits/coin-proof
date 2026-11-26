// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title CoinProofRegistry
/// @notice 요약 증명서의 지문(SHA-256)만 기록한다. 거래 내역·금액·주소는 체인에 올리지 않는다.
/// 시연 앱은 계약 없이 "자기 자신에게 0 ETH + data" 거래로도 기록할 수 있고,
/// 정식 버전에서는 이 계약으로 발급자·시각을 조회 가능하게 한다.
contract CoinProofRegistry {
    struct Record { address issuer; uint64 timestamp; }
    mapping(bytes32 => Record) public records;

    event Recorded(bytes32 indexed certHash, address indexed issuer, uint64 timestamp);

    function record(bytes32 certHash) external {
        require(records[certHash].timestamp == 0, "already recorded");
        records[certHash] = Record(msg.sender, uint64(block.timestamp));
        emit Recorded(certHash, msg.sender, uint64(block.timestamp));
    }

    function verify(bytes32 certHash) external view returns (bool exists, address issuer, uint64 timestamp) {
        Record memory r = records[certHash];
        return (r.timestamp != 0, r.issuer, r.timestamp);
    }
}
