// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "@semaphore-protocol/contracts/interfaces/ISemaphore.sol";

interface ICourseRegistryVerifier {
    function isValidCourse(uint256 groupId) external view returns (bool);
}

contract CredentialVerifier {
    ISemaphore public semaphore;
    ICourseRegistryVerifier public courseRegistry;

    mapping(uint256 => bool) public usedNullifiers;

    event CredentialVerified(uint256 indexed groupId, uint256 indexed nullifier, uint256 message, bool valid);

    constructor(address semaphoreAddress, address courseRegistryAddress) {
        require(semaphoreAddress != address(0), "Zero semaphore address");
        require(courseRegistryAddress != address(0), "Zero registry address");
        semaphore = ISemaphore(semaphoreAddress);
        courseRegistry = ICourseRegistryVerifier(courseRegistryAddress);
    }

    function verifyCredential(ISemaphore.SemaphoreProof calldata proof, uint256 groupId) external returns (bool) {
        require(courseRegistry.isValidCourse(groupId), "Invalid course");
        require(!usedNullifiers[proof.nullifier], "Nullifier already used");

        semaphore.validateProof(groupId, proof);

        usedNullifiers[proof.nullifier] = true;
        
        emit CredentialVerified(groupId, proof.nullifier, proof.message, true);
        return true;
    }

    function isNullifierUsed(uint256 nullifier) external view returns (bool) {
        return usedNullifiers[nullifier];
    }
}
