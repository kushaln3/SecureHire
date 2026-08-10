import "@nomicfoundation/hardhat-chai-matchers";
import { expect } from "chai";
import { ethers, run } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { Identity } from "@semaphore-protocol/identity";
import { generateProof } from "@semaphore-protocol/proof";
import { Group } from "@semaphore-protocol/group";
import {
  CourseRegistry,
  CredentialIssuer,
  CredentialVerifier
} from "../typechain-types";

describe("SecureHire Smart Contracts Full Audit", function () {
  this.timeout(300000);

  let courseRegistry: CourseRegistry;
  let credentialIssuer: CredentialIssuer;
  let credentialVerifier: CredentialVerifier;
  let semaphore: any;

  let owner: SignerWithAddress;
  let admin: SignerWithAddress; 
  let university: SignerWithAddress;
  let attacker: SignerWithAddress;
  let student1: Identity;
  let student2: Identity;

  let groupId: bigint;
  const courseName = "Blockchain 101";
  const courseCode = "CS401";
  const metadata = "ipfs://Qm123";

  before(async function () {
    [owner, university, attacker] = await ethers.getSigners();
    admin = owner;

    student1 = new Identity();
    student2 = new Identity();

    // Deploy Semaphore locally
    const { semaphore: semaphoreAddress } = await run("deploy:semaphore", {
      logs: false
    });

    semaphore = await ethers.getContractAt("ISemaphore", semaphoreAddress);

    // Deploy CourseRegistry
    const CourseRegistryFactory = await ethers.getContractFactory("CourseRegistry");
    courseRegistry = await CourseRegistryFactory.deploy();
    await courseRegistry.waitForDeployment();

    // Deploy CredentialIssuer
    const CredentialIssuerFactory = await ethers.getContractFactory("CredentialIssuer");
    credentialIssuer = await CredentialIssuerFactory.deploy(semaphoreAddress, await courseRegistry.getAddress());
    await credentialIssuer.waitForDeployment();

    // Deploy CredentialVerifier
    const CredentialVerifierFactory = await ethers.getContractFactory("CredentialVerifier");
    credentialVerifier = await CredentialVerifierFactory.deploy(semaphoreAddress, await courseRegistry.getAddress());
    await credentialVerifier.waitForDeployment();

    // Set Issuer in Registry
    await courseRegistry.setIssuer(await credentialIssuer.getAddress());
  });

  describe("1. Constructor zero-address guards", function () {
    it("Should revert CredentialIssuer if semaphore is zero", async function () {
      const CredentialIssuerFactory = await ethers.getContractFactory("CredentialIssuer");
      await expect(CredentialIssuerFactory.deploy(ethers.ZeroAddress, await courseRegistry.getAddress()))
        .to.be.revertedWith("Zero semaphore address");
    });
    it("Should revert CredentialIssuer if registry is zero", async function () {
      const CredentialIssuerFactory = await ethers.getContractFactory("CredentialIssuer");
      await expect(CredentialIssuerFactory.deploy(await semaphore.getAddress(), ethers.ZeroAddress))
        .to.be.revertedWith("Zero registry address");
    });
    it("Should revert CredentialVerifier if semaphore is zero", async function () {
      const CredentialVerifierFactory = await ethers.getContractFactory("CredentialVerifier");
      await expect(CredentialVerifierFactory.deploy(ethers.ZeroAddress, await courseRegistry.getAddress()))
        .to.be.revertedWith("Zero semaphore address");
    });
    it("Should revert CredentialVerifier if registry is zero", async function () {
      const CredentialVerifierFactory = await ethers.getContractFactory("CredentialVerifier");
      await expect(CredentialVerifierFactory.deploy(await semaphore.getAddress(), ethers.ZeroAddress))
        .to.be.revertedWith("Zero registry address");
    });
  });

  describe("2. DEFAULT_ADMIN_ROLE assigned to deployer", function () {
    it("Should have assigned DEFAULT_ADMIN_ROLE to deployer", async function () {
      const adminRole = await credentialIssuer.DEFAULT_ADMIN_ROLE();
      expect(await credentialIssuer.hasRole(adminRole, owner.address)).to.be.true;
    });
  });

  describe("3. CourseRegistry", function () {
    it("only owner can setIssuer", async function () {
      await expect(courseRegistry.connect(attacker).setIssuer(attacker.address))
        .to.be.revertedWithCustomError(courseRegistry, "OwnableUnauthorizedAccount");
    });
    it("setIssuer rejects zero address", async function () {
      await expect(courseRegistry.setIssuer(ethers.ZeroAddress))
        .to.be.revertedWith("Zero issuer address");
    });
    it("only issuer can addCourse", async function () {
      await expect(courseRegistry.connect(attacker).addCourse("Test", "TST", 1, attacker.address))
        .to.be.revertedWith("Not the issuer");
    });
  });

  describe("4. CourseRegistry: isValidCourse", function () {
    it("returns false for non-existent group", async function () {
      expect(await courseRegistry.isValidCourse(99999)).to.be.false;
    });
  });

  describe("5. University registration", function () {
    it("requestRegistration emits event", async function () {
      await expect(credentialIssuer.connect(university).requestRegistration("Test Uni", metadata))
        .to.emit(credentialIssuer, "RegistrationRequested")
        .withArgs(university.address, "Test Uni", metadata);
    });
    it("cannot register twice", async function () {
      await expect(credentialIssuer.connect(university).requestRegistration("Test Uni 2", metadata))
        .to.be.revertedWith("Already registered");
    });
    it("pending state correct", async function () {
      const info = await credentialIssuer.getUniversity(university.address);
      expect(info.name).to.equal("Test Uni");
      expect(info.approved).to.be.false;
      expect(info.registeredAt).to.be.gt(0n);
    });
  });

  describe("6. University approval", function () {
    it("non-admin cannot approve", async function () {
      await expect(credentialIssuer.connect(attacker).approveUniversity(university.address))
        .to.be.revertedWithCustomError(credentialIssuer, "AccessControlUnauthorizedAccount");
    });
    it("cannot approve unregistered", async function () {
      await expect(credentialIssuer.approveUniversity(attacker.address))
        .to.be.revertedWith("University not registered");
    });
    it("admin approval grants UNIVERSITY_ROLE", async function () {
      await expect(credentialIssuer.approveUniversity(university.address))
        .to.emit(credentialIssuer, "UniversityApproved")
        .withArgs(university.address, "Test Uni");
      const uniRole = await credentialIssuer.UNIVERSITY_ROLE();
      expect(await credentialIssuer.hasRole(uniRole, university.address)).to.be.true;
      expect(await credentialIssuer.isUniversity(university.address)).to.be.true;
    });
    it("cannot approve twice", async function () {
      await expect(credentialIssuer.approveUniversity(university.address))
        .to.be.revertedWith("University already approved");
    });
  });

  describe("7. University rejection", function () {
    it("admin can reject pending, resets registeredAt to 0", async function () {
      await credentialIssuer.connect(attacker).requestRegistration("Reject Uni", metadata);
      await expect(credentialIssuer.rejectUniversity(attacker.address))
        .to.emit(credentialIssuer, "UniversityRejected")
        .withArgs(attacker.address);
      const info = await credentialIssuer.getUniversity(attacker.address);
      expect(info.registeredAt).to.equal(0);
    });
  });

  describe("8. University revocation", function () {
    it("admin revokes approved, removes UNIVERSITY_ROLE", async function () {
      await credentialIssuer.connect(attacker).requestRegistration("Revoke Uni", metadata);
      await credentialIssuer.approveUniversity(attacker.address);
      await expect(credentialIssuer.revokeUniversity(attacker.address))
        .to.emit(credentialIssuer, "UniversityRevoked")
        .withArgs(attacker.address);
      
      const uniRole = await credentialIssuer.UNIVERSITY_ROLE();
      expect(await credentialIssuer.hasRole(uniRole, attacker.address)).to.be.false;
      expect(await credentialIssuer.isUniversity(attacker.address)).to.be.false;
    });
  });

  describe("9. Course creation", function () {
    it("attacker cannot create", async function () {
      await expect(credentialIssuer.connect(attacker).createCourse("Fake", "FK1"))
        .to.be.revertedWithCustomError(credentialIssuer, "AccessControlUnauthorizedAccount");
    });
    it("approved university creates course, event emitted, CourseRegistry updated, duplicate code reverts", async function () {
      const tx = await credentialIssuer.connect(university).createCourse(courseName, courseCode);
      const receipt = await tx.wait();
      
      const event = receipt?.logs.find(
        (log) => log.topics[0] === credentialIssuer.interface.getEvent("CourseCreated").topicHash
      );
      expect(event).to.not.be.undefined;
      const decoded = credentialIssuer.interface.decodeEventLog("CourseCreated", event!.data, event!.topics);
      groupId = decoded.groupId;

      expect(decoded.name).to.equal(courseName);
      expect(decoded.code).to.equal(courseCode);
      expect(decoded.university).to.equal(university.address);

      expect(await courseRegistry.isValidCourse(groupId)).to.be.true;

      await expect(credentialIssuer.connect(university).createCourse("Fake2", courseCode))
        .to.be.revertedWith("Course code already exists");
    });
  });

  describe("10. Credential issuance", function () {
    it("attacker cannot issue", async function () {
      await expect(credentialIssuer.connect(attacker).issueCredential(groupId, student1.commitment))
        .to.be.revertedWithCustomError(credentialIssuer, "AccessControlUnauthorizedAccount");
    });
    it("university cannot issue to invalid groupId (99999)", async function () {
      await expect(credentialIssuer.connect(university).issueCredential(99999, student1.commitment))
        .to.be.revertedWith("Invalid course group");
    });
    it("university issues successfully, credentialCount increments", async function () {
      expect(await credentialIssuer.credentialCount(groupId)).to.equal(0n);
      
      await expect(credentialIssuer.connect(university).issueCredential(groupId, student1.commitment))
        .to.emit(credentialIssuer, "CredentialIssued");
        
      expect(await credentialIssuer.credentialCount(groupId)).to.equal(1n);
    });
  });

  describe("11. ZK verification", function () {
    it("invalid course reverts", async function () {
      const scope = groupId;
      const message = 12345;
      
      const group = new Group([student1.commitment.toString()]);
      const fullProof = await generateProof(student1, group, scope.toString(), message.toString());
      
      const semaphoreProof = {
        merkleTreeDepth: fullProof.merkleTreeDepth,
        merkleTreeRoot: fullProof.merkleTreeRoot,
        nullifier: fullProof.nullifier,
        message: fullProof.message,
        scope: fullProof.scope,
        points: fullProof.points
      };

      await expect(credentialVerifier.verifyCredential(semaphoreProof, 99999))
        .to.be.revertedWith("Invalid course");
    });

    it("valid proof verifies and emits event", async function () {
      const scope = groupId;
      const message = 12345;
      
      const group = new Group([student1.commitment.toString()]);
      const fullProof = await generateProof(student1, group, scope.toString(), message.toString());
      
      const semaphoreProof = {
        merkleTreeDepth: fullProof.merkleTreeDepth,
        merkleTreeRoot: fullProof.merkleTreeRoot,
        nullifier: fullProof.nullifier,
        message: fullProof.message,
        scope: fullProof.scope,
        points: fullProof.points
      };

      await expect(credentialVerifier.verifyCredential(semaphoreProof, groupId))
        .to.emit(credentialVerifier, "CredentialVerified")
        .withArgs(groupId, fullProof.nullifier, fullProof.message, true);
    });

    it("replay (same nullifier) reverts", async function () {
      const scope = groupId;
      const message = 12345;
      
      const group = new Group([student1.commitment.toString()]);
      const fullProof = await generateProof(student1, group, scope.toString(), message.toString());
      
      const semaphoreProof = {
        merkleTreeDepth: fullProof.merkleTreeDepth,
        merkleTreeRoot: fullProof.merkleTreeRoot,
        nullifier: fullProof.nullifier,
        message: fullProof.message,
        scope: fullProof.scope,
        points: fullProof.points
      };

      await expect(credentialVerifier.verifyCredential(semaphoreProof, groupId))
        .to.be.revertedWith("Nullifier already used");
    });

    it("second student can verify with their own proof", async function () {
      await credentialIssuer.connect(university).issueCredential(groupId, student2.commitment);

      const scope = groupId;
      const message = 54321;
      
      const group = new Group([student1.commitment.toString(), student2.commitment.toString()]);
      const fullProof = await generateProof(student2, group, scope.toString(), message.toString());
      
      const semaphoreProof = {
        merkleTreeDepth: fullProof.merkleTreeDepth,
        merkleTreeRoot: fullProof.merkleTreeRoot,
        nullifier: fullProof.nullifier,
        message: fullProof.message,
        scope: fullProof.scope,
        points: fullProof.points
      };

      await expect(credentialVerifier.verifyCredential(semaphoreProof, groupId))
        .to.emit(credentialVerifier, "CredentialVerified")
        .withArgs(groupId, fullProof.nullifier, fullProof.message, true);
    });
  });
});
