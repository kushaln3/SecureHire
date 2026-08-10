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
      await expect(courseRegistry.connect(attacker).addCourse("Test", "TST", 1, attacker.address, false))
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
        .to.be.revertedWith("Invalid course or degree group");
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

  describe('7. Degree Creation & Linking', function() {
    let degreeGroupId: bigint;

    it('DEG-01: Approved university can create degree group', async function() {
      const tx = await credentialIssuer.connect(university).createDegree("Bachelor of Tech", "BTECH");
      const receipt = await tx.wait();
      
      const event = receipt?.logs.find(
        (log) => log.topics[0] === credentialIssuer.interface.getEvent("DegreeCreated").topicHash
      );
      expect(event).to.not.be.undefined;
      const decoded = credentialIssuer.interface.decodeEventLog("DegreeCreated", event!.data, event!.topics);
      degreeGroupId = decoded.groupId;
    });

    it('DEG-02: DegreeCreated event emitted with correct args', async function() {
      const tx = await credentialIssuer.connect(university).createDegree("Master of Tech", "MTECH");
      const receipt = await tx.wait();
      const event = receipt?.logs.find(
        (log) => log.topics[0] === credentialIssuer.interface.getEvent("DegreeCreated").topicHash
      );
      const decoded = credentialIssuer.interface.decodeEventLog("DegreeCreated", event!.data, event!.topics);
      expect(decoded.name).to.equal("Master of Tech");
      expect(decoded.code).to.equal("MTECH");
    });

    it('DEG-03: isDegree=true in CourseRegistry for degree groups', async function() {
      expect(await courseRegistry.isValidDegree(degreeGroupId)).to.be.true;
    });

    it('DEG-04: isValidDegree returns true for degree group', async function() {
      expect(await courseRegistry.isValidDegree(degreeGroupId)).to.be.true;
    });

    it('DEG-05: linkCourseToDegree links course to degree', async function() {
      await credentialIssuer.connect(university).linkCourseToDegree(groupId, degreeGroupId);
    });

    it('DEG-06: getDegreeCourses returns linked course groupIds', async function() {
      const courses = await courseRegistry.getDegreeCourses(degreeGroupId);
      expect(courses.length).to.equal(1);
      expect(courses[0]).to.equal(groupId);
    });

    it('DEG-07: linkCourseToDegree reverts when target is not a degree', async function() {
      await expect(credentialIssuer.connect(university).linkCourseToDegree(groupId, groupId))
        .to.be.reverted;
    });

    it('DEG-08: University can issue credential to a degree group', async function() {
      await expect(credentialIssuer.connect(university).issueCredential(degreeGroupId, student1.commitment))
        .to.emit(credentialIssuer, "CredentialIssued");
    });
  });

  describe('8. verifyBatch', function() {
    it('BAT-01: verifyBatch reverts on length mismatch', async function() {
      await expect(credentialVerifier.verifyBatch([], [1])).to.be.revertedWith("Length mismatch");
    });

    it('BAT-02: verifyBatch returns false for invalid course groupId', async function() {
      const scope = groupId;
      const message = 777;
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

      const results = await credentialVerifier.verifyBatch.staticCall([semaphoreProof], [99999]);
      expect(results[0]).to.be.false;
    });

    it('BAT-03: verifyBatch verifies multiple proofs, returns bool[]', async function() {
      const group1 = new Group([student1.commitment.toString(), student2.commitment.toString()]);
      const proof1 = await generateProof(student1, group1, groupId.toString(), "888");
      const p1 = {
        merkleTreeDepth: proof1.merkleTreeDepth,
        merkleTreeRoot: proof1.merkleTreeRoot,
        nullifier: proof1.nullifier,
        message: proof1.message,
        scope: proof1.scope,
        points: proof1.points
      };

      const group2 = new Group([student1.commitment.toString(), student2.commitment.toString()]);
      const proof2 = await generateProof(student2, group2, groupId.toString(), "999");
      const p2 = {
        merkleTreeDepth: proof2.merkleTreeDepth,
        merkleTreeRoot: proof2.merkleTreeRoot,
        nullifier: proof2.nullifier,
        message: proof2.message,
        scope: proof2.scope,
        points: proof2.points
      };

      const results = await credentialVerifier.verifyBatch.staticCall([p1, p2], [groupId, groupId]);
      expect(results[0]).to.be.true;
      expect(results[1]).to.be.true;
    });

    it('BAT-04: verifyBatch returns false for already-used nullifier in batch', async function() {
      const group = new Group([student1.commitment.toString()]);
      const proof = await generateProof(student1, group, groupId.toString(), "1000");
      const p = {
        merkleTreeDepth: proof.merkleTreeDepth,
        merkleTreeRoot: proof.merkleTreeRoot,
        nullifier: proof.nullifier,
        message: proof.message,
        scope: proof.scope,
        points: proof.points
      };

      const results = await credentialVerifier.verifyBatch.staticCall([p, p], [groupId, groupId]);
      expect(results[0]).to.be.true;
      expect(results[1]).to.be.false;
    });
  });
});
