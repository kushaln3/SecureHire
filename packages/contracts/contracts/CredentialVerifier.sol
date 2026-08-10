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

    /// @notice Verify a batch of proofs. Returns an array of booleans — does NOT revert on partial failure.
    function verifyBatch(
        ISemaphore.SemaphoreProof[] calldata proofs,
        uint256[] calldata groupIds
    ) external returns (bool[] memory results) {
        require(proofs.length == groupIds.length, "Length mismatch");
        require(proofs.length > 0, "Empty batch");

        results = new bool[](proofs.length);

        for (uint256 i = 0; i < proofs.length; i++) {
            // Skip invalid course
            if (!courseRegistry.isValidCourse(groupIds[i])) {
                results[i] = false;
                continue;
            }
            // Skip already-used nullifier
            if (usedNullifiers[proofs[i].nullifier]) {
                results[i] = false;
                continue;
            }
            // Try proof validation — catch any revert from Semaphore
            try semaphore.validateProof(groupIds[i], proofs[i]) {
                usedNullifiers[proofs[i].nullifier] = true;
                emit CredentialVerified(groupIds[i], proofs[i].nullifier, proofs[i].message, true);
                results[i] = true;
            } catch {
                results[i] = false;
            }
        }
        return results;
    }

    function isNullifierUsed(uint256 nullifier) external view returns (bool) {
        return usedNullifiers[nullifier];
    }
}
