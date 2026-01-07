// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockChainlinkOracle {
    int256 public price;
    uint8 public decimalsVal;

    constructor(int256 _initialPrice, uint8 _decimals) {
        price = _initialPrice;
        decimalsVal = _decimals;
    }

    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        return (
            1, // roundId
            price, // answer
            block.timestamp, // startedAt
            block.timestamp, // updatedAt
            1 // answeredInRound
        );
    }

    function decimals() external view returns (uint8) {
        return decimalsVal;
    }

    // Helper to update price
    function setPrice(int256 _price) external {
        price = _price;
    }
}
