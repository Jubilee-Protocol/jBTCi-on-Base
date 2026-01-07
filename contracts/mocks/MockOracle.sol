// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../JubileeVaultBTC.sol"; // For IPriceOracle interface

contract MockOracle is IPriceOracle {
    mapping(address => uint256) public prices;

    function getPrice(address token) external view override returns (uint256) {
        return prices[token];
    }

    function setPrice(address token, uint256 price) external {
        prices[token] = price;
    }

    // Mock staleness check - always false for simple testing
    function isPriceStale(address) external pure returns (bool) {
        return false;
    }
}
