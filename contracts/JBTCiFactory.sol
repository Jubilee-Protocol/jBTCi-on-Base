// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.24;

/**
 * @title JBTCiFactory
 * @notice Factory contract to deploy YearnJBTCiStrategy using CREATE2
 * @dev This bypasses estimateGas size checks by deploying via factory
 */
contract JBTCiFactory {
    event StrategyDeployed(address indexed strategy, bytes32 salt);

    /**
     * @notice Deploy YearnJBTCiStrategy with deterministic address
     * @param bytecode The full contract bytecode including constructor args
     * @param salt Unique salt for deterministic address
     */
    function deploy(
        bytes memory bytecode,
        bytes32 salt
    ) external returns (address strategy) {
        assembly {
            strategy := create2(0, add(bytecode, 0x20), mload(bytecode), salt)
            if iszero(extcodesize(strategy)) {
                revert(0, 0)
            }
        }
        emit StrategyDeployed(strategy, salt);
    }

    /**
     * @notice Compute the address where a contract will be deployed
     */
    function computeAddress(
        bytes memory bytecode,
        bytes32 salt
    ) external view returns (address) {
        bytes32 hash = keccak256(
            abi.encodePacked(
                bytes1(0xff),
                address(this),
                salt,
                keccak256(bytecode)
            )
        );
        return address(uint160(uint256(hash)));
    }
}
