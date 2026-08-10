// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@semaphore-protocol/contracts/interfaces/ISemaphore.sol";

interface ICourseRegistry {
    function addCourse(string calldata name, string calldata code, uint256 groupId, address university, bool isDegree) external;
    function isValidCourse(uint256 groupId) external view returns (bool);
    function linkCourseToDegree(uint256 degreeGroupId, uint256 courseGroupId) external;
}

contract CredentialIssuer is AccessControl {
    bytes32 public constant UNIVERSITY_ROLE = keccak256("UNIVERSITY_ROLE");

    struct UniversityInfo {
        string name;
        string metadata;
        bool approved;
        uint256 registeredAt;
    }

    ISemaphore public semaphore;
    ICourseRegistry public courseRegistry;

    mapping(address => UniversityInfo) public universities;
    mapping(uint256 => uint256) public credentialCount;
    mapping(uint256 => mapping(uint256 => bool)) public isRevoked;

    event RegistrationRequested(address indexed wallet, string name, string metadata);
    event UniversityApproved(address indexed wallet, string name);
    event CourseCreated(uint256 indexed groupId, string name, string code, address indexed university);
    event DegreeCreated(uint256 indexed groupId, string name, string code, address indexed university);
    event CredentialIssued(uint256 indexed groupId, uint256 indexed commitment, uint256 timestamp);
    event CredentialRevoked(uint256 indexed groupId, uint256 indexed commitment);
    event UniversityRejected(address indexed wallet);
    event UniversityRevoked(address indexed wallet);

    constructor(address semaphoreAddress, address courseRegistryAddress) {
        require(semaphoreAddress != address(0), "Zero semaphore address");
        require(courseRegistryAddress != address(0), "Zero registry address");
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        semaphore = ISemaphore(semaphoreAddress);
        courseRegistry = ICourseRegistry(courseRegistryAddress);
    }

    function requestRegistration(string calldata name, string calldata metadata) external {
        require(universities[msg.sender].registeredAt == 0, "Already registered");
        universities[msg.sender] = UniversityInfo({
            name: name,
            metadata: metadata,
            approved: false,
            registeredAt: block.timestamp
        });
        emit RegistrationRequested(msg.sender, name, metadata);
    }

    function approveUniversity(address wallet) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(universities[wallet].registeredAt != 0, "University not registered");
        require(!universities[wallet].approved, "University already approved");
        universities[wallet].approved = true;
        _grantRole(UNIVERSITY_ROLE, wallet);
        emit UniversityApproved(wallet, universities[wallet].name);
    }

    function rejectUniversity(address wallet) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(universities[wallet].registeredAt != 0, "University not registered");
        require(!universities[wallet].approved, "University already approved");
        universities[wallet].registeredAt = 0;
        emit UniversityRejected(wallet);
    }

    function revokeUniversity(address wallet) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(universities[wallet].approved, "University not approved");
        universities[wallet].approved = false;
        _revokeRole(UNIVERSITY_ROLE, wallet);
        emit UniversityRevoked(wallet);
    }

    /// @notice Create a standard course Semaphore group.
    function createCourse(string calldata name, string calldata code) external onlyRole(UNIVERSITY_ROLE) returns (uint256) {
        uint256 groupId = semaphore.createGroup(address(this));
        courseRegistry.addCourse(name, code, groupId, msg.sender, false);
        emit CourseCreated(groupId, name, code, msg.sender);
        return groupId;
    }

    /// @notice Create a degree Semaphore group (isDegree=true in registry).
    function createDegree(string calldata name, string calldata code) external onlyRole(UNIVERSITY_ROLE) returns (uint256) {
        uint256 groupId = semaphore.createGroup(address(this));
        courseRegistry.addCourse(name, code, groupId, msg.sender, true);
        emit DegreeCreated(groupId, name, code, msg.sender);
        return groupId;
    }

    /// @notice Link a course group to a degree group in the registry.
    function linkCourseToDegree(uint256 courseGroupId, uint256 degreeGroupId) external onlyRole(UNIVERSITY_ROLE) {
        courseRegistry.linkCourseToDegree(degreeGroupId, courseGroupId);
    }

    /// @notice Issue a credential (works for both course groups and degree groups).
    function issueCredential(uint256 groupId, uint256 commitment) external onlyRole(UNIVERSITY_ROLE) {
        require(courseRegistry.isValidCourse(groupId), "Invalid course or degree group");
        semaphore.addMember(groupId, commitment);
        credentialCount[groupId]++;
        emit CredentialIssued(groupId, commitment, block.timestamp);
    }

    function revokeCredential(uint256 groupId, uint256 commitment, uint256[] calldata proofSiblings) external onlyRole(UNIVERSITY_ROLE) {
        require(courseRegistry.isValidCourse(groupId), "Invalid course group");
        require(!isRevoked[groupId][commitment], "Already revoked");
        isRevoked[groupId][commitment] = true;
        semaphore.removeMember(groupId, commitment, proofSiblings);
        emit CredentialRevoked(groupId, commitment);
    }

    function isCredentialRevoked(uint256 groupId, uint256 commitment) external view returns (bool) {
        return isRevoked[groupId][commitment];
    }

    function getUniversity(address wallet) external view returns (UniversityInfo memory) {
        return universities[wallet];
    }

    function isUniversity(address wallet) external view returns (bool) {
        return universities[wallet].approved;
    }
}
