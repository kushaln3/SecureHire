// RPC URL for read-only provider calls
export const RPC_URL = process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com';

// Contract addresses - updated after deployment
export const CONTRACTS = {
  semaphore: '0x8A1fd199516489B0Fb7153EB5f075cDAC83c693D' as `0x${string}`,
  courseRegistry: (process.env.NEXT_PUBLIC_COURSE_REGISTRY_ADDRESS || '0x8895d0401384Dffd60E53df362D3f422e2A0bF23') as `0x${string}`,
  credentialIssuer: (process.env.NEXT_PUBLIC_CREDENTIAL_ISSUER_ADDRESS || '0x9499153dDf0bD0c8A6F173d0bD4cF0780183e85D') as `0x${string}`,
  credentialVerifier: (process.env.NEXT_PUBLIC_CREDENTIAL_VERIFIER_ADDRESS || '0xAAe96283690450E6a869e2a44aAb4a04Cf453605') as `0x${string}`,
} as const;

import { ethers } from 'ethers';

export const UNIVERSITY_ROLE = ethers.keccak256(ethers.toUtf8Bytes("UNIVERSITY_ROLE"));
// Correct: UNIVERSITY_ROLE = keccak256("UNIVERSITY_ROLE") - use ethers.keccak256(ethers.toUtf8Bytes("UNIVERSITY_ROLE"))

// Minimal ABIs (enough for the UI interactions)
export const CREDENTIAL_ISSUER_ABI = [
  'function requestRegistration(string calldata name, string calldata metadata) external',
  'function approveUniversity(address wallet) external',
  'function createCourse(string calldata name, string calldata code) external returns (uint256)',
  'function createDegree(string calldata name, string calldata code) external returns (uint256)',
  'function linkCourseToDegree(uint256 courseGroupId, uint256 degreeGroupId) external',
  'function issueCredential(uint256 groupId, uint256 commitment) external',
  'function revokeCredential(uint256 groupId, uint256 commitment, uint256[] calldata proofSiblings) external',
  'function hasRole(bytes32 role, address account) external view returns (bool)',
  'function isUniversity(address wallet) external view returns (bool)',
  'function credentialCount(uint256 groupId) external view returns (uint256)',
  'function getUniversity(address wallet) external view returns (tuple(string name, string metadata, bool approved, uint256 registeredAt))',
  'event RegistrationRequested(address indexed wallet, string name, string metadata)',
  'event UniversityApproved(address indexed wallet, string name)',
  'event CourseCreated(uint256 indexed groupId, string name, string code, address indexed university)',
  'event DegreeCreated(uint256 indexed groupId, string name, string code, address indexed university)',
  'event CredentialIssued(uint256 indexed groupId, uint256 indexed commitment, uint256 timestamp)',
] as const;

export const COURSE_REGISTRY_ABI = [
  'function getCourse(uint256 groupId) external view returns (tuple(string name, string code, uint256 groupId, address university, bool active, bool isDegree))',
  'function getAllGroupIds() external view returns (uint256[])',
  'function isValidCourse(uint256 groupId) external view returns (bool)',
  'function isValidDegree(uint256 groupId) external view returns (bool)',
  'function getDegreeCourses(uint256 degreeGroupId) external view returns (uint256[])',
  'function courseCount() external view returns (uint256)',
] as const;

export const CREDENTIAL_VERIFIER_ABI = [
  'function verifyCredential(tuple(uint256 merkleTreeDepth, uint256 merkleTreeRoot, uint256 nullifier, uint256 message, uint256 scope, uint256[8] points) calldata proof, uint256 groupId) external returns (bool)',
  'function verifyBatch(tuple(uint256 merkleTreeDepth, uint256 merkleTreeRoot, uint256 nullifier, uint256 message, uint256 scope, uint256[8] points)[] calldata proofs, uint256[] calldata groupIds) external returns (bool[])',
  'function isNullifierUsed(uint256 nullifier) external view returns (bool)',
  'event CredentialVerified(uint256 indexed groupId, uint256 indexed nullifier, uint256 message, bool valid)',
] as const;
